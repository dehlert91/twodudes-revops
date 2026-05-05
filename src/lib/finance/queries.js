import { supabase, withRetry } from '../supabase'

/**
 * Fetches monthly_revenue rows joined client-side with division/segment from
 * project_details (since monthly_revenue doesn't expose those columns).
 *
 * NOTE: client-side join is fine at current scale (~2k monthly rows × ~7k projects).
 * Move to a SQL view or RPC once we exceed ~10k monthly rows.
 */
export async function getMonthlyRevenueSummary({ startMonth, endMonth, divisions = [], segments = [] } = {}) {
  const start = startMonth ?? new Date(new Date().setMonth(new Date().getMonth() - 11))
  const end   = endMonth   ?? new Date()
  const startStr = toIsoMonth(start)
  const endStr   = toIsoMonth(end)

  // Pull project lookup (po_number → division_code, segment) — small, cache-friendly
  const projRes = await withRetry(() =>
    supabase
      .from('project_details')
      .select('po_number, segment, division_code')
  )
  if (projRes.error) throw projRes.error

  const projLookup = new Map()
  for (const row of projRes.data ?? []) {
    projLookup.set(row.po_number, { segment: row.segment, division: row.division_code })
  }

  // Pull monthly_revenue in date range
  const mrRes = await withRetry(() =>
    supabase
      .from('monthly_revenue')
      .select('po_number, period_month, forecast_revenue, billed_revenue, wip_revenue, claimed_revenue, earned_this_period, forecast_minus_earned')
      .gte('period_month', startStr)
      .lte('period_month', endStr)
  )
  if (mrRes.error) throw mrRes.error

  const divSet = divisions.length ? new Set(divisions) : null
  const segSet = segments.length ? new Set(segments) : null

  // Aggregate by period_month
  const buckets = new Map()
  for (const row of mrRes.data ?? []) {
    const meta = projLookup.get(row.po_number)
    if (divSet && (!meta || !divSet.has(meta.division))) continue
    if (segSet && (!meta || !segSet.has(meta.segment))) continue

    const key = row.period_month
    let agg = buckets.get(key)
    if (!agg) {
      agg = {
        period_month: key,
        forecast: 0, billed: 0, wip: 0, claimed: 0,
        earned: 0, earned_known: false, // earned can be NULL when no snapshot exists
        variance: 0, variance_known: false,
      }
      buckets.set(key, agg)
    }
    agg.forecast += Number(row.forecast_revenue ?? 0)
    agg.billed   += Number(row.billed_revenue   ?? 0)
    agg.wip      += Number(row.wip_revenue      ?? 0)
    agg.claimed  += Number(row.claimed_revenue  ?? 0)
    if (row.earned_this_period != null) {
      agg.earned += Number(row.earned_this_period)
      agg.earned_known = true
    }
    if (row.forecast_minus_earned != null) {
      agg.variance += Number(row.forecast_minus_earned)
      agg.variance_known = true
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.period_month.localeCompare(b.period_month))
}

/**
 * Returns open projects with positive WIP / underbilling signals.
 * Uses unbilled_revenue / costs_in_excess_of_billings as primary filters because
 * billing_status is currently always 'unassigned' (backend categorization unwired).
 */
export async function getWipProjects({ divisions = [], segments = [], minUnbilled = 0 } = {}) {
  // Supabase REST caps at 1000 rows per request, so we paginate in chunks.
  const PAGE = 1000
  const all = []
  let offset = 0
  while (true) {
    let query = supabase
      .from('project_details')
      .select('*')
      .eq('is_closed', false)
      // Combined-into-other-project rolls up to parent — never appears in financials
      .neq('stage', 'Combined into other Project')
      // Benchmarked projects are effectively done — exclude from WIP exposure
      .neq('stage', 'Benchmark in Progress')
      .neq('stage', 'Benchmark Completed')
      // Need to Invoice belongs in the Billing queue, not Unbilled exposure
      .neq('stage', 'Need to Invoice')
      .or(`unbilled_revenue.gt.${minUnbilled},costs_in_excess_of_billings.gt.${minUnbilled}`)
      .order('unbilled_revenue', { ascending: false, nullsFirst: false })
      .order('po_number', { ascending: true }) // tiebreaker for stable pagination
      .range(offset, offset + PAGE - 1)

    if (divisions.length) query = query.in('division_code', divisions)
    if (segments.length)  query = query.in('segment',       segments)

    const res = await withRetry(() => query)
    if (res.error) throw res.error
    const batch = res.data ?? []
    all.push(...batch)
    if (batch.length < PAGE) break
    offset += PAGE
    if (offset >= 50000) break // safety
  }
  // Normalize column name for consumers (UI groups by row.division)
  return all.map(r => ({ ...r, division: r.division_code }))
}

/**
 * List of open projects with allocation summary fields for the allocation grid.
 * Reads from project_details which exposes allocation_sum_pct, is_allocation_complete,
 * allocation_method, allocation_pattern, allocated_months_count, locked_months_count.
 */
export async function getAllocationProjects({ divisions = [], segments = [], onlyIncomplete = false } = {}) {
  const PAGE = 1000
  const all = []
  let offset = 0
  while (true) {
    let query = supabase
      .from('project_details')
      .select(`
        po_number, job_name, segment, division_code, project_manager,
        stage, total_revenue, estimated_start_date, estimated_completion_date,
        allocation_method, allocation_pattern, date_span_pattern,
        allocation_sum_pct, is_allocation_complete,
        allocated_months_count, locked_months_count
      `)
      .eq('is_closed', false)
      // Combined-into-other-project rolls up to parent — never appears in financials
      .neq('stage', 'Combined into other Project')
      // Benchmarked projects are effectively done — exclude from allocation work
      .neq('stage', 'Benchmark in Progress')
      .neq('stage', 'Benchmark Completed')
      .gt('total_revenue', 0)
      .order('estimated_start_date', { ascending: true, nullsFirst: false })
      .order('po_number', { ascending: true })
      .range(offset, offset + PAGE - 1)

    if (divisions.length) query = query.in('division_code', divisions)
    if (segments.length)  query = query.in('segment',       segments)
    if (onlyIncomplete)   query = query.eq('is_allocation_complete', false)

    const res = await withRetry(() => query)
    if (res.error) throw res.error
    const batch = res.data ?? []
    all.push(...batch)
    if (batch.length < PAGE) break
    offset += PAGE
    if (offset >= 50000) break
  }
  return all.map(r => ({ ...r, division: r.division_code }))
}

/**
 * Single-project monthly allocation rows joined with project metadata.
 * Returns the monthly_revenue rows ordered by period_month plus project header info.
 */
export async function getProjectAllocation(po_number) {
  const [hdrRes, mrRes, raRes] = await Promise.all([
    withRetry(() =>
      supabase
        .from('project_details')
        .select(`
          po_number, job_name, segment, division_code, project_manager, stage,
          total_revenue, total_projected_cost, total_cost_to_date,
          estimated_start_date, estimated_completion_date,
          allocation_method, allocation_pattern, date_span_pattern,
          allocation_sum_pct, is_allocation_complete,
          allocated_months_count, locked_months_count,
          pct_complete, revenue_earned, amount_billed_to_date
        `)
        .eq('po_number', po_number)
        .maybeSingle()
    ),
    withRetry(() =>
      supabase
        .from('monthly_revenue')
        .select('*')
        .eq('po_number', po_number)
        .order('period_month', { ascending: true })
    ),
    withRetry(() =>
      supabase
        .from('revenue_allocations')
        .select('period_month, is_active_month, cumulative_target_pct, last_auto_pct_complete')
        .eq('po_number', po_number)
    ),
  ])
  if (hdrRes.error) throw hdrRes.error
  if (mrRes.error)  throw mrRes.error
  if (raRes.error)  throw raRes.error

  // Merge V2 ratchet columns from revenue_allocations into the monthly_revenue rows
  const raByMonth = new Map()
  for (const r of raRes.data ?? []) raByMonth.set(r.period_month, r)
  const months = (mrRes.data ?? []).map(m => {
    const r = raByMonth.get(m.period_month)
    return {
      ...m,
      is_active_month:        r?.is_active_month ?? true,
      cumulative_target_pct:  r?.cumulative_target_pct ?? null,
      last_auto_pct_complete: r?.last_auto_pct_complete ?? null,
    }
  })

  return {
    project: hdrRes.data,
    months,
  }
}

/**
 * Generates a list of months (oldest → newest) with their close/reopen status
 * overlaid from `monthly_close_status`. Months with no events are returned as 'open'.
 */
export async function getMonthlyCloseStatus({ monthsBack = 18, monthsForward = 0 } = {}) {
  const today = new Date()
  const months = []
  for (let i = monthsBack; i >= -monthsForward; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1))
    months.push(d.toISOString().slice(0, 10))
  }

  const startStr = months[0]
  const endStr   = months[months.length - 1]

  const res = await withRetry(() =>
    supabase
      .from('monthly_close_status')
      .select('*')
      .gte('period_month', startStr)
      .lte('period_month', endStr)
  )
  if (res.error) throw res.error

  const byMonth = new Map()
  for (const row of res.data ?? []) byMonth.set(row.period_month, row)

  return months.map(m => {
    const evt = byMonth.get(m)
    return {
      period_month: m,
      status:        evt?.status ?? 'open',
      last_event_type: evt?.last_event_type ?? null,
      last_acted_at:   evt?.last_acted_at ?? null,
      last_acted_by:   evt?.last_acted_by ?? null,
      last_event_id:   evt?.last_event_id ?? null,
    }
  })
}

