import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-ignore — web-push via npm: specifier for Deno
import webpush from 'npm:web-push';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { target_user_id, title, body, url, notify_admin, notification_type, from_email, from_name } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    webpush.setVapidDetails(
      Deno.env.get('VAPID_EMAIL')!,
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!
    );

    // ── Determine which subscriptions to target ──────────────────────────────
    let query = supabase.from('push_subscriptions').select('*');

    if (notify_admin) {
      // Send to all admin users
      const { data: adminProfiles } = await supabase
        .from('user_profiles')
        .select('id')
        .or('role.eq.admin,email.eq.dotthedart@gmail.com');

      const adminIds = adminProfiles?.map((p: { id: string }) => p.id) || [];
      if (adminIds.length === 0) {
        return new Response(JSON.stringify({ sent: 0, info: 'No admin profiles found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      query = query.in('user_id', adminIds);
    } else if (target_user_id) {
      query = query.eq('user_id', target_user_id);
    } else {
      return new Response(JSON.stringify({ error: 'Provide target_user_id or notify_admin=true' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: subs, error: subErr } = await query;
    if (subErr) throw subErr;

    const payload = JSON.stringify({
      title: title || 'ReachDesk',
      body: body || 'You have a new notification',
      url: url || '/dashboard',
      tag: 'reachdesk',
    });

    // ── Send to all matched subscriptions ────────────────────────────────────
    const results = await Promise.allSettled(
      (subs || []).map((sub: { endpoint: string; p256dh: string; auth: string }) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
      )
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(`[send-push-notification] sent=${sent} failed=${failed}`);

    // ── If notify_admin, also persist a row in admin_notifications ───────────
    // This uses the service-role client so it bypasses RLS and always lands
    // in the admin panel regardless of whether push was delivered.
    if (notify_admin) {
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
    }

    return new Response(JSON.stringify({ sent, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-push-notification] Error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
