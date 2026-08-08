/**
 * Run admin full Paddle sync against production (admin session required).
 *
 * Usage:
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... node scratch/run_admin_paddle_sync.cjs
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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
  ...process.env,
};

const supabaseUrl = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const adminEmail = env.ADMIN_EMAIL;
const adminPassword = env.ADMIN_PASSWORD;

if (!supabaseUrl || !anonKey || !adminEmail || !adminPassword) {
  console.error('Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, ADMIN_EMAIL, ADMIN_PASSWORD');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function main() {
  const { data: signIn, error: signInErr } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });
  if (signInErr || !signIn.session) {
    console.error('Admin sign-in failed:', signInErr?.message || signInErr);
    process.exit(1);
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, email')
    .eq('id', signIn.session.user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') {
    console.error(`${adminEmail} is not role=admin`);
    process.exit(1);
  }

  console.log(`Running admin Paddle sync as ${profile.email}...`);
  const { data, error } = await supabase.functions.invoke('admin-sync-paddle-subscriptions', {
    body: {},
  });

  if (error) {
    let detail = error.message;
    try {
      const body = await error.context?.json?.();
      if (body?.error) detail = body.error;
    } catch {
      /* ignore */
    }
    console.error('Sync failed:', detail);
    process.exit(1);
  }

  console.log(JSON.stringify(data, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