/** Audit log of close/reopen events for a given period_month, newest first. */
export async function getMonthlyCloseEvents(period_month) {
  const res = await withRetry(() =>
    supabase
      .from('monthly_close_events')
      .select('*')
      .eq('period_month', period_month)
      .order('acted_at', { ascending: false })
  )
  if (res.error) throw res.error
  return res.data ?? []
}

/** All qbo_invoices for one PO, newest first. */
export async function getProjectInvoices(po_number) {
  const res = await withRetry(() =>
    supabase
      .from('qbo_invoices')
      .select('id, invoice_number, invoice_date, due_date, total_amount, balance, milestone_type, status, surcharge_amount, customer_name, qbo_invoice_id')
      .eq('po_number', po_number)
      .order('invoice_date', { ascending: false })
  )
  if (res.error) throw res.error
  return res.data ?? []
}

/**
 * Billing review queue for accounting — projects ready to invoice and push to QBO.
 *
 * Scope today: stage = 'Need to Invoke'.
 * Future scope: once the billing module config lands, also include projects flagged
 * for progress billing (add an OR clause in the .or(...) below referencing whatever
 * column/flag the billing config exposes).
 */
export async function getBillingProjects({ divisions = [], segments = [] } = {}) {
  const PAGE = 1000
  const all = []
  let offset = 0
  while (true) {
    let query = supabase
      .from('project_details')
      .select(`
        po_number, job_name, segment, division_code, project_manager,
        stage, total_revenue, amount_billed_to_date, unbilled_revenue,
        billing_schedule_type, days_since_last_invoice, last_invoice_date,
        invoice_count, pct_complete, revenue_earned
      `)
      .eq('is_closed', false)
      // Combined-into-other-project rolls up to parent — never appears in financials
      .neq('stage', 'Combined into other Project')
      .eq('stage', 'Need to Invoice')
      // Future: .or('stage.eq.Need to Invoice,billing_module_flag.eq.progress_billing')
      .order('unbilled_revenue', { ascending: false, nullsFirst: false })
      .range(offset, offset + PAGE - 1)

    if (divisions.length) query = query.in('division_code', divisions)
    if (segments.length)  query = query.in('segment',       segments)

    const res = await withRetry(() => query)
    if (res.error) throw res.error
    const batch = res.data ?? []
    all.push(...batch)
    if (batch.length < PAGE) break
    offset += PAGE
    if (offset >= 50000) break
  }
  return all.map(r => ({ ...r, division: r.division_code }))
}

