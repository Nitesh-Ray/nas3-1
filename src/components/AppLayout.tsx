import { NavLink, Outlet } from 'react-router-dom'
import { useTheme } from './theme-context'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/dashboard', label: 'Dashboard', end: false },
]

export default function AppLayout() {
  const { theme, toggle } = useTheme()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b-2 border-line bg-paper">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="font-display text-xl tracking-tight">NAS/INSIGHTS</span>
          <div className="flex items-center gap-2">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `border-2 border-line px-3 py-1 font-mono text-sm ${
                    isActive ? 'bg-volt text-black' : 'hover:bg-volt/40'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={toggle}
              className="border-2 border-line px-3 py-1 font-mono text-sm hover:bg-volt/40"
              aria-label="Theme badlo"
            >
              {theme === 'dark' ? 'LIGHT' : 'DARK'}
            </button>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
