import React from 'react';

export default function LoadingSpinner() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg-page)',
        color: 'var(--text-primary)',
        gap: '1rem',
      }}
    >
      <div
        style={{
          border: '3px solid color-mix(in srgb, var(--text-primary) 12%, transparent)',
          borderTop: '3px solid var(--text-primary)',
          borderRadius: '50%',
          width: '36px',
          height: '36px',
          animation: 'spin 1s linear infinite',
        }}
      />
      <span
        className="loading-text hp-logo"
        style={{
          color: 'var(--text-primary)',
          fontFamily: "'Mattone', sans-serif",
        }}
      >
        REACHDESK CRM
      </span>
    </div>
  );
}
