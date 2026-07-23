import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Columns, Clock, PenTool, TrendingUp } from 'lucide-react';
import { useAppContext } from '../App';
import { BILLING } from './Paywalls';
import {
  MARKETING_PLANS,
  TRIAL_MARKETING,
  HOMEPAGE_FEATURES,
  HOW_IT_WORKS_STEPS,
} from '../lib/planMarketing';
import { useLocalCurrency } from '../utils/useLocalCurrency';
import heroDark from '../assets/hero.png';
import heroLight from '../assets/hero_light.png';
import { Helmet } from 'react-helmet-async';
import { siteMeta, generateOGTags } from '../config/metadata';
import { getAppUrl, getMarketingUrl, isLocalDev } from '../utils/domain';

const FEATURE_ICONS = {
  pipeline: Columns,
  reminders: Clock,
  templates: PenTool,
  revenue: TrendingUp,
};

export default function Homepage({ currentUserEmail }) {
  const navigate = useNavigate();
  const { theme: appTheme, toggleTheme: toggleAppTheme } = useAppContext() || {};
  const { formatLocalPrice, country, rate } = useLocalCurrency();

  const [theme, setTheme] = useState(() => {
    const appSaved = localStorage.getItem('reachdesk_theme');
    if (appSaved === 'light' || appSaved === 'dark') return appSaved;
    const saved = localStorage.getItem('hp-theme');
    if (saved) return saved;
    const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
    return prefersLight ? 'light' : 'dark';
  });

  const [heroReady, setHeroReady] = useState(false);
  const [billing, setBilling] = useState('monthly');

  useEffect(() => {
    const t = requestAnimationFrame(() => setHeroReady(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll('.hp-reveal');
    if (!els.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('hp-reveal-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -48px 0px' }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const toggleHomepageTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('hp-theme', nextTheme);
    localStorage.setItem('reachdesk_theme', nextTheme);
    if (typeof toggleAppTheme === 'function' && appTheme && appTheme !== nextTheme) {
      toggleAppTheme();
    }
  };

  const isLoggedIn = !!currentUserEmail;

  const handleSignUpClick = () => {
    if (isLocalDev()) {
      navigate(isLoggedIn ? '/dashboard' : '/signup');
    } else {
      window.location.href = getAppUrl(isLoggedIn ? '/dashboard' : '/signup');
    }
  };

  const handleLoginClick = () => {
    if (isLocalDev()) {
      navigate(isLoggedIn ? '/dashboard' : '/login');
    } else {
      window.location.href = getAppUrl(isLoggedIn ? '/dashboard' : '/login');
    }
  };

  const getUsdEquivalent = (localAmount) => {
    const activeRate = rate || (country === 'PK' ? 278 : 123);
    return `$${(parseFloat(localAmount) / activeRate).toFixed(2)}/mo`;
  };

  const getUsdEquivalentTotal = (localTotal) => {
    const activeRate = rate || (country === 'PK' ? 278 : 123);
    return `$${(parseFloat(localTotal) / activeRate).toFixed(2)} total`;
  };

  const renderPlanPrice = (planId) => {
    if (country === 'PK') return `Rs ${BILLING[billing][planId].pkrPerMonth}`;
    if (country === 'BD') return `৳${BILLING[billing][planId].bdtPerMonth.toFixed(0)}`;
    return `$${BILLING[billing][planId].usdPerMonth}`;
  };

  const renderPlanDetailsSub = (planId) => {
    if (country === 'PK') return getUsdEquivalent(BILLING[billing][planId].pkrPerMonth);
    if (country === 'BD') return getUsdEquivalent(BILLING[billing][planId].bdtPerMonth);
    const formatted = formatLocalPrice(BILLING[billing][planId].usdPerMonth);
    return formatted ? `${formatted}/mo` : '';
  };

  const renderPlanBillingCycle = (planId) => {
    const cycle = BILLING[billing][planId];
    if (country === 'PK') {
      return billing === 'monthly'
        ? `Rs ${BILLING.monthly[planId].pkrTotal} billed monthly`
        : `Rs ${cycle.pkrTotal} billed every 12 months`;
    }
    if (country === 'BD') {
      return billing === 'monthly'
        ? `৳${BILLING.monthly[planId].bdtTotal.toFixed(0)} billed monthly`
        : `৳${cycle.bdtTotal.toFixed(0)} billed every 12 months`;
    }
    return billing === 'monthly'
      ? `$${BILLING.monthly[planId].usdTotal} billed monthly`
      : `$${cycle.usdTotal} billed every 12 months`;
  };

  const renderPlanBillingCycleSub = (planId) => {
    const cycle = BILLING[billing][planId];
    if (country === 'PK') return getUsdEquivalentTotal(cycle.pkrTotal);
    if (country === 'BD') return getUsdEquivalentTotal(cycle.bdtTotal);
    const formatted = formatLocalPrice(cycle.usdTotal);
    return formatted ? `${formatted} total` : '';
  };

  return (
    <div className="hp-root" data-theme={theme}>
      <Helmet>
        <title>{siteMeta.pages.homepage.title}</title>
        <meta name="description" content={siteMeta.pages.homepage.description} />
        <meta name="keywords" content={siteMeta.pages.homepage.keywords} />
        {Object.entries(generateOGTags(siteMeta.pages.homepage.title, siteMeta.pages.homepage.description)).map(([key, value]) => (
          <meta key={key} property={key} content={value} />
        ))}
      </Helmet>

      <nav className="hp-nav">
        <button
          type="button"
          className="hp-logo-btn"
          onClick={() => (isLocalDev() ? navigate('/homepage') : (window.location.href = getMarketingUrl('/homepage')))}
        >
          <span className="hp-logo">REACHDESK</span>
        </button>

        <div className="hp-nav-center">
          <a href="#features" className="hp-nav-link">Features</a>
          <a href="#pricing" className="hp-nav-link">Pricing</a>
          <a href={getMarketingUrl('/blog')} className="hp-nav-link">Blog</a>
          <button type="button" onClick={handleLoginClick} className="hp-nav-link">Log in</button>
        </div>

        <div className="hp-nav-right">
          <button
            type="button"
            onClick={toggleHomepageTheme}
            className="hp-theme-toggle"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button type="button" onClick={handleSignUpClick} className="hp-btn-primary">
            {isLoggedIn ? 'Dashboard' : 'Sign up free'}
          </button>
        </div>
      </nav>

      {/* Hero — brand-first, one headline, full-bleed product visual */}
      <section className={`hp-hero-section hp-hero-premium ${heroReady ? 'hp-hero-ready' : ''}`}>
        <div className="hp-hero-inner">
          <div className="hp-hero-copy">
            <span className="hp-hero-brand hp-hero-enter">REACHDESK</span>
            <h1 className="hp-hero-h1 hp-hero-enter hp-hero-enter-1">
              Your leads didn&apos;t ghost you.<br />You ghosted them.
            </h1>
            <p className="hp-hero-subhead hp-hero-enter hp-hero-enter-2">
              ReachDesk tells you who to follow up with today — so nothing slips while you&apos;re busy delivering client work.
            </p>
            <div className="hp-hero-ctas hp-hero-enter hp-hero-enter-3">
              <button type="button" onClick={handleSignUpClick} className="hp-btn-primary">
                {isLoggedIn ? 'Open dashboard' : TRIAL_MARKETING.headline}
              </button>
              <a href="#pricing" className="hp-btn-secondary">See pricing</a>
            </div>
          </div>

          <div className="hp-hero-visual hp-hero-enter hp-hero-enter-4">
            <img
              src={theme === 'dark' ? heroDark : heroLight}
              alt="ReachDesk CRM dashboard showing lead pipeline and follow-up reminders"
              className="hp-hero-mockup-img"
            />
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="hp-problem-section hp-reveal">
        <p className="hp-problem-text">
          Spreadsheets. Notes apps. Memory. That&apos;s how freelancers lose booked calls.
        </p>
      </section>

      {/* How it works */}
      <section className="hp-how-section hp-reveal">
        <span className="hp-section-label">How it works</span>
        <div className="hp-how-grid">
          {HOW_IT_WORKS_STEPS.map((item) => (
            <div key={item.step} className="hp-how-step">
              <span className="hp-how-step-num">{item.step}</span>
              <h3 className="hp-how-step-title">{item.title}</h3>
              <p className="hp-how-step-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features — four max */}
      <section id="features" className="hp-features-section hp-reveal">
        <span className="hp-section-label">What you get</span>
        <h2 className="hp-section-h2">
          Built for freelancers who<br />
          <span className="hp-section-h2-accent">can&apos;t afford to forget a follow-up.</span>
        </h2>

        <div className="hp-features-grid">
          {HOMEPAGE_FEATURES.map((feat) => {
            const Icon = FEATURE_ICONS[feat.id] || Columns;
            return (
              <article key={feat.id} className="hp-feature-card">
                <div className="hp-feature-icon-wrapper">
                  <Icon size={18} />
                </div>
                <h3 className="hp-feature-row-title">{feat.title}</h3>
                <p className="hp-feature-row-desc">{feat.desc}</p>
              </article>
            );
          })}
        </div>

        <p className="hp-integrations-note">
          Pro includes Google Calendar sync and Google Sheets import/export. Starter includes Sheets; Calendar is on Pro.
        </p>
      </section>

      {/* Pricing */}
      <section id="pricing" className="hp-pricing-section hp-reveal">
        <span className="hp-section-label">Pricing</span>
        <h2 className="hp-section-h2">
          Simple plans. Real limits.<br />
          <span className="hp-section-h2-accent">No fake AI promises.</span>
        </h2>

        <div className="hp-billing-toggle">
          <button
            type="button"
            className={`hp-billing-btn ${billing === 'monthly' ? 'active' : ''}`}
            onClick={() => setBilling('monthly')}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`hp-billing-btn ${billing === 'yearly' ? 'active' : ''}`}
            onClick={() => setBilling('yearly')}
          >
            Yearly
            <span className="hp-billing-save">Save 30%</span>
          </button>
        </div>

        <div className="hp-pricing-grid">
          {MARKETING_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`hp-pricing-card ${plan.highlighted ? 'starter-popular' : ''} ${plan.comingSoon ? 'disabled' : ''}`}
            >
              {plan.highlighted && <span className="hp-plan-popular-badge">Most Popular</span>}
              {plan.comingSoon && <span className="hp-plan-tag">Coming Soon</span>}

              <div>
                <div className="hp-plan-name">{plan.name}</div>
                <p className="hp-plan-tagline">{typeof plan.tagline === 'function' ? plan.tagline(billing) : plan.tagline}</p>
                <div className="hp-plan-price-label">
                  <div>{renderPlanPrice(plan.id)}</div>
                  <div className="hp-plan-price-sub">{renderPlanDetailsSub(plan.id)}</div>
                </div>
                <div className="hp-plan-price-details">
                  <div>{renderPlanBillingCycle(plan.id)}</div>
                  <div className="hp-plan-price-sub">{renderPlanBillingCycleSub(plan.id)}</div>
                </div>
              </div>

              <ul className="hp-plan-features-list">
                {plan.features.map((feat) => (
                  <li key={feat} className="hp-plan-feature-item">
                    <span className="hp-plan-feature-prefix">+</span>
                    {feat}
                  </li>
                ))}
              </ul>

              {plan.comingSoon ? (
                <button type="button" className="hp-plan-cta-btn disabled" disabled>
                  Coming soon
                </button>
              ) : (
                <button type="button" onClick={handleSignUpClick} className="hp-plan-cta-btn">
                  {plan.ctaLabel}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="hp-final-cta hp-reveal">
        <h2 className="hp-final-cta-title">Stop losing deals to forgotten follow-ups.</h2>
        <p className="hp-final-cta-sub">
          Free trial — {TRIAL_MARKETING.leads} leads, {TRIAL_MARKETING.templates} templates. You send every message; we keep you on track.
        </p>
        <button type="button" onClick={handleSignUpClick} className="hp-btn-primary hp-final-cta-btn">
          {isLoggedIn ? 'Open dashboard' : TRIAL_MARKETING.headline}
        </button>
      </section>

      <footer className="hp-footer">
        <span className="hp-footer-logo-text">REACHDESK</span>
        <div className="hp-footer-links-row">
          <a href={getMarketingUrl('/terms')} className="hp-footer-link-item">Terms of Service</a>
          <a href={getMarketingUrl('/privacy')} className="hp-footer-link-item">Privacy Policy</a>
          <a href={getMarketingUrl('/refund')} className="hp-footer-link-item">Refund Policy</a>
          <a href="mailto:support@reachdeskcrm.com" className="hp-footer-link-item">support@reachdeskcrm.com</a>
        </div>
      </footer>
    </div>
  );
}
