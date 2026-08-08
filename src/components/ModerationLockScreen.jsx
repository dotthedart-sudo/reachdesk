import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { GENERIC_ACCOUNT_LOCK_MESSAGE } from '../lib/accountLock';

/**
 * Full-page block for admin moderation locks (lock_reason set).
 * No dismiss — sign out only.
 */
export default function ModerationLockScreen({ lockReason, handleLogout }) {
  const message = (lockReason && String(lockReason).trim()) || GENERIC_ACCOUNT_LOCK_MESSAGE;

  return (
    <div
      className="paywall-overlay"
      style={{
        backgroundColor: 'var(--bg-page)',
        backgroundImage: 'none',
        fontFamily: 'Mattone, sans-serif',
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
      }}
    >
      <div
        className="paywall-card"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '3px',
          boxShadow: 'none',
          animation: 'none',
          maxWidth: '480px',
        }}
      >
        <div
          className="paywall-icon"
          style={{ background: 'var(--accent-blue)', boxShadow: 'none' }}
        >
          <ShieldAlert size={36} />
        </div>
        <h1 className="paywall-title" style={{ fontFamily: 'Mattone, sans-serif' }}>
          Access Denied
        </h1>
        <p className="paywall-text" style={{ whiteSpace: 'pre-wrap' }}>
          {message}
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="btn btn-secondary w-full"
          style={{ marginTop: '1rem', justifyContent: 'center', borderRadius: '3px' }}
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
