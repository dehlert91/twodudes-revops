import { fmtCurrency, fmtPct } from './formatters'

export const profitColumns = [
  {
    id: 'est_gross_profit',
    accessorKey: 'est_gross_profit',
    header: 'Est GP $',
    size: 120,
    cell: ({ getValue }) => {
      const val = getValue()
      if (val == null) return '—'
      const n = Number(val)
      return (
        <span className={n >= 0 ? '' : 'text-red-600'}>
          {fmtCurrency(val)}
        </span>
      )
    },
  },
  {
    id: 'est_gp_pct',
    accessorKey: 'est_gp_pct',
    header: 'Est GP%',
    size: 100,
    cell: ({ getValue }) => {
      const val = getValue()
      if (val == null) return '—'
      const n = Number(val)
      return (
        <span className={n >= 0.3 ? 'text-green-600' : n >= 0.2 ? 'text-yellow-600' : 'text-red-600'}>
          {fmtPct(val)}
        </span>
      )
    },
  },
  {
    id: 'est_gp_per_hour',
    accessorKey: 'est_gp_per_hour',
    header: 'GP $/hr',
    size: 100,
    cell: ({ getValue }) => fmtCurrency(getValue()),
  },
  {
    id: 'forecasted_gp',
    accessorKey: 'forecasted_gp',
    header: 'Forecasted GP',
    size: 130,
    meta: { editable: true, inputType: 'number' },
    cell: ({ getValue }) => fmtCurrency(getValue()),
  },
  {
    id: 'amount_billed_to_date',
    accessorKey: 'amount_billed_to_date',
    header: 'Billed to Date',
    size: 130,
    cell: ({ getValue }) => fmtCurrency(getValue()),
  },
  {
    id: 'wip_to_date',
    accessorKey: 'wip_to_date',
    header: 'WIP',
    size: 110,
    cell: ({ getValue }) => fmtCurrency(getValue()),
  },
  {
    id: 'revenue_earned',
    accessorKey: 'revenue_earned',
    header: 'Revenue Earned',
    size: 140,
    cell: ({ getValue }) => fmtCurrency(getValue()),
  },
]
