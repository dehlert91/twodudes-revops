// Color config for each stage badge.
// bg/text use Tailwind classes. Orange is used for the active "In Progress" stage only.
export const STAGE_COLORS = {
  'In Progress':           { bg: 'bg-orange/10',   text: 'text-orange' },
  'Scheduled':             { bg: 'bg-blue-50',     text: 'text-blue-700' },
  'Not Scheduled':         { bg: 'bg-gray-100',    text: 'text-gray-600' },
  'Blocked':               { bg: 'bg-red-50',      text: 'text-red-700' },
  'Project on Hold':       { bg: 'bg-yellow-50',   text: 'text-yellow-700' },
  'Need to Invoice':       { bg: 'bg-purple-50',   text: 'text-purple-700' },
  'Benchmark in Progress': { bg: 'bg-teal-50',     text: 'text-teal-700' },
  'Benchmark Completed':   { bg: 'bg-green-50',    text: 'text-green-700' },
  'Unknown':               { bg: 'bg-gray-100',    text: 'text-gray-400' },
}

export const ALL_STAGES = Object.keys(STAGE_COLORS)
