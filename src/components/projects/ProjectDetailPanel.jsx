import { useEffect, useState, useRef, useCallback } from 'react'
import { STAGE_COLORS, PROJECT_STATUS_COLORS } from './stageConfig'
import { Badge } from '../ui'
import { fmtCurrency, fmtPct, fmtRate, fmtHours, fmtDate } from './columns/formatters'

/* ============================================================
   Project Detail Panel
   - Hero KPIs + Schedule Track up top
   - Unified Financials table (Revenue / Costs / Profitability)
   - Job Info, Billing & WIP as dense row sections
============================================================ */
export function ProjectDetailPanel({ project, onClose, onCellEdit, asOfDate, asOfStart }) {
  const [hideEmpty, setHideEmpty] = useState(true)

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!project) return null

  const stageCfg  = STAGE_COLORS[project.stage]           ?? { tone: 'default', dot: 'bg-muted' }
  const statusCfg = PROJECT_STATUS_COLORS[project.project_status] ?? { tone: 'default' }
  const asOfIso = asOfDate || new Date().toISOString().slice(0, 10)
  const hasPeriod = !!(asOfStart && asOfDate)
  const addr = [project.job_site_address, project.city, project.state, project.zip_code]
    .filter(Boolean).join(', ')

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40"
           onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <aside className="fixed right-0 top-0 h-full w-[760px] max-w-full bg-surface
                        z-50 shadow-elevated flex flex-col">

        {/* ---------- STICKY HEADER ---------- */}
        <div className="flex-shrink-0 px-7 pt-5 pb-4 border-b border-line-soft">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <CopyButton text={project.po_number}>PO · {project.po_number}</CopyButton>
              <h2 className="mt-1 font-display text-[19px] font-bold text-ink leading-snug
                             tracking-[-0.01em]">
                {project.job_name}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Badge tone={stageCfg.tone} dot={stageCfg.dot}>{project.stage}</Badge>
                {project.project_status && (
                  <Badge tone={statusCfg.tone}>{project.project_status}</Badge>
                )}
                <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-sm
                                 bg-surface-muted border border-line-soft
                                 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted"
                      title={hasPeriod ? 'Values reflect activity within this period only' : 'Cost-to-date values reflect this date'}>
                  <CalendarIcon />
                  {hasPeriod
                    ? `${fmtDate(asOfStart)} – ${fmtDate(asOfIso)}`
                    : `As of ${fmtDate(asOfIso)}`}
                </span>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <IconBtn title="Pin"><PinIcon /></IconBtn>
              <IconBtn title="Close" onClick={onClose}><XIcon /></IconBtn>
            </div>
          </div>
        </div>

        {/* ---------- SCROLL BODY ---------- */}
        <div className="flex-1 overflow-y-auto px-7 py-6">

          {/* Hero KPIs */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <Kpi label="Revenue"       value={fmtCurrency(project.total_revenue)} />
            <Kpi label="Est. GP%"      value={fmtPct(project.est_gp_pct)}
                 sub={fmtCurrency(project.est_gross_profit)} accent />
            <Kpi label="GP $/hr"       value={fmtCurrency(project.est_gp_per_hour)} />
            <Kpi label="Hours to Date" value={fmtHours(project.hours_to_date)}
                 sub={project.est_hours_remaining != null
                      ? `${fmtHours(project.est_hours_remaining)} hrs remaining`
                      : 'Hrs remaining —'} />
          </div>

          {/* Schedule track */}
          <div className="mb-5">
            <ScheduleTrack
              start={project.estimated_start_date}
              end={project.estimated_completion_date}
              pctComplete={project.pct_complete}
              duration={project.duration_days} />
          </div>

          {/* Hide-empty toggle */}
          <div className="flex justify-end items-center gap-1.5 mb-1">
            <label className="inline-flex items-center gap-1.5 text-[11px] text-muted
                              uppercase tracking-[0.04em] font-semibold cursor-pointer">
              <input type="checkbox" checked={hideEmpty}
                     onChange={e => setHideEmpty(e.target.checked)}
                     className="accent-orange" />
              Hide empty
            </label>
          </div>

          {/* Job Info */}
          <Section title="Job Info" defaultOpen>
            <Row label="Customer"          value={project.customer}          emphasis  hideEmpty={hideEmpty} />
            <Row label="Company"           value={project.company}                      hideEmpty={hideEmpty} />
            <Row label="Segment"           value={project.segment}                      hideEmpty={hideEmpty} />
            <Row label="Sales Rep"         value={project.sales_rep}                    hideEmpty={hideEmpty} />
            <Row label="Team Leader"       value={project.team_leader}                  hideEmpty={hideEmpty} />
            <Row label="PM"                value={project.project_manager} emphasis   hideEmpty={hideEmpty} />
            <Row label="Source"            value={project.source_attribution}           hideEmpty={hideEmpty} />
            <Row label="New/Prev Customer" value={project.prev_or_new_customer}         hideEmpty={hideEmpty} />
            <Row label="Address"           value={addr || null}                         hideEmpty={hideEmpty} />
            <Row label="Date Sold"         value={fmtDate(project.date_job_sold)}       hideEmpty={hideEmpty} />
          </Section>

          {/* Financials — unified Revenue/Costs/Profitability */}
          <Section title="Financials"
                   meta={`Rev ${fmtCurrency(project.total_revenue)} · GP ${fmtPct(project.est_gp_pct)}`}
                   defaultOpen>
            <div className="pb-1.5">
              <FinancialsTable project={project} onCellEdit={onCellEdit} />
            </div>
            <Row label="Avg Labor $/hr"      value={fmtCurrency(project.avg_labor_cost_per_hour)} hideEmpty={hideEmpty} />
            <Row label="Realized Sales Rate" value={project.realized_sales_rate != null ? fmtRate(project.realized_sales_rate) : null} hideEmpty={hideEmpty} />
            <Row label="Sales Rate Variance" value={project.sales_rate_variance != null ? fmtRate(project.sales_rate_variance) : null} hideEmpty={hideEmpty} />
            <Row label="Productivity"        value={project.productivity != null ? fmtPct(project.productivity) : null} hideEmpty={hideEmpty} />
          </Section>

          {/* Billing & WIP */}
          <Section title="Billing & WIP">
            <Row label="Billed to Date"              value={fmtCurrency(project.amount_billed_to_date)}          hideEmpty={hideEmpty} />
            <Row label="Claimed to Date"             value={fmtCurrency(project.amount_claimed_to_date)}         hideEmpty={hideEmpty} />
            <Row label="Revenue Earned"              value={fmtCurrency(project.revenue_earned)}      emphasis  hideEmpty={hideEmpty} />
            <Row label="WIP to Date"                 value={fmtCurrency(project.wip_to_date)}                    hideEmpty={hideEmpty} />
            <Row label="Costs in Excess of Billings" value={fmtCurrency(project.costs_in_excess_of_billings)}    hideEmpty={hideEmpty} />
            <Row label="Billings in Excess of Costs" value={fmtCurrency(project.billings_in_excess_of_costs)}    hideEmpty={hideEmpty} />
          </Section>
        </div>

        {/* ---------- STICKY FOOTER ---------- */}
        {project.hubspot_url && (
          <div className="flex-shrink-0 px-7 py-3.5 border-t border-line-soft bg-surface
                          flex gap-2">
            <a href={project.hubspot_url} target="_blank" rel="noreferrer"
               className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5
                          bg-orange hover:bg-orange-dark text-white rounded-sm
                          text-small font-semibold transition-colors">
              View in HubSpot <ExtIcon />
            </a>
            <button className="px-3.5 py-2.5 bg-surface text-charcoal border border-line-strong
                               rounded-sm text-small font-semibold hover:bg-surface-muted
                               transition-colors">
              Edit
            </button>
          </div>
        )}
      </aside>
    </>
  )
}

