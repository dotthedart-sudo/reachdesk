import React, { useState, useEffect } from 'react';
import { Lock, CreditCard, CheckCircle, ShieldAlert, Landmark, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

// ─── Pricing data ────────────────────────────────────────────────────────────
const BILLING = {
  monthly:   { label: 'Monthly',   badge: null,      usdPerMonth: '1.60', usdTotal: '1.60',  pkrPerMonth: 450,  pkrTotal: 450,  months: 1 },
  threeMonth:{ label: '3 Month',   badge: '-10%',    usdPerMonth: '1.44', usdTotal: '4.32',  pkrPerMonth: 405,  pkrTotal: 1215, months: 3 },
  sixMonth:  { label: '6 Month',   badge: '-15%',    usdPerMonth: '1.36', usdTotal: '8.16',  pkrPerMonth: 382,  pkrTotal: 2292, months: 6 },
  yearly:    { label: 'Yearly',    badge: '-20%',    usdPerMonth: '1.28', usdTotal: '15.36', pkrPerMonth: 360,  pkrTotal: 4320, months: 12 },
};

// Total billed per cycle
function formatPriceDisplay(billing, plan) {
  if (plan === 'starter') {
    const info = BILLING[billing];
    return {
      main: `${info.usdTotal} / ${info.months === 1 ? 'mo' : `${info.months} mo`}`,
      sub: `≈ Rs ${info.pkrTotal.toLocaleString()} ${info.months > 1 ? 'total' : '/mo'}`,
      effective: info.months > 1 ? `effective: $${info.usdPerMonth}/mo · ≈ Rs ${info.pkrPerMonth}/mo` : null
    };
  }
  if (plan === 'pro') {
    return { main: '3.40 / mo', sub: '≈ Rs 952/mo', effective: null };
  }
  if (plan === 'teams') {
    return { main: '6.98 / mo', sub: '≈ Rs 1,954/mo', effective: null };
  }
  return { main: '', sub: null, effective: null };
}

// ─── Plan config ─────────────────────────────────────────────────────────────
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
    highlighted: true,
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
    comingSoon: true,
    isEnterprise: false,
  },
  // Enterprise intentionally omitted — not shown on upgrade page
];

// ─── Shared screens ───────────────────────────────────────────────────────────
export function PendingScreen({ profile, handleLogout }) {
  return (
    <div className="paywall-overlay">
      <div className="paywall-card">
        <div className="paywall-icon"><Lock size={36} /></div>
        <h1 className="paywall-title">Activation Pending</h1>
        <p className="paywall-text">
          Your upgrade request for <strong>{profile?.requested_plan?.toUpperCase()}</strong> is pending
          administrator verification. Your data is fully safe.
        </p>
        <button onClick={handleLogout} className="btn btn-secondary w-full" style={{ marginTop: '1rem', justifyContent: 'center' }}>
          Log Out
        </button>
      </div>
    </div>
  );
}

