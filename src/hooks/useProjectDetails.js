import { useState, useEffect, useCallback } from 'react'
import { supabase, withRetry } from '../lib/supabase'

export function useProjectDetails() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const result = await withRetry(() =>
      supabase
        .from('project_details')
        .select('*')
        .order('estimated_start_date', { ascending: false })
    )

    if (result.error) {
      setError(result.error.message)
      setData([])
    } else {
      setData(result.data ?? [])
    }

    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { data, setData, loading, error, refetch: fetch }
}