/* ============================================================
   Building blocks
============================================================ */

function Kpi({ label, value, sub, accent }) {
  return (
    <div className="bg-surface border border-line-soft rounded-md px-3 py-3 min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted
                      whitespace-nowrap overflow-hidden text-ellipsis">
        {label}
      </div>
      <div className={`mt-1.5 font-mono text-[18px] font-medium leading-tight
                       tracking-[-0.01em] whitespace-nowrap overflow-hidden text-ellipsis
                       ${accent ? 'text-orange' : 'text-ink'}`}
           style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value ?? '—'}
      </div>
      {sub && <div className="mt-1 text-[11px] text-muted">{sub}</div>}
    </div>
  )
}

function Section({ title, meta, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-t border-line-soft">
      <button onClick={() => setOpen(o => !o)}
              className="w-full flex items-center justify-between py-3.5 text-left text-charcoal">
        <span className="inline-flex items-center gap-2.5 text-[11px] font-bold uppercase
                         tracking-[0.1em] text-charcoal">
          {title}
          {meta && (
            <span className="text-muted font-medium normal-case tracking-normal text-[12px]">
              {meta}
            </span>
          )}
        </span>
        <ChevIcon open={open} />
      </button>
      <div className="overflow-hidden transition-[max-height] duration-[260ms] ease-out"
           style={{ maxHeight: open ? 2000 : 0 }}>
        <dl className="m-0 pb-4">{children}</dl>
      </div>
    </div>
  )
}

