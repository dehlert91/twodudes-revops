import { fmtPct, fmtRate } from './formatters'

export const progressColumns = [
  {
    id: 'pct_complete',
    accessorKey: 'pct_complete',
    header: '% Complete',
    size: 120,
    cell: ({ getValue }) => {
      const val = getValue()
      if (val == null) return '—'
      const pct = Number(val)
      return (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-surface-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-orange rounded-full"
              style={{ width: `${Math.min(pct * 100, 100)}%` }}
            />
          </div>
          <span className="text-xs font-mono w-9 text-right">
            {fmtPct(val)}
          </span>
        </div>
      )
    },
  },
  {
    id: 'hours_to_date',
    accessorKey: 'hours_to_date',
    header: 'Hrs to Date',
    size: 110,
    cell: ({ getValue }) => <span className="font-mono">{fmtNum(getValue())}</span>,
  },
  {
    id: 'est_hours_remaining',
    accessorKey: 'est_hours_remaining',
    header: 'Hrs Remaining',
    size: 120,
    meta: { editable: true, inputType: 'number' },
    cell: ({ getValue }) => <span className="font-mono">{fmtNum(getValue())}</span>,
  },
  {
    id: 'total_project_hours',
    accessorKey: 'total_project_hours',
    header: 'Proj Total Hrs',
    size: 120,
    cell: ({ getValue }) => <span className="font-mono">{fmtNum(getValue())}</span>,
  },
  {
    id: 'productivity',
    accessorKey: 'productivity',
    header: 'Productivity',
    size: 110,
    cell: ({ getValue }) => <span className="font-mono">{fmtPct(getValue())}</span>,
  },
  {
    id: 'realized_sales_rate',
    accessorKey: 'realized_sales_rate',
    header: 'Realized Rate',
    size: 120,
    cell: ({ getValue }) => <span className="font-mono">{fmtRate(getValue())}</span>,
  },
  {
    id: 'sales_rate_variance',
    accessorKey: 'sales_rate_variance',
    header: 'Rate Variance',
    size: 120,
    cell: ({ getValue }) => {
      const val = getValue()
      if (val == null) return '—'
      const n = Number(val)
      return (
        <span className={`font-mono ${n >= 0 ? 'text-success' : 'text-error'}`}>
          {fmtRate(val)}
        </span>
      )
    },
  },
]

function fmtNum(val) {
  if (val == null) return '—'
  return Number(val).toLocaleString('en-US', { maximumFractionDigits: 1 })
}
