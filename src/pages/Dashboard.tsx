import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogOut, Calendar } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/');
      } else {
        setLoading(false);
      }
    };
    checkUser();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return <div className="loading-screen">Carregando...</div>;
  }

  return (
    <div className="dashboard-container animate-fade-in">
      <nav className="dashboard-nav glass-panel">
        <div className="nav-brand">
          <Calendar className="brand-icon" />
          <span>Agendamento PETARDO</span>
        </div>
        <button onClick={handleLogout} className="btn-logout">
          <LogOut size={18} />
          Sair
        </button>
      </nav>

      <main className="dashboard-content">
        <header className="page-header">
          <h2>Bem-vindo ao Painel</h2>
          <p>Gerencie seus agendamentos aqui.</p>
        </header>

        <div className="dashboard-grid">
          {/* Placeholder for dashboard cards */}
          <div className="stat-card glass-panel">
            <h3>Agendamentos de Hoje</h3>
            <div className="stat-value">0</div>
          </div>
          <div className="stat-card glass-panel">
            <h3>Total na Semana</h3>
            <div className="stat-value">0</div>
          </div>
          <div className="stat-card glass-panel">
            <h3>Clientes Ativos</h3>
            <div className="stat-value">0</div>
          </div>
        </div>
      </main>
    </div>
  );
}
