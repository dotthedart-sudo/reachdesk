import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, CheckCircle, HelpCircle, Sun, Moon } from 'lucide-react';
import { useAppContext } from '../App';

const SIDEBAR_ITEMS = [
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'follow-up-reminders', label: 'Follow-up Reminders' },
  { id: 'pipeline-stages', label: 'Pipeline Stages' },
  { id: 'templates', label: 'Templates' },
  { id: 'client-invoices', label: 'Client Invoices' },
  { id: 'revenue-tracker', label: 'Revenue Tracker' },
  { id: 'notes', label: 'Notes' },
  { id: 'configuration', label: 'Configuration' },
  { id: 'trial-pricing', label: 'Trial & Pricing' },
  { id: 'faq', label: 'FAQ' },
];

function StickyNav({ accentColor, activeSection, onScrollTo }) {
  return (
    <aside style={{
      position: 'sticky',
      top: '120px',
      alignSelf: 'flex-start',
      width: '200px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      borderRight: '1px solid var(--gs-border)',
      paddingRight: '1.25rem',
    }}>
      {SIDEBAR_ITEMS.map(item => {
        const isActive = activeSection === item.id;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => onScrollTo(e, item.id)}
            style={{
              textDecoration: 'none',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? accentColor : 'var(--gs-muted)',
              padding: '5px 10px',
              borderRadius: '4px',
              backgroundColor: isActive ? 'var(--gs-active-bg)' : 'transparent',
              transition: 'all 0.15s ease',
              fontSize: '0.72rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              lineHeight: 1.4,
            }}
          >
            {item.label}
          </a>
        );
      })}
    </aside>
  );
}

