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
  const signUpRes = await supabase.auth.signUp({ email, password: 'TemporaryPassword123!' });
  if (signUpRes.error) {
    console.error("SignUp error:", signUpRes.error);
    return;
  }
  const userId = signUpRes.data?.user?.id;
  if (!userId) return console.log("Failed to create user (no ID)");

  // Let's see if a profile was automatically created by trigger on auth.users
  const { data: profileCheck, error: checkError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId);
  
  console.log("Automatically created profile:", profileCheck, checkError);

  const insertRes = await supabase.from('leads').insert([{
    user_id: userId,
    first_name: 'Dummy',
    email: `dummy_${Date.now()}@example.com`
  }]).select();

  if (insertRes.error) {
    console.error("Insert error on leads:", insertRes.error);
  } else if (insertRes.data && insertRes.data[0]) {
    console.log("Columns:", Object.keys(insertRes.data[0]));
    await supabase.from('leads').delete().eq('id', insertRes.data[0].id);
  }

  // Cleanup auth user
  // (Cannot delete from auth.users directly via anon key, but we can delete from user_profiles if needed)
}
check();
