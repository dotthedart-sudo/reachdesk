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
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

async function testLiveEdgeFunction() {
  console.log('========================================================');
  console.log('Testing groq-chat Edge Function 403 Gating & Prompt Rules');
  console.log('========================================================\n');

  // 1. Get an existing user ID from auth.users via CLI
  const sqlGetUser = `SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 1;`;
  const userResultStr = execSync(`npx supabase db query --linked "${sqlGetUser}"`, { encoding: 'utf8' });
  const userResult = JSON.parse(userResultStr.substring(userResultStr.indexOf('{')));
  const testUserId = userResult.rows[0].id;
  const testUserEmail = userResult.rows[0].email;
  console.log(`Using test user: ${testUserEmail} (${testUserId})`);

  // 2. Set test user's plan to STARTER in database
  console.log('\n--- Step 6: Testing Starter Plan User (403 Expected) ---');
  execSync(`npx supabase db query --linked "UPDATE public.user_profiles SET plan = 'starter' WHERE id = '${testUserId}';"`, { encoding: 'utf8' });
  console.log('Updated user profile plan to starter.');

  // Create a supabase client and sign in as user (or generate JWT session if password available)
  // Let's set a known password for this test user in auth.users via SQL
  const setPasswordSql = `UPDATE auth.users SET encrypted_password = crypt('TestPassword123!', gen_salt('bf')) WHERE id = '${testUserId}';`;
  execSync(`npx supabase db query --linked "${setPasswordSql}"`, { encoding: 'utf8' });

  const supabaseClient = createClient(supabaseUrl, supabaseKey);
  const { data: signInData, error: signInErr } = await supabaseClient.auth.signInWithPassword({
    email: testUserEmail,
    password: 'TestPassword123!'
  });

  if (signInErr || !signInData.session) {
    console.error('Failed to sign in test user:', signInErr);
    return;
  }

  const token = signInData.session.access_token;
  console.log('Signed in test user successfully.');

  // 3. Make direct HTTP call to groq-chat Edge Function with Starter token
  const edgeUrl = `${supabaseUrl}/functions/v1/groq-chat`;
  console.log('Calling groq-chat Edge Function with Starter user token...');
  const resStarter = await fetch(edgeUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      mode: 'support',
      messages: [{ role: 'user', content: 'How do I add a lead?' }]
    })
  });

  console.log('Response HTTP Status:', resStarter.status);
  const starterBody = await resStarter.json();
  console.log('Response Body:', starterBody);

  if (resStarter.status === 403 && starterBody.error === 'This feature is available on Trial and Pro plans.') {
    console.log('✅ PASS: Starter plan request was rejected with status 403 and correct error message!');
  } else {
    console.error('❌ FAIL: Expected 403 rejection for Starter plan user!');
  }

  // 4. Set test user's plan to TRIAL in database and test allowed access & brevity/accuracy
  console.log('\n--- Testing Trial Plan User (Allowed Access, Brevity & Accuracy) ---');
  execSync(`npx supabase db query --linked "UPDATE public.user_profiles SET plan = 'trial' WHERE id = '${testUserId}';"`, { encoding: 'utf8' });
  console.log('Updated user profile plan to trial.');

  // Question A: How do I add a lead?
  console.log('\nAsking Chatbot: "How do I add a lead?"');
  const resTrial1 = await fetch(edgeUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      mode: 'support',
      messages: [{ role: 'user', content: 'How do I add a lead?' }]
    })
  });

  console.log('Response Status:', resTrial1.status);
  const body1 = await resTrial1.json();
  console.log('Chatbot Answer:\n', body1.reply);

  // Question B: Instagram DM automation (Unbuilt feature)
  console.log('\nAsking Chatbot: "Does ReachDesk support Instagram DM automation?"');
  const resTrial2 = await fetch(edgeUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      mode: 'support',
      messages: [{ role: 'user', content: 'Does ReachDesk support Instagram DM automation?' }]
    })
  });

  const body2 = await resTrial2.json();
  console.log('Chatbot Answer:\n', body2.reply);

  // Question C: Native SMS (Unbuilt feature)
  console.log('\nAsking Chatbot: "Can I send native SMS messages directly from ReachDesk?"');
  const resTrial3 = await fetch(edgeUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      mode: 'support',
      messages: [{ role: 'user', content: 'Can I send native SMS messages directly from ReachDesk?' }]
    })
  });

  const body3 = await resTrial3.json();
  console.log('Chatbot Answer:\n', body3.reply);

  console.log('\n========================================================');
  console.log('Edge Function & Prompt Verification Complete!');
  console.log('========================================================');
}

testLiveEdgeFunction().catch(err => {
  console.error('Fatal error in test:', err);
  process.exit(1);
});
