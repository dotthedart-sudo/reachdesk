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

async function fetchOpenApi() {
  const url = `${env.VITE_SUPABASE_URL}/rest/v1/`;
  const response = await fetch(url, {
    headers: {
      'apikey': env.VITE_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`
    }
  });
  const data = await response.json();
  const keys = Object.keys(data);
  console.log('Top-level keys in OpenAPI response:', keys);
  
  if (data.definitions) {
    console.log('Exposed Definitions:', Object.keys(data.definitions));
    if (data.definitions.admin_notifications) {
      console.log('admin_notifications Schema:', JSON.stringify(data.definitions.admin_notifications, null, 2));
    }
  } else if (data.components && data.components.schemas) {
    console.log('Exposed Schemas:', Object.keys(data.components.schemas));
    if (data.components.schemas.admin_notifications) {
      console.log('admin_notifications Schema:', JSON.stringify(data.components.schemas.admin_notifications, null, 2));
    }
  } else {
    console.log('Full response sample:', JSON.stringify(data).slice(0, 3000));
  }
}

fetchOpenApi().catch(console.error);
