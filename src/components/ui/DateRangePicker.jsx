import { useState, useRef, useEffect } from 'react'

const PRESETS = [
  { key: 'this_month',  label: 'This Month' },
  { key: 'last_month',  label: 'Last Month' },
  { key: 'last_3m',     label: 'Last 3 Months' },
  { key: 'last_6m',     label: 'Last 6 Months' },
  { key: 'ytd',         label: 'Year to Date' },
  { key: 'last_year',   label: 'Last Year' },
]

function toIso(d) {
  return d.toISOString().slice(0, 10)
}

function applyPreset(key) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  if (key === 'this_month') {
    return { start: `${y}-${String(m + 1).padStart(2, '0')}-01`, end: toIso(now) }
  }
  if (key === 'last_month') {
    const lmYear = m === 0 ? y - 1 : y
    const lmMonth = m === 0 ? 12 : m
    const lastDay = new Date(y, m, 0)
    return {
      start: `${lmYear}-${String(lmMonth).padStart(2, '0')}-01`,
      end: toIso(lastDay),
    }
  }
  if (key === 'last_3m') {
    const s = new Date(Date.UTC(y, m - 3, 1))
    return { start: toIso(s), end: toIso(now) }
  }
  if (key === 'last_6m') {
    const s = new Date(Date.UTC(y, m - 6, 1))
    return { start: toIso(s), end: toIso(now) }
  }
  if (key === 'ytd') {
    return { start: `${y}-01-01`, end: toIso(now) }
  }
  if (key === 'last_year') {
    return { start: `${y - 1}-01-01`, end: `${y - 1}-12-31` }
  }
  return { start: '', end: '' }
}

function fmtDisplay(iso) {
  if (!iso) return ''
  const [y, mo, d] = iso.split('-')
  return `${mo}/${d}/${y.slice(2)}`
}

/**
 * DateRangePicker — a compact From/To date filter with preset shortcuts.
 *
 * Props:
 *   value:    { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
 *   onChange: ({ start, end }) => void
 *   label:    string  (default 'Date Range')
 */
export function DateRangePicker({ value = { start: '', end: '' }, onChange, label = 'Date Range' }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef(null)

  // Sync draft when external value changes (e.g. view switch)
  useEffect(() => { setDraft(value) }, [value])

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const isActive = !!(value.start || value.end)

  function apply(next) {
    setDraft(next)
    onChange(next)
    setOpen(false)
  }

  function handleManualChange(field, val) {
    const next = { ...draft, [field]: val }
    setDraft(next)
    // Auto-apply when both fields are filled
    if (next.start && next.end) {
      onChange(next)
    }
  }

  function clear(e) {
    e.stopPropagation()
    apply({ start: '', end: '' })
  }

  const buttonLabel = isActive
    ? `${fmtDisplay(value.start)} – ${fmtDisplay(value.end)}`
    : label

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors
          ${isActive
            ? 'border-orange text-orange bg-orange/5 hover:bg-orange/10'
            : 'border-line text-muted hover:border-line-strong hover:text-charcoal'
          }`}
      >
        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="whitespace-nowrap">{buttonLabel}</span>
        {isActive && (
          <span
            onClick={clear}
            className="ml-0.5 text-orange/70 hover:text-orange leading-none cursor-pointer"
            title="Clear date filter"
          >
            ×
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 w-64 bg-surface border border-line rounded-md shadow-elevated p-3">
          {/* Preset buttons */}
          <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-1.5">Quick select</p>
          <div className="grid grid-cols-2 gap-1 mb-3">
            {PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => apply(applyPreset(p.key))}
                className="px-2 py-1 text-xs rounded border border-line hover:border-orange hover:text-orange transition-colors text-left"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Manual date inputs */}
          <div className="border-t border-line pt-3">
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-1.5">Custom range</p>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs">
                <span className="w-8 text-muted shrink-0">From</span>
                <input
                  type="date"
                  value={draft.start}
                  onChange={e => handleManualChange('start', e.target.value)}
                  className="flex-1 border border-line rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </label>
              <label className="flex items-center gap-2 text-xs">
                <span className="w-8 text-muted shrink-0">To</span>
                <input
                  type="date"
                  value={draft.end}
                  onChange={e => handleManualChange('end', e.target.value)}
                  className="flex-1 border border-line rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </label>
            </div>
            <div className="flex justify-between mt-3">
              <button
                onClick={() => apply({ start: '', end: '' })}
                className="text-xs text-muted hover:text-charcoal"
              >
                Clear
              </button>
              <button
                onClick={() => apply(draft)}
                className="px-3 py-1 text-xs font-medium bg-orange text-white rounded hover:bg-orange/90 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
