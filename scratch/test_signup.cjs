const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const email = `test_plan_limits_${Math.floor(Math.random() * 1000000)}@gmail.com`;
  const password = 'TestPassword123!';
  console.log('Attempting sign up with email:', email);
  const { data, error } = await supabase.auth.signUp({ email, password });
  console.log('Result data:', data ? 'User created ID: ' + data.user?.id : null);
  console.log('Result error:', error);
}

run();
