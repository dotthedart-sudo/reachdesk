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
  // Let's call rpc or query public tables if possible, or try fetching template keys
  // Since we don't have direct SQL runner, let's look at the fields of the templates from select
  const { data, error } = await supabase.from('templates').select('*');
  if (error) {
    console.error(error);
  } else {
    console.log('Columns in templates table:', Object.keys(data[0]));
    console.log('All templates currently in DB:', data);
  }
}

test();
