import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ProjectAllocationDetail } from './ProjectAllocationDetail'

/**
 * Slide-over panel for Revenue Allocation detail.
 * Same UX pattern as ProjectDetailPanel — backdrop click + Escape close, slides in from right.
 *
 * Wraps the existing ProjectAllocationDetail body so we share KPIs/ratchet banner/grid/legend
 * with the standalone /revenue/allocation/:po page.
 */
export function AllocationDetailPanel({
  project, months,
  onClose,
  onEditCell,
  onToggleActive,
  onRecompute,
  recomputing,
  loading,
}) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!project && !loading) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className="fixed right-0 top-0 h-full w-[1000px] max-w-full bg-surface
                   z-50 shadow-elevated flex flex-col"
      >
        {/* Header strip — close + open in full page */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-line">
          <div className="text-xs text-muted">
            Revenue Allocation
          </div>
          <div className="flex items-center gap-2">
            {project?.po_number && (
              <Link
                to={`/revenue/allocation/${encodeURIComponent(project.po_number)}`}
                className="text-xs text-muted hover:text-orange transition-colors"
                title="Open as full page"
              >
                Open in full page ↗
              </Link>
            )}
            <button
              onClick={onClose}
              className="grid place-items-center w-8 h-8 rounded hover:bg-surface-muted transition-colors"
              aria-label="Close"
              title="Close (Esc)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && !project ? (
            <p className="py-12 text-center text-sm text-muted">Loading allocation…</p>
          ) : project ? (
            <ProjectAllocationDetail
              project={project}
              months={months}
              onEditCell={onEditCell}
              onToggleActive={onToggleActive}
              onRecompute={onRecompute}
              recomputing={recomputing}
            />
          ) : null}
        </div>
      </aside>
    </>
  )
}
