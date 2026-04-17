import { NavLink, Outlet } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/revenue',    label: 'Revenue' },
  { to: '/schedule',   label: 'Schedule' },
  { to: '/projects',   label: 'Projects' },
  { to: '/finance',    label: 'Finance' },
  { to: '/benchmarks', label: 'Benchmarks' },
]

export function AppShell() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Top nav */}
      <header className="border-b border-gray-light bg-white sticky top-0 z-30">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-6 flex items-center gap-6 h-14">
          {/* Logo / wordmark */}
          <span className="font-display font-bold text-lg text-black tracking-tight shrink-0">
            Two Dudes
          </span>

          <nav className="flex items-center gap-1 overflow-x-auto">
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-orange text-white'
                      : 'text-gray-600 hover:text-black hover:bg-gray-50'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  )
}
