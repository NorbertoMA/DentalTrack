import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/registro', label: 'Registro', icon: '📋' },
  { to: '/ajustes', label: 'Ajustes', icon: '⚙️' },
  { to: '/informes', label: 'Informes', icon: '📄' },
]

export default function Layout() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="bg-dental-blue text-white px-4 py-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-tight">🦷 DentalTrack</h1>
        <button 
          onClick={logout}
          className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 border border-white/20"
        >
          <span>🚪</span> Cerrar sesión
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20 px-4 pt-4">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 max-w-lg mx-auto">
        <ul className="flex">
          {navItems.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                    isActive ? 'text-dental-blue' : 'text-gray-400'
                  }`
                }
              >
                <span className="text-xl">{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
