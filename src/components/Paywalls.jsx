import React, { useState, useEffect } from 'react';
import { Lock, ShieldAlert, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLocalCurrency } from '../utils/useLocalCurrency';

// ─── Unified Pricing Data ──────────────────────────────────────────────────
// ⚠️  SYNC WARNING: This BILLING object is mirrored for Supabase Edge Functions in:
//     supabase/functions/_shared/prices.ts  →  export const BILLING + STARTER_MONTHLY_USD
//
// Deno edge functions cannot import from React files. When changing any price,
// PKR amount, or discount badge, also update the corresponding values in prices.ts.
// Specifically: BILLING.monthly.starter.usdTotal (= STARTER_MONTHLY_USD in prices.ts)
export const BILLING = {
  monthly: {
    label: 'Monthly',
    badge: null,
    months: 1,
    starter: {
      priceId: 'pri_01kw4zrvsjch1j1hm9vqndq7r2',
      usdPerMonth: '5.00',
      usdTotal: '5.00',
      pkrPerMonth: 350,
      pkrTotal: 350,
      bdtPerMonth: 155,
      bdtTotal: 155,
      badge: null
    },
    pro: {
      priceId: 'pri_01kw4zwwpdem0gmmxq0jgjvge2',
      usdPerMonth: '15.00',
      usdTotal: '15.00',
      pkrPerMonth: 950,
      pkrTotal: 950,
      bdtPerMonth: 421,
      bdtTotal: 421,
      badge: null
    },
    teams: {
      priceId: 'pri_01kwj0es4nckpwbnqhsfptmpbz',
      usdPerMonth: '20.00',
      usdTotal: '20.00',
      pkrPerMonth: 1950,
      pkrTotal: 1950,
      bdtPerMonth: 862,
      bdtTotal: 862,
      badge: null
    }
  },
  quarterly: {
    label: 'Quarterly',
    badge: 'Save up to 20%',
    months: 3,
    starter: {
      priceId: 'pri_01kwen9hya3s4ff5a345x3fan5',
      usdPerMonth: '4.00',
      usdTotal: '12.00',
      pkrPerMonth: 280,
      pkrTotal: 840,
      bdtPerMonth: 124.33,
      bdtTotal: 373,
      badge: 'Save 20%'
    },
    pro: {
      priceId: 'pri_01kwj03nqwt1x8wwcdsm7k0gf7',
      usdPerMonth: '13.20',
      usdTotal: '39.60',
      pkrPerMonth: 836,
      pkrTotal: 2508,
      bdtPerMonth: 370.33,
      bdtTotal: 1111,
      badge: 'Save 12%'
    },
    teams: {
      priceId: 'pri_01kwj0gqjqzgnsn9rg8wyygctw',
      usdPerMonth: '18.00',
      usdTotal: '54.00',
      pkrPerMonth: 1755,
      pkrTotal: 5265,
      bdtPerMonth: 776,
      bdtTotal: 2328,
      badge: 'Save 10%'
    }
  },
  sixMonth: {
    label: '6-Month',
    badge: 'Save up to 25%',
    months: 6,
    starter: {
      priceId: 'pri_01kwenc72ad2fnfjks4qxcv8gt',
      usdPerMonth: '3.75',
      usdTotal: '22.50',
      pkrPerMonth: 262.5,
      pkrTotal: 1575,
      bdtPerMonth: 115.67,
      bdtTotal: 694,
      badge: 'Save 25%'
    },
    pro: {
      priceId: 'pri_01kwj06cdf68mjc2dv20gzb1n0',
      usdPerMonth: '12.30',
      usdTotal: '73.80',
      pkrPerMonth: 779,
      pkrTotal: 4674,
      bdtPerMonth: 345,
      bdtTotal: 2070,
      badge: 'Save 18%'
    },
    teams: {
      priceId: 'pri_01kwj0jmf5y3mh4djdy33c008k',
      usdPerMonth: '17.00',
      usdTotal: '102.00',
      pkrPerMonth: 1657.5,
      pkrTotal: 9945,
      bdtPerMonth: 732.83,
      bdtTotal: 4397,
      badge: 'Save 15%'
    }
  },
  yearly: {
    label: 'Yearly',
    badge: 'Save up to 30%',
    months: 12,
    starter: {
      priceId: 'pri_01kwenh9cqccsbym0m1w6tg3gs',
      usdPerMonth: '3.50',
      usdTotal: '42.00',
      pkrPerMonth: 245,
      pkrTotal: 2940,
      bdtPerMonth: 108.25,
      bdtTotal: 1299,
      badge: 'Save 30%'
    },
    pro: {
      priceId: 'pri_01kwj0cex7n1rdaww8fv33afbm',
      usdPerMonth: '11.25',
      usdTotal: '135.00',
      pkrPerMonth: 712.5,
      pkrTotal: 8550,
      bdtPerMonth: 315.5,
      bdtTotal: 3786,
      badge: 'Save 25%'
    },
    teams: {
      priceId: 'pri_01kwj0me8wdfc1mr801971n74y',
      usdPerMonth: '16.00',
      usdTotal: '192.00',
      pkrPerMonth: 1560,
      pkrTotal: 18720,
      bdtPerMonth: 689.83,
      bdtTotal: 8278,
      badge: 'Save 20%'
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
    tagline: (billing) => billing === 'yearly'
      ? '2,000 leads · 1 user · 10 templates'
      : '1,000 leads (2,000 if billed yearly) · 1 user · 10 templates',
    features: CORE_FEATURES,
    comingSoon: false,
    isEnterprise: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: (billing) => billing === 'yearly'
      ? '10,000 leads · 1 user · Unlimited templates'
      : '5,000 leads (10,000 if billed yearly) · 1 user · Unlimited templates',
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
    tagline: () => 'Unlimited leads · 3 users · Unlimited templates',
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
    <div className="paywall-overlay" style={{ backgroundColor: 'var(--bg-page)', backgroundImage: 'none', fontFamily: 'Mattone, sans-serif' }}>
      <div className="paywall-card" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '3px', boxShadow: 'none', animation: 'none' }}>
        <div className="paywall-icon" style={{ background: 'var(--accent-blue)', boxShadow: 'none' }}><Lock size={36} /></div>
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
    <div className="paywall-overlay" style={{ backgroundColor: 'var(--bg-page)', backgroundImage: 'none', fontFamily: 'Mattone, sans-serif' }}>
      <div className="paywall-card" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '3px', boxShadow: 'none', animation: 'none' }}>
        <div className="paywall-icon" style={{ background: 'var(--accent-blue)', boxShadow: 'none' }}><ShieldAlert size={36} /></div>
        <h1 className="paywall-title" style={{ fontFamily: 'Mattone, sans-serif' }}>Access Denied</h1>
        <p className="paywall-text">
          Your workspace access has been denied. Please contact support at support@esemdot.com.
        </p>
        <button onClick={handleLogout} className="btn btn-secondary w-full" style={{ marginTop: '1rem', justifyContent: 'center', borderRadius: '3px' }}>
          Log Out
        </button>
      </div>
    </div>
  );
}

