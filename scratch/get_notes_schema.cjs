const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, val] = line.split('=');
  if (key && val) {
    env[key.trim()] = val.trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const email = `temp_user_${Math.floor(Math.random() * 100000)}@example.com`;
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
  
  // Try to insert a note to get its columns
  console.log('Inserting a text note...');
  const { data: noteData, error: noteError } = await supabase.from('notes').insert({
    user_id: userId,
    title: 'Temporary Note For Schema Test',
    type: 'text',
    content: 'test content',
    color: '#ffffff',
    pinned: false
  }).select();
  
  if (noteError) {
    console.error('Insert note error:', noteError.message, noteError.details);
  } else {
    console.log('Insert success! Returned note columns:');
    console.log(Object.keys(noteData[0]));
    console.log('Full note data:', noteData[0]);
  }
  
  // Cleanup user profile & note if possible
  if (noteData && noteData[0]) {
    await supabase.from('notes').delete().eq('id', noteData[0].id);
  }
}

test();
