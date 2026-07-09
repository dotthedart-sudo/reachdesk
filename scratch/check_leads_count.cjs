// Check what columns leads has and how many rows
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
  // Get count with no column filter
  const { data, error, count } = await supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .limit(3);

  if (error) {
    console.log('❌ Error querying leads:', error.message, error.code);
  } else {
    console.log(`✅ Leads in DB: ${count} total`);
    if (data && data[0]) {
      console.log('Columns:', Object.keys(data[0]).join(', '));
      console.log('Sample row IDs:', data.map(r => r.id));
    } else {
      console.log('No rows returned');
    }
  }
}
check().catch(console.error);
