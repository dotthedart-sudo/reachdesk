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

async function testFullAvatarFlow() {
  const email = `test_profile_user_${Math.floor(Math.random() * 100000)}@example.com`;
  const password = 'TemporaryPassword123!';
  
  console.log('Signing up test user:', email);
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

  // 1. Storage Upload
  const fileBuffer = Buffer.from('fake image content');
  const fileName = `${userId}/${Date.now()}.png`;
  console.log(`\n1. Uploading file to avatars bucket at path: ${fileName}...`);
  
  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from('avatars')
    .upload(fileName, fileBuffer, { contentType: 'image/png', upsert: true });

  if (uploadErr) {
    console.error('❌ Upload failed:', uploadErr.message);
    return;
  }
  console.log('✅ Upload succeeded!', uploadData);

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);
  const publicUrl = urlData?.publicUrl;
  console.log('Public URL:', publicUrl);

  // 2. Profile Update (user_profiles table)
  console.log('\n2. Updating user_profiles table...');
  const { data: updateData, error: updateErr } = await supabase
    .from('user_profiles')
    .update({
      full_name: 'Test Profile Upload User',
      avatar_url: publicUrl
    })
    .eq('id', userId)
    .select();

  if (updateErr) {
    console.error('❌ Profile table update failed:', updateErr.message, updateErr);
  } else {
    console.log('✅ Profile table update succeeded!', updateData);
  }

  // Cleanup
  console.log('\n3. Cleaning up storage...');
  await supabase.storage.from('avatars').remove([fileName]);
  console.log('Cleanup complete.');
}

testFullAvatarFlow();
