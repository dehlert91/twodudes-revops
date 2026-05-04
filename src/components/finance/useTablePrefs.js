import { useEffect, useState } from 'react'

/**
 * Per-table preferences: columnVisibility, columnSizing, columnOrder.
 * Persists to localStorage under `tdr.tablePrefs.{tableId}`.
 *
 * Defaults are applied on first load; user changes override and persist.
 */
export function useTablePrefs(tableId, defaults = {}) {
  const KEY = `tdr.tablePrefs.${tableId}`
  const [prefs, setPrefs] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? { ...defaults, ...JSON.parse(raw) } : defaults
    } catch { return defaults }
  })

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)) } catch {}
  }, [KEY, prefs])

  function patch(partial) { setPrefs(prev => ({ ...prev, ...partial })) }

  return [prefs, patch, setPrefs]
}
