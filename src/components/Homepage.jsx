import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useAppContext } from '../App';

// Inline SVG social icons — lucide-react doesn't include these
const YouTubeIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.96-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
  </svg>
);

const InstagramIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
  </svg>
);

const BILLING = {
  monthly: {
    label: 'Monthly',
    badge: null,
    months: 1,
    starter: { usdPerMonth: '0.95', usdTotal: '0.95', pkrPerMonth: 275, pkrTotal: 275 },
    pro:     { usdPerMonth: '3.40', usdTotal: '3.40', pkrPerMonth: 935, pkrTotal: 935 },
    teams:   { usdPerMonth: '7.00', usdTotal: '7.00', pkrPerMonth: 1925, pkrTotal: 1925 },
  },
  quarterly: {
    label: 'Quarterly',
    badge: 'Save 10%',
    months: 3,
    starter: { usdPerMonth: '0.90', usdTotal: '2.70', pkrPerMonth: 248, pkrTotal: 744 },
    pro:     { usdPerMonth: '3.06', usdTotal: '9.18', pkrPerMonth: 842, pkrTotal: 2526 },
    teams:   { usdPerMonth: '6.30', usdTotal: '18.90', pkrPerMonth: 1733, pkrTotal: 5199 },
  },
  sixMonth: {
    label: '6-Month',
    badge: 'Save 15%',
    months: 6,
    starter: { usdPerMonth: '0.85', usdTotal: '5.10', pkrPerMonth: 234, pkrTotal: 1404 },
    pro:     { usdPerMonth: '2.89', usdTotal: '17.34', pkrPerMonth: 795, pkrTotal: 4770 },
    teams:   { usdPerMonth: '5.95', usdTotal: '35.70', pkrPerMonth: 1636, pkrTotal: 9816 },
  },
  yearly: {
    label: 'Yearly',
    badge: 'Best Value',
    months: 12,
    starter: { usdPerMonth: '0.80', usdTotal: '9.60', pkrPerMonth: 220, pkrTotal: 2640 },
    pro:     { usdPerMonth: '2.72', usdTotal: '32.64', pkrPerMonth: 748, pkrTotal: 8976 },
    teams:   { usdPerMonth: '5.60', usdTotal: '67.20', pkrPerMonth: 1540, pkrTotal: 18480 },
  }
};

