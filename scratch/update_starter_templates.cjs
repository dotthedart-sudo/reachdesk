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
  const { data, error } = await supabase.from('templates')
    .update({ title: 'LinkedIn — First Message' })
    .eq('id', 'e7ad8049-52ca-499f-a851-c63e0bd4f9ab')
    .select();

  if (error) {
    console.error('Update error:', error);
  } else {
    console.log('Update success!', data);
  }
}

test();
