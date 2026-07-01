import React from 'react';

export default function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <img src="/reachdesk-logo.svg" alt="ReachDesk CRM" height="40" style={{objectFit: 'contain'}} />
    </div>
  );
}
