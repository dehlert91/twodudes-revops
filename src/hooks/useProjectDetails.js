import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, withRetry } from '../lib/supabase'
import { getProjectPeriodActuals, mergePerioActuals } from '../lib/finance/period'

const PAGE_SIZE = 100
const KPI_FIELDS = 'po_number,job_name,total_revenue,est_gp_pct,est_gross_profit,total_hours,total_project_hours,hours_to_date,stage,segment,project_manager,sales_rep,company,customer,team_leader,tracking_mode,specialty_payroll_billing,specialty_rate,division_code,division_name,billing_schedule_type,billing_status,wip_eligible,expected_next_invoice_type,prev_or_new_customer,source_attribution'

function applyMode(q, mode) {
  q = q.neq('stage', 'Combined into other Project')
  if (mode === 'active') return q.neq('stage', 'Benchmark Completed')
  if (mode === 'benchmark') return q.eq('stage', 'Benchmark Completed')
  return q
}

/**
 * @param {'active' | 'benchmark' | 'all'} mode
 * @param {{ start: string, end: string } | null} dateRange  YYYY-MM-DD strings
 */
export function useProjectDetails(mode = 'all', dateRange = null) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [kpiRows, setKpiRows] = useState([])
  const fetchId = useRef(0)

  // Fetch lightweight KPI summary across ALL rows (just 4 numeric fields)
  const fetchKpi = useCallback(async () => {
    let all = []
    let from = 0
    let hasMore = true
    while (hasMore) {
      let q = supabase.from('project_details').select(KPI_FIELDS)
      q = applyMode(q, mode).range(from, from + 999)
      const result = await withRetry(() => q)
      if (result.error) break
      const rows = result.data ?? []
      all = all.concat(rows)
      hasMore = rows.length === 1000
      from += 1000
    }
    setKpiRows(all)
  }, [mode])

  const fetchAll = useCallback(async () => {
    const id = ++fetchId.current
    setLoading(true)
    setError(null)

    // Fetch base project_details rows
    let all = []
    let from = 0
    let hasMore = true
    while (hasMore) {
      let q = supabase.from('project_details').select('*')
      q = applyMode(q, mode)
        .order('estimated_start_date', { ascending: false })
        .range(from, from + 999)
      const result = await withRetry(() => q)
      if (id !== fetchId.current) return // stale
      if (result.error) {
        setError(result.error.message)
        setData([])
        setLoading(false)
        return
      }
      const rows = result.data ?? []
      all = all.concat(rows)
      hasMore = rows.length === 1000
      from += 1000
    }

    // If a date range is active, fetch period actuals and overlay
    if (dateRange?.start && dateRange?.end) {
      try {
        const periodMap = await getProjectPeriodActuals(dateRange.start, dateRange.end)
        all = mergePerioActuals(all, periodMap)
      } catch (e) {
        // Non-fatal: fall back to all-time data if period fetch fails
        console.warn('[useProjectDetails] period actuals fetch failed:', e?.message)
      }
    }

    if (id !== fetchId.current) return // stale after async period fetch
    setData(all)
    setTotalCount(all.length)
    setLoading(false)
  }, [mode, dateRange])

  const goToPage = useCallback((p) => {
    setPage(p)
  }, [])

  const refetch = useCallback(() => {
    fetchAll()
    fetchKpi()
  }, [fetchAll, fetchKpi])

  useEffect(() => {
    setPage(0)
    fetchAll()
    fetchKpi()
  }, [fetchAll, fetchKpi])

  return {
    data,
    setData,
    loading,
    error,
    refetch,
    page,
    goToPage,
    totalCount,
    pageSize: PAGE_SIZE,
    kpiRows,
  }
}
