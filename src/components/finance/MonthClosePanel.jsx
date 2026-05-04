import { useState } from 'react'
import { Badge, Button } from '../ui'

function fmtMonthLong(iso) {
  const [y, m] = iso.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
}

const STATUS_TONES = {
  open:     'default',
  closed:   'success',
  reopened: 'warning',
}

/**
 * Modal for confirming a close or reopen action.
 * Reason is required for reopen, optional for close.
 */
function ActionDialog({ kind, period_month, onConfirm, onCancel, busy }) {
  const [reason, setReason] = useState('')
  const [recompute, setRecompute] = useState(true)
  const isReopen = kind === 'reopen'
  const reasonRequired = isReopen
  const canSubmit = !busy && (!reasonRequired || reason.trim().length > 0)

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30">
      <div className="bg-surface border border-line rounded-lg shadow-elevated p-5 w-[420px]">
        <p className="text-sm font-semibold text-charcoal mb-1">
          {isReopen ? 'Reopen' : 'Close'} {fmtMonthLong(period_month)}?
        </p>
        <p className="text-xs text-muted mb-3">
          {isReopen
            ? 'This will unlock all allocation rows for this month so they can be edited or recomputed. The action is logged.'
            : 'This will recompute all open projects, lock every allocation row in this month, and snapshot all open projects.'}
        </p>

        {!isReopen && (
          <label className="flex items-center gap-2 text-xs text-charcoal mb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={recompute}
              onChange={e => setRecompute(e.target.checked)}
              className="accent-orange"
            />
            Recompute all open allocations first (recommended)
          </label>
        )}

        <label className="block text-xs font-medium text-charcoal mt-2 mb-1">
          Reason {reasonRequired && <span className="text-error">*</span>}
        </label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          placeholder={isReopen ? 'Why is this month being reopened?' : 'Optional note for the audit log…'}
          className="w-full px-2 py-1.5 text-sm border border-line rounded focus:outline-none focus:ring-1 focus:ring-orange resize-none"
        />

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>Cancel</Button>
          <button
            disabled={!canSubmit}
            onClick={() => onConfirm({ reason: reason.trim() || null, recompute_first: recompute })}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              isReopen
                ? 'bg-error text-white hover:brightness-90'
                : 'bg-orange text-white hover:bg-orange-dark'
            } disabled:opacity-50`}
          >
            {busy ? 'Working…' : isReopen ? 'Reopen month' : 'Close month'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function MonthClosePanel({
  months, loading, onClose, onReopen, busyMonth,
  selectedEvents, selectedMonth, onSelectMonth,
}) {
  const [dialog, setDialog] = useState(null) // { kind, period_month }

  function handleConfirm({ reason, recompute_first }) {
    if (!dialog) return
    const m = dialog.period_month
    const kind = dialog.kind
    setDialog(null)
    if (kind === 'reopen') onReopen({ period_month: m, reason })
    else                   onClose({ period_month: m, reason, recompute_first })
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-muted">Loading close history…</div>
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Months list */}
      <div className="flex-1 border border-line rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-surface-subtle border-b border-line-strong text-[10px] font-bold text-muted uppercase tracking-[0.08em]">
          Months
        </div>
        <ul>
          {months.map(m => {
            const isSelected = selectedMonth === m.period_month
            const isBusy = busyMonth === m.period_month
            return (
              <li
                key={m.period_month}
                className={`flex items-center justify-between gap-3 px-3 py-2.5 border-b border-line cursor-pointer transition-colors ${
                  isSelected ? 'bg-orange/10' : 'hover:bg-orange/5'
                }`}
                onClick={() => onSelectMonth(m.period_month)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-medium text-charcoal whitespace-nowrap">{fmtMonthLong(m.period_month)}</span>
                  <Badge tone={STATUS_TONES[m.status] || 'default'}>{m.status}</Badge>
                  {m.last_acted_at && (
                    <span className="text-[11px] text-muted truncate">{fmtTime(m.last_acted_at)}</span>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {m.status === 'closed' ? (
                    <Button
                      variant="ghost" size="sm"
                      disabled={isBusy}
                      onClick={(e) => { e.stopPropagation(); setDialog({ kind: 'reopen', period_month: m.period_month }) }}
                    >
                      Reopen
                    </Button>
                  ) : (
                    <Button
                      variant="primary" size="sm"
                      disabled={isBusy}
                      onClick={(e) => { e.stopPropagation(); setDialog({ kind: 'close', period_month: m.period_month }) }}
                    >
                      {isBusy ? 'Closing…' : 'Close'}
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Event log for selected month */}
      <div className="lg:w-[380px] border border-line rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-surface-subtle border-b border-line-strong text-[10px] font-bold text-muted uppercase tracking-[0.08em]">
          {selectedMonth ? `${fmtMonthLong(selectedMonth)} — Audit Log` : 'Audit Log'}
        </div>
        {!selectedMonth ? (
          <p className="px-3 py-6 text-xs text-muted">Select a month to view its event history.</p>
        ) : (selectedEvents?.length ?? 0) === 0 ? (
          <p className="px-3 py-6 text-xs text-muted">No close/reopen events yet for this month.</p>
        ) : (
          <ul>
            {selectedEvents.map(e => (
              <li key={e.id} className="px-3 py-2.5 border-b border-line">
                <div className="flex items-center gap-2">
                  <Badge tone={e.event_type === 'reopen' ? 'warning' : 'success'}>{e.event_type}</Badge>
                  <span className="text-[11px] text-muted">{fmtTime(e.acted_at)}</span>
                </div>
                {e.reason && <p className="text-xs text-charcoal mt-1.5">{e.reason}</p>}
                <div className="text-[11px] text-muted mt-1 font-mono">
                  {e.allocations_locked_count != null && `locked ${e.allocations_locked_count} · `}
                  {e.allocations_unlocked_count != null && `unlocked ${e.allocations_unlocked_count} · `}
                  {e.snapshots_created_count != null && `snapshots ${e.snapshots_created_count} · `}
                  {e.projects_recomputed_count != null && `recomputed ${e.projects_recomputed_count}`}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {dialog && (
        <ActionDialog
          kind={dialog.kind}
          period_month={dialog.period_month}
          busy={busyMonth === dialog.period_month}
          onCancel={() => setDialog(null)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  )
}
