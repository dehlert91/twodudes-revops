import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table'

import { Badge } from '../ui'
import { SortIndicator } from '../SortIndicator'

function fmtCurrency(n) {
  if (n == null || isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}
function fmtPct(n) {
  if (n == null || isNaN(n)) return '—'
  return `${(Number(n) * 100).toFixed(0)}%`
}

const BILLING_STATUS_TONES = {
  behind:           'warning',
  awaiting_deposit: 'info',
  awaiting_final:   'info',
  overbilled:       'error',
  on_track:         'success',
  unassigned:       'default',
}

/** Per-row Actions ▾ dropdown. Renders the menu in a portal-style fixed
 * position based on the button's bounding rect so it escapes the table's
 * overflow-x clipping. */
function ActionsCell({ row, onAction }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const h = (e) => {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) setOpen(false)
    }
    const close = () => setOpen(false)
    document.addEventListener('mousedown', h)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', h)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  function toggle(e) {
    e.stopPropagation()
    if (!open) {
      const r = buttonRef.current.getBoundingClientRect()
      const menuWidth = 160
      setPos({ top: r.bottom + 4, left: Math.max(8, r.right - menuWidth) })
    }
    setOpen(o => !o)
  }

  const pick = (kind) => { setOpen(false); onAction?.(kind, row) }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggle}
        className="px-2.5 py-1 rounded text-xs font-medium border border-line text-charcoal/70 hover:bg-surface-muted transition-colors"
      >
        Actions ▾
      </button>
      {open && pos && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: 180 }}
          className="z-[100] bg-surface border border-line rounded-md shadow-elevated py-1 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => pick('final_invoice')}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-subtle"
          >
            Final Invoice
          </button>
          <button
            onClick={() => pick('progress_bill')}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-subtle"
          >
            Progress Billing
          </button>
          <button
            onClick={() => pick('add_wip')}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-subtle text-charcoal"
          >
            Add to WIP
          </button>
        </div>
      )}
    </>
  )
}

/** WIP table column definitions. */
export const WIP_COLUMNS = [
  { id: 'actions', header: 'Actions', size: 110, enableSorting: false,
    cell: ({ row, table }) => (
      <ActionsCell row={row.original} onAction={table.options.meta?.onAction} />
    ) },
  {
    id: 'po_number',
    header: 'Project',
    size: 280,
    cell: ({ row }) => (
      <div className="leading-tight">
        <div className="font-mono font-semibold text-charcoal">{row.original.po_number}</div>
        <div className="text-xs text-muted truncate max-w-[260px]">{row.original.job_name}</div>
      </div>
    ),
    sortingFn: (a, b) => String(a.original.po_number).localeCompare(String(b.original.po_number)),
  },
  { id: 'project_manager', header: 'PM', size: 140,
    accessorKey: 'project_manager',
    cell: ({ getValue }) => getValue() || '—' },
  { id: 'division', header: 'Division', size: 90,
    accessorKey: 'division',
    cell: ({ getValue }) => <span className="text-xs">{getValue() || '—'}</span> },
  { id: 'segment', header: 'Segment', size: 100,
    accessorKey: 'segment',
    cell: ({ getValue }) => <span className="text-xs">{getValue() || '—'}</span> },
  { id: 'stage', header: 'Stage', size: 140,
    accessorKey: 'stage',
    cell: ({ getValue }) => <span className="text-xs">{getValue() || '—'}</span> },
  { id: 'billing_status', header: 'Status', size: 120,
    accessorKey: 'billing_status',
    cell: ({ getValue }) => (
      <Badge tone={BILLING_STATUS_TONES[getValue()] || 'default'}>{getValue() || 'unassigned'}</Badge>
    ) },
  { id: 'pct_complete', header: '% Comp', size: 80,
    accessorKey: 'pct_complete',
    cell: ({ getValue }) => <div className="text-right font-mono">{fmtPct(getValue())}</div> },
  { id: 'total_revenue', header: 'Revenue', size: 120,
    accessorKey: 'total_revenue',
    cell: ({ getValue }) => <div className="text-right font-mono">{fmtCurrency(getValue())}</div> },
  { id: 'amount_billed_to_date', header: 'Billed', size: 120,
    accessorKey: 'amount_billed_to_date',
    cell: ({ getValue }) => <div className="text-right font-mono">{fmtCurrency(getValue())}</div> },
  { id: 'unbilled_revenue', header: 'Unbilled', size: 120,
    accessorKey: 'unbilled_revenue',
    cell: ({ getValue }) => (
      <div className="text-right font-mono font-semibold text-[#B8561E]">{fmtCurrency(getValue())}</div>
    ) },
  { id: 'costs_in_excess_of_billings', header: 'CIEB', size: 110,
    accessorKey: 'costs_in_excess_of_billings',
    cell: ({ getValue }) => <div className="text-right font-mono">{fmtCurrency(getValue())}</div> },
  { id: 'billings_in_excess_of_costs', header: 'BIEC', size: 110,
    accessorKey: 'billings_in_excess_of_costs',
    cell: ({ getValue }) => <div className="text-right font-mono">{fmtCurrency(getValue())}</div> },
  { id: 'wip_to_date', header: 'WIP $', size: 110,
    accessorKey: 'wip_to_date',
    cell: ({ getValue }) => <div className="text-right font-mono">{fmtCurrency(getValue())}</div> },
  { id: 'days_since_last_invoice', header: 'Days Idle', size: 80,
    accessorKey: 'days_since_last_invoice',
    cell: ({ getValue }) => {
      const v = getValue()
      return <div className={`text-right font-mono text-xs ${(v ?? 0) > 30 ? 'text-[#B8561E] font-semibold' : ''}`}>{v ?? '—'}</div>
    } },
]

