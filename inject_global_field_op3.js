import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pwozjqwgieqjpatzwids.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3b3pqcXdnaWVxanBhdHp3aWRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODAwMDcyOCwiZXhwIjoyMDkzNTc2NzI4fQ.Q8pba4pV5V3051GQhgBsw5dxQ0Lic4ZcZXE022Y4Q1I';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const globalSvcId = 'a8f39e44-8c8c-4b10-b61e-42f7237dfa25';
  
  const field = {
    service_id: globalSvcId,
    field_label: 'Em qual cidade será realizado o serviço?',
    field_key: 'cidade_servico',
    field_type: 'radio',
    field_options: [
      { label: 'São João Del Rey (Taxa abatida caso o serviço seja autorizado)', price: '100', manual_review: false },
      { label: 'Cidades Vizinhas (até 20km de SJDR)', price: '150', manual_review: false },
      { label: 'Outras Cidades (mais de 20km de SJDR)', price: '0', manual_review: true }
    ],
    placeholder: '',
    helper_text: 'Taxa de deslocamento adicionada ao orçamento. Para cidades distantes, faremos um atendimento personalizado.',
    is_required: true,
    display_order: 1,
    applies_to: 'both'
  };

  await supabase.from('service_fields').delete().eq('service_id', globalSvcId); // clean slate
  const { error } = await supabase.from('service_fields').insert(field);
  
  if (error) console.error('Error inserting global field:', error);
  else console.log('Global field updated successfully!');
}
run();
