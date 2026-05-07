import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Building2, MessageSquare, Calendar } from 'lucide-react';
import './SettingsAdmin.css';

export default function SettingsAdmin() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('admin_settings').select('*');
    if (!error && data) {
      const formatted: any = {};
      data.forEach(item => {
        formatted[item.key] = item;
      });
      setSettings(formatted);
    }
    setLoading(false);
  };

  const handleSave = async (key: string) => {
    setSavingKey(key);
    const item = settings[key];
    const { error } = await supabase
      .from('admin_settings')
      .update({ value: item.value, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    
    if (error) {
      alert('Erro ao salvar configurações.');
    } else {
      // flash success logic could go here
    }
    setSavingKey(null);
  };

  const handleChange = (key: string, field: string, val: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [key]: {
        ...prev[key],
        value: {
          ...prev[key].value,
          [field]: val
        }
      }
    }));
  };

  if (loading) {
    return <div className="placeholder-page">Carregando...</div>;
  }

  const company = settings.company_info?.value || {};
  const bot = settings.botconversa_config?.value || {};
  const booking = settings.booking_config?.value || {};

  return (
    <div className="settings-admin">
      <div className="page-title">
        <div>
          <h1>Configurações</h1>
          <p>Configurações gerais do sistema</p>
        </div>
      </div>

      <div className="settings-grid">
        {/* Company Info */}
        {settings.company_info && (
          <div className="settings-card glass-panel">
            <h3><Building2 size={20} /> Informações da Empresa</h3>
            <p>Dados que aparecerão nos orçamentos e agendamentos.</p>
            
            <div className="settings-form">
              <label>
                Nome Fantasia
                <input 
                  type="text" 
                  value={company.name || ''} 
                  onChange={e => handleChange('company_info', 'name', e.target.value)} 
                />
              </label>
              <label>
                Telefone/WhatsApp Principal
                <input 
                  type="text" 
                  value={company.phone || ''} 
                  onChange={e => handleChange('company_info', 'phone', e.target.value)} 
                />
              </label>
              <label>
                E-mail
                <input 
                  type="email" 
                  value={company.email || ''} 
                  onChange={e => handleChange('company_info', 'email', e.target.value)} 
                />
              </label>
              <button 
                className="btn btn-primary settings-btn-save"
                onClick={() => handleSave('company_info')}
                disabled={savingKey === 'company_info'}
              >
                {savingKey === 'company_info' ? 'Salvando...' : 'Salvar Empresa'}
              </button>
            </div>
          </div>
        )}

        {/* BotConversa */}
        {settings.botconversa_config && (
          <div className="settings-card glass-panel">
            <h3><MessageSquare size={20} /> Integração BotConversa</h3>
            <p>Conecte o sistema ao WhatsApp para enviar mensagens automáticas.</p>
            
            <div className="settings-form">
              <label className="settings-toggle">
                <input 
                  type="checkbox" 
                  checked={bot.is_active || false}
                  onChange={e => handleChange('botconversa_config', 'is_active', e.target.checked)}
                />
                <span className="toggle-slider"></span>
                Ativar Integração
              </label>
              <label>
                Webhook URL (Ação do BotConversa)
                <input 
                  type="text" 
                  value={bot.webhook_url || ''} 
                  onChange={e => handleChange('botconversa_config', 'webhook_url', e.target.value)} 
                  placeholder="https://webhook.botconversa.com.br/..."
                />
              </label>
              <label>
                API Key
                <input 
                  type="password" 
                  value={bot.api_key || ''} 
                  onChange={e => handleChange('botconversa_config', 'api_key', e.target.value)} 
                />
              </label>
              <button 
                className="btn btn-primary settings-btn-save"
                onClick={() => handleSave('botconversa_config')}
                disabled={savingKey === 'botconversa_config'}
              >
                {savingKey === 'botconversa_config' ? 'Salvando...' : 'Salvar Integração'}
              </button>
            </div>
          </div>
        )}

        {/* Booking */}
        {settings.booking_config && (
          <div className="settings-card glass-panel">
            <h3><Calendar size={20} /> Regras de Agendamento</h3>
            <p>Controle prazos e slots de tempo do calendário.</p>
            
            <div className="settings-form">
              <label>
                Dias no futuro disponíveis (ex: 30)
                <input 
                  type="number" 
                  value={booking.advance_days || 30} 
                  onChange={e => handleChange('booking_config', 'advance_days', parseInt(e.target.value))} 
                />
              </label>
              <label>
                Horas de antecedência mínima (ex: 24)
                <input 
                  type="number" 
                  value={booking.min_notice_hours || 24} 
                  onChange={e => handleChange('booking_config', 'min_notice_hours', parseInt(e.target.value))} 
                />
              </label>
              <button 
                className="btn btn-primary settings-btn-save"
                onClick={() => handleSave('booking_config')}
                disabled={savingKey === 'booking_config'}
              >
                {savingKey === 'booking_config' ? 'Salvando...' : 'Salvar Regras'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
