import { useMemo } from 'react'
import { KpiCard } from '../ui'
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

  const gpTone = gpSubTone(stats.avgGP)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
      <KpiCard label="Active Jobs" value={stats.n.toLocaleString()} />
      <KpiCard label="Total Revenue" value={fmtCurrency(stats.totalRevenue)} />
      <KpiCard label="Avg GP%" value={fmtPct(stats.avgGP)} subTone={gpTone} />
      <KpiCard label="Avg % Complete" value={fmtPct(stats.avgComplete)} />
      <KpiCard label="Total Hours" value={stats.totalHours.toLocaleString('en-US', { maximumFractionDigits: 0 })} />
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

function gpSubTone(val) {
  if (val == null) return 'muted'
  const n = Number(val)
  const pct = n > 1 ? n : n * 100
  if (pct >= 30) return 'success'
  if (pct >= 20) return 'warning'
  return 'error'
}
