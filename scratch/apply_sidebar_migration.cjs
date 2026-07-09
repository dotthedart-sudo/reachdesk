// Execute DDL migration via Supabase REST SQL endpoint (service role required)
const https = require('https');
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

const supabaseUrl = env.VITE_SUPABASE_URL; // e.g. https://xyz.supabase.co
const serviceKey = env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('❌ VITE_SUPABASE_SERVICE_ROLE_KEY not found in .env');
  console.log('Available keys:', Object.keys(env).filter(k => k.includes('SUPA')));
  process.exit(1);
}

const sql = `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sidebar_collapsed boolean DEFAULT false;`;

// Parse host from URL
const urlObj = new URL(supabaseUrl);

const body = JSON.stringify({ query: sql });

const options = {
  hostname: urlObj.hostname,
  path: '/rest/v1/rpc/exec_sql',
  method: 'POST',
  headers: {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  }
};

// Try rpc approach first
const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('RPC response status:', res.statusCode);
    console.log('Body:', data.substring(0, 500));
    
    if (res.statusCode !== 200) {
      console.log('\n⚠️  exec_sql RPC not available — column must be added via Supabase SQL Editor.');
      console.log('SQL to run:\n', sql);
    } else {
      console.log('\n✅ Migration executed successfully');
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.write(body);
req.end();
