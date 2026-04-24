import { useState, useRef, useEffect, useMemo } from 'react'
import { ALL_STAGES } from './stageConfig'
import { allColumns } from './columns'
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown'
import { Button } from '../ui'

const SEGMENTS = ['CDO', 'CGC', 'RCG / RDO', 'RDO', 'RGC']

// Permanent filters always shown
const PERMANENT_KEYS = ['stage', 'segment', 'project_manager', 'sales_rep']

const VIEW_MODES = [
  { key: 'list', label: 'List' },
  { key: 'board', label: 'Board' },
  { key: 'cards', label: 'Cards' },
]

// Build a label map from column definitions
const COL_LABELS = Object.fromEntries(allColumns.map(c => [c.id, c.header]))

export function ProjectsToolbar({
  globalFilter, onGlobalFilter,
  stageFilter, onStageFilter,
  segmentFilter, onSegmentFilter,
  pmFilter, onPmFilter,
  salesRepFilter, onSalesRepFilter,
  // Dynamic filters
  dynamicFilters = {},
  onDynamicFilterChange,
  // All data for building option lists
  allData = [],
  // View props
  activeViewName, viewNames, onLoadView, onSaveView, onDeleteView,
  onRefresh, loading,
  // View mode
  viewMode = 'list', onViewModeChange,
}) {
  const [activeOptional, setActiveOptional] = useState([])
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [filterSearch, setFilterSearch] = useState('')
  const [viewMenuOpen, setViewMenuOpen] = useState(false)
  const [savingAs, setSavingAs] = useState(false)
  const [newViewName, setNewViewName] = useState('')
  const addRef = useRef(null)
  const viewRef = useRef(null)
  const saveInputRef = useRef(null)
  const filterSearchRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (addRef.current && !addRef.current.contains(e.target)) { setAddMenuOpen(false); setFilterSearch('') }
      if (viewRef.current && !viewRef.current.contains(e.target)) {
        setViewMenuOpen(false)
        setSavingAs(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (savingAs && saveInputRef.current) saveInputRef.current.focus()
  }, [savingAs])

  useEffect(() => {
    if (addMenuOpen && filterSearchRef.current) filterSearchRef.current.focus()
  }, [addMenuOpen])

  // Build unique sorted options for any column from allData
  const optionsCache = useMemo(() => {
    const cache = {}
    for (const key of activeOptional) {
      cache[key] = [...new Set(allData.map(r => r[key]).filter(Boolean))].sort()
    }
    return cache
  }, [allData, activeOptional])

  // Columns available for "Add Filter" — exclude permanent ones and already-active ones
  const availableFilterColumns = useMemo(() => {
    const taken = new Set([...PERMANENT_KEYS, ...activeOptional])
    return allColumns
      .filter(c => !taken.has(c.id) && c.id !== 'po_number' && c.id !== 'job_name')
      .map(c => ({ key: c.id, label: c.header }))
  }, [activeOptional])

  const filteredAvailable = useMemo(() => {
    if (!filterSearch) return availableFilterColumns
    const q = filterSearch.toLowerCase()
    return availableFilterColumns.filter(f => f.label.toLowerCase().includes(q))
  }, [availableFilterColumns, filterSearch])

  function addOptionalFilter(key) {
    setActiveOptional(prev => [...prev, key])
    setAddMenuOpen(false)
    setFilterSearch('')
  }

  function removeOptionalFilter(key) {
    setActiveOptional(prev => prev.filter(k => k !== key))
    onDynamicFilterChange?.(key, [])
  }

  function handleSaveView() {
    const name = newViewName.trim()
    if (!name) return
    onSaveView(name)
    setNewViewName('')
    setSavingAs(false)
    setViewMenuOpen(false)
  }

  return (
    <div className="flex flex-col gap-3 mb-4">
      {/* Row 1: search + view selector + refresh */}
      <div className="flex items-center gap-2">
        <input
          type="search"
          placeholder="Search PO or job name…"
          value={globalFilter}
          onChange={e => onGlobalFilter(e.target.value)}
          className="flex-1 border border-line-strong rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
        />

        {/* View selector */}
        <div ref={viewRef} className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setViewMenuOpen(o => !o); setSavingAs(false) }}
            className="flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            {activeViewName}
          </Button>
          {viewMenuOpen && (
            <div className="absolute right-0 z-50 mt-1 w-56 bg-surface border border-line rounded-md shadow-elevated">
              {viewNames.map(name => (
                <div key={name} className="flex items-center justify-between group">
                  <button
                    onClick={() => { onLoadView(name); setViewMenuOpen(false) }}
                    className={`flex-1 text-left px-3 py-2 text-sm hover:bg-surface-subtle ${
                      name === activeViewName ? 'font-medium text-orange' : ''
                    }`}
                  >
                    {name}
                  </button>
                  {name !== 'Standard' && (
                    <button
                      onClick={() => onDeleteView(name)}
                      className="px-2 py-2 text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <div className="border-t border-line">
                {savingAs ? (
                  <div className="flex items-center gap-1 p-2">
                    <input
                      ref={saveInputRef}
                      type="text"
                      value={newViewName}
                      onChange={e => setNewViewName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveView(); if (e.key === 'Escape') setSavingAs(false) }}
                      placeholder="View name…"
                      className="flex-1 px-2 py-1 text-sm border border-line rounded focus:outline-none focus:ring-1 focus:ring-orange"
                    />
                    <Button variant="primary" size="sm" onClick={handleSaveView}>
                      Save
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSavingAs(true)}
                    className="w-full text-left px-3 py-2 text-sm text-muted hover:bg-surface-subtle"
                  >
                    Save current as…
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* View mode toggle: List / Board / Cards */}
        {onViewModeChange && (
          <div className="flex rounded-md border border-line overflow-hidden">
            {VIEW_MODES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onViewModeChange(key)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  viewMode === key
                    ? 'bg-surface-muted text-charcoal font-semibold'
                    : 'text-muted hover:bg-surface-subtle'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </Button>
      </div>

      {/* Row 2: dropdown filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <MultiSelectDropdown
          label="Stage"
          options={ALL_STAGES}
          selected={stageFilter}
          onChange={onStageFilter}
        />
        <MultiSelectDropdown
          label="Segment"
          options={SEGMENTS}
          selected={segmentFilter}
          onChange={onSegmentFilter}
        />
        <MultiSelectDropdown
          label="PM"
          options={useMemo(() => [...new Set(allData.map(r => r.project_manager).filter(Boolean))].sort(), [allData])}
          selected={pmFilter}
          onChange={onPmFilter}
        />
        <MultiSelectDropdown
          label="Sales Rep"
          options={useMemo(() => [...new Set(allData.map(r => r.sales_rep).filter(Boolean))].sort(), [allData])}
          selected={salesRepFilter}
          onChange={onSalesRepFilter}
        />

        {/* Dynamic optional filters */}
        {activeOptional.map(key => (
          <MultiSelectDropdown
            key={key}
            label={COL_LABELS[key] || key}
            options={optionsCache[key] || []}
            selected={dynamicFilters[key] || []}
            onChange={vals => onDynamicFilterChange?.(key, vals)}
            onRemove={() => removeOptionalFilter(key)}
          />
        ))}

        {/* + Add Filter */}
        <div ref={addRef} className="relative">
          <button
            onClick={() => setAddMenuOpen(o => !o)}
            className="px-2.5 py-1 rounded text-xs font-medium border border-dashed border-line text-muted hover:border-line-strong hover:text-charcoal transition-colors"
          >
            + Add Filter
          </button>
          {addMenuOpen && (
            <div className="absolute z-50 mt-1 w-52 bg-surface border border-line rounded-md shadow-elevated max-h-72 flex flex-col">
              <div className="p-1.5 border-b border-line">
                <input
                  ref={filterSearchRef}
                  type="text"
                  value={filterSearch}
                  onChange={e => setFilterSearch(e.target.value)}
                  placeholder="Search columns…"
                  className="w-full px-2 py-1 text-xs border border-line rounded focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </div>
              <div className="overflow-y-auto">
                {filteredAvailable.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted">No columns found</p>
                ) : (
                  filteredAvailable.map(f => (
                    <button
                      key={f.key}
                      onClick={() => addOptionalFilter(f.key)}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-subtle"
                    >
                      {f.label}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
