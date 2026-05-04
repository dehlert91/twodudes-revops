/**
 * Stacked-chevron sort indicator. Faded when unsorted, orange when active.
 * Use inside table headers to give a visible sortable affordance.
 *
 * @param {{ direction: 'asc' | 'desc' | null }} props
 */
export function SortIndicator({ direction }) {
  const upActive = direction === 'asc'
  const downActive = direction === 'desc'
  return (
    <span className="inline-flex flex-col leading-none ml-1 -my-0.5" aria-hidden="true">
      <svg width="8" height="5" viewBox="0 0 8 5" className={upActive ? 'text-orange' : 'text-line-strong'}>
        <path d="M0 5l4-5 4 5z" fill="currentColor" />
      </svg>
      <svg width="8" height="5" viewBox="0 0 8 5" className={downActive ? 'text-orange' : 'text-line-strong'}>
        <path d="M0 0l4 5 4-5z" fill="currentColor" />
      </svg>
    </span>
  )
}
