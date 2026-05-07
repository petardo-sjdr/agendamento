import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pwozjqwgieqjpatzwids.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3b3pqcXdnaWVxanBhdHp3aWRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODAwMDcyOCwiZXhwIjoyMDkzNTc2NzI4fQ.Q8pba4pV5V3051GQhgBsw5dxQ0Lic4ZcZXE022Y4Q1I';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const serviceId = '6c98fe5c-4b91-4c04-b8c8-d739baa00703'; // Desentupimento

  // Delete existing fields to avoid duplicates if I run this multiple times
  await supabase.from('service_fields').delete().eq('service_id', serviceId);

  // Field 1: Local
  const field1 = {
    service_id: serviceId,
    field_label: 'Onde é o entupimento?',
    field_key: 'onde_e_o_entupimento',
    field_type: 'radio',
    field_options: [
      { label: 'Pia', price: '', manual_review: false },
      { label: 'Vaso Sanitário', price: '', manual_review: false },
      { label: 'Ralo', price: '', manual_review: false },
      { label: 'Esgoto ou Caixa de Gordura', price: '', manual_review: false },
      { label: 'Outro', price: '', manual_review: false }
    ],
    placeholder: '',
    helper_text: 'Selecione o local principal do problema.',
    is_required: true,
    display_order: 1,
    applies_to: 'both'
  };

  // Field 1.5: Outro especificacao
  const field15 = {
    service_id: serviceId,
    field_label: 'Se escolheu "Outro", especifique o local:',
    field_key: 'outro_local',
    field_type: 'text',
    field_options: [],
    placeholder: 'Ex: Ralo da varanda, cano da máquina...',
    helper_text: 'Preencha apenas se escolheu a opção "Outro" acima.',
    is_required: false,
    display_order: 2,
    applies_to: 'both'
  };

  // Field 2: Horário/Urgência (Using Strategy 1: Total Price)
  const field2 = {
    service_id: serviceId,
    field_label: 'Para quando você precisa do atendimento?',
    field_key: 'horario_atendimento',
    field_type: 'radio',
    field_options: [
      { label: 'Horário Comercial (Seg-Sex: 08h-17h | Sáb: 08h-12h)', price: '300', manual_review: false },
      { label: 'Plantão / Emergência (Noites, Dom, Feriados)', price: '450', manual_review: false }
    ],
    placeholder: '',
    helper_text: 'O atendimento em formato de plantão possui um custo adicional.',
    is_required: true,
    display_order: 3,
    applies_to: 'both'
  };

  const { error: err1 } = await supabase.from('service_fields').insert([field1, field15, field2]);
  if (err1) console.error('Error inserting fields:', err1);
  else console.log('Fields injected successfully!');

  // Set base price to 0 since we are using Strategy 1
  const { data: existingRule } = await supabase.from('pricing_rules').select('id').eq('service_id', serviceId).eq('rule_name', 'Preço Base do Serviço').maybeSingle();
  
  if (existingRule) {
    await supabase.from('pricing_rules').update({ base_price: 0 }).eq('id', existingRule.id);
  } else {
    await supabase.from('pricing_rules').insert({
      service_id: serviceId,
      rule_name: 'Preço Base do Serviço',
      base_price: 0,
      customer_type: 'both'
    });
  }
}
run();