export function DeniedScreen({ handleLogout }) {
  return (
    <div className="paywall-overlay">
      <div className="paywall-card">
        <div className="paywall-icon"><ShieldAlert size={36} /></div>
        <h1 className="paywall-title">Access Denied</h1>
        <p className="paywall-text">
          Your workspace access has been denied. Please contact support at reachdesk.io@gmail.com.
        </p>
        <button onClick={handleLogout} className="btn btn-secondary w-full" style={{ marginTop: '1rem', justifyContent: 'center' }}>
          Log Out
        </button>
      </div>
    </div>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────
function PlanCard({ plan, billing, isSelected, onSelect }) {
  const { id, name, tagline, features, comingSoon, isEnterprise, highlighted } = plan;

  const priceInfo = (!comingSoon && !isEnterprise)
    ? formatPriceDisplay(billing, id)
    : null;

  return (
    <div
      onClick={() => id === 'starter' && onSelect(id)}
      style={{
        position: 'relative',
        border: comingSoon
          ? '1px solid var(--border-color)'
          : highlighted
            ? '2px solid var(--primary-purple)'
            : isSelected
              ? '2px solid var(--primary-purple)'
              : '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '1.5rem 1.25rem',
        background: comingSoon
          ? 'var(--bg-secondary)'
          : 'var(--bg-card)',
        opacity: comingSoon ? 0.6 : 1,
        cursor: id === 'starter' ? 'pointer' : 'not-allowed',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: isSelected && !comingSoon
          ? '0 0 0 3px rgba(139,92,246,0.18)'
          : 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
      }}
    >
      {/* Highlighted badge */}
      {highlighted && !comingSoon && (
        <div style={{
          position: 'absolute',
          top: '-12px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--primary-purple)',
          color: '#fff',
          fontSize: '0.7rem',
          fontWeight: 700,
          padding: '2px 12px',
          borderRadius: '20px',
          whiteSpace: 'nowrap',
          letterSpacing: '0.04em',
        }}>
          Most Popular
        </div>
      )}

      {/* Coming Soon banner */}
      {comingSoon && (
        <div style={{
          position: 'absolute',
          top: '-12px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--bg-tertiary)',
          color: 'var(--text-muted)',
          fontSize: '0.7rem',
          fontWeight: 700,
          padding: '2px 12px',
          borderRadius: '20px',
          border: '1px solid var(--border-color)',
          whiteSpace: 'nowrap',
          letterSpacing: '0.04em',
        }}>
          Coming Soon
        </div>
      )}

      {/* Header */}
      <div>
        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: id !== 'starter' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
          {name}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
          {tagline}
        </div>
      </div>

      {/* Price */}
      <div>
        {isEnterprise ? (
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Mattone', sans-serif" }}>Custom</div>
        ) : id !== 'starter' ? (
          <>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-muted)', fontFamily: "'Mattone', sans-serif" }}>
              <span style={{ fontFamily: "'Mattone', sans-serif" }}>$</span>{id === 'teams' ? '6.98 / mo' : '3.40 / mo'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontFamily: "'Mattone', sans-serif" }}>
              {id === 'teams' ? '≈ Rs 1,954/mo' : '≈ Rs 952/mo'}
            </div>
          </>
        ) : priceInfo ? (
          <>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Mattone', sans-serif" }}>
              <span style={{ fontFamily: "'Mattone', sans-serif" }}>$</span>{priceInfo.main}
            </div>
            {priceInfo.sub && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontFamily: "'Mattone', sans-serif" }}>
                {priceInfo.sub}
              </div>
            )}
            {priceInfo.effective && (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontFamily: "'Mattone', sans-serif" }}>
                {priceInfo.effective}
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Features */}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {features.map((feat, i) => {
          const isObj = typeof feat === 'object';
          return (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: comingSoon ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
              <Check size={13} style={{ color: comingSoon ? 'var(--text-muted)' : 'var(--primary-purple)', flexShrink: 0 }} />
              <span>{isObj ? feat.label : feat}</span>
              {isObj && feat.badge && (
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-color)',
                  letterSpacing: '0.03em',
                }}>
                  {feat.badge}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {/* CTA */}
      {comingSoon ? (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', lineHeight: 1.5 }}>
          <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Coming Soon</div>
          <div>This plan is currently in development.</div>
          <div>Check back soon for early access.</div>
        </div>
      ) : isEnterprise ? (
        <a
          href="mailto:reachdesk.io@gmail.com?subject=Enterprise%20Plan%20Inquiry"
          className="btn btn-secondary"
          style={{ textAlign: 'center', textDecoration: 'none', justifyContent: 'center', fontSize: '0.85rem' }}
        >
          Contact Us
        </a>
      ) : (
        <div style={{
          height: '8px',
          borderRadius: '4px',
          border: isSelected ? '2px solid var(--primary-purple)' : '2px solid transparent',
          background: isSelected ? 'rgba(139,92,246,0.15)' : 'var(--bg-tertiary)',
          transition: 'all 0.2s',
        }} />
      )}
    </div>
  );
}

// ─── Main UpgradePage export ──────────────────────────────────────────────────
export function UpgradePage({ profile, handleLogout, onRefreshProfile, bankAccount, bankIban, isEmbedded = false }) {
  const [billing, setBilling] = useState('monthly');
  const [selectedPaywallPlan, setSelectedPaywallPlan] = useState('starter');
  const [paymentSent, setPaymentSent] = useState(false);
  const [paymentNote, setPaymentNote] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(profile?.email || '');
  const [receiptFile, setReceiptFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (profile?.email) setEmail(profile.email);
  }, [profile?.email]);

  // Initialize Paddle on mount
  useEffect(() => {
    if (window.Paddle) {
      window.Paddle.Initialize({
        token: 'live_44dda826a292d086dd4ec2d781e',
      });
    }
  }, []);

  const PADDLE_PRICE_IDS = {
    starter: 'pri_01kw4zrvsjch1j1hm9vqndq7r2',
    pro: 'pri_01kw4zwwpdem0gmmxq0jgjvge2',
    teams: 'pri_01kw51emf2ehn0s9fmypr7vet1',
  };

  const handlePaddleCheckout = async (planKey) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const priceId = PADDLE_PRICE_IDS[planKey];
    if (!priceId) return;

    window.Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: { email: user.email },
      customData: { supabase_user_id: user.id },
      successUrl: 'https://reachdesk.esemdot.com/dashboard?upgraded=true',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!receiptFile) {
      setErrorMsg('Please select a payment receipt file.');
      return;
    }
    if (!paymentNote.trim()) {
      setErrorMsg('Please add a payment note or reference.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const timestamp = Date.now();
      const filePath = `${profile?.id || 'anonymous'}/${timestamp}-${receiptFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(filePath, receiptFile);

      if (uploadError) throw new Error(`Failed to upload payment receipt: ${uploadError.message}`);

      const { error: funcError } = await supabase.functions.invoke('send-upgrade-request', {
        body: {
          name: fullName,
          phone,
          email,
          plan: selectedPaywallPlan,
          billingCycle: billing,
          transferReference: paymentNote,
          filePath,
        },
      });

      if (funcError) throw new Error(`Failed to submit upgrade request: ${funcError.message}`);

      setPaymentSent(true);
      if (onRefreshProfile) onRefreshProfile();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const isExpired = profile?.plan === 'trial' ? 'trial_expired' : 'subscription_expired';
  const displayBank = bankAccount || '05200112553962';
  const displayIban  = bankIban  || 'PK78MEZN0005200112553962';

  // Compute per-month price label for the selected plan (for payment section)
  const selectedPlanMeta = PLANS.find(p => p.id === selectedPaywallPlan);
  const selectedMonthlyRate = selectedPaywallPlan === 'starter' ? BILLING[billing].pkrPerMonth : selectedPaywallPlan === 'pro' ? 952 : selectedPaywallPlan === 'teams' ? 1954 : null;
  const selectedTotal = selectedPaywallPlan === 'starter' ? parseFloat(BILLING[billing].usdTotal) : selectedPaywallPlan === 'pro' ? 3.40 : selectedPaywallPlan === 'teams' ? 6.98 : null;

  return (
    <div className={isEmbedded ? '' : 'paywall-overlay'} style={{ fontFamily: 'Mattone, sans-serif' }}>
      <div
        className={isEmbedded ? 'card flex-col' : 'paywall-card'}
        style={{
          fontFamily: 'Mattone, sans-serif',
          ...(isEmbedded ? {
            maxWidth: '900px',
            margin: '1.5rem auto',
            padding: '2.5rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            width: '100%',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-card)',
          } : {})
        }}
      >
        <div className="paywall-icon"><Lock size={36} /></div>

        {isEmbedded ? (
          <>
            <h1 className="paywall-title" style={{ fontSize: '1.85rem' }}>Upgrade Workspace Plan</h1>
            <p className="paywall-text" style={{ textAlign: 'center' }}>
              Choose a plan below to unlock advanced features and increase your limits.
            </p>
          </>
        ) : isExpired === 'trial_expired' ? (
          <>
            <h1 className="paywall-title">Free Trial Expired</h1>
            <p className="paywall-text">
              Your 7-day free trial has ended. Please send a payment and request an activation tier below to continue.
            </p>
          </>
        ) : (
          <>
            <h1 className="paywall-title">Subscription Expired</h1>
            <p className="paywall-text">
              Your subscription expired on{' '}
              <strong>{profile?.plan_expires_at ? new Date(profile.plan_expires_at).toLocaleDateString() : ''}</strong>.
              Renew your plan to unlock client data.
            </p>
          </>
        )}

        {/* Billing cycle toggle */}
        <div style={{ display: 'flex', gap: 0, border: '0.5px solid var(--border-color)', borderRadius: '3px', overflow: 'hidden', width: 'fit-content', marginBottom: '2.5rem', marginTop: '1.5rem' }}>
          {Object.entries(BILLING).map(([key, info]) => {
            const isActive = billing === key;
            return (
              <button
                key={key}
                onClick={() => setBilling(key)}
                style={{
                  padding: '8px 16px',
                  background: isActive ? 'var(--accent-blue)' : 'transparent',
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
                  <span style={{ fontSize: '0.6rem', color: isActive ? '#0D1117' : 'var(--accent-green)', fontWeight: 600 }}>
                    {info.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Plan cards grid ─────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '1rem',
          width: '100%',
        }}>
          {PLANS.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              billing={billing}
              isSelected={selectedPaywallPlan === plan.id}
              onSelect={setSelectedPaywallPlan}
            />
          ))}
        </div>

        {/* ── Payment section ─────────────────────────────────── */}
        <div
          className="paywall-instructions flex-col gap-2"
          style={{
            textAlign: 'left',
            background: 'var(--bg-tertiary)',
            padding: '1rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            width: '100%',
            fontFamily: 'Mattone, sans-serif',
          }}
        >
          <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Mattone, sans-serif' }}>Select Upgrade Plan &amp; Send Payment:</p>

          {/* Styled clickable cards instead of plan dropdown selector */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', margin: '0.5rem 0 1.25rem 0' }}>
            {/* Starter Plan Card */}
            <div
              onClick={() => setSelectedPaywallPlan('starter')}
              style={{
                padding: '0.75rem 0.5rem',
                borderRadius: '8px',
                border: selectedPaywallPlan === 'starter' ? '2px solid var(--primary-purple)' : '1px solid var(--border-color)',
                background: selectedPaywallPlan === 'starter' ? 'rgba(139,92,246,0.08)' : 'var(--bg-card)',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s',
                fontFamily: 'Mattone, sans-serif'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: selectedPaywallPlan === 'starter' ? 'var(--primary-purple)' : 'var(--text-primary)' }}>Starter</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '0.2rem', fontFamily: "'Mattone', sans-serif" }}>
                <span style={{ fontFamily: "'Mattone', sans-serif" }}>$</span>{BILLING[billing].usdTotal}
                {BILLING[billing].months > 1 ? `/${BILLING[billing].months}mo` : '/mo'}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                ≈ Rs {BILLING[billing].pkrTotal.toLocaleString()}
              </div>
            </div>

            {/* Pro Plan Card — Disabled/Coming Soon */}
            <div
              style={{
                padding: '0.75rem 0.5rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                opacity: 0.6,
                cursor: 'not-allowed',
                textAlign: 'center',
                fontFamily: 'Mattone, sans-serif'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pro</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '0.2rem', color: 'var(--text-muted)', fontFamily: "'Mattone', sans-serif" }}><span style={{ fontFamily: "'Mattone', sans-serif" }}>$</span>3.40/mo</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>≈ Rs 952</div>
            </div>

            {/* Teams Plan Card — Disabled/Coming Soon */}
            <div
              style={{
                padding: '0.75rem 0.5rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                opacity: 0.6,
                cursor: 'not-allowed',
                textAlign: 'center',
                fontFamily: 'Mattone, sans-serif'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Teams</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '0.2rem', color: 'var(--text-muted)', fontFamily: "'Mattone', sans-serif" }}><span style={{ fontFamily: "'Mattone', sans-serif" }}>$</span>6.98/mo</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>≈ Rs 1,954</div>
            </div>
          </div>

          {/* Dynamic price summary */}
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-purple)', marginBottom: '0.25rem', fontFamily: 'Mattone, sans-serif' }}>
            {selectedPaywallPlan === 'starter' && (
              <>
                <span style={{ fontSize: '1rem', fontWeight: 700, fontFamily: "'Mattone', sans-serif" }}><span style={{ fontFamily: "'Mattone', sans-serif" }}>$</span>{BILLING[billing].usdTotal}</span> / {BILLING[billing].months === 1 ? 'mo' : `${BILLING[billing].months} mo`}
                <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                  (≈ Rs {BILLING[billing].pkrTotal.toLocaleString()} total)
                </span>
                {BILLING[billing].months > 1 && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    effective: <span style={{ fontFamily: "'Mattone', sans-serif" }}>$</span>{BILLING[billing].usdPerMonth}/mo · ≈ Rs {BILLING[billing].pkrPerMonth}/mo
                  </div>
                )}
              </>
            )}
          </div>

          {/* Paddle Pay Now button */}
          <button
            onClick={() => {
              const planKey = selectedPaywallPlan?.toLowerCase() || 'starter';
              handlePaddleCheckout(planKey);
            }}
            disabled={selectedPaywallPlan !== 'starter'}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: selectedPaywallPlan !== 'starter' ? 'var(--bg-tertiary)' : '#5B8FB9',
              color: '#fff',
              border: 'none',
              borderRadius: '3px',
              fontSize: '14px',
              cursor: selectedPaywallPlan !== 'starter' ? 'not-allowed' : 'pointer',
              marginTop: '8px',
              fontWeight: 600,
              fontFamily: 'Mattone, sans-serif'
            }}
          >
            Upgrade to {selectedPlanMeta?.name || selectedPaywallPlan} — Pay Now
          </button>
        </div>

        {!isEmbedded && (
          <button onClick={handleLogout} className="btn btn-secondary w-full" style={{ marginTop: '1rem', justifyContent: 'center' }}>
            Log Out
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
