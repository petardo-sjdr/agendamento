import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Bug, Loader2, AlertCircle } from 'lucide-react';
import '../public/QuotePage.css';

type Status = 'processing' | 'error';

export default function IniciarPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('processing');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    processLink();
  }, []);

  const processLink = async () => {
    try {
      const phone = searchParams.get('phone') || searchParams.get('telefone') || '';
      const serviceSlug = searchParams.get('servico') || searchParams.get('service') || '';

      // Validate required fields
      if (!phone) {
        setErrorMsg('Número de telefone não informado no link.');
        setStatus('error');
        return;
      }

      if (!serviceSlug) {
        setErrorMsg('Tipo de serviço não informado no link.');
        setStatus('error');
        return;
      }

      // Normalize phone
      let normalizedPhone = phone.replace(/\D/g, '');
      if (normalizedPhone.length === 11) {
        normalizedPhone = '55' + normalizedPhone;
      } else if (normalizedPhone.length === 10) {
        normalizedPhone = '55' + normalizedPhone;
      }

      // Find service by slug
      const { data: service, error: svcErr } = await supabase
        .from('services')
        .select('id, name, is_active')
        .eq('slug', serviceSlug)
        .single();

      if (svcErr || !service) {
        setErrorMsg(`Serviço "${serviceSlug}" não encontrado.`);
        setStatus('error');
        return;
      }

      if (!service.is_active) {
        setErrorMsg('Este serviço está temporariamente indisponível.');
        setStatus('error');
        return;
      }

      // Check if customer exists
      let customerId: string;
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', normalizedPhone)
        .single();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        // Create new customer with minimal data (just phone)
        const { data: newCustomer, error: custErr } = await supabase
          .from('customers')
          .insert({
            name: 'Cliente',
            phone: normalizedPhone,
            source: 'whatsapp',
          })
          .select('id')
          .single();

        if (custErr || !newCustomer) {
          setErrorMsg('Erro ao criar cadastro. Tente novamente.');
          setStatus('error');
          return;
        }
        customerId = newCustomer.id;
      }

      // Check if there's already a pending quote for this customer + service
      const { data: existingQuote } = await supabase
        .from('quotes')
        .select('id, token, status')
        .eq('customer_id', customerId)
        .eq('service_id', service.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingQuote) {
        // Reuse existing pending quote
        navigate(`/orcamento/${existingQuote.token}`, { replace: true });
        return;
      }

      // Create new quote (no customer_type yet - will be asked in the form)
      const { data: quote, error: quoteErr } = await supabase
        .from('quotes')
        .insert({
          customer_id: customerId,
          service_id: service.id,
          status: 'pending',
        })
        .select('id, token')
        .single();

      if (quoteErr || !quote) {
        setErrorMsg('Erro ao criar orçamento. Tente novamente.');
        setStatus('error');
        return;
      }

      // Redirect to quote page
      navigate(`/orcamento/${quote.token}`, { replace: true });

    } catch (err) {
      console.error('Error processing link:', err);
      setErrorMsg('Ocorreu um erro inesperado. Tente novamente.');
      setStatus('error');
    }
  };

  if (status === 'error') {
    return (
      <div className="pub-page">
        <div className="pub-card pub-error-card animate-fade-in">
          <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '0.5rem' }} />
          <h2>Ops!</h2>
          <p>{errorMsg}</p>
          <p style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
            Entre em contato pelo WhatsApp para solicitar seu orçamento.
          </p>
        </div>
      </div>
    );
  }

  // Processing
  return (
    <div className="pub-page">
      <div className="pub-card animate-fade-in" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <div className="pub-logo" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
          <Bug size={28} />
          <span style={{ fontSize: '1.3rem' }}>PETARDO</span>
        </div>
        <Loader2 size={44} className="spin" style={{ color: '#f5c518', marginBottom: '1.5rem' }} />
        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Preparando seu orçamento...</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Aguarde um momento</p>
      </div>
    </div>
  );
}
