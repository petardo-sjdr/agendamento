import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Copy, Trash2, ExternalLink } from 'lucide-react';
import './QuotesAdmin.css';

export default function QuotesAdmin() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        services (name),
        customers (full_name, phone)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading quotes:', error);
    } else {
      setQuotes(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este orçamento?')) return;
    const { error } = await supabase.from('quotes').delete().eq('id', id);
    if (!error) {
      setQuotes(prev => prev.filter(q => q.id !== id));
    }
  };

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/orcamento/${token}`;
    await navigator.clipboard.writeText(url);
    alert('Link copiado!');
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'pending': return 'Pendente';
      case 'approved': return 'Aprovado';
      case 'rejected': return 'Rejeitado';
      case 'expired': return 'Expirado';
      default: return status;
    }
  };

  return (
    <div className="quotes-admin">
      <div className="page-title">
        <div>
          <h1>Orçamentos</h1>
          <p>Gerencie os orçamentos e links gerados</p>
        </div>
      </div>

      <div className="quotes-list glass-panel">
        {loading ? (
          <div className="quotes-empty">Carregando...</div>
        ) : quotes.length === 0 ? (
          <div className="quotes-empty">
            <FileText size={48} />
            <p>Nenhum orçamento encontrado.</p>
          </div>
        ) : (
          <table className="quotes-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Serviço</th>
                <th>Cliente</th>
                <th>Status</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(q => (
                <tr key={q.id}>
                  <td>
                    <div className="quote-date">
                      {new Date(q.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td>
                    <div className="quote-service">{q.services?.name || 'Desconhecido'}</div>
                    <div className="quote-date" style={{ fontSize: '0.7rem' }}>
                      {q.customer_type === 'residential' ? 'Residencial' : 'Comercial'}
                    </div>
                  </td>
                  <td>
                    {q.customers ? (
                      <>
                        <div>{q.customers.full_name}</div>
                        <div className="quote-date">{q.customers.phone}</div>
                      </>
                    ) : (
                      <span className="quote-date">Não identificado</span>
                    )}
                  </td>
                  <td>
                    <span className={`quote-status status-${q.status}`}>
                      {getStatusLabel(q.status)}
                    </span>
                  </td>
                  <td>
                    {q.final_price ? (
                      <span className="quote-price">
                        R$ {Number(q.final_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="quote-date">-</span>
                    )}
                  </td>
                  <td>
                    <div className="quote-actions">
                      <button
                        className="icon-btn"
                        title="Abrir Orçamento"
                        onClick={() => window.open(`/orcamento/${q.token}`, '_blank')}
                      >
                        <ExternalLink size={16} />
                      </button>
                      <button
                        className="icon-btn"
                        title="Copiar Link"
                        onClick={() => copyLink(q.token)}
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        className="icon-btn icon-btn-danger"
                        title="Excluir"
                        onClick={() => handleDelete(q.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
