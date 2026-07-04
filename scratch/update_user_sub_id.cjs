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

async function update() {
  const email = `temp_admin_${Date.now()}@example.com`;
  const password = 'TestPassword123!';
  const { data: authData } = await supabase.auth.signUp({ email, password });
  const userId = authData.user.id;
  
  // Upsert temp admin
  await supabase.from('user_profiles').upsert({ id: userId, email, role: 'admin' });
  
  // Update esemdot@gmail.com
  const { data: user } = await supabase.from('user_profiles').select('*').eq('email', 'esemdot@gmail.com').maybeSingle();
  if (user) {
    const { error } = await supabase
      .from('user_profiles')
      .update({ paddle_subscription_id: 'sub_test_123456' })
      .eq('id', user.id);
    console.log('Update result error:', error);
  } else {
    console.log('esemdot@gmail.com user not found!');
  }
  
  // Clean up admin
  await supabase.from('user_profiles').delete().eq('id', userId);
}
update();
