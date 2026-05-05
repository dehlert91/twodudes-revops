import { useState, useRef } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

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
    submenu: [
      { to: '/revenue', label: 'Pipeline' },
      { to: '/revenue/allocation', label: 'Allocation' },
    ],
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
    submenu: [
      { to: '/finance', label: 'Dashboard' },
      { to: '/finance/wip', label: 'Unbilled' },
      { to: '/finance/billing', label: 'Billing' },
      { to: '/finance/wip-schedule', label: 'WIP Schedule' },
      { to: '/finance/close', label: 'Month Close' },
    ],
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

const INK = '#3A2E28'
const RAIL = '#F0A882'
const ACTIVE_BG = 'rgba(255,255,255,0.55)'
const ACTIVE_BORDER = 'rgba(255,255,255,0.8)'
const INACTIVE = 'rgba(58,46,40,0.70)'

function NavRow({ item, expanded }) {
  const [hover, setHover] = useState(false)
  const closeTimer = useRef(null)
  const hasSubmenu = !!(item.submenu && item.submenu.length)

  function open() {
    clearTimeout(closeTimer.current)
    setHover(true)
  }
  function scheduleClose() {
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setHover(false), 150)
  }

  return (
    <div
      onMouseEnter={open}
      onMouseLeave={scheduleClose}
      style={{ position: 'relative' }}
    >
      <NavLink
        to={item.to}
        title={!expanded ? item.label : undefined}
        className="flex items-center transition-colors"
        style={({ isActive }) => ({
          height: 44,
          margin: '2px 12px',
          padding: expanded ? '0 12px' : 0,
          justifyContent: expanded ? 'flex-start' : 'center',
          gap: 12,
          borderRadius: 6,
          background: isActive ? ACTIVE_BG : (hover ? 'rgba(255,255,255,0.4)' : 'transparent'),
          color: isActive ? INK : (hover ? INK : INACTIVE),
          border: `1px solid ${isActive ? ACTIVE_BORDER : (hover ? 'rgba(255,255,255,0.5)' : 'transparent')}`,
          fontSize: 14,
          fontWeight: isActive ? 700 : 500,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          cursor: 'pointer',
        })}
      >
        <span style={{ flexShrink: 0, display: 'grid', placeItems: 'center', width: 20, height: 20 }}>
          {item.icon}
        </span>
        {expanded && <span>{item.label}</span>}
      </NavLink>

      {/* Hover flyout: submenu items (or just label tooltip when collapsed) */}
      {hover && (hasSubmenu || !expanded) && (
        <div
          onMouseEnter={open}
          onMouseLeave={scheduleClose}
          style={{
            position: 'absolute',
            left: '100%',
            top: 0,
            marginLeft: 6,
            background: '#fff',
            color: INK,
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(58,46,40,0.18), 0 0 0 1px rgba(58,46,40,0.08)',
            padding: 6,
            minWidth: 180,
            zIndex: 50,
          }}
        >
          {!expanded && (
            <div style={{
              padding: '6px 10px', fontSize: 12, fontWeight: 700,
              color: 'rgba(58,46,40,0.55)', textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              {item.label}
            </div>
          )}
          {hasSubmenu && item.submenu.map(sub => (
            <NavLink
              key={sub.to}
              to={sub.to}
              className="block transition-colors"
              style={({ isActive }) => ({
                padding: '8px 10px',
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? INK : 'rgba(58,46,40,0.78)',
                borderRadius: 4,
                background: isActive ? 'rgba(240,168,130,0.25)' : 'transparent',
              })}
            >
              {sub.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export function AppShell() {
  const { user, signOut } = useAuth()
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="flex h-screen font-sans text-charcoal bg-surface">
      <aside
        className="flex flex-col flex-shrink-0 transition-all duration-200 ease-out"
        style={{
          width: expanded ? 220 : 68,
          background: RAIL,
          color: INK,
          borderRight: '1px solid rgba(58,46,40,0.08)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center" style={{
          padding: '16px 0 0',
          justifyContent: expanded ? 'flex-start' : 'center',
          paddingLeft: expanded ? 22 : 0,
          gap: 10,
        }}>
          <div
            className="rounded-full overflow-hidden grid place-items-center"
            style={{
              width: 44, height: 44, background: '#fff',
              boxShadow: '0 2px 6px rgba(58,46,40,0.18), 0 0 0 1px rgba(58,46,40,0.06)',
              flexShrink: 0,
            }}
          >
            <img src="/assets/logo-circle.png" alt="Two Dudes"
                 className="block" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          {expanded && (
            <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>Two Dudes</div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ marginTop: 24 }}>
          {NAV_ITEMS.map(item => (
            <NavRow key={item.to} item={item} expanded={expanded} />
          ))}
        </nav>

        <div className="flex-1" />

        {/* Collapse / expand toggle */}
        <div className="flex" style={{
          paddingBottom: 12,
          justifyContent: expanded ? 'flex-end' : 'center',
          paddingRight: expanded ? 16 : 0,
        }}>
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

        {/* User block */}
        {expanded ? (
          <div style={{
            padding: '12px 20px 16px',
            borderTop: '1px solid rgba(58,46,40,0.12)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
            </div>
            <div className="font-mono" style={{ fontSize: 11, color: 'rgba(58,46,40,0.55)', marginTop: 2 }}>
              {user?.email}
            </div>
            <button
              onClick={signOut}
              className="mt-2 text-xs font-medium hover:underline"
              style={{ color: 'rgba(58,46,40,0.55)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex justify-center" style={{ paddingBottom: 16 }}>
            <div
              className="rounded-full grid place-items-center font-bold"
              style={{
                width: 32, height: 32, background: INK, color: '#fff', fontSize: 12,
              }}
              title={user?.email}
            >
              {(user?.user_metadata?.full_name || user?.email || '??')
                .split(/[\s@]/)
                .filter(Boolean)
                .slice(0, 2)
                .map(s => s[0].toUpperCase())
                .join('')}
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-auto bg-surface">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
