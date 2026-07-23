const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const resendApiKey = env.RESEND_API_KEY;

const supabase = createClient(supabaseUrl, anonKey);

async function testUpgradeEmail() {
  console.log('--- Testing send-upgrade-email Edge Function ---');

  const testEmail = 'dotthedart@gmail.com';
  const testPassword = 'TestPassword123!';

  // Reset password in auth.users via CLI SQL
  const setPasswordSql = `UPDATE auth.users SET encrypted_password = crypt('${testPassword}', gen_salt('bf')) WHERE email = '${testEmail}';`;
  execSync(`npx supabase db query --linked "${setPasswordSql}"`, { encoding: 'utf8' });

  // Sign in as dotthedart@gmail.com
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });

  if (signInErr || !signInData.session) {
    console.error('Failed to sign in test user:', signInErr);
    return;
  }

  const token = signInData.session.access_token;
  console.log(`Signed in successfully as ${testEmail}`);

  // Now call send-upgrade-email Edge Function with valid user JWT
  const response = await fetch(`${supabaseUrl}/functions/v1/send-upgrade-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      fullName: 'ReachDesk Audit Tester',
      email: testEmail,
      mobileNumber: '+15551234567',
      requestedPlan: 'Pro',
      billingCycle: 'Monthly',
      paidAmount: 15,
      receiptPath: ''
    })
  });

  const resText = await response.text();
  console.log('HTTP Status:', response.status);
  console.log('Response Body:', resText);

  try {
    const json = JSON.parse(resText);
    if (json.data && json.data.id) {
      console.log(`\nEmail sent! Resend Email ID: ${json.data.id}`);

      // Query Resend API directly for email details
      await new Promise(r => setTimeout(r, 2500));
      const resendRes = await fetch(`https://api.resend.com/emails/${json.data.id}`, {
        headers: { 'Authorization': `Bearer ${resendApiKey}` }
      });
      const resendData = await resendRes.json();
      console.log('\n--- Resend Email Object from api.resend.com ---');
      console.log(JSON.stringify(resendData, null, 2));
    }
  } catch (err) {
    console.error('Error parsing response:', err);
  }
}

testUpgradeEmail();