/* ──────────────────────────────────────────────────────────────────────────
 * ARCHIVED — original Billing Pipeline logic (filter by expected_next_invoice_type).
 * Kept as reference for when the backend categorizer that fills that column is wired.
 * Restore by replacing getBillingProjects with this body and re-routing /finance/billing
 * to use the grouping-by-type display.
 *
 * export async function getBillingPipelineLegacy({ divisions = [], segments = [] } = {}) {
 *   ...
 *   .eq('is_closed', false)
 *   .not('expected_next_invoice_type', 'is', null)
 *   .order('expected_next_invoice_type', { ascending: true })
 *   .order('unbilled_revenue', { ascending: false, nullsFirst: false })
 *   ...
 * }
 * ────────────────────────────────────────────────────────────────────────── */

/** Full project_details row by PO — used by the slide-over detail panel. */
export async function getProjectByPo(po_number) {
  const res = await withRetry(() =>
    supabase
      .from('project_details')
      .select('*')
      .eq('po_number', po_number)
      .maybeSingle()
  )
  if (res.error) throw res.error
  return res.data
}

/** Distinct lists for filter dropdowns. */
export async function getFinanceFilterOptions() {
  const res = await withRetry(() =>
    supabase
      .from('project_details')
      .select('division_code, segment')
  )
  if (res.error) throw res.error

  const divs = new Set()
  const segs = new Set()
  for (const r of res.data ?? []) {
    if (r.division_code) divs.add(r.division_code)
    if (r.segment)       segs.add(r.segment)
  }
  return {
    divisions: [...divs].sort(),
    segments:  [...segs].sort(),
  }
}

function toIsoMonth(d) {
  if (typeof d === 'string') return d.slice(0, 10)
  const dt = new Date(d)
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), 1)).toISOString().slice(0, 10)
}
