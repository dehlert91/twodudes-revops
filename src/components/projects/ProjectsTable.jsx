import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table'
import { allColumns } from './columns'
import { STAGE_COLORS } from './stageConfig'
import { Badge } from '../ui'
import { fmtCurrency, fmtPct } from './columns/formatters'

const PINNED_IDS = ['po_number', 'job_name']

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
      inputRef.current.select()
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
  companyFilter = [],
  customerFilter = [],
  teamLeaderFilter = [],
  columnVisibility,
  columnOrder,
  columnSizing,
  onColumnSizingChange,
  onColumnOrderChange,
  onRowClick,
  onCellEdit,
}) {
  const tableContainerRef = useRef(null)
  const [draggedCol, setDraggedCol] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)

  // Client-side filtered data
  const filtered = useMemo(() => {
    return data.filter(row => {
      if (stageFilter.length > 0 && !stageFilter.includes(row.stage)) return false
      if (segmentFilter.length > 0 && !segmentFilter.includes(row.segment)) return false
      if (pmFilter.length > 0 && !pmFilter.includes(row.project_manager)) return false
      if (salesRepFilter.length > 0 && !salesRepFilter.includes(row.sales_rep)) return false
      if (companyFilter.length > 0 && !companyFilter.includes(row.company)) return false
      if (customerFilter.length > 0 && !customerFilter.includes(row.customer)) return false
      if (teamLeaderFilter.length > 0 && !teamLeaderFilter.includes(row.team_leader)) return false
      return true
    })
  }, [data, stageFilter, segmentFilter, pmFilter, salesRepFilter, companyFilter, customerFilter, teamLeaderFilter])

  const table = useReactTable({
    data: filtered,
    columns: allColumns,
    state: {
      globalFilter,
      columnVisibility,
      columnOrder,
      columnPinning: { left: PINNED_IDS },
      columnSizing: columnSizing || {},
    },
    onColumnSizingChange: onColumnSizingChange,
    globalFilterFn: (row, _colId, filterVal) => {
      const q = filterVal.toLowerCase()
      return (
        row.original.po_number?.toLowerCase().includes(q) ||
        row.original.job_name?.toLowerCase().includes(q)
      )
    },
    columnResizeMode: 'onEnd',
    enableColumnResizing: false, // we handle resize ourselves for performance
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
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

  return (
    <>
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
                  return (
                    <th
                      key={header.id}
                      draggable={!pinned}
                      onDragStart={e => handleDragStart(e, header.id)}
                      onDragOver={e => handleDragOver(e, header.id)}
                      onDrop={e => handleDrop(e, header.id)}
                      onDragEnd={handleDragEnd}
                      className={`relative px-3 py-[10px] text-left text-[10px] font-bold text-muted uppercase tracking-[0.08em] whitespace-nowrap select-none ${
                        header.column.getCanSort() ? 'cursor-pointer hover:text-charcoal' : ''
                      } ${pinned ? 'sticky z-20' : 'cursor-grab'} ${
                        lastPin ? 'shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]' : ''
                      } ${dropTarget === header.id ? 'border-l-2 border-l-orange' : ''}`}
                      style={{
                        width: `var(--header-${header.id}-size)`,
                        ...(pinned ? { left: pinnedOffsets[header.id] + 'px', backgroundColor: 'var(--td-bg-subtle)' } : {}),
                      }}
                    >
                      <span onClick={header.column.getToggleSortingHandler()}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc' && ' ↑'}
                        {header.column.getIsSorted() === 'desc' && ' ↓'}
                      </span>
                      <div
                        onMouseDown={getResizeHandler(header)}
                        onDoubleClick={() => header.column.resetSize()}
                        className={`absolute right-0 top-0 h-full w-4 -mr-2 cursor-col-resize select-none touch-none group/resize ${
                          header.column.getIsResizing() ? 'bg-orange/20' : ''
                        }`}
                      >
                        <div className={`mx-auto h-full w-0.5 transition-colors group-hover/resize:bg-orange ${
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

      <p className="text-xs text-muted mt-2">{rows.length} project{rows.length !== 1 ? 's' : ''}</p>
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
