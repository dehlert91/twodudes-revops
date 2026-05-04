import { useEffect, useState, useMemo } from 'react'
import { KpiCard } from '../../components/ui'
import { MultiSelectDropdown } from '../../components/ui/MultiSelectDropdown'
import { DateRangePicker } from '../../components/ui/DateRangePicker'
import { MonthlyRevenueSummary } from '../../components/finance/MonthlyRevenueSummary'
import { getMonthlyRevenueSummary, getFinanceFilterOptions } from '../../lib/finance/queries'

function defaultDateRange() {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1))
  return {
    start: start.toISOString().slice(0, 10),
    end:   now.toISOString().slice(0, 10),
  }
}

function fmtCurrency(n) {
  if (n == null || isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export function FinanceDashboardPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [dateRange, setDateRange] = useState(defaultDateRange)
  const [divisions, setDivisions] = useState([])
  const [segments, setSegments] = useState([])
  const [opts, setOpts] = useState({ divisions: [], segments: [] })

  // Load filter option lists
  useEffect(() => {
    getFinanceFilterOptions().then(setOpts).catch(e => console.error('[finance opts]', e))
  }, [])

  // Load summary data when filters change
  useEffect(() => {
    if (!dateRange.start || !dateRange.end) return
    let cancelled = false
    setLoading(true)
    setError(null)

    getMonthlyRevenueSummary({
      startMonth: dateRange.start,
      endMonth:   dateRange.end,
      divisions,
      segments,
    })
      .then(rows => { if (!cancelled) setData(rows) })
      .catch(e => { if (!cancelled) setError(e.message || String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [dateRange, divisions, segments])

  // Headline KPIs — sums across the visible range
  const totals = useMemo(() => {
    return (data ?? []).reduce((acc, r) => ({
      forecast: acc.forecast + r.forecast,
      billed:   acc.billed   + r.billed,
      earned:   acc.earned   + (r.earned_known ? r.earned : 0),
      variance: acc.variance + (r.variance_known ? r.variance : 0),
      hasEarned: acc.hasEarned || r.earned_known,
    }), { forecast: 0, billed: 0, earned: 0, variance: 0, hasEarned: false })
  }, [data])

  return (
    <div className="p-4 md:p-6">
      <h1 className="font-display text-2xl font-bold text-charcoal mb-4">Finance Dashboard</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <DateRangePicker value={dateRange} onChange={setDateRange} label="Date Range" />
        <MultiSelectDropdown label="Division" options={opts.divisions} selected={divisions} onChange={setDivisions} />
        <MultiSelectDropdown label="Segment"  options={opts.segments}  selected={segments}  onChange={setSegments} />
      </div>

      {/* Headline KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Forecast Revenue" value={fmtCurrency(totals.forecast)} sub="across range" />
        <KpiCard label="Billed Revenue"   value={fmtCurrency(totals.billed)}   sub="across range" />
        <KpiCard
          label="Earned Revenue"
          value={totals.hasEarned ? fmtCurrency(totals.earned) : '—'}
          sub={totals.hasEarned ? 'snapshot-derived' : 'no snapshots yet'}
          subTone={totals.hasEarned ? 'muted' : 'warning'}
        />
        <KpiCard
          label="Forecast vs. Earned"
          value={totals.hasEarned ? fmtCurrency(totals.variance) : '—'}
          sub={totals.hasEarned ? 'positive = under-earned' : 'no snapshots yet'}
          subTone={totals.hasEarned && totals.variance > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* Chart card */}
      <div className="bg-surface border border-line rounded-md p-5 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Monthly Revenue Summary</div>
            <p className="text-xs text-muted mt-1">Forecast vs. billed (bars) and earned (line). Earned only renders for months with snapshots.</p>
          </div>
        </div>
        {error
          ? <p className="text-sm text-error py-12 text-center">Failed to load: {error}</p>
          : <MonthlyRevenueSummary data={data} loading={loading} />
        }
      </div>
    </div>
  )
}
