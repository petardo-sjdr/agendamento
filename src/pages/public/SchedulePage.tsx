import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Quote, Service } from '../../lib/types';
import {
  Calendar, Clock, CheckCircle, ChevronLeft, ChevronRight,
  MapPin, Loader2, User, Phone, Home, UserCheck
} from 'lucide-react';
import './SchedulePage.css';

type Step = 'loading' | 'customer_data' | 'select_slot' | 'confirm' | 'success' | 'error';

interface BusySlot { start: string; end: string; }

interface CustomerData {
  nome_completo: string;
  cpf_cnpj: string;
  endereco_rua: string;
  endereco_numero: string;
  endereco_bairro: string;
  endereco_cidade: string;
  endereco_complemento: string;
  ponto_referencia: string;
  nome_acompanhante: string;
  whatsapp_acompanhante: string;
}

interface TimeSlot {
  start: string; // HH:mm
  end: string;   // HH:mm
}

const INITIAL_CUSTOMER: CustomerData = {
  nome_completo: '', cpf_cnpj: '', endereco_rua: '', endereco_numero: '',
  endereco_bairro: '', endereco_cidade: '', endereco_complemento: '',
  ponto_referencia: '', nome_acompanhante: '', whatsapp_acompanhante: ''
};

// API base URL (Vercel serverless)
const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

