import React from 'react';

export default function CancelSubscriptionModal({
  open,
  loading,
  onClose,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100000,
      padding: '1rem',
    }}
    >
      <div className="card flex-col gap-4" style={{ maxWidth: '450px', width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '3px', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-primary)', fontFamily: 'Mattone, sans-serif' }}>Cancel Subscription?</h3>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
          Are you sure? Your plan will remain active until the end of your current billing period, then your data is retained for 30 days.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            className="btn"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--accent-blue)',
              color: 'var(--accent-blue)',
              borderRadius: '3px',
              padding: '0.4rem 1rem',
              cursor: 'pointer',
            }}
            disabled={loading}
          >
            Keep My Plan
          </button>
          <button
            type="button"
            className="btn"
            onClick={onConfirm}
            style={{
              background: 'transparent',
              border: '1px solid var(--status-hot)',
              color: 'var(--status-hot)',
              borderRadius: '3px',
              padding: '0.4rem 1rem',
              cursor: 'pointer',
            }}
            disabled={loading}
          >
            {loading ? 'Cancelling...' : 'Yes, Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
