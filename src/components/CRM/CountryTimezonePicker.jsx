import React, { useMemo, useState } from 'react';
import { COUNTRY_TIMEZONE_OPTIONS, getCountryLabelForTimezone } from '../../lib/leadTimezone';
import { getSupportedTimeZones } from '../../lib/dateTime';

/**
 * Searchable country / dial-code picker that sets an IANA timezone.
 * Also offers full IANA list under Advanced.
 */
export default function CountryTimezonePicker({
  value = '',
  onChange,
  id = 'lead-timezone-country',
}) {
  const [query, setQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const zones = getSupportedTimeZones();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRY_TIMEZONE_OPTIONS;
    return COUNTRY_TIMEZONE_OPTIONS.filter((c) => (
      c.name.toLowerCase().includes(q)
      || c.dial.includes(q.replace(/^\+/, ''))
      || `+${c.dial}`.includes(q)
      || c.timezone.toLowerCase().includes(q)
    ));
  }, [query]);

  const countryHint = value ? getCountryLabelForTimezone(value) : null;

  return (
    <div className="flex-col gap-2">
      <label className="form-label" htmlFor={`${id}-search`}>Country / dial code</label>
      <input
        id={`${id}-search`}
        type="search"
        className="form-input"
        placeholder="Search Pakistan, +92, United States…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />
      <select
        id={id}
        className="form-input"
        value={
          COUNTRY_TIMEZONE_OPTIONS.some((c) => c.timezone === value)
            ? value
            : ''
        }
        onChange={(e) => {
          const tz = e.target.value;
          onChange?.({ timezone: tz, timezone_source: tz ? 'country' : '', timezoneTouched: !!tz });
          if (tz) {
            const match = COUNTRY_TIMEZONE_OPTIONS.find((c) => c.timezone === tz);
            if (match) setQuery(`${match.name} (+${match.dial})`);
          }
        }}
        size={Math.min(8, Math.max(4, filtered.length))}
        style={{ height: 'auto' }}
      >
        <option value="">Select country…</option>
        {filtered.map((c) => (
          <option key={`${c.dial}-${c.timezone}-${c.name}`} value={c.timezone}>
            {c.name} (+{c.dial}) · {c.timezone.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
      {value && (
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Timezone: {value.replace(/_/g, ' ')}
          {countryHint ? ` · ${countryHint}` : ''}
        </p>
      )}
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => setShowAdvanced((v) => !v)}
        style={{ alignSelf: 'flex-start' }}
      >
        {showAdvanced ? 'Hide advanced zones' : 'Advanced: all timezones'}
      </button>
      {showAdvanced && (
        <select
          className="form-input"
          value={value || ''}
          onChange={(e) => {
            const tz = e.target.value;
            onChange?.({ timezone: tz, timezone_source: tz ? 'manual' : '', timezoneTouched: !!tz });
          }}
        >
          <option value="">Select IANA timezone…</option>
          {zones.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      )}
    </div>
  );
}
