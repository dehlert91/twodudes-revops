import { useState, useCallback } from 'react'
import { STANDARD_VIEW_ORDER, STANDARD_VIEW_VISIBILITY, allColumns } from '../components/projects/columns'

const STORAGE_KEY = 'twodudes_project_views'
const STANDARD_VIEW_NAME = 'Standard'

function getStandardView() {
  return {
    name: STANDARD_VIEW_NAME,
    columnOrder: STANDARD_VIEW_ORDER,
    columnVisibility: STANDARD_VIEW_VISIBILITY,
    columnSizing: {},
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

export function useTableViews() {
  const [savedViews, setSavedViews] = useState(() => loadViewsFromStorage())
  const [activeViewName, setActiveViewName] = useState(STANDARD_VIEW_NAME)

  const listViews = useCallback(() => {
    return [STANDARD_VIEW_NAME, ...savedViews.map(v => v.name)]
  }, [savedViews])

  const getView = useCallback((name) => {
    if (name === STANDARD_VIEW_NAME) return getStandardView()
    return savedViews.find(v => v.name === name) ?? getStandardView()
  }, [savedViews])

  const saveView = useCallback((name, { columnOrder, columnVisibility, columnSizing }) => {
    // Ensure columnOrder includes ALL column IDs (append any missing ones)
    const allIds = allColumns.map(c => c.id)
    const orderSet = new Set(columnOrder)
    const fullOrder = [...columnOrder, ...allIds.filter(id => !orderSet.has(id))]
    const view = { name, columnOrder: fullOrder, columnVisibility, columnSizing }
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
    if (activeViewName === name) setActiveViewName(STANDARD_VIEW_NAME)
  }, [activeViewName])

  const loadView = useCallback((name) => {
    setActiveViewName(name)
    return getView(name)
  }, [getView])

  return {
    activeViewName,
    listViews,
    getView,
    saveView,
    deleteView,
    loadView,
    standardView: getStandardView(),
  }
}
