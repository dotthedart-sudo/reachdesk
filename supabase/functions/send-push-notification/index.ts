import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore — web-push via npm: specifier for Deno
import webpush from 'npm:web-push';
import {
  corsHeaders,
  createServiceClient,
  isPrivilegedRequest,
  jsonResponse,
  requireUser,
} from '../_shared/auth.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Unauthorized: Missing Authorization header' }, 401);
    }

    const isServiceRole = isPrivilegedRequest(req);
    let callerUserId: string | null = null;

    if (!isServiceRole) {
      const { user, response } = await requireUser(req);
      if (response || !user) return response!;
      callerUserId = user.id;
    }

    const { target_user_id, title, body, url, notify_admin } = await req.json();

    if (notify_admin) {
      return jsonResponse(
        { error: 'Use notify-admin-signup for admin notifications' },
        403,
      );
    }

    if (!isServiceRole) {
      if (!target_user_id || target_user_id !== callerUserId) {
        return jsonResponse({ error: 'Forbidden: can only notify yourself' }, 403);
      }
    } else if (!target_user_id) {
      return jsonResponse({ error: 'Provide target_user_id' }, 400);
    }

    const supabase = createServiceClient();

    webpush.setVapidDetails(
      Deno.env.get('VAPID_EMAIL')!,
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!,
    );

    const { data: subs, error: subErr } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', target_user_id);

    if (subErr) throw subErr;

    const payload = JSON.stringify({
      title: title || 'ReachDesk',
      body: body || 'You have a new notification',
      url: url || '/dashboard',
      tag: 'reachdesk',
    });

    const results = await Promise.allSettled(
      (subs || []).map((sub: { endpoint: string; p256dh: string; auth: string }) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
      ),
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(`[send-push-notification] sent=${sent} failed=${failed}`);

    return jsonResponse({ sent, failed });
  } catch (err) {
    console.error('[send-push-notification] Error:', err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
