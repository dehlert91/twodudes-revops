import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { ALL_STAGES } from './stageConfig'
import { allColumns } from './columns'
import { buildFilterOptions } from './columns/tagColumns'
import { identityColumns } from './columns/identityColumns.jsx'
import { revenueColumns } from './columns/revenueColumns.jsx'
import { progressColumns } from './columns/progressColumns.jsx'
import { costColumns } from './columns/costColumns.jsx'
import { profitColumns } from './columns/profitColumns.jsx'
import { billingColumns } from './columns/billingColumns.jsx'
import { allocationColumns } from './columns/allocationColumns.jsx'
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown'
import { DateRangePicker } from '../ui/DateRangePicker'
import { Button } from '../ui'

const COLUMN_GROUPS = [
  { label: 'Identity', columns: identityColumns },
  { label: 'Revenue', columns: revenueColumns },
  { label: 'Progress', columns: progressColumns },
  { label: 'Cost', columns: costColumns },
  { label: 'Profit', columns: profitColumns },
  { label: 'Billing', columns: billingColumns },
  { label: 'Allocation', columns: allocationColumns },
]

const ALWAYS_VISIBLE = new Set(['po_number'])

function DebouncedInput({ value: externalValue, onChange, delay = 250, ...props }) {
  const [localValue, setLocalValue] = useState(externalValue)
  const timerRef = useRef(null)

  // Sync from parent when external value changes (e.g. view switch resets filter)
  useEffect(() => {
    setLocalValue(externalValue)
  }, [externalValue])

  const handleChange = useCallback((e) => {
    const v = e.target.value
    setLocalValue(v)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onChange(v), delay)
  }, [onChange, delay])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return <input {...props} value={localValue} onChange={handleChange} />
}

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
  dateRange = { start: '', end: '' },
  onDateRangeChange,
  // Dynamic filters
  dynamicFilters = {},
  onDynamicFilterChange,
  // All data for building option lists
  allData = [],
  // Column visibility + order
  columnVisibility = {},
  onColumnVisibilityChange,
  columnOrder = [],
  onColumnOrderChange,
  // View props
  activeViewName, viewNames, hiddenViewNames = [], onLoadView, onSaveView, onDeleteView,
  onDuplicateView, onHideView, onShowView, onRenameView,
  viewIsDirty = false, onSaveCurrentView, onExportCsv,
  onRefresh, loading,
  // View mode
  viewMode = 'list', onViewModeChange,
}) {
  const [activeOptional, setActiveOptional] = useState([])
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [filterSearch, setFilterSearch] = useState('')
  const [savingAs, setSavingAs] = useState(false)
  const [newViewName, setNewViewName] = useState('')
  // Right-click context menu
  const [contextMenu, setContextMenu] = useState(null) // { x, y, viewName }
  // Inline rename
  const [renamingView, setRenamingView] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  // Add menu (for hidden views + new view)
  const [addPanelOpen, setAddPanelOpen] = useState(false)
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null) // view name to confirm
  // Columns panel
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [columnSearch, setColumnSearch] = useState('')
  const [colDragId, setColDragId] = useState(null)
  const [colDropId, setColDropId] = useState(null)

  const addRef = useRef(null)
  const filterSearchRef = useRef(null)
  const renameInputRef = useRef(null)
  const contextMenuRef = useRef(null)
  const addPanelRef = useRef(null)
  const columnsRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (addRef.current && !addRef.current.contains(e.target)) { setAddMenuOpen(false); setFilterSearch('') }
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) setContextMenu(null)
      if (addPanelRef.current && !addPanelRef.current.contains(e.target)) setAddPanelOpen(false)
      if (columnsRef.current && !columnsRef.current.contains(e.target)) { setColumnsOpen(false); setColumnSearch('') }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (renamingView && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingView])

  useEffect(() => {
    if (addMenuOpen && filterSearchRef.current) filterSearchRef.current.focus()
  }, [addMenuOpen])

  // Build unique sorted options for any column from allData (tag-aware)
  const optionsCache = useMemo(() => {
    const cache = {}
    for (const key of activeOptional) cache[key] = buildFilterOptions(allData, key)
    return cache
  }, [allData, activeOptional])

  // Columns available for "Add Filter" — exclude permanent ones and already-active ones
  const availableFilterColumns = useMemo(() => {
    const taken = new Set([...PERMANENT_KEYS, ...activeOptional])
    return allColumns
      .filter(c => !taken.has(c.id) && c.id !== 'po_number')
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

  function toggleColumn(id) {
    if (ALWAYS_VISIBLE.has(id)) return
    onColumnVisibilityChange?.(prev => ({ ...prev, [id]: !(prev[id] !== false) }))
  }

  function showAllColumns() {
    const all = {}
    allColumns.forEach(c => { all[c.id] = true })
    onColumnVisibilityChange?.(all)
  }

  function hideAllColumns() {
    const all = {}
    allColumns.forEach(c => { all[c.id] = ALWAYS_VISIBLE.has(c.id) })
    onColumnVisibilityChange?.(all)
  }

  const filteredColumnGroups = useMemo(() => {
    const posMap = Object.fromEntries(columnOrder.map((id, i) => [id, i]))
    const groups = COLUMN_GROUPS.map(g => ({
      ...g,
      columns: [...g.columns]
        .filter(c => !columnSearch || String(c.header).toLowerCase().includes(columnSearch.toLowerCase()))
        .sort((a, b) => (posMap[a.id] ?? 999) - (posMap[b.id] ?? 999)),
    })).filter(g => g.columns.length > 0)
    // reorder groups by their first column's position
    return groups.sort((a, b) => {
      const aPos = Math.min(...a.columns.map(c => posMap[c.id] ?? 999))
      const bPos = Math.min(...b.columns.map(c => posMap[c.id] ?? 999))
      return aPos - bPos
    })
  }, [columnSearch, columnOrder])

  function handleColDragStart(e, id) {
    setColDragId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleColDragOver(e, id) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setColDropId(id)
  }

  function handleColDrop(e, id) {
    e.preventDefault()
    if (!colDragId || colDragId === id) { setColDragId(null); setColDropId(null); return }
    const order = columnOrder.length > 0 ? [...columnOrder] : allColumns.map(c => c.id)
    const from = order.indexOf(colDragId)
    const to = order.indexOf(id)
    if (from === -1 || to === -1) { setColDragId(null); setColDropId(null); return }
    order.splice(from, 1)
    order.splice(to, 0, colDragId)
    onColumnOrderChange?.(order)
    setColDragId(null)
    setColDropId(null)
  }

  function handleColDragEnd() {
    setColDragId(null)
    setColDropId(null)
  }

  function handleSaveView() {
    const name = newViewName.trim()
    if (!name) return
    onSaveView(name)
    setNewViewName('')
    setSavingAs(false)
    setAddPanelOpen(false)
  }

  function handleContextMenu(e, viewName) {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, viewName })
  }

  function handleRenameCommit() {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== renamingView) {
      onRenameView(renamingView, trimmed)
    }
    setRenamingView(null)
    setRenameValue('')
  }

  return (
    <div className="flex flex-col gap-3 mb-4">
      {/* Row 1: View tabs (HubSpot-style) */}
      <div className="flex items-center border-b border-line -mb-1">
        {viewNames.map((name, i) => (
          <div key={name} className="flex items-center">
            {/* Separator between tabs */}
            {i > 0 && <div className="w-px h-4 bg-line" />}

            {renamingView === name ? (
              <div className="px-1 py-1.5">
                <input
                  ref={renameInputRef}
                  type="text"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRenameCommit()
                    if (e.key === 'Escape') { setRenamingView(null); setRenameValue('') }
                  }}
                  onBlur={handleRenameCommit}
                  className="w-28 px-2 py-0.5 text-sm border border-orange rounded focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </div>
            ) : (
              <button
                onClick={() => onLoadView(name)}
                onContextMenu={e => handleContextMenu(e, name)}
                className={`relative px-3.5 py-2 transition-colors whitespace-nowrap ${
                  name === activeViewName
                    ? 'text-orange text-[13px] font-semibold'
                    : 'text-muted text-[12px] font-normal hover:text-charcoal'
                }`}
              >
                {name}
                {name === activeViewName && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange rounded-t" />
                )}
              </button>
            )}
          </div>
        ))}

        {/* Save button — appears next to tabs when active view has unsaved changes */}
        {viewIsDirty && (
          <>
            <div className="w-px h-4 bg-line" />
            <button
              onClick={onSaveCurrentView}
              className="px-2.5 py-1.5 text-xs font-medium text-orange hover:text-white hover:bg-orange rounded transition-colors mx-1"
            >
              Save
            </button>
          </>
        )}

        {/* + Add / show hidden views */}
        <div className="w-px h-4 bg-line" />
        <div ref={addPanelRef} className="relative">
          <button
            onClick={() => setAddPanelOpen(o => !o)}
            className="px-2.5 py-2 text-sm text-muted hover:text-charcoal transition-colors"
          >
            +
          </button>
          {addPanelOpen && (
            <div className="absolute left-0 z-50 mt-1 w-56 bg-surface border border-line rounded-md shadow-elevated">
              {/* Hidden views to re-show */}
              {hiddenViewNames.length > 0 && (
                <>
                  <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted font-semibold">Hidden views</p>
                  {hiddenViewNames.map(name => (
                    <button
                      key={name}
                      onClick={() => { onShowView(name); setAddPanelOpen(false) }}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-subtle flex items-center gap-2"
                    >
                      <span className="text-muted text-xs">+</span>
                      {name}
                    </button>
                  ))}
                  <div className="border-t border-line my-1" />
                </>
              )}
              {/* Save current as new view */}
              {savingAs ? (
                <div className="flex items-center gap-1 p-2">
                  <input
                    type="text"
                    value={newViewName}
                    onChange={e => setNewViewName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveView()
                      if (e.key === 'Escape') setSavingAs(false)
                    }}
                    placeholder="View name…"
                    className="flex-1 px-2 py-1 text-sm border border-line rounded focus:outline-none focus:ring-1 focus:ring-orange"
                    autoFocus
                  />
                  <Button variant="primary" size="sm" onClick={handleSaveView}>Save</Button>
                </div>
              ) : (
                <button
                  onClick={() => setSavingAs(true)}
                  className="w-full text-left px-3 py-2 text-sm text-muted hover:bg-surface-subtle"
                >
                  Save current as new view…
                </button>
              )}
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* View mode toggle: List / Board / Cards */}
        {onViewModeChange && (
          <div className="flex rounded-md border border-line overflow-hidden mb-1">
            {VIEW_MODES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onViewModeChange(key)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
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

        {onExportCsv && (
          <Button variant="ghost" size="sm" onClick={onExportCsv} className="mb-1">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </span>
          </Button>
        )}

        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading} className="mb-1">
          {loading ? 'Loading…' : '↻ Refresh'}
        </Button>
      </div>

      {/* Right-click context menu (portal-style fixed position) */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-[100] bg-surface border border-line rounded-md shadow-elevated py-1 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.viewName !== 'Standard' && (
            <>
              {contextMenu.viewName === activeViewName && viewIsDirty && (
                <button
                  onClick={() => {
                    onSaveCurrentView()
                    setContextMenu(null)
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-subtle font-medium"
                >
                  Save view
                </button>
              )}
              <button
                onClick={() => {
                  onDuplicateView(contextMenu.viewName)
                  setContextMenu(null)
                }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-subtle"
              >
                Duplicate
              </button>
              <button
                onClick={() => {
                  setRenamingView(contextMenu.viewName)
                  setRenameValue(contextMenu.viewName)
                  setContextMenu(null)
                }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-subtle"
              >
                Rename
              </button>
              <button
                onClick={() => {
                  onHideView(contextMenu.viewName)
                  setContextMenu(null)
                }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-subtle"
              >
                Hide tab
              </button>
              <div className="border-t border-line my-1" />
              <button
                onClick={() => {
                  setDeleteConfirm(contextMenu.viewName)
                  setContextMenu(null)
                }}
                className="w-full text-left px-3 py-1.5 text-sm text-error hover:bg-surface-subtle"
              >
                Delete view
              </button>
            </>
          )}
          {contextMenu.viewName === 'Standard' && (
            <button
              onClick={() => {
                onDuplicateView(contextMenu.viewName)
                setContextMenu(null)
              }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-subtle"
            >
              Duplicate
            </button>
          )}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30">
          <div className="bg-surface border border-line rounded-lg shadow-elevated p-5 w-80">
            <p className="text-sm font-semibold text-charcoal mb-2">Delete "{deleteConfirm}"?</p>
            <p className="text-sm text-muted mb-4">This will permanently delete the view and all its saved filters and settings. This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <button
                onClick={() => { onDeleteView(deleteConfirm); setDeleteConfirm(null) }}
                className="px-3 py-1.5 text-sm font-medium text-white bg-error rounded-md hover:bg-error/90 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Row 2: search */}
      <div className="flex items-center gap-2">
        <DebouncedInput
          type="search"
          placeholder="Search PO or job name…"
          value={globalFilter}
          onChange={onGlobalFilter}
          className="flex-1 border border-line-strong rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
        />
      </div>

      {/* Row 3: dropdown filters */}
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

        <DateRangePicker value={dateRange} onChange={onDateRangeChange} />

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

        {/* Columns toggle */}
        {onColumnVisibilityChange && (
          <div ref={columnsRef} className="relative">
            <button
              onClick={() => setColumnsOpen(o => !o)}
              className="px-2.5 py-1 rounded text-xs font-medium border border-line text-muted hover:border-line-strong hover:text-charcoal transition-colors"
            >
              Columns
            </button>
            {columnsOpen && (
              <div className="absolute z-50 mt-1 w-64 bg-surface border border-line rounded-md shadow-elevated flex flex-col max-h-96">
                <div className="p-1.5 border-b border-line flex gap-1">
                  <input
                    type="text"
                    value={columnSearch}
                    onChange={e => setColumnSearch(e.target.value)}
                    placeholder="Search columns…"
                    className="flex-1 px-2 py-1 text-xs border border-line rounded focus:outline-none focus:ring-1 focus:ring-orange"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 px-3 py-1.5 border-b border-line">
                  <button onClick={showAllColumns} className="text-xs text-orange hover:underline">Show all</button>
                  <span className="text-line">|</span>
                  <button onClick={hideAllColumns} className="text-xs text-orange hover:underline">Hide all</button>
                </div>
                <div className="overflow-y-auto">
                  {filteredColumnGroups.map(group => (
                    <div key={group.label}>
                      <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted font-semibold">{group.label}</p>
                      {group.columns.map(col => {
                        const visible = columnVisibility[col.id] !== false
                        const locked = ALWAYS_VISIBLE.has(col.id)
                        const isDragging = colDragId === col.id
                        const isDropTarget = colDropId === col.id
                        return (
                          <label
                            key={col.id}
                            draggable={!locked}
                            onDragStart={e => handleColDragStart(e, col.id)}
                            onDragOver={e => handleColDragOver(e, col.id)}
                            onDrop={e => handleColDrop(e, col.id)}
                            onDragEnd={handleColDragEnd}
                            className={`flex items-center gap-2 px-3 py-1.5 text-xs select-none
                              ${locked ? 'opacity-50 cursor-not-allowed' : 'cursor-grab'}
                              ${isDragging ? 'opacity-40' : ''}
                              ${isDropTarget ? 'border-t-2 border-orange bg-surface-subtle' : 'hover:bg-surface-subtle'}
                            `}
                          >
                            <svg className={`w-3 h-3 flex-shrink-0 ${locked ? 'text-transparent' : 'text-muted'}`} viewBox="0 0 10 16" fill="currentColor">
                              <circle cx="2.5" cy="2.5" r="1.5"/><circle cx="7.5" cy="2.5" r="1.5"/>
                              <circle cx="2.5" cy="8" r="1.5"/><circle cx="7.5" cy="8" r="1.5"/>
                              <circle cx="2.5" cy="13.5" r="1.5"/><circle cx="7.5" cy="13.5" r="1.5"/>
                            </svg>
                            <input
                              type="checkbox"
                              checked={visible}
                              disabled={locked}
                              onChange={() => toggleColumn(col.id)}
                              className="accent-orange"
                            />
                            {col.header}
                          </label>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
