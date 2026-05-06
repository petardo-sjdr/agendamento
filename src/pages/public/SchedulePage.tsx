import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Quote, Service, AvailableSlot } from '../../lib/types';
import {
  Bug, Calendar, Clock, CheckCircle, ChevronLeft,
  ChevronRight, MapPin, Loader2
} from 'lucide-react';
import './SchedulePage.css';

type Step = 'loading' | 'select_date' | 'select_time' | 'confirm' | 'success' | 'error';

export default function SchedulePage() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const [step, setStep] = useState<Step>('loading');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (quoteId) loadData();
  }, [quoteId]);

  const loadData = async () => {
    try {
      const { data: q } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (!q || q.status !== 'approved') {
        setStep('error');
        return;
      }

      setQuote(q);

      const { data: svc } = await supabase
        .from('services')
        .select('*')
        .eq('id', q.service_id)
        .single();
      setService(svc);

      // Load available slots for the next 30 days
      const today = new Date();
      const endDate = new Date(today.getTime() + 30 * 86400000);

      const { data: slotsData } = await supabase
        .from('available_slots')
        .select('*')
        .eq('is_blocked', false)
        .gte('date', today.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date')
        .order('time_start');

      // Filter slots with availability
      const availableSlots = (slotsData || []).filter(s =>
        s.current_count < s.max_appointments &&
        (s.service_id === null || s.service_id === q.service_id)
      );

      setSlots(availableSlots);
      setStep('select_date');
    } catch {
      setStep('error');
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth, year, month };
  };

  const getAvailableDates = () => {
    const dates = new Set(slots.map(s => s.date));
    return dates;
  };

  const getSlotsForDate = (date: string) => {
    return slots.filter(s => s.date === date);
  };

  const handleDateSelect = (date: string) => {
    const dateSlots = getSlotsForDate(date);
    if (dateSlots.length === 0) return;
    setSelectedDate(date);
    setSelectedSlot(null);
    setStep('select_time');
  };

  const handleConfirm = async () => {
    if (!selectedSlot || !quote) return;
    setSaving(true);

    try {
      // Create appointment
      const { error } = await supabase.from('appointments').insert({
        quote_id: quote.id,
        customer_id: quote.customer_id,
        service_id: quote.service_id,
        scheduled_date: selectedDate,
        scheduled_time_start: selectedSlot.time_start,
        scheduled_time_end: selectedSlot.time_end,
        status: 'scheduled',
      });

      if (error) throw error;

      // Update slot count
      await supabase
        .from('available_slots')
        .update({ current_count: selectedSlot.current_count + 1 })
        .eq('id', selectedSlot.id);

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

  const formatTime = (time: string) => time.slice(0, 5);

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const availableDates = getAvailableDates();
  const { firstDay, daysInMonth, year, month } = getDaysInMonth(currentMonth);

  if (step === 'loading') {
    return (
      <div className="pub-page">
        <div className="pub-loading">
          <Loader2 size={40} className="spin" />
          <p>Carregando horários...</p>
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
            <div className="pub-logo"><Bug size={24} /><span>PETARDO</span></div>
          </div>

          <div className="sched-success">
            <CheckCircle size={56} className="pub-success-icon" />
            <h2>Agendamento Confirmado! 🎉</h2>
            <p>Seu serviço foi agendado com sucesso.</p>
          </div>

          <div className="sched-summary glass-panel">
            <div className="sched-summary-item">
              <Calendar size={18} />
              <div>
                <strong>Data</strong>
                <span>{formatDate(selectedDate)}</span>
              </div>
            </div>
            <div className="sched-summary-item">
              <Clock size={18} />
              <div>
                <strong>Horário</strong>
                <span>{formatTime(selectedSlot!.time_start)} - {formatTime(selectedSlot!.time_end)}</span>
              </div>
            </div>
            <div className="sched-summary-item">
              <MapPin size={18} />
              <div>
                <strong>Serviço</strong>
                <span>{service?.name}</span>
              </div>
            </div>
          </div>

          <p className="sched-whatsapp-note">
            📱 Você receberá uma confirmação pelo WhatsApp com todos os detalhes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pub-page">
      <div className="pub-card sched-card animate-fade-in">
        <div className="pub-header">
          <div className="pub-logo"><Bug size={24} /><span>PETARDO</span></div>
          <span className="pub-badge">📅 Agendamento</span>
        </div>

        <div className="sched-title">
          <h2>{service?.name}</h2>
          <p>Escolha a melhor data e horário</p>
        </div>

        {/* Date Selection */}
        {(step === 'select_date' || step === 'select_time' || step === 'confirm') && (
          <>
            {/* Calendar Header */}
            <div className="cal-header">
              <button className="cal-nav-btn" onClick={() => {
                const prev = new Date(currentMonth);
                prev.setMonth(prev.getMonth() - 1);
                setCurrentMonth(prev);
              }}>
                <ChevronLeft size={18} />
              </button>
              <span className="cal-month">{monthNames[month]} {year}</span>
              <button className="cal-nav-btn" onClick={() => {
                const next = new Date(currentMonth);
                next.setMonth(next.getMonth() + 1);
                setCurrentMonth(next);
              }}>
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="cal-grid">
              {dayNames.map(d => (
                <div key={d} className="cal-day-name">{d}</div>
              ))}
              {Array.from({ length: firstDay }, (_, i) => (
                <div key={`empty-${i}`} className="cal-day empty" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isAvailable = availableDates.has(dateStr);
                const isSelected = selectedDate === dateStr;
                const isPast = new Date(dateStr) < new Date(new Date().toISOString().split('T')[0]);

                return (
                  <button
                    key={day}
                    className={`cal-day ${isAvailable && !isPast ? 'available' : ''} ${isSelected ? 'selected' : ''} ${isPast ? 'past' : ''}`}
                    disabled={!isAvailable || isPast}
                    onClick={() => handleDateSelect(dateStr)}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {slots.length === 0 && (
              <div className="sched-no-slots">
                <Clock size={32} />
                <p>Não há horários disponíveis no momento.</p>
                <p>Entre em contato pelo WhatsApp para agendar.</p>
              </div>
            )}
          </>
        )}

        {/* Time Selection */}
        {step === 'select_time' && selectedDate && (
          <div className="sched-time-section animate-fade-in">
            <h3>Horários - {formatDate(selectedDate)}</h3>
            <div className="sched-time-grid">
              {getSlotsForDate(selectedDate).map(slot => (
                <button
                  key={slot.id}
                  className={`sched-time-btn ${selectedSlot?.id === slot.id ? 'selected' : ''}`}
                  onClick={() => { setSelectedSlot(slot); setStep('confirm'); }}
                >
                  <Clock size={14} />
                  {formatTime(slot.time_start)} - {formatTime(slot.time_end)}
                  <span className="sched-slots-left">
                    {slot.max_appointments - slot.current_count} vaga(s)
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Confirmation */}
        {step === 'confirm' && selectedSlot && (
          <div className="sched-confirm-section animate-fade-in">
            <h3>Confirmar Agendamento</h3>
            <div className="sched-confirm-details">
              <div className="sched-summary-item">
                <Calendar size={16} />
                <span>{formatDate(selectedDate)}</span>
              </div>
              <div className="sched-summary-item">
                <Clock size={16} />
                <span>{formatTime(selectedSlot.time_start)} - {formatTime(selectedSlot.time_end)}</span>
              </div>
            </div>
            <div className="sched-confirm-actions">
              <button className="pub-btn pub-btn-outline" onClick={() => setStep('select_time')}>
                Alterar Horário
              </button>
              <button className="pub-btn pub-btn-primary" onClick={handleConfirm} disabled={saving}>
                {saving ? 'Confirmando...' : 'Confirmar ✓'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
