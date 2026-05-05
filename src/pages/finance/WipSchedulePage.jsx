import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Button, KpiCard, Badge } from '../../components/ui'
import {
  listCloseQueueItems, listCloseQueuePeriods, removeCloseQueueItem,
  updateCloseQueueItem, markCloseQueueExported, addCloseQueueItem,
  buildInvoiceCsv, buildJournalEntryCsv, downloadCsv,
} from '../../lib/finance/closeQueue'
import { getWipProjects, getProjectByPo } from '../../lib/finance/queries'
import { getProjectPeriodActuals, mergePerioActuals } from '../../lib/finance/period'
import { ProjectDetailPanel } from '../../components/projects/ProjectDetailPanel'
import { updateProject } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

function fmtCurrency(n) {
  if (n == null || isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}
function fmtMonth(iso) {
  if (!iso) return '—'
  const [y, m] = iso.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
}

function defaultPeriodMonth() {
  // First of previous month, in ISO date.
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString().slice(0, 10)
}

/** End-of-month ISO date for a given period_month (first of month). */
function endOfPeriod(periodMonthIso) {
  const [y, m] = periodMonthIso.split('-').map(Number)
  const d = new Date(Date.UTC(y, m, 0)) // day 0 of NEXT month = last day of THIS month
  return d.toISOString().slice(0, 10)
}

const KIND_META = {
  invoice:  { label: 'Final Invoice',     tone: 'success', csvName: 'final_invoices' },
  progress: { label: 'Progress Billing',  tone: 'primary', csvName: 'progress_invoices' },
  wip:      { label: 'WIP Journal',       tone: 'info',    csvName: 'wip_journal' },
}

export function WipSchedulePage() {
  const { user } = useAuth()
  const [items, setItems]     = useState([])
  const [unbilled, setUnbilled] = useState([])  // unbilled-at-close projects (the unclassified pool)
  const [periods, setPeriods] = useState([])
  const [period, setPeriod]   = useState(defaultPeriodMonth())
  const [layout, setLayout]   = useState(() => {
    try { return localStorage.getItem('twodudes_wip_schedule_layout') ?? 'stacked' } catch { return 'stacked' }
  })

  useEffect(() => {
    try { localStorage.setItem('twodudes_wip_schedule_layout', layout) } catch {}
  }, [layout])
  const [showExported, setShowExported] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [editId, setEditId]   = useState(null)
  const [editAmount, setEditAmount] = useState('')
  const [editNotes, setEditNotes]   = useState('')
  const [toast, setToast]     = useState(null)
  const [assigningPo, setAssigningPo] = useState(null) // disable buttons during write

  // Slide-over project detail
  const [selectedProject, setSelectedProject] = useState(null)
  const [_, setDetailLoading]                 = useState(false)
  const periodMapRef = useRef(null)

  const handleRowClick = useCallback(async (row) => {
    setSelectedProject(row)
    setDetailLoading(true)
    try {
      const full = await getProjectByPo(row.po_number)
      if (full) {
        if (periodMapRef.current) {
          const [merged] = mergePerioActuals([full], periodMapRef.current)
          setSelectedProject(merged)
        } else {
          setSelectedProject(full)
        }
      }
    } catch (e) {
      console.error('[wip-schedule detail fetch]', e?.message)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const handleCellEdit = useCallback(async (po_number, field, value) => {
    setSelectedProject(prev => prev?.po_number === po_number ? { ...prev, [field]: value } : prev)
    const result = await updateProject(po_number, field, value)
    if (result?.error) {
      try { const full = await getProjectByPo(po_number); if (full) setSelectedProject(full) } catch {}
      showToast(`Save failed: ${result.error.message}`, 'error')
      return
    }
    try {
      const full = await getProjectByPo(po_number)
      if (full) setSelectedProject(prev => prev?.po_number === po_number ? full : prev)
    } catch {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      // 1. Load queue items + period list
      // 2. Load unbilled projects "as of" the period end so we get the same
      //    cumulative-through-end semantics as a close report
      const periodEnd = endOfPeriod(period)
      const [rows, pers, baseRows, periodMap] = await Promise.all([
        listCloseQueueItems({ period_month: period, status: showExported ? 'all' : 'pending' }),
        listCloseQueuePeriods(),
        getWipProjects({}),
        getProjectPeriodActuals('2000-01-01', periodEnd),
      ])
      periodMapRef.current = periodMap
      const merged = mergePerioActuals(baseRows, periodMap)
        .filter(r => Number(r.unbilled_revenue ?? 0) > 0 || Number(r.costs_in_excess_of_billings ?? 0) > 0)
      setItems(rows)
      setUnbilled(merged)
      setPeriods(pers)
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [period, showExported])

  useEffect(() => { refetch() }, [refetch])

  // Group by kind
  const grouped = useMemo(() => {
    const out = { invoice: [], progress: [], wip: [] }
    for (const it of items) {
      if (out[it.kind]) out[it.kind].push(it)
    }
    return out
  }, [items])

  // Set of POs that already have a row in the queue for this period (any status)
  const queuedPos = useMemo(
    () => new Set(items.map(it => it.po_number)),
    [items]
  )

  // Unclassified = unbilled-at-close MINUS POs already queued
  const unclassified = useMemo(
    () => unbilled
      .filter(r => !queuedPos.has(r.po_number))
      .sort((a, b) => Number(b.unbilled_revenue ?? 0) - Number(a.unbilled_revenue ?? 0)),
    [unbilled, queuedPos]
  )

  const unclassifiedTotal = useMemo(
    () => unclassified.reduce((a, r) => a + Number(r.unbilled_revenue ?? 0), 0),
    [unclassified]
  )

  const totals = useMemo(() => ({
    invoice:  grouped.invoice.reduce((a, r) => a + Number(r.amount || 0), 0),
    progress: grouped.progress.reduce((a, r) => a + Number(r.amount || 0), 0),
    wip:      grouped.wip.reduce((a, r) => a + Number(r.amount || 0), 0),
  }), [grouped])

  const grandTotal = totals.invoice + totals.progress + totals.wip

  function showToast(msg, kind = 'ok') {
    setToast({ msg, kind })
    setTimeout(() => setToast(null), 4000)
  }

  /** Quick-assign a row from the unclassified pool to a bucket. */
  async function handleAssign(row, kind) {
    setAssigningPo(row.po_number)
    try {
      // Default amount per kind: WIP uses CIEB (under-billing exposure),
      // others use unbilled_revenue (revenue earned − billed)
      const amount = kind === 'wip'
        ? Number(row.costs_in_excess_of_billings ?? row.unbilled_revenue ?? 0)
        : Number(row.unbilled_revenue ?? 0)
      await addCloseQueueItem({
        po_number:    row.po_number,
        job_name:     row.job_name,
        customer:     row.customer,
        kind,
        amount,
        notes:        null,
        period_month: period,
        drafted_by:   user?.id ?? null,
      })
      await refetch()
      const label = kind === 'invoice' ? 'Final Invoice' : kind === 'wip' ? 'WIP Journal' : 'Progress Billing'
      showToast(`PO ${row.po_number} → ${label} (${fmtCurrency(amount)})`)
    } catch (e) {
      showToast(e?.message || String(e), 'error')
    } finally {
      setAssigningPo(null)
    }
  }

  function startEdit(it) {
    setEditId(it.id)
    setEditAmount(String(it.amount))
    setEditNotes(it.notes ?? '')
  }
  function cancelEdit() { setEditId(null); setEditAmount(''); setEditNotes('') }

  async function commitEdit(id) {
    const amount = parseFloat(editAmount)
    if (isNaN(amount) || amount < 0) return cancelEdit()
    try {
      await updateCloseQueueItem(id, { amount, notes: editNotes.trim() || null })
      cancelEdit()
      await refetch()
    } catch (e) { showToast(e?.message || String(e), 'error') }
  }

  async function handleRemove(id) {
    if (!confirm('Remove this item from the queue?')) return
    try { await removeCloseQueueItem(id); await refetch() }
    catch (e) { showToast(e?.message || String(e), 'error') }
  }

  function handleExport(kind) {
    const rows = grouped[kind] ?? []
    if (rows.length === 0) return
    const csv = kind === 'wip'
      ? buildJournalEntryCsv(rows, { entryDate: period })
      : buildInvoiceCsv(rows, { invoiceDate: period })
    const filename = `${KIND_META[kind].csvName}_${period}.csv`
    downloadCsv(filename, csv)
    showToast(`Downloaded ${rows.length} ${KIND_META[kind].label} row${rows.length === 1 ? '' : 's'}.`)
  }

  async function handleMarkExported(kind) {
    const ids = (grouped[kind] ?? []).filter(r => r.status === 'pending').map(r => r.id)
    if (ids.length === 0) return
    if (!confirm(`Mark ${ids.length} ${KIND_META[kind].label} item${ids.length === 1 ? '' : 's'} as exported? They'll be hidden from the default view but kept for audit.`)) return
    try {
      await markCloseQueueExported(ids, user?.id ?? null)
      await refetch()
      showToast(`${ids.length} item${ids.length === 1 ? '' : 's'} marked as exported.`)
    } catch (e) { showToast(e?.message || String(e), 'error') }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold text-charcoal">WIP Schedule</h1>
        {loading && <span className="text-sm text-muted">Loading…</span>}
      </div>

      <p className="text-sm text-muted mb-5">
        Close-out review queue. Each item in this queue gets exported as a CSV and uploaded into QuickBooks Online,
        then marked exported. The queue resets to empty for the next month-close.
      </p>

      {/* Period selector + view toggle */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <label className="text-xs font-semibold text-charcoal">Period</label>
        <select
          value={period}
          onChange={e => setPeriod(e.target.value)}
          className="px-2.5 py-1.5 text-xs border border-line rounded focus:outline-none focus:ring-1 focus:ring-orange"
        >
          {/* Always offer the default period plus any persisted ones */}
          {[...new Set([defaultPeriodMonth(), period, ...periods])].map(p => (
            <option key={p} value={p}>{fmtMonth(p)}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs text-muted hover:text-charcoal cursor-pointer">
          <input type="checkbox" checked={showExported} onChange={e => setShowExported(e.target.checked)} className="accent-orange" />
          Show already-exported items
        </label>

        <div className="flex-1" />

        {/* Layout toggle */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">Layout</span>
          <div className="flex rounded-md border border-line overflow-hidden">
            <button
              onClick={() => setLayout('stacked')}
              className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                layout === 'stacked' ? 'bg-surface-muted text-charcoal font-semibold' : 'text-muted hover:bg-surface-subtle'
              }`}
            >
              Stacked
            </button>
            <button
              onClick={() => setLayout('split')}
              className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                layout === 'split' ? 'bg-surface-muted text-charcoal font-semibold' : 'text-muted hover:bg-surface-subtle'
              }`}
              title="Beta — unclassified pool on the left, three buckets stacked on the right"
            >
              Split <span className="ml-1 text-[9px] uppercase text-orange">beta</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-5">
        <KpiCard
          label="Unclassified"
          value={`${unclassified.length}`}
          sub={fmtCurrency(unclassifiedTotal)}
          subTone={unclassified.length > 0 ? 'warning' : 'success'}
        />
        <KpiCard label="Final Invoices"   value={`${grouped.invoice.length}`}  sub={fmtCurrency(totals.invoice)} />
        <KpiCard label="Progress Billing" value={`${grouped.progress.length}`} sub={fmtCurrency(totals.progress)} />
        <KpiCard label="WIP Entries"      value={`${grouped.wip.length}`}      sub={fmtCurrency(totals.wip)} />
        <KpiCard label="Grand Total"      value={fmtCurrency(grandTotal)}      sub="3 buckets" />
      </div>

      {error && <p className="text-sm text-error mb-3">Failed to load: {error}</p>}

      <div className={layout === 'split' ? 'grid grid-cols-1 lg:grid-cols-2 gap-4 items-start' : ''}>

      {/* Unclassified pool — projects with unbilled at close that haven't been bucketed yet */}
      <section className={layout === 'split' ? 'mb-0 lg:sticky lg:top-2 lg:max-h-[calc(100vh-2rem)] lg:overflow-auto' : 'mb-6'}>
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <Badge tone={unclassified.length > 0 ? 'warning' : 'success'}>
            {unclassified.length === 0 ? 'All Classified ✓' : 'Unclassified'}
          </Badge>
          <span className="text-xs text-muted">
            {unclassified.length} project{unclassified.length === 1 ? '' : 's'} unbilled at {fmtMonth(period)} ·{' '}
            {fmtCurrency(unclassifiedTotal)}
          </span>
        </div>

        {unclassified.length === 0 ? (
          <div className="text-xs text-muted italic py-6 px-4 border border-dashed border-line rounded-md">
            Every project with unbilled exposure as of {fmtMonth(period)} has been assigned to a bucket. Queue is clean.
          </div>
        ) : (
          <div className="border border-line rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-subtle border-b border-line-strong">
                <tr>
                  <th className="text-left px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">Project</th>
                  <th className="text-left px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">PM</th>
                  <th className="text-left px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">Stage</th>
                  <th className="text-right px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">% Comp</th>
                  <th className="text-right px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">Revenue</th>
                  <th className="text-right px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">Billed</th>
                  <th className="text-right px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">Unbilled</th>
                  <th className="text-right px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">CIEB</th>
                  <th className="text-right px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">Assign To</th>
                </tr>
              </thead>
              <tbody>
                {unclassified.map(r => {
                  const busy = assigningPo === r.po_number
                  return (
                    <tr
                      key={r.po_number}
                      onClick={() => handleRowClick(r)}
                      className="border-b border-line hover:bg-orange/5 cursor-pointer"
                    >
                      <td className="px-3 py-2.5">
                        <div className="font-mono font-semibold text-charcoal">{r.po_number}</div>
                        <div className="text-xs text-muted truncate max-w-[260px]">{r.job_name}</div>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{r.project_manager || '—'}</td>
                      <td className="px-3 py-2.5 text-xs">{r.stage || '—'}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs">
                        {r.pct_complete != null ? `${(Number(r.pct_complete) * 100).toFixed(0)}%` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">{fmtCurrency(r.total_revenue)}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{fmtCurrency(r.amount_billed_to_date)}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-[#B8561E]">{fmtCurrency(r.unbilled_revenue)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs">{fmtCurrency(r.costs_in_excess_of_billings)}</td>
                      <td
                        className="px-3 py-2.5 whitespace-nowrap text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {layout === 'split'
                          ? <AssignDropdown busy={busy} onAssign={(kind) => handleAssign(r, kind)} />
                          : (
                            <>
                              <Button variant="ghost" size="sm" disabled={busy} onClick={() => handleAssign(r, 'invoice')}>→ Final</Button>
                              <Button variant="ghost" size="sm" disabled={busy} onClick={() => handleAssign(r, 'progress')}>→ Progress</Button>
                              <Button variant="ghost" size="sm" disabled={busy} onClick={() => handleAssign(r, 'wip')}>→ WIP</Button>
                            </>
                          )
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Three queue sections */}
      <div className={layout === 'split' ? 'space-y-4' : 'space-y-6'}>
        {(['invoice', 'progress', 'wip']).map(kind => (
          <QueueSection
            key={kind}
            kind={kind}
            rows={grouped[kind]}
            editId={editId}
            editAmount={editAmount}
            editNotes={editNotes}
            onEditAmount={setEditAmount}
            onEditNotes={setEditNotes}
            onStartEdit={startEdit}
            onCommitEdit={commitEdit}
            onCancelEdit={cancelEdit}
            onRemove={handleRemove}
            onExport={() => handleExport(kind)}
            onMarkExported={() => handleMarkExported(kind)}
            onRowClick={handleRowClick}
            compact={layout === 'split'}
          />
        ))}
      </div>

      </div>{/* /split-layout-wrapper */}

      {selectedProject && (
        <ProjectDetailPanel
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onCellEdit={handleCellEdit}
          asOfDate={endOfPeriod(period)}
        />
      )}

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-elevated text-sm z-50 ${toast.kind === 'error' ? 'bg-error text-white' : 'bg-charcoal text-white'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

function QueueSection({
  kind, rows = [],
  editId, editAmount, editNotes,
  onEditAmount, onEditNotes,
  onStartEdit, onCommitEdit, onCancelEdit, onRemove,
  onExport, onMarkExported,
  onRowClick,
  compact = false,
}) {
  const meta = KIND_META[kind]
  const total = rows.reduce((a, r) => a + Number(r.amount || 0), 0)
  const pendingCount = rows.filter(r => r.status === 'pending').length
  const exportedCount = rows.length - pendingCount

  return (
    <section>
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <Badge tone={meta.tone}>{meta.label}</Badge>
        <span className="text-xs text-muted">{rows.length} item{rows.length === 1 ? '' : 's'} · {fmtCurrency(total)}</span>
        {exportedCount > 0 && <span className="text-[10px] text-muted">({exportedCount} exported)</span>}
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={onMarkExported} disabled={pendingCount === 0}>Mark Exported</Button>
        <Button variant="primary" size="sm" onClick={onExport} disabled={rows.length === 0}>
          Export CSV
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="text-xs text-muted italic py-6 px-4 border border-dashed border-line rounded-md">
          No items in this queue.
        </div>
      ) : (
        <div className="border border-line rounded-lg overflow-hidden">
          <table className={`w-full ${compact ? 'text-xs' : 'text-sm'}`}>
            <thead className="bg-surface-subtle border-b border-line-strong">
              <tr>
                <th className="text-left px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">Project</th>
                {!compact && <th className="text-left px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">Customer</th>}
                <th className="text-right px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">Amount</th>
                {!compact && <th className="text-left px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">Notes</th>}
                <th className="text-left px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">Status</th>
                {!compact && <th className="text-left px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">Drafted</th>}
                <th className="text-right px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr
                  key={r.id}
                  onClick={() => editId !== r.id && onRowClick?.(r)}
                  className={`border-b border-line hover:bg-orange/5 ${onRowClick && editId !== r.id ? 'cursor-pointer' : ''}`}
                >
                  <td className="px-3 py-2.5">
                    <div className="font-mono font-semibold text-charcoal">{r.po_number}</div>
                    <div className="text-xs text-muted truncate max-w-[260px]">{r.job_name}</div>
                  </td>
                  {!compact && <td className="px-3 py-2.5 text-xs">{r.customer || '—'}</td>}
                  <td
                    className="px-3 py-2.5 text-right font-mono"
                    onClick={(e) => editId === r.id && e.stopPropagation()}
                  >
                    {editId === r.id ? (
                      <input
                        type="number" step="1" autoFocus
                        value={editAmount}
                        onChange={e => onEditAmount(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') onCommitEdit(r.id)
                          if (e.key === 'Escape') onCancelEdit()
                        }}
                        className="w-24 px-2 py-1 text-right font-mono text-sm border border-orange rounded focus:outline-none focus:ring-1 focus:ring-orange"
                      />
                    ) : fmtCurrency(r.amount)}
                  </td>
                  {!compact && (
                    <td className="px-3 py-2.5 text-xs max-w-[280px]">
                      {editId === r.id ? (
                        <input
                          type="text"
                          value={editNotes}
                          onChange={e => onEditNotes(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') onCommitEdit(r.id)
                            if (e.key === 'Escape') onCancelEdit()
                          }}
                          className="w-full px-2 py-1 text-xs border border-line rounded focus:outline-none focus:ring-1 focus:ring-orange"
                        />
                      ) : (r.notes || '—')}
                    </td>
                  )}
                  <td className="px-3 py-2.5">
                    {r.status === 'pending' ? (
                      <Badge tone="warning">pending</Badge>
                    ) : (
                      <Badge tone="default">exported</Badge>
                    )}
                  </td>
                  {!compact && <td className="px-3 py-2.5 text-[11px] text-muted whitespace-nowrap">{fmtDateTime(r.drafted_at)}</td>}
                  <td
                    className="px-3 py-2.5 text-right whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {editId === r.id ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => onCommitEdit(r.id)}>Save</Button>
                        <Button variant="ghost" size="sm" onClick={onCancelEdit}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        {r.status === 'pending' && (
                          <Button variant="ghost" size="sm" onClick={() => onStartEdit(r)}>Edit</Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => onRemove(r.id)}>Remove</Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/** Compact "Assign ▾" dropdown — used in the Split layout where the row is narrow. */
function AssignDropdown({ busy, onAssign }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  const pick = (kind) => { setOpen(false); onAssign(kind) }
  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        disabled={busy}
        className="px-2.5 py-1 rounded text-xs font-medium border border-line text-charcoal/70 hover:bg-surface-muted transition-colors disabled:opacity-50"
      >
        Assign ▾
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 z-50 mt-1 w-40 bg-surface border border-line rounded-md shadow-elevated py-1"
        >
          <button onClick={() => pick('invoice')}  className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-subtle">→ Final Invoice</button>
          <button onClick={() => pick('progress')} className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-subtle">→ Progress Bill</button>
          <button onClick={() => pick('wip')}      className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-subtle">→ WIP Journal</button>
        </div>
      )}
    </div>
  )
}
