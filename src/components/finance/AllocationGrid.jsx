import { useRef, useCallback, useMemo } from 'react'
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
function fmtDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${m}/${d}/${y.slice(2)}`
}

const METHOD_TONES = {
  pending:           'warning',
  duration_weighted: 'info',
  cost_dialed:       'success',
  manual:            'primary',
}

const PATTERN_LABELS = {
  single_month:                'Single',
  two_month:                   'Two-month',
  multi_month_sequential:      'Multi (seq)',
  multi_month_non_sequential:  'Multi (non-seq)',
}

/** Allocation grid column definitions. */
export const ALLOCATION_COLUMNS = [
  {
    id: 'po_number',
    header: 'Project',
    size: 300,
    cell: ({ row }) => (
      <div className="leading-tight">
        <div className="font-mono font-semibold text-charcoal">{row.original.po_number}</div>
        <div className="text-xs text-muted truncate max-w-[280px]">{row.original.job_name}</div>
      </div>
    ),
    sortingFn: (a, b) => String(a.original.po_number).localeCompare(String(b.original.po_number)),
  },
  { id: 'stage', header: 'Stage', size: 130,
    accessorKey: 'stage',
    cell: ({ getValue }) => <span className="text-xs">{getValue() || '—'}</span> },
  { id: 'estimated_start_date', header: 'Start', size: 90,
    accessorKey: 'estimated_start_date',
    cell: ({ getValue }) => <span className="text-xs whitespace-nowrap">{fmtDate(getValue())}</span> },
  { id: 'estimated_completion_date', header: 'End', size: 90,
    accessorKey: 'estimated_completion_date',
    cell: ({ getValue }) => <span className="text-xs whitespace-nowrap">{fmtDate(getValue())}</span> },
  { id: 'total_revenue', header: 'Revenue', size: 120,
    accessorKey: 'total_revenue',
    cell: ({ getValue }) => <div className="text-right font-mono">{fmtCurrency(getValue())}</div> },
  { id: 'allocation_method', header: 'Method', size: 130,
    accessorKey: 'allocation_method',
    cell: ({ getValue }) => {
      const v = getValue()
      return <Badge tone={METHOD_TONES[v] || 'default'}>{v || 'pending'}</Badge>
    } },
  { id: 'date_span_pattern', header: 'Span', size: 110,
    accessorKey: 'date_span_pattern',
    cell: ({ getValue }) => {
      const v = getValue()
      if (!v) return <span className="text-muted">—</span>
      const tone = v === 'single_month' ? 'success' : v === 'two_month' ? 'info' : 'primary'
      const label = v.replace('_', ' ')
      return <Badge tone={tone}>{label}</Badge>
    } },
  { id: 'allocation_pattern', header: 'Pattern', size: 130,
    accessorKey: 'allocation_pattern',
    cell: ({ getValue }) => <span className="text-xs text-muted">{PATTERN_LABELS[getValue()] || getValue() || '—'}</span> },
  { id: 'allocation_sum_pct', header: 'Sum %', size: 90,
    accessorKey: 'allocation_sum_pct',
    cell: ({ getValue, row }) => {
      const sumOk = row.original.is_allocation_complete
      const allocated = (row.original.allocated_months_count ?? 0) > 0
      return (
        <div className={`text-right font-mono ${!sumOk && allocated ? 'text-[#B8561E] font-semibold' : ''}`}>
          {fmtPct(getValue())}
        </div>
      )
    } },
  { id: 'allocated_months_count', header: 'Months', size: 80,
    accessorKey: 'allocated_months_count',
    cell: ({ getValue }) => <div className="text-right font-mono">{getValue() ?? 0}</div> },
  { id: 'locked_months_count', header: 'Locked', size: 80,
    accessorKey: 'locked_months_count',
    cell: ({ getValue }) => <div className="text-right font-mono">{getValue() ?? 0}</div> },
  { id: 'status', header: 'Status', size: 130, enableSorting: false,
    cell: ({ row }) => {
      const r = row.original
      if ((r.allocated_months_count ?? 0) === 0) return <Badge tone="warning">unallocated</Badge>
      if (r.is_allocation_complete) return <Badge tone="success">complete</Badge>
      return <Badge tone="warning">incomplete</Badge>
    } },
]

const PINNED_IDS = ['po_number']

/**
 * Allocation list with TanStack-driven resize, sort, and column visibility/sizing.
 * Click a row's Project cell (link) to open the per-project detail editor.
 */
export function AllocationGrid({
  rows, loading,
  columnVisibility, onColumnVisibilityChange,
  columnSizing, onColumnSizingChange,
  sorting, onSortingChange,
  onRowClick,
}) {
  const containerRef = useRef(null)

  const table = useReactTable({
    data: rows ?? [],
    columns: ALLOCATION_COLUMNS,
    state: {
      columnVisibility: columnVisibility ?? {},
      columnSizing: columnSizing ?? {},
      columnPinning: { left: PINNED_IDS },
      sorting: sorting ?? [],
    },
    onColumnVisibilityChange: (u) => onColumnVisibilityChange?.(typeof u === 'function' ? u(columnVisibility ?? {}) : u),
    onColumnSizingChange:     (u) => onColumnSizingChange?.(typeof u === 'function' ? u(columnSizing ?? {}) : u),
    onSortingChange:          (u) => onSortingChange?.(typeof u === 'function' ? u(sorting ?? []) : u),
    enableColumnResizing: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const columnSizingState = table.getState().columnSizing
  const columnSizeVars = useMemo(() => {
    const headers = table.getFlatHeaders()
    const vars = {}
    headers.forEach(h => { vars[`--col-${h.column.id}-size`] = `${h.getSize()}px` })
    return vars
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnSizingState, columnVisibility])

  const getResizeHandler = useCallback((header) => (e) => {
    e.preventDefault(); e.stopPropagation()
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

  if (loading) return <div className="py-12 text-center text-sm text-muted">Loading allocations…</div>
  if (!rows?.length) return <div className="py-12 text-center text-sm text-muted">No open projects with revenue.</div>

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
                const sortable = header.column.getCanSort()
                const sortDir = header.column.getIsSorted() || null
                return (
                  <th
                    key={header.id}
                    onClick={sortable ? header.column.getToggleSortingHandler() : undefined}
                    className={`group/th relative px-3 py-[10px] text-left text-[10px] font-bold uppercase tracking-[0.08em] whitespace-nowrap overflow-hidden text-ellipsis select-none transition-colors ${
                      sortable ? 'cursor-pointer text-muted hover:text-charcoal hover:bg-surface-muted' : 'text-muted'
                    } ${sortDir ? 'text-charcoal' : ''}`}
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
