import React, { useState } from 'react';

/** Compact one-click call outcome buttons for queue rows and calling session. */
export const QUICK_LOG_OUTCOMES = [
  { label: 'Answered', outcome: 'Answered' },
  { label: 'Voicemail', outcome: 'Voicemail Left' },
  { label: 'No answer', outcome: 'No Answer' },
  { label: 'Not interested', outcome: 'Not Interested' },
];

export default function QuickLogChips({ onLog, onMore, disabled = false, compact = false }) {
  const [logging, setLogging] = useState(null);

  const handleClick = async (outcome) => {
    if (disabled || logging) return;
    setLogging(outcome);
    try {
      await onLog?.(outcome);
    } finally {
      setLogging(null);
    }
  };

  return (
    <div
      className="quick-log-chips"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: compact ? '0.25rem' : '0.35rem',
        alignItems: 'center',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {QUICK_LOG_OUTCOMES.map(({ label, outcome }) => (
        <button
          key={outcome}
          type="button"
          className="btn btn-sm btn-secondary quick-log-chip"
          disabled={disabled || !!logging}
          style={{
            fontSize: compact ? '0.68rem' : '0.72rem',
            padding: compact ? '0.15rem 0.4rem' : '0.2rem 0.5rem',
            lineHeight: 1.2,
            opacity: logging && logging !== outcome ? 0.5 : 1,
          }}
          onClick={() => handleClick(outcome)}
          title={`Log: ${outcome}`}
        >
          {logging === outcome ? '…' : label}
        </button>
      ))}
      {onMore && (
        <button
          type="button"
          className="btn btn-sm btn-secondary quick-log-chip"
          disabled={disabled || !!logging}
          style={{ fontSize: compact ? '0.68rem' : '0.72rem', padding: compact ? '0.15rem 0.4rem' : '0.2rem 0.5rem' }}
          onClick={(e) => {
            e.stopPropagation();
            onMore();
          }}
        >
          More…
        </button>
      )}
    </div>
  );
}
