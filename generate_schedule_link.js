import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = 'https://pwozjqwgieqjpatzwids.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3b3pqcXdnaWVxanBhdHp3aWRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODAwMDcyOCwiZXhwIjoyMDkzNTc2NzI4fQ.Q8pba4pV5V3051GQhgBsw5dxQ0Lic4ZcZXE022Y4Q1I';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const serviceId = '6c98fe5c-4b91-4c04-b8c8-d739baa00703'; // Desentupimento

  const { data: customer } = await supabase.from('customers').select('id').limit(1).single();
  let customerId = customer?.id;
  if (!customerId) {
      const { data: newCustomer } = await supabase.from('customers').insert({ full_name: 'Cliente Teste Agendamento', phone: '32999999999' }).select().single();
      customerId = newCustomer.id;
  }

  // Create a quote that is already approved (to test scheduling)
  const quoteId = crypto.randomUUID();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data, error } = await supabase.from('quotes').insert({
    id: quoteId,
    customer_id: customerId,
    service_id: serviceId,
    customer_type: 'residential',
    status: 'approved',
    // total_price: 450, // Remover total_price se não existe
    token: crypto.randomUUID(),
    expires_at: tomorrow.toISOString()
  }).select().single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Schedule Test Link: http://localhost:5173/agendar/' + quoteId);
  }
}
run();
