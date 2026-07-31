/** Timezone-aware date/time helpers for Calendar and profile settings. */

export function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Profile timezone when set, otherwise browser. */
export function resolveTimeZone(profileTimezone) {
  const tz = (profileTimezone || '').trim();
  return tz || getBrowserTimeZone();
}

/** User's effective IANA zone: device when profile timezone is Auto (null/empty), else manual override. */
export function getEffectiveUserTimeZone(profile) {
  return resolveTimeZone(profile?.timezone);
}

export function pad2(n) {
  return String(n).padStart(2, '0');
}

/** YYYY-MM-DD for an instant in the given IANA timezone. */
export function toDateKeyInZone(value, timeZone) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const tz = resolveTimeZone(timeZone);
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    if (y && m && day) return `${y}-${m}-${day}`;
  } catch {
    // fall through
  }
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayDateKeyInZone(timeZone) {
  return toDateKeyInZone(new Date(), timeZone);
}

/** Map ISO or date-only string to calendar day in timezone. */
export function parseEventDayKeyInZone(iso, timeZone) {
  if (!iso) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return toDateKeyInZone(iso, timeZone);
}

export function formatLocalTime(iso, options = {}) {
  const { timeZone, showZone = false, allDay = false } = options;
  if (!iso || allDay) return 'All day';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const tz = resolveTimeZone(timeZone);
  try {
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: tz,
      ...(showZone ? { timeZoneName: 'short' } : {}),
    });
  } catch {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
}

/** Human label e.g. "Eastern Daylight Time" for UI hints. */
export function formatTimeZoneLabel(timeZone) {
  const tz = resolveTimeZone(timeZone);
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'long',
    }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value || tz;
  } catch {
    return tz;
  }
}

/** Short hint for Calendar header, e.g. "Times shown in Eastern Daylight Time (EDT)". */
export function formatTimeZoneHint(timeZone) {
  const tz = resolveTimeZone(timeZone);
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'long',
    }).formatToParts(new Date());
    const long = parts.find((p) => p.type === 'timeZoneName')?.value || tz;
    const shortParts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    }).formatToParts(new Date());
    const short = shortParts.find((p) => p.type === 'timeZoneName')?.value;
    return short && short !== long ? `Times shown in ${long} (${short})` : `Times shown in ${long}`;
  } catch {
    return `Times shown in ${tz}`;
  }
}

/** Google Calendar API start/end with explicit wall time + IANA zone. */
export function googleDateTimePayload(dateKey, timeStr, timeZone) {
  return {
    dateTime: `${dateKey}T${timeStr}:00`,
    timeZone: resolveTimeZone(timeZone),
  };
}

/** Parse ISO to HH:mm in the given timezone (for edit modal). */
export function isoToLocalTimeInZone(iso, timeZone) {
  if (!iso || /^\d{4}-\d{2}-\d{2}$/.test(iso)) return '10:00';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '10:00';
  const tz = resolveTimeZone(timeZone);
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);
    const h = parts.find((p) => p.type === 'hour')?.value || '10';
    const m = parts.find((p) => p.type === 'minute')?.value || '00';
    return `${h}:${m}`;
  } catch {
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }
}

