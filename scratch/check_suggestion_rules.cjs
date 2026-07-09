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

async function checkRules() {
  const { data, error } = await supabase
    .from('action_suggestion_rules')
    .select('*');

  if (error) {
    console.log('❌ Error querying action_suggestion_rules:', error.message);
  } else {
    console.log('✅ Current rules in database:');
    console.log(JSON.stringify(data, null, 2));
  }
}
checkRules().catch(console.error);
