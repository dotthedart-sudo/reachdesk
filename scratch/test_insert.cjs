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

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const email = `temp_schema_user_${Math.floor(Math.random() * 100000)}@example.com`;
  const password = 'TemporaryPassword123!';
  
  console.log('Signing up temporary user:', email);
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password
  });
  
  if (authError) {
    console.error('Sign up error:', authError.message);
    return;
  }
  
  const userId = authData.user.id;
  console.log('Signed up! User ID:', userId);

  // Test insert with only first_name, platform, priority, status (leads table)
  const { data, error } = await supabase.from('leads').insert([{
    user_id: userId,
    first_name: 'TestQuickAdd',
    platform: 'LinkedIn',
    priority: 'Warm',
    status: 'lead'
  }]).select();

  if (error) {
    console.error('Insert failed:', error.message, error.details);
  } else {
    console.log('Insert succeeded! Row:', data[0]);
    // Clean up
    await supabase.from('leads').delete().eq('id', data[0].id);
    console.log('Cleanup complete.');
  }
}

testInsert();
