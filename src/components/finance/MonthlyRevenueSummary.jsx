import { useMemo } from 'react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend,
} from 'recharts'

const ORANGE = '#E57A3A'
const ORANGE_LIGHT = '#F0A882'
const INK = '#3A2E28'
const SUCCESS = '#4A8C5C'
const MUTED = 'rgba(58,46,40,0.55)'

function fmtCurrency(n) {
  if (n == null || isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function fmtMonth(iso) {
  // expects YYYY-MM-DD (first of month)
  const [y, m] = iso.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-line rounded-md shadow-elevated px-3 py-2 text-xs">
      <div className="font-semibold text-charcoal mb-1">{fmtMonth(label)}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
            <span className="text-muted">{p.name}</span>
          </span>
          <span className="text-charcoal">{fmtCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function MonthlyRevenueSummary({ data, loading }) {
  // Reshape and ensure earned/variance display as null (gap in line) when unknown
  const chartData = useMemo(() => (data ?? []).map(row => ({
    period_month: row.period_month,
    Forecast: row.forecast,
    Billed: row.billed,
    Earned: row.earned_known ? row.earned : null,
  })), [data])

  if (loading) {
    return <div className="h-[300px] grid place-items-center text-sm text-muted">Loading chart…</div>
  }

  if (!chartData.length) {
    return <div className="h-[300px] grid place-items-center text-sm text-muted">No revenue data in this range.</div>
  }

  return (
    <div className="w-full" style={{ height: 320 }}>
      <ResponsiveContainer>
        <ComposedChart data={chartData} margin={{ top: 12, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(58,46,40,0.08)" vertical={false} />
          <XAxis
            dataKey="period_month"
            tickFormatter={fmtMonth}
            tick={{ fill: MUTED, fontSize: 11 }}
            axisLine={{ stroke: 'rgba(58,46,40,0.2)' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={n => n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`}
            tick={{ fill: MUTED, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="square" />
          <Bar dataKey="Forecast" fill={ORANGE_LIGHT} radius={[3, 3, 0, 0]} />
          <Bar dataKey="Billed" fill={ORANGE} radius={[3, 3, 0, 0]} />
          <Line
            type="monotone" dataKey="Earned" stroke={INK}
            strokeWidth={2} dot={{ r: 3, fill: INK }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
