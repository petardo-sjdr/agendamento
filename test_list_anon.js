import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://pwozjqwgieqjpatzwids.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3b3pqcXdnaWVxanBhdHp3aWRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDA3MjgsImV4cCI6MjA5MzU3NjcyOH0.1hxusZJrhyoc7QGValfhsTgbWOJwio6A6bzCVu1AYsw';
const supabase = createClient(supabaseUrl, supabaseKey);
async function run() {
  const { data, error } = await supabase.from('service_fields').select('id, field_label');
  console.log('Error:', error);
  console.log('Data:', data);
}
run();
