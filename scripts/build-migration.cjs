const fs = require('fs');
let sql = fs.readFileSync('C:\\Users\\DylanEhlert\\twodudes-revops\\scripts\\current-view.sql', 'utf8');

// Tiers tier2b..tier8: insert override passthroughs after each "t.total_sales_rate,"
// Each occurrence at lines 415, 504, 599, 706, 802, 904, 1015, 1152 — 8 occurrences.
// Replace all matches of the exact line `            t.total_sales_rate,\n` with appended overrides.
const target = '            t.total_sales_rate,\n';
const replacement = '            t.total_sales_rate,\n            t.forecast_labor_cost_override,\n            t.forecasted_materials_override,\n            t.forecasted_set_override,\n';
// Count occurrences first
const matches = sql.split(target).length - 1;
if (matches !== 8) {
  console.error('Expected 8 matches, found', matches);
  process.exit(1);
}
sql = sql.split(target).join(replacement);

// Final SELECT: append override columns AT THE END (after updated_at) to preserve existing column order.
// CREATE OR REPLACE VIEW only allows appending new columns, not reordering existing ones.
const finalTarget = '    updated_at\n   FROM tier8';
const finalReplacement = '    updated_at,\n    forecast_labor_cost_override,\n    forecasted_materials_override,\n    forecasted_set_override\n   FROM tier8';
const finalMatches = sql.split(finalTarget).length - 1;
if (finalMatches !== 1) {
  console.error('Expected 1 final match, found', finalMatches);
  process.exit(1);
}
sql = sql.replace(finalTarget, finalReplacement);

const trimmedSql = sql.replace(/;+\s*$/, '');
const migration = `CREATE OR REPLACE VIEW public.project_details AS\n${trimmedSql};\n`;
fs.writeFileSync('C:\\Users\\DylanEhlert\\twodudes-revops\\scripts\\migration.sql', migration);
console.log('Migration written,', migration.length, 'chars');
