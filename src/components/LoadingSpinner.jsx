import React from 'react';

export default function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', gap: '1rem' }}>
      <div style={{
        border: '3px solid rgba(91, 143, 185, 0.1)',
        borderTop: '3px solid var(--accent-blue)',
        borderRadius: '50%',
        width: '36px',
        height: '36px',
        animation: 'spin 1s linear infinite'
      }} />
      <span className="hp-logo" style={{ color: 'var(--text-primary)' }}>REACHDESK</span>
    </div>
  );
}
