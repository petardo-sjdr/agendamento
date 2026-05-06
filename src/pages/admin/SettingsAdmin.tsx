import { Settings } from 'lucide-react';
import './PlaceholderPage.css';

export default function SettingsAdmin() {
  return (
    <div className="placeholder-page">
      <div className="page-title">
        <div>
          <h1>Configurações</h1>
          <p>Configurações gerais do sistema</p>
        </div>
      </div>
      <div className="placeholder-content glass-panel">
        <Settings size={48} />
        <h3>Módulo de Configurações</h3>
        <p>Este módulo será implementado na Fase 8 — Configurações Finais.</p>
      </div>
    </div>
  );
}
