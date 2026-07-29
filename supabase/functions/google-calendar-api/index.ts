import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
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
  if (!resp.ok) {
    console.error('[google-calendar-api] Token refresh failed:', await resp.text());
    return null;
  }
  return await resp.json();
}

async function getValidAccessToken(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ accessToken: string; calendarId: string } | { error: string; status: number }> {
  const { data: integration, error } = await supabase
    .from('calendar_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .eq('is_active', true)
    .maybeSingle();

  if (error || !integration) {
    return { error: 'Google Calendar is not connected', status: 404 };
  }

  let accessToken = integration.access_token;
  const isExpired = new Date(integration.token_expires_at) <= new Date(Date.now() + 60_000);

  if (isExpired) {
    const refreshed = await refreshAccessToken(
      integration.refresh_token,
      Deno.env.get('GOOGLE_CLIENT_ID')!,
      Deno.env.get('GOOGLE_CLIENT_SECRET')!,
    );
    if (!refreshed) {
      return { error: 'Failed to refresh Google Calendar token. Reconnect in Settings.', status: 401 };
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

  return {
    accessToken,
    calendarId: integration.calendar_id || 'primary',
  };
}

function ensureDateTimeWithZone(
  part: { dateTime?: string; date?: string; timeZone?: string } | undefined,
  fallbackTimeZone?: string,
) {
  if (!part) return part;
  if (part.date) return part;
  if (part.dateTime && !part.timeZone && fallbackTimeZone) {
    return { ...part, timeZone: fallbackTimeZone };
  }
  return part;
}

function mapGoogleEvent(event: any) {
  const startIso = event.start?.dateTime || event.start?.date || null;
  const endIso = event.end?.dateTime || event.end?.date || null;
  const allDay = !event.start?.dateTime && !!event.start?.date;
  const hangout =
    event.hangoutLink
    || event.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri
    || null;

  return {
    id: event.id,
    summary: event.summary || '(No title)',
    description: event.description || null,
    start: startIso,
    end: endIso,
    allDay,
    timeZone: event.start?.timeZone || event.end?.timeZone || null,
    htmlLink: event.htmlLink || null,
    hangoutLink: hangout,
    status: event.status || 'confirmed',
    attendees: (event.attendees || [])
      .filter((a: any) => a.email && !a.self)
      .map((a: any) => ({
        email: a.email,
        displayName: a.displayName || null,
        responseStatus: a.responseStatus || null,
      })),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const action = (body.action || 'list') as string;

    const tokenResult = await getValidAccessToken(supabaseAdmin, user.id);
    if ('error' in tokenResult) {
      return json({ error: tokenResult.error }, tokenResult.status);
    }
    const { accessToken, calendarId } = tokenResult;

    // ── LIST ────────────────────────────────────────────────────────────────
    if (action === 'list') {
      const timeMin = body.timeMin;
      const timeMax = body.timeMax;
      if (!timeMin || !timeMax) {
        return json({ error: 'timeMin and timeMax are required' }, 400);
      }

      const eventsUrl = new URL(`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`);
      eventsUrl.searchParams.set('timeMin', timeMin);
      eventsUrl.searchParams.set('timeMax', timeMax);
      eventsUrl.searchParams.set('singleEvents', 'true');
      eventsUrl.searchParams.set('orderBy', 'startTime');
      eventsUrl.searchParams.set('maxResults', '250');

      const eventsResp = await fetch(eventsUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!eventsResp.ok) {
        const errText = await eventsResp.text();
        console.error('[google-calendar-api] list failed:', errText);
        return json({ error: 'Failed to fetch calendar events' }, 502);
      }

      const eventsData = await eventsResp.json();
      const events = (eventsData.items || [])
        .filter((e: any) => e.status !== 'cancelled')
        .map(mapGoogleEvent);

      return json({ success: true, events });
    }

    // ── CREATE ──────────────────────────────────────────────────────────────
    if (action === 'create') {
      const summary = (body.summary || '').trim();
      const description = (body.description || '').trim() || undefined;
      const fallbackTimeZone = (body.timeZone || '').trim() || undefined;
      const start = ensureDateTimeWithZone(body.start, fallbackTimeZone);
      const end = ensureDateTimeWithZone(body.end, fallbackTimeZone);
      const attendeeEmails: string[] = Array.isArray(body.attendeeEmails)
        ? body.attendeeEmails.map((e: string) => String(e).trim().toLowerCase()).filter(Boolean)
        : [];

      if (!summary) return json({ error: 'Event title is required' }, 400);
      if (!start || !end) return json({ error: 'start and end are required' }, 400);

      const eventBody: Record<string, unknown> = {
        summary,
        description,
        start,
        end,
      };

      if (attendeeEmails.length > 0) {
        eventBody.attendees = attendeeEmails.map((email) => ({ email }));
      }

      // Request Meet link when creating timed events
      if (start.dateTime) {
        eventBody.conferenceData = {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        };
      }

      const createUrl = new URL(
        `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
      );
      if (start.dateTime) {
        createUrl.searchParams.set('conferenceDataVersion', '1');
      }
      if (attendeeEmails.length > 0) {
        createUrl.searchParams.set('sendUpdates', 'all');
      }

      const createResp = await fetch(createUrl.toString(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      });

      if (!createResp.ok) {
        const errText = await createResp.text();
        console.error('[google-calendar-api] create failed:', errText);
        return json({ error: 'Failed to create Google Calendar event', details: errText }, 502);
      }

      const created = await createResp.json();
      return json({ success: true, event: mapGoogleEvent(created) });
    }

    // ── UPDATE ────────────────────────────────────────────────────────────────
    if (action === 'update') {
      const eventId = (body.eventId || '').trim();
      const summary = (body.summary || '').trim();
      const description = (body.description || '').trim() || undefined;
      const fallbackTimeZone = (body.timeZone || '').trim() || undefined;
      const start = ensureDateTimeWithZone(body.start, fallbackTimeZone);
      const end = ensureDateTimeWithZone(body.end, fallbackTimeZone);
      const attendeeEmails: string[] = Array.isArray(body.attendeeEmails)
        ? body.attendeeEmails.map((e: string) => String(e).trim().toLowerCase()).filter(Boolean)
        : [];

      if (!eventId) return json({ error: 'eventId is required' }, 400);
      if (!summary) return json({ error: 'Event title is required' }, 400);
      if (!start || !end) return json({ error: 'start and end are required' }, 400);

      const eventBody: Record<string, unknown> = {
        summary,
        description,
        start,
        end,
      };

      if (attendeeEmails.length > 0) {
        eventBody.attendees = attendeeEmails.map((email) => ({ email }));
      }

      const updateUrl = new URL(
        `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      );
      if (attendeeEmails.length > 0) {
        updateUrl.searchParams.set('sendUpdates', 'all');
      }

      const updateResp = await fetch(updateUrl.toString(), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      });

      if (!updateResp.ok) {
        const errText = await updateResp.text();
        console.error('[google-calendar-api] update failed:', errText);
        return json({ error: 'Failed to update Google Calendar event', details: errText }, 502);
      }

      const updated = await updateResp.json();
      return json({ success: true, event: mapGoogleEvent(updated) });
    }

    // ── DELETE ──────────────────────────────────────────────────────────────
    if (action === 'delete') {
      const eventId = (body.eventId || '').trim();
      if (!eventId) return json({ error: 'eventId is required' }, 400);

      const deleteUrl = new URL(
        `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      );
      deleteUrl.searchParams.set('sendUpdates', 'all');

      const deleteResp = await fetch(deleteUrl.toString(), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!deleteResp.ok && deleteResp.status !== 204) {
        const errText = await deleteResp.text();
        console.error('[google-calendar-api] delete failed:', errText);
        return json({ error: 'Failed to delete Google Calendar event', details: errText }, 502);
      }

      return json({ success: true });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error('[google-calendar-api] Unexpected error:', err);
    return json({ error: String(err) }, 500);
  }
});
