import { useEffect, useRef, useState, useMemo } from 'react'

/**
 * Generic Columns dropdown — show / hide / search across an arbitrary column list.
 * Used by Finance tables. Pass an array of { id, header } and the current
 * `visibility` map; receive new visibility map via `onChange`.
 */
export function ColumnsDropdown({ columns, visibility, onChange, alwaysVisible = [] }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch('') } }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const filtered = useMemo(() => {
    if (!search) return columns
    const q = search.toLowerCase()
    return columns.filter(c => String(c.header ?? c.id).toLowerCase().includes(q))
  }, [columns, search])

  const lockedSet = useMemo(() => new Set(alwaysVisible), [alwaysVisible])

  function toggle(id) {
    if (lockedSet.has(id)) return
    const next = { ...visibility, [id]: visibility[id] === false }
    onChange(next)
  }

  function showAll() {
    onChange(Object.fromEntries(columns.map(c => [c.id, true])))
  }

  function hideAll() {
    const next = {}
    for (const c of columns) next[c.id] = lockedSet.has(c.id)
    onChange(next)
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        className="px-2.5 py-1 rounded text-xs font-medium border border-line text-muted hover:border-line-strong hover:text-charcoal transition-colors"
      >
        Columns
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-64 bg-surface border border-line rounded-md shadow-elevated flex flex-col max-h-96">
          <div className="p-1.5 border-b border-line">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search columns…"
              className="w-full px-2 py-1 text-xs border border-line rounded focus:outline-none focus:ring-1 focus:ring-orange"
              autoFocus
            />
          </div>
          <div className="flex gap-2 px-3 py-1.5 border-b border-line">
            <button onClick={showAll} className="text-xs text-orange hover:underline">Show all</button>
            <span className="text-line">|</span>
            <button onClick={hideAll} className="text-xs text-orange hover:underline">Hide all</button>
          </div>
          <div className="overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted">No columns match.</p>
            ) : (
              filtered.map(col => {
                const visible = visibility[col.id] !== false
                const locked = lockedSet.has(col.id)
                return (
                  <label
                    key={col.id}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs ${locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-surface-subtle'}`}
                  >
                    <input
                      type="checkbox"
                      checked={visible}
                      disabled={locked}
                      onChange={() => toggle(col.id)}
                      className="accent-orange"
                    />
                    {col.header ?? col.id}
                  </label>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
