import { supabase, withRetry } from '../supabase'

/**
 * Calls the recompute_revenue_allocation(po_number, acting_user) RPC.
 * Returns: { rows_inserted, rows_updated, rows_deleted, mode_used, details }
 */
export async function recomputeAllocation(po_number, acting_user = null) {
  const res = await withRetry(() =>
    supabase.rpc('recompute_revenue_allocation', {
      p_po_number: po_number,
      p_acting_user: acting_user,
    })
  )
  if (res.error) throw res.error
  // RPC returns a TABLE — Supabase returns array of rows
  return Array.isArray(res.data) ? res.data[0] : res.data
}

/**
 * Calls the recompute_all_open_allocations(acting_user) RPC.
 * Returns: array of { po_number, mode_used, rows_after, details }
 */
export async function recomputeAllOpenAllocations(acting_user = null) {
  const res = await withRetry(() =>
    supabase.rpc('recompute_all_open_allocations', {
      p_acting_user: acting_user,
    })
  )
  if (res.error) throw res.error
  return res.data ?? []
}

/**
 * Sets a manual allocation override for one (po_number, period_month) row.
 *
 * IMPORTANT: This bypasses the "functions are the write API" principle because
 * no RPC wrapper exists yet for manual overrides. When a backend `set_manual_allocation`
 * function is added, swap this implementation to use supabase.rpc().
 *
 * The DB trigger `prevent_locked_allocation_changes` still enforces lock semantics —
 * attempting to update a locked row will fail at the database level.
 *
 * @param {object} args
 * @param {string} args.po_number
 * @param {string} args.period_month  YYYY-MM-DD (first of month)
 * @param {number} args.allocated_pct fraction 0..1 OR percent 0..100 — auto-detected
 * @param {number} args.total_revenue project's total_revenue, used to compute amount
 * @param {string|null} args.acting_user uuid
 */
export async function setManualAllocation({
  po_number, period_month, allocated_pct, total_revenue, acting_user = null,
}) {
  // Accept either 0..1 or 0..100 input; normalize to fraction.
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
