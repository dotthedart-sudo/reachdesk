import React, { useState, useEffect } from 'react';
import { Lock, ShieldAlert, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLocalCurrency } from '../utils/useLocalCurrency';
import { APP_DOMAIN, isLocalDev } from '../utils/domain';
import { PLANS, getPlanFeatures } from '../lib/planMarketing';
import { ShinyButton } from '@/registry/magicui/shiny-button';
import { isRegionExcluded, formatPlanHeroAmount, formatPlanHeroPeriod, formatPlanHeroSub, formatPlanHeroBillingNote } from '../lib/regionalPricing';
import { normalizePlan } from '../lib/planConfig';
import { canManageOwnBilling, isTeamMember } from '../lib/teamWorkspace';
import MemberBillingNotice from './MemberBillingNotice';
import AuthLogo from './AuthLogo';

// ─── Unified Pricing Data ──────────────────────────────────────────────────
// ⚠️  SYNC WARNING: Mirrored in supabase/functions/_shared/prices.ts
export const BILLING = {
  monthly: {
    label: 'Monthly',
    badge: null,
    months: 1,
    starter: {
      priceId: 'pri_01kyjynvsztqyctmvng7jwm3a2',
      usdPerMonth: '5.00',
      usdTotal: '5.00',
      pkrPerMonth: 350,
      pkrTotal: 350,
      bdtPerMonth: 209,
      bdtTotal: 209,
      badge: null
    },
    pro: {
      priceId: 'pri_01kym7e8a59znm8wt54233phs0',
      usdPerMonth: '15.00',
      usdTotal: '15.00',
      pkrPerMonth: 999,
      pkrTotal: 999,
      bdtPerMonth: 599,
      bdtTotal: 599,
      badge: null
    },
    teams: {
      priceId: 'pri_01kymbs35k74ep884frg6cvjze',
      usdPerMonth: '29.00',
      usdTotal: '29.00',
      pkrPerMonth: 1949,
      pkrTotal: 1949,
      bdtPerMonth: 1159,
      bdtTotal: 1159,
      badge: null
    }
  },
  quarterly: {
    label: 'Quarterly',
    badge: 'Save 15%',
    months: 3,
    starter: {
      priceId: 'pri_01kym6qvynxjby24z4s1303qne',
      usdPerMonth: '4.25',
      usdTotal: '12.75',
      pkrPerMonth: 298,
      pkrTotal: 893,
      bdtPerMonth: 178,
      bdtTotal: 533,
      badge: 'Save 15%'
    },
    pro: {
      priceId: 'pri_01kym7nbacv5z4p9w9e4z3ggh7',
      usdPerMonth: '12.75',
      usdTotal: '38.25',
      pkrPerMonth: 849,
      pkrTotal: 2549,
      bdtPerMonth: 509,
      bdtTotal: 1527,
      badge: 'Save 15%'
    },
    teams: {
      priceId: 'pri_01kymckgvx8xsg84zkygzfr72d',
      usdPerMonth: '24.65',
      usdTotal: '73.95',
      pkrPerMonth: 1657,
      pkrTotal: 4971,
      bdtPerMonth: 985,
      bdtTotal: 2955,
      badge: 'Save 15%'
    }
  },
  yearly: {
    label: 'Yearly',
    badge: 'Save 30%',
    months: 12,
    starter: {
      priceId: 'pri_01kym74hqdz60rj3fn5hvtk487',
      usdPerMonth: '3.50',
      usdTotal: '42.00',
      pkrPerMonth: 245,
      pkrTotal: 2940,
      bdtPerMonth: 146,
      bdtTotal: 1754,
      badge: 'Save 30%'
    },
    pro: {
      priceId: 'pri_01kym81ydj3gdb8crd8m9qrdk2',
      usdPerMonth: '10.50',
      usdTotal: '126.00',
      pkrPerMonth: 699,
      pkrTotal: 8392,
      bdtPerMonth: 419,
      bdtTotal: 5030,
      badge: 'Save 30%'
    },
    teams: {
      priceId: 'pri_01kymd8sne7zm5hvz7vdqwcymg',
      usdPerMonth: '20.30',
      usdTotal: '243.60',
      pkrPerMonth: 1364,
      pkrTotal: 16368,
      bdtPerMonth: 811,
      bdtTotal: 9732,
      badge: 'Save 30%'
    }
  }
};

// Plan copy/features come from ../lib/planMarketing (PLANS + getPlanFeatures)

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
          Your workspace access has been denied. Please contact support at support@reachdeskcrm.com.
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
};

