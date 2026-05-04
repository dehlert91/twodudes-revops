import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table'
import { allColumns } from './columns'
import { STAGE_COLORS } from './stageConfig'
import { Badge } from '../ui'
import { SortIndicator } from '../SortIndicator'
import { rowMatchesFilter } from './columns/tagColumns'
import { fmtCurrency, fmtPct } from './columns/formatters'

const PINNED_IDS = ['po_number']

function EditableCell({ getValue, row, column, onCellEdit }) {
  const initialValue = getValue()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialValue ?? '')
  const inputRef = useRef(null)
  const meta = column.columnDef.meta

  useEffect(() => {
    setValue(initialValue ?? '')
  }, [initialValue])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      if (inputRef.current.select && meta?.inputType !== 'select') inputRef.current.select()
    }
  }, [editing])

  const save = useCallback(() => {
    setEditing(false)
    const newVal = meta?.inputType === 'number' ? (value === '' ? null : Number(value)) : value
    if (newVal !== initialValue) {
      onCellEdit(row.original.po_number, column.id, newVal)
    }
  }, [value, initialValue, row.original.po_number, column.id, meta?.inputType, onCellEdit])

  const cancel = useCallback(() => {
    setValue(initialValue ?? '')
    setEditing(false)
  }, [initialValue])

  if (!editing) {
    const rendered = column.columnDef.cell
      ? flexRender(column.columnDef.cell, { getValue: () => initialValue, row, column, table: null })
      : (initialValue ?? '—')

    return (
      <div
        className="cursor-pointer border border-dashed border-line rounded px-1 -mx-1 hover:border-orange/50 hover:bg-orange/5 min-h-[1.5rem] flex items-center"
        onClick={(e) => { e.stopPropagation(); setEditing(true) }}
      >
        {rendered}
      </div>
    )
  }

  if (meta?.inputType === 'select') {
    return (
      <select
        ref={inputRef}
        value={value}
        onChange={e => { setValue(e.target.value); }}
        onBlur={save}
        onKeyDown={e => {
          if (e.key === 'Escape') cancel()
        }}
        onClick={e => e.stopPropagation()}
        className="w-full px-1 py-0.5 text-sm border border-orange rounded focus:outline-none focus:ring-1 focus:ring-orange -mx-1 bg-white"
      >
        <option value="">— Select —</option>
        {(meta.options ?? []).map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    )
  }

  return (
    <input
      ref={inputRef}
      type={meta?.inputType || 'text'}
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={e => {
        if (e.key === 'Enter') save()
        if (e.key === 'Escape') cancel()
      }}
      onClick={e => e.stopPropagation()}
      className="w-full px-1 py-0.5 text-sm border border-orange rounded focus:outline-none focus:ring-1 focus:ring-orange -mx-1"
    />
  )
}

