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
const testRecipient = 'dotthedart@gmail.com';

const supabase = createClient(supabaseUrl, anonKey);

async function fetchResendEmailDetails(emailId) {
  if (!emailId) return null;
  await new Promise(res => setTimeout(res, 2500));
  try {
    const res = await fetch(`https://api.resend.com/emails/${emailId}`, {
      headers: { 'Authorization': `Bearer ${resendApiKey}` }
    });
    if (!res.ok) {
      console.error(`Failed to fetch Resend details for ${emailId}: HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`Error fetching Resend email ${emailId}:`, err);
    return null;
  }
}

async function testSendUpgradeEmail() {
  console.log('\n======================================================');
  console.log('1. Testing Function: send-upgrade-email');
  console.log('======================================================');

  const testPassword = 'TestPassword123!';
  const setPasswordSql = `UPDATE auth.users SET encrypted_password = crypt('${testPassword}', gen_salt('bf')) WHERE email = '${testRecipient}';`;
  execSync(`npx supabase db query --linked "${setPasswordSql}"`, { encoding: 'utf8' });

  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: testRecipient,
    password: testPassword
  });

  if (signInErr || !signInData.session) {
    console.error('Failed to sign in test user:', signInErr);
    return;
  }

  const token = signInData.session.access_token;

  const res = await fetch(`${supabaseUrl}/functions/v1/send-upgrade-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      fullName: 'ReachDesk Audit Tester',
      email: testRecipient,
      mobileNumber: '+1234567890',
      requestedPlan: 'Pro',
      billingCycle: 'Monthly',
      paidAmount: 15,
      receiptPath: ''
    })
  });

  const text = await res.text();
  console.log(`[send-upgrade-email] Status: ${res.status}`);
  console.log(`[send-upgrade-email] Response: ${text}`);

  try {
    const json = JSON.parse(text);
    if (json.data && json.data.id) {
      const details = await fetchResendEmailDetails(json.data.id);
      console.log('\n--- Resend API Delivery Verification ---');
      console.log(`Email ID: ${details?.id}`);
      console.log(`From Header: ${details?.from}`);
      console.log(`To Header: ${details?.to?.join(', ')}`);
      console.log(`Subject: ${details?.subject}`);
      console.log(`Last Event / Status: ${details?.last_event}`);
      console.log(`HTML Snippet / Links:`, (details?.html || '').substring(0, 300));
    }
  } catch (e) {
    console.error('Failed to parse response JSON:', e);
  }
}

async function testPaddleWebhookEmail(eventType, description, extraPayload = {}) {
  console.log('\n======================================================');
  console.log(`2. Testing Paddle Webhook Email: ${description} (${eventType})`);
  console.log('======================================================');

  const basePayload = {
    event_type: eventType,
    data: {
      id: `sub_test_${Date.now()}`,
      status: eventType === 'subscription.canceled' ? 'canceled' : 'active',
      customer: { email: testRecipient },
      items: [
        {
          price: {
            product: { name: 'Pro Plan' },
            unit_price: { amount: '15.00', currency_code: 'USD' }
          }
        }
      ],
      details: {
        totals: { grand_total: '15.00' }
      },
      occurred_at: new Date().toISOString(),
      next_billed_at: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
      ...extraPayload
    }
  };

  const res = await fetch(`${supabaseUrl}/functions/v1/paddle-webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`,
      'apikey': anonKey,
      'X-Test-Bypass': 'true'
    },
    body: JSON.stringify(basePayload)
  });

  const text = await res.text();
  console.log(`[paddle-webhook : ${description}] Status: ${res.status}`);
  console.log(`[paddle-webhook : ${description}] Response: ${text}`);

  // Query Resend for recent sent email ID if returned
  try {
    const json = JSON.parse(text);
    if (json.email_id) {
      const details = await fetchResendEmailDetails(json.email_id);
      console.log(`Resend Email ID: ${details?.id}`);
      console.log(`From Header: ${details?.from}`);
      console.log(`Last Event / Status: ${details?.last_event}`);
    }
  } catch (e) {}
}

async function runAllTests() {
  await testSendUpgradeEmail();
  
  await testPaddleWebhookEmail('transaction.completed', 'Welcome Email (Initial Upgrade)');
  await testPaddleWebhookEmail('subscription.updated', '7-Day Upcoming Renewal Reminder');
  await testPaddleWebhookEmail('subscription.canceled', 'Subscription Canceled Email');
  await testPaddleWebhookEmail('transaction.payment_failed', 'Payment Failed Email');
}

runAllTests();
