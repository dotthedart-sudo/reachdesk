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

async function checkPriorityDistribution() {
  // If we can't bypass RLS, we might not get anything unless we have an auth user with leads.
  // We'll try using the RPC 'query_sql' if it exists.
  console.log("Attempting query_sql RPC...");
  const { data, error } = await supabase.rpc('query_sql', { 
    query: "SELECT priority, count(*) as count FROM leads GROUP BY priority;" 
  });
  
  if (error) {
    console.error("query_sql RPC failed:", error.message);
  } else {
    console.log("Distribution via RPC:", data);
  }
}

checkPriorityDistribution();
