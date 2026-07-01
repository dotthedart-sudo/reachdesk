import React, { useState, useEffect } from 'react';
import { Lock, ShieldAlert, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

// ─── Unified Pricing Data ──────────────────────────────────────────────────
export const BILLING = {
  monthly: {
    label: 'Monthly',
    badge: null,
    months: 1,
    starter: {
      priceId: 'pri_01kw4zrvsjch1j1hm9vqndq7r2',
      usdPerMonth: '0.95',
      usdTotal: '0.95',
      pkrPerMonth: 275,
      pkrTotal: 275
    },
    pro: {
      priceId: 'pri_01kw4zwwpdem0gmmxq0jgjvge2',
      usdPerMonth: '3.40',
      usdTotal: '3.40',
      pkrPerMonth: 935,
      pkrTotal: 935
    },
    teams: {
      priceId: 'pri_01kw51emf2ehn0s9fmypr7vet1',
      usdPerMonth: '7.00',
      usdTotal: '7.00',
      pkrPerMonth: 1925,
      pkrTotal: 1925
    }
  },
  quarterly: {
    label: 'Quarterly',
    badge: 'Save 10%',
    months: 3,
    starter: {
      priceId: 'pri_01kwen9hya3s4ff5a345x3fan5',
      usdPerMonth: '0.90',
      usdTotal: '2.70',
      pkrPerMonth: 248,
      pkrTotal: 744
    },
    pro: {
      priceId: 'PENDING_PRO_QUARTERLY',
      usdPerMonth: '3.06',
      usdTotal: '9.18',
      pkrPerMonth: 842,
      pkrTotal: 2526
    },
    teams: {
      priceId: 'PENDING_TEAMS_QUARTERLY',
      usdPerMonth: '6.30',
      usdTotal: '18.90',
      pkrPerMonth: 1733,
      pkrTotal: 5199
    }
  },
  sixMonth: {
    label: '6-Month',
    badge: 'Save 15%',
    months: 6,
    starter: {
      priceId: 'pri_01kwenc72ad2fnfjks4qxcv8gt',
      usdPerMonth: '0.85',
      usdTotal: '5.10',
      pkrPerMonth: 234,
      pkrTotal: 1404
    },
    pro: {
      priceId: 'PENDING_PRO_6MONTH',
      usdPerMonth: '2.89',
      usdTotal: '17.34',
      pkrPerMonth: 795,
      pkrTotal: 4770
    },
    teams: {
      priceId: 'PENDING_TEAMS_6MONTH',
      usdPerMonth: '5.95',
      usdTotal: '35.70',
      pkrPerMonth: 1636,
      pkrTotal: 9816
    }
  },
  yearly: {
    label: 'Yearly',
    badge: 'Best Value',
    months: 12,
    starter: {
      priceId: 'pri_01kwenh9cqccsbym0m1w6tg3gs',
      usdPerMonth: '0.80',
      usdTotal: '9.60',
      pkrPerMonth: 220,
      pkrTotal: 2640
    },
    pro: {
      priceId: 'PENDING_PRO_YEARLY',
      usdPerMonth: '2.72',
      usdTotal: '32.64',
      pkrPerMonth: 748,
      pkrTotal: 8976
    },
    teams: {
      priceId: 'PENDING_TEAMS_YEARLY',
      usdPerMonth: '5.60',
      usdTotal: '67.20',
      pkrPerMonth: 1540,
      pkrTotal: 18480
    }
  }
};

const CORE_FEATURES = [
  'Notes',
  'Bulk Import',
  'Copy Analytics',
  'Convert to Client',
  'Smart Folders',
  'Export CSV',
  'Custom Columns',
];

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: '600 leads · 1 user · 20 templates',
    features: CORE_FEATURES,
    comingSoon: false,
    isEnterprise: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: '2,500 leads · 1 user · Unlimited templates',
    features: [
      ...CORE_FEATURES,
      { label: 'AI CRM Commands', badge: 'Coming Soon' },
      { label: 'MCP / Claude Connect', badge: 'Coming Soon' },
    ],
    comingSoon: false,
    isEnterprise: false,
    highlighted: false, // Ensure Pro is not highlighted
  },
  {
    id: 'teams',
    name: 'Teams',
    tagline: '10,000 leads · 3 users',
    features: [
      ...CORE_FEATURES,
      { label: 'AI CRM Commands', badge: 'Coming Soon' },
      { label: 'MCP / Claude Connect', badge: 'Coming Soon' },
      'Team Collaboration',
    ],
    comingSoon: true, // Remains coming soon / greyed out
    isEnterprise: false,
  },
];