function Row({ label, value, emphasis, hideEmpty }) {
  const empty = value == null || value === ''
  if (empty && hideEmpty) return null
  return (
    <div className="flex justify-between items-baseline gap-4 py-[7px] text-small">
      <dt className="text-muted flex-shrink-0 whitespace-nowrap">{label}</dt>
      <dd className={`m-0 text-right flex-1 min-w-0 break-words
                      ${empty ? 'text-[#C0C0C0]' : (emphasis ? 'text-ink font-semibold font-mono' : 'text-charcoal')}`}
          style={{ fontVariantNumeric: 'tabular-nums' }}>
        {empty ? '—' : value}
      </dd>
    </div>
  )
}

/* ---------- Copy button w/ micro-interaction ---------- */
function CopyButton({ text, children }) {
  const [copied, setCopied] = useState(false)
  const onClick = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(String(text)).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }
  return (
    <button onClick={onClick} title="Copy PO number"
            className={`inline-flex items-center gap-1.5 -ml-2 px-2 py-1 rounded-sm
                        font-mono text-[11px] font-medium tracking-[0.04em]
                        transition-colors
                        ${copied ? 'text-success' : 'text-muted hover:bg-surface-muted'}`}>
      {children}
      <span className={`inline-flex transition-transform duration-200 ${copied ? 'scale-110' : 'scale-100'}`}>
        {copied ? <CheckIcon /> : <CopyIcon />}
      </span>
      {copied && (
        <span className="text-[10px] tracking-[0.06em] uppercase font-semibold">Copied</span>
      )}
    </button>
  )
}

