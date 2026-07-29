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
