import { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Map, ClipboardList, BookOpen, Star,
  LogOut, Menu, X, ChevronRight, Tag
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const NAV_ITEMS = [
  { path: '/admin/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
  { path: '/admin/tours', icon: <Map size={20} />, label: 'Tours' },
  { path: '/admin/categorias', icon: <Tag size={20} />, label: 'Categorías' },
  { path: '/admin/reservaciones', icon: <ClipboardList size={20} />, label: 'Reservaciones' },
  { path: '/admin/blog', icon: <BookOpen size={20} />, label: 'Blog' },
  { path: '/admin/resenas', icon: <Star size={20} />, label: 'Reseñas' },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1A1A1A] transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:relative lg:translate-x-0 flex flex-col`}
      >
        <div className="p-5 border-b border-white/10">
          <Link to="/" className="flex items-center gap-3">
            <img src="/Logo_Naranja.jpeg" alt="" className="h-10 w-10 rounded-xl object-cover" />
            <div>
              <p className="text-white font-bold text-sm">Recorramos México</p>
              <p className="text-gray-500 text-xs">Panel Admin</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? 'bg-[#E8670A] text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.icon}
              {item.label}
              {location.pathname === item.path && <ChevronRight size={16} className="ml-auto" />}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="mb-3 px-4">
            <p className="text-white text-xs font-medium truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 text-sm font-medium transition-colors"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white shadow-sm px-4 py-3 flex items-center gap-3 lg:hidden">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-gray-600">
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <p className="font-bold text-gray-900">Panel de Administración</p>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