/* ---------- Schedule Track ---------- */
function ScheduleTrack({ start, end, pctComplete, duration }) {
  const pct = Math.max(0, Math.min(1, pctComplete ?? 0))
  const daysElapsed   = duration != null ? Math.round(duration * pct) : null
  const daysRemaining = duration != null ? duration - (daysElapsed ?? 0) : null
  const hasStart = !!start
  const hasEnd   = !!end

  const Dot = ({ filled }) => (
    <div className={`w-3 h-3 rounded-full border-2 border-orange flex-shrink-0
                     ${filled ? 'bg-orange shadow-[0_0_0_4px_rgba(229,122,58,0.15)]' : 'bg-surface'}`} />
  )

  return (
    <div className="px-4 py-3.5 border border-line-soft rounded-md">
      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-charcoal mb-3.5">
        Schedule
        {duration != null && (
          <span className="ml-2 text-muted font-medium normal-case tracking-normal text-[12px]">
            {duration} days
          </span>
        )}
      </div>

      <div className="flex gap-3.5">
        <div className="flex flex-col items-center pt-1">
          <Dot filled />
          <div className="w-[2px] flex-1 min-h-[40px] my-0.5"
               style={{ background: `linear-gradient(to bottom,
                        #E57A3A 0%, #E57A3A ${pct*100}%,
                        #E0E0E0 ${pct*100}%, #E0E0E0 100%)` }} />
          <Dot filled={pct >= 1} />
        </div>

        <div className="flex-1 flex flex-col justify-between gap-5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Start</div>
            <div className={`text-small font-semibold mt-0.5 ${hasStart ? 'text-ink' : 'text-[#C0C0C0]'}`}>
              {hasStart ? fmtDate(start) : 'Not scheduled'}
            </div>
            {daysElapsed != null && (
              <div className="font-mono text-[11px] text-muted mt-0.5">
                {daysElapsed} day{daysElapsed === 1 ? '' : 's'} elapsed
              </div>
            )}
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Est. Completion</div>
            <div className={`text-small font-semibold mt-0.5 ${hasEnd ? 'text-ink' : 'text-[#C0C0C0]'}`}>
              {hasEnd ? fmtDate(end) : 'Not scheduled'}
            </div>
            {daysRemaining != null && (
              <div className="font-mono text-[11px] text-muted mt-0.5">
                {daysRemaining} day{daysRemaining === 1 ? '' : 's'} remaining
              </div>
            )}
          </div>
        </div>

        <div className="text-right min-w-[68px]">
          <div className="font-mono text-[22px] font-medium text-orange tracking-[-0.01em] leading-none"
               style={{ fontVariantNumeric: 'tabular-nums' }}>
            {(pct * 100).toFixed(0)}%
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted mt-1">
            Complete
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   FinancialsTable — unified Revenue/Costs/Profitability
   Columns: Forecast (orange) | To Date (blue) | Remaining (blue) | Projected | % Rev
============================================================ */
// Forecast = orange tint (matches forecast tracking chip)
const FORECAST_BG     = 'bg-[#FDF4ED]'
const FORECAST_BG_DEEP= 'bg-[#FAE8D6]'
const FORECAST_FG     = 'text-[#B4561F]'
// Actuals = blue tint (matches actuals tracking chip)
const ACTUALS_BG      = 'bg-[#EEF3F8]'
const ACTUALS_BG_DEEP = 'bg-[#E3EBF3]'
const ACTUALS_FG      = 'text-[#2B5A82]'

/**
 * Editable cell for over/under inputs expressed as an ABSOLUTE delta.
 *
 * Storage:  fraction `pct` on `projects.pct_over_under_*` (unchanged backend math)
 * Edit:     PM types the signed delta in the same units as `forecast` (hours or dollars).
 *           Save converts: pct = delta / forecast.
 * Display:  shows signed absolute delta (forecast × pct), formatted per `unit`.
 *
 * Examples:
 *   - Hours, forecast=80, pct=0.80   → display "+64h"   (PM types `+64`, saves 0.80)
 *   - Materials, forecast=$1,723, pct=−0.213 → display "−$367" (PM types `-367`, saves −0.213)
 *
 * If forecast is 0/null, no math is possible — cell is read-only and shows "—".
 */
function EditableDeltaCell({ value, bg, onSave, forecast, unit = 'currency' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)
  const cellRef = useRef(null)

  const fc = Number(forecast)
  const fcUsable = isFinite(fc) && fc !== 0
  const delta = (value == null || !fcUsable) ? null : Number(value) * fc

  const fmtDelta = (n) => {
    if (n == null) return '—'
    const sign = n > 0 ? '+' : n < 0 ? '−' : ''
    const abs = Math.abs(n)
    if (unit === 'hours') {
      // Hours: 1 decimal if non-integer, else integer; suffix "h"
      const num = abs >= 100 ? Math.round(abs) : Math.round(abs * 10) / 10
      return `${sign}${num}h`
    }
    // Currency: no decimals when |n| ≥ 100, else 2 decimals
    const formatted = abs >= 100
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(abs)
      : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(abs)
    return `${sign}${formatted}`
  }

  const startEdit = useCallback(() => {
    if (!fcUsable) return
    // Pre-fill input with the absolute delta (e.g., "64", "-367") — no unit suffix
    if (delta == null) setDraft('')
    else {
      const rounded = unit === 'hours'
        ? (Math.abs(delta) >= 100 ? Math.round(delta) : Math.round(delta * 10) / 10)
        : (Math.abs(delta) >= 100 ? Math.round(delta) : Math.round(delta * 100) / 100)
      setDraft(String(rounded))
    }
    setEditing(true)
  }, [delta, fcUsable, unit])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const commit = useCallback(() => {
    setEditing(false)
    if (draft === '' || draft === '-' || draft === '+') {
      if (value != null) onSave(null)
      return
    }
    const d = Number(draft)
    if (Number.isNaN(d) || !fcUsable) return
    if (d === 0) {
      if (value != null) onSave(null) // typing 0 clears the override
      return
    }
    // Convert absolute delta → fraction. 4 decimal precision matches prior behavior.
    const fraction = Math.round((d / fc) * 10000) / 10000
    if (fraction !== value) onSave(fraction)
  }, [draft, value, onSave, fc, fcUsable])

  if (editing) {
    return (
      <div ref={cellRef} className={`py-[5px] px-1.5 ${bg || ''}`}>
        <input
          ref={inputRef}
          type="number"
          step={unit === 'hours' ? '0.5' : '1'}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') setEditing(false)
          }}
          className="w-full px-1.5 py-0.5 text-right font-mono text-[12px] border border-orange rounded focus:outline-none focus:ring-1 focus:ring-orange bg-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
        />
      </div>
    )
  }

  const empty = delta == null || !fcUsable
  const display = fmtDelta(delta)
  const tone = empty
    ? 'text-[#C0C0C0]'
    : delta > 0 ? 'text-[#B8561E] font-semibold' // over forecast — red
    : delta < 0 ? 'text-[#2E6B3F] font-semibold' // under forecast — green
    : 'text-charcoal/60'

  return (
    <div
      ref={cellRef}
      onClick={fcUsable ? startEdit : undefined}
      className={`py-[9px] px-2 text-right font-mono text-[12px] ${fcUsable ? 'cursor-pointer' : 'cursor-not-allowed'}
                  bg-white shadow-[inset_0_0_0_1px_rgba(229,122,58,0.25)]
                  ${fcUsable ? 'hover:shadow-[inset_0_0_0_1.5px_rgba(229,122,58,0.55)]' : ''}
                  ${tone} ${bg || ''}`}
      style={{ fontVariantNumeric: 'tabular-nums' }}
      title={fcUsable
        ? (unit === 'hours' ? 'Type signed hours over/under forecast (e.g., 64 = +64h, -25 = under by 25h). Empty = on forecast.'
                            : 'Type signed dollars over/under forecast (e.g., 500 = +$500, -367 = under by $367). Empty = on forecast.')
        : 'No forecast value — set the forecast first to enable over/under.'}
    >
      {display}
    </div>
  )
}