export default function SchedulePage() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const [step, setStep] = useState<Step>('loading');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [customer, setCustomer] = useState<CustomerData>(INITIAL_CUSTOMER);
  const [euMesmo, setEuMesmo] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);
  const [busySlots, setBusySlots] = useState<BusySlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<TimeSlot | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Dates
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const maxDate = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);

  useEffect(() => { if (quoteId) loadData(); }, [quoteId]);

  const loadData = async () => {
    try {
      const { data: q } = await supabase.from('quotes').select('*').eq('id', quoteId).single();
      if (!q || q.status !== 'approved') { setStep('error'); return; }
      setQuote(q);

      const { data: svc } = await supabase.from('services').select('*').eq('id', q.service_id).single();
      setService(svc);

      // Pre-fill customer data if available
      const { data: cust } = await supabase.from('customers').select('*').eq('id', q.customer_id).single();
      if (cust) {
        setCustomer(prev => ({
          ...prev,
          nome_completo: cust.full_name || '',
          cpf_cnpj: cust.cpf_cnpj || '',
          endereco_rua: cust.endereco_rua || '',
          endereco_numero: cust.endereco_numero || '',
          endereco_bairro: cust.endereco_bairro || '',
          endereco_cidade: cust.endereco_cidade || '',
          endereco_complemento: cust.endereco_complemento || '',
          ponto_referencia: cust.ponto_referencia || '',
        }));
        if (cust.cpf_cnpj) setCustomerFound(true);
      }

      setStep('customer_data');
    } catch { setStep('error'); }
  };

  // Fetch busy times from Google Calendar
  const fetchBusySlots = useCallback(async () => {
    setLoadingSlots(true);
    try {
      const startDate = tomorrow.toISOString();
      const endDate = maxDate.toISOString();
      const res = await fetch(`${API_BASE}/api/google-calendar?startDate=${startDate}&endDate=${endDate}`);
      if (res.ok) {
        const data = await res.json();
        setBusySlots(data.busy || []);
      }
    } catch (e) {
      console.error('Error fetching busy slots:', e);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  // Generate available time slots for a given date
  const generateSlots = (dateStr: string): TimeSlot[] => {
    const date = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = date.getDay();

    // Sunday = closed
    if (dayOfWeek === 0) return [];

    const duration = (service as any)?.duration_minutes || 90;
    const startHour = 8;
    const endHour = dayOfWeek === 6 ? 12 : 17; // Saturday = 12, weekdays = 17

    const slots: TimeSlot[] = [];

    for (let hour = startHour; hour < endHour; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const slotStart = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        const endMinutes = hour * 60 + min + duration;
        const endH = Math.floor(endMinutes / 60);
        const endM = endMinutes % 60;

        // Don't go past business hours
        if (endH > endHour || (endH === endHour && endM > 0)) continue;

        const slotEnd = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

        // Check if this slot conflicts with any busy slot
        const slotStartISO = new Date(`${dateStr}T${slotStart}:00-03:00`).getTime();
        const slotEndISO = new Date(`${dateStr}T${slotEnd}:00-03:00`).getTime();

        const isConflict = busySlots.some(busy => {
          const busyStart = new Date(busy.start).getTime();
          const busyEnd = new Date(busy.end).getTime();
          return slotStartISO < busyEnd && slotEndISO > busyStart;
        });

        if (!isConflict) {
          slots.push({ start: slotStart, end: slotEnd });
        }
      }
    }

    return slots;
  };

  // Get available dates (next 15 days, excluding Sundays, with at least 1 slot)
  const getAvailableDates = (): string[] => {
    const dates: string[] = [];
    const cursor = new Date(tomorrow);

    while (cursor <= maxDate) {
      if (cursor.getDay() !== 0) { // Not Sunday
        const dateStr = cursor.toISOString().split('T')[0];
        const slots = generateSlots(dateStr);
        if (slots.length > 0) dates.push(dateStr);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  };

  // Customer form validation
  const validateCustomer = (): boolean => {
    const errs: Record<string, string> = {};
    if (!customer.nome_completo.trim()) errs.nome_completo = 'Obrigatório';
    if (!customer.cpf_cnpj.trim()) errs.cpf_cnpj = 'Obrigatório';
    if (!customer.endereco_rua.trim()) errs.endereco_rua = 'Obrigatório';
    if (!customer.endereco_numero.trim()) errs.endereco_numero = 'Obrigatório';
    if (!customer.endereco_bairro.trim()) errs.endereco_bairro = 'Obrigatório';
    if (!customer.endereco_cidade.trim()) errs.endereco_cidade = 'Obrigatório';
    if (!customer.ponto_referencia.trim()) errs.ponto_referencia = 'Obrigatório';
    if (!euMesmo) {
      if (!customer.nome_acompanhante.trim()) errs.nome_acompanhante = 'Obrigatório';
      if (!customer.whatsapp_acompanhante.trim()) errs.whatsapp_acompanhante = 'Obrigatório';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCustomerNext = async () => {
    if (!validateCustomer()) return;

    // Save customer data
    if (quote) {
      await supabase.from('customers').update({
        full_name: customer.nome_completo,
        cpf_cnpj: customer.cpf_cnpj,
        endereco_rua: customer.endereco_rua,
        endereco_numero: customer.endereco_numero,
        endereco_bairro: customer.endereco_bairro,
        endereco_cidade: customer.endereco_cidade,
        endereco_complemento: customer.endereco_complemento,
        ponto_referencia: customer.ponto_referencia,
      }).eq('id', quote.customer_id);
    }

    await fetchBusySlots();
    setStep('select_slot');
  };

  // "Eu mesmo" toggle
  const handleEuMesmo = (checked: boolean) => {
    setEuMesmo(checked);
    if (checked) {
      setCustomer(prev => ({
        ...prev,
        nome_acompanhante: prev.nome_completo,
        whatsapp_acompanhante: '',
      }));
    } else {
      setCustomer(prev => ({
        ...prev,
        nome_acompanhante: '',
        whatsapp_acompanhante: '',
      }));
    }
  };

  const handleConfirm = async () => {
    if (!selectedTime || !selectedDate || !quote || !service) return;
    setSaving(true);

    try {
      const duration = (service as any)?.duration_minutes || 90;
      const startISO = new Date(`${selectedDate}T${selectedTime.start}:00-03:00`).toISOString();
      const endISO = new Date(`${selectedDate}T${selectedTime.end}:00-03:00`).toISOString();

      const companionName = euMesmo ? customer.nome_completo : customer.nome_acompanhante;
      const companionPhone = euMesmo ? '' : customer.whatsapp_acompanhante;

      // 1. Create appointment in database
      const { error } = await supabase.from('appointments').insert({
        quote_id: quote.id,
        customer_id: quote.customer_id,
        service_id: quote.service_id,
        scheduled_date: selectedDate,
        scheduled_time_start: selectedTime.start + ':00',
        scheduled_time_end: selectedTime.end + ':00',
        status: 'scheduled',
        nome_acompanhante: companionName,
        whatsapp_acompanhante: companionPhone,
      });
      if (error) throw error;

      // 2. Update quote status
      await supabase.from('quotes').update({ status: 'scheduled' }).eq('id', quote.id);

      // 3. Create Google Calendar event
      const endereco = `${customer.endereco_rua}, ${customer.endereco_numero} - ${customer.endereco_bairro}, ${customer.endereco_cidade}${customer.endereco_complemento ? ' (' + customer.endereco_complemento + ')' : ''}`;
      const description = [
        `📋 Serviço: ${service.name}`,
        `👤 Cliente: ${customer.nome_completo}`,
        `📄 CPF/CNPJ: ${customer.cpf_cnpj}`,
        `📍 Endereço: ${endereco}`,
        `📌 Ponto de Referência: ${customer.ponto_referencia}`,
        `👥 Acompanhante: ${companionName}${companionPhone ? ' (' + companionPhone + ')' : ' (próprio cliente)'}`,
        `⏱️ Duração: ${duration} min`,
      ].join('\n');

      try {
        await fetch(`${API_BASE}/api/google-calendar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `🔧 ${service.name} — ${customer.nome_completo}`,
            description,
            startTime: startISO,
            endTime: endISO,
            location: endereco,
          }),
        });
      } catch (e) {
        console.warn('Google Calendar event creation failed (non-blocking):', e);
      }

      setStep('success');
    } catch (err) {
      console.error('Error creating appointment:', err);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const day = date.getDate();
    const weekday = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()];
    const month = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][date.getMonth()];
    return { day, weekday, month };
  };

  const updateField = (key: keyof CustomerData, val: string) => {
    setCustomer(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  // ---- RENDER ----

  if (step === 'loading') {
    return (
      <div className="pub-page">
        <div className="pub-loading">
          <Loader2 size={40} className="spin" />
          <p>Carregando agendamento...</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="pub-page">
        <div className="pub-card pub-error-card animate-fade-in">
          <div className="pub-error-icon">✕</div>
          <h2>Orçamento não encontrado</h2>
          <p>Verifique o link recebido ou solicite um novo orçamento.</p>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="pub-page">
        <div className="pub-card animate-fade-in" style={{ textAlign: 'center' }}>
          <div className="pub-header">
            <div className="pub-logo">
              <img src="/petardo-logo.png" alt="PETARDO" style={{ width: 32, height: 32, borderRadius: '50%' }} />
              <span>PETARDO</span>
            </div>
          </div>

          <div className="sched-success">
            <CheckCircle size={56} className="pub-success-icon" />
            <h2>Agendamento Confirmado! 🎉</h2>
            <p>Seu serviço foi agendado com sucesso.</p>
          </div>

          <div className="sched-summary glass-panel">
            <div className="sched-summary-item">
              <Calendar size={18} />
              <div><strong>Data</strong><span>{formatDate(selectedDate)}</span></div>
            </div>
            <div className="sched-summary-item">
              <Clock size={18} />
              <div><strong>Horário</strong><span>{selectedTime!.start} - {selectedTime!.end}</span></div>
            </div>
            <div className="sched-summary-item">
              <MapPin size={18} />
              <div><strong>Serviço</strong><span>{service?.name}</span></div>
            </div>
            <div className="sched-summary-item">
              <Home size={18} />
              <div><strong>Endereço</strong><span>{customer.endereco_rua}, {customer.endereco_numero} - {customer.endereco_bairro}</span></div>
            </div>
          </div>

          <p className="sched-whatsapp-note">
            📱 Você receberá uma confirmação pelo WhatsApp com todos os detalhes.
          </p>
        </div>
      </div>
    );
  }

  // ---- CUSTOMER DATA FORM ----
  if (step === 'customer_data') {
    return (
      <div className="pub-page">
        <div className="pub-card sched-card animate-fade-in">
          <div className="pub-header">
            <div className="pub-logo">
              <img src="/petardo-logo.png" alt="PETARDO" style={{ width: 32, height: 32, borderRadius: '50%' }} />
              <span>PETARDO</span>
            </div>
            <span className="pub-badge">📅 Agendamento</span>
          </div>

          <div className="sched-title">
            <h2>{service?.name}</h2>
            <p>Preencha seus dados para agendar</p>
          </div>

          {customerFound && (
            <div className="sched-found-notice animate-fade-in">
              <UserCheck size={18} />
              <span>Encontramos seu cadastro! Confirme os dados abaixo.</span>
            </div>
          )}

          {/* Block 1: Personal Data */}
          <div className="sched-section">
            <h3><User size={16} /> Dados Pessoais</h3>
            <div className="sched-field">
              <label>Nome Completo *</label>
              <input className={`pub-input ${errors.nome_completo ? 'has-error' : ''}`} value={customer.nome_completo} onChange={e => updateField('nome_completo', e.target.value)} placeholder="Seu nome completo" />
              {errors.nome_completo && <span className="pub-error">{errors.nome_completo}</span>}
            </div>
            <div className="sched-field">
              <label>CPF ou CNPJ *</label>
              <input className={`pub-input ${errors.cpf_cnpj ? 'has-error' : ''}`} value={customer.cpf_cnpj} onChange={e => updateField('cpf_cnpj', e.target.value)} placeholder="000.000.000-00" />
              {errors.cpf_cnpj && <span className="pub-error">{errors.cpf_cnpj}</span>}
            </div>
          </div>

          {/* Block 2: Address */}
          <div className="sched-section">
            <h3><Home size={16} /> Endereço do Serviço</h3>
            <div className="sched-field-row">
              <div className="sched-field" style={{ flex: 3 }}>
                <label>Rua *</label>
                <input className={`pub-input ${errors.endereco_rua ? 'has-error' : ''}`} value={customer.endereco_rua} onChange={e => updateField('endereco_rua', e.target.value)} placeholder="Nome da rua" />
                {errors.endereco_rua && <span className="pub-error">{errors.endereco_rua}</span>}
              </div>
              <div className="sched-field" style={{ flex: 1 }}>
                <label>Nº *</label>
                <input className={`pub-input ${errors.endereco_numero ? 'has-error' : ''}`} value={customer.endereco_numero} onChange={e => updateField('endereco_numero', e.target.value)} placeholder="Nº" />
                {errors.endereco_numero && <span className="pub-error">{errors.endereco_numero}</span>}
              </div>
            </div>
            <div className="sched-field-row">
              <div className="sched-field" style={{ flex: 1 }}>
                <label>Bairro *</label>
                <input className={`pub-input ${errors.endereco_bairro ? 'has-error' : ''}`} value={customer.endereco_bairro} onChange={e => updateField('endereco_bairro', e.target.value)} placeholder="Bairro" />
                {errors.endereco_bairro && <span className="pub-error">{errors.endereco_bairro}</span>}
              </div>
              <div className="sched-field" style={{ flex: 1 }}>
                <label>Cidade *</label>
                <input className={`pub-input ${errors.endereco_cidade ? 'has-error' : ''}`} value={customer.endereco_cidade} onChange={e => updateField('endereco_cidade', e.target.value)} placeholder="Cidade" />
                {errors.endereco_cidade && <span className="pub-error">{errors.endereco_cidade}</span>}
              </div>
            </div>
            <div className="sched-field">
              <label>Complemento</label>
              <input className="pub-input" value={customer.endereco_complemento} onChange={e => updateField('endereco_complemento', e.target.value)} placeholder="Apto, Bloco, etc. (opcional)" />
            </div>
            <div className="sched-field">
              <label>Ponto de Referência *</label>
              <input className={`pub-input ${errors.ponto_referencia ? 'has-error' : ''}`} value={customer.ponto_referencia} onChange={e => updateField('ponto_referencia', e.target.value)} placeholder="Próximo a..." />
              {errors.ponto_referencia && <span className="pub-error">{errors.ponto_referencia}</span>}
            </div>
          </div>

          {/* Block 3: Companion */}
          <div className="sched-section">
            <h3><Phone size={16} /> Quem vai acompanhar a equipe?</h3>
            <label className={`pub-checkbox-option ${euMesmo ? 'selected' : ''}`}>
              <input type="checkbox" checked={euMesmo} onChange={(e) => handleEuMesmo(e.target.checked)} />
              <span className="checkbox-mark">✓</span>
              <span>Eu mesmo</span>
            </label>
            {!euMesmo && (
              <div className="animate-fade-in" style={{ marginTop: '0.75rem' }}>
                <div className="sched-field">
                  <label>Nome do Acompanhante *</label>
                  <input className={`pub-input ${errors.nome_acompanhante ? 'has-error' : ''}`} value={customer.nome_acompanhante} onChange={e => updateField('nome_acompanhante', e.target.value)} placeholder="Nome de quem estará no local" />
                  {errors.nome_acompanhante && <span className="pub-error">{errors.nome_acompanhante}</span>}
                </div>
                <div className="sched-field">
                  <label>WhatsApp do Acompanhante *</label>
                  <input className={`pub-input ${errors.whatsapp_acompanhante ? 'has-error' : ''}`} value={customer.whatsapp_acompanhante} onChange={e => updateField('whatsapp_acompanhante', e.target.value)} placeholder="(32) 99999-9999" />
                  {errors.whatsapp_acompanhante && <span className="pub-error">{errors.whatsapp_acompanhante}</span>}
                </div>
              </div>
            )}
          </div>

          <button className="pub-btn pub-btn-primary pub-btn-lg" onClick={handleCustomerNext}>
            Escolher Horário <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  // ---- SLOT SELECTION ----
  if (step === 'select_slot' || step === 'confirm') {
    const availableDates = getAvailableDates();
    const slotsForDate = selectedDate ? generateSlots(selectedDate) : [];

    return (
      <div className="pub-page">
        <div className="pub-card sched-card animate-fade-in">
          <div className="pub-header">
            <div className="pub-logo">
              <img src="/petardo-logo.png" alt="PETARDO" style={{ width: 32, height: 32, borderRadius: '50%' }} />
              <span>PETARDO</span>
            </div>
            <span className="pub-badge">📅 Agendamento</span>
          </div>

          <div className="sched-title">
            <h2>{service?.name}</h2>
            <p>Escolha a melhor data e horário</p>
          </div>

          {loadingSlots ? (
            <div className="pub-loading" style={{ padding: '2rem 0' }}>
              <Loader2 size={32} className="spin" />
              <p>Consultando agenda...</p>
            </div>
          ) : (
            <>
              {/* Horizontal Date Carousel */}
              <div className="sched-dates-section">
                <h3><Calendar size={16} /> Selecione o dia</h3>
                <div className="sched-dates-scroll">
                  {availableDates.map(dateStr => {
                    const { day, weekday, month } = formatDateShort(dateStr);
                    const isSelected = selectedDate === dateStr;
                    return (
                      <button
                        key={dateStr}
                        className={`sched-date-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => { setSelectedDate(dateStr); setSelectedTime(null); }}
                      >
                        <span className="sched-date-weekday">{weekday}</span>
                        <span className="sched-date-day">{day}</span>
                        <span className="sched-date-month">{month}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              {selectedDate && (
                <div className="sched-time-section animate-fade-in">
                  <h3><Clock size={16} /> Horários disponíveis</h3>
                  {slotsForDate.length === 0 ? (
                    <p className="sched-no-slots-text">Nenhum horário disponível neste dia.</p>
                  ) : (
                    <div className="sched-time-grid">
                      {slotsForDate.map(slot => (
                        <button
                          key={slot.start}
                          className={`sched-time-btn ${selectedTime?.start === slot.start ? 'selected' : ''}`}
                          onClick={() => { setSelectedTime(slot); setStep('confirm'); }}
                        >
                          {slot.start}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Confirmation */}
              {step === 'confirm' && selectedTime && (
                <div className="sched-confirm-section animate-fade-in">
                  <div className="sched-confirm-details">
                    <div className="sched-summary-item">
                      <Calendar size={16} /><span>{formatDate(selectedDate)}</span>
                    </div>
                    <div className="sched-summary-item">
                      <Clock size={16} /><span>{selectedTime.start} - {selectedTime.end}</span>
                    </div>
                    <div className="sched-summary-item">
                      <MapPin size={16} /><span>{customer.endereco_rua}, {customer.endereco_numero} - {customer.endereco_bairro}</span>
                    </div>
                  </div>
                  <div className="sched-confirm-actions">
                    <button className="pub-btn pub-btn-outline" onClick={() => { setStep('customer_data'); }}>
                      <ChevronLeft size={16} /> Alterar Dados
                    </button>
                    <button className="pub-btn pub-btn-primary" onClick={handleConfirm} disabled={saving}>
                      {saving ? <><Loader2 size={16} className="spin" /> Confirmando...</> : 'Confirmar ✓'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}
