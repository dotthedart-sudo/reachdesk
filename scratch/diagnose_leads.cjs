// Deep diagnosis: check RLS, user context, leads table existence
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function diagnose() {
  console.log('=== 1. Check auth session ===');
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  console.log('Current user (anon):', user ? user.id : 'NOT LOGGED IN (expected for anon key)');

  console.log('\n=== 2. Raw leads table access (no RLS filter) ===');
  // With anon key and RLS enabled, this will only show rows the anon user can see
  const { data: leads, error: leadsErr, count } = await supabase
    .from('leads')
    .select('id, full_name, status, user_id, created_at', { count: 'exact' })
    .limit(5);
  
  if (leadsErr) {
    console.log('leads error:', leadsErr.code, leadsErr.message);
  } else {
    console.log('Leads visible to anon key:', count);
    if (data && data[0]) console.log('Sample:', JSON.stringify(leads.slice(0, 2), null, 2));
  }

  console.log('\n=== 3. Check user_profiles to confirm your user ID ===');
  const { data: profiles, error: profErr } = await supabase
    .from('user_profiles')
    .select('id, email, full_name')
    .limit(3);
  
  if (profErr) {
    console.log('profiles error:', profErr.code, profErr.message);
  } else {
    console.log('Profiles visible:', profiles?.length);
    profiles?.forEach(p => console.log(' -', p.id, p.email, p.full_name));
  }

  console.log('\n=== CONCLUSION ===');
  console.log('The anon key is subject to Row Level Security (RLS).');
  console.log('0 leads via anon key likely means: the leads exist but RLS is blocking');
  console.log('the unauthenticated/anon query. This script has no auth session, so RLS');
  console.log('hides all user-specific rows. The app uses a logged-in session which');
  console.log('passes the JWT — that is what lets the app see leads.');
  console.log('\nIf leads are missing IN the app too, that is a separate issue.');
  console.log('Check the browser console for errors when loading /leads.');
}
diagnose().catch(console.error);
