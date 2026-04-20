import { useMemo } from 'react'
import { fmtCurrency, fmtPct } from './columns/formatters'

export function ProjectsKPIBar({ rows }) {
  const stats = useMemo(() => {
    const n = rows.length
    if (n === 0) return null

    const totalRevenue = sum(rows, 'total_revenue')
    const avgGP = avg(rows, 'est_gp_pct')
    const avgComplete = avg(rows, 'pct_complete')
    const totalHours = sum(rows, 'total_hours')

    return { n, totalRevenue, avgGP, avgComplete, totalHours }
  }, [rows])

  if (!stats) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
      <KPICard label="Active Jobs" value={stats.n.toLocaleString()} />
      <KPICard label="Total Revenue" value={fmtCurrency(stats.totalRevenue)} />
      <KPICard label="Avg GP%" value={fmtPct(stats.avgGP)} highlight={gpColor(stats.avgGP)} />
      <KPICard label="Avg % Complete" value={fmtPct(stats.avgComplete)} />
      <KPICard label="Total Hours" value={stats.totalHours.toLocaleString('en-US', { maximumFractionDigits: 0 })} />
    </div>
  )
}

function KPICard({ label, value, highlight }) {
  return (
    <div className="bg-surface border border-line rounded-md px-4 py-3 shadow-card">
      <p className="td-label mb-1">{label}</p>
      <p className={`text-xl font-mono font-bold ${highlight ?? 'text-ink'}`}>{value}</p>
    </div>
  )
}

function sum(rows, key) {
  return rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0)
}

function avg(rows, key) {
  const valid = rows.filter(r => r[key] != null)
  if (!valid.length) return null
  return valid.reduce((acc, r) => acc + Number(r[key]), 0) / valid.length
}

function gpColor(val) {
  if (val == null) return null
  const n = Number(val)
  const pct = n > 1 ? n : n * 100
  if (pct >= 30) return 'text-success'
  if (pct >= 20) return 'text-orange'
  return 'text-error'
}
