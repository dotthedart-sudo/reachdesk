import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CONFIRMATION_FROM_EMAIL = 'ReachDesk CRM <invites@mail.app.reachdeskcrm.com>';

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

function formatMeetingDateTime(
  event: any,
  timeZone?: string | null,
): { meetingDate: string; meetingTime: string } {
  const tz = timeZone || event?.start?.timeZone || 'UTC';
  const start = event?.start?.dateTime || event?.start?.date;
  if (!start) {
    return { meetingDate: 'TBD', meetingTime: 'TBD' };
  }

  // All-day events are date-only (YYYY-MM-DD)
  if (!event?.start?.dateTime && event?.start?.date) {
    const d = new Date(event.start.date + 'T12:00:00');
    return {
      meetingDate: d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: tz,
      }),
      meetingTime: 'All day',
    };
  }

  const d = new Date(start);
  const meetingDate = d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: tz,
  });
  const meetingTime = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: tz,
    timeZoneName: 'short',
  });
  return { meetingDate, meetingTime };
}

function getMeetingLink(event: any): string {
  if (event?.hangoutLink) return event.hangoutLink;

  const entryPoints = event?.conferenceData?.entryPoints || [];
  const video = entryPoints.find((ep: any) => ep.entryPointType === 'video' && ep.uri);
  if (video?.uri) return video.uri;

  return event?.htmlLink || 'https://calendar.google.com';
}

function buildConfirmationHtml(params: {
  ownerName: string;
  meetingDate: string;
  meetingTime: string;
  meetingLink: string;
}): string {
  const { ownerName, meetingDate, meetingTime, meetingLink } = params;
  return `
<div style="background-color: #0D1117; color: #FFFFFF; font-family: sans-serif; padding: 30px; border-radius: 3px; max-width: 600px; margin: 0 auto; border: 1px solid #21262D;">
  <div style="text-align: center; margin-bottom: 20px;">
    <span style="font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.08em; font-size: 22px; color: #FFFFFF; font-weight: bold;">ReachDesk</span>
  </div>
  <h2 style="color: #5B8FB9; border-bottom: 1px solid #21262D; padding-bottom: 10px;">Your meeting is confirmed</h2>
  <p><strong>${ownerName}</strong> has scheduled a meeting with you.</p>
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0; color: #FFFFFF;">
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #21262D; color: #8B949E; width: 100px;">Date:</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #21262D; font-weight: bold;">${meetingDate}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #21262D; color: #8B949E;">Time:</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #21262D; font-weight: bold;">${meetingTime}</td>
    </tr>
  </table>
  <div style="text-align: center; margin: 28px 0;">
    <a href="${meetingLink}" style="background-color: #5B8FB9; color: #0D1117; padding: 12px 24px; text-decoration: none; border-radius: 3px; font-weight: bold; display: inline-block;">Join Meeting</a>
  </div>
  <p style="color: #8B949E; font-size: 0.8rem; border-top: 1px solid #21262D; padding-top: 15px; margin-top: 30px;">
    If you did not expect this, please contact ${ownerName} directly.
  </p>
</div>
`.trim();
}

