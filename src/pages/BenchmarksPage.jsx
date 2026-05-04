import { useState, useMemo, useCallback } from 'react'
import { Button } from '../components/ui'
import { useProjectDetails } from '../hooks/useProjectDetails'
import { useTableViews } from '../hooks/useTableViews'
import { ProjectsKPIBar } from '../components/projects/ProjectsKPIBar'
import { ProjectsToolbar } from '../components/projects/ProjectsToolbar'
import { ProjectsTable } from '../components/projects/ProjectsTable'
import { ProjectsKanban } from '../components/projects/ProjectsKanban'
import { ProjectsHealthCards } from '../components/projects/ProjectsHealthCards'
import { ProjectDetailPanel } from '../components/projects/ProjectDetailPanel'
import { updateProject } from '../lib/supabase'
import { rowMatchesFilter } from '../components/projects/columns/tagColumns'

export function BenchmarksPage() {
  const { data, loading, error, refetch, setData, page, goToPage, totalCount, pageSize, kpiRows } = useProjectDetails('benchmark')
  const { activeViewName, listViews, loadView, saveView, patchView, deleteView, standardView } = useTableViews()

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

  const [columnOrder, setColumnOrder] = useState(standardView.columnOrder)
  const [columnVisibility, setColumnVisibility] = useState(standardView.columnVisibility)
  const [columnSizing, setColumnSizing] = useState(standardView.columnSizing)

  const [selectedPO, setSelectedPO] = useState(null)
  const selectedProject = useMemo(() => {
    if (!selectedPO) return null
    return data.find(r => r.po_number === selectedPO) ?? null
  }, [selectedPO, data])
  const [viewMode, setViewMode] = useState('list')
  const [editError, setEditError] = useState(null)

  const handleLoadView = useCallback((name) => {
    const view = loadView(name)
    setColumnOrder(view.columnOrder)
    setColumnVisibility(view.columnVisibility)
    setColumnSizing(view.columnSizing)
  }, [loadView])

  const handleSaveView = useCallback((name) => {
    saveView(name, { columnOrder, columnVisibility, columnSizing })
  }, [saveView, columnOrder, columnVisibility, columnSizing])

  const handleCellEdit = useCallback(async (po_number, field, value) => {
    let snapshot = null
    setData(prev => { snapshot = prev; return prev.map(row =>
      row.po_number === po_number ? { ...row, [field]: value } : row
    )})

    const result = await updateProject(po_number, field, value)
    if (result?.error) {
      if (snapshot) setData(snapshot)
      setEditError(`Failed to save: ${result.error.message}`)
      setTimeout(() => setEditError(null), 3000)
    } else {
      refetch()
    }
  }, [setData, refetch])

  const filteredForKPI = useMemo(() => {
    return kpiRows.filter(row => {
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
  }, [kpiRows, segmentFilter, pmFilter, salesRepFilter, dynamicFilters, globalFilter])

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-error font-medium mb-2">Failed to load benchmarks</p>
        <p className="text-sm text-muted mb-4">{error}</p>
        <Button variant="primary" size="sm" onClick={refetch}>Try again</Button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold text-charcoal">Benchmarks</h1>
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
        onLoadView={handleLoadView}
        onSaveView={handleSaveView}
        onDeleteView={deleteView}
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
