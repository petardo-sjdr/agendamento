import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard, Wrench, FileText, CalendarDays,
  Users, Clock, MessageSquare, Star,
  Settings, LogOut, Menu, X
} from 'lucide-react';
import { useState } from 'react';
import './AdminLayout.css';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/dashboard/servicos', icon: Wrench, label: 'Serviços' },
  { to: '/dashboard/orcamentos', icon: FileText, label: 'Orçamentos' },
  { to: '/dashboard/agendamentos', icon: CalendarDays, label: 'Agendamentos' },
  { to: '/dashboard/clientes', icon: Users, label: 'Clientes' },
  { to: '/dashboard/horarios', icon: Clock, label: 'Horários' },
  { to: '/dashboard/templates', icon: MessageSquare, label: 'Templates' },
  { to: '/dashboard/avaliacoes', icon: Star, label: 'Avaliações' },
  { to: '/dashboard/configuracoes', icon: Settings, label: 'Configurações' },
];

export default function AdminLayout() {
  const { loading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-spinner" />
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar glass-panel ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img src="/petardo-logo.png" alt="PETARDO" style={{ width: 36, height: 36, borderRadius: '50%' }} />
            <div>
              <span className="brand-name">PETARDO</span>
              <span className="brand-subtitle">Painel Admin</span>
            </div>
          </div>
          <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item logout-item" onClick={logout}>
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="admin-main">
        <header className="admin-topbar glass-panel">
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="topbar-brand-mobile">
            <img src="/petardo-logo.png" alt="PETARDO" style={{ width: 24, height: 24, borderRadius: '50%' }} />
            <span>PETARDO</span>
          </div>
        </header>

        <main className="admin-content animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
