import { fmtCurrency, fmtPct } from './formatters'
import { Badge } from '../../ui'

const BILLING_STATUS_TONES = {
  behind:           'warning',
  awaiting_deposit: 'info',
  awaiting_final:   'info',
  overbilled:       'error',
  on_track:         'success',
  closed:           'default',
  unassigned:       'default',
}

export const billingColumns = [
  {
    id: 'amount_claimed_to_date',
    accessorKey: 'amount_claimed_to_date',
    header: 'Claimed to Date',
    size: 140,
    cell: ({ getValue }) => <span className="font-mono">{fmtCurrency(getValue())}</span>,
  },
  {
    id: 'unbilled_revenue',
    accessorKey: 'unbilled_revenue',
    header: 'Unbilled Revenue',
    size: 140,
    cell: ({ getValue }) => {
      const val = getValue()
      const n = Number(val ?? 0)
      return <span className={`font-mono ${n > 0 ? 'text-warning font-semibold' : ''}`}>{fmtCurrency(val)}</span>
    },
  },
  {
    id: 'costs_in_excess_of_billings',
    accessorKey: 'costs_in_excess_of_billings',
    header: 'Costs > Billings',
    size: 140,
    cell: ({ getValue }) => <span className="font-mono">{fmtCurrency(getValue())}</span>,
  },
  {
    id: 'billings_in_excess_of_costs',
    accessorKey: 'billings_in_excess_of_costs',
    header: 'Billings > Costs',
    size: 140,
    cell: ({ getValue }) => <span className="font-mono">{fmtCurrency(getValue())}</span>,
  },
  {
    id: 'billing_status',
    accessorKey: 'billing_status',
    header: 'Billing Status',
    size: 140,
    cell: ({ getValue }) => {
      const val = getValue()
      if (!val) return '—'
      const tone = BILLING_STATUS_TONES[val] ?? 'default'
      return <Badge tone={tone}>{val.replace(/_/g, ' ')}</Badge>
    },
  },
  {
    id: 'expected_next_invoice_type',
    accessorKey: 'expected_next_invoice_type',
    header: 'Next Invoice',
    size: 130,
    cell: ({ getValue }) => getValue() ?? '—',
  },
  {
    id: 'wip_eligible',
    accessorKey: 'wip_eligible',
    header: 'WIP Eligible',
    size: 110,
    cell: ({ getValue }) => {
      const val = getValue()
      if (val == null) return '—'
      return val ? <Badge tone="info">Yes</Badge> : <Badge tone="default">No</Badge>
    },
  },
  {
    id: 'invoice_count',
    accessorKey: 'invoice_count',
    header: 'Invoice Count',
    size: 120,
    cell: ({ getValue }) => {
      const v = getValue()
      return <span className="font-mono">{v != null ? Number(v) : '—'}</span>
    },
  },
  {
    id: 'last_invoice_date',
    accessorKey: 'last_invoice_date',
    header: 'Last Invoice',
    size: 120,
    cell: ({ getValue }) => fmtDate(getValue()),
  },
  {
    id: 'days_since_last_invoice',
    accessorKey: 'days_since_last_invoice',
    header: 'Days Since Inv.',
    size: 130,
    cell: ({ getValue }) => {
      const v = getValue()
      if (v == null) return '—'
      return <span className={`font-mono ${Number(v) > 30 ? 'text-warning font-semibold' : ''}`}>{v}</span>
    },
  },
  {
    id: 'deposit_billed',
    accessorKey: 'deposit_billed',
    header: 'Deposit Billed',
    size: 130,
    cell: ({ getValue }) => <span className="font-mono">{fmtCurrency(getValue())}</span>,
  },
  {
    id: 'progress_billed',
    accessorKey: 'progress_billed',
    header: 'Progress Billed',
    size: 130,
    cell: ({ getValue }) => <span className="font-mono">{fmtCurrency(getValue())}</span>,
  },
  {
    id: 'final_billed',
    accessorKey: 'final_billed',
    header: 'Final Billed',
    size: 120,
    cell: ({ getValue }) => <span className="font-mono">{fmtCurrency(getValue())}</span>,
  },
  {
    id: 'deposit_count',
    accessorKey: 'deposit_count',
    header: 'Deposit #',
    size: 90,
    cell: ({ getValue }) => <span className="font-mono">{getValue() ?? '—'}</span>,
  },
  {
    id: 'progress_count',
    accessorKey: 'progress_count',
    header: 'Progress #',
    size: 100,
    cell: ({ getValue }) => <span className="font-mono">{getValue() ?? '—'}</span>,
  },
  {
    id: 'final_count',
    accessorKey: 'final_count',
    header: 'Final #',
    size: 80,
    cell: ({ getValue }) => <span className="font-mono">{getValue() ?? '—'}</span>,
  },
  {
    id: 'billing_schedule_type',
    accessorKey: 'billing_schedule_type',
    header: 'Billing Schedule',
    size: 150,
    cell: ({ getValue }) => getValue() ?? '—',
  },
  {
    id: 'billing_schedule_display',
    accessorKey: 'billing_schedule_display',
    header: 'Schedule Label',
    size: 150,
    cell: ({ getValue }) => getValue() ?? '—',
  },
  {
    id: 'deposit_pct',
    accessorKey: 'deposit_pct',
    header: 'Deposit %',
    size: 100,
    cell: ({ getValue }) => <span className="font-mono">{fmtPct(getValue())}</span>,
  },
  {
    id: 'deposit_amount',
    accessorKey: 'deposit_amount',
    header: 'Deposit $',
    size: 110,
    cell: ({ getValue }) => <span className="font-mono">{fmtCurrency(getValue())}</span>,
  },
  {
    id: 'deposit_lead_days',
    accessorKey: 'deposit_lead_days',
    header: 'Deposit Lead Days',
    size: 150,
    cell: ({ getValue }) => {
      const v = getValue()
      return <span className="font-mono">{v != null ? v : '—'}</span>
    },
  },
  {
    id: 'billing_cadence',
    accessorKey: 'billing_cadence',
    header: 'Billing Cadence',
    size: 140,
    cell: ({ getValue }) => getValue() ?? '—',
  },
  {
    id: 'billing_notes',
    accessorKey: 'billing_notes',
    header: 'Billing Notes',
    size: 200,
    cell: ({ getValue }) => {
      const v = getValue()
      return v ? <span className="text-xs text-muted truncate block max-w-[180px]">{v}</span> : '—'
    },
  },
]

function fmtDate(val) {
  if (!val) return '—'
  return new Date(val + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}
