import { useMemo } from 'react'
import { Badge } from '../ui'

function fmtCurrency(n) {
  if (n == null || isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}
function fmtDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${m}/${d}/${y}`
}

const TYPE_TONES = {
  Deposit:    'info',
  Progress:   'primary',
  Final:      'success',
  Retainage:  'warning',
  Unknown:    'default',
}

const STATUS_TONES = {
  Paid:    'success',
  Open:    'warning',
  Voided:  'error',
  Pending: 'info',
  Sent:    'info',
}

/**
 * Per-project invoice history table. Deposit rows are shown but their amount is
 * tracked separately (qbo invoices have total_amount = 0 for deposits — the deposit
 * dollars live in projects.deposit_amount).
 */
export function InvoiceHistory({ invoices, project, loading }) {
  const totals = useMemo(() => {
    let billed = 0, openBalance = 0, deposits = 0
    for (const inv of invoices ?? []) {
      const isDeposit = inv.milestone_type === 'Deposit'
      if (isDeposit) deposits += 1
      else           billed += Number(inv.total_amount ?? 0)
      openBalance += Number(inv.balance ?? 0)
    }
    return { billed, openBalance, deposits, count: invoices?.length ?? 0 }
  }, [invoices])

  const totalRevenue = Number(project?.total_revenue ?? 0)
  const remaining = Math.max(totalRevenue - totals.billed, 0)
  const remainingPct = totalRevenue > 0 ? (totals.billed / totalRevenue) : 0

  if (loading) return <div className="py-12 text-center text-sm text-muted">Loading invoices…</div>

  return (
    <>
      {/* Header strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Total Revenue" value={fmtCurrency(totalRevenue)} />
        <Stat
          label="Billed (revenue lines)"
          value={fmtCurrency(totals.billed)}
          sub={totalRevenue > 0 ? `${(remainingPct * 100).toFixed(0)}% of contract` : undefined}
        />
        <Stat label="Remaining to Bill" value={fmtCurrency(remaining)} />
        <Stat
          label="Invoices"
          value={`${totals.count}`}
          sub={totals.deposits > 0 ? `${totals.deposits} deposit-only` : undefined}
        />
      </div>

      {project?.expected_next_invoice_type && (
        <div className="mb-4 px-3 py-2 rounded-md text-xs"
             style={{ background: 'rgba(229,122,58,0.10)', color: '#B8561E' }}>
          Suggested next: <strong>{project.expected_next_invoice_type}</strong>
          {project.days_since_last_invoice != null && ` · ${project.days_since_last_invoice} days since last invoice`}
        </div>
      )}

      {(invoices?.length ?? 0) === 0 ? (
        <div className="py-12 text-center text-sm text-muted border border-line rounded-lg">
          No invoices on record for this PO.
        </div>
      ) : (
        <div className="border border-line rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-subtle border-b border-line-strong">
              <tr>
                <th className="text-left px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">Invoice #</th>
                <th className="text-left px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">Date</th>
                <th className="text-left px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">Type</th>
                <th className="text-left px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">Status</th>
                <th className="text-right px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">Total</th>
                <th className="text-right px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">Balance</th>
                <th className="text-left px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">Due</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => {
                const isDeposit = inv.milestone_type === 'Deposit'
                return (
                  <tr key={inv.id} className="border-b border-line hover:bg-orange/5 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-charcoal">{inv.invoice_number || '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{fmtDate(inv.invoice_date)}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone={TYPE_TONES[inv.milestone_type] || 'default'}>
                        {inv.milestone_type || 'Unknown'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={STATUS_TONES[inv.status] || 'default'}>{inv.status || '—'}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      {isDeposit ? <span className="text-muted italic">deposit</span> : fmtCurrency(inv.total_amount)}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono ${Number(inv.balance) > 0 ? 'text-[#B8561E] font-semibold' : ''}`}>
                      {fmtCurrency(inv.balance)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-muted">{fmtDate(inv.due_date)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function Stat({ label, value, sub }) {
  return (
    <div className="bg-surface border border-line rounded-md p-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className="font-mono text-base font-semibold text-charcoal mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-muted mt-0.5">{sub}</div>}
    </div>
  )
}