// ─── Plan Card Component ──────────────────────────────────────────────────────
const PLAN_LEVELS = {
  trial: 0,
  starter: 1,
  pro: 2,
  teams: 3,
  enterprise: 4
};

function PlanCard({ plan, billing, isSelected, onSelect, handlePaddleCheckout, profile }) {
  const { id, name, tagline, features, comingSoon, isEnterprise } = plan;
  const { formatLocalPrice, country, rate } = useLocalCurrency();

  const getUsdEquivalent = (localAmount) => {
    const activeRate = rate || (country === 'PK' ? 278 : 123);
    const converted = parseFloat(localAmount) / activeRate;
    return `$${converted.toFixed(2)}/mo`;
  };

  const getUsdEquivalentTotal = (localTotal) => {
    const activeRate = rate || (country === 'PK' ? 278 : 123);
    const converted = parseFloat(localTotal) / activeRate;
    return `$${converted.toFixed(2)} total`;
  };

  const hasPricing = !isEnterprise && BILLING[billing] && BILLING[billing][id];
  const pricing = hasPricing ? BILLING[billing][id] : null;

  const currentUserPlan = profile?.plan;
  const isPlanActive = profile?.plan_status === 'active';

  const userPlanLevel = PLAN_LEVELS[(currentUserPlan || 'trial').toLowerCase()] || 0;
  const cardPlanLevel = PLAN_LEVELS[id.toLowerCase()] || 0;

  const isCurrentPlan = isPlanActive && currentUserPlan?.toLowerCase() === id.toLowerCase();
  const isUpgrade = isPlanActive && cardPlanLevel > userPlanLevel;

  // Determine selectable and state
  let isSelectable = false;
  let cardStatus = 'disabled'; // 'current' | 'upgrade' | 'selectable' | 'disabled'

  if (isCurrentPlan) {
    cardStatus = 'current';
    isSelectable = false;
  } else if (isPlanActive) {
    if (isUpgrade) {
      cardStatus = 'upgrade';
      isSelectable = true;
    } else {
      cardStatus = 'disabled';
      isSelectable = false;
    }
  } else {
    // Non-active user (trial/expired)
    if (id === 'starter' || isEnterprise) {
      cardStatus = 'selectable';
      isSelectable = true;
    } else {
      cardStatus = 'disabled';
      isSelectable = false;
    }
  }

  const displayOpacity = (cardStatus === 'disabled') ? 0.6 : 1;

  return (
    <div
      onClick={() => isSelectable && onSelect(id)}
      style={{
        position: 'relative',
        border: '1px solid var(--border)',
        borderRadius: '3px',
        padding: '2rem 1.5rem',
        background: 'var(--bg-card)',
        opacity: displayOpacity,
        cursor: isSelectable ? 'pointer' : 'default',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: isSelectable && isSelected
          ? '0 0 0 3px color-mix(in srgb, var(--accent-blue) 25%, transparent)'
          : 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        textAlign: 'left',
      }}
    >
      {/* Current Plan Badge */}
      {cardStatus === 'current' && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'rgba(16, 185, 129, 0.1)',
          color: '#10b981',
          border: '1px solid #10b981',
          fontSize: '0.65rem',
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: '3px',
          letterSpacing: '0.04em',
        }}>
          ✓ Current Plan
        </div>
      )}

      {/* Discount Badge */}
      {cardStatus !== 'current' && !isEnterprise && billing !== 'monthly' && pricing?.badge && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'color-mix(in srgb, var(--accent-blue) 12%, transparent)',
          color: 'var(--accent-blue)',
          border: '1px solid var(--accent-blue)',
          fontSize: '0.65rem',
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: '3px',
          letterSpacing: '0.04em',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '2px'
        }}>
          <div>{pricing.badge}</div>
          {(() => {
            const monthlyPrice = parseFloat(BILLING.monthly[id].usdPerMonth);
            const currentPrice = parseFloat(pricing.usdPerMonth);
            const savings = monthlyPrice - currentPrice;

            if (country === 'BD' && BILLING.monthly[id].bdtPerMonth && pricing.bdtPerMonth) {
              const bdtSavings = BILLING.monthly[id].bdtPerMonth - pricing.bdtPerMonth;
              if (bdtSavings > 0) {
                return (
                  <>
                    <div>Save ≈ BDT {bdtSavings.toFixed(0)}/mo</div>
                    {savings > 0 && (
                      <div style={{ fontSize: '0.55rem', fontWeight: 500, opacity: 0.8 }}>
                        Save ${savings.toFixed(2)}/mo
                      </div>
                    )}
                  </>
                );
              }
            }

            if (country === 'PK' && BILLING.monthly[id].pkrPerMonth && pricing.pkrPerMonth) {
              const pkrSavings = BILLING.monthly[id].pkrPerMonth - pricing.pkrPerMonth;
              if (pkrSavings > 0) {
                return (
                  <>
                    <div>Save ≈ Rs {pkrSavings}/mo</div>
                    {savings > 0 && (
                      <div style={{ fontSize: '0.55rem', fontWeight: 500, opacity: 0.8 }}>
                        Save ${savings.toFixed(2)}/mo
                      </div>
                    )}
                  </>
                );
              }
            }

            const formattedSavings = formatLocalPrice(savings);
            return formattedSavings ? (
              <>
                <div>Save {formattedSavings}/mo</div>
                {savings > 0 && (
                  <div style={{ fontSize: '0.55rem', fontWeight: 500, opacity: 0.8 }}>
                    Save ${savings.toFixed(2)}/mo
                  </div>
                )}
              </>
            ) : savings > 0 ? (
              <div>Save ${savings.toFixed(2)}/mo</div>
            ) : null;
          })()}
        </div>
      )}

      {/* Header */}
      <div>
        <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)', fontFamily: "'Mattone', sans-serif" }}>
          {name}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          {typeof tagline === 'function' ? tagline(billing) : tagline}
        </div>
      </div>

      {/* Price */}
      <div style={{ minHeight: '3.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {isEnterprise ? (
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Mattone', sans-serif" }}>Custom</div>
        ) : pricing ? (
          <>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Mattone', sans-serif" }}>
              {(() => {
                if (country === 'PK') {
                  return `Rs ${pricing.pkrPerMonth}/mo`;
                }
                if (country === 'BD') {
                  return `৳${pricing.bdtPerMonth.toFixed(2)}/mo`;
                }
                return `$${pricing.usdPerMonth}/mo`;
              })()}
              {(() => {
                if (country === 'PK') {
                  return (
                    <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {getUsdEquivalent(pricing.pkrPerMonth)}
                    </div>
                  );
                }
                if (country === 'BD') {
                  return (
                    <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {getUsdEquivalent(pricing.bdtPerMonth)}
                    </div>
                  );
                }
                const formatted = formatLocalPrice(pricing.usdPerMonth);
                return formatted ? (
                  <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    {formatted}/mo
                  </div>
                ) : null;
              })()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              {(() => {
                if (country === 'PK') {
                  return billing === 'monthly'
                    ? `Rs ${pricing.pkrTotal} billed monthly`
                    : `Rs ${pricing.pkrTotal} billed every ${BILLING[billing].months} months`;
                }
                if (country === 'BD') {
                  return billing === 'monthly'
                    ? `৳${pricing.bdtTotal.toFixed(0)} billed monthly`
                    : `৳${pricing.bdtTotal.toFixed(0)} billed every ${BILLING[billing].months} months`;
                }
                return billing === 'monthly'
                  ? `$${pricing.usdTotal} billed monthly`
                  : `$${pricing.usdTotal} billed every ${BILLING[billing].months} months`;
              })()}
              {(() => {
                if (country === 'PK') {
                  return (
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                      {getUsdEquivalentTotal(pricing.pkrTotal)}
                    </div>
                  );
                }
                if (country === 'BD') {
                  return (
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                      {getUsdEquivalentTotal(pricing.bdtTotal)}
                    </div>
                  );
                }
                const formatted = formatLocalPrice(pricing.usdTotal);
                return formatted ? (
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    {formatted} total
                  </div>
                ) : null;
              })()}
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
              <Check size={13} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
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
      ) : cardStatus === 'current' ? (
        <>
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
            ✓ Current Plan
          </button>
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
            marginTop: '0.5rem',
            lineHeight: '1.4'
          }}>
            {profile?.paddle_next_billing_date
              ? `Your ${name} plan is active. Next billing date: ${profile.paddle_next_billing_date}`
              : `Your ${name} plan is active and renews monthly.`}
          </div>
        </>
      ) : isSelectable ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePaddleCheckout(id, pricing?.priceId);
          }}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: 'var(--accent-blue)',
            color: 'var(--bg-card)',
            border: 'none',
            borderRadius: '3px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Mattone, sans-serif',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = 'var(--accent-blue-hover)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'var(--accent-blue)';
          }}
        >
          {cardStatus === 'upgrade' ? 'Upgrade' : 'Get Started'}
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
      successUrl: 'https://reachdeskcrm.com/dashboard?upgraded=true',
    });
  };

  const isExpired = profile?.plan === 'trial' ? 'trial_expired' : 'subscription_expired';

  return (
    <div
      className={isEmbedded ? '' : 'paywall-overlay'}
      style={{
        fontFamily: 'Mattone, sans-serif',
        ...(!isEmbedded ? {
          backgroundColor: 'var(--bg-page)',
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
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '3px',
          boxShadow: 'none',
          backdropFilter: 'none',
          animation: 'none',
        }}
      >
        {/* Branding header — only on standalone (non-embedded) paywall */}
        {!isEmbedded && (
          <div style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontFamily: 'Mattone, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '22px', color: 'var(--text-primary)', fontWeight: '400' }}>ReachDesk CRM</span>
          </div>
        )}

        <div className="paywall-icon" style={{ background: 'var(--accent-blue)', boxShadow: 'none' }}><Lock size={36} /></div>

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
                  background: isActive ? 'var(--accent-blue)' : 'transparent',
                  color: isActive ? 'var(--bg-card)' : 'var(--text-muted)',
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
                  <span style={{ fontSize: '0.6rem', color: isActive ? 'var(--bg-card)' : 'var(--success-color)', fontWeight: 600 }}>
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
              profile={profile}
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