export function addMinutesToTimeStr(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${pad2(Math.floor(total / 60) % 24)}:${pad2(total % 60)}`;
}

/**
 * Capture "now" for action logging in a resolved timezone (profile override or device).
 * Returns UTC instant plus local date/time snapshot for display & calendar bucketing.
 */
export function captureDeviceTimestamp(timeZone) {
  const now = new Date();
  const tz = resolveTimeZone(timeZone);
  const localDate = toDateKeyInZone(now, tz);
  let localTime = '00:00:00';
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const h = parts.find((p) => p.type === 'hour')?.value || '00';
    const m = parts.find((p) => p.type === 'minute')?.value || '00';
    const s = parts.find((p) => p.type === 'second')?.value || '00';
    localTime = `${h}:${m}:${s}`;
  } catch {
    localTime = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
  }
  return {
    occurredAt: now.toISOString(),
    localDate,
    localTime,
    timeZone: tz,
  };
}

/** Format a timeline event or ISO instant as "Jul 31, 2026 · 2:45 PM EDT". */
export function formatActivityDateTime(eventOrIso, options = {}) {
  const { showZone = true, timeZone: overrideTz } = options;
  let iso = null;
  let tz = overrideTz;

  if (typeof eventOrIso === 'string') {
    iso = eventOrIso;
  } else if (eventOrIso && typeof eventOrIso === 'object') {
    iso = eventOrIso.occurred_at || eventOrIso.created_at || eventOrIso.last_contacted_at || eventOrIso.last_called_at;
    tz = tz || eventOrIso.logged_timezone;
    if (!iso && eventOrIso.local_date) {
      const t = (eventOrIso.local_time || '00:00:00').toString().slice(0, 5);
      return `${formatDateLabel(eventOrIso.local_date)} · ${formatTimeLabelFromHHMM(t)}${showZone && eventOrIso.logged_timezone ? ` ${shortZoneName(eventOrIso.logged_timezone)}` : ''}`.trim();
    }
  }

  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const resolved = resolveTimeZone(tz);
  try {
    const datePart = d.toLocaleDateString('en-US', {
      timeZone: resolved,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timePart = d.toLocaleTimeString('en-US', {
      timeZone: resolved,
      hour: 'numeric',
      minute: '2-digit',
    });
    const zone = showZone ? shortZoneName(resolved, d) : '';
    return zone ? `${datePart} · ${timePart} ${zone}` : `${datePart} · ${timePart}`;
  } catch {
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
}

function formatDateLabel(dateKey) {
  if (!dateKey) return '';
  const d = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimeLabelFromHHMM(hhmm) {
  const [hStr, mStr] = (hhmm || '00:00').split(':');
  let h = Number(hStr);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

function shortZoneName(timeZone, at = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: resolveTimeZone(timeZone),
      timeZoneName: 'short',
    }).formatToParts(at instanceof Date ? at : new Date(at));
    return parts.find((p) => p.type === 'timeZoneName')?.value || '';
  } catch {
    return '';
  }
}

/** Calendar day key for a timeline event (prefer stored local_date). */
export function getActivityDayKey(event, fallbackTimeZone) {
  if (!event) return null;
  if (event.local_date) return event.local_date;
  const iso = event.occurred_at || event.created_at;
  if (!iso) return null;
  return toDateKeyInZone(iso, event.logged_timezone || fallbackTimeZone);
}

/** Convert ISO → value for <input type="datetime-local"> in a timezone. */
export function isoToDatetimeLocalValue(iso, timeZone) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const tz = resolveTimeZone(timeZone);
  const dateKey = toDateKeyInZone(d, tz);
  const time = isoToLocalTimeInZone(iso, tz);
  return dateKey ? `${dateKey}T${time}` : '';
}

/**
 * Parse datetime-local value (YYYY-MM-DDTHH:mm) as wall time in timezone → UTC ISO.
 * Approximate via iterative offset (sufficient for CRM timestamps).
 */
export function datetimeLocalValueToIso(localValue, timeZone) {
  if (!localValue) return null;
  const match = localValue.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (!match) return null;
  const [, dateKey, timeStr] = match;
  const tz = resolveTimeZone(timeZone);
  // Treat as if UTC first, then adjust by zone offset at that instant
  let guess = new Date(`${dateKey}T${timeStr}:00Z`);
  if (Number.isNaN(guess.getTime())) return null;
  for (let i = 0; i < 3; i += 1) {
    const asInZone = isoToDatetimeLocalValue(guess.toISOString(), tz);
    if (!asInZone) break;
    const [gDate, gTime] = asInZone.split('T');
    const wantMs = Date.parse(`${dateKey}T${timeStr}:00Z`);
    const gotMs = Date.parse(`${gDate}T${gTime}:00Z`);
    const delta = wantMs - gotMs;
    if (delta === 0) break;
    guess = new Date(guess.getTime() + delta);
  }
  return guess.toISOString();
}

/** Sorted IANA zones for Settings dropdown. */
export function getSupportedTimeZones() {
  try {
    if (typeof Intl.supportedValuesOf === 'function') {
      return Intl.supportedValuesOf('timeZone').slice().sort();
    }
  } catch {
    // ignore
  }
  return [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Toronto',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Sydney',
    'Pacific/Auckland',
    'UTC',
  ];
}
