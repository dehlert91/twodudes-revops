import { identityColumns } from './identityColumns.jsx'
import { revenueColumns } from './revenueColumns.jsx'
import { progressColumns } from './progressColumns.jsx'
import { costColumns } from './costColumns'
import { profitColumns } from './profitColumns.jsx'

export const allColumns = [
  ...identityColumns,
  ...revenueColumns,
  ...progressColumns,
  ...costColumns,
  ...profitColumns,
]

// Columns visible in the standard view (in display order)
const STANDARD_VISIBLE_IDS = [
  'po_number',
  'job_name',
  'total_revenue',
  'est_cost_at_completion',
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

// TanStack Table requires ALL column IDs in columnOrder.
// Visible columns first (in desired order), then hidden ones appended.
export const STANDARD_VIEW_ORDER = (() => {
  const visibleSet = new Set(STANDARD_VISIBLE_IDS)
  const hidden = allColumns.map(c => c.id).filter(id => !visibleSet.has(id))
  return [...STANDARD_VISIBLE_IDS, ...hidden]
})()

// Build visibility map: true for standard visible, false for the rest
export const STANDARD_VIEW_VISIBILITY = (() => {
  const vis = {}
  const standardSet = new Set(STANDARD_VISIBLE_IDS)
  for (const col of allColumns) {
    vis[col.id] = standardSet.has(col.id)
  }
  return vis
})()
