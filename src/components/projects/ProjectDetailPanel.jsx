import { useEffect } from 'react'
import { STAGE_COLORS, PROJECT_STATUS_COLORS } from './stageConfig'
import { Badge, SectionLabel } from '../ui'
import { fmtCurrency, fmtPct, fmtRate } from './columns/formatters'

export function ProjectDetailPanel({ project, onClose }) {
  // Close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!project) return null

  const cfg = STAGE_COLORS[project.stage] ?? { tone: 'default', dot: 'bg-muted' }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-surface z-50 shadow-elevated overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="border-b border-line px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted font-mono mb-0.5">{project.po_number}</p>
            <h2 className="font-display text-xl font-bold text-charcoal leading-tight">{project.job_name}</h2>
            <div className="mt-2 flex items-center gap-2">
              <Badge tone={cfg.tone} dot={cfg.dot}>
                {project.stage}
              </Badge>
              {project.project_status && (() => {
                const statusCfg = PROJECT_STATUS_COLORS[project.project_status] ?? { tone: 'default' }
                return <Badge tone={statusCfg.tone}>{project.project_status}</Badge>
              })()}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-muted hover:text-charcoal text-xl leading-none mt-0.5"
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-5 space-y-6">
          <Section title="Job Info">
            <Row label="Customer" value={project.customer} />
            <Row label="Company" value={project.company} />
            <Row label="Segment" value={project.segment} />
            <Row label="Division" value={project.division_name} />
            <Row label="Sales Rep" value={project.sales_rep} />
            <Row label="Team Leader" value={project.team_leader} />
            <Row label="PM" value={project.project_manager} />
            <Row label="Source" value={project.source_attribution} />
            <Row label="New/Prev Customer" value={project.prev_or_new_customer} />
            <Row label="Address" value={[project.job_site_address, project.city, project.state, project.zip_code].filter(Boolean).join(', ')} />
            <Row label="Date Sold" value={fmtDate(project.date_job_sold)} />
          </Section>

          <Section title="Schedule">
            <Row label="Est. Start" value={fmtDate(project.estimated_start_date)} />
            <Row label="Est. Completion" value={fmtDate(project.estimated_completion_date)} />
            <Row label="Duration" value={project.duration_days != null ? `${project.duration_days} days` : null} />
          </Section>

          <Section title="Revenue">
            <Row label="Contract Revenue" value={fmtCurrency(project.contract_revenue)} />
            <Row label="Contract Hours" value={project.contract_hours} />
            <Row label="Contract Sales Rate" value={fmtRate(project.contract_sales_rate)} />
            <Row label="CO Revenue" value={fmtCurrency(project.co_revenue)} />
            <Row label="CO Hours" value={project.co_hours} />
            <Row label="Total Revenue" value={fmtCurrency(project.total_revenue)} bold />
            <Row label="Total Hours" value={project.total_hours} />
            <Row label="Total Sales Rate" value={fmtRate(project.total_sales_rate)} />
          </Section>

          <Section title="Progress">
            <Row label="% Complete" value={fmtPct(project.pct_complete)} />
            <Row label="Hours to Date" value={project.hours_to_date} />
            <Row label="Est. Hours Remaining" value={project.est_hours_remaining} />
            <Row label="Total Project Hours" value={project.total_project_hours} />
            <Row label="Productivity" value={fmtPct(project.productivity)} />
            <Row label="Realized Sales Rate" value={fmtRate(project.realized_sales_rate)} />
            <Row label="Sales Rate Variance" value={fmtRate(project.sales_rate_variance)} />
          </Section>

          <Section title="Costs">
            <Row label="Avg Labor $/hr" value={fmtCurrency(project.avg_labor_cost_per_hour)} />
            <Row label="Labor Cost to Date" value={fmtCurrency(project.labor_cost_to_date)} />
            <Row label="Est. Labor Remaining" value={fmtCurrency(project.est_labor_cost_remaining)} />
            <Row label="Material Cost to Date" value={fmtCurrency(project.material_cost_to_date)} />
            <Row label="Est. Materials Remaining" value={fmtCurrency(project.est_materials_remaining)} />
            <Row label="SET Cost to Date" value={fmtCurrency(project.set_cost_to_date)} />
            <Row label="Est. SET Remaining" value={fmtCurrency(project.est_set_remaining)} />
            <Row label="Total Cost to Date" value={fmtCurrency(project.total_cost_to_date)} bold />
            <Row label="Est. Total Remaining" value={fmtCurrency(project.est_total_remaining_cost)} />
            <Row label="Est. Cost at Completion" value={fmtCurrency(project.est_cost_at_completion)} bold />
            <Row label="Forecasted Hours" value={project.forecasted_hours != null ? Number(project.forecasted_hours).toLocaleString('en-US', { maximumFractionDigits: 1 }) : null} />
            <Row label="Forecasted Materials" value={fmtCurrency(project.forecasted_materials)} />
            <Row label="Forecasted SET" value={fmtCurrency(project.forecasted_set)} />
            <Row label="Labor % of Revenue" value={fmtPct(project.labor_pct_of_revenue)} />
            <Row label="Material % of Revenue" value={fmtPct(project.material_pct_of_revenue)} />
            <Row label="SET % of Revenue" value={fmtPct(project.set_pct_of_revenue)} />
          </Section>

          <Section title="Profitability">
            <Row label="Est. Gross Profit" value={fmtCurrency(project.est_gross_profit)} bold />
            <Row label="Est. GP%" value={fmtPct(project.est_gp_pct)} bold />
            <Row label="Est. GP $/hr" value={fmtCurrency(project.est_gp_per_hour)} />
            <Row label="Forecasted GP" value={fmtCurrency(project.forecasted_gp)} />
          </Section>

          <Section title="Billing & WIP">
            <Row label="Billed to Date" value={fmtCurrency(project.amount_billed_to_date)} />
            <Row label="Claimed to Date" value={fmtCurrency(project.amount_claimed_to_date)} />
            <Row label="Revenue Earned" value={fmtCurrency(project.revenue_earned)} />
            <Row label="WIP to Date" value={fmtCurrency(project.wip_to_date)} />
            <Row label="Costs in Excess of Billings" value={fmtCurrency(project.costs_in_excess_of_billings)} />
            <Row label="Billings in Excess of Costs" value={fmtCurrency(project.billings_in_excess_of_costs)} />
          </Section>

          {project.hubspot_url && (
            <a
              href={project.hubspot_url}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm text-orange underline"
            >
              View in HubSpot →
            </a>
          )}
        </div>
      </div>
    </>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <div className="mb-2 border-b border-line pb-1">
        <SectionLabel>{title}</SectionLabel>
      </div>
      <dl className="space-y-1.5">{children}</dl>
    </div>
  )
}

function Row({ label, value, bold }) {
  const display = value == null || value === '' ? '—' : String(value)
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-muted shrink-0">{label}</dt>
      <dd className={`text-right ${bold ? 'font-semibold text-charcoal' : 'text-charcoal'}`}>{display}</dd>
    </div>
  )
}

function fmtDate(val) {
  if (!val) return null
  return new Date(val + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}