// ─── Shared Screens ──────────────────────────────────────────────────────────
export function PendingScreen({ profile, handleLogout }) {
  return (
    <div className="paywall-overlay" style={{ backgroundColor: '#0D1117', backgroundImage: 'none', fontFamily: 'Mattone, sans-serif' }}>
      <div className="paywall-card" style={{ backgroundColor: '#161B22', border: '1px solid #21262D', borderRadius: '3px', boxShadow: 'none', animation: 'none' }}>
        <div className="paywall-icon" style={{ background: '#5B8FB9', boxShadow: 'none' }}><Lock size={36} /></div>
        <h1 className="paywall-title" style={{ fontFamily: 'Mattone, sans-serif' }}>Activation Pending</h1>
        <p className="paywall-text">
          Your upgrade request for <strong>{profile?.requested_plan?.toUpperCase()}</strong> is pending
          administrator verification. Your data is fully safe.
        </p>
        <button onClick={handleLogout} className="btn btn-secondary w-full" style={{ marginTop: '1rem', justifyContent: 'center', borderRadius: '3px' }}>
          Log Out
        </button>
      </div>
    </div>
  );
}

export function DeniedScreen({ handleLogout }) {
  return (
    <div className="paywall-overlay" style={{ backgroundColor: '#0D1117', backgroundImage: 'none', fontFamily: 'Mattone, sans-serif' }}>
      <div className="paywall-card" style={{ backgroundColor: '#161B22', border: '1px solid #21262D', borderRadius: '3px', boxShadow: 'none', animation: 'none' }}>
        <div className="paywall-icon" style={{ background: '#5B8FB9', boxShadow: 'none' }}><ShieldAlert size={36} /></div>
        <h1 className="paywall-title" style={{ fontFamily: 'Mattone, sans-serif' }}>Access Denied</h1>
        <p className="paywall-text">
          Your workspace access has been denied. Please contact support at reachdesk.io@gmail.com.
        </p>
        <button onClick={handleLogout} className="btn btn-secondary w-full" style={{ marginTop: '1rem', justifyContent: 'center', borderRadius: '3px' }}>
          Log Out
        </button>
      </div>
    </div>
  );
}

// ─── Plan Card Component ──────────────────────────────────────────────────────
function PlanCard({ plan, billing, isSelected, onSelect, handlePaddleCheckout }) {
  const { id, name, tagline, features, comingSoon, isEnterprise } = plan;

  const hasPricing = !isEnterprise && BILLING[billing] && BILLING[billing][id];
  const pricing = hasPricing ? BILLING[billing][id] : null;

  const isStarter = id === 'starter';
  // Grey out Pro and Teams
  const displayOpacity = isStarter ? 1 : 0.6;

  return (
    <div
      onClick={() => isStarter && onSelect(id)}
      style={{
        position: 'relative',
        border: '1px solid #21262D',
        borderRadius: '3px',
        padding: '2rem 1.5rem',
        background: '#161B22',
        opacity: displayOpacity,
        cursor: isStarter ? 'pointer' : 'not-allowed',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: isStarter && isSelected
          ? '0 0 0 3px rgba(91, 143, 185, 0.25)'
          : 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        textAlign: 'left',
      }}
    >
      {/* Discount Badge */}
      {!isEnterprise && billing !== 'monthly' && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'rgba(91, 143, 185, 0.1)',
          color: '#5B8FB9',
          border: '1px solid #5B8FB9',
          fontSize: '0.65rem',
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: '3px',
          letterSpacing: '0.04em',
        }}>
          {billing === 'quarterly' ? 'Save 10%' : billing === 'sixMonth' ? 'Save 15%' : 'Best Value'}
        </div>
      )}

      {/* Header */}
      <div>
        <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#FFFFFF', fontFamily: "'Mattone', sans-serif" }}>
          {name}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          {tagline}
        </div>
      </div>

      {/* Price */}
      <div style={{ minHeight: '3.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {isEnterprise ? (
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', fontFamily: "'Mattone', sans-serif" }}>Custom</div>
        ) : pricing ? (
          <>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', fontFamily: "'Mattone', sans-serif" }}>
              ${pricing.usdPerMonth}/mo <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--text-muted)' }}>({`Rs. ${pricing.pkrPerMonth}/mo`})</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              {billing === 'monthly' ? `$${pricing.usdTotal} billed monthly` : `$${pricing.usdTotal} billed every ${BILLING[billing].months} months`}
            </div>
          </>
        ) : null}
      </div>

      {/* Features */}
      <ul style={{ listStyle: 'none', padding: 0, margin: '0.75rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem', flexGrow: 1 }}>
        {features.map((feat, i) => {
          const isObj = typeof feat === 'object';
          return (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <Check size={13} style={{ color: '#5B8FB9', flexShrink: 0 }} />
              <span>{isObj ? feat.label : feat}</span>
              {isObj && feat.badge && (
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: '3px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-color)',
                  letterSpacing: '0.03em',
                  marginLeft: '0.25rem'
                }}>
                  {feat.badge}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {/* CTA Button */}
      {isEnterprise ? (
        <a
          href="mailto:reachdesk.io@gmail.com?subject=Enterprise%20Plan%20Inquiry"
          className="btn btn-secondary"
          style={{ textAlign: 'center', textDecoration: 'none', justifyContent: 'center', fontSize: '0.85rem', borderRadius: '3px' }}
        >
          Contact Us
        </a>
      ) : isStarter ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePaddleCheckout(id, pricing?.priceId);
          }}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#5B8FB9',
            color: '#0D1117',
            border: 'none',
            borderRadius: '3px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Mattone, sans-serif',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#4A7EA8';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#5B8FB9';
          }}
        >
          Get Started
        </button>
      ) : (
        <button
          disabled
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-color)',
            borderRadius: '3px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'not-allowed',
            fontFamily: 'Mattone, sans-serif',
          }}
        >
          Coming Soon
        </button>
      )}
    </div>
  );
}

