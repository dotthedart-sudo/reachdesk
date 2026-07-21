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

async function inspect() {
  console.log('--- Inspecting user_profiles sample row ---');
  const { data: profiles, error: pErr } = await supabase
    .from('user_profiles')
    .select('*')
    .limit(3);

  if (pErr) {
    console.error('Error fetching user_profiles:', pErr);
  } else if (profiles && profiles.length > 0) {
    console.log('Columns in user_profiles:', Object.keys(profiles[0]));
    profiles.forEach(p => {
      console.log(`User ${p.email}: plan=${p.plan}, trial_ends_at=${p.trial_ends_at}, plan_expires_at=${p.plan_expires_at}, created_at=${p.created_at}, account_locked=${p.account_locked}`);
    });
  }

  // Check if inserting leads or templates beyond limits throws a Postgres trigger error
  console.log('\n--- Checking templates sample row (starters vs user templates) ---');
  const { data: tmpls } = await supabase.from('templates').select('id, user_id, is_starter, title').limit(5);
  console.log('Sample templates:', tmpls);
}

inspect();
