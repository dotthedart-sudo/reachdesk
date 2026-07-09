// Quick check: are leads still in the database?
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error, count } = await supabase
    .from('leads')
    .select('id, name, status, created_at', { count: 'exact' })
    .limit(5);

  if (error) {
    console.log('❌ Error querying leads:', error.message);
  } else {
    console.log(`✅ Leads in DB: ${count} total`);
    console.log('Sample rows:', JSON.stringify(data, null, 2));
  }
}
check().catch(console.error);
