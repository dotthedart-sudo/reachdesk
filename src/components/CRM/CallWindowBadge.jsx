import React from 'react';
import { getCallWindowBadgeStyle, getCallWindowStatus, getLeadLocalTime } from '../../lib/leadTimezone';

export default function CallWindowBadge({
  lead,
  defaultCountryCode = '+92',
  showLocalTime = false,
  at = new Date(),
}) {
  const { status, label } = getCallWindowStatus(lead, at, { defaultCountryCode });
  const style = getCallWindowBadgeStyle(status);
  const localTime = showLocalTime ? getLeadLocalTime(lead, at, defaultCountryCode) : null;

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
      <span
        className="badge"
        style={{
          background: style.bg,
          color: style.color,
          border: 'none',
          fontSize: '0.65rem',
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      {localTime && (
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Their time: {localTime}
        </span>
      )}
    </span>
  );
}
