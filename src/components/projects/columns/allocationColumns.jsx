import { fmtPct } from './formatters'
import { Badge } from '../../ui'

export const allocationColumns = [
  {
    id: 'allocation_method',
    accessorKey: 'allocation_method',
    header: 'Alloc Method',
    size: 130,
    cell: ({ getValue }) => getValue() ?? '—',
  },
  {
    id: 'allocation_pattern',
    accessorKey: 'allocation_pattern',
    header: 'Alloc Pattern',
    size: 170,
    cell: ({ getValue }) => {
      const v = getValue()
      return v ? <span className="text-xs">{v.replace(/_/g, ' ')}</span> : '—'
    },
  },
  {
    id: 'allocation_sum_pct',
    accessorKey: 'allocation_sum_pct',
    header: 'Alloc %',
    size: 90,
    cell: ({ getValue }) => <span className="font-mono">{fmtPct(getValue())}</span>,
  },
  {
    id: 'is_allocation_complete',
    accessorKey: 'is_allocation_complete',
    header: 'Alloc Complete',
    size: 130,
    cell: ({ getValue }) => {
      const val = getValue()
      if (val == null) return '—'
      return val
        ? <Badge tone="success">Complete</Badge>
        : <Badge tone="warning">Incomplete</Badge>
    },
  },
  {
    id: 'allocated_months_count',
    accessorKey: 'allocated_months_count',
    header: 'Alloc Months',
    size: 120,
    cell: ({ getValue }) => {
      const v = getValue()
      return <span className="font-mono">{v != null ? v : '—'}</span>
    },
  },
  {
    id: 'locked_months_count',
    accessorKey: 'locked_months_count',
    header: 'Locked Months',
    size: 130,
    cell: ({ getValue }) => {
      const v = getValue()
      return <span className="font-mono">{v != null ? v : '—'}</span>
    },
  },
  {
    id: 'first_allocated_month',
    accessorKey: 'first_allocated_month',
    header: 'First Alloc Month',
    size: 150,
    cell: ({ getValue }) => fmtMonth(getValue()),
  },
  {
    id: 'last_allocated_month',
    accessorKey: 'last_allocated_month',
    header: 'Last Alloc Month',
    size: 150,
    cell: ({ getValue }) => fmtMonth(getValue()),
  },
  {
    id: 'allocation_span_months',
    accessorKey: 'allocation_span_months',
    header: 'Alloc Span',
    size: 110,
    cell: ({ getValue }) => {
      const v = getValue()
      return <span className="font-mono">{v != null ? `${v}mo` : '—'}</span>
    },
  },
]

function fmtMonth(val) {
  if (!val) return '—'
  const [y, m] = val.split('-')
  const date = new Date(Number(y), Number(m) - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}
