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
  const { data: authData } = await supabase.auth.signUp({ email, password: 'TemporaryPassword123!' });
  const userId = authData?.user?.id;

  if (!userId) return console.log("Failed to create user");

  // Check lead notes
  const { data: notesData, error } = await supabase.rpc('query_sql', { query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'notes'" });
  if (error) {
    console.error('RPC failed, trying raw insert to see schema...');
    const { data: notesRaw } = await supabase.from('notes').select('*').limit(1);
    if(notesRaw && notesRaw.length > 0) {
      console.log("Notes columns:", Object.keys(notesRaw[0]));
    } else {
      console.log("No notes rows found.");
    }
  } else {
    console.log("Notes columns:", notesData);
  }
}
check();
