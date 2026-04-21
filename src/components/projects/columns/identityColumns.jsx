import { STAGE_COLORS, PROJECT_STATUS_COLORS } from '../stageConfig'
import { Badge } from '../../ui'

export const identityColumns = [
  {
    id: 'po_number',
    accessorKey: 'po_number',
    header: 'PO #',
    size: 110,
    enableHiding: false, // always visible — it's the universal key
    cell: ({ getValue }) => (
      <span className="font-mono font-semibold text-charcoal">{getValue()}</span>
    ),
  },
  {
    id: 'job_name',
    accessorKey: 'job_name',
    header: 'Job Name',
    size: 220,
    enableHiding: false,
  },
  {
    id: 'stage',
    accessorKey: 'stage',
    header: 'Stage',
    size: 160,
    cell: ({ getValue }) => {
      const stage = getValue()
      const cfg = STAGE_COLORS[stage] ?? { tone: 'default', dot: 'bg-muted' }
      return (
        <Badge tone={cfg.tone} dot={cfg.dot}>
          {stage ?? '—'}
        </Badge>
      )
    },
  },
  {
    id: 'project_status',
    accessorKey: 'project_status',
    header: 'Status',
    size: 140,
    cell: ({ getValue }) => {
      const status = getValue()
      const cfg = PROJECT_STATUS_COLORS[status] ?? { tone: 'default' }
      return status ? <Badge tone={cfg.tone}>{status}</Badge> : '—'
    },
  },
  {
    id: 'segment',
    accessorKey: 'segment',
    header: 'Segment',
    size: 100,
    cell: ({ getValue }) => {
      const val = getValue()
      return val ? <Badge tone="default">{val}</Badge> : '—'
    },
  },
  {
    id: 'team_leader',
    accessorKey: 'team_leader',
    header: 'Team Leader',
    size: 140,
  },
  {
    id: 'sales_rep',
    accessorKey: 'sales_rep',
    header: 'Sales Rep',
    size: 140,
  },
  {
    id: 'project_manager',
    accessorKey: 'project_manager',
    header: 'PM',
    size: 140,
  },
  {
    id: 'customer',
    accessorKey: 'customer',
    header: 'Customer',
    size: 180,
  },
  {
    id: 'company',
    accessorKey: 'company',
    header: 'Company',
    size: 160,
  },
  {
    id: 'estimated_start_date',
    accessorKey: 'estimated_start_date',
    header: 'Start',
    size: 110,
    meta: { editable: true, inputType: 'date' },
    cell: ({ getValue }) => fmtDate(getValue()),
  },
  {
    id: 'estimated_completion_date',
    accessorKey: 'estimated_completion_date',
    header: 'Est. Completion',
    size: 130,
    cell: ({ getValue }) => fmtDate(getValue()),
  },
  {
    id: 'duration_days',
    accessorKey: 'duration_days',
    header: 'Days',
    size: 70,
    meta: { editable: true, inputType: 'number' },
  },
]

function fmtDate(val) {
  if (!val) return '—'
  return new Date(val + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}
