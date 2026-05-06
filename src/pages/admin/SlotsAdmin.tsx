import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { AvailableSlot, WeeklySchedule } from '../../lib/types';
import {
  Clock, Plus, Trash2, Calendar, Save,
  ToggleLeft, ToggleRight, AlertTriangle, CalendarX
} from 'lucide-react';
import './SlotsAdmin.css';

const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const dayNamesShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function SlotsAdmin() {
  const [tab, setTab] = useState<'weekly' | 'specific' | 'generate'>('weekly');
  const [weeklySlots, setWeeklySlots] = useState<WeeklySchedule[]>([]);
  const [specificSlots, setSpecificSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Generate form
  const [genStartDate, setGenStartDate] = useState('');
  const [genEndDate, setGenEndDate] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState('');

  // New weekly slot
  const [newWeekly, setNewWeekly] = useState({
    day_of_week: 1,
    time_start: '08:00',
    time_end: '09:00',
    max_appointments: 1,
  });

  // New specific slot
  const [newSpecific, setNewSpecific] = useState({
    date: '',
    time_start: '08:00',
    time_end: '09:00',
    max_appointments: 1,
    is_blocked: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [{ data: weekly }, { data: specific }] = await Promise.all([
      supabase.from('weekly_schedule').select('*').order('day_of_week').order('time_start'),
      supabase.from('available_slots').select('*').gte('date', new Date().toISOString().split('T')[0]).order('date').order('time_start').limit(100),
    ]);
    setWeeklySlots(weekly || []);
    setSpecificSlots(specific || []);
    setLoading(false);
  };

  // ---- Weekly Schedule ----
  const addWeeklySlot = async () => {
    setSaving(true);
    const { error } = await supabase.from('weekly_schedule').insert({
      day_of_week: newWeekly.day_of_week,
      time_start: newWeekly.time_start,
      time_end: newWeekly.time_end,
      max_appointments: newWeekly.max_appointments,
      is_active: true,
    });
    if (!error) await loadData();
    setSaving(false);
  };

  const toggleWeeklyActive = async (slot: WeeklySchedule) => {
    await supabase.from('weekly_schedule').update({ is_active: !slot.is_active }).eq('id', slot.id);
    setWeeklySlots(prev => prev.map(s => s.id === slot.id ? { ...s, is_active: !s.is_active } : s));
  };

  const deleteWeekly = async (id: string) => {
    if (!confirm('Excluir este horário?')) return;
    await supabase.from('weekly_schedule').delete().eq('id', id);
    setWeeklySlots(prev => prev.filter(s => s.id !== id));
  };

  // ---- Specific Slots ----
  const addSpecificSlot = async () => {
    if (!newSpecific.date) return;
    setSaving(true);
    const { error } = await supabase.from('available_slots').insert({
      date: newSpecific.date,
      time_start: newSpecific.time_start,
      time_end: newSpecific.time_end,
      max_appointments: newSpecific.max_appointments,
      is_blocked: newSpecific.is_blocked,
    });
    if (!error) await loadData();
    setSaving(false);
  };

  const toggleBlockSlot = async (slot: AvailableSlot) => {
    await supabase.from('available_slots').update({ is_blocked: !slot.is_blocked }).eq('id', slot.id);
    setSpecificSlots(prev => prev.map(s => s.id === slot.id ? { ...s, is_blocked: !s.is_blocked } : s));
  };

  const deleteSpecific = async (id: string) => {
    await supabase.from('available_slots').delete().eq('id', id);
    setSpecificSlots(prev => prev.filter(s => s.id !== id));
  };

  // ---- Generate slots from weekly schedule ----
  const generateSlots = async () => {
    if (!genStartDate || !genEndDate) return;
    setGenerating(true);
    setGenResult('');

    try {
      const activeWeekly = weeklySlots.filter(s => s.is_active);
      if (activeWeekly.length === 0) {
        setGenResult('Nenhum horário semanal ativo para gerar.');
        setGenerating(false);
        return;
      }

      const start = new Date(genStartDate + 'T00:00:00');
      const end = new Date(genEndDate + 'T00:00:00');
      const slotsToInsert: any[] = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        const dateStr = d.toISOString().split('T')[0];

        const matchingSlots = activeWeekly.filter(w => w.day_of_week === dayOfWeek);
        for (const ws of matchingSlots) {
          slotsToInsert.push({
            date: dateStr,
            time_start: ws.time_start,
            time_end: ws.time_end,
            max_appointments: ws.max_appointments,
            is_blocked: false,
            current_count: 0,
          });
        }
      }

      if (slotsToInsert.length === 0) {
        setGenResult('Nenhum slot gerado para o período selecionado.');
        setGenerating(false);
        return;
      }

      // Insert in batches
      const batchSize = 50;
      for (let i = 0; i < slotsToInsert.length; i += batchSize) {
        const batch = slotsToInsert.slice(i, i + batchSize);
        await supabase.from('available_slots').insert(batch);
      }

      setGenResult(`✅ ${slotsToInsert.length} horários gerados com sucesso!`);
      await loadData();
    } catch (err) {
      setGenResult('Erro ao gerar horários.');
    } finally {
      setGenerating(false);
    }
  };

  const formatTime = (t: string) => t.slice(0, 5);

  if (loading) return <div className="loading-state">Carregando...</div>;

  return (
    <div className="slots-admin">
      <div className="page-title">
        <div>
          <h1>Horários</h1>
          <p>Configure os horários disponíveis para agendamento</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="slots-tabs">
        <button className={`slots-tab ${tab === 'weekly' ? 'active' : ''}`} onClick={() => setTab('weekly')}>
          <Clock size={16} /> Horário Semanal
        </button>
        <button className={`slots-tab ${tab === 'specific' ? 'active' : ''}`} onClick={() => setTab('specific')}>
          <Calendar size={16} /> Datas Específicas
        </button>
        <button className={`slots-tab ${tab === 'generate' ? 'active' : ''}`} onClick={() => setTab('generate')}>
          <Save size={16} /> Gerar Horários
        </button>
      </div>

      {/* ---- WEEKLY TAB ---- */}
      {tab === 'weekly' && (
        <div className="slots-content animate-fade-in">
          <div className="slots-info glass-panel">
            <AlertTriangle size={16} />
            <p>O horário semanal é o modelo base. Use "Gerar Horários" para criar as datas específicas a partir dele.</p>
          </div>

          {/* Add new */}
          <div className="slots-add-form glass-panel">
            <h3>Adicionar Horário</h3>
            <div className="slots-add-row">
              <div className="input-group">
                <label className="input-label">Dia</label>
                <select className="input-field" value={newWeekly.day_of_week}
                  onChange={e => setNewWeekly({ ...newWeekly, day_of_week: parseInt(e.target.value) })}>
                  {dayNames.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Início</label>
                <input className="input-field" type="time" value={newWeekly.time_start}
                  onChange={e => setNewWeekly({ ...newWeekly, time_start: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">Fim</label>
                <input className="input-field" type="time" value={newWeekly.time_end}
                  onChange={e => setNewWeekly({ ...newWeekly, time_end: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">Vagas</label>
                <input className="input-field" type="number" min="1" value={newWeekly.max_appointments}
                  onChange={e => setNewWeekly({ ...newWeekly, max_appointments: parseInt(e.target.value) || 1 })} />
              </div>
              <button className="btn btn-primary slots-add-btn" onClick={addWeeklySlot} disabled={saving}>
                <Plus size={16} /> Adicionar
              </button>
            </div>
          </div>

          {/* List grouped by day */}
          {weeklySlots.length === 0 ? (
            <div className="empty-state glass-panel">
              <Clock size={48} />
              <h3>Nenhum horário semanal</h3>
              <p>Adicione horários acima para definir sua agenda</p>
            </div>
          ) : (
            <div className="weekly-grid">
              {[0, 1, 2, 3, 4, 5, 6].map(day => {
                const daySlots = weeklySlots.filter(s => s.day_of_week === day);
                if (daySlots.length === 0) return null;
                return (
                  <div key={day} className="weekly-day-card glass-panel">
                    <h4 className="weekly-day-name">{dayNames[day]}</h4>
                    <div className="weekly-day-slots">
                      {daySlots.map(slot => (
                        <div key={slot.id} className={`weekly-slot-item ${!slot.is_active ? 'inactive' : ''}`}>
                          <span className="weekly-slot-time">
                            {formatTime(slot.time_start)} - {formatTime(slot.time_end)}
                          </span>
                          <span className="weekly-slot-cap">{slot.max_appointments} vaga(s)</span>
                          <div className="weekly-slot-actions">
                            <button className="icon-btn" onClick={() => toggleWeeklyActive(slot)}>
                              {slot.is_active ? <ToggleRight size={16} style={{ color: '#34d399' }} /> : <ToggleLeft size={16} />}
                            </button>
                            <button className="icon-btn icon-btn-danger" onClick={() => deleteWeekly(slot.id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---- SPECIFIC TAB ---- */}
      {tab === 'specific' && (
        <div className="slots-content animate-fade-in">
          {/* Add specific */}
          <div className="slots-add-form glass-panel">
            <h3>Adicionar Data Específica</h3>
            <div className="slots-add-row">
              <div className="input-group">
                <label className="input-label">Data</label>
                <input className="input-field" type="date" value={newSpecific.date}
                  onChange={e => setNewSpecific({ ...newSpecific, date: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">Início</label>
                <input className="input-field" type="time" value={newSpecific.time_start}
                  onChange={e => setNewSpecific({ ...newSpecific, time_start: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">Fim</label>
                <input className="input-field" type="time" value={newSpecific.time_end}
                  onChange={e => setNewSpecific({ ...newSpecific, time_end: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">Vagas</label>
                <input className="input-field" type="number" min="1" value={newSpecific.max_appointments}
                  onChange={e => setNewSpecific({ ...newSpecific, max_appointments: parseInt(e.target.value) || 1 })} />
              </div>
              <div className="input-group">
                <label className="toggle-label">
                  <input type="checkbox" checked={newSpecific.is_blocked}
                    onChange={e => setNewSpecific({ ...newSpecific, is_blocked: e.target.checked })} />
                  <span>Bloqueado</span>
                </label>
              </div>
              <button className="btn btn-primary slots-add-btn" onClick={addSpecificSlot} disabled={saving}>
                <Plus size={16} /> Adicionar
              </button>
            </div>
          </div>

          {/* List */}
          {specificSlots.length === 0 ? (
            <div className="empty-state glass-panel">
              <CalendarX size={48} />
              <h3>Nenhuma data específica</h3>
              <p>Use "Gerar Horários" para criar datas a partir do horário semanal</p>
            </div>
          ) : (
            <div className="specific-list">
              {specificSlots.map(slot => (
                <div key={slot.id} className={`specific-slot glass-panel ${slot.is_blocked ? 'blocked' : ''}`}>
                  <div className="specific-slot-info">
                    <span className="specific-date">
                      {new Date(slot.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                    </span>
                    <span className="specific-time">{formatTime(slot.time_start)} - {formatTime(slot.time_end)}</span>
                    <span className={`badge ${slot.is_blocked ? 'badge-muted' : 'badge-success'}`}>
                      {slot.is_blocked ? 'Bloqueado' : `${slot.current_count}/${slot.max_appointments} vagas`}
                    </span>
                  </div>
                  <div className="specific-slot-actions">
                    <button className="icon-btn" onClick={() => toggleBlockSlot(slot)}
                      title={slot.is_blocked ? 'Desbloquear' : 'Bloquear'}>
                      {slot.is_blocked ? <ToggleLeft size={16} /> : <ToggleRight size={16} style={{ color: '#34d399' }} />}
                    </button>
                    <button className="icon-btn icon-btn-danger" onClick={() => deleteSpecific(slot.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- GENERATE TAB ---- */}
      {tab === 'generate' && (
        <div className="slots-content animate-fade-in">
          <div className="slots-generate glass-panel">
            <h3>Gerar Horários Automaticamente</h3>
            <p className="gen-description">
              Cria datas específicas baseadas no horário semanal configurado.
              Selecione o período desejado.
            </p>

            <div className="gen-form">
              <div className="input-group">
                <label className="input-label">Data Início</label>
                <input className="input-field" type="date" value={genStartDate}
                  onChange={e => setGenStartDate(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Data Fim</label>
                <input className="input-field" type="date" value={genEndDate}
                  onChange={e => setGenEndDate(e.target.value)} />
              </div>
            </div>

            <div className="gen-preview">
              <h4>Horários ativos que serão usados:</h4>
              {weeklySlots.filter(s => s.is_active).length === 0 ? (
                <p className="gen-warning">⚠️ Nenhum horário semanal ativo. Configure primeiro na aba "Horário Semanal".</p>
              ) : (
                <div className="gen-preview-list">
                  {weeklySlots.filter(s => s.is_active).map(s => (
                    <span key={s.id} className="gen-preview-item badge badge-info">
                      {dayNamesShort[s.day_of_week]} {formatTime(s.time_start)}-{formatTime(s.time_end)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button className="btn btn-primary" onClick={generateSlots}
              disabled={generating || !genStartDate || !genEndDate || weeklySlots.filter(s => s.is_active).length === 0}>
              {generating ? 'Gerando...' : '⚡ Gerar Horários'}
            </button>

            {genResult && (
              <div className={`gen-result ${genResult.startsWith('✅') ? 'success' : 'warning'}`}>
                {genResult}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
