import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pwozjqwgieqjpatzwids.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3b3pqcXdnaWVxanBhdHp3aWRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODAwMDcyOCwiZXhwIjoyMDkzNTc2NzI4fQ.Q8pba4pV5V3051GQhgBsw5dxQ0Lic4ZcZXE022Y4Q1I';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const svcId = 'e0f8ceec-d8bc-4a76-b097-38197599c716'; // Caça Vazamentos

  // Clean slate
  await supabase.from('service_fields').delete().eq('service_id', svcId);
  await supabase.from('pricing_rules').delete().eq('service_id', svcId);

  // 1. Pricing rules for sys_horario injection
  await supabase.from('pricing_rules').insert([
    {
      service_id: svcId,
      customer_type: 'both',
      rule_name: 'Preço Base - Horário Comercial',
      base_price: 450,
      priority: 0,
      is_active: true
    },
    {
      service_id: svcId,
      customer_type: 'both',
      rule_name: 'Preço Base - Plantão',
      base_price: 550,
      priority: 0,
      is_active: true
    }
  ]);
  console.log('✅ Pricing rules created (450/550)');

  // 2. Service fields
  const fields = [
    {
      service_id: svcId,
      field_label: 'Como você percebeu o vazamento?',
      field_key: 'sinal_vazamento',
      field_type: 'radio',
      field_options: [
        { label: 'Conta de água muito alta' },
        { label: 'Mancha de umidade na parede ou teto' },
        { label: 'Barulho de água na tubulação' },
        { label: 'Poça de água sem origem aparente' },
        { label: 'Outro' }
      ],
      placeholder: '',
      helper_text: 'Essa informação ajuda nosso técnico a se preparar melhor.',
      is_required: true,
      display_order: 1,
      applies_to: 'both'
    },
    {
      service_id: svcId,
      field_label: 'Onde você suspeita que está o vazamento?',
      field_key: 'local_vazamento',
      field_type: 'radio',
      field_options: [
        { label: 'Parede interna' },
        { label: 'Piso / Chão' },
        { label: 'Quintal / Área externa' },
        { label: 'Laje / Telhado' },
        { label: 'Não sei identificar' }
      ],
      placeholder: '',
      helper_text: 'Se não souber, não se preocupe — nosso geofone localiza com precisão.',
      is_required: true,
      display_order: 2,
      applies_to: 'both'
    }
  ];

  const { error } = await supabase.from('service_fields').insert(fields);

  if (error) console.error('Error:', error);
  else console.log('✅ Caça Vazamentos fields created!');
}
run();
