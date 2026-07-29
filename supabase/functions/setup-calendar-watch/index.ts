import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders,
  createServiceClient,
  jsonResponse,
  requirePrivileged,
} from '../_shared/auth.ts';

const WEBHOOK_RECEIVER_URL =
  'https://efxgwqfdstrhrnnvtynl.supabase.co/functions/v1/calendar-webhook-receiver';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

async function refreshAccessToken(
  refreshToken: string,
): Promise<{ access_token: string; expires_in: number } | null> {
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
  const authError = requirePrivileged(req);
  if (authError) return authError;

  try {
    const supabase = createServiceClient();
    const { userId } = await req.json();

    if (!userId) {
      return jsonResponse({ error: 'Missing userId' }, 400);
    }

    const { data: integration, error: fetchErr } = await supabase
      .from('calendar_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .single();

    if (fetchErr || !integration) {
      return jsonResponse(
        { error: 'No Google Calendar integration found for this user' },
        404,
      );
    }

    let accessToken = integration.access_token;
    const isExpired = new Date(integration.token_expires_at) <= new Date(Date.now() + 60_000);

    if (isExpired) {
      const refreshed = await refreshAccessToken(integration.refresh_token);
      if (!refreshed) {
        return jsonResponse({ error: 'Failed to refresh Google access token' }, 401);
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

    const channelId = crypto.randomUUID();

    const watchResponse = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/primary/events/watch`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: channelId,
          type: 'web_hook',
          address: WEBHOOK_RECEIVER_URL,
          token: userId,
          params: { ttl: '604800' },
        }),
      },
    );

    const watchData = await watchResponse.json();

    if (!watchResponse.ok) {
      console.error('[setup-calendar-watch] Google watch setup failed:', watchData);
      return jsonResponse(
        { error: watchData.error?.message || 'Watch setup failed', details: watchData },
        502,
      );
    }

    const { resourceId, expiration } = watchData;
    const watchExpirationTs = new Date(parseInt(expiration)).toISOString();

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
    }

    console.log(
      `[setup-calendar-watch] Watch set up for user ${userId}, channel ${channelId}, expires ${watchExpirationTs}`,
    );

    return jsonResponse({
      success: true,
      channelId,
      resourceId,
      watchExpiration: watchExpirationTs,
    });
  } catch (err) {
    console.error('[setup-calendar-watch] Unexpected error:', err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
