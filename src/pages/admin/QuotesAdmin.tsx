import { FileText } from 'lucide-react';
import './PlaceholderPage.css';

export default function QuotesAdmin() {
  return (
    <div className="placeholder-page">
      <div className="page-title">
        <div>
          <h1>Orçamentos</h1>
          <p>Gerencie os orçamentos recebidos</p>
        </div>
      </div>
      <div className="placeholder-content glass-panel">
        <FileText size={48} />
        <h3>Módulo de Orçamentos</h3>
        <p>Este módulo será implementado na Fase 2 — Após configurar os serviços e campos.</p>
      </div>
    </div>
  );
}
