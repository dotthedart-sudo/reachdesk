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

async function testStorageRLS() {
  const email = `test_storage_user_${Math.floor(Math.random() * 100000)}@example.com`;
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

  // Sign in to get full authenticated session
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) {
    console.error('Sign in error:', signInError.message);
    return;
  }

  // Create a dummy file buffer
  const fileBuffer = Buffer.from('fake image content');

  // Test 1: Uploading flat path to 'avatars' root (e.g. userId-timestamp.png)
  const flatPath = `${userId}-avatar.png`;
  console.log(`\nTest 1: Uploading to flat path '${flatPath}' in 'avatars' bucket...`);
  const { data: res1, error: err1 } = await supabase.storage
    .from('avatars')
    .upload(flatPath, fileBuffer, { contentType: 'image/png', upsert: true });

  if (err1) {
    console.log('❌ Test 1 FAILED:', err1.message, err1);
  } else {
    console.log('✅ Test 1 SUCCEEDED!', res1);
    // Cleanup
    await supabase.storage.from('avatars').remove([flatPath]);
  }

  // Test 2: Uploading nested path (e.g. userId/avatar.png)
  const nestedPath = `${userId}/avatar.png`;
  console.log(`\nTest 2: Uploading to nested path '${nestedPath}' in 'avatars' bucket...`);
  const { data: res2, error: err2 } = await supabase.storage
    .from('avatars')
    .upload(nestedPath, fileBuffer, { contentType: 'image/png', upsert: true });

  if (err2) {
    console.log('❌ Test 2 FAILED:', err2.message, err2);
  } else {
    console.log('✅ Test 2 SUCCEEDED!', res2);
    // Cleanup
    await supabase.storage.from('avatars').remove([nestedPath]);
  }
}

testStorageRLS();
