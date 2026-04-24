import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

const NAV_ITEMS = [
  {
    to: '/revenue', label: 'Revenue',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 4 3 5-6" />
      </svg>
    ),
  },
  {
    to: '/schedule', label: 'Schedule',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4.5" width="18" height="16" rx="2" />
        <path d="M3 9h18M8 2.5v4M16 2.5v4" />
      </svg>
    ),
  },
  {
    to: '/projects', label: 'Projects',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7l9-4 9 4v10l-9 4-9-4V7z" />
        <path d="M3 7l9 4 9-4M12 11v10" />
      </svg>
    ),
  },
  {
    to: '/finance', label: 'Finance',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.5v19M16.5 6H10a3 3 0 000 6h4.5a3 3 0 010 6H7.5" />
      </svg>
    ),
  },
  {
    to: '/benchmarks', label: 'Benchmarks',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 20h18" />
        <path d="M6 20v-7M11 20V9M16 20v-5M21 20V5" />
      </svg>
    ),
  },
]

const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 6l-6 6 6 6" />
  </svg>
)

const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 6l6 6-6 6" />
  </svg>
)

export function AppShell() {
  const [expanded, setExpanded] = useState(true)

  const INK = '#3A2E28'               // warm charcoal for type on peach
  const RAIL = '#F0A882'              // light orange rail
  const PANEL = '#F7CDB1'             // lighter peach expanded panel
  const ACTIVE_BG_RAIL = 'rgba(255,255,255,0.55)'
  const ACTIVE_BORDER = 'rgba(255,255,255,0.8)'
  const ACTIVE_BG_PANEL = 'rgba(255,255,255,0.55)'
  const INACTIVE = 'rgba(58,46,40,0.70)'

  return (
    <div className="flex h-screen font-sans text-charcoal bg-surface">
      {/* Rail */}
      <aside
        className="flex flex-col flex-shrink-0 transition-all duration-200 ease-out"
        style={{
          width: 68,
          background: RAIL,
          color: INK,
          borderRight: '1px solid rgba(58,46,40,0.08)',
        }}
      >
        {/* Logo button */}
        <div className="flex items-center justify-center" style={{ padding: '16px 0 0' }}>
          <div
            className="rounded-full overflow-hidden grid place-items-center"
            style={{
              width: 44, height: 44, background: '#fff',
              boxShadow: '0 2px 6px rgba(58,46,40,0.18), 0 0 0 1px rgba(58,46,40,0.06)',
            }}
          >
            <img src="/assets/logo-circle.png" alt="Two Dudes"
                 className="block" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        </div>

        {/* Icon nav */}
        <nav className="flex flex-col items-center" style={{ gap: 4, marginTop: 24 }}>
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              className="relative grid place-items-center transition-colors"
              style={({ isActive }) => ({
                width: 44, height: 44, borderRadius: 6,
                background: isActive ? ACTIVE_BG_RAIL : 'transparent',
                color: isActive ? INK : INACTIVE,
                border: `1px solid ${isActive ? ACTIVE_BORDER : 'transparent'}`,
              })}
            >
              {({ isActive }) => (
                <>
                  {icon}
                  {isActive && (
                    <span
                      style={{
                        position: 'absolute', left: -1, top: 10, bottom: 10,
                        width: 2, background: INK, borderRadius: '0 2px 2px 0',
                      }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Collapse / expand toggle */}
        <div className="flex justify-center" style={{ paddingBottom: 12 }}>
          <button
            onClick={() => setExpanded(e => !e)}
            title={expanded ? 'Collapse panel' : 'Expand panel'}
            aria-label={expanded ? 'Collapse panel' : 'Expand panel'}
            className="grid place-items-center transition-colors"
            style={{
              width: 32, height: 32, borderRadius: 6,
              background: 'rgba(255,255,255,0.35)',
              color: INK, border: 0, cursor: 'pointer',
            }}
          >
            {expanded ? <ChevronLeft /> : <ChevronRight />}
          </button>
        </div>

        {/* Avatar */}
        <div className="flex justify-center" style={{ paddingBottom: 16 }}>
          <div
            className="rounded-full grid place-items-center font-bold"
            style={{
              width: 32, height: 32, background: INK, color: '#fff',
              fontSize: 12,
            }}
          >
            PB
          </div>
        </div>
      </aside>

      {/* Expanded label panel — slides out */}
      <aside
        className="flex flex-col flex-shrink-0 overflow-hidden transition-all duration-200 ease-out"
        style={{
          width: expanded ? 220 : 0,
          background: PANEL,
          color: INK,
        }}
      >
        <div style={{ width: 220, minWidth: 220 }} className="flex flex-col h-full">
          {/* Spacer to align with logo row */}
          <div style={{ height: 60 }} />

          <nav className="flex-1" style={{ padding: '0 10px' }}>
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className="block transition-colors"
                style={({ isActive }) => ({
                  padding: '10px 14px',
                  margin: '1px 0',
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? INK : INACTIVE,
                  borderRadius: 4,
                  background: isActive ? ACTIVE_BG_PANEL : 'transparent',
                })}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid rgba(58,46,40,0.12)',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600 }}>Pete Bender</div>
            <div
              className="font-mono"
              style={{ fontSize: 11, color: 'rgba(58,46,40,0.55)', marginTop: 2 }}
            >
              pete@twodudes.com
            </div>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-auto bg-surface">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
