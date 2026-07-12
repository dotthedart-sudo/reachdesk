import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

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
  if (!resp.ok) {
    console.error('[calendar-webhook-receiver] Token refresh failed:', await resp.text());
    return null;
  }
  return await resp.json();
}

serve(async (req) => {
  // Google sends a sync notification when a watch is first set up.
  // We respond with 200 to confirm the watch is valid.
  const resourceState = req.headers.get('X-Goog-Resource-State');
  const channelId = req.headers.get('X-Goog-Channel-ID');

  if (!channelId) {
    // Not a Google Calendar notification
    return new Response('Not a Google Calendar webhook', { status: 400 });
  }

  // Acknowledge immediately — Google requires fast response (< 3s)
  // We process asynchronously after this
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // ── Verify channel exists in our DB (security: reject unknown channels) ─────
  const { data: integration, error: intErr } = await supabase
    .from('calendar_integrations')
    .select('*')
    .eq('watch_channel_id', channelId)
    .eq('is_active', true)
    .single();

  if (intErr || !integration) {
    console.warn(`[calendar-webhook-receiver] Unknown channel ID: ${channelId} — rejecting`);
    return new Response('Unknown channel', { status: 404 });
  }

  // 'sync' is the initial handshake ping — just confirm we received it
  if (resourceState === 'sync') {
    console.log(`[calendar-webhook-receiver] Sync ping for channel ${channelId} — acknowledged`);
    return new Response('ok', { status: 200 });
  }

  const userId = integration.user_id;
  console.log(`[calendar-webhook-receiver] Change notification for user ${userId}, state: ${resourceState}`);

  // ── Get a valid access token ───────────────────────────────────────────────
  let accessToken = integration.access_token;
  const isExpired = new Date(integration.token_expires_at) <= new Date(Date.now() + 60_000);

  if (isExpired) {
    const refreshed = await refreshAccessToken(
      integration.refresh_token,
      Deno.env.get('GOOGLE_CLIENT_ID')!,
      Deno.env.get('GOOGLE_CLIENT_SECRET')!
    );

    if (!refreshed) {
      console.error(`[calendar-webhook-receiver] Failed to refresh token for user ${userId}`);
      return new Response('Token refresh failed', { status: 401 });
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

  // ── Fetch recent events (past 24h + next 7 days) ──────────────────────────
  const timeMin = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const eventsUrl = new URL(`${GOOGLE_CALENDAR_API}/calendars/primary/events`);
  eventsUrl.searchParams.set('timeMin', timeMin);
  eventsUrl.searchParams.set('timeMax', timeMax);
  eventsUrl.searchParams.set('singleEvents', 'true');
  eventsUrl.searchParams.set('orderBy', 'startTime');
  eventsUrl.searchParams.set('maxResults', '50');
  eventsUrl.searchParams.set('updatedMin', new Date(Date.now() - 10 * 60 * 1000).toISOString()); // Only events updated in last 10 min

  const eventsResp = await fetch(eventsUrl.toString(), {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!eventsResp.ok) {
    console.error(`[calendar-webhook-receiver] Failed to fetch events for user ${userId}:`, await eventsResp.text());
    return new Response('Failed to fetch events', { status: 502 });
  }

  const eventsData = await eventsResp.json();
  const events = eventsData.items || [];

  if (events.length === 0) {
    console.log(`[calendar-webhook-receiver] No recent events for user ${userId}`);
    return new Response('ok', { status: 200 });
  }

  // ── Collect all attendee emails from the fetched events ───────────────────
  const attendeeEmails: string[] = [];
  for (const event of events) {
    const attendees = event.attendees || [];
    for (const attendee of attendees) {
      if (attendee.email && !attendee.self) {
        attendeeEmails.push(attendee.email.toLowerCase());
      }
    }
    // Also check the organizer
    if (event.organizer?.email) {
      attendeeEmails.push(event.organizer.email.toLowerCase());
    }
  }

  if (attendeeEmails.length === 0) {
    console.log(`[calendar-webhook-receiver] No external attendees in recent events for user ${userId}`);
    return new Response('ok', { status: 200 });
  }

  // Deduplicate
  const uniqueEmails = [...new Set(attendeeEmails)];

  // ── Find matching leads by attendee email ─────────────────────────────────
  const { data: matchingLeads, error: leadsErr } = await supabase
    .from('leads')
    .select('id, email, first_name, last_name, status')
    .eq('user_id', userId)
    .in('email', uniqueEmails);

  if (leadsErr) {
    console.error(`[calendar-webhook-receiver] Leads query error:`, leadsErr);
    return new Response('DB error', { status: 500 });
  }

  if (!matchingLeads || matchingLeads.length === 0) {
    console.log(`[calendar-webhook-receiver] No leads matched attendee emails for user ${userId}`);
    return new Response('ok', { status: 200 });
  }

  // ── Update matched leads to Booked and create draft invoices ─────────────
  const TERMINAL_STATUSES = ['Booked', 'Rescheduled', 'Client', 'Not Interested', 'Closed Won', 'Closed Lost'];

  for (const lead of matchingLeads) {
    // Don't overwrite already-terminal statuses
    if (TERMINAL_STATUSES.includes(lead.status || '')) {
      console.log(`[calendar-webhook-receiver] Lead ${lead.id} already has terminal status '${lead.status}' — skipping`);
      continue;
    }

    // Update lead status to Booked
    const { data: updatedLead, error: updateErr } = await supabase
      .from('leads')
      .update({
        status: 'Booked',
        last_contacted_at: new Date().toISOString().split('T')[0],
      })
      .eq('id', lead.id)
      .select()
      .single();

    if (updateErr) {
      console.error(`[calendar-webhook-receiver] Failed to update lead ${lead.id}:`, updateErr);
      continue;
    }

    console.log(`[calendar-webhook-receiver] Lead ${lead.id} (${lead.email}) → Booked`);

    // ── Create draft invoice (if none exists) ─────────────────────────────
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('lead_id', lead.id)
      .eq('status', 'draft')
      .limit(1);

    if (!existingInvoice || existingInvoice.length === 0) {
      const invoiceNum = 'INV-' + Math.floor(100000 + Math.random() * 900000);
      const clientName = [updatedLead?.first_name, updatedLead?.last_name].filter(Boolean).join(' ') || lead.email;

      const { error: invoiceErr } = await supabase
        .from('invoices')
        .insert({
          user_id: userId,
          lead_id: lead.id,
          invoice_number: invoiceNum,
          client_name: clientName,
          client_email: lead.email,
          status: 'draft',
          issue_date: new Date().toISOString().split('T')[0],
          due_date: null,
          currency: 'USD',
          subtotal: 0,
          tax: 0,
          total: 0,
          items: [],
        });

      if (invoiceErr) {
        console.error(`[calendar-webhook-receiver] Failed to create draft invoice for lead ${lead.id}:`, invoiceErr);
      } else {
        console.log(`[calendar-webhook-receiver] Draft invoice created for lead ${lead.id}`);
      }
    }
  }

  return new Response('ok', { status: 200 });
});
