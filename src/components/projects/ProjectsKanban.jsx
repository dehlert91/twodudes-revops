import { useMemo } from 'react'
import { STAGE_COLORS } from './stageConfig'
import { fmtCurrency, fmtPct } from './columns/formatters'

const PIPELINE_STAGES = [
  'Not Scheduled',
  'Scheduled',
  'In Progress',
  'Need to Invoice',
  'Benchmark in Progress',
  'Benchmark Completed',
  'Project on Hold',
  'Blocked',
  'Complete',
]

// Stages that get the orange accent treatment
const WARN_STAGES = new Set(['Need to Invoice', 'Blocked'])
const HOT_STAGES = new Set(['In Progress'])

export function ProjectsKanban({ data, onRowClick }) {
  const columns = useMemo(() => {
    const grouped = {}
    for (const stage of PIPELINE_STAGES) {
      grouped[stage] = { name: stage, jobs: [], total: 0 }
    }
    // Catch any stages not in our ordered list
    for (const row of data) {
      const stage = row.stage || 'Unknown'
      if (!grouped[stage]) {
        grouped[stage] = { name: stage, jobs: [], total: 0 }
      }
      grouped[stage].jobs.push(row)
      grouped[stage].total += Number(row.total_revenue) || 0
    }
    // Only show stages that have jobs
    return PIPELINE_STAGES
      .filter(s => grouped[s] && grouped[s].jobs.length > 0)
      .map(s => grouped[s])
  }, [data])

  if (data.length === 0) {
    return <p className="text-center py-12 text-muted">No projects match your filters.</p>
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3.5 min-w-max">
        {columns.map(col => (
          <KanbanColumn
            key={col.name}
            column={col}
            onCardClick={onRowClick}
          />
        ))}
      </div>
    </div>
  )
}

function KanbanColumn({ column, onCardClick }) {
  const isWarn = WARN_STAGES.has(column.name)
  const isHot = HOT_STAGES.has(column.name)
  const cfg = STAGE_COLORS[column.name] ?? { bg: 'bg-surface-muted', text: 'text-muted' }

  return (
    <div className="w-[264px] shrink-0 flex flex-col bg-surface-muted rounded-md p-3">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-line">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: isWarn ? '#E57A3A' : isHot ? '#1A1A1A' : '#D4D4D4',
            }}
          />
          <span className="text-xs font-bold text-ink tracking-wide">{column.name}</span>
          <span className="font-mono text-[11px] text-muted">{column.jobs.length}</span>
        </div>
        <span className="font-mono text-[11px] text-charcoal font-medium">
          {fmtCurrency(column.total)}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 flex-1">
        {column.jobs.map(job => (
          <KanbanCard
            key={job.po_number}
            job={job}
            isWarnColumn={isWarn}
            onClick={() => onCardClick(job)}
          />
        ))}
      </div>
    </div>
  )
}

function KanbanCard({ job, isWarnColumn, onClick }) {
  const pct = Number(job.pct_complete) || 0
  const pctDisplay = (pct * 100).toFixed(0)

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-surface rounded-sm p-2.5 border transition-colors hover:border-orange/40 ${
        isWarnColumn ? 'border-l-[3px] border-l-orange border-t border-r border-b border-t-line-soft border-r-line-soft border-b-line-soft' : 'border border-line-soft'
      }`}
    >
      <div className="font-mono text-[10px] text-muted mb-1">
        {job.po_number} · {job.segment || '—'}
      </div>
      <div className="text-xs font-semibold text-ink leading-snug mb-2">
        {job.job_name}
      </div>

      {/* Progress bar */}
      {pct > 0 && (
        <div className="h-[3px] bg-surface-muted rounded-sm mb-2 overflow-hidden">
          <div
            className={`h-full ${pct >= 1 ? 'bg-success' : 'bg-ink'}`}
            style={{ width: `${Math.min(pctDisplay, 100)}%` }}
          />
        </div>
      )}

      {/* Footer: PM + revenue */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5 text-[10px] text-muted">
          <div className="w-4 h-4 rounded-full bg-surface-muted" />
          {job.project_manager || '—'}
        </div>
        <span className="font-mono text-[11px] text-charcoal font-medium">
          {fmtCurrency(job.total_revenue)}
        </span>
      </div>
    </button>
  )
}
