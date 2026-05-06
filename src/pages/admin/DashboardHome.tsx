import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  CalendarDays, FileText, Users, Star,
  TrendingUp, Clock, CheckCircle, AlertTriangle
} from 'lucide-react';
import './DashboardHome.css';

interface DashboardStats {
  todayAppointments: number;
  weekAppointments: number;
  pendingQuotes: number;
  totalCustomers: number;
  avgRating: number;
  completedThisMonth: number;
}

export default function DashboardHome() {
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    weekAppointments: 0,
    pendingQuotes: 0,
    totalCustomers: 0,
    avgRating: 0,
    completedThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      const [
        { count: todayCount },
        { count: weekCount },
        { count: pendingCount },
        { count: customersCount },
        { data: reviewsData },
        { count: completedCount },
      ] = await Promise.all([
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('scheduled_date', today),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('scheduled_date', today).lte('scheduled_date', weekEnd),
        supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('reviews').select('rating'),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('scheduled_date', monthStart),
      ]);

      const avgRating = reviewsData && reviewsData.length > 0
        ? reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length
        : 0;

      setStats({
        todayAppointments: todayCount || 0,
        weekAppointments: weekCount || 0,
        pendingQuotes: pendingCount || 0,
        totalCustomers: customersCount || 0,
        avgRating: Math.round(avgRating * 10) / 10,
        completedThisMonth: completedCount || 0,
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      icon: CalendarDays,
      label: 'Agendamentos Hoje',
      value: stats.todayAppointments,
      color: '#818cf8',
      bgColor: 'rgba(129, 140, 248, 0.1)',
    },
    {
      icon: Clock,
      label: 'Próximos 7 Dias',
      value: stats.weekAppointments,
      color: '#34d399',
      bgColor: 'rgba(52, 211, 153, 0.1)',
    },
    {
      icon: FileText,
      label: 'Orçamentos Pendentes',
      value: stats.pendingQuotes,
      color: '#fbbf24',
      bgColor: 'rgba(251, 191, 36, 0.1)',
    },
    {
      icon: Users,
      label: 'Total de Clientes',
      value: stats.totalCustomers,
      color: '#60a5fa',
      bgColor: 'rgba(96, 165, 250, 0.1)',
    },
    {
      icon: Star,
      label: 'Avaliação Média',
      value: stats.avgRating > 0 ? `${stats.avgRating} ★` : '—',
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.1)',
    },
    {
      icon: CheckCircle,
      label: 'Concluídos no Mês',
      value: stats.completedThisMonth,
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
    },
  ];

  return (
    <div className="dashboard-home">
      <div className="page-title">
        <h1>Dashboard</h1>
        <p>Visão geral do sistema PETARDO</p>
      </div>

      <div className="stats-grid">
        {cards.map(card => (
          <div key={card.label} className="stat-card glass-panel">
            <div className="stat-icon" style={{ background: card.bgColor }}>
              <card.icon size={22} style={{ color: card.color }} />
            </div>
            <div className="stat-info">
              <span className="stat-label">{card.label}</span>
              <span className="stat-value" style={{ color: card.color }}>
                {loading ? '...' : card.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h2>Ações Rápidas</h2>
        <div className="quick-actions-grid">
          <a href="/dashboard/servicos" className="quick-action glass-panel">
            <TrendingUp size={20} />
            <span>Gerenciar Serviços</span>
          </a>
          <a href="/dashboard/agendamentos" className="quick-action glass-panel">
            <CalendarDays size={20} />
            <span>Ver Agendamentos</span>
          </a>
          <a href="/dashboard/orcamentos" className="quick-action glass-panel">
            <FileText size={20} />
            <span>Orçamentos</span>
          </a>
          <a href="/dashboard/configuracoes" className="quick-action glass-panel">
            <AlertTriangle size={20} />
            <span>Configurações</span>
          </a>
        </div>
      </div>
    </div>
  );
}