function GetStartedContent({ isAppView, theme, navigate }) {
  const [activeSection, setActiveSection] = useState('how-it-works');

  useEffect(() => {
    const ids = SIDEBAR_ITEMS.map(i => i.id);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { root: null, rootMargin: '-10% 0px -70% 0px', threshold: 0 }
    );
    ids.forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => ids.forEach(id => { const el = document.getElementById(id); if (el) observer.unobserve(el); });
  }, []);

  const handleScrollTo = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 120;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  const accent = isAppView ? 'var(--accent-blue)' : 'var(--hp-blue)';
  const text = isAppView ? 'var(--text-primary)' : 'var(--hp-text)';
  const muted = isAppView ? 'var(--text-secondary)' : 'var(--hp-muted)';
  const border = isAppView ? 'var(--border)' : 'var(--hp-border)';
  const card = isAppView ? 'var(--bg-card)' : 'var(--hp-card)';

  const sectionTitle = (label) => ({
    fontSize: '1.45rem',
    color: accent,
    marginTop: 0,
    marginBottom: '1rem',
    fontFamily: isAppView ? 'var(--font-heading)' : 'Mattone, sans-serif',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  });

  return (
    <>
      <style>{`
        @media (max-width: 900px) { .gs-sidebar { display: none !important; } }
        :root {
          --gs-border: ${border};
          --gs-muted: ${muted};
          --gs-active-bg: ${isAppView ? 'rgba(59,130,246,0.1)' : 'rgba(91,143,185,0.1)'};
        }
      `}</style>

      <div style={{ display: 'flex', gap: '2.5rem', width: '100%', alignItems: 'flex-start' }}>
        {/* Sticky sidebar — desktop only */}
        <div className="gs-sidebar">
          <StickyNav accentColor={accent} activeSection={activeSection} onScrollTo={handleScrollTo} />
        </div>

        {/* Main sections */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>

          {/* 1 — How It Works */}
          <section id="how-it-works" style={{ scrollMarginTop: '120px' }}>
            <h2 style={sectionTitle()}>How ReachDesk Works</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {[{
                n: '1', title: 'Add your first lead',
                body: 'Quickly add new prospects manually via the CRM dashboard or import your contact list in bulk using standard CSV file uploads.',
              }, {
                n: '2', title: 'Send a message using a ready-made template',
                body: 'Select an outreach template, customize it with smart tags like name or niche, and copy the body to paste into your favorite outreach channel.',
              }, {
                n: '3', title: 'Set a follow-up reminder so nothing slips through',
                body: 'Set status to Contacted to kick off automated task reminders that prompt you to re-engage with leads at key intervals until they reply.',
              }].map(({ n, title, body }) => (
                <div key={n} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ backgroundColor: 'var(--gs-active-bg)', color: accent, padding: '0.5rem 0.75rem', borderRadius: '4px', fontWeight: 700, minWidth: '40px', textAlign: 'center', border: `1px solid ${border}` }}>{n}</div>
                  <div>
                    <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.05rem', color: text, fontWeight: 600 }}>{title}</h3>
                    <p style={{ margin: 0, color: muted }}>{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 2 — Follow-up Reminders */}
          <section id="follow-up-reminders" style={{ scrollMarginTop: '120px', padding: '1.5rem', backgroundColor: card, border: `1px solid ${border}`, borderRadius: '6px' }}>
            <h2 style={{ ...sectionTitle(), display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={18} /> How Follow-up Reminders Work
            </h2>
            <p style={{ color: muted, margin: '0 0 1rem 0' }}>
              ReachDesk features an automated task scheduling system to keep your prospect outreach active. When a lead's status is updated to <strong>Contacted</strong> (or their last contacted date changes), the system automatically schedules a series of <strong>7 follow-up reminders</strong>:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', color: text, fontSize: '0.9rem', marginBottom: '1rem' }}>
              {[
                'Day 2 (Reminder #1)',
                'Day 4 (Reminder #2)',
                'Day 7 (Reminder #3)',
                'Day 10 (Reminder #4)',
                'Day 14 (Reminder #5)',
                'Day 21 (Reminder #6)',
                'Day 23 (Reminder #7 — Breakup)',
              ].map(label => (
                <div key={label} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <CheckCircle size={14} style={{ color: accent }} /> {label}
                </div>
              ))}
            </div>
            <p style={{ color: muted, margin: 0 }}>
              To stop the reminders, simply update the lead's status to a terminal stop status (e.g. <strong>Positive Reply</strong>, <strong>Booked</strong>, <strong>Client</strong>, or <strong>Not Interested</strong>), and the pending reminders will be automatically dismissed.
            </p>
          </section>

          {/* 3 — Pipeline Stages */}
          <section id="pipeline-stages" style={{ scrollMarginTop: '120px' }}>
            <h2 style={sectionTitle()}>Pipeline Stages</h2>
            <p style={{ color: muted, marginBottom: '1.5rem', marginTop: 0 }}>
              ReachDesk uses fully customizable pipeline stages. Default stages include: Lead, Contacted, Positive Reply, Booked, Calendly Sent, Call Booked, Client, Follow Up, No Show, Not Interested. Add, rename, or reorder stages from Configuration Settings.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {[{
                color: '#3b82f6', name: 'Lead', desc: 'Initial status when a new prospect is added to your CRM.',
              }, {
                color: '#f59e0b', name: 'Contacted', desc: 'You have sent the initial outreach message.',
              }, {
                color: '#8b5cf6', name: 'Positive Reply', desc: 'Lead replied with interest, dismissing pending reminders.',
              }, {
                color: '#ec4899', name: 'Booked', desc: 'Meeting or discovery call booked.',
              }, {
                color: '#06b6d4', name: 'Client', desc: 'Lead converted successfully into a paying customer.',
              }].map(({ color, name, desc }) => (
                <div key={name} style={{ borderLeft: `3px solid ${color}`, paddingLeft: '1rem' }}>
                  <strong style={{ color: text }}>{name}:</strong>{' '}
                  <span style={{ color: muted }}>{desc}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 4 — Templates */}
          <section id="templates" style={{ scrollMarginTop: '120px' }}>
            <h2 style={sectionTitle()}>Custom & Starter Templates</h2>
            <p style={{ color: muted, margin: '0 0 1rem 0' }}>
              Save time and keep your messaging consistent by utilizing ReachDesk's template library:
            </p>
            <ul style={{ color: muted, paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li><strong>Starter Library:</strong> 18 pre-built starter templates in 5 sections: Initial Templates, Follow Ups, Booking Messages, After Booked, After Client Booked.</li>
              <li><strong>Custom Templates:</strong> Create custom templates with <code>[Name]</code>, <code>[niche]</code>, and <code>[result]</code> placeholders that load prospect information automatically.</li>
              <li><strong>One-Click Copy:</strong> Copy template bodies instantly with a single click to paste directly into your active outreach channels.</li>
            </ul>
          </section>

          {/* 5 — Client Invoices */}
          <section id="client-invoices" style={{ scrollMarginTop: '120px' }}>
            <h2 style={sectionTitle()}>Client Invoices</h2>
            <p style={{ color: muted, margin: 0 }}>
              Generate professional invoices for your clients directly from ReachDesk. Select a client from your CRM leads, auto-fill their email, add line items with quantities and rates, apply tax, and download or share a public invoice link. Supports multiple currencies.
            </p>
          </section>

          {/* 6 — Revenue Tracker */}
          <section id="revenue-tracker" style={{ scrollMarginTop: '120px' }}>
            <h2 style={sectionTitle()}>Revenue Tracker</h2>
            <p style={{ color: muted, margin: 0 }}>
              Log your freelance earnings in one place. Record payments by client name, amount, currency, service type, and date. View earnings breakdown by client and currency. Track your income across PKR, USD, GBP, and more.
            </p>
          </section>

          {/* 7 — Notes & Drawing Board */}
          <section id="notes" style={{ scrollMarginTop: '120px' }}>
            <h2 style={sectionTitle()}>Notes & Drawing Board</h2>
            <p style={{ color: muted, margin: 0 }}>
              Keep all your outreach notes, scripts, and ideas organized. Create text notes with rich formatting using slash commands (/heading, /todo, /bullet, /toggle). Use the drawing canvas for visual planning. Organize notes into folders.
            </p>
          </section>

          {/* 8 — Configuration */}
          <section id="configuration" style={{ scrollMarginTop: '120px' }}>
            <h2 style={sectionTitle()}>Configuration & Settings</h2>
            <p style={{ color: muted, marginBottom: '1rem', marginTop: 0 }}>Customize ReachDesk to your workflow:</p>
            <ul style={{ color: muted, paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li><strong>Profile:</strong> Set your full name and profile photo.</li>
              <li><strong>Pipeline Stages:</strong> Add, rename, reorder your CRM stages.</li>
              <li><strong>Billing:</strong> View your current plan, usage (leads/templates), and manage subscription.</li>
              <li><strong>Bank Details:</strong> Save your bank account and IBAN for auto-fill in invoices.</li>
              <li><strong>Default Currency:</strong> Set your preferred currency for invoices and revenue tracking.</li>
            </ul>
          </section>

          {/* 9 — Trial & Pricing */}
          <section id="trial-pricing" style={{ scrollMarginTop: '120px', borderTop: `1px solid ${border}`, paddingTop: '2.5rem' }}>
            <h2 style={sectionTitle()}>Free Trial & Pricing</h2>
            <p style={{ color: muted, marginTop: 0, marginBottom: '1.5rem' }}>
              All new ReachDesk accounts start on a <strong>7-day free trial</strong> with full access — no credit card required.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1.25rem' }}>
              {[{
                name: 'Free Trial', price: '7 days free', sub: 'No card required', limits: '50 leads, 5 custom templates',
              }, {
                name: 'Starter', price: '$0.95/mo', sub: '', limits: '600 leads, 10 custom templates',
              }, {
                name: 'Pro', price: '$3.40/mo', sub: '', limits: '2,500 leads, unlimited templates',
              }, {
                name: 'Teams', price: '$7.00/mo', sub: '', limits: '10,000 leads, 3 users',
              }].map(plan => (
                <div key={plan.name} style={{ padding: '1.25rem', backgroundColor: card, border: `1px solid ${border}`, borderRadius: '4px' }}>
                  <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1rem', color: text }}>{plan.name}</h3>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '1rem', fontWeight: 700, color: accent }}>{plan.price}</p>
                  {plan.sub && <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.8rem', color: muted }}>{plan.sub}</p>}
                  <p style={{ margin: 0, fontSize: '0.85rem', color: muted }}>{plan.limits}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 10 — FAQ */}
          <section id="faq" style={{ scrollMarginTop: '120px' }}>
            <h2 style={sectionTitle()}>Frequently Asked Questions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {[{
                q: 'Can I export my leads?',
                a: 'Yes! ReachDesk provides built-in export functionality allowing you to download all leads as a CSV file at any time.',
              }, {
                q: 'What happens when my trial ends?',
                a: 'Your account is locked but data is preserved for 30 days. Export your leads anytime from the lock screen.',
              }, {
                q: 'What payment methods are supported?',
                a: 'All major credit/debit cards and PayPal via Paddle.',
              }, {
                q: 'Can I cancel anytime?',
                a: 'Yes. Cancel from Settings → Billing. Your plan stays active until the end of the billing period.',
              }, {
                q: 'Is my data safe?',
                a: 'Yes. All data is stored securely on Supabase with row-level security. Only you can access your data.',
              }].map(({ q, a }) => (
                <div key={q}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: text, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                    <HelpCircle size={16} style={{ color: accent }} /> {q}
                  </h4>
                  <p style={{ margin: 0, color: muted }}>{a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Bottom Help Section */}
          <section style={{ padding: '2.5rem 2rem', backgroundColor: card, border: `1px solid ${border}`, borderRadius: '3px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.35rem', color: text, marginTop: 0, marginBottom: '0.5rem', fontFamily: isAppView ? 'var(--font-heading)' : 'Mattone, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Still have questions?
            </h3>
            <p style={{ color: muted, marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              We are here to help you get the most out of ReachDesk CRM.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
              <a
                href="mailto:support@esemdot.com"
                style={{
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '40px',
                  padding: '0 1.5rem',
                  fontWeight: 600,
                  borderRadius: '3px',
                  backgroundColor: accent,
                  color: theme === 'dark' ? '#0D1117' : '#FFFFFF',
                  fontSize: '0.88rem',
                }}
              >
                Email Us
              </a>
              <a
                href="mailto:support@esemdot.com?subject=Demo Request"
                style={{
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '40px',
                  padding: '0 1.5rem',
                  fontWeight: 600,
                  borderRadius: '3px',
                  border: `1px solid ${border}`,
                  color: text,
                  fontSize: '0.88rem',
                  backgroundColor: 'transparent',
                }}
              >
                Book a Demo
              </a>
            </div>
            <p style={{ fontSize: '0.82rem', color: muted, margin: 0 }}>
              Or watch our <a href="#" onClick={e => e.preventDefault()} style={{ color: accent, textDecoration: 'underline' }}>walkthrough video</a>
            </p>
          </section>

        </div>
      </div>
    </>
  );
}

export default function GetStarted() {
  const navigate = useNavigate();
  const context = useAppContext();
  const theme = context?.theme || 'dark';
  const toggleTheme = context?.toggleTheme;
  const session = context?.session;

  if (session) {
    return (
      <div style={{
        maxWidth: '1100px',
        margin: '0 auto',
        width: '100%',
        textAlign: 'left',
        lineHeight: '1.8',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-body)',
        padding: '1rem 1.5rem 4rem 1.5rem'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '2.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Get Started with ReachDesk
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', margin: 0 }}>
            Your quick-start guide to mastering lead tracking, outreach templates, and automated follow-ups.
          </p>
        </div>

        <GetStartedContent isAppView={true} theme={theme} navigate={navigate} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--hp-bg)', color: 'var(--hp-text)', fontFamily: 'system-ui, -apple-system, sans-serif', transition: 'background-color 0.2s, color 0.2s' }}>
      {/* Navigation Bar */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem 2.5rem',
        borderBottom: '1px solid var(--hp-border)',
        backgroundColor: 'var(--hp-bg)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backdropFilter: 'blur(10px)'
      }}>
        <Link to="/homepage" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', cursor: 'pointer' }}>
          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--hp-text)', fontFamily: 'Mattone, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ReachDesk</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {toggleTheme && (
            <button
              onClick={toggleTheme}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--hp-muted)', display: 'flex', alignItems: 'center', padding: '4px', transition: 'color 0.15s ease' }}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}
          <Link to="/homepage" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            textDecoration: 'none',
            backgroundColor: 'transparent',
            border: '1px solid var(--hp-border)',
            borderRadius: '3px',
            color: 'var(--hp-muted)',
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--hp-text)';
            e.currentTarget.style.borderColor = 'var(--hp-muted)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--hp-muted)';
            e.currentTarget.style.borderColor = 'var(--hp-border)';
          }}
          >
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </div>
      </nav>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '4rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{ maxWidth: '1100px', width: '100%', textAlign: 'left', lineHeight: '1.8' }}>
          
          {/* Header */}
          <div style={{ marginBottom: '3.5rem', borderBottom: '1px solid var(--hp-border)', paddingBottom: '2rem' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--hp-text)', marginBottom: '0.75rem', fontFamily: 'Mattone, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Get Started with ReachDesk
            </h1>
            <p style={{ fontSize: '1.15rem', color: 'var(--hp-muted)', margin: 0 }}>
              Your quick-start guide to mastering lead tracking, outreach templates, and automated follow-ups.
            </p>
          </div>

          <GetStartedContent isAppView={false} theme={theme} navigate={navigate} />

          {/* Closing CTA */}
          <div style={{ padding: '3rem 2rem', backgroundColor: 'var(--hp-card)', border: '1px solid var(--hp-border)', borderRadius: '3px', textAlign: 'center', marginTop: '4rem' }}>
            <h2 style={{ fontSize: '1.75rem', color: 'var(--hp-text)', marginTop: 0, marginBottom: '0.75rem', fontFamily: 'Mattone, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ready to get started?
            </h2>
            <p style={{ color: 'var(--hp-muted)', marginBottom: '2rem', fontSize: '1.05rem' }}>
              Sign up today and start organizing your business pipeline.
            </p>
            <button
              onClick={() => navigate('/signup')}
              style={{
                fontFamily: 'Mattone, sans-serif',
                fontSize: '0.85rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                backgroundColor: 'var(--hp-blue)',
                color: theme === 'dark' ? '#0D1117' : '#FFFFFF',
                border: 'none',
                borderRadius: '3px',
                padding: '12px 28px',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'opacity 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              Sign Up Free
            </button>
          </div>

        </div>
      </div>

      {/* Simple Footer */}
      <footer style={{
        borderTop: '1px solid var(--hp-border)',
        padding: '2rem 1.5rem',
        textAlign: 'center',
        color: 'var(--hp-muted)',
        fontSize: '0.9rem',
        marginTop: 'auto',
        backgroundColor: 'var(--hp-bg)'
      }}>
        <p>© 2026 ReachDesk. All rights reserved.</p>
      </footer>
    </div>
  );
}
