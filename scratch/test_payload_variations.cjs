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
const resendApiKey = env.RESEND_API_KEY;
const testRecipient = 'dotthedart@gmail.com';

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

async function testPayloadVariation(scenarioName, payload) {
  console.log(`\n======================================================`);
  console.log(`Testing Payload Variation: ${scenarioName}`);
  console.log(`======================================================`);

  const res = await fetch(`${supabaseUrl}/functions/v1/paddle-webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`,
      'apikey': anonKey,
      'X-Test-Bypass': 'true'
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(`Response: ${text}`);

  try {
    const json = JSON.parse(text);
    if (json.email_id) {
      const details = await fetchResendEmailDetails(json.email_id);
      console.log(`\n--- Resend Email Object (${scenarioName}) ---`);
      console.log(`Email ID: ${details?.id}`);
      console.log(`From Header: ${details?.from}`);
      console.log(`Subject: ${details?.subject}`);
      console.log(`Delivery Status: ${details?.last_event}`);
      console.log(`\nHTML Content:`);
      console.log(details?.html);
    }
  } catch (err) {
    console.error('Error parsing response:', err);
  }
}

async function runVariations() {
  // Scenario 1: PKR Payment (Renewal Receipt & Upcoming Renewal)
  const pkrRenewalPayload = {
    event_type: 'transaction.completed',
    data: {
      id: `txn_pkr_${Date.now()}`,
      status: 'completed',
      currency_code: 'PKR',
      customer: { email: testRecipient },
      items: [
        {
          price: {
            product: { name: 'Pro Plan' },
            unit_price: { amount: '950', currency_code: 'PKR' }
          }
        }
      ],
      details: {
        totals: { grand_total: '950' }
      },
      occurred_at: '2026-07-23T10:00:00Z',
      next_billed_at: '2026-08-23T10:00:00Z'
    }
  };

  // Scenario 2: USD Payment (Renewal Receipt & Upcoming Renewal)
  const usdRenewalPayload = {
    event_type: 'transaction.completed',
    data: {
      id: `txn_usd_${Date.now()}`,
      status: 'completed',
      currency_code: 'USD',
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
      occurred_at: '2026-07-23T10:00:00Z',
      next_billed_at: '2026-08-23T10:00:00Z'
    }
  };

  // Scenario 3: PKR Upcoming Renewal Reminder (7 Days)
  const pkrReminderPayload = {
    event_type: 'subscription.updated',
    data: {
      id: `sub_pkr_${Date.now()}`,
      status: 'active',
      currency_code: 'PKR',
      customer: { email: testRecipient },
      items: [
        {
          price: {
            product: { name: 'Pro Plan' },
            unit_price: { amount: '950', currency_code: 'PKR' }
          }
        }
      ],
      next_transaction: {
        currency_code: 'PKR',
        totals: { grand_total: '950' }
      },
      next_billed_at: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString()
    }
  };

  // Scenario 4: USD Upcoming Renewal Reminder (7 Days)
  const usdReminderPayload = {
    event_type: 'subscription.updated',
    data: {
      id: `sub_usd_${Date.now()}`,
      status: 'active',
      currency_code: 'USD',
      customer: { email: testRecipient },
      items: [
        {
          price: {
            product: { name: 'Pro Plan' },
            unit_price: { amount: '15.00', currency_code: 'USD' }
          }
        }
      ],
      next_transaction: {
        currency_code: 'USD',
        totals: { grand_total: '15.00' }
      },
      next_billed_at: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString()
    }
  };

  await testPayloadVariation('PKR Renewal Receipt', pkrRenewalPayload);
  await testPayloadVariation('USD Renewal Receipt', usdRenewalPayload);
  await testPayloadVariation('PKR 7-Day Renewal Reminder', pkrReminderPayload);
  await testPayloadVariation('USD 7-Day Renewal Reminder', usdReminderPayload);
}

runVariations();
