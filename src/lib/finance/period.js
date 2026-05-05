import { supabase, withRetry } from '../supabase'

/**
 * Calls the get_project_period_actuals RPC and returns a Map of
 * po_number → period actuals row, for fast lookup in merge operations.
 *
 * Columns returned per project (per RPC contract):
 *   In-window (between p_start and p_end):
 *     period_hours, period_labor_cost, period_material_cost,
 *     period_set_cost, period_total_cost, period_billed,
 *     period_wip, period_invoice_count
 *   Cumulative through p_end (used for as-of close reporting):
 *     cumulative_hours_end, cumulative_labor_cost_end,
 *     cumulative_material_cost_end, cumulative_set_cost_end,
 *     cumulative_total_cost_end, cumulative_billed_end,
 *     cumulative_wip_end
 *
 * Cumulative columns fall back to projects.* legacy stored values for
 * projects (HIST*) that have no activity in labor_entries/qbo_expenses.
 */
export async function getProjectPeriodActuals(startDate, endDate) {
  // Supabase REST caps RPC responses at 1000 rows — paginate via .range() so
  // every project (~7k+) is returned, otherwise the merge silently zeros out
  // any project past the 1000th alphabetical PO.
  const PAGE = 1000
  const map = new Map()
  let offset = 0
  while (true) {
    const res = await withRetry(() =>
      supabase
        .rpc('get_project_period_actuals', { p_start: startDate, p_end: endDate })
        .range(offset, offset + PAGE - 1)
    )
    if (res.error) throw res.error
    const batch = res.data ?? []
    for (const row of batch) map.set(row.po_number, row)
    if (batch.length < PAGE) break
    offset += PAGE
    if (offset >= 50000) break // safety
  }
  return map
}

/**
 * Merges period actuals into an array of project_details rows.
 *
 * Two modes via the `usePeriodCosts` option:
 *
 *   false (default) — "as-of" / cumulative mode (WipSchedulePage):
 *     Cost/hours columns reflect everything ever incurred through p_end.
 *     WIP accounting figures (pct_complete, unbilled, cieb, biec) are
 *     computed from those cumulative values — correct for month-close reports.
 *
 *   true — "within-period" mode (WipPage with a date range picker):
 *     Cost/hours columns reflect ONLY activity between p_start and p_end so
 *     users can evaluate a single month's labour/materials spend.
 *     WIP accounting figures still use cumulative values because pct_complete
 *     and unbilled revenue are inherently project-lifetime concepts.
 */
export function mergePerioActuals(rows, periodMap, { usePeriodCosts = false } = {}) {
  return rows.map(row => {
    const p = periodMap.get(row.po_number)
    if (!p) {
      return {
        ...row,
        hours_to_date:        0,
        labor_cost_to_date:   0,
        material_cost_to_date: 0,
        set_cost_to_date:     0,
        total_cost_to_date:   0,
        amount_billed_to_date: 0,
        wip_to_date:          0,
        invoice_count:        0,
      }
    }

    // Cumulative through p_end — always used for WIP accounting.
    const cumulTotalCost  = Number(p.cumulative_total_cost_end     ?? 0)
    const billedToDate    = Number(p.cumulative_billed_end         ?? 0)
    const wipToDate       = Number(p.cumulative_wip_end            ?? 0)

    // pct_complete and earned-revenue use cumulative costs regardless of mode.
    const projCost    = Number(row.total_projected_cost ?? 0)
    const pctComplete = projCost > 0 ? Math.min(1, cumulTotalCost / projCost) : 0
    const revenueEarned = Math.round(Number(row.total_revenue ?? 0) * pctComplete * 100) / 100

    const unbilledRevenue         = Math.max(0, Math.round((revenueEarned - billedToDate) * 100) / 100)
    const costsInExcessOfBillings = Math.max(0, Math.round((revenueEarned - (billedToDate + wipToDate)) * 100) / 100)
    const billingsInExcessOfCosts = Math.max(0, Math.round((billedToDate - revenueEarned) * 100) / 100)

    // Cost/hours display columns: period-window values when usePeriodCosts, otherwise cumulative.
    const hoursToDate  = usePeriodCosts
      ? Number(p.period_hours         ?? 0)
      : Number(p.cumulative_hours_end ?? 0)
    const laborCost    = usePeriodCosts
      ? Number(p.period_labor_cost         ?? 0)
      : Number(p.cumulative_labor_cost_end ?? 0)
    const materialCost = usePeriodCosts
      ? Number(p.period_material_cost         ?? 0)
      : Number(p.cumulative_material_cost_end ?? 0)
    const setCost      = usePeriodCosts
      ? Number(p.period_set_cost         ?? 0)
      : Number(p.cumulative_set_cost_end ?? 0)
    const totalCost    = usePeriodCosts
      ? Number(p.period_total_cost         ?? 0)
      : cumulTotalCost

    return {
      ...row,
      hours_to_date:                hoursToDate,
      labor_cost_to_date:           laborCost,
      material_cost_to_date:        materialCost,
      set_cost_to_date:             setCost,
      total_cost_to_date:           totalCost,
      amount_billed_to_date:        billedToDate,
      revenue_earned:               revenueEarned,
      wip_to_date:                  wipToDate,
      amount_claimed_to_date:       billedToDate + wipToDate,
      invoice_count:                Number(p.period_invoice_count),
      pct_complete:                 pctComplete,
      unbilled_revenue:             unbilledRevenue,
      costs_in_excess_of_billings:  costsInExcessOfBillings,
      billings_in_excess_of_costs:  billingsInExcessOfCosts,
    }
  })
}
