const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const FRONTEND_PLAN_LIMITS = {
  trial: { leads: 65, templates: 3 },
  starter: { leads: 1000, templates: 10 },
  pro: { leads: 5000, templates: null },
  teams: { leads: null, templates: null },
  enterprise: { leads: null, templates: null }
};

async function verify() {
  console.log('========================================================');
  console.log('Step 5: Comparing plan_limits DB table vs utils.js PLAN_LIMITS');
  console.log('========================================================');

  const { data: dbLimits, error: limitsErr } = await supabase
    .from('plan_limits')
    .select('*');

  if (limitsErr) {
    console.error('Failed to query plan_limits table:', limitsErr);
    process.exit(1);
  }

  const dbLimitsMap = {};
  (dbLimits || []).forEach(row => {
    dbLimitsMap[row.plan] = row;
  });

  console.log(String('Plan').padEnd(12) + '| utils.js (Leads / Tmpls)'.padEnd(30) + '| DB plan_limits (Leads / Tmpls)');
  console.log('-'.repeat(75));

  for (const [planName, feLimit] of Object.entries(FRONTEND_PLAN_LIMITS)) {
    const dbLimit = dbLimitsMap[planName] || {};
    const feStr = `${feLimit.leads ?? 'null'} / ${feLimit.templates ?? 'null'}`;
    const dbStr = `${dbLimit.max_leads ?? 'null'} / ${dbLimit.max_templates ?? 'null'}`;
    console.log(planName.padEnd(12) + '| ' + feStr.padEnd(28) + '| ' + dbStr);
  }

  console.log('\n========================================================');
  console.log('Step 2 & 3: Testing DB enforcement for trial user at limit (65 leads)');
  console.log('========================================================');

  const testEmail = `test_limit_user_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword
  });

  if (authErr || !authData.user) {
    console.error('Auth signup error:', authErr);
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log(`Created test user: ${testEmail} (ID: ${userId})`);

  // Ensure user profile is set to trial plan
  await supabase.from('user_profiles').upsert({
    id: userId,
    email: testEmail,
    plan: 'trial'
  });

  // Step 2 & 3: Insert 65 leads (at limit)
  console.log('Inserting 65 leads for trial user...');
  const batchLeads = [];
  for (let i = 1; i <= 65; i++) {
    batchLeads.push({
      user_id: userId,
      first_name: `TestLead_${i}`,
      email: `lead_${i}_${Date.now()}@example.com`,
      status: 'Lead',
      priority: 'Warm'
    });
  }

  const { error: batchErr } = await supabase.from('leads').insert(batchLeads);
  if (batchErr) {
    console.error('Error inserting initial 65 leads:', batchErr.message);
  } else {
    console.log('Successfully inserted 65 leads (under/at limit).');
  }

  // DIRECT DB TEST: Attempt 66th lead past limit
  console.log('\n--- Step 3: Direct API call to insert 66th lead (past limit) ---');
  const { data: overLeadData, error: overLeadErr } = await supabase.from('leads').insert({
    user_id: userId,
    first_name: 'OverLimitLead',
    email: `over_limit_${Date.now()}@example.com`,
    status: 'Lead',
    priority: 'Warm'
  }).select();

  if (overLeadErr) {
    console.log('Result: REJECTED BY DATABASE TRIGGER AS EXPECTED!');
    console.log('   Error Code   :', overLeadErr.code);
    console.log('   Error Message:', overLeadErr.message);
    if (overLeadErr.message.includes('Lead limit reached')) {
      console.log('✅ PASS: Database trigger correctly rejected insert exceeding lead limit.');
    } else {
      console.error('❌ Unexpected error message for lead limit rejection.');
    }
  } else {
    console.error('❌ FAIL: Database allowed insert exceeding lead limit!', overLeadData);
  }

  console.log('\n========================================================');
  console.log('Step 3: Testing DB enforcement for trial user at limit (3 templates)');
  console.log('========================================================');

  console.log('Inserting 3 custom templates for trial user...');
  const batchTemplates = [1, 2, 3].map(i => ({
    user_id: userId,
    title: `Template ${i}`,
    content: JSON.stringify({ subject: `Subject ${i}`, body: `Body ${i}` }),
    platform: 'Email',
    is_starter: false
  }));

  const { error: tmplBatchErr } = await supabase.from('templates').insert(batchTemplates);
  if (tmplBatchErr) {
    console.error('Error inserting initial 3 templates:', tmplBatchErr.message);
  } else {
    console.log('Successfully inserted 3 custom templates (at limit).');
  }

  // DIRECT DB TEST: Attempt 4th custom template past limit
  console.log('\n--- Direct API call to insert 4th custom template (past limit) ---');
  const { data: overTmplData, error: overTmplErr } = await supabase.from('templates').insert({
    user_id: userId,
    title: 'OverLimitTemplate',
    content: JSON.stringify({ subject: 'Over', body: 'Limit' }),
    platform: 'Email',
    is_starter: false
  }).select();

  if (overTmplErr) {
    console.log('Result: REJECTED BY DATABASE TRIGGER AS EXPECTED!');
    console.log('   Error Code   :', overTmplErr.code);
    console.log('   Error Message:', overTmplErr.message);
    if (overTmplErr.message.includes('Template limit reached')) {
      console.log('✅ PASS: Database trigger correctly rejected insert exceeding template limit.');
    } else {
      console.error('❌ Unexpected error message for template limit rejection.');
    }
  } else {
    console.error('❌ FAIL: Database allowed insert exceeding template limit!', overTmplData);
  }

  // Test starter template insertion when at limit (should be allowed)
  console.log('\n--- Direct API call to insert starter template when at limit ---');
  const { data: starterData, error: starterErr } = await supabase.from('templates').insert({
    user_id: userId,
    title: 'Starter Template Exception Test',
    content: JSON.stringify({ subject: 'Starter', body: 'Body' }),
    platform: 'Email',
    is_starter: true
  }).select();

  if (starterErr) {
    console.error('❌ FAIL: Starter template was wrongly blocked by trigger!', starterErr.message);
  } else {
    console.log('✅ PASS: Starter template was allowed despite user being at custom template limit.');
    await supabase.from('templates').delete().eq('id', starterData[0].id);
  }

  // Cleanup test data
  console.log('\nCleaning up test user data...');
  await supabase.from('leads').delete().eq('user_id', userId);
  await supabase.from('templates').delete().eq('user_id', userId);
  await supabase.from('user_profiles').delete().eq('id', userId);

  console.log('========================================================');
  console.log('All verification steps completed successfully!');
  console.log('========================================================');
}

verify().catch(err => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