export function ProjectsTable({
  data,
  globalFilter,
  stageFilter,
  segmentFilter,
  pmFilter = [],
  salesRepFilter = [],
  dynamicFilters = {},
  columnVisibility,
  columnOrder,
  columnSizing,
  onColumnSizingChange,
  onColumnOrderChange,
  sorting: sortingProp,
  onSortingChange: onSortingChangeProp,
  onRowClick,
  onCellEdit,
  page = 0,
  goToPage,
  totalCount = 0,
  pageSize = 100,
}) {
  // If parent doesn't control sorting, manage it internally
  const [internalSorting, setInternalSorting] = useState([])
  const sorting = sortingProp ?? internalSorting
  const onSortingChange = onSortingChangeProp ?? setInternalSorting

  const tableContainerRef = useRef(null)
  const [draggedCol, setDraggedCol] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)

  // Client-side filtered data (filters + search across ALL rows, not just current page)
  const filtered = useMemo(() => {
    const q = globalFilter?.toLowerCase() || ''
    return data.filter(row => {
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
  }, [data, globalFilter, stageFilter, segmentFilter, pmFilter, salesRepFilter, dynamicFilters])

  // Sort filtered data BEFORE pagination so sort applies across all rows
  const sortedData = useMemo(() => {
    if (!sorting.length) return filtered
    const sorted = [...filtered]
    sorted.sort((a, b) => {
      for (const { id, desc } of sorting) {
        const aVal = a[id]
        const bVal = b[id]
        // Nulls last
        if (aVal == null && bVal == null) continue
        if (aVal == null) return 1
        if (bVal == null) return -1
        // Numeric comparison
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          if (aVal !== bVal) return desc ? bVal - aVal : aVal - bVal
          continue
        }
        // String comparison
        const cmp = String(aVal).localeCompare(String(bVal), undefined, { sensitivity: 'base' })
        if (cmp !== 0) return desc ? -cmp : cmp
      }
      return 0
    })
    return sorted
  }, [filtered, sorting])

  // Client-side pagination on sorted results
  const filteredTotal = sortedData.length
  const clientTotalPages = Math.ceil(filteredTotal / pageSize)
  const paginatedData = useMemo(() => {
    const start = page * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, page, pageSize])

  const table = useReactTable({
    data: paginatedData,
    columns: allColumns,
    state: {
      sorting,
      columnVisibility,
      columnOrder,
      columnPinning: { left: PINNED_IDS },
      columnSizing: columnSizing || {},
    },
    onSortingChange: onSortingChange,
    onColumnSizingChange: onColumnSizingChange,
    columnResizeMode: 'onEnd',
    enableColumnResizing: false, // we handle resize ourselves for performance
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const rows = table.getRowModel().rows

  // Compute pinned column left offsets (only recalc when sizing finalizes)
  const columnSizingState = table.getState().columnSizing
  const pinnedOffsets = useMemo(() => {
    const offsets = {}
    let cumulative = 0
    for (const id of PINNED_IDS) {
      offsets[id] = cumulative
      const col = table.getColumn(id)
      cumulative += col ? col.getSize() : 0
    }
    return offsets
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnSizingState])

  // CSS-variable-driven sizing (only fires on final commit)
  const columnSizeVars = useMemo(() => {
    const headers = table.getFlatHeaders()
    const vars = {}
    headers.forEach(header => {
      vars[`--header-${header.id}-size`] = `${header.getSize()}px`
      vars[`--col-${header.column.id}-size`] = `${header.column.getSize()}px`
    })
    return vars
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnSizingState])

  // Custom resize handler — bypasses React during drag, writes CSS vars directly
  const getResizeHandler = useCallback((header) => (e) => {
    e.preventDefault()
    const startX = e.clientX
    const startSize = header.column.getSize()
    const colId = header.column.id
    const minSize = header.column.columnDef.minSize ?? 40
    const maxSize = header.column.columnDef.maxSize ?? 800

    const onMouseMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX
      const newSize = Math.min(Math.max(startSize + delta, minSize), maxSize)
      tableContainerRef.current?.style.setProperty(
        `--col-${colId}-size`,
        `${newSize}px`
      )
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)

      const raw = tableContainerRef.current?.style.getPropertyValue(
        `--col-${colId}-size`
      )
      const finalSize = raw ? parseFloat(raw) : startSize

      table.setColumnSizing(prev => ({
        ...prev,
        [colId]: finalSize,
      }))
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [table])

  // Drag and drop handlers for column reordering
  const handleDragStart = useCallback((e, headerId) => {
    if (PINNED_IDS.includes(headerId)) { e.preventDefault(); return }
    setDraggedCol(headerId)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e, headerId) => {
    if (PINNED_IDS.includes(headerId) || !draggedCol) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(headerId)
  }, [draggedCol])

  const handleDrop = useCallback((e, headerId) => {
    e.preventDefault()
    if (!draggedCol || PINNED_IDS.includes(headerId) || draggedCol === headerId) {
      setDraggedCol(null)
      setDropTarget(null)
      return
    }
    const currentOrder = table.getState().columnOrder.length > 0
      ? [...table.getState().columnOrder]
      : table.getAllLeafColumns().map(c => c.id)

    const fromIndex = currentOrder.indexOf(draggedCol)
    const toIndex = currentOrder.indexOf(headerId)
    if (fromIndex === -1 || toIndex === -1) { setDraggedCol(null); setDropTarget(null); return }

    currentOrder.splice(fromIndex, 1)
    currentOrder.splice(toIndex, 0, draggedCol)
    onColumnOrderChange?.(currentOrder)

    setDraggedCol(null)
    setDropTarget(null)
  }, [draggedCol, table, onColumnOrderChange])

  const handleDragEnd = useCallback(() => {
    setDraggedCol(null)
    setDropTarget(null)
  }, [])

  const isPinned = (id) => PINNED_IDS.includes(id)
  const isLastPinned = (id) => id === PINNED_IDS[PINNED_IDS.length - 1]

  const paginationBar = clientTotalPages > 1 ? (
    <div className="flex items-center justify-between mb-2">
      <p className="text-xs text-muted">
        {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filteredTotal)} of {filteredTotal.toLocaleString()}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => goToPage(0)}
          disabled={page === 0}
          className="px-2 py-1 text-xs rounded border border-line hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ««
        </button>
        <button
          onClick={() => goToPage(page - 1)}
          disabled={page === 0}
          className="px-2 py-1 text-xs rounded border border-line hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ‹
        </button>
        <span className="text-xs text-muted px-2">
          Page {page + 1} of {clientTotalPages}
        </span>
        <button
          onClick={() => goToPage(page + 1)}
          disabled={page >= clientTotalPages - 1}
          className="px-2 py-1 text-xs rounded border border-line hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ›
        </button>
        <button
          onClick={() => goToPage(clientTotalPages - 1)}
          disabled={page >= clientTotalPages - 1}
          className="px-2 py-1 text-xs rounded border border-line hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed"
        >
          »»
        </button>
      </div>
    </div>
  ) : null

  return (
    <>
      {paginationBar}

      {/* Desktop table */}
      <div ref={tableContainerRef} className="hidden md:block overflow-x-auto border border-line rounded-lg" style={columnSizeVars}>
        <table
          className="text-sm"
          style={{ width: table.getTotalSize(), tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}
        >
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="bg-surface-subtle border-b border-line-strong">
                {hg.headers.map(header => {
                  const pinned = isPinned(header.id)
                  const lastPin = isLastPinned(header.id)
                  const sortable = header.column.getCanSort()
                  const sortDir = header.column.getIsSorted() || null
                  return (
                    <th
                      key={header.id}
                      draggable={!pinned}
                      onDragStart={e => handleDragStart(e, header.id)}
                      onDragOver={e => handleDragOver(e, header.id)}
                      onDrop={e => handleDrop(e, header.id)}
                      onDragEnd={handleDragEnd}
                      onClick={sortable ? header.column.getToggleSortingHandler() : undefined}
                      className={`group/th relative px-3 py-[10px] text-left text-[10px] font-bold uppercase tracking-[0.08em] whitespace-nowrap overflow-hidden text-ellipsis select-none transition-colors ${
                        sortable ? 'cursor-pointer text-muted hover:text-charcoal hover:bg-surface-muted' : 'text-muted'
                      } ${sortDir ? 'text-charcoal' : ''} ${
                        pinned ? 'sticky z-20' : (sortable ? '' : 'cursor-grab')
                      } ${lastPin ? 'shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]' : ''} ${
                        dropTarget === header.id ? 'border-l-2 border-l-orange' : ''
                      }`}
                      style={{
                        width: `var(--header-${header.id}-size)`,
                        ...(pinned ? { left: pinnedOffsets[header.id] + 'px', backgroundColor: 'var(--td-bg-subtle)' } : {}),
                      }}
                    >
                      <span className="inline-flex items-center">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sortable && <SortIndicator direction={sortDir} />}
                      </span>
                      <div
                        onMouseDown={getResizeHandler(header)}
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => { e.stopPropagation(); header.column.resetSize() }}
                        className={`absolute right-0 top-0 h-full w-4 -mr-2 cursor-col-resize select-none touch-none ${
                          header.column.getIsResizing() ? 'bg-orange/20' : ''
                        }`}
                      >
                        <div className={`mx-auto h-full w-0.5 transition-colors group-hover/th:bg-line-strong hover:!bg-orange ${
                          header.column.getIsResizing() ? 'bg-orange' : 'bg-transparent'
                        }`} />
                      </div>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={100} className="text-center py-12 text-muted">
                  No projects match your filters.
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick(row.original)}
                  className={`border-b border-line hover:bg-orange/5 cursor-pointer transition-colors group ${
                    row.index % 2 === 1 ? 'bg-surface-muted' : ''
                  }`}
                >
                  {row.getVisibleCells().map(cell => {
                    const pinned = isPinned(cell.column.id)
                    const lastPin = isLastPinned(cell.column.id)
                    const isEditable = cell.column.columnDef.meta?.editable && onCellEdit

                    return (
                      <td
                        key={cell.id}
                        style={{
                          width: `var(--col-${cell.column.id}-size)`,
                          ...(pinned ? { left: pinnedOffsets[cell.column.id] + 'px', backgroundColor: 'var(--td-bg)' } : {}),
                        }}
                        className={`px-3 py-2.5 whitespace-nowrap overflow-hidden text-ellipsis ${
                          pinned ? 'sticky z-20' : ''
                        } ${lastPin ? 'shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]' : ''}`}
                      >
                        {isEditable ? (
                          <EditableCell
                            getValue={cell.getValue}
                            row={cell.row}
                            column={cell.column}
                            onCellEdit={onCellEdit}
                          />
                        ) : (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden flex flex-col gap-3">
        {rows.length === 0 ? (
          <p className="text-center py-12 text-muted">No projects match your filters.</p>
        ) : (
          rows.map(row => <MobileCard key={row.id} project={row.original} onClick={() => onRowClick(row.original)} />)
        )}
      </div>

      {!paginationBar && (
        <p className="text-xs text-muted mt-2">{filteredTotal} project{filteredTotal !== 1 ? 's' : ''}</p>
      )}
    </>
  )
}

function MobileCard({ project, onClick }) {
  const cfg = STAGE_COLORS[project.stage] ?? { tone: 'default', dot: 'bg-muted' }
  return (
    <button
      onClick={onClick}
      className="w-full text-left border border-line rounded-lg p-4 hover:border-orange transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-semibold text-sm text-charcoal">{project.po_number}</p>
          <p className="text-sm text-charcoal leading-tight">{project.job_name}</p>
        </div>
        <Badge tone={cfg.tone} dot={cfg.dot}>
          {project.stage}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs text-muted mt-3">
        <div>
          <p className="uppercase tracking-wide text-[10px] mb-0.5">Revenue</p>
          <p className="font-medium font-mono text-charcoal">{fmtCurrency(project.total_revenue)}</p>
        </div>
        <div>
          <p className="uppercase tracking-wide text-[10px] mb-0.5">GP%</p>
          <p className="font-medium font-mono text-charcoal">{fmtPct(project.est_gp_pct)}</p>
        </div>
        <div>
          <p className="uppercase tracking-wide text-[10px] mb-0.5">Complete</p>
          <p className="font-medium font-mono text-charcoal">{fmtPct(project.pct_complete)}</p>
        </div>
      </div>
    </button>
  )
}
