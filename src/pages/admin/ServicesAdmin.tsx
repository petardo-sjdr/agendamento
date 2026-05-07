import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Service } from '../../lib/types';
import {
  Plus, Edit, Trash2, Eye, EyeOff, GripVertical,
  Search, ListTree, DollarSign, ChevronRight,
  Wrench, Bug, Droplets, Droplet, Flame, MousePointer,
  Hexagon, Moon, Layers, CloudRain, Shield, Zap,
  Thermometer, Leaf, Home, Building2, Truck
} from 'lucide-react';
import './ServicesAdmin.css';

// Map icon names to Lucide components
const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  Wrench, Bug, Droplets, Droplet, Flame, MousePointer,
  Hexagon, Moon, Layers, CloudRain, Shield, Zap,
  Thermometer, Leaf, Home, Building2, Truck,
};

export default function ServicesAdmin() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editModal, setEditModal] = useState(false);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error loading services:', error);
    } else {
      setServices(data || []);
    }
    setLoading(false);
  };

  const toggleActive = async (service: Service) => {
    const { error } = await supabase
      .from('services')
      .update({ is_active: !service.is_active })
      .eq('id', service.id);

    if (!error) {
      setServices(prev =>
        prev.map(s => s.id === service.id ? { ...s, is_active: !s.is_active } : s)
      );
    }
  };

  const openCreate = () => {
    setEditingService({
      name: '',
      slug: '',
      description: '',
      icon_name: 'Bug',
      explanation_title: '',
      explanation_text: '',
      display_order: services.length + 1,
      is_active: true,
    });
    setEditModal(true);
  };

  const openEdit = (service: Service) => {
    setEditingService({ ...service });
    setEditModal(true);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleSave = async () => {
    if (!editingService?.name) return;
    setSaving(true);

    const payload = {
      name: editingService.name,
      slug: editingService.slug || generateSlug(editingService.name),
      description: editingService.description || '',
      icon_name: editingService.icon_name || 'Bug',
      explanation_title: editingService.explanation_title || '',
      explanation_text: editingService.explanation_text || '',
      display_order: editingService.display_order ?? 0,
      is_active: editingService.is_active ?? true,
    };

    if (editingService.id) {
      const { error } = await supabase
        .from('services')
        .update(payload)
        .eq('id', editingService.id);
      if (error) console.error(error);
    } else {
      const { error } = await supabase
        .from('services')
        .insert(payload);
      if (error) console.error(error);
    }

    setSaving(false);
    setEditModal(false);
    setEditingService(null);
    loadServices();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço? Todos os campos e regras de preço serão removidos.')) return;

    const { error } = await supabase.from('services').delete().eq('id', id);
    if (!error) {
      setServices(prev => prev.filter(s => s.id !== id));
    }
  };

  const filtered = services.filter(s =>
    s.slug !== 'global-config' && s.name.toLowerCase().includes(search.toLowerCase())
  );

  const IconComponent = (name: string) => {
    const Icon = iconMap[name] || Bug;
    return <Icon size={20} />;
  };

  return (
    <div className="services-admin">
      <div className="page-title">
        <div>
          <h1>Serviços</h1>
          <p>Gerencie os serviços oferecidos pela PETARDO</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }} onClick={() => {
            const globalSvc = services.find(s => s.slug === 'global-config');
            if (globalSvc) navigate(`/dashboard/servicos/${globalSvc.id}/campos`);
          }}>
            <ListTree size={18} />
            Campos Globais
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={18} />
            Novo Serviço
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="search-bar glass-panel">
        <Search size={18} />
        <input
          type="text"
          placeholder="Buscar serviços..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Services List */}
      {loading ? (
        <div className="loading-state">Carregando serviços...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state glass-panel">
          <Wrench size={48} />
          <h3>Nenhum serviço encontrado</h3>
          <p>Comece adicionando um novo serviço</p>
        </div>
      ) : (
        <div className="services-list">
          {filtered.map(service => (
            <div key={service.id} className={`service-card glass-panel ${!service.is_active ? 'inactive' : ''}`}>
              <div className="service-card-left">
                <div className="service-grip">
                  <GripVertical size={16} />
                </div>
                <div className="service-icon-badge" style={{
                  background: service.is_active
                    ? 'linear-gradient(135deg, rgba(220, 38, 38, 0.2), rgba(129, 140, 248, 0.05))'
                    : 'rgba(255,255,255,0.03)'
                }}>
                  {IconComponent(service.icon_name)}
                </div>
                <div className="service-info">
                  <h3>{service.name}</h3>
                  <p>{service.description || 'Sem descrição'}</p>
                  <div className="service-badges">
                    <span className={`badge ${service.is_active ? 'badge-success' : 'badge-muted'}`}>
                      {service.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                    <span className="badge badge-neutral">/{service.slug}</span>
                  </div>
                </div>
              </div>

              <div className="service-card-actions">
                <button
                  className="icon-btn"
                  title="Configurar Serviço (Campos e Preços)"
                  onClick={() => navigate(`/dashboard/servicos/${service.id}/campos`)}
                >
                  <ListTree size={16} />
                </button>
                <button
                  className="icon-btn"
                  title={service.is_active ? 'Desativar' : 'Ativar'}
                  onClick={() => toggleActive(service)}
                >
                  {service.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button
                  className="icon-btn"
                  title="Editar"
                  onClick={() => openEdit(service)}
                >
                  <Edit size={16} />
                </button>
                <button
                  className="icon-btn icon-btn-danger"
                  title="Excluir"
                  onClick={() => handleDelete(service.id)}
                >
                  <Trash2 size={16} />
                </button>
                <button
                  className="icon-btn"
                  title="Configurar campos"
                  onClick={() => navigate(`/dashboard/servicos/${service.id}/campos`)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create Modal */}
      {editModal && editingService && (
        <div className="modal-overlay" onClick={() => setEditModal(false)}>
          <div className="modal glass-panel animate-fade-in" onClick={e => e.stopPropagation()}>
            <h2>{editingService.id ? 'Editar Serviço' : 'Novo Serviço'}</h2>

            <div className="modal-form">
              <div className="input-group">
                <label className="input-label">Nome do Serviço</label>
                <input
                  className="input-field"
                  value={editingService.name || ''}
                  onChange={e => setEditingService({
                    ...editingService,
                    name: e.target.value,
                    slug: editingService.id ? editingService.slug : generateSlug(e.target.value),
                  })}
                  placeholder="Ex: Dedetização"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Slug (URL)</label>
                <input
                  className="input-field"
                  value={editingService.slug || ''}
                  onChange={e => setEditingService({ ...editingService, slug: e.target.value })}
                  placeholder="dedetizacao"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Descrição Curta</label>
                <textarea
                  className="input-field textarea-field"
                  value={editingService.description || ''}
                  onChange={e => setEditingService({ ...editingService, description: e.target.value })}
                  placeholder="Descrição breve do serviço"
                  rows={2}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Ícone</label>
                <div className="icon-selector">
                  {Object.keys(iconMap).map(name => (
                    <button
                      key={name}
                      className={`icon-option ${editingService.icon_name === name ? 'selected' : ''}`}
                      onClick={() => setEditingService({ ...editingService, icon_name: name })}
                      title={name}
                    >
                      {IconComponent(name)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Título da Explicação</label>
                <input
                  className="input-field"
                  value={editingService.explanation_title || ''}
                  onChange={e => setEditingService({ ...editingService, explanation_title: e.target.value })}
                  placeholder="Título exibido ao abrir o link"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Texto Explicativo</label>
                <textarea
                  className="input-field textarea-field"
                  value={editingService.explanation_text || ''}
                  onChange={e => setEditingService({ ...editingService, explanation_text: e.target.value })}
                  placeholder="Texto que o cliente vê ao abrir o link do orçamento"
                  rows={4}
                />
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label className="input-label">Ordem de Exibição</label>
                  <input
                    className="input-field"
                    type="number"
                    value={editingService.display_order ?? 0}
                    onChange={e => setEditingService({ ...editingService, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Status</label>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={editingService.is_active ?? true}
                      onChange={e => setEditingService({ ...editingService, is_active: e.target.checked })}
                    />
                    <span>{editingService.is_active ? 'Ativo' : 'Inativo'}</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setEditModal(false)}>
                Cancelar
              </button>
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
