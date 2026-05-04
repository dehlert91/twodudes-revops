import { useState, useCallback } from 'react'
import { STANDARD_VIEW_ORDER, STANDARD_VIEW_VISIBILITY, allColumns } from '../components/projects/columns'

const STORAGE_KEY = 'twodudes_project_views'
const HIDDEN_KEY = 'twodudes_hidden_views'
const STANDARD_VIEW_NAME = 'Standard'

const EMPTY_FILTERS = {
  stageFilter: [],
  segmentFilter: [],
  pmFilter: [],
  salesRepFilter: [],
  dynamicFilters: {},
  globalFilter: '',
  dateRange: { start: '', end: '' },
}

function getStandardView() {
  return {
    name: STANDARD_VIEW_NAME,
    columnOrder: STANDARD_VIEW_ORDER,
    columnVisibility: STANDARD_VIEW_VISIBILITY,
    columnSizing: {},
    sorting: [],
    filters: { ...EMPTY_FILTERS },
  }
}

function loadViewsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveViewsToStorage(views) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(views))
}

function loadHiddenFromStorage() {
  try {
    const raw = localStorage.getItem(HIDDEN_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHiddenToStorage(hidden) {
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden))
}

export function useTableViews() {
  const [savedViews, setSavedViews] = useState(() => loadViewsFromStorage())
  const [hiddenViews, setHiddenViews] = useState(() => loadHiddenFromStorage())
  const [activeViewName, setActiveViewName] = useState(STANDARD_VIEW_NAME)

  // Visible tabs = Standard + saved views that aren't hidden
  const listViews = useCallback(() => {
    const hiddenSet = new Set(hiddenViews)
    const all = [STANDARD_VIEW_NAME, ...savedViews.map(v => v.name)]
    return all.filter(n => !hiddenSet.has(n))
  }, [savedViews, hiddenViews])

  // All views including hidden (for the "show" menu)
  const listAllViews = useCallback(() => {
    return [STANDARD_VIEW_NAME, ...savedViews.map(v => v.name)]
  }, [savedViews])

  const listHiddenViews = useCallback(() => {
    const allNames = new Set([STANDARD_VIEW_NAME, ...savedViews.map(v => v.name)])
    return hiddenViews.filter(n => allNames.has(n))
  }, [savedViews, hiddenViews])

  const getView = useCallback((name) => {
    if (name === STANDARD_VIEW_NAME) return getStandardView()
    return savedViews.find(v => v.name === name) ?? getStandardView()
  }, [savedViews])

  const saveView = useCallback((name, { columnOrder, columnVisibility, columnSizing, sorting = [], filters = EMPTY_FILTERS }) => {
    const allIds = allColumns.map(c => c.id)
    const orderSet = new Set(columnOrder)
    const fullOrder = [...columnOrder, ...allIds.filter(id => !orderSet.has(id))]
    const view = { name, columnOrder: fullOrder, columnVisibility, columnSizing, sorting, filters }
    setSavedViews(prev => {
      const updated = prev.filter(v => v.name !== name)
      updated.push(view)
      saveViewsToStorage(updated)
      return updated
    })
    setActiveViewName(name)
  }, [])

  const deleteView = useCallback((name) => {
    if (name === STANDARD_VIEW_NAME) return
    setSavedViews(prev => {
      const updated = prev.filter(v => v.name !== name)
      saveViewsToStorage(updated)
      return updated
    })
    // Also remove from hidden if it was hidden
    setHiddenViews(prev => {
      const updated = prev.filter(n => n !== name)
      saveHiddenToStorage(updated)
      return updated
    })
    if (activeViewName === name) setActiveViewName(STANDARD_VIEW_NAME)
  }, [activeViewName])

  const hideView = useCallback((name) => {
    if (name === STANDARD_VIEW_NAME) return // never hide Standard
    setHiddenViews(prev => {
      if (prev.includes(name)) return prev
      const updated = [...prev, name]
      saveHiddenToStorage(updated)
      return updated
    })
    if (activeViewName === name) setActiveViewName(STANDARD_VIEW_NAME)
  }, [activeViewName])

  const showView = useCallback((name) => {
    setHiddenViews(prev => {
      const updated = prev.filter(n => n !== name)
      saveHiddenToStorage(updated)
      return updated
    })
  }, [])

  const duplicateView = useCallback((name) => {
    const source = name === STANDARD_VIEW_NAME ? getStandardView() : savedViews.find(v => v.name === name)
    if (!source) return
    // Find a unique name like "My View (Copy)", "My View (Copy 2)", etc.
    const allNames = new Set([STANDARD_VIEW_NAME, ...savedViews.map(v => v.name)])
    let copyName = `${source.name} (Copy)`
    let n = 2
    while (allNames.has(copyName)) { copyName = `${source.name} (Copy ${n++})` }
    const dup = { ...source, name: copyName }
    setSavedViews(prev => {
      const updated = [...prev, dup]
      saveViewsToStorage(updated)
      return updated
    })
    setActiveViewName(copyName)
    return copyName
  }, [savedViews])

  const renameView = useCallback((oldName, newName) => {
    if (oldName === STANDARD_VIEW_NAME || !newName.trim()) return
    setSavedViews(prev => {
      const updated = prev.map(v => v.name === oldName ? { ...v, name: newName.trim() } : v)
      saveViewsToStorage(updated)
      return updated
    })
    // Update hidden list if renamed view was hidden
    setHiddenViews(prev => {
      if (!prev.includes(oldName)) return prev
      const updated = prev.map(n => n === oldName ? newName.trim() : n)
      saveHiddenToStorage(updated)
      return updated
    })
    if (activeViewName === oldName) setActiveViewName(newName.trim())
  }, [activeViewName])

  const loadView = useCallback((name) => {
    setActiveViewName(name)
    return getView(name)
  }, [getView])

  const patchView = useCallback((name, patch) => {
    if (name === STANDARD_VIEW_NAME) return
    setSavedViews(prev => {
      const updated = prev.map(v => v.name === name ? { ...v, ...patch } : v)
      saveViewsToStorage(updated)
      return updated
    })
  }, [])

  return {
    activeViewName,
    listViews,
    listAllViews,
    listHiddenViews,
    getView,
    saveView,
    patchView,
    duplicateView,
    deleteView,
    hideView,
    showView,
    renameView,
    loadView,
    standardView: getStandardView(),
  }
}
