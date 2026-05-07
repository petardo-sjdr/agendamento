import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pwozjqwgieqjpatzwids.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3b3pqcXdnaWVxanBhdHp3aWRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODAwMDcyOCwiZXhwIjoyMDkzNTc2NzI4fQ.Q8pba4pV5V3051GQhgBsw5dxQ0Lic4ZcZXE022Y4Q1I';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const svcId = 'f3c643cd-64ba-499c-8664-87dfe081c215'; // Dedetização
  
  // 1. Update existing residential fields to applies_to: 'residential'
  await supabase
    .from('service_fields')
    .update({ applies_to: 'residential' })
    .eq('service_id', svcId)
    .eq('field_key', 'comodos_internos');

  await supabase
    .from('service_fields')
    .update({ applies_to: 'residential' })
    .eq('service_id', svcId)
    .eq('field_key', 'comodos_externos');

  console.log('✅ Residential fields updated to applies_to: residential');

  // 2. Insert commercial-only fields
  const commercialFields = [
    {
      service_id: svcId,
      field_label: 'Está ciente sobre a Lei Estadual de Controle de Pragas (Lei nº 25.154/2025)?',
      field_key: 'lei_controle_pragas',
      field_type: 'radio',
      field_options: [
        { label: 'Sim, estou ciente', manual_review: false },
        { label: 'Não, quero saber mais', manual_review: false, show_modal: 'lei_pragas' }
      ],
      placeholder: '',
      helper_text: 'Estabelecimentos comerciais em MG são obrigados por lei a manter controle periódico de pragas.',
      is_required: true,
      display_order: 0,
      applies_to: 'commercial'
    },
    {
      service_id: svcId,
      field_label: 'Qual a quantidade total de cômodos/ambientes do estabelecimento?',
      field_key: 'comodos_comercial',
      field_type: 'number',
      field_options: [{ multiplier: '100' }],
      placeholder: 'Ex: 6',
      helper_text: 'Valor: R$ 100,00 por ambiente. Inclua salas, depósitos, banheiros, cozinha, etc.',
      is_required: true,
      display_order: 3,
      applies_to: 'commercial'
    }
  ];

  const { error } = await supabase.from('service_fields').insert(commercialFields);
  
  if (error) console.error('Error inserting commercial fields:', error);
  else console.log('✅ Commercial fields inserted successfully!');
}
run();
