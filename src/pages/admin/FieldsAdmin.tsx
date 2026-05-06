import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Service, ServiceField, FieldType, AppliesTo } from '../../lib/types';
import {
  ArrowLeft, Plus, Edit, Trash2, GripVertical,
  Type, Hash, List, CheckSquare, Circle,
  AlignLeft, Phone, Mail, ChevronUp, ChevronDown
} from 'lucide-react';
import './FieldsAdmin.css';

const fieldTypeLabels: Record<FieldType, { label: string; icon: React.ComponentType<{ size?: number }> }> = {
  text: { label: 'Texto', icon: Type },
  number: { label: 'Número', icon: Hash },
  select: { label: 'Seleção', icon: List },
  checkbox: { label: 'Checkbox', icon: CheckSquare },
  radio: { label: 'Radio', icon: Circle },
  textarea: { label: 'Área de Texto', icon: AlignLeft },
  phone: { label: 'Telefone', icon: Phone },
  email: { label: 'E-mail', icon: Mail },
};

const appliesToLabels: Record<AppliesTo, string> = {
  both: 'Ambos',
  residential: 'Residencial',
  commercial: 'Comercial',
};

export default function FieldsAdmin() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const [service, setService] = useState<Service | null>(null);
  const [fields, setFields] = useState<ServiceField[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editingField, setEditingField] = useState<Partial<ServiceField> | null>(null);
  const [saving, setSaving] = useState(false);
  const [optionInput, setOptionInput] = useState('');

  useEffect(() => {
    if (serviceId) loadData();
  }, [serviceId]);

  const loadData = async () => {
    const [{ data: svc }, { data: flds }] = await Promise.all([
      supabase.from('services').select('*').eq('id', serviceId).single(),
      supabase.from('service_fields').select('*').eq('service_id', serviceId).order('display_order'),
    ]);
    setService(svc);
    setFields(flds || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditingField({
      service_id: serviceId,
      field_label: '',
      field_key: '',
      field_type: 'text',
      field_options: [],
      placeholder: '',
      helper_text: '',
      is_required: false,
      display_order: fields.length + 1,
      applies_to: 'both',
    });
    setOptionInput('');
    setEditModal(true);
  };

  const openEdit = (field: ServiceField) => {
    setEditingField({ ...field });
    setOptionInput('');
    setEditModal(true);
  };

  const generateKey = (label: string) => {
    return label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)/g, '');
  };

  const addOption = () => {
    if (!optionInput.trim() || !editingField) return;
    const opts = [...(editingField.field_options || []), optionInput.trim()];
    setEditingField({ ...editingField, field_options: opts });
    setOptionInput('');
  };

  const removeOption = (idx: number) => {
    if (!editingField) return;
    const opts = [...(editingField.field_options || [])];
    opts.splice(idx, 1);
    setEditingField({ ...editingField, field_options: opts });
  };

  const handleSave = async () => {
    if (!editingField?.field_label) return;
    setSaving(true);

    const payload = {
      service_id: serviceId,
      field_label: editingField.field_label,
      field_key: editingField.field_key || generateKey(editingField.field_label),
      field_type: editingField.field_type || 'text',
      field_options: editingField.field_options || [],
      placeholder: editingField.placeholder || '',
      helper_text: editingField.helper_text || '',
      is_required: editingField.is_required ?? false,
      display_order: editingField.display_order ?? 0,
      applies_to: editingField.applies_to || 'both',
    };

    if (editingField.id) {
      await supabase.from('service_fields').update(payload).eq('id', editingField.id);
    } else {
      await supabase.from('service_fields').insert(payload);
    }

    setSaving(false);
    setEditModal(false);
    setEditingField(null);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este campo?')) return;
    await supabase.from('service_fields').delete().eq('id', id);
    setFields(prev => prev.filter(f => f.id !== id));
  };

  const moveField = async (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newFields.length) return;

    [newFields[index], newFields[swapIdx]] = [newFields[swapIdx], newFields[index]];

    // Update display_order
    const updates = newFields.map((f, i) => ({
      id: f.id,
      display_order: i + 1,
    }));

    setFields(newFields.map((f, i) => ({ ...f, display_order: i + 1 })));

    for (const u of updates) {
      await supabase.from('service_fields').update({ display_order: u.display_order }).eq('id', u.id);
    }
  };

  const showOptions = editingField?.field_type === 'select' || editingField?.field_type === 'radio' || editingField?.field_type === 'checkbox';

  if (loading) return <div className="loading-state">Carregando...</div>;

  return (
    <div className="fields-admin">
      <div className="page-title">
        <div>
          <button className="btn-back" onClick={() => navigate('/dashboard/servicos')}>
            <ArrowLeft size={18} />
            Voltar
          </button>
          <h1>Campos: {service?.name}</h1>
          <p>Configure os campos do formulário que o cliente vai preencher</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} />
          Novo Campo
        </button>
      </div>

      {/* Fields List */}
      {fields.length === 0 ? (
        <div className="empty-state glass-panel">
          <Type size={48} />
          <h3>Nenhum campo configurado</h3>
          <p>Adicione campos para que o cliente preencha no formulário de orçamento</p>
        </div>
      ) : (
        <div className="fields-list">
          {fields.map((field, index) => {
            const TypeIcon = fieldTypeLabels[field.field_type]?.icon || Type;
            return (
              <div key={field.id} className="field-card glass-panel">
                <div className="field-card-left">
                  <div className="field-order-btns">
                    <button
                      className="order-btn"
                      onClick={() => moveField(index, 'up')}
                      disabled={index === 0}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <span className="field-order-num">{index + 1}</span>
                    <button
                      className="order-btn"
                      onClick={() => moveField(index, 'down')}
                      disabled={index === fields.length - 1}
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  <div className="field-type-badge">
                    <TypeIcon size={16} />
                  </div>

                  <div className="field-info">
                    <h4>
                      {field.field_label}
                      {field.is_required && <span className="required-mark">*</span>}
                    </h4>
                    <div className="field-meta">
                      <span className="badge badge-neutral">{fieldTypeLabels[field.field_type]?.label}</span>
                      <span className={`badge ${
                        field.applies_to === 'both' ? 'badge-info' :
                        field.applies_to === 'residential' ? 'badge-success' : 'badge-warning'
                      }`}>
                        {appliesToLabels[field.applies_to]}
                      </span>
                      {field.field_options && field.field_options.length > 0 && (
                        <span className="badge badge-neutral">
                          {field.field_options.length} opções
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="field-card-actions">
                  <button className="icon-btn" onClick={() => openEdit(field)} title="Editar">
                    <Edit size={16} />
                  </button>
                  <button className="icon-btn icon-btn-danger" onClick={() => handleDelete(field.id)} title="Excluir">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit/Create Modal */}
      {editModal && editingField && (
        <div className="modal-overlay" onClick={() => setEditModal(false)}>
          <div className="modal glass-panel animate-fade-in" onClick={e => e.stopPropagation()}>
            <h2>{editingField.id ? 'Editar Campo' : 'Novo Campo'}</h2>

            <div className="modal-form">
              <div className="input-group">
                <label className="input-label">Nome do Campo</label>
                <input
                  className="input-field"
                  value={editingField.field_label || ''}
                  onChange={e => setEditingField({
                    ...editingField,
                    field_label: e.target.value,
                    field_key: editingField.id ? editingField.field_key : generateKey(e.target.value),
                  })}
                  placeholder="Ex: Área total em m²"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Chave (identificador)</label>
                <input
                  className="input-field"
                  value={editingField.field_key || ''}
                  onChange={e => setEditingField({ ...editingField, field_key: e.target.value })}
                  placeholder="area_total_m2"
                />
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label className="input-label">Tipo do Campo</label>
                  <select
                    className="input-field"
                    value={editingField.field_type || 'text'}
                    onChange={e => setEditingField({ ...editingField, field_type: e.target.value as FieldType })}
                  >
                    {Object.entries(fieldTypeLabels).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">Aplica-se a</label>
                  <select
                    className="input-field"
                    value={editingField.applies_to || 'both'}
                    onChange={e => setEditingField({ ...editingField, applies_to: e.target.value as AppliesTo })}
                  >
                    <option value="both">Ambos</option>
                    <option value="residential">Apenas Residencial</option>
                    <option value="commercial">Apenas Comercial</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Placeholder</label>
                <input
                  className="input-field"
                  value={editingField.placeholder || ''}
                  onChange={e => setEditingField({ ...editingField, placeholder: e.target.value })}
                  placeholder="Texto de ajuda dentro do campo"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Texto de Ajuda</label>
                <input
                  className="input-field"
                  value={editingField.helper_text || ''}
                  onChange={e => setEditingField({ ...editingField, helper_text: e.target.value })}
                  placeholder="Instrução adicional exibida abaixo do campo"
                />
              </div>

              {/* Options for select/radio/checkbox */}
              {showOptions && (
                <div className="input-group">
                  <label className="input-label">Opções</label>
                  <div className="options-list">
                    {(editingField.field_options || []).map((opt, idx) => (
                      <div key={idx} className="option-item">
                        <span>{opt}</span>
                        <button className="option-remove" onClick={() => removeOption(idx)}>×</button>
                      </div>
                    ))}
                  </div>
                  <div className="option-add-row">
                    <input
                      className="input-field"
                      value={optionInput}
                      onChange={e => setOptionInput(e.target.value)}
                      placeholder="Nova opção..."
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())}
                    />
                    <button className="btn btn-primary btn-sm" onClick={addOption}>Adicionar</button>
                  </div>
                </div>
              )}

              <div className="input-row">
                <div className="input-group">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={editingField.is_required ?? false}
                      onChange={e => setEditingField({ ...editingField, is_required: e.target.checked })}
                    />
                    <span>Campo obrigatório</span>
                  </label>
                </div>
                <div className="input-group">
                  <label className="input-label">Ordem</label>
                  <input
                    className="input-field"
                    type="number"
                    value={editingField.display_order ?? 0}
                    onChange={e => setEditingField({ ...editingField, display_order: parseInt(e.target.value) || 0 })}
                  />
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
