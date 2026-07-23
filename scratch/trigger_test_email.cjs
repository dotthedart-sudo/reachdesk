const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

async function run() {
  console.log('--- Triggering send-upgrade-email Edge Function ---');
  const response = await fetch(`${supabaseUrl}/functions/v1/send-upgrade-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`
    },
    body: JSON.stringify({
      fullName: 'ReachDesk Test',
      email: 'dotthedart@gmail.com',
      mobileNumber: '+1234567890',
      requestedPlan: 'Pro',
      billingCycle: 'Monthly',
      paidAmount: 15,
      receiptPath: 'test/receipt.png'
    })
  });

  const resText = await response.text();
  console.log('HTTP Status:', response.status);
  console.log('Response Body:', resText);
}

run();
