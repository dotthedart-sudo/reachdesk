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
  const email = `check_rls_${Date.now()}@example.com`;
  const password = 'TestPassword123!';
  
  // Sign up
  const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password });
  if (signUpError) {
    console.error('SignUp Error:', signUpError);
    return;
  }
  const userId = authData.user.id;
  
  // Upsert profile as normal user first
  await supabase.from('user_profiles').upsert({
    id: userId,
    email,
    full_name: 'Test RLS User',
  });
  
  // Try reading all profiles as a normal user
  const { data: profilesNormal, error: errNormal } = await supabase.from('user_profiles').select('*');
  console.log('Profiles returned to normal user:', profilesNormal?.length, 'Error:', errNormal?.message);
  
  // Update role to admin
  await supabase.from('user_profiles').update({ role: 'admin' }).eq('id', userId);
  
  // Try reading all profiles as an admin user
  const { data: profilesAdmin, error: errAdmin } = await supabase.from('user_profiles').select('*');
  console.log('Profiles returned to admin user:', profilesAdmin?.length, 'Error:', errAdmin?.message);
  
  // Clean up
  await supabase.from('user_profiles').delete().eq('id', userId);
}
check();
