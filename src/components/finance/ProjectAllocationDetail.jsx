import { useState, useMemo } from 'react'
import { Badge } from '../ui'

function fmtCurrency(n) {
  if (n == null || isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}
function fmtPctNum(n) {
  if (n == null || isNaN(n)) return ''
  return (Number(n) * 100).toFixed(1)
}
function fmtMonth(iso) {
  const [y, m] = iso.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

const SOURCE_STYLES = {
  auto_cost_dialed:   { bg: 'rgba(41,128,185,0.10)',  text: '#1F5E87', label: 'cost' },
  auto_forecast:      { bg: 'rgba(74,140,92,0.10)',   text: '#2E6B3F', label: 'fwd' },
  manual_override:    { bg: 'rgba(229,122,58,0.18)',  text: '#B8561E', label: 'manual' },
  duration_weighted:  { bg: 'rgba(74,140,92,0.10)',   text: '#2E6B3F', label: 'fwd' },
  default:            { bg: 'transparent',            text: 'inherit',  label: '' },
}

function EditableCell({ initialPct, locked, source, onSave }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(fmtPctNum(initialPct))
  const sourceStyle = SOURCE_STYLES[source] || SOURCE_STYLES.default

  function save() {
    setEditing(false)
    const v = parseFloat(value)
    if (isNaN(v)) { setValue(fmtPctNum(initialPct)); return }
    if (Math.abs(v / 100 - (initialPct || 0)) < 0.0001) return // no change
    onSave(v)
  }

  if (locked) {
    return (
      <div
        className="px-2 py-1 text-xs font-mono text-right rounded"
        style={{ background: 'rgba(58,46,40,0.08)', color: 'rgba(58,46,40,0.6)' }}
        title="Locked — month is closed"
      >
        🔒 {fmtPctNum(initialPct)}%
      </div>
    )
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-full px-2 py-1 text-xs font-mono text-right rounded hover:ring-1 hover:ring-orange/40 transition"
        style={{ background: sourceStyle.bg, color: sourceStyle.text }}
        title={source ? `source: ${source}` : 'no allocation row'}
      >
        {initialPct != null ? `${fmtPctNum(initialPct)}%` : '—'}
      </button>
    )
  }

  return (
    <input
      type="number"
      step="0.1"
      autoFocus
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={e => {
        if (e.key === 'Enter') save()
        if (e.key === 'Escape') { setValue(fmtPctNum(initialPct)); setEditing(false) }
      }}
      className="w-full px-2 py-1 text-xs font-mono text-right rounded border border-orange focus:outline-none focus:ring-1 focus:ring-orange"
    />
  )
}

export function ProjectAllocationDetail({ project, months, onEditCell, onRecompute, recomputing }) {
  // Defensive — months should always be an array
  const monthRows = months ?? []

  const sumPct = useMemo(() => {
    let total = 0
    for (const m of monthRows) total += Number(m.forecast_pct ?? 0)
    return total
  }, [monthRows])

  const headlineKpis = useMemo(() => {
    const billed = monthRows.reduce((a, m) => a + Number(m.billed_revenue ?? 0), 0)
    const wip    = monthRows.reduce((a, m) => a + Number(m.wip_revenue ?? 0), 0)
    const earned = monthRows.reduce((a, m) => a + (m.earned_this_period != null ? Number(m.earned_this_period) : 0), 0)
    const earnedKnown = monthRows.some(m => m.earned_this_period != null)
    return { billed, wip, earned, earnedKnown }
  }, [monthRows])

  if (!project) return null
  const sumOk = Math.abs(sumPct - 1) < 0.005 || sumPct === 0

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-mono text-xl font-bold text-charcoal">{project.po_number}</h2>
            <span className="text-charcoal text-base font-medium">{project.job_name}</span>
          </div>
          <div className="text-xs text-muted mt-1">
            {project.division_code || '—'} · {project.segment || '—'} · {project.project_manager || 'No PM'} · {project.stage || '—'}
          </div>
        </div>
        <button
          onClick={onRecompute}
          disabled={recomputing}
          className="px-3 py-1.5 text-xs font-medium border border-orange text-orange rounded-md hover:bg-orange hover:text-white transition-colors disabled:opacity-50"
        >
          {recomputing ? 'Recomputing…' : '↻ Recompute'}
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <Kpi label="Total Revenue" value={fmtCurrency(project.total_revenue)} />
        <Kpi label="Allocated %" value={`${(sumPct * 100).toFixed(1)}%`} warn={!sumOk} />
        <Kpi label="Billed to Date" value={fmtCurrency(headlineKpis.billed)} />
        <Kpi label="WIP Accrued" value={fmtCurrency(headlineKpis.wip)} />
        <Kpi
          label="Earned (snapshots)"
          value={headlineKpis.earnedKnown ? fmtCurrency(headlineKpis.earned) : '—'}
          warn={!headlineKpis.earnedKnown}
          warnText="no snapshots"
        />
      </div>

      {/* Warning if sum is off */}
      {!sumOk && monthRows.length > 0 && (
        <div className="mb-4 px-3 py-2 rounded-md text-xs"
             style={{ background: 'rgba(229,122,58,0.10)', color: '#B8561E' }}>
          Allocations sum to {(sumPct * 100).toFixed(1)}% — should be 100%. Edits are saved, but the project will show as incomplete until balanced.
        </div>
      )}

      {/* Monthly grid */}
      {monthRows.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted border border-line rounded-lg">
          No monthly rows yet. Click <strong>Recompute</strong> above to seed allocations.
        </div>
      ) : (
        <div className="border border-line rounded-lg overflow-x-auto">
          <table className="text-sm" style={{ minWidth: '100%' }}>
            <thead className="bg-surface-subtle border-b border-line-strong">
              <tr>
                <th className="text-left px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em] sticky left-0 bg-surface-subtle z-10" style={{ minWidth: 130 }}>
                  Month
                </th>
                <th className="text-right px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">Allocated %</th>
                <th className="text-right px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">Allocated $</th>
                <th className="text-right px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">Billed</th>
                <th className="text-right px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">WIP</th>
                <th className="text-right px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">Earned</th>
                <th className="text-left  px-3 py-[10px] text-[10px] font-bold text-muted uppercase tracking-[0.08em]">Source</th>
              </tr>
            </thead>
            <tbody>
              {monthRows.map(m => {
                const locked = !!m.allocation_is_locked
                const source = m.allocation_source
                const tag = SOURCE_STYLES[source]?.label || ''
                return (
                  <tr key={m.period_month} className="border-b border-line hover:bg-orange/5">
                    <td className="px-3 py-2 sticky left-0 bg-surface z-10 whitespace-nowrap font-medium">
                      {fmtMonth(m.period_month)}
                      {locked && <span className="ml-1 text-muted">🔒</span>}
                    </td>
                    <td className="px-3 py-1.5 w-[110px]">
                      <EditableCell
                        initialPct={m.forecast_pct}
                        locked={locked}
                        source={source}
                        onSave={(v) => onEditCell(m.period_month, v)}
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{fmtCurrency(m.forecast_revenue)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{fmtCurrency(m.billed_revenue)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{fmtCurrency(m.wip_revenue)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {m.earned_this_period != null ? fmtCurrency(m.earned_this_period) : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {source ? (
                        <span
                          className="inline-block px-1.5 py-0.5 rounded font-medium"
                          style={{
                            background: SOURCE_STYLES[source]?.bg || 'transparent',
                            color: SOURCE_STYLES[source]?.text || 'inherit',
                          }}
                        >
                          {tag || source}
                        </span>
                      ) : <span className="text-muted">—</span>}
                    </td>
                  </tr>
                )
              })}
              {/* Totals row */}
              <tr className="bg-surface-muted font-semibold">
                <td className="px-3 py-2 sticky left-0 bg-surface-muted z-10">Total</td>
                <td className={`px-3 py-2 text-right font-mono text-xs ${!sumOk ? 'text-[#B8561E]' : ''}`}>
                  {(sumPct * 100).toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {fmtCurrency(monthRows.reduce((a, m) => a + Number(m.forecast_revenue ?? 0), 0))}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">{fmtCurrency(headlineKpis.billed)}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{fmtCurrency(headlineKpis.wip)}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {headlineKpis.earnedKnown ? fmtCurrency(headlineKpis.earned) : <span className="text-muted">—</span>}
                </td>
                <td className="px-3 py-2"></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 mt-4 text-xs text-muted">
        <span className="font-semibold uppercase tracking-wider text-[10px]">Cell Source:</span>
        <Legend swatch={SOURCE_STYLES.auto_cost_dialed} label="cost-dialed" />
        <Legend swatch={SOURCE_STYLES.auto_forecast}    label="forecast" />
        <Legend swatch={SOURCE_STYLES.manual_override}  label="manual" />
        <Legend swatch={{ bg: 'rgba(58,46,40,0.08)', text: 'rgba(58,46,40,0.6)' }} label="locked" />
      </div>
    </>
  )
}

function Kpi({ label, value, warn, warnText }) {
  return (
    <div className="bg-surface border border-line rounded-md p-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className="font-mono text-base font-semibold text-charcoal mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      {warn && warnText && <div className="text-[10px] text-[#B8561E] mt-0.5">{warnText}</div>}
    </div>
  )
}

function Legend({ swatch, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-3 h-3 rounded-sm" style={{ background: swatch.bg, border: `1px solid ${swatch.text}33` }} />
      <span>{label}</span>
    </span>
  )
}
