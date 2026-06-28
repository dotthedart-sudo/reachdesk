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

async function check() {
  const email = `temp_schema_${Date.now()}@example.com`;
  const { data: authData } = await supabase.auth.signUp({ email, password: 'TemporaryPassword123!' });
  const userId = authData?.user?.id;

  if (!userId) return console.log("Failed to create user");

  const { data: leadData } = await supabase.from('leads').insert([{
    user_id: userId,
    first_name: 'Dummy',
    email: `dummy_${Date.now()}@example.com`
  }]).select();

  if (leadData && leadData[0]) {
    console.log("Columns:", Object.keys(leadData[0]));
  } else {
    console.log("No lead inserted.");
  }

  if (leadData) await supabase.from('leads').delete().eq('id', leadData[0].id);
}
check();
