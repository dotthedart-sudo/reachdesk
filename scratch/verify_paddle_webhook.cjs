/**
 * Verify paddle-webhook accepts signed requests and writes billing_events.
 *
 * Usage (requires PADDLE_WEBHOOK_SECRET in .env or .env.local):
 *   node scratch/verify_paddle_webhook.cjs
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return;
      const idx = trimmed.indexOf('=');
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    });
  return env;
}

const ROOT = path.join(__dirname, '..');
const env = {
  ...loadEnvFile(path.join(ROOT, '.env')),
  ...loadEnvFile(path.join(ROOT, '.env.local')),
};

const supabaseUrl = env.VITE_SUPABASE_URL;
const webhookSecret = env.PADDLE_WEBHOOK_SECRET;

if (!supabaseUrl || !webhookSecret) {
  console.error('Missing VITE_SUPABASE_URL or PADDLE_WEBHOOK_SECRET in .env / .env.local');
  process.exit(1);
}

const body = JSON.stringify({
  event_type: 'transaction.completed',
  data: {
    id: `txn_verify_${Date.now()}`,
    status: 'completed',
    customer: { email: 'webhook-verify@reachdesk.test', id: 'ctm_verify_test' },
    subscription_id: 'sub_verify_test',
    items: [{ price: { id: 'pri_test', product: { name: 'Starter Plan' } } }],
  },
});

const ts = Math.floor(Date.now() / 1000).toString();
const h1 = crypto.createHmac('sha256', webhookSecret).update(`${ts}:${body}`).digest('hex');
const signature = `ts=${ts};h1=${h1}`;

async function main() {
  const url = `${supabaseUrl}/functions/v1/paddle-webhook`;
  console.log('POST', url);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Paddle-Signature': signature,
    },
    body,
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);

  if (res.status === 401 && text.includes('UNAUTHORIZED_NO_AUTH_HEADER')) {
    console.error('\nFAIL: Supabase JWT gate still blocking — redeploy with --no-verify-jwt');
    process.exit(1);
  }

  if (res.status === 401 && text.includes('Invalid signature')) {
    console.error('\nFAIL: PADDLE_WEBHOOK_SECRET does not match signing input — update Supabase secret from Paddle dashboard');
    process.exit(1);
  }

  if (res.status === 200) {
    console.log('\nOK: Webhook processed. Check billing_events for webhook_unmatched_user or webhook_transaction_completed.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
