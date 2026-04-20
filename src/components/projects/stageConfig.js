// Color config for each stage badge.
// Uses semantic design-system tokens. Orange is used for the active "In Progress" stage only.
export const STAGE_COLORS = {
  'In Progress':           { bg: 'bg-orange/10',       text: 'text-orange' },
  'Scheduled':             { bg: 'bg-info/10',         text: 'text-info' },
  'Not Scheduled':         { bg: 'bg-surface-muted',   text: 'text-muted' },
  'Blocked':               { bg: 'bg-error/10',        text: 'text-error' },
  'Project on Hold':       { bg: 'bg-orange/10',       text: 'text-orange-dark' },
  'Need to Invoice':       { bg: 'bg-info/10',         text: 'text-info' },
  'Benchmark in Progress': { bg: 'bg-info/10',         text: 'text-info' },
  'Benchmark Completed':   { bg: 'bg-success/10',      text: 'text-success' },
  'Unknown':               { bg: 'bg-surface-muted',   text: 'text-muted' },
}

export const ALL_STAGES = Object.keys(STAGE_COLORS)
