import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Service, PricingRule, ServiceField } from '../../lib/types';
import { ArrowLeft, Plus, Edit, Trash2, DollarSign, ToggleLeft, ToggleRight } from 'lucide-react';
import './PricingAdmin.css';

export default function PricingAdmin() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const [service, setService] = useState<Service | null>(null);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<PricingRule> | null>(null);
  const [fields, setFields] = useState<ServiceField[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (serviceId) loadData();
  }, [serviceId]);

  const loadData = async () => {
    const [{ data: svc }, { data: rls }, { data: flds }] = await Promise.all([
      supabase.from('services').select('*').eq('id', serviceId).single(),
      supabase.from('pricing_rules').select('*').eq('service_id', serviceId).order('priority'),
      supabase.from('service_fields').select('*').eq('service_id', serviceId).order('display_order'),
    ]);
    setService(svc);
    setRules(rls || []);
    setFields(flds || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditingRule({
      service_id: serviceId,
      customer_type: 'both',
      rule_name: '',
      rule_description: '',
      rule_logic: {},
      base_price: 0,
      priority: rules.length + 1,
      is_active: true,
    });
    setEditModal(true);
  };

  const openEdit = (rule: PricingRule) => {
    setEditingRule({ ...rule });
    setEditModal(true);
  };

  const handleSave = async () => {
    if (!editingRule?.rule_name) return;
    setSaving(true);

    const payload = {
      service_id: serviceId,
      customer_type: editingRule.customer_type || 'both',
      rule_name: editingRule.rule_name,
      rule_description: editingRule.rule_description || '',
      rule_logic: editingRule.rule_logic || {},
      base_price: editingRule.base_price ?? 0,
      priority: editingRule.priority ?? 0,
      is_active: editingRule.is_active ?? true,
    };

    if (editingRule.id) {
      await supabase.from('pricing_rules').update(payload).eq('id', editingRule.id);
    } else {
      await supabase.from('pricing_rules').insert(payload);
    }

    setSaving(false);
    setEditModal(false);
    setEditingRule(null);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta regra de preço?')) return;
    await supabase.from('pricing_rules').delete().eq('id', id);
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const toggleActive = async (rule: PricingRule) => {
    await supabase.from('pricing_rules').update({ is_active: !rule.is_active }).eq('id', rule.id);
    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r));
  };

  const typeLabels: Record<string, string> = {
    both: 'Ambos',
    residential: 'Residencial',
    commercial: 'Comercial',
  };

  if (loading) return <div className="loading-state">Carregando...</div>;

  return (
    <div className="pricing-admin">
      <div className="page-title">
        <div>
          <button className="btn-back" onClick={() => navigate('/dashboard/servicos')}>
            <ArrowLeft size={18} /> Voltar
          </button>
          <h1>Preços: {service?.name}</h1>
          <p>Configure as regras de precificação para este serviço</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} /> Nova Regra
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="empty-state glass-panel">
          <DollarSign size={48} />
          <h3>Nenhuma regra de preço</h3>
          <p>Adicione regras para calcular orçamentos automaticamente</p>
        </div>
      ) : (
        <div className="rules-list">
          {rules.map(rule => (
            <div key={rule.id} className={`rule-card glass-panel ${!rule.is_active ? 'inactive' : ''}`}>
              <div className="rule-card-left">
                <div className="rule-price-badge">
                  <DollarSign size={18} />
                  <span>{Number(rule.base_price) === -1 ? 'Orçamento Manual' : `R$ ${Number(rule.base_price).toFixed(2)}`}</span>
                </div>
                <div className="rule-info">
                  <h4>{rule.rule_name}</h4>
                  {rule.rule_description && <p>{rule.rule_description}</p>}
                  <div className="field-meta">
                    <span className={`badge ${
                      rule.customer_type === 'both' ? 'badge-info' :
                      rule.customer_type === 'residential' ? 'badge-success' : 'badge-warning'
                    }`}>
                      {typeLabels[rule.customer_type]}
                    </span>
                    <span className="badge badge-neutral">Prioridade: {rule.priority}</span>
                    <span className={`badge ${rule.is_active ? 'badge-success' : 'badge-muted'}`}>
                      {rule.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="field-card-actions">
                <button className="icon-btn" onClick={() => toggleActive(rule)}>
                  {rule.is_active ? <ToggleRight size={18} style={{ color: '#34d399' }} /> : <ToggleLeft size={18} />}
                </button>
                <button className="icon-btn" onClick={() => openEdit(rule)}><Edit size={16} /></button>
                <button className="icon-btn icon-btn-danger" onClick={() => handleDelete(rule.id)}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {editModal && editingRule && (
        <div className="modal-overlay" onClick={() => setEditModal(false)}>
          <div className="modal glass-panel animate-fade-in" onClick={e => e.stopPropagation()}>
            <h2>{editingRule.id ? 'Editar Regra' : 'Nova Regra de Preço'}</h2>
            <div className="modal-form">
              <div className="input-group">
                <label className="input-label">Nome da Regra</label>
                <input className="input-field" value={editingRule.rule_name || ''}
                  onChange={e => setEditingRule({ ...editingRule, rule_name: e.target.value })}
                  placeholder="Ex: Preço base residencial" />
              </div>
              <div className="input-group">
                <label className="input-label">Descrição</label>
                <textarea className="input-field textarea-field" value={editingRule.rule_description || ''}
                  onChange={e => setEditingRule({ ...editingRule, rule_description: e.target.value })}
                  placeholder="Descrição da regra" rows={2} />
              </div>
              <div className="input-row">
                <div className="input-group">
                  <label className="input-label">Preço Base (R$)</label>
                  <input className="input-field" type="number" step="0.01"
                    disabled={editingRule.base_price === -1}
                    value={editingRule.base_price === -1 ? '' : (editingRule.base_price ?? 0)}
                    onChange={e => setEditingRule({ ...editingRule, base_price: parseFloat(e.target.value) || 0 })} />
                  <label className="toggle-label" style={{ marginTop: '0.5rem' }}>
                    <input type="checkbox" checked={editingRule.base_price === -1}
                      onChange={e => setEditingRule({ ...editingRule, base_price: e.target.checked ? -1 : 0 })} />
                    <span style={{ color: 'var(--text-warning)', fontSize: '0.85rem' }}>Forçar Orçamento Manual</span>
                  </label>
                </div>
                <div className="input-group">
                  <label className="input-label">Tipo de Cliente</label>
                  <select className="input-field" value={editingRule.customer_type || 'both'}
                    onChange={e => setEditingRule({ ...editingRule, customer_type: e.target.value as any })}>
                    <option value="both">Ambos</option>
                    <option value="residential">Residencial</option>
                    <option value="commercial">Comercial</option>
                  </select>
                </div>
              </div>
              <div className="input-row">
                <div className="input-group">
                  <label className="input-label">Prioridade</label>
                  <input className="input-field" type="number" value={editingRule.priority ?? 0}
                    onChange={e => setEditingRule({ ...editingRule, priority: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="input-group">
                  <label className="toggle-label">
                    <input type="checkbox" checked={editingRule.is_active ?? true}
                      onChange={e => setEditingRule({ ...editingRule, is_active: e.target.checked })} />
                    <span>Ativa</span>
                  </label>
                </div>
              </div>

              {/* LÓGICA AVANÇADA */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-light)' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Lógica da Regra</h3>
                
                <div className="input-group">
                  <label className="input-label">Aplicar esta regra APENAS SE (Opcional)</label>
                  <div className="input-row" style={{ gap: '0.5rem' }}>
                    <select className="input-field" style={{ flex: 1 }}
                      value={(editingRule.rule_logic as any)?.conditions?.[0]?.field || ''}
                      onChange={e => {
                        const val = e.target.value;
                        const logic = { ...(editingRule.rule_logic as any) || {} };
                        if (!val) {
                          delete logic.conditions;
                        } else {
                          logic.conditions = [{ field: val, operator: '==', value: logic.conditions?.[0]?.value || '' }];
                        }
                        setEditingRule({ ...editingRule, rule_logic: logic });
                      }}>
                      <option value="">-- Sempre aplicar --</option>
                      {fields.map(f => (
                        <option key={f.field_key} value={f.field_key}>{f.field_label}</option>
                      ))}
                    </select>
                    
                    {((editingRule.rule_logic as any)?.conditions?.[0]?.field) && (
                      <>
                        <span style={{ alignSelf: 'center', color: 'var(--text-secondary)' }}>for igual a</span>
                        <input className="input-field" style={{ flex: 1 }}
                          placeholder="Valor exato"
                          value={(editingRule.rule_logic as any)?.conditions?.[0]?.value || ''}
                          onChange={e => {
                            const logic = { ...(editingRule.rule_logic as any) || {} };
                            if (logic.conditions && logic.conditions.length > 0) {
                              logic.conditions[0].value = e.target.value;
                              setEditingRule({ ...editingRule, rule_logic: logic });
                            }
                          }} />
                      </>
                    )}
                  </div>
                </div>

                <div className="input-group" style={{ marginTop: '1rem' }}>
                  <label className="input-label">Multiplicador de Quantidade (Opcional)</label>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Multiplica o Preço Base pelo número digitado pelo cliente neste campo:
                  </p>
                  <select className="input-field"
                    value={(editingRule.rule_logic as any)?.multiply_by_field || ''}
                    onChange={e => {
                      const logic = { ...(editingRule.rule_logic as any) || {} };
                      if (!e.target.value) {
                        delete logic.multiply_by_field;
                      } else {
                        logic.multiply_by_field = e.target.value;
                      }
                      setEditingRule({ ...editingRule, rule_logic: logic });
                    }}>
                    <option value="">-- Não multiplicar --</option>
                    {fields.map(f => (
                      <option key={f.field_key} value={f.field_key}>{f.field_label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setEditModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
