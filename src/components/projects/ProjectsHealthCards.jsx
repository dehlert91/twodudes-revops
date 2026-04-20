import { useMemo } from 'react'
import { STAGE_COLORS } from './stageConfig'
import { fmtCurrency, fmtPct } from './columns/formatters'

// Health classification logic based on wireframe spec
function classifyHealth(job) {
  const pct = Number(job.pct_complete) || 0
  const gp = Number(job.est_gp_pct) || 0
  const stage = job.stage || ''

  // Action needed: needs invoicing or 100% complete but not invoiced
  if (stage === 'Need to Invoice' || (pct >= 1 && stage !== 'Complete' && stage !== 'Benchmark Completed')) {
    return 'action'
  }
  // At risk: blocked or overdue
  if (stage === 'Blocked' || stage === 'Project on Hold') {
    return 'risk'
  }
  // Watch: low GP margin (< 25%) or other warning signals
  if (gp > 0 && gp < 0.25) {
    return 'watch'
  }
  return 'ok'
}

const HEALTH_CONFIG = {
  ok:     { label: 'On track',       color: '#4A8C5C', border: 'border-l-success' },
  watch:  { label: 'Watch',          color: '#E57A3A', border: 'border-l-orange' },
  risk:   { label: 'At risk',        color: '#C0392B', border: 'border-l-error' },
  action: { label: 'Action needed',  color: '#2980B9', border: 'border-l-info' },
}

const DOT_COLORS = { ok: 'bg-success', watch: 'bg-orange', risk: 'bg-error', action: 'bg-info' }

function getNote(job) {
  const stage = job.stage || ''
  const gp = Number(job.est_gp_pct) || 0
  if (stage === 'Blocked' || stage === 'Project on Hold') return 'Project blocked'
  if (stage === 'Need to Invoice') return 'Ready to invoice'
  if (gp > 0 && gp < 0.20) return 'Margin critically low'
  if (gp > 0 && gp < 0.25) return 'Margin trending low'
  return null
}

function getDueLabel(job) {
  if (job.stage === 'Need to Invoice') return 'Invoice today'
  if (!job.estimated_completion_date) return '—'
  const due = new Date(job.estimated_completion_date + 'T00:00:00')
  const now = new Date()
  const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24))
  if (diff < 0) return `Overdue ${Math.abs(diff)}d`
  return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ProjectsHealthCards({ data, onRowClick }) {
  const { counts, cards } = useMemo(() => {
    const counts = { ok: 0, watch: 0, risk: 0, action: 0 }
    const cards = data.map(job => {
      const health = classifyHealth(job)
      counts[health]++
      return { ...job, health, note: getNote(job), dueLabel: getDueLabel(job) }
    })
    return { counts, cards }
  }, [data])

  if (data.length === 0) {
    return <p className="text-center py-12 text-muted">No projects match your filters.</p>
  }

  return (
    <div>
      {/* Health strip */}
      <div className="flex gap-3 mb-4">
        {(['ok', 'watch', 'risk', 'action']).map(key => {
          const cfg = HEALTH_CONFIG[key]
          return (
            <div
              key={key}
              className={`flex-1 p-3 bg-surface-muted rounded-sm border-l-[3px] ${cfg.border} flex items-center justify-between`}
            >
              <div>
                <div className="text-[11px] font-semibold text-muted uppercase tracking-wide">
                  {cfg.label}
                </div>
                <div className="font-mono text-xl font-medium text-ink mt-0.5">
                  {counts[key]}
                </div>
              </div>
              <div className="text-[11px] text-muted">jobs</div>
            </div>
          )
        })}
      </div>

      {/* Card grid */}
      <div className="bg-surface-muted rounded-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cards.map(card => (
            <HealthCard key={card.po_number} card={card} onClick={() => onRowClick(card)} />
          ))}
        </div>
      </div>
    </div>
  )
}

function HealthCard({ card, onClick }) {
  const health = card.health
  const cfg = HEALTH_CONFIG[health]
  const pct = Number(card.pct_complete) || 0
  const pctDisplay = (pct * 100).toFixed(0)
  const gp = Number(card.est_gp_pct) || 0
  const gpDisplay = (gp * 100).toFixed(1)
  const isOverdue = card.dueLabel.includes('Overdue') || card.dueLabel.includes('today')

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-surface border border-line-soft rounded-md p-4 hover:border-orange/40 transition-colors"
    >
      {/* Top: PO + health badge */}
      <div className="flex justify-between items-start mb-2.5">
        <div>
          <div className="font-mono text-[10px] text-muted">{card.po_number}</div>
          <div className="text-[15px] font-bold text-ink mt-1 leading-tight">{card.job_name}</div>
          <div className="text-[11px] text-muted mt-0.5">
            {card.customer || card.company || '—'} · {card.project_manager || '—'}
          </div>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-[3px] bg-surface-muted text-charcoal">
          <span className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[health]}`} />
          {cfg.label}
        </span>
      </div>

      {/* Progress */}
      <div className="mt-2.5 mb-2.5">
        <div className="flex justify-between text-[10px] text-muted mb-1">
          <span>{card.stage}</span>
          <span className="font-mono">{pctDisplay}%</span>
        </div>
        <div className="h-1 bg-surface-muted rounded-sm overflow-hidden">
          <div
            className={`h-full ${
              pct >= 1 ? 'bg-success' : health === 'risk' ? 'bg-error' : 'bg-ink'
            }`}
            style={{ width: `${Math.min(pctDisplay, 100)}%` }}
          />
        </div>
      </div>

      {/* Bottom stats: revenue / GP / due */}
      <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-line-soft">
        <div>
          <div className="text-[9px] text-muted uppercase tracking-wide font-semibold">Revenue</div>
          <div className="font-mono text-[13px] text-ink font-medium mt-0.5">
            {fmtCurrency(card.total_revenue)}
          </div>
        </div>
        <div>
          <div className="text-[9px] text-muted uppercase tracking-wide font-semibold">GP</div>
          <div className={`font-mono text-[13px] font-medium mt-0.5 ${
            gp < 0.25 ? 'text-error' : 'text-ink'
          }`}>
            {gpDisplay}%
          </div>
        </div>
        <div>
          <div className="text-[9px] text-muted uppercase tracking-wide font-semibold">Due</div>
          <div className={`font-mono text-[13px] font-medium mt-0.5 ${
            isOverdue ? 'text-[#B8561E]' : 'text-ink'
          }`}>
            {card.dueLabel}
          </div>
        </div>
      </div>

      {/* Alert note */}
      {card.note && (
        <div className="mt-2.5 px-2.5 py-1.5 bg-orange/10 rounded-[3px] text-[11px] text-[#B8561E] font-medium">
          ⚑ {card.note}
        </div>
      )}
    </button>
  )
}
