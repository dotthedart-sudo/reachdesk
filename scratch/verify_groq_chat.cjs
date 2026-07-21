const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

async function run() {
  console.log('========================================================');
  console.log('AI Feature Gating & Edge Function Verification');
  console.log('========================================================\n');

  // We can use Supabase CLI or direct fetch to edge function with authorization token
  // Let's create two test users via auth API or fetch access token
  const timestamp = Date.now();
  const starterEmail = `starter_ai_test_${timestamp}@example.com`;
  const trialEmail = `trial_ai_test_${timestamp}@example.com`;
  const password = 'TestPassword123!';

  const supabaseClient = createClient(supabaseUrl, supabaseKey);

  console.log('Creating Starter test user...');
  const { data: starterAuth, error: sErr } = await supabaseClient.auth.signUp({
    email: starterEmail,
    password: password
  });

  if (sErr || !starterAuth.session) {
    console.log('SignUp notice (email confirmation or fetch fallback):', sErr?.message);
  }

  // We can also test by setting plan in user_profiles using raw SQL via supabase db query
}

run();
