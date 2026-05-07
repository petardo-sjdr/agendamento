import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://pwozjqwgieqjpatzwids.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3b3pqcXdnaWVxanBhdHp3aWRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODAwMDcyOCwiZXhwIjoyMDkzNTc2NzI4fQ.Q8pba4pV5V3051GQhgBsw5dxQ0Lic4ZcZXE022Y4Q1I';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // If we can't run raw SQL, we can just delete the specific field the user wants using the service_role key to unblock them!
  const { data, error } = await supabase.from('service_fields').delete().eq('id', '0c5ab8aa-13c6-492c-bfa3-2f38620b6f03').select();
  console.log('Error:', error);
  console.log('Deleted the stuck field:', data);
}
run();
