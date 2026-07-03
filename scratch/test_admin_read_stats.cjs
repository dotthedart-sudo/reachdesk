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
  const email = `temp_admin_test_${Date.now()}@example.com`;
  const password = 'TestPassword123!';
  const { data: authData } = await supabase.auth.signUp({ email, password });
  const userId = authData.user.id;
  
  // Set role to admin
  await supabase.from('user_profiles').upsert({ id: userId, email, role: 'admin' });
  
  // Try querying leads for another user ID (e.g. some dummy ID or a random UUID)
  const dummyUserUuid = 'f647945e-f1d3-42fd-b85b-2b2a92134fba';
  const { count, error } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', dummyUserUuid);
    
  console.log('Query output for other user leads count:', count, 'Error:', error?.message);
  
  await supabase.from('user_profiles').delete().eq('id', userId);
}
check();
