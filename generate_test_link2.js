import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = 'https://pwozjqwgieqjpatzwids.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3b3pqcXdnaWVxanBhdHp3aWRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODAwMDcyOCwiZXhwIjoyMDkzNTc2NzI4fQ.Q8pba4pV5V3051GQhgBsw5dxQ0Lic4ZcZXE022Y4Q1I';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const serviceId = '6890abbe-1d41-4a93-bb6d-792aab1efb2e'; // Aedes do Bem
  
  const { data: customer } = await supabase.from('customers').select('id').limit(1).single();
  const customerId = customer ? customer.id : (await supabase.from('customers').insert({ full_name: 'Cliente Teste', phone: '32999999999' }).select().single()).data.id;
  
  const token = crypto.randomUUID();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data, error } = await supabase.from('quotes').insert({
    customer_id: customerId,
    service_id: serviceId,
    customer_type: 'residential',
    status: 'pending',
    token: token,
    expires_at: tomorrow.toISOString()
  }).select().single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Test Link: http://localhost:5173/orcamento/' + token);
  }
}
run();
