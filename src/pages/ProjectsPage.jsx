import { useState, useMemo, useCallback, useRef } from 'react'
import { Button } from '../components/ui'
import { useProjectDetails } from '../hooks/useProjectDetails'
import { useTableViews } from '../hooks/useTableViews'
import { allColumns } from '../components/projects/columns'
import { ProjectsKPIBar } from '../components/projects/ProjectsKPIBar'
import { ProjectsToolbar } from '../components/projects/ProjectsToolbar'
import { ProjectsTable } from '../components/projects/ProjectsTable'
import { ProjectsKanban } from '../components/projects/ProjectsKanban'
import { ProjectsHealthCards } from '../components/projects/ProjectsHealthCards'
import { ProjectDetailPanel } from '../components/projects/ProjectDetailPanel'
import { updateProject } from '../lib/supabase'
import { rowMatchesFilter } from '../components/projects/columns/tagColumns'

export function ProjectsPage() {
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const { data, loading, error, refetch, setData, page, goToPage, totalCount, pageSize, kpiRows } = useProjectDetails('active', dateRange?.start && dateRange?.end ? dateRange : null)
  const { activeViewName, listViews, listHiddenViews, loadView, saveView, patchView, duplicateView, deleteView, hideView, showView, renameView, standardView } = useTableViews()

  // Filter state
  const [globalFilter, setGlobalFilter] = useState('')
  const [stageFilter, setStageFilter] = useState([])
  const [segmentFilter, setSegmentFilter] = useState([])
  const [pmFilter, setPmFilter] = useState([])
  const [salesRepFilter, setSalesRepFilter] = useState([])
  const [dynamicFilters, setDynamicFilters] = useState({})

  const handleDynamicFilterChange = useCallback((key, vals) => {
    setDynamicFilters(prev => ({ ...prev, [key]: vals }))
    goToPage(0)
  }, [goToPage])

  // Column state
  const [columnOrder, setColumnOrder] = useState(standardView.columnOrder)
  const [columnVisibility, setColumnVisibility] = useState(standardView.columnVisibility)
  const [columnSizing, setColumnSizing] = useState(standardView.columnSizing)
  const [sorting, setSorting] = useState([])

  const [selectedPO, setSelectedPO] = useState(null)
  const selectedProject = useMemo(() => {
    if (!selectedPO) return null
    return data.find(r => r.po_number === selectedPO) ?? null
  }, [selectedPO, data])
  const [viewMode, setViewMode] = useState('list')
  const [editError, setEditError] = useState(null)

  // Snapshot of the last loaded/saved view state for dirty detection
  const savedSnapshot = useRef(null)

  function captureSnapshot() {
    return JSON.stringify({
      columnOrder, columnVisibility, columnSizing, sorting,
      filters: { stageFilter, segmentFilter, pmFilter, salesRepFilter, dynamicFilters, globalFilter, dateRange },
    })
  }

  // Initialize snapshot on first render
  if (savedSnapshot.current === null) {
    savedSnapshot.current = captureSnapshot()
  }

  const viewIsDirty = useMemo(() => {
    if (activeViewName === 'Standard') return false
    const current = JSON.stringify({
      columnOrder, columnVisibility, columnSizing, sorting,
      filters: { stageFilter, segmentFilter, pmFilter, salesRepFilter, dynamicFilters, globalFilter, dateRange },
    })
    return current !== savedSnapshot.current
  }, [activeViewName, columnOrder, columnVisibility, columnSizing, sorting, stageFilter, segmentFilter, pmFilter, salesRepFilter, dynamicFilters, globalFilter, dateRange])

  const handleLoadView = useCallback((name) => {
    const view = loadView(name)
    setColumnOrder(view.columnOrder)
    setColumnVisibility(view.columnVisibility)
    setColumnSizing(view.columnSizing)
    setSorting(view.sorting ?? [])
    const f = view.filters ?? {}
    setGlobalFilter(f.globalFilter ?? '')
    setStageFilter(f.stageFilter ?? [])
    setSegmentFilter(f.segmentFilter ?? [])
    setPmFilter(f.pmFilter ?? [])
    setSalesRepFilter(f.salesRepFilter ?? [])
    setDynamicFilters(f.dynamicFilters ?? {})
    setDateRange(f.dateRange ?? { start: '', end: '' })
    goToPage(0)
    // Update snapshot after state setters (will be consistent on next render)
    setTimeout(() => {
      savedSnapshot.current = JSON.stringify({
        columnOrder: view.columnOrder,
        columnVisibility: view.columnVisibility,
        columnSizing: view.columnSizing,
        sorting: view.sorting ?? [],
        filters: {
          stageFilter: f.stageFilter ?? [],
          segmentFilter: f.segmentFilter ?? [],
          pmFilter: f.pmFilter ?? [],
          salesRepFilter: f.salesRepFilter ?? [],
          dynamicFilters: f.dynamicFilters ?? {},
          globalFilter: f.globalFilter ?? '',
          dateRange: f.dateRange ?? { start: '', end: '' },
        },
      })
    }, 0)
  }, [loadView, goToPage])

  const handleSaveView = useCallback((name) => {
    saveView(name, {
      columnOrder,
      columnVisibility,
      columnSizing,
      sorting,
      filters: {
        stageFilter,
        segmentFilter,
        pmFilter,
        salesRepFilter,
        dynamicFilters,
        globalFilter,
        dateRange,
      },
    })
    // Update snapshot so dirty flag clears
    savedSnapshot.current = JSON.stringify({
      columnOrder, columnVisibility, columnSizing, sorting,
      filters: { stageFilter, segmentFilter, pmFilter, salesRepFilter, dynamicFilters, globalFilter, dateRange },
    })
  }, [saveView, columnOrder, columnVisibility, columnSizing, sorting, stageFilter, segmentFilter, pmFilter, salesRepFilter, dynamicFilters, globalFilter, dateRange])

  // Save the currently active view in-place (for the Save button)
  const handleSaveCurrentView = useCallback(() => {
    if (activeViewName === 'Standard') return
    handleSaveView(activeViewName)
  }, [activeViewName, handleSaveView])

  const handleDuplicateView = useCallback((name) => {
    const newName = duplicateView(name)
    if (newName) {
      // Load the duplicated view so state is in sync
      const view = loadView(newName)
      setColumnOrder(view.columnOrder)
      setColumnVisibility(view.columnVisibility)
      setColumnSizing(view.columnSizing)
      setSorting(view.sorting ?? [])
      const f = view.filters ?? {}
      setGlobalFilter(f.globalFilter ?? '')
      setStageFilter(f.stageFilter ?? [])
      setSegmentFilter(f.segmentFilter ?? [])
      setPmFilter(f.pmFilter ?? [])
      setSalesRepFilter(f.salesRepFilter ?? [])
      setDynamicFilters(f.dynamicFilters ?? {})
      setDateRange(f.dateRange ?? { start: '', end: '' })
      goToPage(0)
      setTimeout(() => {
        savedSnapshot.current = JSON.stringify({
          columnOrder: view.columnOrder, columnVisibility: view.columnVisibility,
          columnSizing: view.columnSizing, sorting: view.sorting ?? [],
          filters: { stageFilter: f.stageFilter ?? [], segmentFilter: f.segmentFilter ?? [],
            pmFilter: f.pmFilter ?? [], salesRepFilter: f.salesRepFilter ?? [],
            dynamicFilters: f.dynamicFilters ?? {}, globalFilter: f.globalFilter ?? '',
            dateRange: f.dateRange ?? { start: '', end: '' } },
        })
      }, 0)
    }
  }, [duplicateView, loadView, goToPage])

  // CSV export — uses current filters, sorting, and visible columns
  const handleExportCsv = useCallback(() => {
    // 1. Filter
    const q = globalFilter?.toLowerCase() || ''
    let rows = data.filter(row => {
      if (q && !(row.po_number?.toLowerCase().includes(q) || row.job_name?.toLowerCase().includes(q))) return false
      if (stageFilter.length > 0 && !stageFilter.includes(row.stage)) return false
      if (segmentFilter.length > 0 && !segmentFilter.includes(row.segment)) return false
      if (pmFilter.length > 0 && !pmFilter.includes(row.project_manager)) return false
      if (salesRepFilter.length > 0 && !salesRepFilter.includes(row.sales_rep)) return false
      for (const [key, vals] of Object.entries(dynamicFilters)) {
        if (!rowMatchesFilter(row, key, vals)) return false
      }
      return true
    })
    // 2. Sort
    if (sorting.length) {
      rows = [...rows].sort((a, b) => {
        for (const { id, desc } of sorting) {
          const aVal = a[id], bVal = b[id]
          if (aVal == null && bVal == null) continue
          if (aVal == null) return 1
          if (bVal == null) return -1
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            if (aVal !== bVal) return desc ? bVal - aVal : aVal - bVal
            continue
          }
          const cmp = String(aVal).localeCompare(String(bVal), undefined, { sensitivity: 'base' })
          if (cmp !== 0) return desc ? -cmp : cmp
        }
        return 0
      })
    }
    // 3. Visible columns in order
    const visibleCols = columnOrder.filter(id => columnVisibility[id] !== false)
    const colMap = Object.fromEntries(allColumns.map(c => [c.id, c]))
    const headers = visibleCols.map(id => colMap[id]?.header ?? id)
    // 4. Build CSV
    const escCsv = (v) => {
      const s = v == null ? '' : String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csvLines = [headers.map(escCsv).join(',')]
    for (const row of rows) {
      csvLines.push(visibleCols.map(id => escCsv(row[id])).join(','))
    }
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeViewName.replace(/[^a-zA-Z0-9]/g, '_')}_export.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [data, globalFilter, stageFilter, segmentFilter, pmFilter, salesRepFilter, dynamicFilters, sorting, columnOrder, columnVisibility, activeViewName])

  const ACTUALS_STAGES = ['Need to Invoice', 'Benchmark in Progress', 'Benchmark Completed']

  const handleCellEdit = useCallback(async (po_number, field, value) => {
    // Auto-switch tracking_mode to actuals when stage moves to a terminal stage
    const alsoSetActuals = field === 'stage' && ACTUALS_STAGES.includes(value)

    let snapshot = null
    setData(prev => {
      snapshot = prev
      return prev.map(row =>
        row.po_number === po_number
          ? { ...row, [field]: value, ...(alsoSetActuals && { tracking_mode: 'actuals_tracking' }) }
          : row
      )
    })

    const result = await updateProject(po_number, field, value)
    if (result?.error) {
      if (snapshot) setData(snapshot)
      setEditError(`Failed to save: ${result.error.message}`)
      setTimeout(() => setEditError(null), 3000)
      return
    }

    if (alsoSetActuals) {
      await updateProject(po_number, 'tracking_mode', 'actuals_tracking')
    }

    refetch()
  }, [setData, refetch])

  // KPI bar — filtered across ALL rows
  const filteredForKPI = useMemo(() => {
    return kpiRows.filter(row => {
      if (stageFilter.length > 0 && !stageFilter.includes(row.stage)) return false
      if (segmentFilter.length > 0 && !segmentFilter.includes(row.segment)) return false
      if (pmFilter.length > 0 && !pmFilter.includes(row.project_manager)) return false
      if (salesRepFilter.length > 0 && !salesRepFilter.includes(row.sales_rep)) return false
      for (const [key, vals] of Object.entries(dynamicFilters)) {
        if (!rowMatchesFilter(row, key, vals)) return false
      }
      if (globalFilter) {
        const q = globalFilter.toLowerCase()
        if (!row.po_number?.toLowerCase().includes(q) && !row.job_name?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [kpiRows, stageFilter, segmentFilter, pmFilter, salesRepFilter, dynamicFilters, globalFilter])

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-error font-medium mb-2">Failed to load projects</p>
        <p className="text-sm text-muted mb-4">{error}</p>
        <Button variant="primary" size="sm" onClick={refetch}>Try again</Button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold text-charcoal">Projects</h1>
        {loading && <span className="text-sm text-muted">Loading…</span>}
      </div>

      <ProjectsKPIBar rows={filteredForKPI} />

      <ProjectsToolbar
        globalFilter={globalFilter}
        onGlobalFilter={v => { setGlobalFilter(v); goToPage(0) }}
        stageFilter={stageFilter}
        onStageFilter={v => { setStageFilter(v); goToPage(0) }}
        segmentFilter={segmentFilter}
        onSegmentFilter={v => { setSegmentFilter(v); goToPage(0) }}
        pmFilter={pmFilter}
        onPmFilter={v => { setPmFilter(v); goToPage(0) }}
        salesRepFilter={salesRepFilter}
        onSalesRepFilter={v => { setSalesRepFilter(v); goToPage(0) }}
        dateRange={dateRange}
        onDateRangeChange={v => { setDateRange(v); goToPage(0) }}
        dynamicFilters={dynamicFilters}
        onDynamicFilterChange={handleDynamicFilterChange}
        allData={data}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        columnOrder={columnOrder}
        onColumnOrderChange={newOrder => {
          setColumnOrder(newOrder)
          patchView(activeViewName, { columnOrder: newOrder })
        }}
        activeViewName={activeViewName}
        viewNames={listViews()}
        hiddenViewNames={listHiddenViews()}
        onLoadView={handleLoadView}
        onSaveView={handleSaveView}
        onDeleteView={deleteView}
        onDuplicateView={handleDuplicateView}
        onHideView={hideView}
        onShowView={showView}
        onRenameView={renameView}
        viewIsDirty={viewIsDirty}
        onSaveCurrentView={handleSaveCurrentView}
        onExportCsv={handleExportCsv}
        onRefresh={refetch}
        loading={loading}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {viewMode === 'list' && (
        <ProjectsTable
          data={data}
          globalFilter={globalFilter}
          stageFilter={stageFilter}
          segmentFilter={segmentFilter}
          pmFilter={pmFilter}
          salesRepFilter={salesRepFilter}
          dynamicFilters={dynamicFilters}
          columnVisibility={columnVisibility}
          columnOrder={columnOrder}
          columnSizing={columnSizing}
          onColumnSizingChange={setColumnSizing}
          onColumnOrderChange={setColumnOrder}
          sorting={sorting}
          onSortingChange={setSorting}
          onRowClick={r => setSelectedPO(r.po_number)}
          onCellEdit={handleCellEdit}
          page={page}
          goToPage={goToPage}
          totalCount={totalCount}
          pageSize={pageSize}
        />
      )}

      {viewMode === 'board' && (
        <ProjectsKanban data={filteredForKPI} onRowClick={r => setSelectedPO(r.po_number)} />
      )}

      {viewMode === 'cards' && (
        <ProjectsHealthCards data={filteredForKPI} onRowClick={r => setSelectedPO(r.po_number)} />
      )}

      {selectedProject && (
        <ProjectDetailPanel project={selectedProject} onClose={() => setSelectedPO(null)} onCellEdit={handleCellEdit} />
      )}

      {editError && (
        <div className="fixed bottom-4 right-4 bg-error text-white px-4 py-2 rounded-lg shadow-elevated text-sm z-50">
          {editError}
        </div>
      )}
    </div>
  )
}
