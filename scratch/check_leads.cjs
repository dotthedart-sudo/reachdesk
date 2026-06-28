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

async function checkLeads() {
  const { data: rows } = await supabase.from('leads').select('*').limit(1);
  if (rows && rows.length > 0) {
    console.log("Leads Columns:", Object.keys(rows[0]));
    console.log("Priority value:", rows[0].priority);
  } else {
    console.log("No leads found.");
  }
}
checkLeads();
