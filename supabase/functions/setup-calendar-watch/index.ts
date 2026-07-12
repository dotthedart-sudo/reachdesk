import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// The public URL of the calendar-webhook-receiver function
const WEBHOOK_RECEIVER_URL = 'https://efxgwqfdstrhrnnvtynl.supabase.co/functions/v1/calendar-webhook-receiver';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!resp.ok) return null;
  return await resp.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { userId, accessToken: providedToken } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the stored integration row to get tokens
    const { data: integration, error: fetchErr } = await supabase
      .from('calendar_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .single();

    if (fetchErr || !integration) {
      return new Response(
        JSON.stringify({ error: 'No Google Calendar integration found for this user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine which access token to use (freshly provided or fetch + maybe refresh from DB)
    let accessToken = providedToken || integration.access_token;

    // If token is expired or close to expiry, refresh it
    const isExpired = new Date(integration.token_expires_at) <= new Date(Date.now() + 60_000);
    if (!providedToken && isExpired) {
      const refreshed = await refreshAccessToken(integration.refresh_token);
      if (!refreshed) {
        return new Response(
          JSON.stringify({ error: 'Failed to refresh Google access token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      accessToken = refreshed.access_token;
      // Update the stored token
      await supabase
        .from('calendar_integrations')
        .update({
          access_token: accessToken,
          token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        })
        .eq('user_id', userId)
        .eq('provider', 'google');
    }

    // ── Set up calendar watch ─────────────────────────────────────────────────
    const channelId = crypto.randomUUID();

    const watchResponse = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/primary/events/watch`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: channelId,
          type: 'web_hook',
          address: WEBHOOK_RECEIVER_URL,
          token: userId, // Passed back by Google in X-Goog-Channel-Token header
          params: {
            ttl: '604800', // 7 days (Google's maximum)
          },
        }),
      }
    );

    const watchData = await watchResponse.json();

    if (!watchResponse.ok) {
      console.error('[setup-calendar-watch] Google watch setup failed:', watchData);
      return new Response(
        JSON.stringify({ error: watchData.error?.message || 'Watch setup failed', details: watchData }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { resourceId, expiration } = watchData;
    const watchExpirationTs = new Date(parseInt(expiration)).toISOString();

    // ── Save watch details to DB ──────────────────────────────────────────────
    const { error: updateErr } = await supabase
      .from('calendar_integrations')
      .update({
        watch_channel_id: channelId,
        watch_resource_id: resourceId,
        watch_expiration: watchExpirationTs,
      })
      .eq('user_id', userId)
      .eq('provider', 'google');

    if (updateErr) {
      console.error('[setup-calendar-watch] DB update error:', updateErr);
      // Non-fatal: watch is active but we couldn't save channel info
    }

    console.log(`[setup-calendar-watch] Watch set up for user ${userId}, channel ${channelId}, expires ${watchExpirationTs}`);

    return new Response(
      JSON.stringify({ success: true, channelId, resourceId, watchExpiration: watchExpirationTs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[setup-calendar-watch] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