async function sendMeetingConfirmation(params: {
  supabase: ReturnType<typeof createClient>;
  userId: string;
  ownerName: string;
  ownerTimeZone?: string | null;
  lead: { id: string; email: string };
  event: any;
}): Promise<boolean> {
  const { supabase, userId, ownerName, ownerTimeZone, lead, event } = params;
  const eventId = event?.id;
  const attendeeEmail = (lead.email || '').trim().toLowerCase();

  if (!eventId || !attendeeEmail) return false;

  // Dedup: skip if we already sent for this event + attendee
  const { data: existing } = await supabase
    .from('calendar_meeting_confirmations')
    .select('id')
    .eq('google_event_id', eventId)
    .eq('attendee_email', attendeeEmail)
    .maybeSingle();

  if (existing) {
    console.log(`[calendar-webhook-receiver] Confirmation already sent for event ${eventId} → ${attendeeEmail}`);
    return false;
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.warn('[calendar-webhook-receiver] RESEND_API_KEY not set — skipping confirmation email');
    return false;
  }

  const { meetingDate, meetingTime } = formatMeetingDateTime(event, ownerTimeZone);
  const meetingLink = getMeetingLink(event);
  const html = buildConfirmationHtml({ ownerName, meetingDate, meetingTime, meetingLink });

  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: CONFIRMATION_FROM_EMAIL,
      reply_to: 'support@reachdeskcrm.com',
      to: [attendeeEmail],
      subject: `Meeting confirmed with ${ownerName}`,
      html,
    }),
  });

  if (!emailResponse.ok) {
    const errText = await emailResponse.text();
    console.error(`[calendar-webhook-receiver] Resend failed for ${attendeeEmail}:`, errText);
    return false;
  }

  const { error: insertErr } = await supabase
    .from('calendar_meeting_confirmations')
    .insert({
      user_id: userId,
      google_event_id: eventId,
      attendee_email: attendeeEmail,
      lead_id: lead.id,
    });

  if (insertErr) {
    // Unique violation = concurrent duplicate; treat as already sent
    if (insertErr.code === '23505') {
      console.log(`[calendar-webhook-receiver] Confirmation race for event ${eventId} → ${attendeeEmail}`);
      return false;
    }
    console.error('[calendar-webhook-receiver] Failed to record confirmation send:', insertErr);
  }

  console.log(`[calendar-webhook-receiver] Confirmation email sent to ${attendeeEmail} for event ${eventId}`);
  return true;
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

  // Owner display name for confirmation emails
  const { data: ownerProfile } = await supabase
    .from('user_profiles')
    .select('full_name, email, timezone')
    .eq('id', userId)
    .maybeSingle();
  const ownerName = ownerProfile?.full_name || ownerProfile?.email || 'Your contact';
  const ownerTimeZone = ownerProfile?.timezone || null;

  // ── Update matched leads to Booked, create draft invoices, send confirmations
  const TERMINAL_STATUSES = ['Booked', 'Rescheduled', 'Client', 'Not Interested', 'Closed Won', 'Closed Lost'];

  for (const lead of matchingLeads) {
    // Find the calendar event matching this lead's email
    const leadEmailLower = lead.email?.toLowerCase();
    const matchingEvent = events.find((event: any) => {
      const attendees = event.attendees || [];
      const hasEmailInAttendees = attendees.some((attendee: any) => attendee.email && attendee.email.toLowerCase() === leadEmailLower);
      const hasEmailInOrganizer = event.organizer?.email && event.organizer.email.toLowerCase() === leadEmailLower;
      return hasEmailInAttendees || hasEmailInOrganizer;
    });

    // ── Send meeting confirmation to prospect (once per event) ─────────────
    if (matchingEvent && lead.email) {
      try {
        await sendMeetingConfirmation({
          supabase,
          userId,
          ownerName,
          ownerTimeZone,
          lead: { id: lead.id, email: lead.email },
          event: matchingEvent,
        });
      } catch (err) {
        console.error(`[calendar-webhook-receiver] Confirmation email error for lead ${lead.id}:`, err);
      }
    }

    // Don't overwrite already-terminal statuses
    if (TERMINAL_STATUSES.includes(lead.status || '')) {
      console.log(`[calendar-webhook-receiver] Lead ${lead.id} already has terminal status '${lead.status}' — skipping status update`);
      continue;
    }

    let meetingEndsAt: string | null = null;
    if (matchingEvent) {
      meetingEndsAt = matchingEvent.end?.dateTime || matchingEvent.end?.date || null;
    }

    // Update lead status to Booked and set the meeting's end time
    const { data: updatedLead, error: updateErr } = await supabase
      .from('leads')
      .update({
        status: 'Booked',
        last_contacted_at: new Date().toISOString().split('T')[0],
        meeting_ends_at: meetingEndsAt,
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
