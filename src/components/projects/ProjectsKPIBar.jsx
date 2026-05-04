import { useMemo } from 'react'
import { KpiCard } from '../ui'
import { fmtCurrency, fmtPct } from './columns/formatters'

export function ProjectsKPIBar({ rows }) {
  const stats = useMemo(() => {
    const n = rows.length
    if (n === 0) return null

    const totalRevenue = sum(rows, 'total_revenue')
    const totalGP = sum(rows, 'est_gross_profit')
    const avgGP = totalRevenue ? totalGP / totalRevenue : null
    const totalProjectHours = sum(rows, 'total_project_hours')
    const totalHours = sum(rows, 'total_hours')
    const gpPerHour = totalProjectHours ? totalGP / totalProjectHours : null
    const salesRate = totalProjectHours ? totalRevenue / totalProjectHours : null
    const productivity = totalProjectHours ? totalHours / totalProjectHours : null

    return { n, totalRevenue, avgGP, gpPerHour, salesRate, productivity }
  }, [rows])

  if (!stats) return null

  const gpTone = gpSubTone(stats.avgGP)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
      <KpiCard label="Active Jobs" value={stats.n.toLocaleString()} />
      <KpiCard label="Total Revenue" value={fmtCurrency(stats.totalRevenue)} />
      <KpiCard label="Avg GP%" value={fmtPct(stats.avgGP)} subTone={gpTone} />
      <KpiCard label="GP $/hr" value={fmtCurrency(stats.gpPerHour)} />
      <KpiCard label="Sales Rate" value={fmtCurrency(stats.salesRate)} />
      <KpiCard label="Productivity" value={stats.productivity != null ? fmtPct(stats.productivity) : '—'} />
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
