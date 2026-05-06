import { Users } from 'lucide-react';
import './PlaceholderPage.css';

export default function CustomersAdmin() {
  return (
    <div className="placeholder-page">
      <div className="page-title">
        <div>
          <h1>Clientes</h1>
          <p>Base de clientes da PETARDO</p>
        </div>
      </div>
      <div className="placeholder-content glass-panel">
        <Users size={48} />
        <h3>Módulo de Clientes</h3>
        <p>Este módulo será implementado na Fase 2 — Após configurar os serviços.</p>
      </div>
    </div>
  );
}
