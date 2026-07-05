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

async function inspect() {
  console.log('--- 1. RLS Policies on user_profiles ---');
  const { data: policies, error: err1 } = await supabase.rpc('query_sql', {
    query: `
      SELECT polname, cmd, pg_get_expr(polqual, polrelid) as qual, pg_get_expr(polwithcheck, polrelid) as withcheck
      FROM pg_policy
      WHERE polrelid = 'public.user_profiles'::regclass;
    `
  });
  if (err1) console.error('Error fetching policies:', err1);
  else console.log(policies);

  console.log('\n--- 2. Triggers on auth.users ---');
  const { data: triggers, error: err2 } = await supabase.rpc('query_sql', {
    query: `
      SELECT tgname, tgrelid::regclass as relname, proname
      FROM pg_trigger t
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE tgrelid = 'auth.users'::regclass;
    `
  });
  if (err2) console.error('Error fetching triggers:', err2);
  else console.log(triggers);

  console.log('\n--- 3. Definition of handle_new_user function (if exists) ---');
  const { data: funcDef, error: err3 } = await supabase.rpc('query_sql', {
    query: `
      SELECT prosrc
      FROM pg_proc
      WHERE proname = 'handle_new_user';
    `
  });
  if (err3) console.error('Error fetching handle_new_user definition:', err3);
  else console.log(funcDef?.[0]?.prosrc);
}

inspect();
