import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pwozjqwgieqjpatzwids.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3b3pqcXdnaWVxanBhdHp3aWRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODAwMDcyOCwiZXhwIjoyMDkzNTc2NzI4fQ.Q8pba4pV5V3051GQhgBsw5dxQ0Lic4ZcZXE022Y4Q1I'
);

async function run() {
  const durations = {
    'desentupimento': 90,
    'dedetizacao': 120,
    'higienizacao-caixa-dagua': 120,
    'caca-vazamentos': 90,
    'aedes-do-bem': 60,
    'higienizacao-gordura': 90,
    'desratizacao': 120,
    'combate-abelha': 60,
    'combate-pombo': 60,
    'combate-morcego': 60,
    'limpeza-forro': 90,
    'limpeza-calha': 60
  };

  for (const [slug, mins] of Object.entries(durations)) {
    const { error } = await supabase.from('services').update({ duration_minutes: mins }).eq('slug', slug);
    if (error) console.error(`❌ ${slug}: ${error.message}`);
    else console.log(`✅ ${slug}: ${mins} min`);
  }
}
run();
