import { fmtCurrency, fmtRate } from './formatters'

export const revenueColumns = [
  {
    id: 'contract_revenue',
    accessorKey: 'contract_revenue',
    header: 'Contract Rev',
    size: 130,
    cell: ({ getValue }) => fmtCurrency(getValue()),
  },
  {
    id: 'co_revenue',
    accessorKey: 'co_revenue',
    header: 'CO Rev',
    size: 110,
    cell: ({ getValue }) => fmtCurrency(getValue()),
  },
  {
    id: 'total_revenue',
    accessorKey: 'total_revenue',
    header: 'Total Revenue',
    size: 130,
    cell: ({ getValue }) => (
      <span className="font-semibold">{fmtCurrency(getValue())}</span>
    ),
  },
  {
    id: 'contract_hours',
    accessorKey: 'contract_hours',
    header: 'Contract Hrs',
    size: 110,
    cell: ({ getValue }) => fmtNum(getValue()),
  },
  {
    id: 'total_hours',
    accessorKey: 'total_hours',
    header: 'Total Hrs',
    size: 100,
    cell: ({ getValue }) => fmtNum(getValue()),
  },
  {
    id: 'total_sales_rate',
    accessorKey: 'total_sales_rate',
    header: 'Sales Rate',
    size: 110,
    cell: ({ getValue }) => fmtRate(getValue()),
  },
  {
    id: 'co_hours',
    accessorKey: 'co_hours',
    header: 'CO Hours',
    size: 100,
    cell: ({ getValue }) => fmtNum(getValue()),
  },
]

function fmtNum(val) {
  if (val == null) return '—'
  return Number(val).toLocaleString('en-US', { maximumFractionDigits: 1 })
}
