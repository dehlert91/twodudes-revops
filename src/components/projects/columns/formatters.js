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
  // Values > 1 are already percentages (e.g. 42.5), values ≤ 1 are decimals (e.g. 0.425)
  const display = n > 1 ? n : n * 100
  return display.toFixed(1) + '%'
}

export function fmtRate(val) {
  if (val == null) return '—'
  return '$' + Number(val).toLocaleString('en-US', { maximumFractionDigits: 2 }) + '/hr'
}
