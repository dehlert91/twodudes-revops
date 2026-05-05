import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { KpiCard, Button } from '../../components/ui'
import { MultiSelectDropdown } from '../../components/ui/MultiSelectDropdown'
import { WipReportTable, WIP_COLUMNS } from '../../components/finance/WipReportTable'
import { ColumnsDropdown } from '../../components/finance/ColumnsDropdown'
import { useWipViews } from '../../hooks/useWipViews'
import { ProjectDetailPanel } from '../../components/projects/ProjectDetailPanel'
import { getWipProjects, getFinanceFilterOptions, getProjectByPo } from '../../lib/finance/queries'
import { addCloseQueueItem } from '../../lib/finance/closeQueue'
import { useAuth } from '../../contexts/AuthContext'
import { getProjectPeriodActuals, mergePerioActuals } from '../../lib/finance/period'
import { DateRangePicker } from '../../components/ui/DateRangePicker'
import { updateProject } from '../../lib/supabase'
import { allColumns } from '../../components/projects/columns'
import { buildFilterOptions, rowMatchesFilter } from '../../components/projects/columns/tagColumns'

// Merge WIP-specific columns with all project columns (extras hidden by default)
const WIP_COL_IDS = new Set(WIP_COLUMNS.map(c => c.id))
const EXTRA_PROJECT_COLS = allColumns.filter(c => !WIP_COL_IDS.has(c.id))
const ALL_WIP_COLUMNS = [...WIP_COLUMNS, ...EXTRA_PROJECT_COLS]

const DEFAULT_COLUMN_ORDER = ALL_WIP_COLUMNS.map(c => c.id)

const DEFAULT_VISIBILITY = {
  segment: false,
  billings_in_excess_of_costs: false,
  wip_to_date: false,
  ...Object.fromEntries(EXTRA_PROJECT_COLS.map(c => [c.id, false])),
}
const DEFAULT_SORTING = [{ id: 'unbilled_revenue', desc: true }]
const ALWAYS_VISIBLE = ['po_number']

const PERMANENT_FILTER_KEYS = new Set(['division', 'segment', 'project_manager'])
const FILTER_EXCLUDE = new Set(['po_number', 'job_name', 'division', 'segment', 'project_manager'])

const ALL_FILTER_OPTIONS = allColumns
  .filter(c => !FILTER_EXCLUDE.has(c.id))
  .map(c => ({ key: c.id, label: typeof c.header === 'string' ? c.header : c.id }))

