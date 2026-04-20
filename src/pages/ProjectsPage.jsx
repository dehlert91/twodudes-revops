import { useState, useMemo, useCallback } from 'react'
import { useProjectDetails } from '../hooks/useProjectDetails'
import { useTableViews } from '../hooks/useTableViews'
import { ProjectsKPIBar } from '../components/projects/ProjectsKPIBar'
import { ProjectsToolbar } from '../components/projects/ProjectsToolbar'
import { ProjectsTable } from '../components/projects/ProjectsTable'
import { ProjectsKanban } from '../components/projects/ProjectsKanban'
import { ProjectsHealthCards } from '../components/projects/ProjectsHealthCards'
import { ProjectDetailPanel } from '../components/projects/ProjectDetailPanel'
import { updateProject } from '../lib/supabase'

function uniqueSorted(data, key) {
  return [...new Set(data.map(r => r[key]).filter(Boolean))].sort()
}

export function ProjectsPage() {
  const { data, loading, error, refetch, setData } = useProjectDetails()
  const { activeViewName, listViews, loadView, saveView, deleteView, standardView } = useTableViews()

  // Filter state
  const [globalFilter, setGlobalFilter] = useState('')
  const [stageFilter, setStageFilter] = useState([])
  const [segmentFilter, setSegmentFilter] = useState([])
  const [pmFilter, setPmFilter] = useState([])
  const [salesRepFilter, setSalesRepFilter] = useState([])
  const [companyFilter, setCompanyFilter] = useState([])
  const [customerFilter, setCustomerFilter] = useState([])
  const [teamLeaderFilter, setTeamLeaderFilter] = useState([])

  // Derive unique option lists from data
  const pmOptions = useMemo(() => uniqueSorted(data, 'project_manager'), [data])
  const salesRepOptions = useMemo(() => uniqueSorted(data, 'sales_rep'), [data])
  const companyOptions = useMemo(() => uniqueSorted(data, 'company'), [data])
  const customerOptions = useMemo(() => uniqueSorted(data, 'customer'), [data])
  const teamLeaderOptions = useMemo(() => uniqueSorted(data, 'team_leader'), [data])

  // Column state — initialized from standard view
  const [columnOrder, setColumnOrder] = useState(standardView.columnOrder)
  const [columnVisibility, setColumnVisibility] = useState(standardView.columnVisibility)
  const [columnSizing, setColumnSizing] = useState(standardView.columnSizing)

  // Selected project for detail panel
  const [selectedProject, setSelectedProject] = useState(null)

  // View mode: 'list' | 'board' | 'cards'
  const [viewMode, setViewMode] = useState('list')

  // Edit error toast state
  const [editError, setEditError] = useState(null)

  // View management
  const handleLoadView = useCallback((name) => {
    const view = loadView(name)
    setColumnOrder(view.columnOrder)
    setColumnVisibility(view.columnVisibility)
    setColumnSizing(view.columnSizing)
  }, [loadView])

  const handleSaveView = useCallback((name) => {
    saveView(name, { columnOrder, columnVisibility, columnSizing })
  }, [saveView, columnOrder, columnVisibility, columnSizing])

  // Cell edit handler
  const handleCellEdit = useCallback(async (po_number, field, value) => {
    // Capture current data for rollback via functional ref
    let snapshot = null
    setData(prev => { snapshot = prev; return prev.map(row =>
      row.po_number === po_number ? { ...row, [field]: value } : row
    )})

    const result = await updateProject(po_number, field, value)
    if (result?.error) {
      // Revert on failure
      if (snapshot) setData(snapshot)
      setEditError(`Failed to save: ${result.error.message}`)
      setTimeout(() => setEditError(null), 3000)
    } else {
      // Refetch to pick up recalculated fields from the DB view
      refetch()
    }
  }, [setData, refetch])

  // The KPI bar shows stats for the currently filtered dataset
  const filteredForKPI = useMemo(() => {
    return data.filter(row => {
      if (stageFilter.length > 0 && !stageFilter.includes(row.stage)) return false
      if (segmentFilter.length > 0 && !segmentFilter.includes(row.segment)) return false
      if (pmFilter.length > 0 && !pmFilter.includes(row.project_manager)) return false
      if (salesRepFilter.length > 0 && !salesRepFilter.includes(row.sales_rep)) return false
      if (companyFilter.length > 0 && !companyFilter.includes(row.company)) return false
      if (customerFilter.length > 0 && !customerFilter.includes(row.customer)) return false
      if (teamLeaderFilter.length > 0 && !teamLeaderFilter.includes(row.team_leader)) return false
      if (globalFilter) {
        const q = globalFilter.toLowerCase()
        if (!row.po_number?.toLowerCase().includes(q) && !row.job_name?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [data, stageFilter, segmentFilter, pmFilter, salesRepFilter, companyFilter, customerFilter, teamLeaderFilter, globalFilter])

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-error font-medium mb-2">Failed to load projects</p>
        <p className="text-sm text-muted mb-4">{error}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-orange text-white rounded-md text-sm font-medium"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold text-ink">Projects</h1>
        {loading && <span className="text-sm text-muted">Loading…</span>}
      </div>

      <ProjectsKPIBar rows={filteredForKPI} />

      <ProjectsToolbar
        globalFilter={globalFilter}
        onGlobalFilter={setGlobalFilter}
        stageFilter={stageFilter}
        onStageFilter={setStageFilter}
        segmentFilter={segmentFilter}
        onSegmentFilter={setSegmentFilter}
        pmFilter={pmFilter}
        onPmFilter={setPmFilter}
        salesRepFilter={salesRepFilter}
        onSalesRepFilter={setSalesRepFilter}
        companyFilter={companyFilter}
        onCompanyFilter={setCompanyFilter}
        customerFilter={customerFilter}
        onCustomerFilter={setCustomerFilter}
        teamLeaderFilter={teamLeaderFilter}
        onTeamLeaderFilter={setTeamLeaderFilter}
        pmOptions={pmOptions}
        salesRepOptions={salesRepOptions}
        companyOptions={companyOptions}
        customerOptions={customerOptions}
        teamLeaderOptions={teamLeaderOptions}
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
          companyFilter={companyFilter}
          customerFilter={customerFilter}
          teamLeaderFilter={teamLeaderFilter}
          columnVisibility={columnVisibility}
          columnOrder={columnOrder}
          columnSizing={columnSizing}
          onColumnSizingChange={setColumnSizing}
          onColumnOrderChange={setColumnOrder}
          onRowClick={setSelectedProject}
          onCellEdit={handleCellEdit}
        />
      )}

      {viewMode === 'board' && (
        <ProjectsKanban
          data={filteredForKPI}
          onRowClick={setSelectedProject}
        />
      )}

      {viewMode === 'cards' && (
        <ProjectsHealthCards
          data={filteredForKPI}
          onRowClick={setSelectedProject}
        />
      )}

      {selectedProject && (
        <ProjectDetailPanel
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}

      {/* Edit error toast */}
      {editError && (
        <div className="fixed bottom-4 right-4 bg-error text-white px-4 py-2 rounded-lg shadow-elevated text-sm z-50">
          {editError}
        </div>
      )}
    </div>
  )
}