// ─── Main UpgradePage Export ──────────────────────────────────────────────────
export function UpgradePage({ profile, handleLogout, onRefreshProfile, bankAccount, bankIban, isEmbedded = false }) {
  const [billing, setBilling] = useState('monthly');
  const [selectedPaywallPlan, setSelectedPaywallPlan] = useState('starter');

  // Initialize Paddle on mount
  useEffect(() => {
    if (window.Paddle) {
      window.Paddle.Initialize({
        token: 'live_44dda826a292d086dd4ec2d781e',
      });
    }
  }, []);

  const handlePaddleCheckout = async (planKey, priceId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!priceId) return;

    window.Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: { email: user.email },
      customData: { supabase_user_id: user.id },
      successUrl: 'https://reachdesk.esemdot.com/dashboard?upgraded=true',
    });
  };

  const isExpired = profile?.plan === 'trial' ? 'trial_expired' : 'subscription_expired';

  return (
    <div
      className={isEmbedded ? '' : 'paywall-overlay'}
      style={{
        fontFamily: 'Mattone, sans-serif',
        ...(!isEmbedded ? {
          backgroundColor: '#0D1117',
          backgroundImage: 'none',
        } : {})
      }}
    >
      <div
        className={isEmbedded ? 'card flex-col' : 'paywall-card'}
        style={{
          fontFamily: 'Mattone, sans-serif',
          maxWidth: '1000px',
          width: '95%',
          margin: '1.5rem auto',
          padding: '2.5rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
          backgroundColor: '#161B22',
          border: '1px solid #21262D',
          borderRadius: '3px',
          boxShadow: 'none',
          backdropFilter: 'none',
          animation: 'none',
        }}
      >
        <div className="paywall-icon" style={{ background: '#5B8FB9', boxShadow: 'none' }}><Lock size={36} /></div>

        {isEmbedded ? (
          <>
            <h1 className="paywall-title" style={{ fontSize: '1.85rem', fontFamily: 'Mattone, sans-serif' }}>Upgrade Workspace Plan</h1>
            <p className="paywall-text" style={{ textAlign: 'center' }}>
              Choose a plan below to unlock advanced features and increase your limits.
            </p>
          </>
        ) : isExpired === 'trial_expired' ? (
          <>
            <h1 className="paywall-title" style={{ fontFamily: 'Mattone, sans-serif' }}>Free Trial Expired</h1>
            <p className="paywall-text" style={{ textAlign: 'center' }}>
              Your 7-day free trial has ended. Please upgrade your plan below to continue.
            </p>
          </>
        ) : (
          <>
            <h1 className="paywall-title" style={{ fontFamily: 'Mattone, sans-serif' }}>Subscription Expired</h1>
            <p className="paywall-text" style={{ textAlign: 'center' }}>
              Your subscription expired on{' '}
              <strong>{profile?.plan_expires_at ? new Date(profile.plan_expires_at).toLocaleDateString() : ''}</strong>.
              Renew your plan to unlock client data.
            </p>
          </>
        )}

        {/* Billing Cycle Toggle */}
        <div style={{ display: 'flex', gap: 0, border: '0.5px solid var(--border-color)', borderRadius: '3px', overflow: 'hidden', width: 'fit-content', marginBottom: '1.5rem', marginTop: '1rem' }}>
          {Object.entries(BILLING).map(([key, info]) => {
            const isActive = billing === key;
            return (
              <button
                key={key}
                onClick={() => setBilling(key)}
                style={{
                  padding: '8px 16px',
                  background: isActive ? '#5B8FB9' : 'transparent',
                  color: isActive ? '#0D1117' : 'var(--text-muted)',
                  border: 'none',
                  borderRight: key !== 'yearly' ? '0.5px solid var(--border-color)' : 'none',
                  cursor: 'pointer',
                  fontFamily: 'Mattone, sans-serif',
                  fontSize: '0.72rem',
                  letterSpacing: '0.06em',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  minWidth: '80px',
                }}
              >
                <span>{info.label}</span>
                {info.badge && (
                  <span style={{ fontSize: '0.6rem', color: isActive ? '#0D1117' : 'var(--success-color)', fontWeight: 600 }}>
                    {info.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Plan Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          width: '100%',
        }}>
          {PLANS.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              billing={billing}
              isSelected={selectedPaywallPlan === plan.id}
              onSelect={setSelectedPaywallPlan}
              handlePaddleCheckout={handlePaddleCheckout}
            />
          ))}
        </div>

        {!isEmbedded && (
          <button onClick={handleLogout} className="btn btn-secondary w-full" style={{ marginTop: '1rem', justifyContent: 'center', borderRadius: '3px' }}>
            Log Out
          </button>
        )}
      </div>
    </div>
  );
}

