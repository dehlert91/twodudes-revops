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
      return <span className={`font-mono ${Number(val) >= 0 ? '' : 'text-error'}`}>{fmtCurrency(val)}</span>
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
      return <span className={`font-mono ${n >= 0.3 ? 'text-success' : n >= 0.2 ? 'text-orange' : 'text-error'}`}>{fmtPct(val)}</span>
    },
  },
  {
    id: 'est_gp_per_hour',
    accessorKey: 'est_gp_per_hour',
    header: 'GP $/hr',
    size: 100,
    cell: ({ getValue }) => <span className="font-mono">{fmtCurrency(getValue())}</span>,
  },
  {
    id: 'forecasted_gp',
    accessorKey: 'forecasted_gp',
    header: 'Forecasted GP',
    size: 130,
    meta: { editable: true, inputType: 'number' },
    cell: ({ getValue }) => <span className="font-mono">{fmtCurrency(getValue())}</span>,
  },
  {
    id: 'forecasted_gp_pct',
    accessorKey: 'forecasted_gp_pct',
    header: 'Forecasted GP%',
    size: 130,
    cell: ({ getValue }) => {
      const val = getValue()
      if (val == null) return '—'
      const n = Number(val)
      return <span className={`font-mono ${n >= 0.3 ? 'text-success' : n >= 0.2 ? 'text-orange' : 'text-error'}`}>{fmtPct(val)}</span>
    },
  },
  {
    id: 'forecasted_gp_per_hour',
    accessorKey: 'forecasted_gp_per_hour',
    header: 'Forecasted GP $/hr',
    size: 150,
    cell: ({ getValue }) => <span className="font-mono">{fmtCurrency(getValue())}</span>,
  },
  {
    id: 'amount_billed_to_date',
    accessorKey: 'amount_billed_to_date',
    header: 'Billed to Date',
    size: 130,
    cell: ({ getValue }) => <span className="font-mono">{fmtCurrency(getValue())}</span>,
  },
  {
    id: 'wip_to_date',
    accessorKey: 'wip_to_date',
    header: 'WIP',
    size: 110,
    cell: ({ getValue }) => <span className="font-mono">{fmtCurrency(getValue())}</span>,
  },
  {
    id: 'revenue_earned',
    accessorKey: 'revenue_earned',
    header: 'Revenue Earned',
    size: 140,
    cell: ({ getValue }) => <span className="font-mono">{fmtCurrency(getValue())}</span>,
  },
]
