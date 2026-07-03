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
  const email = `temp_admin_${Date.now()}@example.com`;
  const password = 'TestPassword123!';
  const { data: authData } = await supabase.auth.signUp({ email, password });
  const userId = authData.user.id;
  
  await supabase.from('user_profiles').upsert({ id: userId, email, role: 'admin' });
  
  const { data: profiles } = await supabase.from('user_profiles').select('*');
  console.log('Total profiles count:', profiles?.length);
  console.log('Profiles emails:', profiles?.map(p => ({ email: p.email, role: p.role })));
  
  await supabase.from('user_profiles').delete().eq('id', userId);
}
check();
