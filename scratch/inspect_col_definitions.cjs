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
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.from('column_definitions').select('*');
  if (error) {
    console.error(error);
  } else {
    console.log('column_definitions counts:', data.length);
    console.log('All column_definitions in DB:', data.map(d => ({
      id: d.id,
      user_id: d.user_id,
      column_key: d.column_key,
      column_label: d.column_label,
      column_type: d.column_type,
      table_view: d.table_view,
      is_visible: d.is_visible
    })));
  }
}

test();
