import { CalendarDays } from 'lucide-react';
import './PlaceholderPage.css';

export default function AppointmentsAdmin() {
  return (
    <div className="placeholder-page">
      <div className="page-title">
        <div>
          <h1>Agendamentos</h1>
          <p>Visualize e gerencie todos os agendamentos</p>
        </div>
      </div>
      <div className="placeholder-content glass-panel">
        <CalendarDays size={48} />
        <h3>Módulo de Agendamentos</h3>
        <p>Este módulo será implementado na Fase 4 — Após o motor de orçamento.</p>
      </div>
    </div>
  );
}
