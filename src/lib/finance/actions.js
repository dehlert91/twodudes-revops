import { supabase, withRetry } from '../supabase'

/**
 * Calls recompute_revenue_allocation(po, user, is_month_close) RPC.
 * `is_month_close=false` → nightly mode (ratchet UP only on cost overrun).
 * `is_month_close=true`  → close-mode finalize (cost-dial all past months).
 * Returns: { rows_inserted, rows_updated, rows_deleted, mode_used, details }
 */
export async function recomputeAllocation(po_number, acting_user = null, is_month_close = false) {
  const res = await withRetry(() =>
    supabase.rpc('recompute_revenue_allocation', {
      p_po_number: po_number,
      p_acting_user: acting_user,
      p_is_month_close: is_month_close,
    })
  )
  if (res.error) throw res.error
  return Array.isArray(res.data) ? res.data[0] : res.data
}

/**
 * Calls recompute_all_open_allocations(user, is_month_close) RPC.
 * Returns: array of { po_number, mode_used, rows_after, details }
 */
export async function recomputeAllOpenAllocations(acting_user = null, is_month_close = false) {
  const res = await withRetry(() =>
    supabase.rpc('recompute_all_open_allocations', {
      p_acting_user: acting_user,
      p_is_month_close: is_month_close,
    })
  )
  if (res.error) throw res.error
  return res.data ?? []
}

/**
 * PM saves an allocation forecast for one (po_number, period_month) row.
 * Source is `pm_forecast`: the system can ratchet upward if actuals exceed it,
 * but otherwise the value sticks until month-close.
 *
 * This is the normal save path for the PM-facing UI.
 */
export async function setPmForecastAllocation({
  po_number, period_month, allocated_pct, total_revenue, acting_user = null,
}) {
  const pct = allocated_pct > 1 ? allocated_pct / 100 : allocated_pct
  const amount = (Number(total_revenue) || 0) * pct
  const res = await withRetry(() =>
    supabase
      .from('revenue_allocations')
      .upsert({
        po_number,
        period_month,
        allocated_pct: pct,
        allocated_amount: amount,
        source: 'pm_forecast',
        is_locked: false,
        updated_by: acting_user,
      }, { onConflict: 'po_number,period_month' })
      .select()
      .single()
  )
  if (res.error) throw res.error
  return res.data
}

/**
 * Admin escape valve. Writes source='manual_override' which the V2 allocator
 * will NEVER touch (won't update, won't delete, won't ratchet). Use for stuck
 * edge cases. Normal PM edits should use setPmForecastAllocation instead.
 */
export async function setManualAllocation({
  po_number, period_month, allocated_pct, total_revenue, acting_user = null,
}) {
  const pct = allocated_pct > 1 ? allocated_pct / 100 : allocated_pct
  const amount = (Number(total_revenue) || 0) * pct
  const res = await withRetry(() =>
    supabase
      .from('revenue_allocations')
      .upsert({
        po_number,
        period_month,
        allocated_pct: pct,
        allocated_amount: amount,
        source: 'manual_override',
        is_locked: false,
        updated_by: acting_user,
      }, { onConflict: 'po_number,period_month' })
      .select()
      .single()
  )
  if (res.error) throw res.error
  return res.data
}

/**
 * Toggle is_active_month for a (po, period) row. Used for Shape 4 (multi-month
 * non-sequential) projects to mark gap months that should never receive revenue.
 * Inserts a placeholder row at pct=0 if none exists.
 */
export async function setMonthActive({ po_number, period_month, is_active_month, acting_user = null }) {
  // Try UPDATE first so we don't trash an existing row's allocated_pct / source.
  const upd = await withRetry(() =>
    supabase
      .from('revenue_allocations')
      .update({ is_active_month, updated_by: acting_user, updated_at: new Date().toISOString() })
      .eq('po_number', po_number)
      .eq('period_month', period_month)
      .select()
  )
  if (upd.error) throw upd.error
  if ((upd.data ?? []).length > 0) return upd.data[0]

  // Row doesn't exist yet — insert with required defaults.
  const ins = await withRetry(() =>
    supabase
      .from('revenue_allocations')
      .insert({
        po_number,
        period_month,
        allocated_pct: 0,
        allocated_amount: 0,
        source: 'pm_forecast',
        is_locked: false,
        is_active_month,
        created_by: acting_user,
        updated_by: acting_user,
      })
      .select()
      .single()
  )
  if (ins.error) throw ins.error
  return ins.data
}

/**
 * Calls the close_month(period_month, acting_user, reason, recompute_first) RPC.
 * Returns: { event_id, period_month, status, allocations_locked, snapshots_created, projects_recomputed, notes }
 */
export async function closeMonth({ period_month, reason, recompute_first = true, acting_user = null }) {
  const res = await withRetry(() =>
    supabase.rpc('close_month', {
      p_period_month: period_month,
      p_acting_user: acting_user,
      p_reason: reason ?? null,
      p_recompute_first: recompute_first,
    })
  )
  if (res.error) throw res.error
  return Array.isArray(res.data) ? res.data[0] : res.data
}

/**
 * Calls the reopen_month(period_month, acting_user, reason) RPC. Reason is required.
 * Returns: { event_id, period_month, status, allocations_unlocked, notes }
 */
export async function reopenMonth({ period_month, reason, acting_user = null }) {
  if (!reason || !reason.trim()) throw new Error('Reason is required to reopen a month.')
  const res = await withRetry(() =>
    supabase.rpc('reopen_month', {
      p_period_month: period_month,
      p_acting_user: acting_user,
      p_reason: reason,
    })
  )
  if (res.error) throw res.error
  return Array.isArray(res.data) ? res.data[0] : res.data
}

/**
 * Closes a single allocation row (delete) — used when a PM zeroes out a manually-added month.
 * Skips locked rows (DB trigger enforces).
 */
export async function clearManualAllocation({ po_number, period_month }) {
  const res = await withRetry(() =>
    supabase
      .from('revenue_allocations')
      .delete()
      .eq('po_number', po_number)
      .eq('period_month', period_month)
      .eq('is_locked', false)
  )
  if (res.error) throw res.error
  return res.data
}
