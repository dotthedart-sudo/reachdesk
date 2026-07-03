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
  const email = `check_cols_${Date.now()}@example.com`;
  const password = 'TestPassword123!';
  const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password });
  if (signUpError) {
    console.error('SignUp Error:', signUpError);
    return;
  }
  const userId = authData.user.id;
  
  // Try inserting/upserting a profile row
  const { data: profileData, error: profileError } = await supabase
    .from('user_profiles')
    .upsert({
      id: userId,
      email,
      full_name: 'Test Columns User',
      role: 'admin' // Let's see if we can set role to admin
    })
    .select();
    
  if (profileError) {
    console.error('Profile Upsert Error:', profileError);
  } else {
    console.log('Profile columns:', Object.keys(profileData[0] || {}));
    console.log('Profile row data:', profileData[0]);
  }
  
  // Clean up auth user
  await supabase.from('user_profiles').delete().eq('id', userId);
}
check();
