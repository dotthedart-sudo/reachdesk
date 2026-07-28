/**
 * Verify plan_limits DB table matches planConfig.js and triggers enforce caps.
 * Run: node scratch/verify_plan_limits_v2.cjs
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const env = {};
envContent.split('\n').forEach((line) => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

// Current src/lib/planConfig.js (2026-07)
const FRONTEND = {
  trial: { leads: 50, templates: 5 },
  starter: { leads: 750, templates: 10 },
  pro: { leads: 5000, templates: null },
  lifetime: { leads: 5000000, templates: null },
};

const FEATURE_FLAGS = {
  trial: { bulkImport: true, calendarIntegration: true, sheetsIntegration: true },
  starter: { bulkImport: false, calendarIntegration: false, sheetsIntegration: true },
  pro: { bulkImport: true, calendarIntegration: true, sheetsIntegration: true },
  lifetime: { bulkImport: true, calendarIntegration: true, sheetsIntegration: true },
};

function getPlanLeadLimitFrontend(plan, billingCycle) {
  const base = FRONTEND[plan]?.leads ?? null;
  if (base === null) return null;
  if (plan === 'pro' && (billingCycle || '').toLowerCase() === 'yearly') return base * 2;
  return base;
}

function dbEffectiveMax(base, billingCycle) {
  if (base === null) return null;
  if ((billingCycle || '').toLowerCase() === 'yearly') return base * 2;
  return base;
}

let failures = 0;
const pass = (msg) => console.log(`✅ ${msg}`);
const fail = (msg) => { console.log(`❌ ${msg}`); failures += 1; };

async function compareDbTable() {
  console.log('\n=== 1. planConfig vs plan_limits table ===\n');
  const { data: dbLimits, error } = await supabase.from('plan_limits').select('*');
  if (error) {
    fail(`Could not read plan_limits: ${error.message}`);
    return;
  }
  const map = Object.fromEntries((dbLimits || []).map((r) => [r.plan, r]));

  console.log(`${'Plan'.padEnd(10)} | Frontend (leads/tmpl) | DB (leads/tmpl) | Match`);
  console.log('-'.repeat(60));
  for (const [plan, fe] of Object.entries(FRONTEND)) {
    const db = map[plan] || {};
    const feStr = `${fe.leads ?? '∞'} / ${fe.templates ?? '∞'}`;
    const dbStr = `${db.max_leads ?? '∞'} / ${db.max_templates ?? '∞'}`;
    const ok = fe.leads === db.max_leads && fe.templates === db.max_templates;
    console.log(`${plan.padEnd(10)} | ${feStr.padEnd(21)} | ${dbStr.padEnd(15)} | ${ok ? 'OK' : 'MISMATCH'}`);
    if (!ok) fail(`${plan}: frontend vs DB mismatch`);
    else pass(`${plan} limits match DB`);
  }

  // Legacy rows
  for (const legacy of ['teams', 'enterprise']) {
    const db = map[legacy];
    if (db) {
      console.log(`${legacy.padEnd(10)} | (legacy)              | ${db.max_leads ?? '∞'} / ${db.max_templates ?? '∞'}`);
    }
  }
}

async function testLeadLimit(plan, maxLeads, billingCycle = null) {
  const email = `verify_${plan}_${Date.now()}@example.com`;
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password: 'VerifyPlanLimits123!',
  });
  if (authErr || !authData.user) {
    fail(`${plan} signup failed: ${authErr?.message}`);
    return;
  }
  const userId = authData.user.id;
  await supabase.from('user_profiles').upsert({
    id: userId,
    email,
    plan,
    billing_cycle: billingCycle,
    plan_status: 'active',
  });

  const effectiveMax = dbEffectiveMax(maxLeads, billingCycle);
  const batch = Array.from({ length: effectiveMax }, (_, i) => ({
    user_id: userId,
    first_name: `L${i}`,
    email: `l${i}_${Date.now()}@example.com`,
    status: 'Lead',
    priority: 'Warm',
  }));

  const { error: batchErr } = await supabase.from('leads').insert(batch);
  if (batchErr) {
    fail(`${plan}: could not insert ${effectiveMax} leads — ${batchErr.message}`);
  } else {
    pass(`${plan}${billingCycle ? ` (${billingCycle})` : ''}: inserted ${effectiveMax} leads at cap`);
  }

  const { error: overErr } = await supabase.from('leads').insert({
    user_id: userId,
    first_name: 'Over',
    email: `over_${Date.now()}@example.com`,
    status: 'Lead',
    priority: 'Warm',
  });

  if (overErr?.message?.includes('Lead limit reached')) {
    pass(`${plan}: DB blocked lead #${effectiveMax + 1}`);
  } else {
    fail(`${plan}: expected lead limit block, got: ${overErr?.message || 'insert succeeded'}`);
  }

  // Frontend helper vs DB yearly
  const feLimit = getPlanLeadLimitFrontend(plan, billingCycle);
  if (feLimit !== effectiveMax) {
    fail(`${plan}: frontend getPlanLeadLimit (${feLimit}) ≠ DB effective max (${effectiveMax})`);
  } else if (billingCycle === 'yearly') {
    pass(`${plan} yearly: frontend lead limit matches DB (${effectiveMax})`);
  }

  await supabase.from('leads').delete().eq('user_id', userId);
  await supabase.from('user_profiles').delete().eq('id', userId);
}

async function testTemplateLimit(plan, maxTemplates) {
  if (maxTemplates === null) return;
  const email = `verify_tmpl_${plan}_${Date.now()}@example.com`;
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password: 'VerifyPlanLimits123!',
  });
  if (authErr || !authData.user) {
    fail(`${plan} template test signup failed`);
    return;
  }
  const userId = authData.user.id;
  await supabase.from('user_profiles').upsert({ id: userId, email, plan, plan_status: 'active' });

  const batch = Array.from({ length: maxTemplates }, (_, i) => ({
    user_id: userId,
    title: `T${i}`,
    content: JSON.stringify({ subject: 's', body: 'b' }),
    platform: 'Email',
    is_starter: false,
  }));
  const { error: batchErr } = await supabase.from('templates').insert(batch);
  if (batchErr) fail(`${plan}: template batch insert — ${batchErr.message}`);
  else pass(`${plan}: inserted ${maxTemplates} custom templates at cap`);

  const { error: overErr } = await supabase.from('templates').insert({
    user_id: userId,
    title: 'Over',
    content: JSON.stringify({ subject: 's', body: 'b' }),
    platform: 'Email',
    is_starter: false,
  });
  if (overErr?.message?.includes('Template limit reached')) {
    pass(`${plan}: DB blocked template #${maxTemplates + 1}`);
  } else {
    fail(`${plan}: expected template limit block`);
  }

  const { error: starterErr } = await supabase.from('templates').insert({
    user_id: userId,
    title: 'Starter ok',
    content: JSON.stringify({ subject: 's', body: 'b' }),
    platform: 'Email',
    is_starter: true,
  });
  if (starterErr) fail(`${plan}: starter template wrongly blocked`);
  else pass(`${plan}: starter template allowed at custom cap`);

  await supabase.from('templates').delete().eq('user_id', userId);
  await supabase.from('user_profiles').delete().eq('id', userId);
}

async function testRpcQuota() {
  console.log('\n=== 4. get_remaining_lead_quota RPC ===\n');
  const email = `verify_rpc_${Date.now()}@example.com`;
  const { data: authData } = await supabase.auth.signUp({ email, password: 'VerifyPlanLimits123!' });
  const userId = authData.user.id;
  await supabase.from('user_profiles').upsert({ id: userId, email, plan: 'trial', plan_status: 'active' });

  const { data: q0, error: e0 } = await supabase.rpc('get_remaining_lead_quota', { p_user_id: userId });
  if (e0) fail(`RPC error: ${e0.message}`);
  else if (q0 === 50) pass(`RPC returns 50 remaining for new trial user`);
  else fail(`RPC expected 50, got ${q0}`);

  await supabase.from('leads').insert({
    user_id: userId,
    first_name: 'One',
    email: `one_${Date.now()}@example.com`,
    status: 'Lead',
    priority: 'Warm',
  });
  const { data: q1 } = await supabase.rpc('get_remaining_lead_quota', { p_user_id: userId });
  if (q1 === 49) pass('RPC decrements after 1 lead inserted');
  else fail(`RPC expected 49 after 1 lead, got ${q1}`);

  await supabase.from('leads').delete().eq('user_id', userId);
  await supabase.from('user_profiles').delete().eq('id', userId);
}

async function auditFeatureFlags() {
  console.log('\n=== 5. Feature flag config (UI gating — manual spot-check) ===\n');
  console.log('bulkImport flag exists in planConfig but is NOT wired in CRM.jsx (CSV import uses lead quota only).');
  for (const [plan, flags] of Object.entries(FEATURE_FLAGS)) {
    console.log(`  ${plan}: calendar=${flags.calendarIntegration}, sheets=${flags.sheetsIntegration}, bulkImport flag=${flags.bulkImport}`);
  }
}

async function main() {
  console.log('ReachDesk plan limits verification\n');
  await compareDbTable();

  console.log('\n=== 2. Lead limit triggers ===\n');
  await testLeadLimit('trial', 50);
  await testLeadLimit('starter', 750);
  await testLeadLimit('pro', 5000, 'yearly'); // 10000 effective

  console.log('\n=== 3. Template limit triggers ===\n');
  await testTemplateLimit('trial', 5);
  await testTemplateLimit('starter', 10);

  await testRpcQuota();
  await auditFeatureFlags();

  console.log('\n=== 6. Yearly starter UI vs DB (known sync check) ===\n');
  const feStarterYearly = getPlanLeadLimitFrontend('starter', 'yearly');
  const dbStarterYearly = dbEffectiveMax(750, 'yearly');
  if (feStarterYearly !== dbStarterYearly) {
    fail(`Starter yearly: UI shows ${feStarterYearly} leads but DB allows ${dbStarterYearly} (marketing promises 2×)`);
  } else {
    pass('Starter yearly UI matches DB');
  }

  console.log(`\n${'='.repeat(50)}`);
  if (failures === 0) console.log('All checks passed.');
  else console.log(`${failures} check(s) failed.`);
  console.log('='.repeat(50));
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
