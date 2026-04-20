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
