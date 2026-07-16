const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
  }
});

async function run() {
  const userId = '19b51d11-7d16-413a-8ac6-acff05ffba50'; // dotthedart@gmail.com
  const url = `${env.VITE_SUPABASE_URL}/functions/v1/google-oauth-exchange`;
  console.log('Sending request to:', url);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({ code: 'test_code', userId })
  });

  console.log('Response Status:', res.status, res.statusText);
  const text = await res.text();
  console.log('Response Body:', text);
}

run();
