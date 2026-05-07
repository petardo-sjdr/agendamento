import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Service, ServiceField, Quote } from '../../lib/types';
import {
  Bug, Wrench, Droplets, Droplet, Flame, MousePointer,
  Hexagon, Moon, Layers, CloudRain, Shield, Zap,
  Thermometer, Leaf, Home, Building2, Truck,
  ChevronRight, CheckCircle, MessageCircle, Info, Loader2, X, ExternalLink, FileText, Star
} from 'lucide-react';
import './QuotePage.css';

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Wrench, Bug, Droplets, Droplet, Flame, MousePointer,
  Hexagon, Moon, Layers, CloudRain, Shield, Zap,
  Thermometer, Leaf, Home, Building2, Truck,
};

type Step = 'loading' | 'intro' | 'form' | 'calculating' | 'result' | 'approved' | 'error' | 'expired';

const CUSTOMER_TYPE_FIELD: ServiceField = {
  id: 'sys-tipo-atendimento',
  service_id: 'system',
  field_key: 'sys_tipo_atendimento',
  field_label: 'O serviço é para um imóvel residencial ou comercial?',
  field_type: 'radio',
  field_options: [
    { label: 'Residencial (Casa / Apartamento)', value: 'residential', price: 0, manual_review: false },
    { label: 'Comercial (Empresa / Loja)', value: 'commercial', price: 0, manual_review: false },
  ],
  placeholder: '',
  helper_text: '',
  is_required: true,
  display_order: -10,
  applies_to: 'both',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export default function QuotePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('loading');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [fields, setFields] = useState<ServiceField[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [priceBreakdown, setPriceBreakdown] = useState<Array<{ questionLabel?: string; answerLabel: string; value: number }>>([]);
  const [showLawModal, setShowLawModal] = useState(false);

  useEffect(() => {
    if (token) loadQuote();
  }, [token]);

  const loadQuote = async () => {
    try {
      // Load quote by token
      const { data: quoteData, error: quoteErr } = await supabase
        .from('quotes')
        .select('*')
        .eq('token', token)
        .single();

      if (quoteErr || !quoteData) {
        setStep('error');
        return;
      }

      // Check if expired
      if (quoteData.status === 'expired' || new Date(quoteData.expires_at) < new Date()) {
        setStep('expired');
        return;
      }

      // If already approved, go to scheduling
      if (quoteData.status === 'approved') {
        setStep('approved');
        setQuote(quoteData);
        return;
      }

      // If already has a price calculated, show result
      if (quoteData.final_price && quoteData.status === 'pending') {
        setQuote(quoteData);
        setCalculatedPrice(quoteData.final_price);
        setPriceBreakdown(quoteData.price_breakdown || []);
        setFormData(quoteData.form_data || {});

        // Load service for display
        const { data: svc } = await supabase
          .from('services')
          .select('*')
          .eq('id', quoteData.service_id)
          .single();
        setService(svc);

        setStep('result');
        return;
      }

      setQuote(quoteData);

      // Load service
      const { data: svc } = await supabase
        .from('services')
        .select('*')
        .eq('id', quoteData.service_id)
        .single();

      if (!svc) {
        setStep('error');
        return;
      }
      setService(svc);

      // Get Global service ID
      const { data: globalSvc } = await supabase
        .from('services')
        .select('id')
        .eq('slug', 'global-config')
        .single();
      
      // Services that manage their own location field skip global config
      const servicesSkipGlobal = ['aedes-do-bem'];
      const skipGlobal = servicesSkipGlobal.includes(svc?.slug || '');

      const serviceIds = [quoteData.service_id];
      if (globalSvc && !skipGlobal) serviceIds.push(globalSvc.id);

      // Load fields (filter by customer_type if available, else show all)
      const { data: flds } = await supabase
        .from('service_fields')
        .select('*')
        .in('service_id', serviceIds)
        .order('display_order');

      const filteredFields = (flds || []).filter(f =>
        !quoteData.customer_type || f.applies_to === 'both' || f.applies_to === quoteData.customer_type
      );
      
      // Sort: Global fields first, then by display_order
      filteredFields.sort((a, b) => {
        const aIsGlobal = globalSvc && a.service_id === globalSvc.id;
        const bIsGlobal = globalSvc && b.service_id === globalSvc.id;
        
        if (aIsGlobal && !bIsGlobal) return -1;
        if (!aIsGlobal && bIsGlobal) return 1;
        
        return (a.display_order || 0) - (b.display_order || 0);
      });
      
      const { data: baseRules } = await supabase
        .from('pricing_rules')
        .select('*')
        .eq('service_id', quoteData.service_id)
        .in('rule_name', ['Preço Base - Horário Comercial', 'Preço Base - Plantão']);

      let finalFields = [...filteredFields];

      // Services that handle their own horário field don't get the auto-injected one
      const servicesWithOwnHorario = ['higienizacao-caixa-dagua', 'aedes-do-bem'];
      const hasOwnHorario = servicesWithOwnHorario.includes(svc?.slug || '');

      if (baseRules && baseRules.length > 0 && !hasOwnHorario) {
        const ruleCom = baseRules.find(r => r.rule_name === 'Preço Base - Horário Comercial');
        const ruleOut = baseRules.find(r => r.rule_name === 'Preço Base - Plantão');
        
        const horarioField: ServiceField = {
          id: 'sys-horario',
          service_id: quoteData.service_id,
          field_key: 'sys_horario_atendimento',
          field_label: 'Para quando você precisa do atendimento?',
          field_type: 'radio',
          field_options: [
            { label: 'Horário Comercial', price: ruleCom?.base_price || 0, manual_review: false },
            { label: 'Plantão (Noites, Dom, Feriados)', price: ruleOut?.base_price || 0, manual_review: false }
          ],
          placeholder: '',
          helper_text: 'O valor do serviço pode variar de acordo com o horário selecionado.',
          is_required: true,
          display_order: 1.5,
          applies_to: 'both',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Find the index to insert (after global fields)
        let insertIdx = 0;
        if (globalSvc) {
          while (insertIdx < finalFields.length && finalFields[insertIdx].service_id === globalSvc.id) {
            insertIdx++;
          }
        }
        finalFields.splice(insertIdx, 0, horarioField);
      }

      // Inject 'Tipo de Atendimento' as first question if not set in the quote
      if (!quoteData.customer_type) {
        finalFields.unshift(CUSTOMER_TYPE_FIELD);
      }

      setFields(finalFields);

      // Pre-fill form data if exists
      if (quoteData.form_data && Object.keys(quoteData.form_data).length > 0) {
        setFormData(quoteData.form_data);
      }

      setStep('intro');
    } catch {
      setStep('error');
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    fields.forEach(field => {
      if (field.is_required) {
        const val = formData[field.field_key];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          newErrors[field.field_key] = 'Este campo é obrigatório';
        }
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateQuote = async () => {
    if (!validateForm()) return;

    setStep('calculating');

    try {
      // Get Global service ID
      const { data: globalSvc } = await supabase
        .from('services')
        .select('id')
        .eq('slug', 'global-config')
        .single();
      
      const serviceIds = [quote!.service_id];
      if (globalSvc) serviceIds.push(globalSvc.id);

      // Load pricing rules (Global + Specific)
      const { data: rules } = await supabase
        .from('pricing_rules')
        .select('*')
        .in('service_id', serviceIds)
        .eq('is_active', true)
        .order('priority');

      // Determine effective customer type (from quote or from form selection)
      const selectedTypeOption = formData['sys_tipo_atendimento'] || '';
      const effectiveType = quote!.customer_type || 
        (selectedTypeOption.includes('Residencial') ? 'residential' : 
         selectedTypeOption.includes('Comercial') ? 'commercial' : 'residential');

      // Save customer_type to quote if not set
      if (!quote!.customer_type && effectiveType) {
        await supabase.from('quotes').update({ customer_type: effectiveType }).eq('id', quote!.id);
        setQuote(prev => prev ? { ...prev, customer_type: effectiveType } : prev);
      }

      const applicableRules = (rules || []).filter(r =>
        (r.customer_type === 'both' || r.customer_type === effectiveType) &&
        r.rule_name !== 'Preço Base do Serviço' &&
        r.rule_name !== 'Preço Base - Horário Comercial' &&
        r.rule_name !== 'Preço Base - Plantão'
      );

      let total = 0;
      const breakdown: Array<{ questionLabel?: string; answerLabel: string; value: number }> = [];

      let forceManual = false;

      // Add prices from field options and multipliers
      fields.forEach(field => {
        const val = formData[field.field_key];
        if (val !== undefined && val !== null && val !== '' && field.field_options) {
          
          // Number field with multiplier
          if (field.field_type === 'number' && (field.field_options[0] as any)?.multiplier) {
            const qty = Number(val);
            const mult = Number((field.field_options[0] as any).multiplier);
            if (qty > 0 && mult > 0) {
              const calc = qty * mult;
              total += calc;
              breakdown.push({ questionLabel: field.field_label, answerLabel: `${qty}x`, value: calc });
            }
          } 
          // Select/Checkbox/Radio fields with fixed prices
          else if (field.field_type === 'select' || field.field_type === 'checkbox' || field.field_type === 'radio') {
            const selectedVals = Array.isArray(val) ? val : [val];
            
            selectedVals.forEach(selectedVal => {
              const opt = field.field_options.find(o => typeof o !== 'string' && (o as any).label === selectedVal);
              if (opt) {
                if ((opt as any).manual_review) {
                  forceManual = true;
                } else if ((opt as any).price) {
                  total += Number((opt as any).price);
                  breakdown.push({ questionLabel: field.field_label, answerLabel: (opt as any).label, value: Number((opt as any).price) });
                }
              }
            });
          }
        }
      });

      // ---- CUSTOM: Higienização de Caixa D'Água (matrix pricing) ----
      if (service?.slug === 'higienizacao-caixa-dagua' && !forceManual) {
        const priceMatrix: Record<string, Record<string, number>> = {
          '100 Litros':   { 'plastico': 60,  'amianto': 70 },
          '500 Litros':   { 'plastico': 250, 'amianto': 280 },
          '1.000 Litros': { 'plastico': 350, 'amianto': 380 },
          '1.500 Litros': { 'plastico': 450, 'amianto': 480 },
          '2.000 Litros': { 'plastico': 550, 'amianto': 580 },
          '3.000 Litros': { 'plastico': 650, 'amianto': 680 },
          '4.000 Litros': { 'plastico': 750, 'amianto': 780 },
          '5.000 Litros': { 'plastico': 850, 'amianto': -1 },
        };

        const litragem = formData['litragem_caixa'] || '';
        const materialRaw = formData['material_caixa'] || '';
        const materialKey = materialRaw.toLowerCase().includes('plástico') || materialRaw.toLowerCase().includes('plastico')
          ? 'plastico'
          : materialRaw.toLowerCase().includes('amianto')
            ? 'amianto'
            : null;

        if (litragem && materialKey && priceMatrix[litragem]?.[materialKey] !== undefined) {
          let basePrice = priceMatrix[litragem][materialKey];
          
          if (basePrice === -1) {
            forceManual = true;
          } else {
            const horario = formData['horario_caixa'] || '';
            const isPlantao = horario.toLowerCase().includes('plantão') || horario.toLowerCase().includes('plantao');

            if (isPlantao) {
              const extra = Math.round(basePrice * 0.20);
              breakdown.push({ questionLabel: `${litragem} — ${materialRaw}`, answerLabel: 'Valor base', value: basePrice });
              breakdown.push({ answerLabel: 'Acréscimo Plantão (+20%)', value: extra });
              total += basePrice + extra;
            } else {
              breakdown.push({ questionLabel: `${litragem} — ${materialRaw}`, answerLabel: 'Horário Comercial', value: basePrice });
              total += basePrice;
            }
          }
        }
      }
      // Apply each rule
      for (const rule of applicableRules) {
        let ruleValue = Number(rule.base_price) || 0;

        // Process rule_logic if exists
        if (rule.rule_logic && typeof rule.rule_logic === 'object') {
          const logic = rule.rule_logic as any;

          // Multiplier based on field value
          if (logic.multiply_by_field && formData[logic.multiply_by_field]) {
            const multiplier = Number(formData[logic.multiply_by_field]) || 1;
            ruleValue = ruleValue * multiplier;
          }

          // Conditional: only apply if condition is met
          if (logic.conditions && Array.isArray(logic.conditions)) {
            let conditionsMet = true;
            for (const cond of logic.conditions) {
              const fieldValue = formData[cond.field];
              switch (cond.operator) {
                case '==': conditionsMet = conditionsMet && fieldValue == cond.value; break;
                case '!=': conditionsMet = conditionsMet && fieldValue != cond.value; break;
                case '>': conditionsMet = conditionsMet && Number(fieldValue) > Number(cond.value); break;
                case '<': conditionsMet = conditionsMet && Number(fieldValue) < Number(cond.value); break;
                case '>=': conditionsMet = conditionsMet && Number(fieldValue) >= Number(cond.value); break;
                case '<=': conditionsMet = conditionsMet && Number(fieldValue) <= Number(cond.value); break;
                case 'contains': conditionsMet = conditionsMet && String(fieldValue).includes(String(cond.value)); break;
              }
            }
            if (!conditionsMet) continue;
          }

          // Fixed add
          if (logic.action === 'add') {
            ruleValue = Number(logic.value) || ruleValue;
          }

          // Percentage of current total
          if (logic.action === 'percentage') {
            ruleValue = total * (Number(logic.value) / 100);
          }
        }

        // Action: Force Manual Review (represented by base_price = -1)
        if (ruleValue === -1 || rule.base_price === -1) {
          forceManual = true;
          break;
        }

        if (ruleValue > 0) {
          breakdown.push({ answerLabel: rule.rule_name, value: ruleValue });
          total += ruleValue;
        }
      }

      if (forceManual) {
        total = 0; // Forces the UI to show manual review state
      } else {
        // Enforce minimum value for Dedetização (R$ 300)
        if (service?.slug === 'dedetizacao' && total < 300 && total > 0) {
          const diff = 300 - total;
          breakdown.push({ answerLabel: 'Ajuste para Valor Mínimo (R$ 300,00)', value: diff });
          total = 300;
        }
        // Enforce minimum value for Desentupimento (R$ 300)
        if (service?.slug === 'desentupimento' && total < 300 && total > 0) {
          const diff = 300 - total;
          breakdown.push({ answerLabel: 'Valor Base do Desentupimento (R$ 300,00)', value: diff });
          total = 300;
        }
      }

      // If no rules matched, use a default
      if (total === 0 && applicableRules.length === 0) {
        breakdown.push({ answerLabel: 'Valor base do serviço', value: 0 });
      }

      // Simulate a small delay for UX
      await new Promise(r => setTimeout(r, 1500));

      setCalculatedPrice(total);
      setPriceBreakdown(breakdown);

      // Save to database
      await supabase
        .from('quotes')
        .update({
          form_data: formData,
          calculated_price: total,
          final_price: total,
          price_breakdown: breakdown,
        })
        .eq('id', quote!.id);

      setStep('result');
    } catch (err) {
      console.error('Error calculating quote:', err);
      setStep('form');
    }
  };

  const handleApprove = async () => {
    await supabase
      .from('quotes')
      .update({ status: 'approved' })
      .eq('id', quote!.id);

    navigate(`/agendar/${quote!.id}`);
  };

  const handleReject = () => {
    // Open WhatsApp or show contact info
    const phone = '5500000000000'; // TODO: Load from admin_settings
    const msg = encodeURIComponent(
      `Olá! Recebi o orçamento de ${service?.name} no valor de R$ ${calculatedPrice?.toFixed(2)}, gostaria de conversar sobre.`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const updateField = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const renderField = (field: ServiceField) => {
    const value = formData[field.field_key];

    switch (field.field_type) {
      case 'text':
      case 'phone':
      case 'email':
        return (
          <input
            className={`pub-input ${errors[field.field_key] ? 'has-error' : ''}`}
            type={field.field_type === 'phone' ? 'tel' : field.field_type === 'email' ? 'email' : 'text'}
            value={value || ''}
            onChange={e => updateField(field.field_key, e.target.value)}
            placeholder={field.placeholder || ''}
          />
        );

      case 'number':
        return (
          <input
            className={`pub-input ${errors[field.field_key] ? 'has-error' : ''}`}
            type="number"
            value={value || ''}
            onChange={e => updateField(field.field_key, e.target.value)}
            placeholder={field.placeholder || ''}
          />
        );

      case 'textarea':
        return (
          <textarea
            className={`pub-input pub-textarea ${errors[field.field_key] ? 'has-error' : ''}`}
            value={value || ''}
            onChange={e => updateField(field.field_key, e.target.value)}
            placeholder={field.placeholder || ''}
            rows={3}
          />
        );

      case 'select':
        return (
          <select
            className={`pub-input pub-select ${errors[field.field_key] ? 'has-error' : ''}`}
            value={value || ''}
            onChange={e => updateField(field.field_key, e.target.value)}
          >
            <option value="">Selecione...</option>
            {(field.field_options || []).map((opt: any) => {
              const label = typeof opt === 'string' ? opt : opt.label;
              return <option key={label} value={label}>{label}</option>;
            })}
          </select>
        );

      case 'radio':
        return (
          <div className="pub-radio-group">
            {(field.field_options || []).map((opt: any) => {
              const label = typeof opt === 'string' ? opt : opt.label;
              return (
                <label key={label} className={`pub-radio-option ${value === label ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name={field.field_key}
                    value={label}
                    checked={value === label}
                    onChange={() => {
                      updateField(field.field_key, label);
                      if (typeof opt !== 'string' && (opt as any).show_modal === 'lei_pragas') {
                        setShowLawModal(true);
                      }
                    }}
                  />
                  <span className="radio-dot" />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        );

      case 'checkbox':
        return (
          <div className="pub-checkbox-group">
            {(field.field_options || []).length > 0 ? (
              field.field_options.map((opt: any) => {
                const label = typeof opt === 'string' ? opt : opt.label;
                return (
                  <label key={label} className={`pub-checkbox-option ${(value || []).includes(label) ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={(value || []).includes(label)}
                      onChange={e => {
                        const arr = [...(value || [])];
                        if (e.target.checked) arr.push(label);
                        else arr.splice(arr.indexOf(label), 1);
                        updateField(field.field_key, arr);
                      }}
                    />
                    <span className="checkbox-mark">✓</span>
                    <span>{label}</span>
                  </label>
                );
              })
            ) : (
              <label className={`pub-checkbox-option ${value ? 'selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={!!value}
                  onChange={e => updateField(field.field_key, e.target.checked)}
                />
                <span className="checkbox-mark">✓</span>
                <span>Sim</span>
              </label>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const ServiceIcon = service ? (iconMap[service.icon_name] || Bug) : Bug;

  // ---- LOADING ----
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

  // ---- ERROR ----
  if (step === 'error') {
    return (
      <div className="pub-page">
        <div className="pub-card pub-error-card animate-fade-in">
          <div className="pub-error-icon">✕</div>
          <h2>Link inválido</h2>
          <p>Este link de orçamento não foi encontrado ou é inválido. Verifique o link recebido pelo WhatsApp.</p>
        </div>
      </div>
    );
  }

  // ---- EXPIRED ----
  if (step === 'expired') {
    return (
      <div className="pub-page">
        <div className="pub-card pub-error-card animate-fade-in">
          <div className="pub-error-icon">⏰</div>
          <h2>Orçamento expirado</h2>
          <p>Este orçamento expirou. Entre em contato pelo WhatsApp para solicitar um novo.</p>
        </div>
      </div>
    );
  }

  // ---- ALREADY APPROVED ----
  if (step === 'approved') {
    return (
      <div className="pub-page">
        <div className="pub-card animate-fade-in" style={{ textAlign: 'center' }}>
          <CheckCircle size={56} className="pub-success-icon" />
          <h2>Orçamento Aprovado!</h2>
          <p>Você já aprovou este orçamento.</p>
          <button className="pub-btn pub-btn-primary" onClick={() => navigate(`/agendar/${quote!.id}`)}>
            Ir para Agendamento <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // ---- INTRO ----
  if (step === 'intro') {
    return (
      <div className="pub-page">
        <div className="pub-card pub-intro-card animate-fade-in">
          {/* Header */}
          <div className="pub-header">
            <div className="pub-logo">
              <img src="/petardo-logo.png" alt="PETARDO" style={{ width: 32, height: 32, borderRadius: '50%' }} />
              <span>PETARDO</span>
            </div>
            {quote?.customer_type && (
              <span className="pub-badge">
                {quote.customer_type === 'residential' ? '🏠 Residencial' : '🏢 Comercial'}
              </span>
            )}
          </div>

          {/* Service Icon & Title */}
          <div className="pub-intro-hero">
            <div className="pub-service-icon-lg">
              <ServiceIcon size={44} />
            </div>
            <h1>{service?.explanation_title || service?.name}</h1>
          </div>

          {/* Explanation */}
          <div className="pub-intro-text">
            <Info size={18} />
            <p>{service?.explanation_text || service?.description}</p>
          </div>

          {/* CTA */}
          <button className="pub-btn pub-btn-primary pub-btn-lg" onClick={() => setStep('form')}>
            Iniciar Orçamento <ChevronRight size={20} />
          </button>

          <p className="pub-hint">Leva menos de 2 minutos ⚡</p>
        </div>
      </div>
    );
  }

  // ---- CALCULATING ----
  if (step === 'calculating') {
    return (
      <div className="pub-page">
        <div className="pub-card animate-fade-in" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <Loader2 size={48} className="spin pub-calc-spinner" />
          <h2 style={{ marginTop: '1.5rem' }}>Calculando seu orçamento...</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Analisando as informações fornecidas</p>
        </div>
      </div>
    );
  }

  // ---- RESULT ----
  if (step === 'result') {
    return (
      <div className="pub-page">
        <div className="pub-card pub-result-card animate-fade-in">
          <div className="pub-header">
            <div className="pub-logo">
              <img src="/petardo-logo.png" alt="PETARDO" style={{ width: 32, height: 32, borderRadius: '50%' }} />
              <span>PETARDO</span>
            </div>
          </div>

          <div className="pub-result-hero">
            <CheckCircle size={36} className="pub-success-icon" />
            <h2>Seu Orçamento</h2>
            <p className="pub-result-service">{service?.name}</p>
          </div>

          {/* Breakdown */}
          {priceBreakdown.length > 0 && (
            <div className="pub-breakdown">
              {priceBreakdown.map((item, i) => (
                <div key={i} className="pub-breakdown-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                  {item.questionLabel && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.questionLabel}</span>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span style={{ flex: 1, paddingRight: '1rem', lineHeight: '1.4' }}>{item.answerLabel}</span>
                    <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>R$ {item.value.toFixed(2)}</span>
                  </div>
                </div>
              ))}
              <div className="pub-breakdown-total" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span>Subtotal</span>
                <span>R$ {calculatedPrice?.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* If no breakdown (price = 0) */}
          {(calculatedPrice === 0 || calculatedPrice === null) && service?.slug === 'aedes-do-bem' ? (
            <div style={{ textAlign: 'left' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '2.5rem' }}>🦟🚧</span>
                <h3 style={{ marginTop: '0.5rem', color: 'var(--text-primary)' }}>Qualificação Concluída!</h3>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
                Coletamos as informações para o pré-projeto do seu programa <strong style={{ color: 'var(--text-primary)' }}>Aedes do Bem™</strong>. Como é uma solução personalizada, nossa especialista <strong style={{ color: '#10b981' }}>Virgínia</strong> entrará em contato para agendar a visita técnica e apresentar o dimensionamento ideal.
              </p>
              <div className="pub-result-notes" style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Sobre o Aedes do Bem™:</strong>
                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <li><strong>Biotecnologia inovadora</strong> — não é veneno, não é fumacê.</li>
                  <li>Focada exclusivamente no <strong>Aedes aegypti</strong> (Dengue, Zika, Chikungunya).</li>
                  <li><strong>Programa contínuo:</strong> instalação + monitoramento mensal.</li>
                  <li>Redução progressiva e controle da população do mosquito.</li>
                </ul>
              </div>
              <button className="pub-btn pub-btn-primary pub-btn-lg" onClick={handleReject}>
                <MessageCircle size={20} />
                Falar com Especialista
              </button>
            </div>
          ) : (calculatedPrice === 0 || calculatedPrice === null) && service?.slug !== 'aedes-do-bem' ? (
            <div className="pub-no-price">
              <p>Precisamos analisar seu caso com mais detalhes.</p>
              <p>Um atendente entrará em contato em breve!</p>
            </div>
          ) : null}

          {/* Notes per service */}
          {service?.slug === 'desentupimento' && calculatedPrice !== null && calculatedPrice > 0 && (
            <div className="pub-result-notes" style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'left' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Importante:</strong>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <li>O valor do desentupimento (R$ 300,00) cobre <strong>até 5 metros</strong> de tubulação.</li>
                <li>Custo de <strong>R$ 30,00</strong> por metro adicional.</li>
                <li>A metragem exata somente pode ser determinada durante a visita técnica.</li>
              </ul>
            </div>
          )}

          {service?.slug === 'dedetizacao' && calculatedPrice !== null && calculatedPrice > 0 && (
            <div className="pub-result-notes" style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'left' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Detalhes do Serviço:</strong>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <li>Utilizamos apenas produtos <strong>sem cheiro forte</strong>.</li>
                <li>Nossos produtos são <strong>100% seguros para pets e animais domésticos</strong>.</li>
              </ul>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginTop: '1rem' }}>Formas de Pagamento:</strong>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <li><strong>PIX:</strong> 10% de Desconto!</li>
                <li><strong>Cartão de Crédito:</strong> Até 6x sem juros.</li>
              </ul>
            </div>
          )}

          {service?.slug === 'higienizacao-caixa-dagua' && calculatedPrice !== null && calculatedPrice > 0 && (
            <div className="pub-result-notes" style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'left' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Detalhes do Serviço:</strong>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <li>Tempo médio de execução: <strong>~120 minutos</strong>.</li>
                <li>Higienização completa com <strong>produtos autorizados pela Vigilância Sanitária</strong>.</li>
              </ul>
              <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>Nota: Valores estimados. Dependem da análise de acesso e peculiaridades no local.</p>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginTop: '1rem' }}>Formas de Pagamento:</strong>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <li><strong>PIX / Dinheiro:</strong> 10% de Desconto!</li>
                <li><strong>Cartão de Crédito:</strong> Até 6x sem juros.</li>
              </ul>
            </div>
          )}

          {service?.slug === 'caca-vazamentos' && calculatedPrice !== null && calculatedPrice > 0 && (
            <div className="pub-result-notes" style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'left' }}>
              <strong style={{ color: 'var(--text-primary)' }}>ℹ️ Como funciona:</strong>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <li>Utilizamos tecnologia de <strong>Geofone</strong> (escuta ultrassônica) para localizar o ponto exato, evitando quebra-quebra desnecessário.</li>
                <li>O valor base contempla a localização de <strong>1 ponto de vazamento</strong> em condições normais.</li>
                <li>Casos de alta complexidade ou múltiplos pontos podem chegar a <strong>R$ 800,00</strong>.</li>
              </ul>

              <strong style={{ color: '#10b981', display: 'block', marginTop: '1rem' }}>🛡️ Garantia de Transparência:</strong>
              <p style={{ margin: '0.4rem 0 0', lineHeight: 1.6 }}>Se o vazamento <strong>não for localizado</strong> após toda a varredura técnica, você paga apenas a taxa de visita. O valor da detecção <strong>não é cobrado</strong>.</p>

              <strong style={{ color: 'var(--text-primary)', display: 'block', marginTop: '1rem' }}>🔧 Sobre o Reparo:</strong>
              <p style={{ margin: '0.4rem 0 0', lineHeight: 1.6 }}>Detecção e reparo são etapas separadas. O orçamento do conserto é apresentado <strong>após</strong> a identificação do problema e só é executado com sua aprovação.</p>

              <strong style={{ color: 'var(--text-primary)', display: 'block', marginTop: '1rem' }}>💲 Formas de Pagamento:</strong>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <li><strong>PIX / Dinheiro:</strong> 10% de Desconto!</li>
                <li><strong>Cartão de Crédito:</strong> Até 6x sem juros.</li>
              </ul>
            </div>
          )}

          {/* Price Display */}
          {calculatedPrice !== null && calculatedPrice > 0 && service?.slug === 'caca-vazamentos' ? (
            <div className="pub-price-display">
              <span className="pub-price-label">Valor Estimado da Detecção</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span className="pub-price-value" style={{ fontSize: '1.75rem' }}>R$ {calculatedPrice.toFixed(2)}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>a</span>
                <span className="pub-price-value" style={{ fontSize: '1.75rem' }}>R$ 800,00</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>O valor final depende da complexidade técnica encontrada no local.</p>
            </div>
          ) : calculatedPrice !== null && calculatedPrice > 0 ? (
            <div className="pub-price-display">
              <span className="pub-price-label">Valor Total</span>
              <span className="pub-price-value">R$ {calculatedPrice.toFixed(2)}</span>
            </div>
          ) : null}

          {/* Commercial Dedetização: Dual Options */}
          {service?.slug === 'dedetizacao' && quote?.customer_type === 'commercial' && calculatedPrice !== null && calculatedPrice > 0 ? (
            <div className="pub-result-actions">
              {/* Option 1: Pontual */}
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.25rem', marginBottom: '0.75rem', border: '1px solid rgba(16,185,129,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <CheckCircle size={18} style={{ color: '#10b981' }} />
                  <strong style={{ color: 'var(--text-primary)' }}>Opção 1: Serviço Pontual</strong>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem' }}>Aplicação única para resolver o problema atual. Validade de 30 dias.</p>
                <button className="pub-btn pub-btn-primary" style={{ width: '100%' }} onClick={handleApprove}>
                  <CheckCircle size={18} />
                  Aprovar e Agendar — R$ {calculatedPrice.toFixed(2)}
                </button>
              </div>

              {/* Option 2: Plano Anual */}
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.25rem', marginBottom: '0.75rem', border: '1px solid rgba(139,92,246,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Star size={18} style={{ color: '#8b5cf6' }} />
                  <strong style={{ color: 'var(--text-primary)' }}>Opção 2: Plano Anual (Blindagem)</strong>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem' }}>Monitoramento mensal com renovação automática do certificado.</p>
                <p style={{ fontSize: '0.85rem', color: '#8b5cf6', fontWeight: 600, margin: '0 0 0.75rem' }}>A partir de R$ 250,00/mês</p>
                <button className="pub-btn pub-btn-outline" style={{ width: '100%' }} onClick={handleReject}>
                  <MessageCircle size={18} />
                  Falar com Consultor
                </button>
              </div>

              {/* Payment info */}
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'left' }}>
                <strong style={{ color: 'var(--text-primary)' }}>💲 Formas de Pagamento:</strong>
                <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <li><strong>PIX / Dinheiro:</strong> 10% de desconto!</li>
                  <li><strong>Cartão de Crédito:</strong> Até 6x sem juros.</li>
                </ul>
              </div>
            </div>
          ) : (
            /* Default Actions */
            <div className="pub-result-actions">
              {calculatedPrice !== null && calculatedPrice > 0 && (
                <button className="pub-btn pub-btn-primary pub-btn-lg" onClick={handleApprove}>
                  <CheckCircle size={20} />
                  Aprovar e Agendar
                </button>
              )}
              <button className="pub-btn pub-btn-outline" onClick={handleReject}>
                <MessageCircle size={18} />
                Falar com Atendente
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- FORM ----
  return (
    <div className="pub-page">
      <div className="pub-card pub-form-card animate-fade-in">
        <div className="pub-header">
          <div className="pub-logo">
            <img src="/petardo-logo.png" alt="PETARDO" style={{ width: 32, height: 32, borderRadius: '50%' }} />
            <span>PETARDO</span>
          </div>
          {quote?.customer_type ? (
            <span className="pub-badge">
              {quote.customer_type === 'residential' ? '🏠 Residencial' : '🏢 Comercial'}
            </span>
          ) : null}
        </div>

        <div className="pub-form-title">
          <ServiceIcon size={24} className="pub-form-title-icon" />
          <div>
            <h2>{service?.name}</h2>
            <p>Preencha as informações abaixo</p>
          </div>
        </div>

        {/* Progress */}
        <div className="pub-progress">
          <div className="pub-progress-bar">
            <div
              className="pub-progress-fill"
              style={{
                width: `${Math.min(100, (Object.keys(formData).filter(k => formData[k] !== '' && formData[k] !== undefined).length / Math.max(fields.length, 1)) * 100)}%`
              }}
            />
          </div>
          <span className="pub-progress-text">
            {Object.keys(formData).filter(k => formData[k] !== '' && formData[k] !== undefined).length} de {fields.length} campos
          </span>
        </div>

        {/* Fields */}
        <div className="pub-form-fields">
          {fields.length === 0 ? (
            <div className="pub-no-fields">
              <p>Os campos para este serviço ainda não foram configurados.</p>
              <p>Entre em contato pelo WhatsApp para solicitar seu orçamento.</p>
            </div>
          ) : (
            fields.map(field => (
              <div key={field.id} className="pub-field-group">
                <label className="pub-label">
                  {field.field_label}
                  {field.is_required && <span className="pub-required">*</span>}
                </label>
                {renderField(field)}
                {field.helper_text && (
                  <span className="pub-helper">{field.helper_text}</span>
                )}
                {errors[field.field_key] && (
                  <span className="pub-error">{errors[field.field_key]}</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Submit */}
        {fields.length > 0 && (
          <button className="pub-btn pub-btn-primary pub-btn-lg" onClick={calculateQuote}>
            Calcular Orçamento <ChevronRight size={20} />
          </button>
        )}
      </div>

      {/* Law Modal */}
      {showLawModal && (
        <div className="pub-modal-overlay" onClick={() => setShowLawModal(false)}>
          <div className="pub-modal-content animate-fade-in" onClick={e => e.stopPropagation()}>
            <button className="pub-modal-close" onClick={() => setShowLawModal(false)}>
              <X size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <FileText size={28} style={{ color: '#f5c518', flexShrink: 0 }} />
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Lei Estadual nº 25.154/2025</h3>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
              Em Minas Gerais, todo estabelecimento comercial é <strong>obrigado por lei</strong> a contratar serviços de controle de pragas apenas de empresas devidamente <strong>licenciadas pela Vigilância Sanitária</strong>.
            </p>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text-primary)' }}>A lei exige:</strong>
              <ul style={{ margin: '0.5rem 0 1rem', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <li><strong>Monitoramento periódico</strong> (mínimo mensal) contra pragas urbanas.</li>
                <li><strong>Certificado de execução</strong> com detalhes do serviço (pragas-alvo, produtos utilizados, prazos de garantia).</li>
                <li><strong>Garantia de 30 dias</strong> para estabelecimentos alimentícios, hospitalares, hoteleiros e de grande concentração de pessoas.</li>
                <li>Uso exclusivo de <strong>produtos registrados no Ministério da Saúde</strong>, aplicados por profissional habilitado.</li>
                <li><strong>Multa e suspensão de alvará</strong> para estabelecimentos que descumprirem.</li>
              </ul>
            </div>
            <a
              href="https://www.almg.gov.br/legislacao-mineira/texto/LEI/25154/2025/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontSize: '0.85rem', textDecoration: 'none', marginBottom: '1rem' }}
            >
              <ExternalLink size={14} />
              Ler lei completa na ALMG
            </a>
            <button className="pub-btn pub-btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => setShowLawModal(false)}>
              Entendi, continuar orçamento
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
