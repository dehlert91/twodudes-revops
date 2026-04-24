import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, withRetry } from '../lib/supabase'

const PAGE_SIZE = 100
const KPI_FIELDS = 'po_number,job_name,total_revenue,est_gp_pct,pct_complete,total_hours,stage,segment,project_manager,sales_rep,company,customer,team_leader,tracking_mode'

function applyMode(q, mode) {
  if (mode === 'active') return q.neq('stage', 'Benchmark Completed')
  if (mode === 'benchmark') return q.eq('stage', 'Benchmark Completed')
  return q
}

/**
 * @param {'active' | 'benchmark' | 'all'} mode
 */
export function useProjectDetails(mode = 'all') {
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

    setData(all)
    setTotalCount(all.length)
    setLoading(false)
  }, [mode])

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