function PlanCard({ plan, billing, handlePaddleCheckout, profile, country, formatLocalPrice }) {
  const { id, name, tagline, comingSoon, highlighted, ctaLabel } = plan;
  const features = getPlanFeatures(id, billing);
  const checkoutBlocked = isRegionExcluded(country);

  const hasPricing = BILLING[billing] && BILLING[billing][id];
  const pricing = hasPricing ? BILLING[billing][id] : null;

  const currentUserPlan = normalizePlan(profile?.plan);
  const isPlanActive = profile?.plan_status === 'active' || profile?.plan_status === 'cancelling';
  const userPlanLevel = PLAN_LEVELS[currentUserPlan] ?? 0;
  const cardPlanLevel = PLAN_LEVELS[id.toLowerCase()] ?? 0;
  const isCurrentPlan = isPlanActive && currentUserPlan === id.toLowerCase();
  const isUpgrade = isPlanActive && cardPlanLevel > userPlanLevel;

  let cardStatus = 'disabled';
  let isSelectable = false;

  if (isCurrentPlan) {
    cardStatus = 'current';
  } else if (isPlanActive) {
    if (isUpgrade) {
      cardStatus = 'upgrade';
      isSelectable = true;
    }
  } else if (!comingSoon) {
    cardStatus = 'selectable';
    isSelectable = true;
  }

  const renderPrice = () => formatPlanHeroAmount(country, pricing, billing);
  const renderPeriod = () => formatPlanHeroPeriod(billing);
  const renderDetailsSub = () => formatPlanHeroSub(country, pricing, billing, formatLocalPrice);
  const renderBillingNote = () => formatPlanHeroBillingNote(country, pricing, billing);

  const savingsLabel = (() => {
    if (billing === 'monthly' || !pricing || cardStatus === 'current') return null;
    const monthlyPrice = parseFloat(BILLING.monthly[id].usdPerMonth);
    const currentPrice = parseFloat(pricing.usdPerMonth);
    const savings = monthlyPrice - currentPrice;
    if (country === 'BD' && BILLING.monthly[id].bdtPerMonth && pricing.bdtPerMonth) {
      const bdtSavings = BILLING.monthly[id].bdtPerMonth - pricing.bdtPerMonth;
      if (bdtSavings > 0) return `Save ৳${bdtSavings}/mo`;
    }
    if (country === 'PK' && BILLING.monthly[id].pkrPerMonth && pricing.pkrPerMonth) {
      const pkrSavings = BILLING.monthly[id].pkrPerMonth - pricing.pkrPerMonth;
      if (pkrSavings > 0) return `Save Rs ${pkrSavings}/mo`;
    }
    const formatted = formatLocalPrice(savings);
    if (formatted) return `Save ${formatted}/mo`;
    if (savings > 0) return `Save $${savings.toFixed(2)}/mo`;
    return pricing.badge;
  })();

  const ctaText =
    cardStatus === 'current'
      ? 'Current plan'
      : cardStatus === 'upgrade'
        ? `Upgrade to ${name}`
        : (ctaLabel || 'Get Started');

  return (
    <div
      className={`rd-pricing-card${highlighted ? ' rd-pricing-popular' : ''}${cardStatus === 'disabled' ? ' disabled' : ''}`}
    >
      {highlighted && cardStatus !== 'current' && (
        <span className="rd-pricing-popular-badge">Most popular</span>
      )}
      {cardStatus === 'current' && (
        <span className="rd-pricing-tag rd-pricing-tag--current">
          <Check size={11} aria-hidden /> Current plan
        </span>
      )}
      {cardStatus !== 'current' && savingsLabel && (
        <span className="rd-pricing-tag rd-pricing-tag--save">{savingsLabel}</span>
      )}

      <div className="rd-pricing-card-header">
        <div className="rd-pricing-plan-name">{name}</div>
        <p className="rd-pricing-tagline">
          {typeof tagline === 'function' ? tagline(billing) : tagline}
        </p>
        <div className="rd-pricing-price-main">
          <span className="rd-pricing-price-amount">{renderPrice()}</span>
          {renderPeriod() && (
            <span className="rd-pricing-price-period">{renderPeriod()}</span>
          )}
        </div>
        {renderDetailsSub() && (
          <span className="rd-pricing-price-sub">{renderDetailsSub()}</span>
        )}
        {renderBillingNote() && (
          <div className="rd-pricing-price-billing">
            <span className="rd-pricing-price-sub">{renderBillingNote()}</span>
          </div>
        )}
      </div>

      <ul className="rd-pricing-features">
        {features.map((feat, i) => {
          const isObj = typeof feat === 'object';
          const label = isObj ? feat.label : feat;
          return (
            <li key={`${id}-${label}-${i}`} className="rd-pricing-feature">
              <Check size={15} className="rd-pricing-feature-icon" aria-hidden />
              <span className="rd-pricing-feature-text">{label}</span>
              {isObj && feat.badge && (
                <span className="rd-pricing-feature-badge">{feat.badge}</span>
              )}
            </li>
          );
        })}
      </ul>

      {checkoutBlocked && isSelectable ? (
        <p className="rd-upgrade-region-block">
          Checkout is not available in your region. Contact support@reachdeskcrm.com.
        </p>
      ) : isSelectable ? (
        <ShinyButton
          onClick={() => handlePaddleCheckout(id, pricing?.priceId)}
          className="rd-pricing-cta"
        >
          {ctaText}
        </ShinyButton>
      ) : cardStatus === 'current' ? (
        <>
          <button type="button" className="rd-pricing-cta disabled" disabled>
            <Check size={14} aria-hidden /> Current plan
          </button>
          <p className="rd-upgrade-renewal">
            {profile?.paddle_next_billing_date
              ? `Renews ${profile.paddle_next_billing_date}`
              : `Your ${name} plan is active.`}
          </p>
        </>
      ) : (
        <button type="button" className="rd-pricing-cta disabled" disabled>
          {comingSoon ? 'Coming soon' : 'Not available'}
        </button>
      )}
    </div>
  );
}

