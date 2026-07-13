const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function inspect() {
  const { data, error } = await supabase.rpc('query_sql', { query: 'SELECT 1' }); // check if we can run query_sql? No, let's just select * from leads
  const res = await supabase.from('leads').select('*').limit(1);
  if (res.error) console.error('Error fetching leads:', res.error);
  else console.log(Object.keys(res.data[0] || {}));
}

inspect();
