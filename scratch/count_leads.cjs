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

async function countLeads() {
  const email = 'dotthedart@gmail.com';
  const password = process.argv[2];
  
  if (!password) {
    console.error('Usage: node count_leads.cjs <password>');
    return;
  }

  console.log('Signing in as:', email);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  
  if (authError) {
    console.error('Sign in error:', authError.message);
    return;
  }

  const userId = authData.user.id;
  console.log('Signed in! User ID:', userId);

  // Count leads using .count
  const { count: totalCount, error: cntErr } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  console.log('Total leads in DB (count query):', totalCount, cntErr ? 'ERROR: ' + cntErr.message : '');

  // Now fetch ALL leads to check actual return count
  const { data: leadsData, error: leadsErr } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (leadsErr) {
    console.error('Fetch error:', leadsErr.message);
  } else {
    console.log('Leads returned by select (no limit):', leadsData.length);
    
    // Check if Supabase is applying a default limit
    const { data: leadsRange, error: rangeErr } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(0, 999);

    if (rangeErr) {
      console.error('Range fetch error:', rangeErr.message);
    } else {
      console.log('Leads returned with explicit range(0,999):', leadsRange.length);
    }
  }
}

countLeads();
