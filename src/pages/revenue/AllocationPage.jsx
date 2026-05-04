import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { KpiCard, Button } from '../../components/ui'
import { MultiSelectDropdown } from '../../components/ui/MultiSelectDropdown'
import { AllocationGrid, ALLOCATION_COLUMNS } from '../../components/finance/AllocationGrid'
import { ColumnsDropdown } from '../../components/finance/ColumnsDropdown'
import { useTablePrefs } from '../../components/finance/useTablePrefs'
import { getAllocationProjects, getFinanceFilterOptions } from '../../lib/finance/queries'
import { recomputeAllOpenAllocations } from '../../lib/finance/actions'
import { useAuth } from '../../contexts/AuthContext'

const DEFAULT_VISIBILITY = {} // show all by default
const ALWAYS_VISIBLE = ['po_number']

const PERMANENT_FILTER_KEYS = new Set(['division', 'segment'])

const ADD_FILTER_OPTIONS = [
  { key: 'stage',              label: 'Stage' },
  { key: 'allocation_method',  label: 'Method' },
  { key: 'allocation_pattern', label: 'Pattern' },
]

function fmtCurrency(n) {
  if (n == null || isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export function AllocationPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [divisions, setDivisions] = useState([])
  const [segments, setSegments] = useState([])
  const [onlyIncomplete, setOnlyIncomplete] = useState(false)
  const [opts, setOpts] = useState({ divisions: [], segments: [] })

  const [batchRunning, setBatchRunning] = useState(false)
  const [batchResult, setBatchResult] = useState(null)

  // Search (debounced)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 200)
    return () => clearTimeout(t)
  }, [searchInput])

  // Dynamic filters
  const [dynamicFilters, setDynamicFilters] = useState({})
  const [activeOptional, setActiveOptional] = useState([])
  const [addOpen, setAddOpen] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const addRef = useRef(null)
  const addInputRef = useRef(null)

  useEffect(() => {
    function close(e) { if (addRef.current && !addRef.current.contains(e.target)) { setAddOpen(false); setAddSearch('') } }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  useEffect(() => { if (addOpen && addInputRef.current) addInputRef.current.focus() }, [addOpen])

  // Table prefs
  const [prefs, patchPrefs] = useTablePrefs('revenue.allocation', {
    columnVisibility: DEFAULT_VISIBILITY,
    columnSizing: {},
    sorting: [{ id: 'estimated_start_date', desc: false }],
  })

  useEffect(() => {
    getFinanceFilterOptions().then(setOpts).catch(e => console.error('[allocation opts]', e?.message))
  }, [])

  const refetch = useCallback(() => {
    setLoading(true)
    setError(null)
    return getAllocationProjects({ divisions, segments, onlyIncomplete })
      .then(data => setRows(data))
      .catch(e => setError(e?.message || String(e)))
      .finally(() => setLoading(false))
  }, [divisions, segments, onlyIncomplete])

  useEffect(() => { refetch() }, [refetch])

  // Option lists
  const dynamicOptions = useMemo(() => {
    const out = {}
    for (const key of activeOptional) {
      const set = new Set()
      for (const r of rows) {
        const v = r[key]
        if (v !== null && v !== undefined && v !== '') set.add(String(v))
      }
      out[key] = [...set].sort()
    }
    return out
  }, [rows, activeOptional])

  const availableAddOptions = useMemo(() => {
    const taken = new Set([...activeOptional, ...PERMANENT_FILTER_KEYS])
    let opts = ADD_FILTER_OPTIONS.filter(o => !taken.has(o.key))
    if (addSearch) {
      const q = addSearch.toLowerCase()
      opts = opts.filter(o => o.label.toLowerCase().includes(q))
    }
    return opts
  }, [activeOptional, addSearch])

  function handleAddFilter(key) { setActiveOptional(prev => [...prev, key]); setAddOpen(false); setAddSearch('') }
  function handleRemoveFilter(key) {
    setActiveOptional(prev => prev.filter(k => k !== key))
    setDynamicFilters(prev => { const { [key]: _, ...rest } = prev; return rest })
  }
  function handleDynamicFilterChange(key, vals) {
    setDynamicFilters(prev => ({ ...prev, [key]: vals }))
  }

  // Filtering
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      if (q && !(
        (r.po_number ?? '').toLowerCase().includes(q) ||
        (r.job_name  ?? '').toLowerCase().includes(q)
      )) return false
      for (const [key, vals] of Object.entries(dynamicFilters)) {
        if (vals.length > 0 && !vals.includes(String(r[key] ?? ''))) return false
      }
      return true
    })
  }, [rows, search, dynamicFilters])

  const totals = useMemo(() => {
    return filteredRows.reduce((acc, r) => ({
      count:        acc.count + 1,
      complete:     acc.complete + (r.is_allocation_complete ? 1 : 0),
      unallocated:  acc.unallocated + ((r.allocated_months_count ?? 0) === 0 ? 1 : 0),
      revenue:      acc.revenue + Number(r.total_revenue ?? 0),
    }), { count: 0, complete: 0, unallocated: 0, revenue: 0 })
  }, [filteredRows])

  async function handleRecomputeAll() {
    if (!confirm('Recompute allocations for all open projects? This may take a moment for hundreds of projects.')) return
    setBatchRunning(true)
    setBatchResult(null)
    try {
      const result = await recomputeAllOpenAllocations(user?.id ?? null)
      setBatchResult({ ok: true, count: result.length })
      await refetch()
    } catch (e) {
      setBatchResult({ ok: false, msg: e?.message || String(e) })
    } finally {
      setBatchRunning(false)
      setTimeout(() => setBatchResult(null), 6000)
    }
  }

  const handleExportCsv = useCallback(() => {
    const visibleColIds = ALLOCATION_COLUMNS.map(c => c.id).filter(id => prefs.columnVisibility[id] !== false && id !== 'status')
    const headerLabels = visibleColIds.map(id => {
      const def = ALLOCATION_COLUMNS.find(c => c.id === id)
      return typeof def?.header === 'string' ? def.header : id
    })
    const esc = v => {
      const s = v == null ? '' : String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const lines = [headerLabels.map(esc).join(',')]
    for (const r of filteredRows) {
      const cells = visibleColIds.map(id => {
        if (id === 'po_number') return `${r.po_number} — ${r.job_name ?? ''}`.trim()
        return r[id]
      })
      lines.push(cells.map(esc).join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `revenue_allocation_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [filteredRows, prefs.columnVisibility])

  const fmt = n => n.toLocaleString()
  const fmtPct = (a, b) => b === 0 ? '—' : `${Math.round((a / b) * 100)}%`

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold text-charcoal">Revenue Allocation</h1>
        {loading && <span className="text-sm text-muted">Loading…</span>}
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <KpiCard label="Open Projects" value={fmt(totals.count)} sub="with revenue > 0" />
        <KpiCard
          label="Complete Allocations"
          value={`${fmt(totals.complete)} / ${fmt(totals.count)}`}
          sub={fmtPct(totals.complete, totals.count)}
        />
        <KpiCard
          label="Unallocated"
          value={fmt(totals.unallocated)}
          sub="no monthly rows yet"
          subTone={totals.unallocated > 0 ? 'warning' : 'muted'}
        />
        <KpiCard label="Total Revenue at Stake" value={fmtCurrency(totals.revenue)} />
      </div>

      {/* Search */}
      <div className="mb-3">
        <input
          type="search"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Search PO or job name…"
          className="w-full border border-line-strong rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
        />
      </div>

      {/* Filters + Action buttons */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <MultiSelectDropdown label="Division" options={opts.divisions} selected={divisions} onChange={setDivisions} />
        <MultiSelectDropdown label="Segment"  options={opts.segments}  selected={segments}  onChange={setSegments} />
        <label className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted hover:text-charcoal cursor-pointer">
          <input
            type="checkbox"
            checked={onlyIncomplete}
            onChange={e => setOnlyIncomplete(e.target.checked)}
            className="accent-orange"
          />
          Incomplete only
        </label>

        {/* Dynamic filters */}
        {activeOptional.map(key => {
          const label = ADD_FILTER_OPTIONS.find(o => o.key === key)?.label || key
          return (
            <MultiSelectDropdown
              key={key}
              label={label}
              options={dynamicOptions[key] || []}
              selected={dynamicFilters[key] || []}
              onChange={vals => handleDynamicFilterChange(key, vals)}
              onRemove={() => handleRemoveFilter(key)}
            />
          )
        })}

        {/* + Add Filter */}
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
                {availableAddOptions.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted">No filters left to add.</p>
                ) : (
                  availableAddOptions.map(o => (
                    <button
                      key={o.key}
                      onClick={() => handleAddFilter(o.key)}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-subtle"
                    >
                      {o.label}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1" />

        <ColumnsDropdown
          columns={ALLOCATION_COLUMNS}
          visibility={prefs.columnVisibility}
          onChange={(v) => patchPrefs({ columnVisibility: v })}
          alwaysVisible={ALWAYS_VISIBLE}
        />

        <Button variant="ghost" size="sm" onClick={handleExportCsv}>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </span>
        </Button>

        <Button variant="ghost" size="sm" onClick={refetch} disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </Button>

        <Button variant="primary" size="sm" onClick={handleRecomputeAll} disabled={batchRunning}>
          {batchRunning ? 'Recomputing…' : '↻ Recompute All Open'}
        </Button>
      </div>

      {error
        ? <p className="text-sm text-error py-12 text-center">Failed to load: {error}</p>
        : <AllocationGrid
            rows={filteredRows}
            loading={loading}
            columnVisibility={prefs.columnVisibility}
            onColumnVisibilityChange={(v) => patchPrefs({ columnVisibility: v })}
            columnSizing={prefs.columnSizing}
            onColumnSizingChange={(s) => patchPrefs({ columnSizing: s })}
            sorting={prefs.sorting}
            onSortingChange={(s) => patchPrefs({ sorting: s })}
          />
      }

      {batchResult && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-elevated text-sm z-50 ${
            batchResult.ok ? 'bg-charcoal text-white' : 'bg-error text-white'
          }`}
        >
          {batchResult.ok
            ? `Recomputed ${batchResult.count} projects.`
            : `Recompute failed: ${batchResult.msg}`}
        </div>
      )}
    </div>
  )
}
