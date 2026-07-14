import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sun, Moon, Columns, Clock, PenTool, FileText, TrendingUp, BookOpen } from 'lucide-react';
import { useAppContext } from '../App';
import { BILLING } from './Paywalls';
import { useLocalCurrency } from '../utils/useLocalCurrency';
import heroDark from '../assets/hero.png';
import heroLight from '../assets/hero_light.png';

export default function Homepage({ currentUserEmail }) {
  const navigate = useNavigate();
  const { theme: appTheme, toggleTheme: toggleAppTheme } = useAppContext() || {};
  const { formatLocalPrice, country, rate } = useLocalCurrency();

  // ── Theme State (Persisted) ────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('hp-theme');
    if (saved) return saved;
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    return prefersLight ? 'light' : 'dark';
  });

  const toggleHomepageTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('hp-theme', nextTheme);
  };

  const isLoggedIn = !!currentUserEmail;
  const handleSignUpClick = () => navigate(isLoggedIn ? '/dashboard' : '/signup');
  const handleLoginClick  = () => navigate(isLoggedIn ? '/dashboard' : '/login');

  // ── Hero Tab State ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('pipeline'); // 'pipeline' | 'reminders' | 'templates'

  const tabContents = {
    pipeline: {
      eyebrow: '// CRM for freelancers & agency owners',
      title: 'Your leads.\nYour pipeline.\nYour clients.',
      subhead: 'Manage leads, track every touchpoint, and turn prospects into paying clients — all from one dashboard you control.',
    },
    reminders: {
      eyebrow: '// Never forget to follow up',
      title: 'Set. Forget.\nNever drift.',
      subhead: 'Set a lead to Contacted and ReachDesk CRM schedules the follow-ups for you — so nothing quietly falls through the cracks.',
    },
    templates: {
      eyebrow: '// Personal template library',
      title: 'Save your best\nreplies once.',
      subhead: 'Save your best messages once. Reuse them in seconds with smart placeholders for name, niche, and more.',
    }
  };

  // ── Local Price Conversions ────────────────────────────────────────────────
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

  const [billing, setBilling] = useState('monthly'); // 'monthly' | 'yearly'

  const renderPlanPrice = (planId) => {
    if (country === 'PK') {
      return `Rs ${BILLING[billing][planId].pkrPerMonth}`;
    }
    if (country === 'BD') {
      return `৳${BILLING[billing][planId].bdtPerMonth.toFixed(0)}`;
    }
    return `$${BILLING[billing][planId].usdPerMonth}`;
  };

  const renderPlanDetailsSub = (planId) => {
    if (country === 'PK') {
      return getUsdEquivalent(BILLING[billing][planId].pkrPerMonth);
    }
    if (country === 'BD') {
      return getUsdEquivalent(BILLING[billing][planId].bdtPerMonth);
    }
    const formatted = formatLocalPrice(BILLING[billing][planId].usdPerMonth);
    return formatted ? `${formatted}/mo` : '';
  };

  const renderPlanBillingCycle = (planId) => {
    if (country === 'PK') {
      return billing === 'monthly'
        ? `Rs ${BILLING.monthly[planId].pkrTotal} billed monthly`
        : `Rs ${BILLING[billing][planId].pkrTotal} billed every 12 months`;
    }
    if (country === 'BD') {
      return billing === 'monthly'
        ? `৳${BILLING.monthly[planId].bdtTotal.toFixed(0)} billed monthly`
        : `৳${BILLING[billing][planId].bdtTotal.toFixed(0)} billed every 12 months`;
    }
    return billing === 'monthly'
      ? `$${BILLING.monthly[planId].usdTotal} billed monthly`
      : `$${BILLING[billing][planId].usdTotal} billed every 12 months`;
  };

  const renderPlanBillingCycleSub = (planId) => {
    if (country === 'PK') {
      return getUsdEquivalentTotal(BILLING[billing][planId].pkrTotal);
    }
    if (country === 'BD') {
      return getUsdEquivalentTotal(BILLING[billing][planId].bdtTotal);
    }
    const formatted = formatLocalPrice(BILLING[billing][planId].usdTotal);
    return formatted ? `${formatted} total` : '';
  };

  return (
    <div className="hp-root" data-theme={theme}>
      {/* ── 1. NAV ── */}
      <nav className="hp-nav">
        <div 
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} 
          onClick={() => navigate('/homepage')}
        >
          <span className="hp-logo">REACHDESK CRM</span>
        </div>

        <div className="hp-nav-center">
          <a href="#features" className="hp-nav-link">Features</a>
          <a href="#pricing" className="hp-nav-link">Pricing</a>
          <Link to="/blog" className="hp-nav-link">Blog</Link>
          <button onClick={handleLoginClick} className="hp-nav-link">Log in</button>
        </div>

        <div className="hp-nav-right">
          <button
            onClick={toggleHomepageTheme}
            className="hp-theme-toggle"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button onClick={handleSignUpClick} className="hp-btn-primary">
            {isLoggedIn ? 'Dashboard' : 'Sign up free'}
          </button>
        </div>
      </nav>

      {/* ── 2. HERO ── */}
      <section className="hp-hero-section">
        <div className={`hp-hero-card theme-${theme} tab-${activeTab}`}>
          <div className="hp-hero-layout">
            {/* Left Column Content */}
            <div className="hp-hero-left">
              <span className="hp-hero-eyebrow">{tabContents[activeTab].eyebrow}</span>
              <h1 className="hp-hero-h1" style={{ whiteSpace: 'pre-line' }}>
                {tabContents[activeTab].title}
              </h1>
              <p className="hp-hero-subhead">
                {tabContents[activeTab].subhead}
              </p>
              <div className="hp-hero-ctas">
                <button onClick={handleSignUpClick} className="hp-btn-primary">Get started free</button>
                <a href="#features" className="hp-btn-secondary">See features</a>
              </div>
            </div>

            {/* Right Column Floating Mockup */}
            <div className="hp-hero-right">
              <div className="hp-hero-mockup-container">
                <img 
                  src={theme === 'dark' ? heroDark : heroLight} 
                  alt="ReachDesk CRM Dashboard Screenshot" 
                  className="hp-hero-mockup-img"
                />
              </div>
            </div>
          </div>

          {/* Hero Bottom Tabs */}
          <div className="hp-hero-tabs">
            <button 
              className={`hp-hero-tab ${activeTab === 'pipeline' ? 'active' : ''}`}
              onClick={() => setActiveTab('pipeline')}
            >
              <span className="hp-hero-tab-label">Pipeline & Leads</span>
              <span className="hp-hero-tab-desc">Control your pipeline layout</span>
            </button>
            <button 
              className={`hp-hero-tab ${activeTab === 'reminders' ? 'active' : ''}`}
              onClick={() => setActiveTab('reminders')}
            >
              <span className="hp-hero-tab-label">Follow-up Reminders</span>
              <span className="hp-hero-tab-desc">Never lose contact again</span>
            </button>
            <button 
              className={`hp-hero-tab ${activeTab === 'templates' ? 'active' : ''}`}
              onClick={() => setActiveTab('templates')}
            >
              <span className="hp-hero-tab-label">Templates & Notes</span>
              <span className="hp-hero-tab-desc">Drop placeholders in seconds</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── 3. STATS ROW ── */}
      <div className="hp-stats-row">
        <div className="hp-stat-col">
          <span className="hp-stat-number">2.4k</span>
          <span className="hp-stat-label">Leads managed</span>
        </div>
        <div className="hp-stat-col">
          <span className="hp-stat-number">94%</span>
          <span className="hp-stat-label">Conversion tracked</span>
        </div>
        <div className="hp-stat-col">
          {country === 'PK' ? (
            <>
              <span className="hp-stat-number">Rs 350</span>
              <span className="hp-stat-label">Starting price / mo · $1.26/mo</span>
            </>
          ) : country === 'BD' ? (
            <>
              <span className="hp-stat-number">৳155</span>
              <span className="hp-stat-label">Starting price / mo · $1.26/mo</span>
            </>
          ) : (
            <>
              <span className="hp-stat-number">$5.00</span>
              <span className="hp-stat-label">Starting price / mo</span>
            </>
          )}
        </div>
      </div>

      {/* ── 4. FEATURES ── */}
      <section id="features" className="hp-features-section">
        <span className="hp-section-label">// WHAT YOU GET</span>
        <h2 className="hp-section-h2">
          Everything a freelancer needs<br />
          <span className="hp-section-h2-accent">to close more clients.</span>
        </h2>

        <div className="hp-features-list">
          {/* Row 1 */}
          <div className="hp-feature-row">
            <div className="hp-feature-icon-wrapper">
              <Columns size={16} />
            </div>
            <div className="hp-feature-row-content">
              <span className="hp-feature-row-title">Pipeline view</span>
              <span className="hp-feature-row-desc">
                Every lead's status, notes, and history in one place — list or pipeline view.
              </span>
            </div>
          </div>

          {/* Row 2 */}
          <div className="hp-feature-row">
            <div className="hp-feature-icon-wrapper">
              <Clock size={16} />
            </div>
            <div className="hp-feature-row-content">
              <span className="hp-feature-row-title">Follow-up reminders</span>
              <span className="hp-feature-row-desc">
                Mark a lead Contacted and ReachDesk CRM schedules the reminders for you.
              </span>
            </div>
          </div>

          {/* Row 3 */}
          <div className="hp-feature-row">
            <div className="hp-feature-icon-wrapper">
              <PenTool size={16} />
            </div>
            <div className="hp-feature-row-content">
              <span className="hp-feature-row-title">Reusable templates</span>
              <span className="hp-feature-row-desc">
                Save your best messages once, drop in [Name] and [niche], reuse in seconds.
              </span>
            </div>
          </div>

          {/* Row 4 */}
          <div className="hp-feature-row">
            <div className="hp-feature-icon-wrapper">
              <FileText size={16} />
            </div>
            <div className="hp-feature-row-content">
              <span className="hp-feature-row-title">Instant invoices</span>
              <span className="hp-feature-row-desc">
                Add services, apply tax, share a payment link — PKR, USD, GBP, EUR and more.
              </span>
            </div>
          </div>

          {/* Row 5 */}
          <div className="hp-feature-row">
            <div className="hp-feature-icon-wrapper">
              <TrendingUp size={16} />
            </div>
            <div className="hp-feature-row-content">
              <span className="hp-feature-row-title">Earnings, tracked</span>
              <span className="hp-feature-row-desc">
                See what you've made by client and currency, at a glance.
              </span>
            </div>
          </div>

          {/* Row 6 */}
          <div className="hp-feature-row">
            <div className="hp-feature-icon-wrapper">
              <BookOpen size={16} />
            </div>
            <div className="hp-feature-row-content">
              <span className="hp-feature-row-title">Notes & planning</span>
              <span className="hp-feature-row-desc">
                Rich text, to-dos, and a freehand canvas — organized per client, in folders.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. PRICING ── */}
      <section id="pricing" className="hp-pricing-section">
        <span className="hp-section-label">// PRICING</span>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '3rem' }}>
          <h2 className="hp-section-h2" style={{ margin: 0 }}>
            Simple pricing.<br />
            <span className="hp-section-h2-accent">No surprises.</span>
          </h2>

          {/* Billing Toggle Selector */}
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '3px', padding: '2px', background: 'var(--bg-elevated)' }}>
            <button 
              onClick={() => setBilling('monthly')}
              style={{
                fontFamily: 'Mattone, sans-serif',
                fontSize: '10px',
                border: 'none',
                background: billing === 'monthly' ? 'var(--accent-blue)' : 'transparent',
                color: billing === 'monthly' ? '#0d1117' : 'var(--text-muted)',
                padding: '4px 10px',
                borderRadius: '2px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Monthly
            </button>
            <button 
              onClick={() => setBilling('yearly')}
              style={{
                fontFamily: 'Mattone, sans-serif',
                fontSize: '10px',
                border: 'none',
                background: billing === 'yearly' ? 'var(--accent-blue)' : 'transparent',
                color: billing === 'yearly' ? '#0d1117' : 'var(--text-muted)',
                padding: '4px 10px',
                borderRadius: '2px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="hp-pricing-grid">
          {/* STARTER */}
          <div className="hp-pricing-card starter-popular">
            <span className="hp-plan-popular-badge">Most Popular</span>
            <div>
              <div className="hp-plan-name">Starter</div>
              <div className="hp-plan-price-label">
                <div>{renderPlanPrice('starter')}</div>
                <div className="hp-plan-price-sub">
                  {renderPlanDetailsSub('starter')}
                </div>
              </div>
              <div className="hp-plan-price-details" style={{ marginTop: '0.5rem' }}>
                <div>{renderPlanBillingCycle('starter')}</div>
                <div style={{ opacity: 0.8 }}>
                  {renderPlanBillingCycleSub('starter')}
                </div>
              </div>
            </div>
            
            <ul className="hp-plan-features-list">
              <li className="hp-plan-feature-item">
                <span className="hp-plan-feature-prefix">+</span>
                {billing === 'yearly' ? '2,000 leads' : '1,000 leads (2,000 if billed yearly)'}
              </li>
              <li className="hp-plan-feature-item">
                <span className="hp-plan-feature-prefix">+</span>
                10 templates
              </li>
              <li className="hp-plan-feature-item">
                <span className="hp-plan-feature-prefix">+</span>
                Smart folders
              </li>
              <li className="hp-plan-feature-item">
                <span className="hp-plan-feature-prefix">+</span>
                CSV import
              </li>
              <li className="hp-plan-feature-item">
                <span className="hp-plan-feature-prefix">+</span>
                Notes
              </li>
              <li className="hp-plan-feature-item">
                <span className="hp-plan-feature-prefix">+</span>
                Convert to client
              </li>
            </ul>
            
            <button 
              onClick={handleSignUpClick} 
              className="hp-plan-cta-btn"
              style={{ backgroundColor: 'var(--accent-blue)', color: '#0D1117' }}
            >
              Get Starter
            </button>
          </div>

          {/* PRO */}
          <div className="hp-pricing-card disabled">
            <span className="hp-plan-tag">Coming Soon</span>
            <div>
              <div className="hp-plan-name">Pro</div>
              <div className="hp-plan-price-label">
                <div>{renderPlanPrice('pro')}</div>
                <div className="hp-plan-price-sub">
                  {renderPlanDetailsSub('pro')}
                </div>
              </div>
              <div className="hp-plan-price-details" style={{ marginTop: '0.5rem' }}>
                <div>{renderPlanBillingCycle('pro')}</div>
                <div style={{ opacity: 0.8 }}>
                  {renderPlanBillingCycleSub('pro')}
                </div>
              </div>
            </div>
            
            <ul className="hp-plan-features-list">
              <li className="hp-plan-feature-item">
                <span className="hp-plan-feature-prefix">+</span>
                {billing === 'yearly' ? '10,000 leads' : '5,000 leads (10,000 if billed yearly)'}
              </li>
              <li className="hp-plan-feature-item">
                <span className="hp-plan-feature-prefix">+</span>
                Unlimited templates
              </li>
              <li className="hp-plan-feature-item">
                <span className="hp-plan-feature-prefix">+</span>
                Smart folders
              </li>
              <li className="hp-plan-feature-item">
                <span className="hp-plan-feature-prefix">+</span>
                AI Commands
              </li>
              <li className="hp-plan-feature-item">
                <span className="hp-plan-feature-prefix">+</span>
                MCP Connect
              </li>
            </ul>
            
            <button className="hp-plan-cta-btn disabled" disabled>
              Coming soon
            </button>
          </div>

          {/* TEAMS */}
          <div className="hp-pricing-card disabled">
            <span className="hp-plan-tag">Coming Soon</span>
            <div>
              <div className="hp-plan-name">Teams</div>
              <div className="hp-plan-price-label">
                <div>{renderPlanPrice('teams')}</div>
                <div className="hp-plan-price-sub">
                  {renderPlanDetailsSub('teams')}
                </div>
              </div>
              <div className="hp-plan-price-details" style={{ marginTop: '0.5rem' }}>
                <div>{renderPlanBillingCycle('teams')}</div>
                <div style={{ opacity: 0.8 }}>
                  {renderPlanBillingCycleSub('teams')}
                </div>
              </div>
            </div>
            
            <ul className="hp-plan-features-list">
              <li className="hp-plan-feature-item">
                <span className="hp-plan-feature-prefix">+</span>
                Everything in Pro
              </li>
              <li className="hp-plan-feature-item">
                <span className="hp-plan-feature-prefix">+</span>
                Multiple seats
              </li>
              <li className="hp-plan-feature-item">
                <span className="hp-plan-feature-prefix">+</span>
                Shared pipelines
              </li>
              <li className="hp-plan-feature-item">
                <span className="hp-plan-feature-prefix">+</span>
                Role-based access
              </li>
              <li className="hp-plan-feature-item">
                <span className="hp-plan-feature-prefix">+</span>
                Team analytics
              </li>
            </ul>
            
            <button className="hp-plan-cta-btn disabled" disabled>
              Coming soon
            </button>
          </div>
        </div>
      </section>

      {/* ── 6. FOOTER ── */}
      <footer className="hp-footer">
        <span className="hp-footer-logo-text">REACHDESK CRM</span>
        <div className="hp-footer-links-row">
          <Link to="/terms" className="hp-footer-link-item">Terms of Service</Link>
          <Link to="/privacy" className="hp-footer-link-item">Privacy Policy</Link>
          <Link to="/refund" className="hp-footer-link-item">Refund Policy</Link>
          <a href="mailto:support@esemdot.com" className="hp-footer-link-item">support@esemdot.com</a>
        </div>
      </footer>
    </div>
  );
}
