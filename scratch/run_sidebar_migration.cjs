// Migration + verification for sidebar_collapsed column
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
// Use service role key if available (needed for DDL), fall back to anon
const supabaseKey = env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Running migration: ADD COLUMN IF NOT EXISTS sidebar_collapsed ...');

  // Try DDL via raw SQL through pg_execute or rpc if available
  // For Supabase anon key, DDL isn't possible via REST — we verify the column exists instead
  // and trust the SQL file was applied (or run it via psql)

  // Verification: fetch a row and check if the key is present
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, sidebar_collapsed')
    .limit(3);

  if (error) {
    // If column doesn't exist, Supabase returns a 400 with PGRST error
    console.log('\n❌ Column NOT found (or query error):');
    console.log('   code   :', error.code);
    console.log('   message:', error.message);
    console.log('\n➜  Run this SQL in the Supabase SQL Editor or via psql:');
    console.log('   ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sidebar_collapsed boolean DEFAULT false;');
  } else {
    console.log('\n✅ Column EXISTS — sidebar_collapsed is in user_profiles');
    console.log('   Rows returned:', data.length);
    data.forEach((row, i) => {
      console.log(`   Row ${i + 1}: id=${row.id}  sidebar_collapsed=${row.sidebar_collapsed}`);
    });
  }
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
