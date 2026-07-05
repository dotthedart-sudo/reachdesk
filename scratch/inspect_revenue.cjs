const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => { const parts = line.split('='); if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim(); });
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
async function test() {
  const email = 'scan_revenue_' + Date.now() + '@example.com';
  const { data: auth, error: authErr } = await supabase.auth.signUp({ email, password: 'TestPass123!' });
  if (authErr) { console.error('Auth error:', authErr.message); return; }
  const userId = auth.user.id;
  const candidates = ['source','date','dateAdded','userEmail','payment_date','paid_at','project','client','description','logged_at','notes'];
  for (const col of candidates) {
    const payload = { amount: 10, currency: 'USD', user_id: userId, [col]: 'testval' };
    const { data, error } = await supabase.from('revenue_entries').insert(payload).select();
    const missing = error && error.code === 'PGRST204';
    const rls = error && error.code === '42501';
    console.log(col + ': ' + (missing ? 'MISSING' : rls ? 'EXISTS(rls)' : data ? 'EXISTS(ok)' : error?.code + ' ' + error?.message));
    if (data) { await supabase.from('revenue_entries').delete().eq('id', data[0].id); }
  }
}
test();
