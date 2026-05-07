import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pwozjqwgieqjpatzwids.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3b3pqcXdnaWVxanBhdHp3aWRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODAwMDcyOCwiZXhwIjoyMDkzNTc2NzI4fQ.Q8pba4pV5V3051GQhgBsw5dxQ0Lic4ZcZXE022Y4Q1I';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const svcId = 'c3407938-a5ab-4f03-a2f8-75a2d1225cd7'; // Higienização de Caixa D'água

  // Clean slate
  await supabase.from('service_fields').delete().eq('service_id', svcId);
  await supabase.from('pricing_rules').delete().eq('service_id', svcId);

  const fields = [
    {
      service_id: svcId,
      field_label: 'Para quando você precisa do atendimento?',
      field_key: 'horario_caixa',
      field_type: 'radio',
      field_options: [
        { label: 'Horário Comercial (Seg-Sex 08h-17h / Sáb 08h-12h)' },
        { label: 'Plantão (Noites, Domingos, Feriados)' }
      ],
      placeholder: '',
      helper_text: 'Atendimentos fora do horário comercial têm acréscimo de 20%.',
      is_required: true,
      display_order: 1,
      applies_to: 'both'
    },
    {
      service_id: svcId,
      field_label: 'Qual a capacidade da caixa d\'água?',
      field_key: 'litragem_caixa',
      field_type: 'radio',
      field_options: [
        { label: '100 Litros' },
        { label: '500 Litros' },
        { label: '1.000 Litros' },
        { label: '1.500 Litros' },
        { label: '2.000 Litros' },
        { label: '3.000 Litros' },
        { label: '4.000 Litros' },
        { label: '5.000 Litros' },
        { label: 'Mais de 5.000 Litros', manual_review: true }
      ],
      placeholder: '',
      helper_text: 'A capacidade geralmente está indicada na lateral da caixa.',
      is_required: true,
      display_order: 2,
      applies_to: 'both'
    },
    {
      service_id: svcId,
      field_label: 'Qual o material da caixa d\'água?',
      field_key: 'material_caixa',
      field_type: 'radio',
      field_options: [
        { label: 'Plástico (Polietileno)' },
        { label: 'Amianto (Fibrocimento)' },
        { label: 'Concreto, Metal, Azulejo ou Outro', manual_review: true }
      ],
      placeholder: '',
      helper_text: 'Caixas de concreto, metal ou cisterna subterrânea exigem avaliação técnica.',
      is_required: true,
      display_order: 3,
      applies_to: 'both'
    }
  ];

  const { error } = await supabase.from('service_fields').insert(fields);

  if (error) console.error('Error:', error);
  else console.log('✅ Caixa D\'Água fields created!');
}
run();
