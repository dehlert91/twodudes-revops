import { NavLink } from 'react-router-dom';
import logoHorizontal from '../assets/logo-horizontal.png';

/**
 * AppShell — left sidebar + top chrome for Two Dudes internal app.
 *
 * Usage:
 *   <AppShell><YourPage /></AppShell>
 *
 * The sidebar items render as react-router-dom <NavLink>. Rename or
 * re-order as your routes evolve.
 */
export default function AppShell({ children, userEmail = 'pete@twodudes.com', userInitials = 'PB' }) {
  const navItems = [
    { to: '/revenue',    label: 'Revenue' },
    { to: '/schedule',   label: 'Schedule' },
    { to: '/projects',   label: 'Projects' },
    { to: '/finance',    label: 'Finance' },
    { to: '/benchmarks', label: 'Benchmarks' },
  ];

  return (
    <div className="flex h-screen font-sans text-charcoal bg-surface">
      {/* Sidebar */}
      <aside className="w-[208px] bg-charcoal flex flex-col flex-shrink-0">
        {/* Logo panel — white, for contrast with the horizontal logo art */}
        <div className="bg-surface px-5 py-3.5 flex items-center">
          <img src={logoHorizontal} alt="Two Dudes" className="h-7 w-auto" />
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3.5">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-5 py-2.5 text-small font-medium border-l-[3px] transition-colors ${
                  isActive
                    ? 'bg-orange/10 text-orange-light border-orange font-semibold'
                    : 'text-white/80 border-transparent hover:text-white hover:bg-white/5'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-white/10 font-mono text-[11px] text-white/55">
          {userEmail}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top chrome (orange strip + header) */}
        <div className="td-strip" />
        <header className="h-14 border-b border-line-soft flex items-center px-6 gap-4 flex-shrink-0">
          <div className="flex-1" />
          <input
            type="search"
            placeholder="Search jobs, POs, customers…"
            className="td-focus w-[240px] px-3 py-1.5 text-small bg-surface-muted border border-line rounded-sm text-charcoal placeholder:text-muted"
          />
          <button className="w-8 h-8 rounded-full bg-surface-muted text-muted flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <div className="w-8 h-8 rounded-full bg-orange text-white font-bold text-[12px] flex items-center justify-center">
            {userInitials}
          </div>
        </header>

        {/* Page content slot */}
        <main className="flex-1 overflow-auto bg-surface">
          {children}
        </main>
      </div>
    </div>
  );
}
