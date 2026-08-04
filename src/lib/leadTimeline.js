import { supabase } from './supabase';
import {
  captureDeviceTimestamp,
  isoToLocalTimeInZone,
  resolveTimeZone,
  toDateKeyInZone,
} from './dateTime';

/**
 * Persist a lead activity event with device/profile-local date+time snapshot.
 */
export async function logLeadTimelineEvent({
  leadId,
  userId,
  teamId = null,
  eventType,
  summary,
  detail = {},
  timeZone = null,
  occurredAt = null,
}) {
  if (!leadId || !userId || !eventType) return null;

  const stamp = captureDeviceTimestamp(timeZone);
  if (occurredAt) {
    const d = new Date(occurredAt);
    if (!Number.isNaN(d.getTime())) {
      const tz = resolveTimeZone(timeZone);
      stamp.occurredAt = d.toISOString();
      stamp.timeZone = tz;
      stamp.localDate = toDateKeyInZone(d, tz);
      stamp.localTime = `${isoToLocalTimeInZone(d.toISOString(), tz)}:00`;
    }
  }

  const payload = {
    lead_id: leadId,
    user_id: userId,
    event_type: eventType,
    summary: summary || eventType,
    detail: detail || {},
    occurred_at: stamp.occurredAt,
    local_date: stamp.localDate,
    local_time: stamp.localTime,
    logged_timezone: stamp.timeZone,
  };
  if (teamId) payload.team_id = teamId;

  const { data, error } = await supabase
    .from('lead_timeline_events')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.warn('[leadTimeline] insert failed:', error.message);
    return null;
  }
  return data;
}

/** Update when a timeline event occurred (backfill / correct). */
export async function updateTimelineEventOccurredAt(eventId, occurredAt, timeZone = null) {
  if (!eventId || !occurredAt) return null;
  const d = new Date(occurredAt);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date');
  const tz = resolveTimeZone(timeZone);
  const payload = {
    occurred_at: d.toISOString(),
    logged_timezone: tz,
    local_date: toDateKeyInZone(d, tz),
    local_time: `${isoToLocalTimeInZone(d.toISOString(), tz)}:00`,
  };
  const { data, error } = await supabase
    .from('lead_timeline_events')
    .update(payload)
    .eq('id', eventId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function fetchLeadTimeline(leadId, limit = 200) {
  if (!leadId) return [];
  const { data, error } = await supabase.rpc('get_lead_timeline', {
    p_lead_id: leadId,
    p_limit: limit,
  });
  if (error) {
    const { data: rows, error: e2 } = await supabase
      .from('lead_timeline_events')
      .select('*')
      .eq('lead_id', leadId)
      .order('occurred_at', { ascending: false })
      .limit(limit);
    if (e2) throw e2;
    return rows || [];
  }
  return data || [];
}

/** Fetch timeline for a single calendar day or date range (YYYY-MM-DD). */
export async function fetchTeamTimelineForDay({
  date = null,
  fromDate = null,
  toDate = null,
  memberId = null,
  limit = 500,
} = {}) {
  const { data, error } = await supabase.rpc('get_team_timeline_for_day', {
    p_date: date || null,
    p_from: fromDate || null,
    p_to: toDate || null,
    p_limit: limit,
    p_member_id: memberId || null,
  });
  if (error) {
    console.warn('[leadTimeline] get_team_timeline_for_day failed:', error.message);
    let q = supabase
      .from('lead_timeline_events')
      .select('*')
      .order('occurred_at', { ascending: false })
      .limit(limit);
    if (date) q = q.eq('local_date', date);
    else if (fromDate && toDate) q = q.gte('local_date', fromDate).lte('local_date', toDate);
    const { data: rows, error: e2 } = await q;
    if (e2) throw e2;
    return rows || [];
  }
  return data || [];
}

export function actorDisplayName(event) {
  if (!event) return 'Someone';
  if (event.actor_full_name) return event.actor_full_name;
  if (event.actor_email) return event.actor_email;
  return 'Teammate';
}

export function leadDisplayFromTimeline(event) {
  if (!event) return 'Lead';
  const name = [event.lead_first_name, event.lead_last_name].filter(Boolean).join(' ').trim();
  return name || event.lead_company || 'Lead';
}
