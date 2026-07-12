import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const SUPABASE_FUNCTIONS_URL = 'https://efxgwqfdstrhrnnvtynl.supabase.co/functions/v1';

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; expires_in: number } | null> {
  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!resp.ok) return null;
  return await resp.json();
}

async function stopWatchChannel(
  channelId: string,
  resourceId: string,
  accessToken: string
): Promise<void> {
  await fetch(`${GOOGLE_CALENDAR_API}/channels/stop`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: channelId, resourceId }),
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      serviceRoleKey
    );

    // Find all integrations expiring within the next 2 days
    const renewalCutoff = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

    const { data: expiring, error: fetchErr } = await supabase
      .from('calendar_integrations')
      .select('*')
      .eq('provider', 'google')
      .eq('is_active', true)
      .or(`watch_expiration.is.null,watch_expiration.lt.${renewalCutoff}`);

    if (fetchErr) throw fetchErr;

    if (!expiring || expiring.length === 0) {
      console.log('[renew-calendar-watches] No watches need renewal.');
      return new Response(
        JSON.stringify({ message: 'No watches need renewal.', renewed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[renew-calendar-watches] Renewing ${expiring.length} watch(es)...`);
    const results: { userId: string; success: boolean; error?: string }[] = [];

    for (const integration of expiring) {
      const userId = integration.user_id;

      try {
        // ── Refresh token if needed ─────────────────────────────────────────
        let accessToken = integration.access_token;
        const isExpired = new Date(integration.token_expires_at) <= new Date(Date.now() + 60_000);

        if (isExpired) {
          const refreshed = await refreshAccessToken(integration.refresh_token, clientId, clientSecret);
          if (!refreshed) {
            // If refresh fails, mark integration as inactive
            await supabase
              .from('calendar_integrations')
              .update({ is_active: false })
              .eq('user_id', userId)
              .eq('provider', 'google');
            results.push({ userId, success: false, error: 'Token refresh failed — integration deactivated' });
            continue;
          }
          accessToken = refreshed.access_token;
          await supabase
            .from('calendar_integrations')
            .update({
              access_token: accessToken,
              token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
            })
            .eq('user_id', userId)
            .eq('provider', 'google');
        }

        // ── Stop the old channel (if it exists) ────────────────────────────
        if (integration.watch_channel_id && integration.watch_resource_id) {
          try {
            await stopWatchChannel(
              integration.watch_channel_id,
              integration.watch_resource_id,
              accessToken
            );
          } catch (stopErr) {
            // Non-fatal — old channel may already be expired
            console.warn(`[renew-calendar-watches] Could not stop old channel for user ${userId}:`, stopErr);
          }
        }

        // ── Create a new watch channel via setup-calendar-watch ────────────
        const setupResp = await fetch(`${SUPABASE_FUNCTIONS_URL}/setup-calendar-watch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({ userId, accessToken }),
        });

        const setupResult = await setupResp.json();

        if (!setupResp.ok) {
          results.push({ userId, success: false, error: setupResult.error || 'Watch setup failed' });
          continue;
        }

        results.push({ userId, success: true });
        console.log(`[renew-calendar-watches] Successfully renewed watch for user ${userId}`);
      } catch (err) {
        results.push({ userId, success: false, error: String(err) });
        console.error(`[renew-calendar-watches] Error renewing watch for user ${userId}:`, err);
      }
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({ message: `Renewed ${succeeded} watch(es). Failed: ${failed}.`, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[renew-calendar-watches] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
