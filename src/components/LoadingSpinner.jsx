import React from 'react';

export default function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="spinner" style={{ width: '50px', height: '50px', border: '5px solid var(--border-color)', borderTop: '5px solid var(--primary-purple)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading ReachDesk...</p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