function EditableFinCell({ value, fmt, bg, fg, emphasis, onSave, overridden = false }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)
  const cellRef = useRef(null)

  const startEdit = useCallback(() => {
    setDraft(value == null ? '' : String(value))
    setEditing(true)
  }, [value])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const commit = useCallback(() => {
    setEditing(false)
    const num = draft === '' ? null : Number(draft)
    if (num !== value && !(num == null && value == null)) {
      onSave(num)
    }
  }, [draft, value, onSave])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      commit()
      // Find next editable cell
      const allEditable = document.querySelectorAll('[data-editable-fin]')
      const list = Array.from(allEditable)
      const idx = list.indexOf(cellRef.current)
      const next = e.shiftKey
        ? list[idx - 1] ?? list[list.length - 1]
        : list[idx + 1] ?? list[0]
      if (next && next !== cellRef.current) {
        setTimeout(() => next.click(), 0)
      }
    }
    if (e.key === 'Escape') setEditing(false)
  }, [commit])

  if (editing) {
    return (
      <div ref={cellRef} data-editable-fin className={`py-[5px] px-1.5 ${bg || ''}`}>
        <input
          ref={inputRef}
          type="number"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="w-full px-1.5 py-0.5 text-right font-mono text-[12.5px] border border-orange rounded focus:outline-none focus:ring-1 focus:ring-orange bg-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
        />
      </div>
    )
  }

  const empty = value == null
  const display = empty ? '—' : fmt(value)
  return (
    <div
      ref={cellRef}
      data-editable-fin
      onClick={startEdit}
      className={`relative py-[9px] px-2.5 text-right font-mono text-[12.5px] cursor-pointer
                  bg-white shadow-[inset_0_0_0_1px_rgba(41,128,185,0.3)]
                  hover:shadow-[inset_0_0_0_1.5px_rgba(41,128,185,0.6)]
                  ${emphasis ? 'font-semibold' : 'font-normal'}
                  ${empty ? 'text-[#C0C0C0]' : 'text-[#2B5A82]'}`}
      style={{ fontVariantNumeric: 'tabular-nums' }}
      title={overridden ? 'Manual override — clear to revert to formula' : 'Click to edit'}
    >
      {overridden && (
        <span
          aria-hidden="true"
          className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-orange"
        />
      )}
      {display}
    </div>
  )
}

