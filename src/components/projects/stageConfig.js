// Color config for each stage badge.
// Uses semantic design-system tokens. Orange is used for the active "In Progress" stage only.
export const STAGE_COLORS = {
  'In Progress':           { bg: 'bg-orange/10',       text: 'text-orange',      tone: 'warning', dot: 'bg-orange' },
  'Scheduled':             { bg: 'bg-info/10',         text: 'text-info',        tone: 'info',    dot: 'bg-info' },
  'Not Scheduled':         { bg: 'bg-surface-muted',   text: 'text-muted',       tone: 'default', dot: 'bg-muted' },
  'Blocked':               { bg: 'bg-error/10',        text: 'text-error',       tone: 'error',   dot: 'bg-error' },
  'Project on Hold':       { bg: 'bg-orange/10',       text: 'text-orange-dark', tone: 'warning', dot: 'bg-orange' },
  'Need to Invoice':       { bg: 'bg-info/10',         text: 'text-info',        tone: 'info',    dot: 'bg-info' },
  'Benchmark in Progress': { bg: 'bg-info/10',         text: 'text-info',        tone: 'info',    dot: 'bg-info' },
  'Benchmark Completed':   { bg: 'bg-success/10',      text: 'text-success',     tone: 'success', dot: 'bg-success' },
  'Unknown':               { bg: 'bg-surface-muted',   text: 'text-muted',       tone: 'default', dot: 'bg-muted' },
}

export const ALL_STAGES = Object.keys(STAGE_COLORS)

// Project status (budget) badge colors
export const PROJECT_STATUS_COLORS = {
  'Under Budget': { tone: 'success' },
  'On Budget':    { tone: 'warning' },
  'Over Budget':  { tone: 'error' },
}

export const ALL_PROJECT_STATUSES = Object.keys(PROJECT_STATUS_COLORS)
