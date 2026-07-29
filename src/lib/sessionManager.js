import { supabase } from './supabase';

const STORAGE_KEY = 'rd_device_fp';

function getOrCreateFingerprint() {
  try {
    let fp = localStorage.getItem(STORAGE_KEY);
    if (!fp) {
      fp = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, fp);
    }
    return fp;
  } catch {
    return 'unknown-device';
  }
}

function isLegacyLifetimePlan(plan) {
  const p = (plan || '').toLowerCase();
  return p === 'lifetime' || p === 'enterprise';
}

/**
 * Legacy lifetime plan: enforce 1 concurrent session.
 * No-op for current plans (lifetime fully removed; zero remaining users).
 */
export async function registerLifetimeSession(userId, plan) {
  if (!userId || !isLegacyLifetimePlan(plan)) return { ok: true };

  const fingerprint = getOrCreateFingerprint();
  const sessionToken = crypto.randomUUID();

  const { data: existing } = await supabase
    .from('user_sessions')
    .select('id, device_fingerprint, session_token')
    .eq('user_id', userId);

  const others = (existing || []).filter((s) => s.device_fingerprint !== fingerprint);
  if (others.length > 0) {
    await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', userId)
      .neq('device_fingerprint', fingerprint);
  }

  const { error } = await supabase.from('user_sessions').upsert(
    {
      user_id: userId,
      device_fingerprint: fingerprint,
      session_token: sessionToken,
      last_seen_at: new Date().toISOString(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    },
    { onConflict: 'user_id,device_fingerprint' },
  );

  if (error) {
    console.warn('[sessionManager] register failed:', error.message);
  }

  try {
    sessionStorage.setItem('rd_session_token', sessionToken);
  } catch { /* ignore */ }

  return { ok: !error, sessionToken };
}

export async function validateLifetimeSession(userId, plan) {
  if (!userId || !isLegacyLifetimePlan(plan)) return { valid: true };

  const fingerprint = getOrCreateFingerprint();
  let localToken = null;
  try {
    localToken = sessionStorage.getItem('rd_session_token');
  } catch { /* ignore */ }

  const { data: row } = await supabase
    .from('user_sessions')
    .select('session_token, device_fingerprint')
    .eq('user_id', userId)
    .eq('device_fingerprint', fingerprint)
    .maybeSingle();

  if (!row) {
    await registerLifetimeSession(userId, plan);
    return { valid: true };
  }

  if (localToken && row.session_token !== localToken) {
    return { valid: false, reason: 'signed_in_elsewhere' };
  }

  await supabase
    .from('user_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('device_fingerprint', fingerprint);

  return { valid: true };
}

export async function clearLifetimeSession(userId) {
  if (!userId) return;
  const fingerprint = getOrCreateFingerprint();
  await supabase
    .from('user_sessions')
    .delete()
    .eq('user_id', userId)
    .eq('device_fingerprint', fingerprint);
  try {
    sessionStorage.removeItem('rd_session_token');
  } catch { /* ignore */ }
}
