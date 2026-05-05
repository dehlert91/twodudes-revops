import { supabase, withRetry } from '../supabase'

/**
 * Close-queue: per-month review queue of items that need to be pushed into QBO
 * after a month-close. Three kinds:
 *   - invoice  → full invoice (project complete, send the rest)
 *   - progress → progress-billing invoice (partial)
 *   - wip      → WIP journal entry (accrual into the WIP schedule)
 *
 * Items are scoped to a `period_month` (the close date). After the team
 * downloads the CSV and uploads to QBO, they "Mark Exported" which flips
 * the status from 'pending' to 'exported' (kept for audit, hidden by default).
 */

/**
 * Adds (or replaces) a pending item for one (po, kind, period_month) tuple.
 * The unique partial index enforces "only one pending row per po+kind+period",
 * so we use upsert with onConflict.
 */
export async function addCloseQueueItem({ po_number, job_name, customer, kind, amount, notes, period_month, drafted_by = null }) {
  if (!['invoice', 'progress', 'wip'].includes(kind)) throw new Error(`Invalid kind: ${kind}`)
  if (!period_month) throw new Error('period_month is required')

  // First clear any existing PENDING row for this (po, kind, period) — replace, don't accumulate
  await withRetry(() =>
    supabase
      .from('close_queue_items')
      .delete()
      .match({ po_number, kind, period_month, status: 'pending' })
  )

  const res = await withRetry(() =>
    supabase
      .from('close_queue_items')
      .insert({
        po_number, job_name, customer, kind,
        amount: Number(amount) || 0,
        notes: notes ?? null,
        period_month,
        status: 'pending',
        drafted_by,
      })
      .select()
      .single()
  )
  if (res.error) throw res.error
  return res.data
}

/** Lists items in the queue for a given period. */
export async function listCloseQueueItems({ period_month, status = 'pending' } = {}) {
  let q = supabase.from('close_queue_items').select('*').order('drafted_at', { ascending: false })
  if (period_month) q = q.eq('period_month', period_month)
  if (status === 'all') {
    // no status filter
  } else {
    q = q.eq('status', status)
  }
  const res = await withRetry(() => q)
  if (res.error) throw res.error
  return res.data ?? []
}

export async function updateCloseQueueItem(id, patch) {
  const res = await withRetry(() =>
    supabase.from('close_queue_items').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  )
  if (res.error) throw res.error
  return res.data
}

export async function removeCloseQueueItem(id) {
  const res = await withRetry(() =>
    supabase.from('close_queue_items').delete().eq('id', id)
  )
  if (res.error) throw res.error
  return res.data
}

/**
 * Flip a batch of pending items to 'exported' after a CSV download.
 * Pass an array of ids (typically all items of a given kind for the period).
 */
export async function markCloseQueueExported(ids, exported_by = null) {
  if (!ids?.length) return []
  const now = new Date().toISOString()
  const res = await withRetry(() =>
    supabase
      .from('close_queue_items')
      .update({ status: 'exported', exported_at: now, exported_by, updated_at: now })
      .in('id', ids)
      .select()
  )
  if (res.error) throw res.error
  return res.data ?? []
}

/** Distinct period_months that have any items (for the period selector). */
export async function listCloseQueuePeriods() {
  const res = await withRetry(() =>
    supabase.from('close_queue_items').select('period_month').order('period_month', { ascending: false })
  )
  if (res.error) throw res.error
  const seen = new Set()
  const out = []
  for (const r of res.data ?? []) {
    if (!seen.has(r.period_month)) { seen.add(r.period_month); out.push(r.period_month) }
  }
  return out
}

// ── CSV builders ──────────────────────────────────────────────────────────────

function csvEsc(v) {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Generic QBO Online "Invoice import" friendly CSV.
 * Columns chosen to match the most common QBO bulk-invoice template.
 * Adjust as needed once user shares their actual template.
 */
export function buildInvoiceCsv(rows, { invoiceDate } = {}) {
  const headers = [
    'InvoiceNo', 'Customer', 'InvoiceDate', 'DueDate',
    'Item(Product/Service)', 'ItemDescription', 'ItemAmount',
    'Memo', 'PONumber', 'Class',
  ]
  const lines = [headers.map(csvEsc).join(',')]
  for (const r of rows) {
    lines.push([
      '',                                  // InvoiceNo (let QBO assign)
      r.customer ?? '',
      invoiceDate ?? '',                   // user may want to set this manually
      '',                                  // DueDate (QBO calculates)
      r.kind === 'progress' ? 'Progress Billing' : 'Project Revenue',
      `${r.job_name ?? ''} ${r.notes ? '— ' + r.notes : ''}`.trim(),
      Number(r.amount).toFixed(2),
      r.notes ?? '',
      r.po_number,
      '',                                  // Class (division/segment) — TBD when QBO chart of accounts is shared
    ].map(csvEsc).join(','))
  }
  return lines.join('\n')
}

/**
 * Generic QBO Online "Journal Entry import" friendly CSV.
 * One JE per WIP item (two lines: debit WIP/Earned Revenue, credit Unearned/Deferred — placeholder accounts).
 */
export function buildJournalEntryCsv(rows, { entryDate } = {}) {
  const headers = ['JournalNo', 'EntryDate', 'Account', 'Debit', 'Credit', 'Memo', 'Name', 'Class']
  const lines = [headers.map(csvEsc).join(',')]
  let je = 0
  for (const r of rows) {
    je += 1
    const journalNo = `WIP-${(r.period_month ?? '').slice(0, 7)}-${String(je).padStart(3, '0')}`
    const memo = `WIP accrual — PO ${r.po_number}${r.notes ? ' — ' + r.notes : ''}`
    // Debit: WIP / Unbilled Revenue asset
    lines.push([
      journalNo,
      entryDate ?? r.period_month ?? '',
      'WIP - Unbilled Revenue',          // placeholder — user maps to actual QBO account
      Number(r.amount).toFixed(2),
      '',
      memo,
      r.customer ?? '',
      '',
    ].map(csvEsc).join(','))
    // Credit: Earned Revenue
    lines.push([
      journalNo,
      entryDate ?? r.period_month ?? '',
      'Earned Revenue',                   // placeholder
      '',
      Number(r.amount).toFixed(2),
      memo,
      r.customer ?? '',
      '',
    ].map(csvEsc).join(','))
  }
  return lines.join('\n')
}

export function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
