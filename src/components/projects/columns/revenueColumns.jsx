import { fmtCurrency, fmtRate } from './formatters'

export const revenueColumns = [
  {
    id: 'contract_revenue',
    accessorKey: 'contract_revenue',
    header: 'Contract Rev',
    size: 130,
    cell: ({ getValue }) => <span className="font-mono">{fmtCurrency(getValue())}</span>,
  },
  {
    id: 'co_revenue',
    accessorKey: 'co_revenue',
    header: 'CO Rev',
    size: 110,
    cell: ({ getValue }) => <span className="font-mono">{fmtCurrency(getValue())}</span>,
  },
  {
    id: 'total_revenue',
    accessorKey: 'total_revenue',
    header: 'Total Revenue',
    size: 130,
    cell: ({ getValue }) => (
      <span className="font-mono font-semibold">{fmtCurrency(getValue())}</span>
    ),
  },
  {
    id: 'contract_hours',
    accessorKey: 'contract_hours',
    header: 'Contract Hrs',
    size: 110,
    cell: ({ getValue }) => <span className="font-mono">{fmtNum(getValue())}</span>,
  },
  {
    id: 'total_hours',
    accessorKey: 'total_hours',
    header: 'Total Hrs',
    size: 100,
    cell: ({ getValue }) => <span className="font-mono">{fmtNum(getValue())}</span>,
  },
  {
    id: 'total_sales_rate',
    accessorKey: 'total_sales_rate',
    header: 'Sales Rate',
    size: 110,
    cell: ({ getValue }) => <span className="font-mono">{fmtRate(getValue())}</span>,
  },
  {
    id: 'contract_sales_rate',
    accessorKey: 'contract_sales_rate',
    header: 'Contract $/hr',
    size: 120,
    cell: ({ getValue }) => <span className="font-mono">{fmtRate(getValue())}</span>,
  },
  {
    id: 'co_hours',
    accessorKey: 'co_hours',
    header: 'CO Hours',
    size: 100,
    cell: ({ getValue }) => <span className="font-mono">{fmtNum(getValue())}</span>,
  },
  {
    id: 'co_sales_rate',
    accessorKey: 'co_sales_rate',
    header: 'CO $/hr',
    size: 100,
    cell: ({ getValue }) => <span className="font-mono">{fmtRate(getValue())}</span>,
  },
]

function fmtNum(val) {
  if (val == null) return '—'
  return Number(val).toLocaleString('en-US', { maximumFractionDigits: 1 })
}
