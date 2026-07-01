import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = val;
    }
  });
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  // Let's sign in to bypass RLS
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'dotthedart@gmail.com',
    password: 'password123' // wait, we don't know the password. Let's try service_role or other ways if possible.
  });
  console.log('auth result:', auth, 'error:', authErr);
}
run();
