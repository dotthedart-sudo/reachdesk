import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export default function UpgradeLockModal({ profile, handleLogout, theme }) {
  const navigate = useNavigate();
  const isTrial = profile?.plan === 'trial';

  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    backdropFilter: 'blur(6px)',
    backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
    overflowY: 'auto'
  };

  const modalStyle = {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--accent-blue)',
    borderRadius: '3px',
    width: '100%',
    maxWidth: '420px',
    padding: '2.5rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
    textAlign: 'center',
    position: 'relative'
  };

  return (
    <div style={overlayStyle} onClick={(e) => e.stopPropagation()}>
      <div style={modalStyle}>
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(224, 82, 82, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--danger-color)',
            margin: '0 auto'
          }}
        >
          <ShieldAlert size={28} />
        </div>
        <h2 style={{
          fontFamily: "'Mattone', sans-serif",
          fontSize: '1.85rem',
          marginBottom: '0.25rem',
          color: 'var(--text-primary)',
          fontWeight: 'normal'
        }}>
          {isTrial ? 'Trial Expired' : 'Subscription Expired'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          {isTrial
            ? 'Your free trial has ended. Upgrade your plan to continue accessing your ReachDesk workspace.'
            : 'Your subscription has expired. Renew your plan to unlock client data.'}
        </p>

        <button
          onClick={() => {
            navigate('/upgrade');
          }}
          className="btn btn-primary"
          style={{
            width: '100%',
            backgroundColor: 'var(--accent-blue)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '3px',
            padding: '0.75rem',
            fontWeight: 'bold',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            cursor: 'pointer',
            justifyContent: 'center'
          }}
        >
          Upgrade Plan
        </button>

        <button
          onClick={handleLogout}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--danger-color)',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginTop: '0.5rem'
          }}
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