export default function Homepage({ currentUserEmail, brandName = 'ReachDesk' }) {
  const { theme, toggleTheme } = useAppContext() || {};
  const isLoggedIn = !!currentUserEmail;
  const navigate = useNavigate();
  const [billing, setBilling] = useState('monthly');

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const timer = setTimeout(() => {
        const el = document.getElementById(hash.replace('#', ''));
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNavClick = (e, hash) => {
    e.preventDefault();
    window.history.pushState(null, '', `/homepage${hash}`);
    const el = document.getElementById(hash.replace('#', ''));
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSignUpClick = () => navigate(isLoggedIn ? '/dashboard' : '/signup');
  const handleLoginClick  = () => navigate(isLoggedIn ? '/dashboard' : '/login');

  return (
    <div className="hp-root">

      <nav className="hp-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => navigate('/homepage')}>
          <img src="/reachdesk-logo.svg" alt="ReachDesk CRM" height="28" style={{objectFit: 'contain'}} />
          <span className="hp-logo">REACHDESK</span>
        </div>
        <div className="hp-nav-center">
          <a href="#features" onClick={(e) => handleNavClick(e, '#features')} className="hp-nav-link">Features</a>
          <a href="#pricing"  onClick={(e) => handleNavClick(e, '#pricing')}  className="hp-nav-link">Pricing</a>
          <button onClick={handleLoginClick} className="hp-nav-link hp-nav-link-btn">Log in</button>
        </div>
        <div className="hp-nav-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {toggleTheme && (
            <button
              onClick={toggleTheme}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--hp-muted)', display: 'flex', alignItems: 'center', padding: '4px', transition: 'color 0.15s ease' }}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--hp-text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--hp-muted)'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}
          <button onClick={handleSignUpClick} className="hp-btn-primary">
            {isLoggedIn ? 'Dashboard' : 'Sign up free'}
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hp-hero">
        <div className="hp-section-tag">// CRM FOR FREELANCERS</div>
        <h1 className="hp-h1">
          Your leads.<br />
          Your pipeline.<br />
          <span className="hp-h1-accent">Your clients.</span>
        </h1>
        <p className="hp-hero-sub">
          Manage leads, track every touchpoint, and turn prospects into paying clients. One dashboard.
        </p>
        <div className="hp-hero-ctas">
          <button onClick={handleSignUpClick} className="hp-btn-primary hp-btn-lg">Get started free</button>
          <a href="#features" onClick={(e) => handleNavClick(e, '#features')} className="hp-btn-ghost hp-btn-lg">See features</a>
        </div>
      </section>

      {/* ── STATS ── */}
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
          <span className="hp-stat-number">Rs 450</span>
          <span className="hp-stat-label">Starting price / mo</span>
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section id="features" className="hp-features">
        <div className="hp-section-tag">// WHAT YOU GET</div>
        <h2 className="hp-h2">
          Built for solo operators.<br />
          <span className="hp-h2-accent">Not enterprises.</span>
        </h2>
        <div className="hp-features-grid">
          <div className="hp-feature-card">
            <span className="hp-feature-num">01</span>
            <h3 className="hp-feature-title">Unified pipeline</h3>
            <p className="hp-feature-desc">Track every lead from cold contact to closed won. No spreadsheets.</p>
          </div>
          <div className="hp-feature-card">
            <span className="hp-feature-num">02</span>
            <h3 className="hp-feature-title">Smart folders</h3>
            <p className="hp-feature-desc">Organize by status, priority, or platform. Your system, your rules.</p>
          </div>
          <div className="hp-feature-card">
            <span className="hp-feature-num">03</span>
            <h3 className="hp-feature-title">Convert to client</h3>
            <p className="hp-feature-desc">One click to move a lead into your client roster with full history intact.</p>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="hp-pricing">
        <div className="hp-section-tag">// PRICING</div>
        <h2 className="hp-h2">Simple pricing.<br />No surprises.</h2>

        {/* Billing period toggle */}
        <div style={{ display: 'flex', gap: 0, border: '0.5px solid var(--hp-border)', borderRadius: '3px', overflow: 'hidden', width: 'fit-content', marginBottom: '2.5rem', marginTop: '1.5rem' }}>
          {Object.entries(BILLING).map(([key, info]) => {
            const isActive = billing === key;
            return (
              <button
                key={key}
                onClick={() => setBilling(key)}
                style={{
                  padding: '8px 16px',
                  background: isActive ? 'var(--hp-blue)' : 'transparent',
                  color: isActive ? '#0D1117' : 'var(--hp-muted)',
                  border: 'none',
                  borderRight: key !== 'yearly' ? '0.5px solid var(--hp-border)' : 'none',
                  cursor: 'pointer',
                  fontFamily: 'Mattone, serif',
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
                  <span style={{ fontSize: '0.6rem', color: isActive ? '#0D1117' : 'var(--hp-green)', fontWeight: 600 }}>
                    {info.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Cards grid — 3 columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1px', border: '0.5px solid var(--hp-border)', borderRadius: '3px', overflow: 'hidden', width: '100%' }}>

          {/* STARTER — active, Most Popular */}
          <div style={{ background: 'var(--hp-card)', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', borderRight: '0.5px solid var(--hp-border)' }}>
            {billing !== 'monthly' && (
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(91, 143, 185, 0.1)',
                color: 'var(--hp-blue)',
                border: '1px solid var(--hp-blue)',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '3px',
                letterSpacing: '0.04em',
                fontFamily: 'Mattone, serif'
              }}>
                {billing === 'quarterly' ? 'Save 10%' : billing === 'sixMonth' ? 'Save 15%' : 'Best Value'}
              </div>
            )}
            <div style={{ position: 'absolute', top: 0, left: '2.5rem', background: 'var(--hp-blue)', color: '#0D1117', fontFamily: 'Mattone, serif', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '0 0 3px 3px' }}>
              Most Popular
            </div>
            <div>
              <div className="hp-plan-name" style={{ marginBottom: '0.5rem' }}>Starter</div>
              <div className="hp-plan-price" style={{ fontFamily: 'Mattone, serif', fontSize: '2.2rem' }}>
                ${BILLING[billing].starter.usdPerMonth}/mo <span style={{ fontSize: '1rem', color: 'var(--hp-muted)', fontWeight: 400 }}>({`Rs. ${BILLING[billing].starter.pkrPerMonth}/mo`})</span>
              </div>
              <div style={{ fontFamily: 'Mattone, serif', fontSize: '0.72rem', color: 'var(--hp-muted)', letterSpacing: '0.04em', marginTop: '4px' }}>
                {billing === 'monthly' ? '$0.95 billed monthly' : `$${BILLING[billing].starter.usdTotal} billed every ${BILLING[billing].months} months`}
              </div>
            </div>
            <ul className="hp-feature-list">
              {['600 leads', '20 templates', 'Smart folders', 'CSV import', 'Notes', 'Convert to client'].map(f => (
                <li key={f} className="hp-feature-active"><span className="hp-fl-prefix">+</span> {f}</li>
              ))}
            </ul>
            <button onClick={handleSignUpClick} className="hp-btn-primary hp-plan-cta">Get Starter</button>
          </div>

          {/* PRO — coming soon / greyed */}
          <div style={{ background: 'var(--hp-card)', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', opacity: 0.45, borderRight: '0.5px solid var(--hp-border)' }}>
            {billing !== 'monthly' && (
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(91, 143, 185, 0.1)',
                color: 'var(--hp-blue)',
                border: '1px solid var(--hp-blue)',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '3px',
                letterSpacing: '0.04em',
                fontFamily: 'Mattone, serif'
              }}>
                {billing === 'quarterly' ? 'Save 10%' : billing === 'sixMonth' ? 'Save 15%' : 'Best Value'}
              </div>
            )}
            <div style={{ position: 'absolute', top: 0, left: '2.5rem', background: 'var(--hp-border)', color: 'var(--hp-muted)', fontFamily: 'Mattone, serif', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '0 0 3px 3px' }}>
              Coming Soon
            </div>
            <div>
              <div className="hp-plan-name" style={{ marginBottom: '0.5rem' }}>Pro</div>
              <div className="hp-plan-price" style={{ fontFamily: 'Mattone, serif', fontSize: '2.2rem' }}>
                ${BILLING[billing].pro.usdPerMonth}/mo <span style={{ fontSize: '1rem', color: 'var(--hp-muted)', fontWeight: 400 }}>({`Rs. ${BILLING[billing].pro.pkrPerMonth}/mo`})</span>
              </div>
              <div style={{ fontFamily: 'Mattone, serif', fontSize: '0.72rem', color: 'var(--hp-muted)', letterSpacing: '0.04em', marginTop: '4px' }}>
                {billing === 'monthly' ? '$3.40 billed monthly' : `$${BILLING[billing].pro.usdTotal} billed every ${BILLING[billing].months} months`}
              </div>
            </div>
            <ul className="hp-feature-list">
              {['2500 leads', 'Unlimited templates', 'Smart folders', 'CSV import', 'Notes', 'Convert to client', 'AI Commands', 'MCP Connect'].map(f => (
                <li key={f} className="hp-feature-active"><span className="hp-fl-prefix">+</span> {f}</li>
              ))}
            </ul>
            <button disabled className="hp-btn-ghost hp-plan-cta" style={{ cursor: 'not-allowed' }}>Coming Soon</button>
          </div>

          {/* TEAMS — coming soon / greyed */}
          <div style={{ background: 'var(--hp-card)', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', opacity: 0.35 }}>
            {billing !== 'monthly' && (
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(91, 143, 185, 0.1)',
                color: 'var(--hp-blue)',
                border: '1px solid var(--hp-blue)',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '3px',
                letterSpacing: '0.04em',
                fontFamily: 'Mattone, serif'
              }}>
                {billing === 'quarterly' ? 'Save 10%' : billing === 'sixMonth' ? 'Save 15%' : 'Best Value'}
              </div>
            )}
            <div style={{ position: 'absolute', top: 0, left: '2.5rem', background: 'var(--hp-border)', color: 'var(--hp-muted)', fontFamily: 'Mattone, serif', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '0 0 3px 3px' }}>
              Coming Soon
            </div>
            <div>
              <div className="hp-plan-name" style={{ marginBottom: '0.5rem' }}>Teams</div>
              <div className="hp-plan-price" style={{ fontFamily: 'Mattone, serif', fontSize: '2.2rem' }}>
                ${BILLING[billing].teams.usdPerMonth}/mo <span style={{ fontSize: '1rem', color: 'var(--hp-muted)', fontWeight: 400 }}>({`Rs. ${BILLING[billing].teams.pkrPerMonth}/mo`})</span>
              </div>
              <div style={{ fontFamily: 'Mattone, serif', fontSize: '0.72rem', color: 'var(--hp-muted)', letterSpacing: '0.04em', marginTop: '4px' }}>
                {billing === 'monthly' ? '$7.00 billed monthly' : `$${BILLING[billing].teams.usdTotal} billed every ${BILLING[billing].months} months`}
              </div>
            </div>
            <ul className="hp-feature-list">
              {['Everything in Pro', 'Multiple seats', 'Team workspace', 'Shared pipelines', 'Role-based access', 'Team analytics', 'Priority support'].map(f => (
                <li key={f} className="hp-feature-active"><span className="hp-fl-prefix">+</span> {f}</li>
              ))}
            </ul>
            <button disabled className="hp-btn-ghost hp-plan-cta" style={{ cursor: 'not-allowed' }}>Coming Soon</button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="hp-footer">
        <span className="hp-footer-logo">REACHDESK</span>
        <div className="hp-footer-links">
          <Link to="/terms"    className="hp-footer-link">Terms of Service</Link>
          <Link to="/privacy"  className="hp-footer-link">Privacy Policy</Link>
          <Link to="/refund"   className="hp-footer-link">Refund Policy</Link>
          <a href="mailto:reachdesk.io@gmail.com" className="hp-footer-link">reachdesk.io@gmail.com</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          <a
            href="https://www.youtube.com/@ReachDeskcrm"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--hp-muted)', transition: 'color 0.15s ease', display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--hp-text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--hp-muted)'}
            title="ReachDesk on YouTube"
          >
            <YouTubeIcon size={18} />
          </a>
          <a
            href="https://www.instagram.com/reachdeskcrm/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--hp-muted)', transition: 'color 0.15s ease', display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--hp-text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--hp-muted)'}
            title="ReachDesk on Instagram"
          >
            <InstagramIcon size={18} />
          </a>
        </div>
      </footer>

    </div>
  );
}
