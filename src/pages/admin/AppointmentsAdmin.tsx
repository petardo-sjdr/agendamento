import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CalendarDays, Trash2 } from 'lucide-react';
import './AppointmentsAdmin.css';

export default function AppointmentsAdmin() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        services (name),
        customers (name, phone, endereco_rua, endereco_numero, endereco_bairro, endereco_cidade)
      `)
      .order('scheduled_date', { ascending: false })
      .order('scheduled_time_start', { ascending: false });

    if (error) {
      console.error('Error loading appointments:', error);
    } else {
      setAppointments(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar e excluir este agendamento? O evento também precisará ser removido do Google Calendar manualmente.')) return;
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (!error) {
      setAppointments(prev => prev.filter(a => a.id !== id));
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'scheduled': return 'Agendado';
      case 'confirmed': return 'Confirmado';
      case 'in_progress': return 'Em Andamento';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      case 'no_show': return 'Não Compareceu';
      default: return status;
    }
  };

  return (
    <div className="appointments-admin">
      <div className="page-title">
        <div>
          <h1>Agendamentos</h1>
          <p>Visualize e gerencie os serviços agendados da equipe</p>
        </div>
      </div>

      <div className="appointments-list glass-panel">
        {loading ? (
          <div className="appointments-empty">Carregando...</div>
        ) : appointments.length === 0 ? (
          <div className="appointments-empty">
            <CalendarDays size={48} />
            <p>Nenhum agendamento encontrado.</p>
          </div>
        ) : (
          <table className="appointments-table">
            <thead>
              <tr>
                <th>Data e Hora</th>
                <th>Serviço</th>
                <th>Cliente e Endereço</th>
                <th>Acompanhante</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map(a => {
                // Formata Data
                let dateStr = a.scheduled_date;
                try {
                  const parts = a.scheduled_date.split('-');
                  dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
                } catch(e) {}
                
                const timeStr = `${a.scheduled_time_start.slice(0,5)} às ${a.scheduled_time_end.slice(0,5)}`;

                return (
                  <tr key={a.id}>
                    <td>
                      <div className="appt-service">{dateStr}</div>
                      <div className="appt-date">{timeStr}</div>
                    </td>
                    <td>
                      <div className="appt-service">{a.services?.name || 'Desconhecido'}</div>
                    </td>
                    <td>
                      {a.customers ? (
                        <>
                          <div className="appt-service">{a.customers.name} ({a.customers.phone})</div>
                          <div className="appt-date" style={{ fontSize: '0.7rem' }}>
                            {a.customers.endereco_rua}, {a.customers.endereco_numero} - {a.customers.endereco_bairro} - {a.customers.endereco_cidade}
                          </div>
                        </>
                      ) : (
                        <span className="appt-date">Não identificado</span>
                      )}
                    </td>
                    <td>
                      {a.nome_acompanhante ? (
                        <>
                          <div>{a.nome_acompanhante}</div>
                          <div className="appt-date">{a.whatsapp_acompanhante}</div>
                        </>
                      ) : (
                        <span className="appt-date">-</span>
                      )}
                    </td>
                    <td>
                      <span className={`appt-status status-${a.status}`}>
                        {getStatusLabel(a.status)}
                      </span>
                    </td>
                    <td>
                      <div className="appt-actions">
                        <button
                          className="icon-btn icon-btn-danger"
                          title="Excluir Agendamento"
                          onClick={() => handleDelete(a.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
