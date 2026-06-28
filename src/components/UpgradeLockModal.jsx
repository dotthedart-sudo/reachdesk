import React, { useState } from 'react';
import UpgradeRequestForm from './UpgradeRequestForm';
import { ShieldAlert, BookOpen, Users, Receipt, FileText } from 'lucide-react';

export default function UpgradeLockModal({ profile, handleLogout, theme }) {
  const [selectedPlan, setSelectedPlan] = useState(null); // 'starter', 'pro', or 'teams'
  const isTrial = profile?.plan === 'trial';

  // Feature bullets for each plan
  const planFeatures = {
    starter: [
      'Up to 100 leads database limit',
      'Basic Client Invoice Generator',
      'Unified Message Templates'
    ],
    pro: [
      'Unlimited leads database',
      'Revenue tracker insights',
      'Personal Notes & Drawing boards'
    ],
    teams: [
      'Up to 3 team workspace members',
      'Shared templates & leads pipeline',
      'Advanced permissions configuration'
    ]
  };

  const planPrices = {
    starter: 'Rs 450/mo',
    pro: 'Rs 950/mo',
    teams: 'Rs 1950/mo'
  };

  // Inline styles that handle dark/light theme transition and backdrop filter
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
    border: theme === 'light' ? '1px solid var(--border-color)' : '2px solid var(--primary-purple)',
    borderRadius: '16px',
    boxShadow: theme === 'light' ? 'var(--glow-shadow)' : '0 0 35px rgba(139, 92, 246, 0.35)',
    width: '100%',
    maxWidth: selectedPlan ? '500px' : '850px',
    padding: '2.5rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
    maxHeight: '90vh',
    overflowY: 'auto',
    position: 'relative'
  };

  return (
    <div style={overlayStyle} onClick={(e) => e.stopPropagation()}>
      <div style={modalStyle}>
        {!selectedPlan ? (
          <>
            {/* Header */}
            <div style={{ textAlign: 'center', maxWidth: '600px' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'var(--gradient-brand)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  margin: '0 auto 1rem auto',
                  boxShadow: '0 0 15px rgba(217, 70, 239, 0.4)'
                }}
              >
                <ShieldAlert size={28} />
              </div>
              <h2 style={{ fontSize: '1.85rem', marginBottom: '0.5rem', background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {isTrial ? 'Upgrade to Continue' : 'Renew to Continue'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                {isTrial
                  ? 'Your free trial has ended. Choose a plan to keep using ReachDesk.'
                  : 'Your subscription has expired. Choose a plan to continue using ReachDesk.'}
              </p>
            </div>

            {/* Plan Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1.25rem',
                width: '100%',
                marginTop: '0.5rem'
              }}
            >
              {/* STARTER */}
              <div
                className="card flex-col"
                style={{
                  padding: '1.5rem',
                  gap: '0.75rem',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  justifyContent: 'space-between'
                }}
              >
                <div className="flex-col gap-2">
                  <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Starter</h4>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-purple)' }}>
                    {planPrices.starter}
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: 0 }}>
                    {planFeatures.starter.map((f, i) => (
                      <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
                        <span style={{ color: 'var(--primary-purple)' }}>•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => setSelectedPlan('starter')}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', marginTop: '1rem' }}
                >
                  Select This Plan
                </button>
              </div>

              {/* PRO */}
              <div
                className="card flex-col"
                style={{
                  padding: '1.5rem',
                  gap: '0.75rem',
                  border: '2px solid var(--primary-purple)',
                  background: 'rgba(139, 92, 246, 0.03)',
                  boxShadow: 'var(--glow-shadow)',
                  justifyContent: 'space-between',
                  position: 'relative'
                }}
              >
                <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--gradient-brand)', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                  POPULAR
                </div>
                <div className="flex-col gap-2">
                  <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Pro</h4>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-purple)' }}>
                    {planPrices.pro}
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: 0 }}>
                    {planFeatures.pro.map((f, i) => (
                      <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
                        <span style={{ color: 'var(--primary-purple)' }}>•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => setSelectedPlan('pro')}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', marginTop: '1rem' }}
                >
                  Select This Plan
                </button>
              </div>

              {/* TEAMS */}
              <div
                className="card flex-col"
                style={{
                  padding: '1.5rem',
                  gap: '0.75rem',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  justifyContent: 'space-between'
                }}
              >
                <div className="flex-col gap-2">
                  <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Teams</h4>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-purple)' }}>
                    {planPrices.teams}
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: 0 }}>
                    {planFeatures.teams.map((f, i) => (
                      <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
                        <span style={{ color: 'var(--primary-purple)' }}>•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => setSelectedPlan('teams')}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', marginTop: '1rem' }}
                >
                  Select This Plan
                </button>
              </div>
            </div>

            {/* Logout Link */}
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
          </>
        ) : (
          <>
            <div style={{ width: '100%', textAlign: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)' }}>Upgrade Request Form</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                Complete your payment details to request plan activation.
              </p>
            </div>
            <UpgradeRequestForm
              profile={profile}
              isModal={true}
              initialPlan={selectedPlan}
              onCancel={() => setSelectedPlan(null)}
            />
          </>
        )}
      </div>
    </div>
  );
}
