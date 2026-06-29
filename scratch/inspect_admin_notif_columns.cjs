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

async function testInsert() {
  const email = `test_rls_${Math.floor(Math.random() * 100000)}@example.com`;
  const password = 'Password123!';
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password
  });
  
  if (authError) {
    console.error('Sign up failed:', authError);
    return;
  }
  
  const userId = authData.user.id;
  console.log('Signed up temporary user:', userId);

  // Create user profile
  const { error: profileErr } = await supabase.from('user_profiles').upsert({
    id: userId,
    email,
    status: 'approved',
    plan: 'trial'
  });

  if (profileErr) {
    console.error('Failed to create profile:', profileErr);
    return;
  }
  console.log('Profile created successfully');

  // Now attempt to insert matching the exact fields from UpgradeRequestForm
  const { data, error } = await supabase
    .from('admin_notifications')
    .insert({
      from_user_id: userId,
      from_email: email,
      from_name: 'Test RLS',
      type: 'plan_request',
      requested_plan: 'starter',
      billing_cycle: 'yearly',
      paid_amount: 100,
      mobile_number: '1234567890',
      full_name: 'Test RLS',
      receipt_url: 'receipts/test.png',
      request_status: 'pending',
      message: 'Test message for plan request'
    })
    .select();

  if (error) {
    console.error('Insert failed:', error);
  } else {
    console.log('Insert succeeded! Row details:', data);
    // clean up
    await supabase.from('admin_notifications').delete().eq('id', data[0].id);
  }

  // Cleanup profile
  await supabase.from('user_profiles').delete().eq('id', userId);
}

testInsert();