// ─── Main UpgradePage Export ──────────────────────────────────────────────────
export function UpgradePage({ profile, handleLogout, onRefreshProfile, bankAccount, bankIban, isEmbedded = false }) {
  const [billing, setBilling] = useState('monthly');
  const { formatLocalPrice, country } = useLocalCurrency();

  useEffect(() => {
    if (window.Paddle) {
      window.Paddle.Initialize({
        token: import.meta.env.VITE_PADDLE_CLIENT_TOKEN,
      });
    }
  }, []);

  const handlePaddleCheckout = async (planKey, priceId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !priceId) return;
    if (profile?.role === 'admin' || isTeamMember(profile)) return;

    window.Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: { email: user.email },
      customData: { supabase_user_id: user.id },
      successUrl: isLocalDev()
        ? `${window.location.origin}/dashboard?upgraded=true`
        : `${APP_DOMAIN}/dashboard?upgraded=true`,
    });
  };

  const isTrialExpired = profile?.plan === 'trial';

  if (profile?.role === 'admin') {
    return <MemberBillingNotice profile={profile} variant="admin" />;
  }

  if (isTeamMember(profile)) {
    return <MemberBillingNotice profile={profile} variant="member" />;
  }

  const headerTitle = isEmbedded
    ? 'Upgrade your workspace'
    : isTrialExpired
      ? 'Your free trial has ended'
      : 'Renew your subscription';

  const headerSub = isEmbedded
    ? 'Pick Starter or Pro — billed monthly, quarterly, or yearly. Upgrade anytime.'
    : isTrialExpired
      ? 'Choose a plan to keep your leads, templates, and pipeline data.'
      : `Your plan expired${profile?.plan_expires_at ? ` on ${new Date(profile.plan_expires_at).toLocaleDateString()}` : ''}. Renew below to unlock your workspace.`;

  return (
    <div className={`rd-upgrade-page${isEmbedded ? ' rd-upgrade-page--embedded' : ' rd-upgrade-page--standalone'}`}>
      <div className="rd-upgrade-inner">
        {!isEmbedded && (
          <div className="rd-upgrade-brand">
            <AuthLogo />
          </div>
        )}

        <header className="rd-upgrade-header">
          {!isEmbedded && (
            <div className="rd-upgrade-icon" aria-hidden>
              <Lock size={22} />
            </div>
          )}
          <h1 className="rd-upgrade-title">{headerTitle}</h1>
          <p className="rd-upgrade-sub">{headerSub}</p>
        </header>

        <div className="rd-billing-toggle-wrap">
          <div className="rd-billing-toggle" role="tablist" aria-label="Billing cycle">
            {Object.entries(BILLING).map(([key, info]) => (
              <button
                key={key}
                type="button"
                className={`rd-billing-btn${billing === key ? ' active' : ''}`}
                onClick={() => setBilling(key)}
              >
                {info.label}
                {info.badge && <span className="rd-billing-save">{info.badge}</span>}
              </button>
            ))}
          </div>
        </div>

        {billing === 'yearly' && (
          <p className="rd-pricing-yearly-callout">Yearly: Starter gets 2,000 leads · Pro gets 2× lead capacity.</p>
        )}

        <div className="rd-pricing-grid">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              billing={billing}
              handlePaddleCheckout={handlePaddleCheckout}
              profile={profile}
              country={country}
              formatLocalPrice={formatLocalPrice}
            />
          ))}
        </div>

        {!isEmbedded && (
          <button
            type="button"
            onClick={handleLogout}
            className="btn btn-secondary rd-upgrade-logout"
          >
            Log out
          </button>
        )}
      </div>
    </div>
  );
}
