import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pwozjqwgieqjpatzwids.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3b3pqcXdnaWVxanBhdHp3aWRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODAwMDcyOCwiZXhwIjoyMDkzNTc2NzI4fQ.Q8pba4pV5V3051GQhgBsw5dxQ0Lic4ZcZXE022Y4Q1I';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const svcId = 'f3c643cd-64ba-499c-8664-87dfe081c215'; // Dedetização
  
  // Clean slate for fields and pricing rules
  await supabase.from('service_fields').delete().eq('service_id', svcId);
  await supabase.from('pricing_rules').delete().eq('service_id', svcId);

  const fields = [
    {
      service_id: svcId,
      field_label: 'Qual praga principal está causando problemas?',
      field_key: 'praga_alvo',
      field_type: 'radio',
      field_options: [
        { label: 'Pragas Comuns (Baratas, Formigas, Aranhas, Escorpiões)', manual_review: false },
        { label: 'Pulgas e Carrapatos (Exige reforço no atendimento)', manual_review: false },
        { label: 'Pragas Complexas (Cupins, Ratos, Abelhas, Morcegos)', manual_review: true }
      ],
      placeholder: '',
      helper_text: 'Selecione o grupo que melhor descreve o problema atual.',
      is_required: true,
      display_order: 1,
      applies_to: 'both'
    },
    {
      service_id: svcId,
      field_label: 'Quantos cômodos INTERNOS a residência possui? (Quartos, banheiros, salas, etc)',
      field_key: 'comodos_internos',
      field_type: 'number',
      field_options: [{ multiplier: '60' }],
      placeholder: 'Ex: 4',
      helper_text: 'Valor: R$ 60,00 por ambiente interno.',
      is_required: true,
      display_order: 2,
      applies_to: 'both'
    },
    {
      service_id: svcId,
      field_label: 'Quantos ambientes EXTERNOS a residência possui? (Quintal, varanda, garagem, etc)',
      field_key: 'comodos_externos',
      field_type: 'number',
      field_options: [{ multiplier: '70' }],
      placeholder: 'Ex: 2',
      helper_text: 'Valor: R$ 70,00 por ambiente externo.',
      is_required: true,
      display_order: 3,
      applies_to: 'both'
    }
  ];

  const { error } = await supabase.from('service_fields').insert(fields);
  
  if (error) console.error('Error inserting dedetizacao fields:', error);
  else console.log('Dedetização fields updated successfully!');
}
run();
