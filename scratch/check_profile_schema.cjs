const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('c:/Users/T15/reachdesk/.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
  const { data, error } = await supabase.rpc('query_sql', { query: "select * from user_profiles limit 1" });

  if (error) {
    console.error('Error fetching user_profiles:', error);
  } else {
    console.log('User profiles row keys:', Object.keys(data[0] || {}));
    console.log('User profiles sample row:', data[0]);
  }
}

checkSchema();
