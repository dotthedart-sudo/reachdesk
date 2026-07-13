const fs = require('fs');
const path = require('path');
const https = require('https');

const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const url = new URL(env.VITE_SUPABASE_URL);
const options = {
  hostname: url.hostname,
  path: '/rest/v1/',
  headers: {
    'apikey': env.VITE_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`
  }
};

https.get(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      const leadsSchema = data.definitions?.leads;
      if (leadsSchema) {
        console.log(JSON.stringify(leadsSchema.properties, null, 2));
      } else {
        console.log('Leads definition not found. Definitions available:', Object.keys(data.definitions || {}));
      }
    } catch (e) {
      console.error('Parse error:', e);
      console.log('Body:', body);
    }
  });
}).on('error', (e) => {
  console.error('Fetch error:', e);
});
