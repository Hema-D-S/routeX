import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Home, Clock, User, LogOut, Car, MapPin } from 'lucide-react'

const Layout = () => {
  const { user, logout } = useAuth()
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  const riderNavItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/book', icon: MapPin, label: 'Book Ride' },
    { path: '/history', icon: Clock, label: 'History' },
    { path: '/profile', icon: User, label: 'Profile' },
  ]

  const driverNavItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/history', icon: Clock, label: 'History' },
    { path: '/profile', icon: User, label: 'Profile' },
  ]

  const navItems = user?.role === 'driver' ? driverNavItems : riderNavItems

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-black text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Car className="h-8 w-8" />
            <span className="text-xl font-bold">Uber Clone</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300">
              {user?.firstName} ({user?.role})
            </span>
            <button 
              onClick={logout}
              className="flex items-center gap-1 text-gray-300 hover:text-white transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden">
        <div className="flex justify-around py-2">
          {navItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center p-2 ${
                isActive(path) ? 'text-black' : 'text-gray-400'
              }`}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs mt-1">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default Layout
