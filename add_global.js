import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pwozjqwgieqjpatzwids.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3b3pqcXdnaWVxanBhdHp3aWRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODAwMDcyOCwiZXhwIjoyMDkzNTc2NzI4fQ.Q8pba4pV5V3051GQhgBsw5dxQ0Lic4ZcZXE022Y4Q1I';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('services').upsert([
    {
      name: 'Configurações Globais',
      slug: 'global-config',
      description: 'Campos e Regras aplicados a todos os serviços',
      is_active: false,
      display_order: -1
    }
  ], { onConflict: 'slug' }).select('id').single();
  
  if (error) console.error(error);
  else console.log('GLOBAL_ID:', data.id);
}
run();
