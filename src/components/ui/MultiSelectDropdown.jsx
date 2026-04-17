import { useState, useRef, useEffect } from 'react'

export function MultiSelectDropdown({ label, options, selected, onChange, onRemove }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  function toggle(value) {
    onChange(
      selected.includes(value)
        ? selected.filter(v => v !== value)
        : [...selected, value]
    )
  }

  const count = selected.length

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => setOpen(o => !o)}
          className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors flex items-center gap-1 ${
            count > 0
              ? 'bg-black text-white border-black'
              : 'bg-white text-gray-600 border-gray-light hover:border-gray-400'
          }`}
        >
          {label}
          {count > 0 && (
            <span className="bg-white/20 text-[10px] px-1 rounded">{count}</span>
          )}
          <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {onRemove && (
          <button
            onClick={onRemove}
            className="px-1 py-1 text-gray-400 hover:text-gray-600 text-xs"
            title={`Remove ${label} filter`}
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-56 bg-white border border-gray-light rounded-md shadow-lg max-h-64 overflow-y-auto">
          {count > 0 && (
            <button
              onClick={() => onChange([])}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 border-b border-gray-light"
            >
              Clear all
            </button>
          )}
          {options.map(opt => (
            <label
              key={opt}
              className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="rounded border-gray-300 text-orange focus:ring-orange"
              />
              <span className="truncate">{opt}</span>
            </label>
          ))}
          {options.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400">No options</p>
          )}
        </div>
      )}
    </div>
  )
}
