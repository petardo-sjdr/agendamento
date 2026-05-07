import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Service, ServiceField, Quote } from '../../lib/types';
import {
  Bug, Wrench, Droplets, Droplet, Flame, MousePointer,
  Hexagon, Moon, Layers, CloudRain, Shield, Zap,
  Thermometer, Leaf, Home, Building2, Truck,
  ChevronRight, CheckCircle, MessageCircle, Info, Loader2
} from 'lucide-react';
import './QuotePage.css';

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Wrench, Bug, Droplets, Droplet, Flame, MousePointer,
  Hexagon, Moon, Layers, CloudRain, Shield, Zap,
  Thermometer, Leaf, Home, Building2, Truck,
};

type Step = 'loading' | 'intro' | 'form' | 'calculating' | 'result' | 'approved' | 'error' | 'expired';

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
  const [priceBreakdown, setPriceBreakdown] = useState<Array<{ label: string; value: number }>>([]);

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
      
      const serviceIds = [quoteData.service_id];
      if (globalSvc) serviceIds.push(globalSvc.id);

      // Load fields filtered by customer_type (Global + Specific)
      const { data: flds } = await supabase
        .from('service_fields')
        .select('*')
        .in('service_id', serviceIds)
        .order('display_order');

      const filteredFields = (flds || []).filter(f =>
        f.applies_to === 'both' || f.applies_to === quoteData.customer_type
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

      if (baseRules && baseRules.length > 0) {
        const ruleCom = baseRules.find(r => r.rule_name === 'Preço Base - Horário Comercial');
        const ruleOut = baseRules.find(r => r.rule_name === 'Preço Base - Plantão');
        
        finalFields.push({
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
          display_order: 9999,
          applies_to: 'both',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
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

      const applicableRules = (rules || []).filter(r =>
        (r.customer_type === 'both' || r.customer_type === quote!.customer_type) &&
        r.rule_name !== 'Preço Base do Serviço' &&
        r.rule_name !== 'Preço Base - Horário Comercial' &&
        r.rule_name !== 'Preço Base - Plantão'
      );

      let total = 0;
      const breakdown: Array<{ label: string; value: number }> = [];

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
              breakdown.push({ label: `${field.field_label} (${qty}x)`, value: calc });
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
                  breakdown.push({ label: `${field.field_label}: ${(opt as any).label}`, value: Number((opt as any).price) });
                }
              }
            });
          }
        }
      });

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
          breakdown.push({ label: rule.rule_name, value: ruleValue });
          total += ruleValue;
        }
      }

      if (forceManual) {
        total = 0; // Forces the UI to show manual review state
      }

      // If no rules matched, use a default
      if (total === 0 && applicableRules.length === 0) {
        breakdown.push({ label: 'Valor base do serviço', value: 0 });
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
            {(field.field_options || []).map(opt => {
              const label = typeof opt === 'string' ? opt : opt.label;
              return <option key={label} value={label}>{label}</option>;
            })}
          </select>
        );

      case 'radio':
        return (
          <div className="pub-radio-group">
            {(field.field_options || []).map(opt => {
              const label = typeof opt === 'string' ? opt : opt.label;
              return (
                <label key={label} className={`pub-radio-option ${value === label ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name={field.field_key}
                    value={label}
                    checked={value === label}
                    onChange={() => updateField(field.field_key, label)}
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
              field.field_options.map(opt => {
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
              <Bug size={28} />
              <span>PETARDO</span>
            </div>
            <span className="pub-badge">
              {quote?.customer_type === 'residential' ? '🏠 Residencial' : '🏢 Comercial'}
            </span>
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
              <Bug size={24} />
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
                <div key={i} className="pub-breakdown-item">
                  <span>{item.label}</span>
                  <span>R$ {item.value.toFixed(2)}</span>
                </div>
              ))}
              <div className="pub-breakdown-total">
                <span>Total</span>
                <span>R$ {calculatedPrice?.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* If no breakdown (price = 0) */}
          {(calculatedPrice === 0 || calculatedPrice === null) && (
            <div className="pub-no-price">
              <p>Precisamos analisar seu caso com mais detalhes.</p>
              <p>Um atendente entrará em contato em breve!</p>
            </div>
          )}

          {/* Price Display */}
          {calculatedPrice !== null && calculatedPrice > 0 && (
            <div className="pub-price-display">
              <span className="pub-price-label">Valor Total</span>
              <span className="pub-price-value">R$ {calculatedPrice.toFixed(2)}</span>
            </div>
          )}

          {/* Actions */}
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
            <Bug size={24} />
            <span>PETARDO</span>
          </div>
          <span className="pub-badge">
            {quote?.customer_type === 'residential' ? '🏠 Residencial' : '🏢 Comercial'}
          </span>
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
    </div>
  );
}
