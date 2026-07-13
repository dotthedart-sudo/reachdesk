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

async function inspect() {
  const { data, error } = await supabase.from('leads').select('*');
  if (error) {
    console.error('Error fetching leads:', error);
    return;
  }
  console.log(`Total leads: ${data.length}`);
  data.slice(0, 5).forEach(lead => {
    console.log({
      id: lead.id,
      name: `${lead.first_name} ${lead.last_name}`,
      linkedin_url: lead.linkedin_url,
      instagram_url: lead.instagram_url,
      twitter_url: lead.twitter_url,
      website: lead.website,
      custom_fields: lead.custom_fields
    });
  });
}

inspect();
