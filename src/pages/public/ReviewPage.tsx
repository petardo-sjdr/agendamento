import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Bug, Star, CheckCircle, Loader2, Send } from 'lucide-react';
import './ReviewPage.css';

type Step = 'loading' | 'form' | 'success' | 'already_reviewed' | 'error';

export default function ReviewPage() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState<Step>('loading');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [serviceName, setServiceName] = useState('');

  useEffect(() => {
    if (token) loadReview();
  }, [token]);

  const loadReview = async () => {
    try {
      // Check if review already exists
      const { data: existing } = await supabase
        .from('reviews')
        .select('*')
        .eq('token', token)
        .single();

      if (existing) {
        setStep('already_reviewed');
        return;
      }

      // Token is the appointment_id or a review token
      // Try loading appointment to get service name
      const { data: appt } = await supabase
        .from('appointments')
        .select('*, services(name)')
        .eq('id', token)
        .single();

      if (appt) {
        setServiceName((appt as any).services?.name || 'o serviço');
      }

      setStep('form');
    } catch {
      setStep('form'); // Allow review even if we can't find the appointment
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSaving(true);

    try {
      await supabase.from('reviews').insert({
        appointment_id: token,
        customer_id: null, // Will be linked later
        rating,
        comment: comment || null,
        token,
      });

      setStep('success');
    } catch (err) {
      console.error('Error submitting review:', err);
    } finally {
      setSaving(false);
    }
  };

  if (step === 'loading') {
    return (
      <div className="pub-page">
        <div className="pub-loading">
          <Loader2 size={40} className="spin" />
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="pub-page">
        <div className="pub-card pub-error-card animate-fade-in">
          <div className="pub-error-icon">✕</div>
          <h2>Link inválido</h2>
          <p>Este link de avaliação não é válido.</p>
        </div>
      </div>
    );
  }

  if (step === 'already_reviewed') {
    return (
      <div className="pub-page">
        <div className="pub-card animate-fade-in" style={{ textAlign: 'center' }}>
          <CheckCircle size={48} className="pub-success-icon" />
          <h2>Avaliação já enviada</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Você já avaliou este serviço. Obrigado!</p>
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
          <CheckCircle size={56} className="pub-success-icon" />
          <h2>Obrigado pela avaliação! 🎉</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Sua opinião é muito importante para continuarmos melhorando nossos serviços.
          </p>
          <div className="review-stars-display">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} size={28} className={i <= rating ? 'star-filled' : 'star-empty'} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---- FORM ----
  return (
    <div className="pub-page">
      <div className="pub-card review-card animate-fade-in">
        <div className="pub-header">
          <div className="pub-logo"><Bug size={24} /><span>PETARDO</span></div>
        </div>

        <div className="review-title">
          <h2>Avalie nosso serviço</h2>
          {serviceName && <p>Como foi o serviço de <strong>{serviceName}</strong>?</p>}
          {!serviceName && <p>Sua opinião é muito importante para nós!</p>}
        </div>

        {/* Star Rating */}
        <div className="review-stars">
          {[1, 2, 3, 4, 5].map(i => (
            <button
              key={i}
              className="review-star-btn"
              onMouseEnter={() => setHoverRating(i)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(i)}
            >
              <Star
                size={40}
                className={i <= (hoverRating || rating) ? 'star-filled' : 'star-empty'}
              />
            </button>
          ))}
        </div>

        <div className="review-rating-text">
          {rating === 0 && 'Toque nas estrelas para avaliar'}
          {rating === 1 && '😞 Muito ruim'}
          {rating === 2 && '😕 Ruim'}
          {rating === 3 && '😐 Regular'}
          {rating === 4 && '😊 Bom'}
          {rating === 5 && '🤩 Excelente!'}
        </div>

        {/* Comment */}
        <div className="pub-field-group">
          <label className="pub-label">Deixe um comentário (opcional)</label>
          <textarea
            className="pub-input pub-textarea"
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Conte-nos sobre sua experiência..."
            rows={4}
          />
        </div>

        {/* Submit */}
        <button
          className="pub-btn pub-btn-primary pub-btn-lg"
          onClick={handleSubmit}
          disabled={rating === 0 || saving}
        >
          {saving ? 'Enviando...' : (
            <><Send size={18} /> Enviar Avaliação</>
          )}
        </button>
      </div>
    </div>
  );
}
