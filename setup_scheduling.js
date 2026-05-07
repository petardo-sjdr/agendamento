// Execute SQL via Supabase Management API
const SUPABASE_URL = 'https://pwozjqwgieqjpatzwids.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3b3pqcXdnaWVxanBhdHp3aWRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODAwMDcyOCwiZXhwIjoyMDkzNTc2NzI4fQ.Q8pba4pV5V3051GQhgBsw5dxQ0Lic4ZcZXE022Y4Q1I';
const DB_PASSWORD = 'Virgínia@2025';

const statements = [
  "ALTER TABLE services ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 90",
  "ALTER TABLE customers ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT",
  "ALTER TABLE customers ADD COLUMN IF NOT EXISTS endereco_rua TEXT",
  "ALTER TABLE customers ADD COLUMN IF NOT EXISTS endereco_numero TEXT",
  "ALTER TABLE customers ADD COLUMN IF NOT EXISTS endereco_bairro TEXT",
  "ALTER TABLE customers ADD COLUMN IF NOT EXISTS endereco_cidade TEXT",
  "ALTER TABLE customers ADD COLUMN IF NOT EXISTS endereco_complemento TEXT",
  "ALTER TABLE customers ADD COLUMN IF NOT EXISTS ponto_referencia TEXT",
  "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS nome_acompanhante TEXT",
  "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS whatsapp_acompanhante TEXT"
];

async function run() {
  // Connect via pg 
  const pg = await import('pg');
  const client = new pg.default.Client({
    connectionString: `postgresql://postgres.pwozjqwgieqjpatzwids:${encodeURIComponent(DB_PASSWORD)}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    for (const sql of statements) {
      try {
        await client.query(sql);
        console.log(`✅ ${sql.substring(0, 60)}...`);
      } catch (e) {
        console.error(`❌ ${sql.substring(0, 40)}: ${e.message}`);
      }
    }
  } catch (e) {
    console.error('Connection failed:', e.message);
    console.log('\nAlternative: Run this SQL in Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/pwozjqwgieqjpatzwids/sql/new\n');
    statements.forEach(s => console.log(s + ';'));
  } finally {
    await client.end();
  }
}
run();
