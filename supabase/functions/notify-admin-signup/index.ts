import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore
import webpush from 'npm:web-push';
import {
  corsHeaders,
  createServiceClient,
  jsonResponse,
  requireUser,
} from '../_shared/auth.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user, response: authError } = await requireUser(req);
    if (authError || !user) return authError!;

    const supabase = createServiceClient();
    const body = await req.json().catch(() => ({}));
    const isGoogle = !!body.is_google;

    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, created_at')
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr || !profile) {
      return jsonResponse({ error: 'Profile not found' }, 404);
    }

    const createdAt = new Date(profile.created_at).getTime();
    const ageMs = Date.now() - createdAt;
    if (ageMs > 15 * 60 * 1000) {
      return jsonResponse({ error: 'Signup notification window expired' }, 403);
    }

    const email = profile.email || user.email || body.from_email;
    if (!email) {
      return jsonResponse({ error: 'Missing email' }, 400);
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from('admin_notifications')
      .select('id')
      .eq('type', 'new_signup')
      .eq('from_email', email)
      .gte('created_at', oneHourAgo)
      .limit(1);

    if (existing && existing.length > 0) {
      return jsonResponse({ ok: true, duplicate: true });
    }

    const title = isGoogle ? 'New Signup (Google)' : 'New Signup';
    const message = isGoogle
      ? `${email} just signed up via Google on ReachDesk`
      : `${email} just signed up on ReachDesk`;

    webpush.setVapidDetails(
      Deno.env.get('VAPID_EMAIL')!,
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!,
    );

    const { data: adminProfiles } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'admin');

    const adminIds = adminProfiles?.map((p: { id: string }) => p.id) || [];

    if (adminIds.length > 0) {
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .in('user_id', adminIds);

      const payload = JSON.stringify({
        title,
        body: message,
        url: '/admin',
        tag: 'reachdesk',
      });

      await Promise.allSettled(
        (subs || []).map((sub: { endpoint: string; p256dh: string; auth: string }) =>
          webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          )
        ),
      );
    }

    const { error: insertErr } = await supabase.from('admin_notifications').insert({
      from_email: email,
      from_name: profile.full_name || null,
      type: 'new_signup',
      message,
      is_read: false,
    });

    if (insertErr) {
      console.warn('[notify-admin-signup] insert failed:', insertErr.message);
      return jsonResponse({ error: insertErr.message }, 500);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error('[notify-admin-signup] Error:', err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