function fmtCurrency(n) {
  if (n == null || isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export function WipPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [opts, setOpts] = useState({ divisions: [], segments: [] })
  const [actionMsg, setActionMsg] = useState(null)
  // Close-queue draft modal state. `progressBillRow` is the project row being drafted;
  // `progressBillKind` is one of 'invoice' | 'progress' | 'wip'.
  const [progressBillRow, setProgressBillRow]       = useState(null)
  const [progressBillKind, setProgressBillKind]     = useState('progress')
  const [progressBillAmount, setProgressBillAmount] = useState('')
  const [progressBillNote, setProgressBillNote]     = useState('')
  const { user } = useAuth()
  const periodMapRef = useRef(null)

  // ── Views ──────────────────────────────────────────────────────────────────
  const {
    activeViewName, listViews, listHiddenViews,
    saveView, loadView, deleteView, hideView, showView, duplicateView, renameView,
    makeDefaultView,
  } = useWipViews({ defaultVisibility: DEFAULT_VISIBILITY, defaultSorting: DEFAULT_SORTING })

  // ── Table state ────────────────────────────────────────────────────────────
  const [columnVisibility, setColumnVisibility] = useState(DEFAULT_VISIBILITY)
  const [columnOrder, setColumnOrder]           = useState(DEFAULT_COLUMN_ORDER)
  const [columnSizing, setColumnSizing]         = useState({})
  const [sorting, setSorting]                   = useState(DEFAULT_SORTING)

  // ── Filter state ───────────────────────────────────────────────────────────
  const [divisions, setDivisions]           = useState([])
  const [segments, setSegments]             = useState([])
  const [pms, setPms]                       = useState([])
  const [dateRange, setDateRange]           = useState({ start: '', end: '' })
  const [dynamicFilters, setDynamicFilters] = useState({})
  const [searchInput, setSearchInput]       = useState('')
  const [search, setSearch]                 = useState('')
  const [activeOptional, setActiveOptional] = useState([])

  // ── View tabs UI state ─────────────────────────────────────────────────────
  const [addPanelOpen, setAddPanelOpen]   = useState(false)
  const [savingAs, setSavingAs]           = useState(false)
  const [newViewName, setNewViewName]     = useState('')
  const [contextMenu, setContextMenu]     = useState(null)
  const [renamingView, setRenamingView]   = useState(null)
  const [renameValue, setRenameValue]     = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // ── Add filter UI state ────────────────────────────────────────────────────
  const [addOpen, setAddOpen]     = useState(false)
  const [addSearch, setAddSearch] = useState('')

  // ── Refs ───────────────────────────────────────────────────────────────────
  const addRef         = useRef(null)
  const addInputRef    = useRef(null)
  const addPanelRef    = useRef(null)
  const contextMenuRef = useRef(null)
  const renameInputRef = useRef(null)

  // ── Slide-over ─────────────────────────────────────────────────────────────
  const [selectedProject, setSelectedProject] = useState(null)
  const [detailLoading, setDetailLoading]     = useState(false)

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 200)
    return () => clearTimeout(t)
  }, [searchInput])

  // Click-outside handlers
  useEffect(() => {
    function close(e) {
      if (addRef.current        && !addRef.current.contains(e.target))        { setAddOpen(false); setAddSearch('') }
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) setContextMenu(null)
      if (addPanelRef.current   && !addPanelRef.current.contains(e.target))   setAddPanelOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => { if (addOpen && addInputRef.current) addInputRef.current.focus() }, [addOpen])
  useEffect(() => {
    if (renamingView && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingView])

  // ── Dirty detection ────────────────────────────────────────────────────────
  const savedSnapshot = useRef(null)

  function captureSnapshot() {
    return JSON.stringify({
      columnVisibility, columnOrder, columnSizing, sorting,
      filters: { divisions, segments, pms, dateRange, dynamicFilters, search: searchInput, activeOptional },
    })
  }

  if (savedSnapshot.current === null) savedSnapshot.current = captureSnapshot()

  const viewIsDirty = useMemo(() => {
    if (activeViewName === 'Default') return false
    return JSON.stringify({
      columnVisibility, columnOrder, columnSizing, sorting,
      filters: { divisions, segments, pms, dateRange, dynamicFilters, search: searchInput, activeOptional },
    }) !== savedSnapshot.current
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeViewName, columnVisibility, columnOrder, columnSizing, sorting, divisions, segments, pms, dateRange, dynamicFilters, searchInput, activeOptional])

  // ── View operations ────────────────────────────────────────────────────────
  function applyViewState(view) {
    setColumnVisibility(view.columnVisibility ?? DEFAULT_VISIBILITY)
    setColumnOrder(view.columnOrder ?? DEFAULT_COLUMN_ORDER)
    setColumnSizing(view.columnSizing ?? {})
    setSorting(view.sorting ?? DEFAULT_SORTING)
    const f = view.filters ?? {}
    setDivisions(f.divisions ?? [])
    setSegments(f.segments ?? [])
    setPms(f.pms ?? [])
    setDateRange(f.dateRange ?? { start: '', end: '' })
    setDynamicFilters(f.dynamicFilters ?? {})
    setSearchInput(f.search ?? '')
    setActiveOptional(f.activeOptional ?? [])
    setTimeout(() => {
      savedSnapshot.current = JSON.stringify({
        columnVisibility: view.columnVisibility ?? DEFAULT_VISIBILITY,
        columnOrder: view.columnOrder ?? DEFAULT_COLUMN_ORDER,
        columnSizing: view.columnSizing ?? {},
        sorting: view.sorting ?? DEFAULT_SORTING,
        filters: {
          divisions: f.divisions ?? [], segments: f.segments ?? [], pms: f.pms ?? [],
          dateRange: f.dateRange ?? { start: '', end: '' },
          dynamicFilters: f.dynamicFilters ?? {}, search: f.search ?? '', activeOptional: f.activeOptional ?? [],
        },
      })
    }, 0)
  }

  function handleLoadView(name) {
    const view = loadView(name)
    applyViewState(view)
  }

  function handleSaveView(name) {
    saveView(name, {
      columnVisibility, columnOrder, columnSizing, sorting,
      filters: { divisions, segments, pms, dateRange, dynamicFilters, search: searchInput, activeOptional },
    })
    savedSnapshot.current = captureSnapshot()
  }

  function handleSaveCurrentView() {
    if (activeViewName === 'Default') return
    handleSaveView(activeViewName)
  }

  function handleDuplicateView(name) {
    const newName = duplicateView(name)
    if (newName) {
      const view = loadView(newName)
      applyViewState(view)
    }
  }

  function handleViewSaveFromPanel() {
    const name = newViewName.trim()
    if (!name) return
    handleSaveView(name)
    setNewViewName('')
    setSavingAs(false)
    setAddPanelOpen(false)
  }

  function handleRenameCommit() {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== renamingView) renameView(renamingView, trimmed)
    setRenamingView(null)
    setRenameValue('')
  }

  // ── Data helpers ───────────────────────────────────────────────────────────
  const pmOptions = useMemo(
    () => [...new Set(rows.map(r => r.project_manager).filter(Boolean))].sort(),
    [rows],
  )

  const dynamicOptions = useMemo(() => {
    const out = {}
    for (const key of activeOptional) out[key] = buildFilterOptions(rows, key)
    return out
  }, [rows, activeOptional])

  const availableAddOptions = useMemo(() => {
    const taken = new Set([...activeOptional, ...PERMANENT_FILTER_KEYS])
    let list = ALL_FILTER_OPTIONS.filter(o => !taken.has(o.key))
    if (addSearch) { const q = addSearch.toLowerCase(); list = list.filter(o => o.label.toLowerCase().includes(q)) }
    return list
  }, [activeOptional, addSearch])

  function handleAddFilter(key) { setActiveOptional(prev => [...prev, key]); setAddOpen(false); setAddSearch('') }
  function handleRemoveFilter(key) {
    setActiveOptional(prev => prev.filter(k => k !== key))
    setDynamicFilters(prev => { const { [key]: _, ...rest } = prev; return rest })
  }

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      if (q && !((r.po_number ?? '').toLowerCase().includes(q) || (r.job_name ?? '').toLowerCase().includes(q))) return false
      if (pms.length > 0 && !pms.includes(r.project_manager)) return false
      for (const [key, vals] of Object.entries(dynamicFilters)) {
        if (!rowMatchesFilter(r, key, vals)) return false
      }
      return true
    })
  }, [rows, search, pms, dynamicFilters])

  // ── Data fetching ──────────────────────────────────────────────────────────
  useEffect(() => {
    getFinanceFilterOptions().then(setOpts).catch(e => console.error('[wip opts]', e))
  }, [])

  const refetch = useCallback(() => {
    setLoading(true)
    setError(null)
    const periodActive = !!(dateRange.start && dateRange.end)
    return getWipProjects({ divisions, segments })
      .then(async baseRows => {
        if (periodActive) {
          const periodMap = await getProjectPeriodActuals(dateRange.start, dateRange.end)
          periodMapRef.current = periodMap
          return mergePerioActuals(baseRows, periodMap, { usePeriodCosts: true })
        }
        periodMapRef.current = null
        return baseRows
      })
      .then(data => setRows(data))
      .catch(e => setError(e.message || String(e)))
      .finally(() => setLoading(false))
  }, [divisions, segments, dateRange])

  useEffect(() => { refetch() }, [refetch])

  // ── CSV export ─────────────────────────────────────────────────────────────
  const handleExportCsv = useCallback(() => {
    const visibleColIds = ALL_WIP_COLUMNS
      .map(c => c.id)
      .filter(id => columnVisibility[id] !== false && id !== 'actions')
    const headerLabels = visibleColIds.map(id => {
      const def = ALL_WIP_COLUMNS.find(c => c.id === id)
      return typeof def?.header === 'string' ? def.header : id
    })
    const esc = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
    const lines = [headerLabels.map(esc).join(',')]
    for (const r of filteredRows) {
      const cells = visibleColIds.map(id => id === 'po_number' ? `${r.po_number} — ${r.job_name ?? ''}`.trim() : r[id])
      lines.push(cells.map(esc).join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeViewName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [filteredRows, columnVisibility, activeViewName])

  // ── KPI totals ─────────────────────────────────────────────────────────────
  const totals = useMemo(() => filteredRows.reduce((acc, r) => ({
    count:    acc.count    + 1,
    unbilled: acc.unbilled + Number(r.unbilled_revenue ?? 0),
    cieb:     acc.cieb     + Number(r.costs_in_excess_of_billings ?? 0),
    biec:     acc.biec     + Number(r.billings_in_excess_of_costs ?? 0),
  }), { count: 0, unbilled: 0, cieb: 0, biec: 0 }), [filteredRows])

  // ── Detail panel ───────────────────────────────────────────────────────────
  const handleRowClick = useCallback(async (row) => {
    setSelectedProject(row)
    setDetailLoading(true)
    try {
      const full = await getProjectByPo(row.po_number)
      if (full) {
        // If a date range is active, overlay period-adjusted values so the panel
        // reflects the same data as the table row rather than today's snapshot.
        if (periodMapRef.current) {
          const [merged] = mergePerioActuals([full], periodMapRef.current, { usePeriodCosts: true })
          setSelectedProject(merged)
        } else {
          setSelectedProject(full)
        }
      }
    } catch (e) {
      console.error('[wip detail fetch]', e?.message)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const handleCellEdit = useCallback(async (po_number, field, value) => {
    // Optimistic patch on the field that was edited
    setSelectedProject(prev => prev?.po_number === po_number ? { ...prev, [field]: value } : prev)
    const result = await updateProject(po_number, field, value)
    if (result?.error) {
      try { const full = await getProjectByPo(po_number); if (full) setSelectedProject(full) } catch {}
      setActionMsg(`Save failed: ${result.error.message}`)
      setTimeout(() => setActionMsg(null), 3000)
      return
    }
    // Refetch the row so view-computed columns (est_*_remaining, total_projected_*,
    // est_gross_profit, computed_tracking_mode, etc.) refresh in the open panel.
    try {
      const full = await getProjectByPo(po_number)
      if (full) setSelectedProject(prev => prev?.po_number === po_number ? full : prev)
    } catch {}
  }, [])

  function handleAction(kind, row) {
    if (kind === 'progress_bill') {
      setProgressBillRow(row)
      setProgressBillKind('progress')
      setProgressBillAmount(row.unbilled_revenue ? String(Math.round(row.unbilled_revenue)) : '')
      setProgressBillNote('')
    } else if (kind === 'final_invoice') {
      setProgressBillRow(row)
      setProgressBillKind('invoice')
      setProgressBillAmount(row.unbilled_revenue ? String(Math.round(row.unbilled_revenue)) : '')
      setProgressBillNote('')
    } else if (kind === 'add_wip') {
      setProgressBillRow(row)
      setProgressBillKind('wip')
      // Default WIP amount to costs-in-excess-of-billings (the under-billed portion)
      setProgressBillAmount(row.costs_in_excess_of_billings ? String(Math.round(row.costs_in_excess_of_billings)) : '')
      setProgressBillNote('')
    }
  }

  // Default close period = first day of previous month (typical close cadence)
  function defaultPeriodMonth() {
    const d = new Date()
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString().slice(0, 10)
  }

  async function handleProgressBillSubmit() {
    const amount = parseFloat(progressBillAmount.replace(/[^0-9.-]/g, ''))
    if (!isNaN(amount) && amount > 0) {
      try {
        await addCloseQueueItem({
          po_number:    progressBillRow.po_number,
          job_name:     progressBillRow.job_name,
          customer:     progressBillRow.customer,
          kind:         progressBillKind,
          amount,
          notes:        progressBillNote.trim(),
          period_month: defaultPeriodMonth(),
          drafted_by:   user?.id ?? null,
        })
        const label = progressBillKind === 'invoice' ? 'Final invoice' : progressBillKind === 'wip' ? 'WIP entry' : 'Progress bill'
        setActionMsg(`${label} of ${fmtCurrency(amount)} added to close queue for PO ${progressBillRow.po_number}.`)
      } catch (e) {
        setActionMsg(`Failed to add to queue: ${e?.message || String(e)}`)
      }
      setTimeout(() => setActionMsg(null), 4000)
    }
    setProgressBillRow(null)
    setProgressBillKind('progress')
    setProgressBillAmount('')
    setProgressBillNote('')
  }

  const viewNames       = listViews()
  const hiddenViewNames = listHiddenViews()

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold text-charcoal">Unbilled</h1>
        {loading && <span className="text-sm text-muted">Loading…</span>}
      </div>

      {/* ── KPI bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <KpiCard label="Open Projects"    value={totals.count.toLocaleString()} sub="with unbilled or CIEB" />
        <KpiCard label="Total Unbilled"   value={fmtCurrency(totals.unbilled)}  sub="revenue earned − billed" subTone="warning" />
        <KpiCard label="Costs > Billings" value={fmtCurrency(totals.cieb)}      sub="under-billing exposure" />
        <KpiCard label="Billings > Costs" value={fmtCurrency(totals.biec)}      sub="advance billings"        subTone="muted" />
      </div>

      {/* ── View tabs ── */}
      <div className="flex items-center border-b border-line mb-4">
        {viewNames.map((name, i) => (
          <div key={name} className="flex items-center">
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
                onClick={() => handleLoadView(name)}
                onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, viewName: name }) }}
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

        {viewIsDirty && (
          <>
            <div className="w-px h-4 bg-line" />
            <button
              onClick={handleSaveCurrentView}
              className="px-2.5 py-1.5 text-xs font-medium text-orange hover:text-white hover:bg-orange rounded transition-colors mx-1"
            >
              Save
            </button>
          </>
        )}

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
              {hiddenViewNames.length > 0 && (
                <>
                  <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted font-semibold">Hidden views</p>
                  {hiddenViewNames.map(name => (
                    <button
                      key={name}
                      onClick={() => { showView(name); setAddPanelOpen(false) }}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-subtle flex items-center gap-2"
                    >
                      <span className="text-muted text-xs">+</span>{name}
                    </button>
                  ))}
                  <div className="border-t border-line my-1" />
                </>
              )}
              {savingAs ? (
                <div className="flex items-center gap-1 p-2">
                  <input
                    type="text"
                    value={newViewName}
                    onChange={e => setNewViewName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleViewSaveFromPanel()
                      if (e.key === 'Escape') setSavingAs(false)
                    }}
                    placeholder="View name…"
                    className="flex-1 px-2 py-1 text-sm border border-line rounded focus:outline-none focus:ring-1 focus:ring-orange"
                    autoFocus
                  />
                  <Button variant="primary" size="sm" onClick={handleViewSaveFromPanel}>Save</Button>
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

        <div className="flex-1" />

        <ColumnsDropdown
          columns={ALL_WIP_COLUMNS}
          visibility={columnVisibility}
          onChange={setColumnVisibility}
          alwaysVisible={ALWAYS_VISIBLE}
        />
        <Button variant="ghost" size="sm" onClick={handleExportCsv} className="mb-1">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </span>
        </Button>
        <Button variant="ghost" size="sm" onClick={refetch} disabled={loading} className="mb-1">
          {loading ? 'Loading…' : '↻ Refresh'}
        </Button>
      </div>

      {/* ── Context menu (right-click on tab) ── */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-[100] bg-surface border border-line rounded-md shadow-elevated py-1 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.viewName !== 'Default' ? (
            <>
              {contextMenu.viewName === activeViewName && viewIsDirty && (
                <button
                  onClick={() => { handleSaveCurrentView(); setContextMenu(null) }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-subtle font-medium"
                >
                  Save view
                </button>
              )}
              <button onClick={() => { handleDuplicateView(contextMenu.viewName); setContextMenu(null) }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-subtle">Duplicate</button>
              <button
                onClick={() => { setRenamingView(contextMenu.viewName); setRenameValue(contextMenu.viewName); setContextMenu(null) }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-subtle"
              >
                Rename
              </button>
              <button onClick={() => { hideView(contextMenu.viewName); setContextMenu(null) }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-subtle">Hide tab</button>
              <div className="border-t border-line my-1" />
              <button onClick={() => { setDeleteConfirm(contextMenu.viewName); setContextMenu(null) }} className="w-full text-left px-3 py-1.5 text-sm text-error hover:bg-surface-subtle">Delete view</button>
            </>
          ) : (
            <button onClick={() => { handleDuplicateView(contextMenu.viewName); setContextMenu(null) }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-subtle">Duplicate</button>
          )}
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30">
          <div className="bg-surface border border-line rounded-lg shadow-elevated p-5 w-80">
            <p className="text-sm font-semibold text-charcoal mb-2">Delete "{deleteConfirm}"?</p>
            <p className="text-sm text-muted mb-4">This will permanently delete the view and all its saved filters and column settings.</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <button
                onClick={() => { deleteView(deleteConfirm); setDeleteConfirm(null) }}
                className="px-3 py-1.5 text-sm font-medium text-white bg-error rounded-md hover:bg-error/90 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Search ── */}
      <div className="mb-3">
        <input
          type="search"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Search PO or job name…"
          className="w-full border border-line-strong rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
        />
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <MultiSelectDropdown label="Division" options={opts.divisions} selected={divisions} onChange={setDivisions} />
        <MultiSelectDropdown label="Segment"  options={opts.segments}  selected={segments}  onChange={setSegments} />
        <MultiSelectDropdown label="PM"       options={pmOptions}      selected={pms}       onChange={setPms} />

        {activeOptional.map(key => {
          const label = ALL_FILTER_OPTIONS.find(o => o.key === key)?.label || key
          return (
            <MultiSelectDropdown
              key={key}
              label={label}
              options={dynamicOptions[key] || []}
              selected={dynamicFilters[key] || []}
              onChange={vals => setDynamicFilters(prev => ({ ...prev, [key]: vals }))}
              onRemove={() => handleRemoveFilter(key)}
            />
          )
        })}

        <div ref={addRef} className="relative">
          <button
            onClick={() => setAddOpen(o => !o)}
            className="px-2.5 py-1 rounded text-xs font-medium border border-dashed border-line text-muted hover:border-line-strong hover:text-charcoal transition-colors"
          >
            + Add Filter
          </button>
          {addOpen && (
            <div className="absolute z-50 mt-1 w-52 bg-surface border border-line rounded-md shadow-elevated max-h-72 flex flex-col">
              <div className="p-1.5 border-b border-line">
                <input
                  ref={addInputRef}
                  type="text"
                  value={addSearch}
                  onChange={e => setAddSearch(e.target.value)}
                  placeholder="Search filters…"
                  className="w-full px-2 py-1 text-xs border border-line rounded focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </div>
              <div className="overflow-y-auto">
                {availableAddOptions.length === 0
                  ? <p className="px-3 py-2 text-xs text-muted">No filters left to add.</p>
                  : availableAddOptions.map(o => (
                    <button key={o.key} onClick={() => handleAddFilter(o.key)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-subtle">
                      {o.label}
                    </button>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      {error
        ? <p className="text-sm text-error py-12 text-center">Failed to load: {error}</p>
        : <WipReportTable
            rows={filteredRows}
            loading={loading}
            onAction={handleAction}
            onRowClick={handleRowClick}
            columns={ALL_WIP_COLUMNS}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            columnOrder={columnOrder}
            onColumnOrderChange={setColumnOrder}
            columnSizing={columnSizing}
            onColumnSizingChange={setColumnSizing}
            sorting={sorting}
            onSortingChange={setSorting}
          />
      }

      {selectedProject && (
        <ProjectDetailPanel
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onCellEdit={handleCellEdit}
          asOfDate={dateRange.start && dateRange.end ? dateRange.end : undefined}
          asOfStart={dateRange.start && dateRange.end ? dateRange.start : undefined}
        />
      )}

      {/* ── Progress Billing modal ── */}
      {progressBillRow && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30">
          <div className="bg-surface border border-line rounded-lg shadow-elevated p-6 w-[420px] max-w-[95vw]">
            <h2 className="font-display text-lg font-bold text-charcoal mb-0.5">
              {progressBillKind === 'invoice'  ? 'Final Invoice'  :
               progressBillKind === 'wip'      ? 'Add to WIP Schedule' :
               'Progress Billing'}
            </h2>
            <p className="text-xs text-muted mb-4 font-mono">{progressBillRow.po_number} — {progressBillRow.job_name}</p>

            <div className="grid grid-cols-2 gap-3 mb-5 text-xs">
              <div className="bg-surface-subtle rounded p-3">
                <div className="text-muted uppercase tracking-wide font-semibold mb-0.5">Revenue</div>
                <div className="font-mono font-semibold text-charcoal">{fmtCurrency(progressBillRow.total_revenue)}</div>
              </div>
              <div className="bg-surface-subtle rounded p-3">
                <div className="text-muted uppercase tracking-wide font-semibold mb-0.5">Unbilled</div>
                <div className="font-mono font-semibold text-[#B8561E]">{fmtCurrency(progressBillRow.unbilled_revenue)}</div>
              </div>
              <div className="bg-surface-subtle rounded p-3">
                <div className="text-muted uppercase tracking-wide font-semibold mb-0.5">Billed to Date</div>
                <div className="font-mono text-charcoal">{fmtCurrency(progressBillRow.amount_billed_to_date)}</div>
              </div>
              <div className="bg-surface-subtle rounded p-3">
                <div className="text-muted uppercase tracking-wide font-semibold mb-0.5">% Complete</div>
                <div className="font-mono text-charcoal">{progressBillRow.pct_complete != null ? `${(Number(progressBillRow.pct_complete) * 100).toFixed(0)}%` : '—'}</div>
              </div>
            </div>

            <label className="block text-xs font-semibold text-charcoal mb-1">Amount to Bill</label>
            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
              <input
                type="number"
                min="0"
                step="1"
                value={progressBillAmount}
                onChange={e => setProgressBillAmount(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleProgressBillSubmit(); if (e.key === 'Escape') setProgressBillRow(null) }}
                className="w-full pl-7 pr-3 py-2 border border-line-strong rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
                autoFocus
              />
            </div>

            <label className="block text-xs font-semibold text-charcoal mb-1">Notes <span className="font-normal text-muted">(optional)</span></label>
            <textarea
              value={progressBillNote}
              onChange={e => setProgressBillNote(e.target.value)}
              rows={2}
              placeholder="Memo for invoice…"
              className="w-full border border-line rounded-md px-3 py-2 text-sm mb-5 resize-none focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
            />

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setProgressBillRow(null)}>Cancel</Button>
              <button
                onClick={handleProgressBillSubmit}
                disabled={!progressBillAmount || parseFloat(progressBillAmount) <= 0}
                className="px-4 py-1.5 text-sm font-medium text-white bg-orange rounded-md hover:bg-orange/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Draft Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {actionMsg && (
        <div className="fixed bottom-4 right-4 bg-charcoal text-white px-4 py-2 rounded-lg shadow-elevated text-sm z-50">
          {actionMsg}
        </div>
      )}
    </div>
  )
}
