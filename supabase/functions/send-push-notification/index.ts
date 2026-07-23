import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-ignore — web-push via npm: specifier for Deno
import webpush from 'npm:web-push';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Unauthorized: Missing Authorization header' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Dual auth: service-role bearer (cron) OR valid user JWT
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const isServiceRole = token === serviceRoleKey;

    let callerUserId: string | null = null;

    if (!isServiceRole) {
      const supabaseUser = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
      if (authError || !user) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }
      callerUserId = user.id;
    }

    const { target_user_id, title, body, url, notify_admin, notification_type, from_email, from_name } = await req.json();

    // User JWT: can only target self, or notify_admin
    if (!isServiceRole) {
      if (notify_admin) {
        // allowed for authenticated signup / upgrade flows
      } else if (target_user_id) {
        if (target_user_id !== callerUserId) {
          return jsonResponse({ error: 'Forbidden: can only notify yourself' }, 403);
        }
      } else {
        return jsonResponse({ error: 'Provide target_user_id or notify_admin=true' }, 400);
      }
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    webpush.setVapidDetails(
      Deno.env.get('VAPID_EMAIL')!,
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!
    );

    let query = supabase.from('push_subscriptions').select('*');

    if (notify_admin) {
      const { data: adminProfiles } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('role', 'admin');

      const adminIds = adminProfiles?.map((p: { id: string }) => p.id) || [];

      if (adminIds.length > 0) {
        const { data: subs, error: subErr } = await query.in('user_id', adminIds);
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
              payload
            )
          )
        );

        const sent = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results.filter((r) => r.status === 'rejected').length;
        console.log(`[send-push-notification] sent=${sent} failed=${failed}`);
      } else {
        console.log('[send-push-notification] No admin push subscriptions found — skipping push, still inserting admin_notifications row.');
      }

      const notifType = notification_type || 'new_signup';
      const { error: insertErr } = await supabase
        .from('admin_notifications')
        .insert({
          from_email: from_email || null,
          from_name: from_name || null,
          type: notifType,
          message: body || title || 'New notification',
          is_read: false,
        });
      if (insertErr) {
        console.warn('[send-push-notification] admin_notifications insert failed:', insertErr.message);
      } else {
        console.log('[send-push-notification] admin_notifications row inserted, type:', notifType);
      }

      return jsonResponse({ ok: true });
    } else if (target_user_id) {
      query = query.eq('user_id', target_user_id);
    } else {
      return jsonResponse({ error: 'Provide target_user_id or notify_admin=true' }, 400);
    }

    const { data: subs, error: subErr } = await query;
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
          payload
        )
      )
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
