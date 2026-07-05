import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useAppContext } from '../App';
import { BILLING } from './Paywalls';
import { useLocalCurrency } from '../utils/useLocalCurrency';

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

// BILLING is imported from Paywalls.jsx — single source of truth

export default function Homepage({ currentUserEmail, brandName = 'ReachDesk' }) {
  const { theme, toggleTheme } = useAppContext() || {};
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
          <span style={{fontFamily:'Mattone, sans-serif', textTransform:'uppercase', letterSpacing:'0.08em', fontSize:'11px', color:'var(--text-primary)', fontWeight:'400'}}>ReachDesk</span>
        </div>
        <div className="hp-nav-center">
          <a href="#features" onClick={(e) => handleNavClick(e, '#features')} className="hp-nav-link">Features</a>
          <Link to="/get-started" className="hp-nav-link" style={{ textDecoration: 'none' }}>Get Started</Link>
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
        <div className="hp-stat-col" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span className="hp-stat-number">
            {(() => {
              if (country === 'BD') return `৳${BILLING.monthly.starter.bdtPerMonth}`;
              if (country === 'PK') return `Rs ${BILLING.monthly.starter.pkrPerMonth}`;
              return `$${BILLING.monthly.starter.usdPerMonth}`;
            })()}
          </span>
          <span className="hp-stat-label">Starting price / mo</span>
          {(() => {
            if (country === 'PK') {
              return (
                <span style={{ fontSize: '0.75rem', color: 'var(--hp-muted)', marginTop: '4px' }}>
                  {getUsdEquivalent(BILLING.monthly.starter.pkrPerMonth)}
                </span>
              );
            }
            if (country === 'BD') {
              return (
                <span style={{ fontSize: '0.75rem', color: 'var(--hp-muted)', marginTop: '4px' }}>
                  {getUsdEquivalent(BILLING.monthly.starter.bdtPerMonth)}
                </span>
              );
            }
            const formatted = formatLocalPrice(BILLING.monthly.starter.usdPerMonth);
            return formatted ? (
              <span style={{ fontSize: '0.75rem', color: 'var(--hp-muted)', marginTop: '4px' }}>
                {formatted}/mo
              </span>
            ) : null;
          })()}
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
            {billing !== 'monthly' && BILLING[billing].starter.badge && (
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
                fontFamily: 'Mattone, serif',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '2px'
              }}>
                <div>{BILLING[billing].starter.badge}</div>
                {(() => {
                  const monthlyPrice = parseFloat(BILLING.monthly.starter.usdPerMonth);
                  const currentPrice = parseFloat(BILLING[billing].starter.usdPerMonth);
                  const savings = monthlyPrice - currentPrice;

                  if (country === 'BD' && BILLING.monthly.starter.bdtPerMonth && BILLING[billing].starter.bdtPerMonth) {
                    const bdtSavings = BILLING.monthly.starter.bdtPerMonth - BILLING[billing].starter.bdtPerMonth;
                    if (bdtSavings > 0) {
                      return (
                        <>
                          <div>Save ≈ BDT {bdtSavings.toFixed(0)}/mo</div>
                          {savings > 0 && (
                            <div style={{ fontSize: '0.55rem', fontWeight: 500, opacity: 0.85 }}>
                              Save ${savings.toFixed(2)}/mo
                            </div>
                          )}
                        </>
                      );
                    }
                  }

                  if (country === 'PK' && BILLING.monthly.starter.pkrPerMonth && BILLING[billing].starter.pkrPerMonth) {
                    const pkrSavings = BILLING.monthly.starter.pkrPerMonth - BILLING[billing].starter.pkrPerMonth;
                    if (pkrSavings > 0) {
                      return (
                        <>
                          <div>Save ≈ Rs {pkrSavings}/mo</div>
                          {savings > 0 && (
                            <div style={{ fontSize: '0.55rem', fontWeight: 500, opacity: 0.85 }}>
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
                        <div style={{ fontSize: '0.55rem', fontWeight: 500, opacity: 0.85 }}>
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
            <div style={{ position: 'absolute', top: 0, left: '2.5rem', background: 'var(--hp-blue)', color: '#0D1117', fontFamily: 'Mattone, serif', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '0 0 3px 3px' }}>
              Most Popular
            </div>
            <div>
              <div className="hp-plan-name" style={{ marginBottom: '0.5rem' }}>Starter</div>
              <div className="hp-plan-price" style={{ fontFamily: 'Mattone, serif', fontSize: '2.2rem' }}>
                <div>
                  {(() => {
                    if (country === 'PK') return `Rs ${BILLING[billing].starter.pkrPerMonth}/mo`;
                    if (country === 'BD') return `৳${BILLING[billing].starter.bdtPerMonth.toFixed(2)}/mo`;
                    return `$${BILLING[billing].starter.usdPerMonth}/mo`;
                  })()}
                </div>
                {(() => {
                  if (country === 'PK') {
                    return (
                      <div style={{ fontSize: '1rem', color: 'var(--hp-muted)', fontWeight: 400, marginTop: '2px' }}>
                        {getUsdEquivalent(BILLING[billing].starter.pkrPerMonth)}
                      </div>
                    );
                  }
                  if (country === 'BD') {
                    return (
                      <div style={{ fontSize: '1rem', color: 'var(--hp-muted)', fontWeight: 400, marginTop: '2px' }}>
                        {getUsdEquivalent(BILLING[billing].starter.bdtPerMonth)}
                      </div>
                    );
                  }
                  const formatted = formatLocalPrice(BILLING[billing].starter.usdPerMonth);
                  return formatted ? (
                    <div style={{ fontSize: '1rem', color: 'var(--hp-muted)', fontWeight: 400, marginTop: '2px' }}>
                      {formatted}/mo
                    </div>
                  ) : null;
                })()}
              </div>
              <div style={{ fontFamily: 'Mattone, serif', fontSize: '0.72rem', color: 'var(--hp-muted)', letterSpacing: '0.04em', marginTop: '4px' }}>
                <div>
                  {(() => {
                    if (country === 'PK') {
                      return billing === 'monthly'
                        ? `Rs ${BILLING.monthly.starter.pkrTotal} billed monthly`
                        : `Rs ${BILLING[billing].starter.pkrTotal} billed every ${BILLING[billing].months} months`;
                    }
                    if (country === 'BD') {
                      return billing === 'monthly'
                        ? `৳${BILLING.monthly.starter.bdtTotal.toFixed(0)} billed monthly`
                        : `৳${BILLING[billing].starter.bdtTotal.toFixed(0)} billed every ${BILLING[billing].months} months`;
                    }
                    return billing === 'monthly'
                      ? `$${BILLING.monthly.starter.usdTotal} billed monthly`
                      : `$${BILLING[billing].starter.usdTotal} billed every ${BILLING[billing].months} months`;
                  })()}
                </div>
                {(() => {
                  if (country === 'PK') {
                    return (
                      <div style={{ fontSize: '0.65rem', color: 'var(--hp-muted)', marginTop: '2px' }}>
                        {getUsdEquivalentTotal(BILLING[billing].starter.pkrTotal)}
                      </div>
                    );
                  }
                  if (country === 'BD') {
                    return (
                      <div style={{ fontSize: '0.65rem', color: 'var(--hp-muted)', marginTop: '2px' }}>
                        {getUsdEquivalentTotal(BILLING[billing].starter.bdtTotal)}
                      </div>
                    );
                  }
                  const formatted = formatLocalPrice(BILLING[billing].starter.usdTotal);
                  return formatted ? (
                    <div style={{ fontSize: '0.65rem', color: 'var(--hp-muted)', marginTop: '2px' }}>
                      {formatted} total
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
            <ul className="hp-feature-list">
              {[billing === 'yearly' ? '2,000 leads' : '1,000 leads (2,000 if billed yearly)', '10 templates', 'Smart folders', 'CSV import', 'Notes', 'Convert to client'].map(f => (
                <li key={f} className="hp-feature-active"><span className="hp-fl-prefix">+</span> {f}</li>
              ))}
            </ul>
            <button onClick={handleSignUpClick} className="hp-btn-primary hp-plan-cta">Get Starter</button>
          </div>

          {/* PRO — coming soon / greyed */}
          <div style={{ background: 'var(--hp-card)', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', opacity: 0.45, borderRight: '0.5px solid var(--hp-border)' }}>
            {billing !== 'monthly' && BILLING[billing].pro.badge && (
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
                fontFamily: 'Mattone, serif',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '2px'
              }}>
                <div>{BILLING[billing].pro.badge}</div>
                {(() => {
                  const monthlyPrice = parseFloat(BILLING.monthly.pro.usdPerMonth);
                  const currentPrice = parseFloat(BILLING[billing].pro.usdPerMonth);
                  const savings = monthlyPrice - currentPrice;

                  if (country === 'BD' && BILLING.monthly.pro.bdtPerMonth && BILLING[billing].pro.bdtPerMonth) {
                    const bdtSavings = BILLING.monthly.pro.bdtPerMonth - BILLING[billing].pro.bdtPerMonth;
                    if (bdtSavings > 0) {
                      return (
                        <>
                          <div>Save ≈ BDT {bdtSavings.toFixed(0)}/mo</div>
                          {savings > 0 && (
                            <div style={{ fontSize: '0.55rem', fontWeight: 500, opacity: 0.85 }}>
                              Save ${savings.toFixed(2)}/mo
                            </div>
                          )}
                        </>
                      );
                    }
                  }

                  if (country === 'PK' && BILLING.monthly.pro.pkrPerMonth && BILLING[billing].pro.pkrPerMonth) {
                    const pkrSavings = BILLING.monthly.pro.pkrPerMonth - BILLING[billing].pro.pkrPerMonth;
                    if (pkrSavings > 0) {
                      return (
                        <>
                          <div>Save ≈ Rs {pkrSavings}/mo</div>
                          {savings > 0 && (
                            <div style={{ fontSize: '0.55rem', fontWeight: 500, opacity: 0.85 }}>
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
                        <div style={{ fontSize: '0.55rem', fontWeight: 500, opacity: 0.85 }}>
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
            <div style={{ position: 'absolute', top: 0, left: '2.5rem', background: 'var(--hp-border)', color: 'var(--hp-muted)', fontFamily: 'Mattone, serif', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '0 0 3px 3px' }}>
              Coming Soon
            </div>
            <div>
              <div className="hp-plan-name" style={{ marginBottom: '0.5rem' }}>Pro</div>
              <div className="hp-plan-price" style={{ fontFamily: 'Mattone, serif', fontSize: '2.2rem' }}>
                <div>
                  {(() => {
                    if (country === 'PK') return `Rs ${BILLING[billing].pro.pkrPerMonth}/mo`;
                    if (country === 'BD') return `৳${BILLING[billing].pro.bdtPerMonth.toFixed(2)}/mo`;
                    return `$${BILLING[billing].pro.usdPerMonth}/mo`;
                  })()}
                </div>
                {(() => {
                  if (country === 'PK') {
                    return (
                      <div style={{ fontSize: '1rem', color: 'var(--hp-muted)', fontWeight: 400, marginTop: '2px' }}>
                        {getUsdEquivalent(BILLING[billing].pro.pkrPerMonth)}
                      </div>
                    );
                  }
                  if (country === 'BD') {
                    return (
                      <div style={{ fontSize: '1rem', color: 'var(--hp-muted)', fontWeight: 400, marginTop: '2px' }}>
                        {getUsdEquivalent(BILLING[billing].pro.bdtPerMonth)}
                      </div>
                    );
                  }
                  const formatted = formatLocalPrice(BILLING[billing].pro.usdPerMonth);
                  return formatted ? (
                    <div style={{ fontSize: '1rem', color: 'var(--hp-muted)', fontWeight: 400, marginTop: '2px' }}>
                      {formatted}/mo
                    </div>
                  ) : null;
                })()}
              </div>
              <div style={{ fontFamily: 'Mattone, serif', fontSize: '0.72rem', color: 'var(--hp-muted)', letterSpacing: '0.04em', marginTop: '4px' }}>
                <div>
                  {(() => {
                    if (country === 'PK') {
                      return billing === 'monthly'
                        ? `Rs ${BILLING.monthly.pro.pkrTotal} billed monthly`
                        : `Rs ${BILLING[billing].pro.pkrTotal} billed every ${BILLING[billing].months} months`;
                    }
                    if (country === 'BD') {
                      return billing === 'monthly'
                        ? `৳${BILLING.monthly.pro.bdtTotal.toFixed(0)} billed monthly`
                        : `৳${BILLING[billing].pro.bdtTotal.toFixed(0)} billed every ${BILLING[billing].months} months`;
                    }
                    return billing === 'monthly'
                      ? `$${BILLING.monthly.pro.usdTotal} billed monthly`
                      : `$${BILLING[billing].pro.usdTotal} billed every ${BILLING[billing].months} months`;
                  })()}
                </div>
                {(() => {
                  if (country === 'PK') {
                    return (
                      <div style={{ fontSize: '0.65rem', color: 'var(--hp-muted)', marginTop: '2px' }}>
                        {getUsdEquivalentTotal(BILLING[billing].pro.pkrTotal)}
                      </div>
                    );
                  }
                  if (country === 'BD') {
                    return (
                      <div style={{ fontSize: '0.65rem', color: 'var(--hp-muted)', marginTop: '2px' }}>
                        {getUsdEquivalentTotal(BILLING[billing].pro.bdtTotal)}
                      </div>
                    );
                  }
                  const formatted = formatLocalPrice(BILLING[billing].pro.usdTotal);
                  return formatted ? (
                    <div style={{ fontSize: '0.65rem', color: 'var(--hp-muted)', marginTop: '2px' }}>
                      {formatted} total
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
            <ul className="hp-feature-list">
              {[billing === 'yearly' ? '10,000 leads' : '5,000 leads (10,000 if billed yearly)', 'Unlimited templates', 'Smart folders', 'CSV import', 'Notes', 'Convert to client', 'AI Commands', 'MCP Connect'].map(f => (
                <li key={f} className="hp-feature-active"><span className="hp-fl-prefix">+</span> {f}</li>
              ))}
            </ul>
            <button disabled className="hp-btn-ghost hp-plan-cta" style={{ cursor: 'not-allowed' }}>Coming Soon</button>
          </div>

          {/* TEAMS — coming soon / greyed */}
          <div style={{ background: 'var(--hp-card)', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', opacity: 0.35 }}>
            {billing !== 'monthly' && BILLING[billing].teams.badge && (
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
                fontFamily: 'Mattone, serif',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '2px'
              }}>
                <div>{BILLING[billing].teams.badge}</div>
                {(() => {
                  const monthlyPrice = parseFloat(BILLING.monthly.teams.usdPerMonth);
                  const currentPrice = parseFloat(BILLING[billing].teams.usdPerMonth);
                  const savings = monthlyPrice - currentPrice;

                  if (country === 'BD' && BILLING.monthly.teams.bdtPerMonth && BILLING[billing].teams.bdtPerMonth) {
                    const bdtSavings = BILLING.monthly.teams.bdtPerMonth - BILLING[billing].teams.bdtPerMonth;
                    if (bdtSavings > 0) {
                      return (
                        <>
                          <div>Save ≈ BDT {bdtSavings.toFixed(0)}/mo</div>
                          {savings > 0 && (
                            <div style={{ fontSize: '0.55rem', fontWeight: 500, opacity: 0.85 }}>
                              Save ${savings.toFixed(2)}/mo
                            </div>
                          )}
                        </>
                      );
                    }
                  }

                  if (country === 'PK' && BILLING.monthly.teams.pkrPerMonth && BILLING[billing].teams.pkrPerMonth) {
                    const pkrSavings = BILLING.monthly.teams.pkrPerMonth - BILLING[billing].teams.pkrPerMonth;
                    if (pkrSavings > 0) {
                      return (
                        <>
                          <div>Save ≈ Rs {pkrSavings}/mo</div>
                          {savings > 0 && (
                            <div style={{ fontSize: '0.55rem', fontWeight: 500, opacity: 0.85 }}>
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
                        <div style={{ fontSize: '0.55rem', fontWeight: 500, opacity: 0.85 }}>
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
            <div style={{ position: 'absolute', top: 0, left: '2.5rem', background: 'var(--hp-border)', color: 'var(--hp-muted)', fontFamily: 'Mattone, serif', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '0 0 3px 3px' }}>
              Coming Soon
            </div>
            <div>
              <div className="hp-plan-name" style={{ marginBottom: '0.5rem' }}>Teams</div>
              <div className="hp-plan-price" style={{ fontFamily: 'Mattone, serif', fontSize: '2.2rem' }}>
                <div>
                  {(() => {
                    if (country === 'PK') return `Rs ${BILLING[billing].teams.pkrPerMonth}/mo`;
                    if (country === 'BD') return `৳${BILLING[billing].teams.bdtPerMonth.toFixed(2)}/mo`;
                    return `$${BILLING[billing].teams.usdPerMonth}/mo`;
                  })()}
                </div>
                {(() => {
                  if (country === 'PK') {
                    return (
                      <div style={{ fontSize: '1rem', color: 'var(--hp-muted)', fontWeight: 400, marginTop: '2px' }}>
                        {getUsdEquivalent(BILLING[billing].teams.pkrPerMonth)}
                      </div>
                    );
                  }
                  if (country === 'BD') {
                    return (
                      <div style={{ fontSize: '1rem', color: 'var(--hp-muted)', fontWeight: 400, marginTop: '2px' }}>
                        {getUsdEquivalent(BILLING[billing].teams.bdtPerMonth)}
                      </div>
                    );
                  }
                  const formatted = formatLocalPrice(BILLING[billing].teams.usdPerMonth);
                  return formatted ? (
                    <div style={{ fontSize: '1rem', color: 'var(--hp-muted)', fontWeight: 400, marginTop: '2px' }}>
                      {formatted}/mo
                    </div>
                  ) : null;
                })()}
              </div>
              <div style={{ fontFamily: 'Mattone, serif', fontSize: '0.72rem', color: 'var(--hp-muted)', letterSpacing: '0.04em', marginTop: '4px' }}>
                <div>
                  {(() => {
                    if (country === 'PK') {
                      return billing === 'monthly'
                        ? `Rs ${BILLING.monthly.teams.pkrTotal} billed monthly`
                        : `Rs ${BILLING[billing].teams.pkrTotal} billed every ${BILLING[billing].months} months`;
                    }
                    if (country === 'BD') {
                      return billing === 'monthly'
                        ? `৳${BILLING.monthly.teams.bdtTotal.toFixed(0)} billed monthly`
                        : `৳${BILLING[billing].monthly.teams.bdtTotal.toFixed(0)} billed every ${BILLING[billing].months} months`;
                    }
                    return billing === 'monthly'
                      ? `$${BILLING.monthly.teams.usdTotal} billed monthly`
                      : `$${BILLING[billing].teams.usdTotal} billed every ${BILLING[billing].months} months`;
                  })()}
                </div>
                {(() => {
                  if (country === 'PK') {
                    return (
                      <div style={{ fontSize: '0.65rem', color: 'var(--hp-muted)', marginTop: '2px' }}>
                        {getUsdEquivalentTotal(BILLING[billing].teams.pkrTotal)}
                      </div>
                    );
                  }
                  if (country === 'BD') {
                    return (
                      <div style={{ fontSize: '0.65rem', color: 'var(--hp-muted)', marginTop: '2px' }}>
                        {getUsdEquivalentTotal(BILLING[billing].teams.bdtTotal)}
                      </div>
                    );
                  }
                  const formatted = formatLocalPrice(BILLING[billing].teams.usdTotal);
                  return formatted ? (
                    <div style={{ fontSize: '0.65rem', color: 'var(--hp-muted)', marginTop: '2px' }}>
                      {formatted} total
                    </div>
                  ) : null;
                })()}
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
