// Use native fetch
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

async function testLiveDeploy() {
  const url = `${env.VITE_SUPABASE_URL}/functions/v1/detect-location`;
  
  // Test 1: Pakistan IP
  console.log('Testing live deployed function with Pakistan IP (111.88.0.1)...');
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'X-Forwarded-For': '111.88.0.1'
      }
    });
    console.log('Pakistan Response Status:', response.status);
    console.log('Pakistan Response Data:', await response.json());
  } catch (err) {
    console.error('Error fetching Pakistan IP:', err);
  }

  // Test 2: US IP
  console.log('\nTesting live deployed function with US IP (8.8.8.8)...');
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'X-Forwarded-For': '8.8.8.8'
      }
    });
    console.log('US Response Status:', response.status);
    console.log('US Response Data:', await response.json());
  } catch (err) {
    console.error('Error fetching US IP:', err);
  }
}

testLiveDeploy();
