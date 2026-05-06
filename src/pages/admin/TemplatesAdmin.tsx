import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { NotificationTemplate } from '../../lib/types';
import {
  MessageSquare, Edit, Save, X, ToggleLeft, ToggleRight,
  Bell, Clock, Star, RefreshCw, CheckCircle, XCircle, FileText
} from 'lucide-react';
import './TemplatesAdmin.css';

const typeIcons: Record<string, React.ComponentType<{ size?: number }>> = {
  quote_ready: FileText,
  appointment_confirmed: CheckCircle,
  reminder_24h: Clock,
  reminder_2h: Bell,
  review_request: Star,
  followup_6m: RefreshCw,
  quote_approved: CheckCircle,
  quote_rejected: XCircle,
};

const typeDescriptions: Record<string, string> = {
  quote_ready: 'Enviada quando o orçamento está pronto',
  appointment_confirmed: 'Enviada após confirmar o agendamento',
  reminder_24h: 'Lembrete 24 horas antes do serviço',
  reminder_2h: 'Lembrete 2 horas antes do serviço',
  review_request: 'Solicita avaliação 24h após o serviço',
  followup_6m: 'Recontato 6 meses após o serviço',
  quote_approved: 'Enviada quando o cliente aprova o orçamento',
  quote_rejected: 'Enviada quando o cliente recusa o orçamento',
};

export default function TemplatesAdmin() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const { data } = await supabase
      .from('notification_templates')
      .select('*')
      .order('type');
    setTemplates(data || []);
    setLoading(false);
  };

  const startEdit = (template: NotificationTemplate) => {
    setEditingId(template.id);
    setEditText(template.template_text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    await supabase
      .from('notification_templates')
      .update({ template_text: editText })
      .eq('id', id);
    setTemplates(prev =>
      prev.map(t => t.id === id ? { ...t, template_text: editText } : t)
    );
    setEditingId(null);
    setSaving(false);
  };

  const toggleActive = async (template: NotificationTemplate) => {
    await supabase
      .from('notification_templates')
      .update({ is_active: !template.is_active })
      .eq('id', template.id);
    setTemplates(prev =>
      prev.map(t => t.id === template.id ? { ...t, is_active: !t.is_active } : t)
    );
  };

  if (loading) return <div className="loading-state">Carregando...</div>;

  return (
    <div className="templates-admin">
      <div className="page-title">
        <div>
          <h1>Templates de Mensagens</h1>
          <p>Edite os textos das notificações enviadas pelo WhatsApp</p>
        </div>
      </div>

      <div className="templates-tip glass-panel">
        <MessageSquare size={16} />
        <p>
          Use <code>{'{{variavel}}'}</code> para inserir dados dinâmicos.
          Variáveis disponíveis: <code>{'{{nome}}'}</code>, <code>{'{{servico}}'}</code>,
          <code>{'{{data}}'}</code>, <code>{'{{hora}}'}</code>, <code>{'{{endereco}}'}</code>,
          <code>{'{{link}}'}</code>, <code>{'{{valor}}'}</code>
        </p>
      </div>

      <div className="templates-list">
        {templates.map(template => {
          const Icon = typeIcons[template.type] || MessageSquare;
          const isEditing = editingId === template.id;

          return (
            <div key={template.id} className={`template-card glass-panel ${!template.is_active ? 'inactive' : ''}`}>
              <div className="template-header">
                <div className="template-title">
                  <div className="template-icon-badge">
                    <Icon size={18} />
                  </div>
                  <div>
                    <h3>{template.template_name}</h3>
                    <span className="template-desc">{typeDescriptions[template.type] || template.type}</span>
                  </div>
                </div>
                <div className="template-actions">
                  <button className="icon-btn" onClick={() => toggleActive(template)}>
                    {template.is_active
                      ? <ToggleRight size={18} style={{ color: '#34d399' }} />
                      : <ToggleLeft size={18} />
                    }
                  </button>
                  {!isEditing && (
                    <button className="icon-btn" onClick={() => startEdit(template)}>
                      <Edit size={16} />
                    </button>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="template-edit">
                  <textarea
                    className="input-field textarea-field template-textarea"
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={5}
                  />
                  <div className="template-edit-actions">
                    <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>
                      <X size={14} /> Cancelar
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => saveEdit(template.id)} disabled={saving}>
                      <Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="template-preview">
                  <p>{template.template_text}</p>
                </div>
              )}

              <div className="template-vars">
                {(template.variables_available || []).map((v: string) => (
                  <span key={v} className="badge badge-neutral">{`{{${v}}}`}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
