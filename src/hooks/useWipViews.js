import { useState, useCallback } from 'react'

// storagePrefix lets Billing (and future modules) share this hook with separate storage
const DEFAULT_PREFIX = 'wip'
const DEFAULT_VIEW_NAME = 'Default'

const EMPTY_FILTERS = {
  divisions: [],
  segments: [],
  pms: [],
  dateRange: { start: '', end: '' },
  dynamicFilters: {},
  search: '',
  activeOptional: [],
}

function fromStorage(key) {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? [] }
  catch { return [] }
}

function toStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

/**
 * View save/load for the WIP/Underbilling page.
 * Pass `defaultVisibility` and `defaultSorting` so the Default view always
 * reflects the coded defaults regardless of future column additions.
 */
export function useWipViews({ defaultVisibility = {}, defaultSorting = [], storagePrefix = DEFAULT_PREFIX } = {}) {
  const STORAGE_KEY = `twodudes_${storagePrefix}_views`
  const HIDDEN_KEY  = `twodudes_${storagePrefix}_hidden_views`

  const [savedViews,  setSavedViews]  = useState(() => fromStorage(STORAGE_KEY))
  const [hiddenViews, setHiddenViews] = useState(() => fromStorage(HIDDEN_KEY))
  const [activeViewName, setActiveViewName] = useState(DEFAULT_VIEW_NAME)

  const makeDefaultView = useCallback(() => ({
    name: DEFAULT_VIEW_NAME,
    columnVisibility: defaultVisibility,
    columnSizing: {},
    sorting: defaultSorting,
    filters: { ...EMPTY_FILTERS },
  }), [defaultVisibility, defaultSorting])

  const listViews = useCallback(() => {
    const hidden = new Set(hiddenViews)
    return [DEFAULT_VIEW_NAME, ...savedViews.map(v => v.name)].filter(n => !hidden.has(n))
  }, [savedViews, hiddenViews])

  const listHiddenViews = useCallback(() => {
    const allNames = new Set([DEFAULT_VIEW_NAME, ...savedViews.map(v => v.name)])
    return hiddenViews.filter(n => allNames.has(n))
  }, [savedViews, hiddenViews])

  const getView = useCallback((name) => {
    if (name === DEFAULT_VIEW_NAME) return makeDefaultView()
    return savedViews.find(v => v.name === name) ?? makeDefaultView()
  }, [savedViews, makeDefaultView])

  const saveView = useCallback((name, { columnVisibility, columnSizing, sorting, filters }) => {
    const view = { name, columnVisibility, columnSizing, sorting, filters: { ...EMPTY_FILTERS, ...filters } }
    setSavedViews(prev => {
      const updated = [...prev.filter(v => v.name !== name), view]
      toStorage(STORAGE_KEY, updated)
      return updated
    })
    setActiveViewName(name)
  }, [])

  const deleteView = useCallback((name) => {
    if (name === DEFAULT_VIEW_NAME) return
    setSavedViews(prev => { const u = prev.filter(v => v.name !== name); toStorage(STORAGE_KEY, u); return u })
    setHiddenViews(prev => { const u = prev.filter(n => n !== name); toStorage(HIDDEN_KEY, u); return u })
    setActiveViewName(prev => prev === name ? DEFAULT_VIEW_NAME : prev)
  }, [])

  const hideView = useCallback((name) => {
    if (name === DEFAULT_VIEW_NAME) return
    setHiddenViews(prev => {
      if (prev.includes(name)) return prev
      const u = [...prev, name]; toStorage(HIDDEN_KEY, u); return u
    })
    setActiveViewName(prev => prev === name ? DEFAULT_VIEW_NAME : prev)
  }, [])

  const showView = useCallback((name) => {
    setHiddenViews(prev => { const u = prev.filter(n => n !== name); toStorage(HIDDEN_KEY, u); return u })
  }, [])

  const duplicateView = useCallback((name) => {
    const source = name === DEFAULT_VIEW_NAME ? makeDefaultView() : savedViews.find(v => v.name === name)
    if (!source) return null
    const allNames = new Set([DEFAULT_VIEW_NAME, ...savedViews.map(v => v.name)])
    let copyName = `${source.name} (Copy)`
    let n = 2
    while (allNames.has(copyName)) copyName = `${source.name} (Copy ${n++})`
    const dup = { ...source, name: copyName }
    setSavedViews(prev => { const u = [...prev, dup]; toStorage(STORAGE_KEY, u); return u })
    setActiveViewName(copyName)
    return copyName
  }, [savedViews, makeDefaultView])

  const renameView = useCallback((oldName, newName) => {
    if (oldName === DEFAULT_VIEW_NAME || !newName.trim()) return
    const trimmed = newName.trim()
    setSavedViews(prev => { const u = prev.map(v => v.name === oldName ? { ...v, name: trimmed } : v); toStorage(STORAGE_KEY, u); return u })
    setHiddenViews(prev => {
      if (!prev.includes(oldName)) return prev
      const u = prev.map(n => n === oldName ? trimmed : n); toStorage(HIDDEN_KEY, u); return u
    })
    setActiveViewName(prev => prev === oldName ? trimmed : prev)
  }, [])

  const loadView = useCallback((name) => {
    setActiveViewName(name)
    return getView(name)
  }, [getView])

  return {
    activeViewName,
    listViews,
    listHiddenViews,
    getView,
    saveView,
    deleteView,
    hideView,
    showView,
    duplicateView,
    renameView,
    loadView,
    makeDefaultView,
  }
}
