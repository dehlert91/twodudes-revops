import { STAGE_COLORS } from '../stageConfig'

export const identityColumns = [
  {
    id: 'po_number',
    accessorKey: 'po_number',
    header: 'PO #',
    size: 110,
    enableHiding: false, // always visible — it's the universal key
    cell: ({ getValue }) => (
      <span className="font-semibold text-black">{getValue()}</span>
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
      const cfg = STAGE_COLORS[stage] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
      return (
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.text}`}>
          {stage ?? '—'}
        </span>
      )
    },
  },
  {
    id: 'segment',
    accessorKey: 'segment',
    header: 'Segment',
    size: 100,
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
