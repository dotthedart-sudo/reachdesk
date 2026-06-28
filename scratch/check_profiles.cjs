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

async function checkProfiles() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, email, role, plan');

  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }

  console.log(`Total profiles found: ${data.length}`);
  data.forEach(p => {
    console.log(`ID: ${p.id} | Email: ${p.email} | Role: ${p.role} | Plan: ${p.plan}`);
  });
}

checkProfiles();
