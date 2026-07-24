import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Check } from 'lucide-react';
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
import HeroVisual from './marketing/HeroVisual';
import { FeatureMedia, StepMedia } from './marketing/MarketingMedia';
import { Helmet } from 'react-helmet-async';
import { siteMeta, generateOGTags } from '../config/metadata';
import { getAppUrl, getMarketingUrl, isLocalDev } from '../utils/domain';

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
    const months = BILLING[billing].months;
    if (country === 'PK') {
      return billing === 'monthly'
        ? `Rs ${cycle.pkrTotal} billed monthly`
        : `Rs ${cycle.pkrTotal} billed every ${months} months`;
    }
    if (country === 'BD') {
      return billing === 'monthly'
        ? `৳${cycle.bdtTotal.toFixed(0)} billed monthly`
        : `৳${cycle.bdtTotal.toFixed(0)} billed every ${months} months`;
    }
    return billing === 'monthly'
      ? `$${cycle.usdTotal} billed monthly`
      : `$${cycle.usdTotal} billed every ${months} months`;
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
        <div className="hp-nav-inner">
          <button
            type="button"
            className="hp-logo-btn"
            onClick={() => (isLocalDev() ? navigate('/homepage') : (window.location.href = getMarketingUrl('/homepage')))}
          >
            <span className="hp-logo">REACHDESK CRM</span>
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
        </div>
      </nav>

      <section className={`hp-hero-section hp-hero-premium ${heroReady ? 'hp-hero-ready' : ''}`}>
        <div className="hp-hero-inner">
          <div className="hp-hero-copy">
            <h1 className="hp-hero-h1 hp-hero-enter">
              Your leads didn&apos;t ghost you.<br />You ghosted them.
            </h1>
            <p className="hp-hero-subhead hp-hero-enter hp-hero-enter-1">
              ReachDesk tells you who to follow up with today — so nothing slips while you&apos;re busy delivering client work.
            </p>
            <div className="hp-hero-ctas hp-hero-enter hp-hero-enter-2">
              <button type="button" onClick={handleSignUpClick} className="hp-btn-primary">
                {isLoggedIn ? 'Open dashboard' : TRIAL_MARKETING.headline}
              </button>
              <a href="#pricing" className="hp-btn-secondary">See pricing</a>
            </div>
          </div>

          <HeroVisual
            theme={theme}
            posterDark={heroDark}
            posterLight={heroLight}
            className="hp-hero-visual hp-hero-enter hp-hero-enter-3"
          />
        </div>
      </section>

      <section className="hp-problem-section hp-reveal">
        <div className="hp-section-inner">
          <p className="hp-problem-text">
            Spreadsheets. Notes apps. Memory. That&apos;s how freelancers lose booked calls.
          </p>
        </div>
      </section>

      <section className="hp-how-section hp-reveal">
        <div className="hp-section-inner">
          <span className="hp-section-label">How it works</span>
          <div className="hp-how-grid">
            {HOW_IT_WORKS_STEPS.map((item) => (
              <div key={item.step} className="hp-how-step">
                <StepMedia step={Number(item.step)} title={item.title} theme={theme} />
                <span className="hp-how-step-num">Step {item.step}</span>
                <h3 className="hp-how-step-title">{item.title}</h3>
                <p className="hp-how-step-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="hp-features-section hp-reveal">
        <div className="hp-section-inner">
          <span className="hp-section-label">What you get</span>
          <h2 className="hp-section-h2">
            Built for freelancers who<br />
            <span className="hp-section-h2-accent">can&apos;t afford to forget a follow-up.</span>
          </h2>

          <div className="hp-features-grid">
            {HOMEPAGE_FEATURES.map((feat) => (
              <article key={feat.id} className="hp-feature-card">
                <FeatureMedia featureId={feat.id} title={feat.title} theme={theme} />
                <h3 className="hp-feature-row-title">{feat.title}</h3>
                <p className="hp-feature-row-desc">{feat.desc}</p>
              </article>
            ))}
          </div>

          <p className="hp-integrations-note">
            Pro includes Google Calendar sync and Google Sheets import/export. Starter includes Sheets; Calendar is on Pro.
          </p>
        </div>
      </section>

      <section id="pricing" className="hp-pricing-section hp-reveal">
        <div className="hp-section-inner">
          <span className="hp-section-label">Pricing</span>
          <h2 className="hp-section-h2">
            Simple plans. Real limits.<br />
            <span className="hp-section-h2-accent">No fake AI promises.</span>
          </h2>

          <div className="rd-billing-toggle-wrap">
            <div className="rd-billing-toggle">
              {Object.entries(BILLING).map(([key, info]) => (
                <button
                  key={key}
                  type="button"
                  className={`rd-billing-btn ${billing === key ? 'active' : ''}`}
                  onClick={() => setBilling(key)}
                >
                  {info.label}
                  {info.badge && <span className="rd-billing-save">{info.badge}</span>}
                </button>
              ))}
            </div>
          </div>

          {billing === 'yearly' && (
            <p className="rd-pricing-yearly-callout">Yearly plans include 2× lead capacity.</p>
          )}

          <div className="rd-pricing-grid">
            {MARKETING_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`rd-pricing-card ${plan.highlighted ? 'rd-pricing-popular' : ''} ${plan.comingSoon ? 'disabled' : ''}`}
              >
                {plan.highlighted && <span className="rd-pricing-popular-badge">Most Popular</span>}
                {plan.comingSoon && <span className="rd-pricing-tag">Coming Soon</span>}

                <div className="rd-pricing-card-header">
                  <div className="rd-pricing-plan-name">{plan.name}</div>
                  <p className="rd-pricing-tagline">
                    {typeof plan.tagline === 'function' ? plan.tagline(billing) : plan.tagline}
                  </p>
                  <div className="rd-pricing-price-main">
                    <span className="rd-pricing-price-amount">{renderPlanPrice(plan.id)}</span>
                    <span className="rd-pricing-price-sub">{renderPlanDetailsSub(plan.id)}</span>
                  </div>
                  <div className="rd-pricing-price-billing">
                    <span>{renderPlanBillingCycle(plan.id)}</span>
                    <span className="rd-pricing-price-sub">{renderPlanBillingCycleSub(plan.id)}</span>
                  </div>
                </div>

                <ul className="rd-pricing-features">
                  {(plan.getFeatures ? plan.getFeatures(billing) : []).map((feat, i) => {
                    const isObj = typeof feat === 'object';
                    const label = isObj ? feat.label : feat;
                    return (
                      <li key={`${plan.id}-${label}-${i}`} className="rd-pricing-feature">
                        <Check size={14} className="rd-pricing-feature-icon" aria-hidden />
                        <span className="rd-pricing-feature-text">{label}</span>
                        {isObj && feat.badge && (
                          <span className="rd-pricing-feature-badge">{feat.badge}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {plan.comingSoon ? (
                  <button type="button" className="rd-pricing-cta disabled" disabled>
                    Coming soon
                  </button>
                ) : (
                  <button type="button" onClick={handleSignUpClick} className="rd-pricing-cta">
                    {plan.ctaLabel}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="hp-final-cta hp-reveal">
        <div className="hp-section-inner">
          <h2 className="hp-final-cta-title">Stop losing deals to forgotten follow-ups.</h2>
          <p className="hp-final-cta-sub">
            {TRIAL_MARKETING.detail}. You send every message; we keep you on track.
          </p>
          <button type="button" onClick={handleSignUpClick} className="hp-btn-primary hp-final-cta-btn">
            {isLoggedIn ? 'Open dashboard' : TRIAL_MARKETING.headline}
          </button>
        </div>
      </section>

      <footer className="hp-footer">
        <div className="hp-footer-inner">
          <span className="hp-footer-logo-text">REACHDESK CRM</span>
          <div className="hp-footer-links-row">
            <a href={getMarketingUrl('/terms')} className="hp-footer-link-item">Terms of Service</a>
            <a href={getMarketingUrl('/privacy')} className="hp-footer-link-item">Privacy Policy</a>
            <a href={getMarketingUrl('/refund')} className="hp-footer-link-item">Refund Policy</a>
            <a href="mailto:support@reachdeskcrm.com" className="hp-footer-link-item">support@reachdeskcrm.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
