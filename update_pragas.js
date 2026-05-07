import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pwozjqwgieqjpatzwids.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3b3pqcXdnaWVxanBhdHp3aWRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODAwMDcyOCwiZXhwIjoyMDkzNTc2NzI4fQ.Q8pba4pV5V3051GQhgBsw5dxQ0Lic4ZcZXE022Y4Q1I';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const svcId = 'f3c643cd-64ba-499c-8664-87dfe081c215'; // Dedetização
  
  const options = [
    { label: 'Pragas Comuns (Baratas, Formigas, Aranhas, Escorpiões, Traças, Percevejos)', manual_review: false },
    { label: 'Pulgas e Carrapatos (Exige reforço no atendimento)', manual_review: false },
    { label: 'Pragas Complexas (Cupins/Brocas, Ratos/Roedores, Abelhas, Morcegos, Gatos/Cachorros)', manual_review: true }
  ];

  const { error } = await supabase
    .from('service_fields')
    .update({ field_options: options })
    .eq('service_id', svcId)
    .eq('field_key', 'praga_alvo');
  
  if (error) console.error('Error updating praga_alvo options:', error);
  else console.log('Praga options updated successfully!');
}
run();