const PINNED_IDS = ['actions', 'po_number']

/**
 * WIP / underbilling report. Flat list, sorted by unbilled_revenue desc.
 * Columns are TanStack-driven with resize handles, hide/show via the parent's Columns dropdown,
 * and per-row Actions menu.
 */
export function WipReportTable({
  rows,
  loading,
  onAction,
  onRowClick,
  columns: columnsProp,
  columnVisibility,
  onColumnVisibilityChange,
  columnSizing,
  onColumnSizingChange,
  columnOrder,
  onColumnOrderChange,
  sorting,
  onSortingChange,
}) {
  const containerRef = useRef(null)
  const columns = columnsProp ?? WIP_COLUMNS

  const [draggedCol, setDraggedCol] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)

  const table = useReactTable({
    data: rows ?? [],
    columns,
    state: {
      columnVisibility: columnVisibility ?? {},
      columnSizing: columnSizing ?? {},
      columnOrder: columnOrder ?? [],
      columnPinning: { left: PINNED_IDS },
      sorting: sorting ?? [],
    },
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === 'function' ? updater(columnVisibility ?? {}) : updater
      onColumnVisibilityChange?.(next)
    },
    onColumnSizingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(columnSizing ?? {}) : updater
      onColumnSizingChange?.(next)
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting ?? []) : updater
      onSortingChange?.(next)
    },
    enableColumnResizing: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    meta: { onAction },
  })

  const handleDragStart = useCallback((e, headerId) => {
    if (PINNED_IDS.includes(headerId)) return
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
      setDraggedCol(null); setDropTarget(null); return
    }
    const current = table.getState().columnOrder.length > 0
      ? [...table.getState().columnOrder]
      : table.getAllLeafColumns().map(c => c.id)
    const from = current.indexOf(draggedCol)
    const to   = current.indexOf(headerId)
    if (from === -1 || to === -1) { setDraggedCol(null); setDropTarget(null); return }
    current.splice(from, 1)
    current.splice(to, 0, draggedCol)
    onColumnOrderChange?.(current)
    setDraggedCol(null); setDropTarget(null)
  }, [draggedCol, table, onColumnOrderChange])

  const handleDragEnd = useCallback(() => { setDraggedCol(null); setDropTarget(null) }, [])

  // CSS-variable-driven sizing
  const columnSizingState = table.getState().columnSizing
  const columnSizeVars = useMemo(() => {
    const headers = table.getFlatHeaders()
    const vars = {}
    headers.forEach(header => {
      vars[`--col-${header.column.id}-size`] = `${header.getSize()}px`
    })
    return vars
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnSizingState, columnVisibility])

  // Drag handler for resize
  const getResizeHandler = useCallback((header) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startSize = header.column.getSize()
    const colId = header.column.id
    const minSize = header.column.columnDef.minSize ?? 60
    const maxSize = header.column.columnDef.maxSize ?? 800

    const onMove = (mv) => {
      const delta = mv.clientX - startX
      const newSize = Math.min(Math.max(startSize + delta, minSize), maxSize)
      containerRef.current?.style.setProperty(`--col-${colId}-size`, `${newSize}px`)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      const raw = containerRef.current?.style.getPropertyValue(`--col-${colId}-size`)
      const finalSize = raw ? parseFloat(raw) : startSize
      table.setColumnSizing(prev => ({ ...prev, [colId]: finalSize }))
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [table])

  if (loading) {
    return <div className="py-12 text-center text-sm text-muted">Loading WIP report…</div>
  }
  if (!rows?.length) {
    return <div className="py-12 text-center text-sm text-muted">No projects with unbilled revenue.</div>
  }

  return (
    <div ref={containerRef} className="border border-line rounded-lg overflow-x-auto" style={columnSizeVars}>
      <table
        className="text-sm"
        style={{ width: table.getTotalSize(), tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}
      >
        <thead>
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id} className="bg-surface-subtle border-b border-line-strong">
              {hg.headers.map(header => {
                const pinned   = PINNED_IDS.includes(header.id)
                const sortable = header.column.getCanSort()
                const sortDir  = header.column.getIsSorted() || null
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
                      sortable
                        ? 'cursor-pointer text-muted hover:text-charcoal hover:bg-surface-muted'
                        : 'text-muted cursor-grab'
                    } ${sortDir ? 'text-charcoal' : ''} ${
                      dropTarget === header.id ? 'border-l-2 border-l-orange' : ''
                    }`}
                    style={{ width: `var(--col-${header.id}-size)` }}
                  >
                    <span className="inline-flex items-center">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {sortable && <SortIndicator direction={sortDir} />}
                    </span>
                    <div
                      onMouseDown={getResizeHandler(header)}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => { e.stopPropagation(); table.setColumnSizing(prev => { const { [header.id]: _, ...rest } = prev; return rest }) }}
                      className="absolute right-0 top-0 h-full w-3 -mr-1 cursor-col-resize select-none touch-none"
                    >
                      <div className="mx-auto h-full w-0.5 bg-transparent group-hover/th:bg-line-strong hover:!bg-orange transition-colors" />
                    </div>
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row.original)}
              className={`border-b border-line hover:bg-orange/5 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {row.getVisibleCells().map(cell => (
                <td
                  key={cell.id}
                  style={{ width: `var(--col-${cell.column.id}-size)` }}
                  className="px-3 py-2.5 whitespace-nowrap overflow-hidden text-ellipsis"
                  onClick={cell.column.id === 'actions' ? (e) => e.stopPropagation() : undefined}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
