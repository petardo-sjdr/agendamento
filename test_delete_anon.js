import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pwozjqwgieqjpatzwids.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3b3pqcXdnaWVxanBhdHp3aWRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDA3MjgsImV4cCI6MjA5MzU3NjcyOH0.yJ-Q3q5i_6-9-Y5pWwT-3220qEBS3B4W2l1b7nO1EGE'; // VITE_SUPABASE_ANON_KEY from .env
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('service_fields').delete().eq('id', '0c5ab8aa-13c6-492c-bfa3-2f38620b6f03').select();
  console.log('Error:', error);
  console.log('Data:', data);
}
run();
