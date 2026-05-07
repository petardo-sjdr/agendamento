import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Star, Trash2 } from 'lucide-react';
import './ReviewsAdmin.css';

export default function ReviewsAdmin() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        customers (name, phone),
        appointments (
          scheduled_date,
          services (name)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading reviews:', error);
    } else {
      setReviews(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta avaliação?')) return;
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (!error) {
      setReviews(prev => prev.filter(r => r.id !== id));
    }
  };

  const renderStars = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <div className="reviews-admin">
      <div className="page-title">
        <div>
          <h1>Avaliações</h1>
          <p>Feedback dos clientes sobre os serviços realizados</p>
        </div>
      </div>

      <div className="reviews-list glass-panel">
        {loading ? (
          <div className="reviews-empty">Carregando...</div>
        ) : reviews.length === 0 ? (
          <div className="reviews-empty">
            <Star size={48} />
            <p>Nenhuma avaliação recebida ainda.</p>
          </div>
        ) : (
          <table className="reviews-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Serviço Avaliado</th>
                <th>Nota</th>
                <th>Comentário</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map(r => {
                let dateStr = '-';
                if (r.appointments?.scheduled_date) {
                  const parts = r.appointments.scheduled_date.split('-');
                  dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
                }

                return (
                  <tr key={r.id}>
                    <td>
                      <div className="review-date">
                        {new Date(r.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td>
                      {r.customers ? (
                        <>
                          <div style={{ fontWeight: 500 }}>{r.customers.name}</div>
                          <div className="review-date">{r.customers.phone}</div>
                        </>
                      ) : (
                        <span className="review-date">Desconhecido</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>
                        {r.appointments?.services?.name || 'Desconhecido'}
                      </div>
                      <div className="review-date">
                        Realizado em: {dateStr}
                      </div>
                    </td>
                    <td>
                      <div className="review-stars">
                        {renderStars(r.rating)}
                      </div>
                    </td>
                    <td>
                      <div className="review-comment">
                        {r.comment ? `"${r.comment}"` : '-'}
                      </div>
                    </td>
                    <td>
                      <button
                        className="icon-btn icon-btn-danger"
                        title="Excluir Avaliação"
                        onClick={() => handleDelete(r.id)}
                      >
                        <Trash2 size={16} />
                      </button>
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
