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

async function checkTables() {
  const email = `temp_schema_user_${Math.floor(Math.random() * 100000)}@example.com`;
  const password = 'TemporaryPassword123!';
  
  console.log('Signing up temporary user:', email);
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password
  });
  
  if (authError) {
    console.error('Sign up error:', authError.message);
    return;
  }
  
  const userId = authData.user.id;
  console.log('Signed up! User ID:', userId);

  // 1. Insert dummy lead
  console.log('\n--- Inserting dummy lead ---');
  const { data: leadData, error: leadErr } = await supabase.from('leads').insert([{
    user_id: userId,
    first_name: 'Dummy',
    last_name: 'Lead',
    email: `dummy_lead_${Math.floor(Math.random() * 100000)}@example.com`,
    status: 'Lead',
    priority: 'medium'
  }]).select();

  if (leadErr) {
    console.error('Failed to insert dummy lead:', leadErr.message);
    return;
  }
  const leadId = leadData[0].id;

  // 2. Try inserting column_definitions with column_key and column_label
  console.log('\n--- Inserting column_definitions ---');
  const { data: colData, error: colErr } = await supabase.from('column_definitions').insert([{
    user_id: userId,
    table_view: 'contact_details',
    column_key: 'phone',
    column_label: 'Phone'
  }]).select();

  if (colErr) {
    console.log('Insert on column_definitions error:', colErr.message, '| details:', colErr.details);
  } else {
    console.log('Insert on column_definitions success!');
    console.log('column_definitions Columns:', Object.keys(colData[0]));
    console.log('column_definitions Row:', colData[0]);
    await supabase.from('column_definitions').delete().eq('id', colData[0].id);
  }

  // Cleanup lead
  await supabase.from('leads').delete().eq('id', leadId);
}

checkTables();
