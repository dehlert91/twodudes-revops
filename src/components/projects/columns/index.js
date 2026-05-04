import { identityColumns } from './identityColumns.jsx'
import { revenueColumns } from './revenueColumns.jsx'
import { progressColumns } from './progressColumns.jsx'
import { costColumns } from './costColumns.jsx'
import { profitColumns } from './profitColumns.jsx'
import { billingColumns } from './billingColumns.jsx'
import { allocationColumns } from './allocationColumns.jsx'

export { identityColumns, revenueColumns, progressColumns, costColumns, profitColumns, billingColumns, allocationColumns }

export const allColumns = [
  ...identityColumns,
  ...revenueColumns,
  ...progressColumns,
  ...costColumns,
  ...profitColumns,
  ...billingColumns,
  ...allocationColumns,
]

// Columns visible in the standard view (in display order) — unchanged
const STANDARD_VISIBLE_IDS = [
  'po_number',
  'stage',
  'tracking_mode',
  'project_manager',
  'total_revenue',
  'total_projected_cost',
  'est_gross_profit',
  'est_gp_pct',
  'est_gp_per_hour',
  'hours_to_date',
  'est_hours_remaining',
  'productivity',
  'labor_cost_to_date',
  'material_cost_to_date',
  'set_cost_to_date',
  'total_cost_to_date',
  'est_labor_cost_remaining',
  'est_materials_remaining',
  'est_set_remaining',
  'est_total_remaining_cost',
]

export const STANDARD_VIEW_ORDER = (() => {
  const visibleSet = new Set(STANDARD_VISIBLE_IDS)
  const hidden = allColumns.map(c => c.id).filter(id => !visibleSet.has(id))
  return [...STANDARD_VISIBLE_IDS, ...hidden]
})()

export const STANDARD_VIEW_VISIBILITY = (() => {
  const vis = {}
  const standardSet = new Set(STANDARD_VISIBLE_IDS)
  for (const col of allColumns) {
    vis[col.id] = standardSet.has(col.id)
  }
  return vis
})()