function FinancialsTable({ project: p, onCellEdit }) {
  // ---- Revenue ----
  const contract_rev = p.contract_revenue
  const co_rev       = p.co_revenue
  const total_rev    = p.total_revenue ?? ((contract_rev ?? 0) + (co_rev ?? 0))

  // ---- Costs ----
  const laborForecast = (p.avg_labor_cost_per_hour && p.forecasted_hours)
    ? p.avg_labor_cost_per_hour * p.forecasted_hours : null
  const laborTotal = (p.labor_cost_to_date ?? 0) + (p.est_labor_cost_remaining ?? 0) || p.labor_cost_to_date
  const matsTotal  = (p.material_cost_to_date ?? 0) + (p.est_materials_remaining ?? 0) || p.material_cost_to_date
  const setTotal   = (p.set_cost_to_date ?? 0) + (p.est_set_remaining ?? 0) || p.set_cost_to_date

  const totalCostForecast = (laborForecast != null || p.forecasted_materials != null)
    ? (laborForecast ?? 0) + (p.forecasted_materials ?? 0) + (p.forecasted_set ?? 0)
    : null

  // ---- Profit ----
  const gpForecast       = (totalCostForecast != null && total_rev != null) ? total_rev - totalCostForecast : null
  const gpPctForecast    = (gpForecast != null && total_rev) ? gpForecast / total_rev : null
  const gpPerHourForecast= (gpForecast != null && p.forecasted_hours) ? gpForecast / p.forecasted_hours : null

  // % of Rev coloring
  const pctClass = v => {
    if (v == null) return 'text-[#C0C0C0]'
    if (v < 0.30) return 'text-success'
    if (v < 0.45) return 'text-charcoal'
    return 'text-error'
  }

  const gridCols = 'grid-cols-[1fr_92px_88px_70px_88px_98px_54px]'

  const Label = ({ children, emphasis, sub }) => (
    <div className={`py-[9px] text-[12px] ${sub ? 'pl-6 text-muted font-normal' :
                     emphasis ? 'pl-3 font-bold text-ink' : 'pl-3 font-medium text-charcoal'}`}>
      {children}
    </div>
  )
  const Cell = ({ value, emphasis, bg, fg }) => {
    const empty = value == null
    return (
      <div className={`py-[9px] px-2.5 text-right font-mono text-[12.5px]
                       ${emphasis ? 'font-semibold' : 'font-normal'}
                       ${empty ? 'text-[#C0C0C0]' : fg || (emphasis ? 'text-ink' : 'text-charcoal')}
                       ${bg || ''}`}
           style={{ fontVariantNumeric: 'tabular-nums' }}>
        {empty ? '—' : value}
      </div>
    )
  }
  const SectionBar = ({ children, meta }) => (
    <div className="col-span-full px-3 py-2.5 bg-surface-muted border-y border-line
                    text-[10.5px] font-bold uppercase tracking-[0.1em] text-charcoal
                    flex justify-between items-baseline">
      <span>{children}</span>
      {meta && (
        <span className="font-mono font-medium tracking-normal normal-case text-[12px] text-muted"
              style={{ fontVariantNumeric: 'tabular-nums' }}>
          {meta}
        </span>
      )}
    </div>
  )
  const Line = ({ label, forecast, toDate, remaining, atComp, pctRev,
                  fmt = fmtCurrency, emphasis, sub,
                  forecastField, forecastOverridden,
                  pctField, pctValue,
                  /** signal to EditableDeltaCell what unit to format / accept */
                  pctUnit = 'currency',
                  /** override the value used to convert pct↔delta — defaults to `forecast` */
                  pctForecast }) => (
    <>
      <Label emphasis={emphasis} sub={sub}>{label}</Label>
      {forecastField && onCellEdit ? (
        <EditableFinCell
          value={forecast}
          fmt={fmt}
          bg={emphasis ? FORECAST_BG_DEEP : FORECAST_BG}
          fg={FORECAST_FG}
          emphasis={emphasis}
          overridden={forecastOverridden}
          onSave={v => onCellEdit(p.po_number, forecastField, v)}
        />
      ) : (
        <Cell value={forecast == null ? null : fmt(forecast)} emphasis={emphasis}
              bg={emphasis ? FORECAST_BG_DEEP : FORECAST_BG} fg={FORECAST_FG} />
      )}
      <Cell value={toDate == null ? null : fmt(toDate)}     emphasis={emphasis}
            bg={emphasis ? ACTUALS_BG_DEEP : ACTUALS_BG} fg={ACTUALS_FG} />
      {pctField && onCellEdit ? (
        <EditableDeltaCell
          value={pctValue}
          forecast={pctForecast ?? forecast}
          unit={pctUnit}
          onSave={v => onCellEdit(p.po_number, pctField, v)}
        />
      ) : (
        <div /> // empty slot to keep grid alignment (Labor + Total Cost rows)
      )}
      <Cell value={remaining == null ? null : fmt(remaining)} emphasis={emphasis}
            bg={emphasis ? ACTUALS_BG_DEEP : ACTUALS_BG} fg={ACTUALS_FG} />
      <Cell value={atComp == null ? null : fmt(atComp)}     emphasis={emphasis} />
      <div className={`py-[9px] px-2 text-right font-mono text-[11px] font-semibold
                       ${pctClass(pctRev)}`}
           style={{ fontVariantNumeric: 'tabular-nums' }}>
        {pctRev == null ? '—' : (pctRev * 100).toFixed(1) + '%'}
      </div>
    </>
  )

  return (
    <div className={`grid ${gridCols} border border-line rounded-md overflow-hidden items-stretch`}>
      {/* Column headers */}
      <div className="col-span-full">
        <div className={`grid ${gridCols} bg-surface-subtle border-b border-line
                         text-[9.5px] font-bold uppercase tracking-[0.08em] text-muted`}>
          <div className="px-3 py-2.5">&nbsp;</div>
          <div className={`px-2.5 py-2.5 text-right ${FORECAST_BG} ${FORECAST_FG}`}>Forecast</div>
          <div className={`px-2.5 py-2.5 text-right ${ACTUALS_BG} ${ACTUALS_FG}`}>To Date</div>
          <div className="px-2 py-2.5 text-right" title="Manual over/under forecast (hours or dollars). Click to edit.">+/− O/U</div>
          <div className={`px-2.5 py-2.5 text-right ${ACTUALS_BG} ${ACTUALS_FG}`}>Remaining</div>
          <div className="px-2.5 py-2.5 text-right">Projected</div>
          <div className="px-2 py-2.5 text-right">% Rev</div>
        </div>
      </div>

      {/* REVENUE */}
      <SectionBar meta={fmtCurrency(total_rev)}>Revenue</SectionBar>
      <Line label="Contract"      forecast={contract_rev} atComp={contract_rev} />
      <Line label="Change Order"
            forecast={co_rev}
            atComp={p.forecasted_co_revenue ?? co_rev}
            pctField="pct_over_under_co"
            pctValue={p.pct_over_under_co}
            pctForecast={contract_rev} />
      <Line label="Total Revenue" forecast={total_rev}    atComp={total_rev} emphasis />

      {/* COSTS */}
      <SectionBar meta={fmtCurrency(p.total_projected_cost)}>Costs</SectionBar>
      <Line label="Hours"
            forecast={p.total_hours}
            toDate={p.hours_to_date}
            remaining={p.est_hours_remaining}
            pctField="pct_over_under_hours"
            pctValue={p.pct_over_under_hours}
            pctUnit="hours"
            atComp={p.total_project_hours}
            fmt={fmtHours} />
      <Line label="Labor"
            forecast={p.forecast_labor_cost}
            forecastField="forecast_labor_cost_override"
            forecastOverridden={p.forecast_labor_cost_override != null}
            toDate={p.labor_cost_to_date}
            remaining={p.est_labor_cost_remaining}
            atComp={p.total_projected_labor_cost}
            pctRev={p.labor_pct_of_revenue} />
      <Line label="Materials"
            forecast={p.forecasted_materials}
            forecastField="forecasted_materials_override"
            forecastOverridden={p.forecasted_materials_override != null}
            toDate={p.material_cost_to_date}
            remaining={p.est_materials_remaining}
            pctField="pct_over_under_materials"
            pctValue={p.pct_over_under_materials}
            atComp={p.total_projected_material_cost}
            pctRev={p.material_pct_of_revenue} />
      <Line label="SET"
            forecast={p.forecasted_set}
            forecastField="forecasted_set_override"
            forecastOverridden={p.forecasted_set_override != null}
            toDate={p.set_cost_to_date}
            remaining={p.est_set_remaining}
            pctField="pct_over_under_set"
            pctValue={p.pct_over_under_set}
            atComp={p.total_projected_set_cost}
            pctRev={p.set_pct_of_revenue} />
      <Line label="Total Cost"
            forecast={p.forecasted_cost_at_completion}
            toDate={p.total_cost_to_date}
            remaining={p.est_total_remaining_cost}
            atComp={p.total_projected_cost}
            pctRev={p.total_projected_cost && total_rev ? p.total_projected_cost / total_rev : null}
            emphasis />

      {/* PROFITABILITY */}
      <SectionBar meta={fmtCurrency(p.est_gross_profit)}>Profitability</SectionBar>
      <Line label="Gross Profit"
            forecast={p.forecasted_gp}
            atComp={p.est_gross_profit}
            emphasis />
      <Line label="GP %"
            forecast={p.forecasted_gp_pct}
            atComp={p.est_gp_pct}
            fmt={v => (v == null ? null : (v * 100).toFixed(1) + '%')}
            sub />
      <Line label="GP $/hr"
            forecast={p.forecasted_gp_per_hour}
            atComp={p.est_gp_per_hour}
            sub />
    </div>
  )
}

/* ============================================================
   Icons
============================================================ */
function IconBtn({ children, title, onClick }) {
  return (
    <button onClick={onClick} title={title}
            className="w-8 h-8 grid place-items-center rounded-sm text-muted
                       hover:bg-surface-muted transition-colors">
      {children}
    </button>
  )
}
const Svg = ({ children, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)
const XIcon     = () => <Svg><path d="M6 6l12 12M18 6L6 18"/></Svg>
const PinIcon   = () => <Svg><path d="M12 2v7M8 9h8l-1 5H9L8 9zM12 14v8"/></Svg>
const CopyIcon  = () => <Svg size={12}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></Svg>
const CheckIcon = () => <Svg size={12}><path d="M5 12l5 5L20 7"/></Svg>
const ExtIcon      = () => <Svg size={14}><path d="M14 3h7v7"/><path d="M10 14L21 3"/><path d="M21 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h5"/></Svg>
const CalendarIcon = () => <Svg size={11}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></Svg>
const ChevIcon  = ({ open }) => (
  <span className="text-muted transition-transform duration-200"
        style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
    <Svg><path d="M9 6l6 6-6 6"/></Svg>
  </span>
)
