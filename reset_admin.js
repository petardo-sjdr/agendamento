import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pwozjqwgieqjpatzwids.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3b3pqcXdnaWVxanBhdHp3aWRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODAwMDcyOCwiZXhwIjoyMDkzNTc2NzI4fQ.Q8pba4pV5V3051GQhgBsw5dxQ0Lic4ZcZXE022Y4Q1I';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const email = 'admin@petardo.com.br';
  const password = 'petardo@123';

  console.log('User exists. Updating password...');
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersData && usersData.users) {
      const user = usersData.users.find(u => u.email === email);
      if (user) {
          const { error: updateError } = await supabase.auth.admin.updateUserById(
              user.id,
              { password: password }
          );
          if (updateError) {
              console.error('Failed to update:', updateError);
          } else {
              console.log(`Password for ${email} reset to: ${password}`);
          }
      }
  }
}

run();
