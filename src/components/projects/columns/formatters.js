export function fmtCurrency(val) {
  if (val == null) return '—'
  return Number(val).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

export function fmtPct(val) {
  if (val == null) return '—'
  const n = Number(val)
  return (n * 100).toFixed(1) + '%'
}

export function fmtRate(val) {
  if (val == null) return '—'
  return '$' + Number(val).toLocaleString('en-US', { maximumFractionDigits: 2 }) + '/hr'
}

export function fmtHours(val) {
  if (val == null) return '—'
  return Number(val).toLocaleString('en-US', { maximumFractionDigits: 1 })
}

export function fmtDate(val) {
  if (!val) return null
  return new Date(val + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}
