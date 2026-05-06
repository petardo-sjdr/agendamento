import { Star } from 'lucide-react';
import './PlaceholderPage.css';

export default function ReviewsAdmin() {
  return (
    <div className="placeholder-page">
      <div className="page-title">
        <div>
          <h1>Avaliações</h1>
          <p>Avaliações recebidas dos clientes</p>
        </div>
      </div>
      <div className="placeholder-content glass-panel">
        <Star size={48} />
        <h3>Módulo de Avaliações</h3>
        <p>Este módulo será implementado na Fase 7 — Automações.</p>
      </div>
    </div>
  );
}
