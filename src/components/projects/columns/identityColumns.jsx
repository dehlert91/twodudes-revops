import { STAGE_COLORS, ALL_STAGES, PROJECT_STATUS_COLORS, TRACKING_MODE_COLORS } from '../stageConfig'
import { Badge } from '../../ui'

export const identityColumns = [
  {
    id: 'po_number',
    accessorKey: 'po_number',
    header: 'Project',
    size: 280,
    enableHiding: false,
    cell: ({ getValue, row }) => (
      <div className="leading-tight">
        <div className="font-mono font-semibold text-charcoal">{getValue()}</div>
        <div className="text-xs text-muted truncate">{row.original.job_name || '—'}</div>
      </div>
    ),
  },
  {
    id: 'stage',
    accessorKey: 'stage',
    header: 'Stage',
    size: 160,
    meta: { editable: true, inputType: 'select', options: ALL_STAGES },
    cell: ({ getValue }) => {
      const stage = getValue()
      const cfg = STAGE_COLORS[stage] ?? { tone: 'default', dot: 'bg-muted' }
      return <Badge tone={cfg.tone} dot={cfg.dot}>{stage ?? '—'}</Badge>
    },
  },
  {
    id: 'project_status',
    accessorKey: 'project_status',
    header: 'Status',
    size: 140,
    meta: { editable: true, inputType: 'select', options: ['Under Budget', 'On Budget', 'Over Budget'] },
    cell: ({ getValue }) => {
      const status = getValue()
      const cfg = PROJECT_STATUS_COLORS[status] ?? { tone: 'default' }
      return status ? <Badge tone={cfg.tone}>{status}</Badge> : '—'
    },
  },
  {
    id: 'tracking_mode',
    accessorKey: 'tracking_mode',
    header: 'Tracking',
    size: 130,
    meta: { editable: true, inputType: 'select', options: ['actuals_tracking', 'forecast'] },
    cell: ({ getValue }) => {
      const val = getValue()
      const cfg = TRACKING_MODE_COLORS[val] ?? { tone: 'default', dot: 'bg-muted', label: val }
      return val ? <Badge tone={cfg.tone} dot={cfg.dot}>{cfg.label}</Badge> : '—'
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
    id: 'city',
    accessorKey: 'city',
    header: 'City',
    size: 130,
  },
  {
    id: 'state',
    accessorKey: 'state',
    header: 'State',
    size: 70,
  },
  {
    id: 'zip_code',
    accessorKey: 'zip_code',
    header: 'Zip',
    size: 80,
  },
  {
    id: 'job_site_address',
    accessorKey: 'job_site_address',
    header: 'Job Site Address',
    size: 220,
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
  {
    id: 'date_job_sold',
    accessorKey: 'date_job_sold',
    header: 'Date Sold',
    size: 110,
    cell: ({ getValue }) => fmtDate(getValue()),
  },
  {
    id: 'division_code',
    accessorKey: 'division_code',
    header: 'Division',
    size: 100,
  },
  {
    id: 'division_name',
    accessorKey: 'division_name',
    header: 'Division Name',
    size: 160,
  },
  {
    id: 'source_attribution',
    accessorKey: 'source_attribution',
    header: 'Source',
    size: 130,
  },
  {
    id: 'prev_or_new_customer',
    accessorKey: 'prev_or_new_customer',
    header: 'New / Prev',
    size: 110,
  },
  {
    id: 'specialty_rate',
    accessorKey: 'specialty_rate',
    header: 'Specialty Rate',
    size: 120,
    meta: { editable: true, inputType: 'number' },
    cell: ({ getValue }) => {
      const v = getValue()
      return v != null ? <span className="font-mono">${Number(v).toFixed(2)}</span> : '—'
    },
  },
  {
    id: 'specialty_payroll_billing',
    accessorKey: 'specialty_payroll_billing',
    header: 'Specialty Payroll/Billing',
    size: 220,
    cell: ({ getValue }) => {
      const v = getValue()
      if (!v) return <span className="text-muted">—</span>
      const tags = String(v).split(';').map(t => t.trim()).filter(Boolean)
      return (
        <div className="flex flex-wrap gap-1">
          {tags.map(tag => (
            <span
              key={tag}
              className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange/10 text-[#B8561E] border border-orange/30 whitespace-nowrap"
            >
              {tag}
            </span>
          ))}
        </div>
      )
    },
  },
  {
    id: 'prev_wage_rate',
    accessorKey: 'prev_wage_rate',
    header: 'Prev Wage Rate',
    size: 130,
    meta: { editable: true, inputType: 'number' },
    cell: ({ getValue }) => {
      const v = getValue()
      return v != null ? <span className="font-mono">${Number(v).toFixed(2)}</span> : '—'
    },
  },
  {
    id: 'hubspot_url',
    accessorKey: 'hubspot_url',
    header: 'HubSpot',
    size: 100,
    cell: ({ getValue }) => {
      const url = getValue()
      return url ? (
        <a href={url} target="_blank" rel="noopener noreferrer"
           className="text-orange hover:underline text-xs" onClick={e => e.stopPropagation()}>
          Open ↗
        </a>
      ) : '—'
    },
  },
]

function fmtDate(val) {
  if (!val) return '—'
  return new Date(val + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}
