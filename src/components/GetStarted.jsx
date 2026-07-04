import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, CheckCircle, HelpCircle, Sun, Moon } from 'lucide-react';
import { useAppContext } from '../App';

export default function GetStarted() {
  const navigate = useNavigate();
  const context = useAppContext();
  const theme = context?.theme || 'dark';
  const toggleTheme = context?.toggleTheme;

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
        <div style={{ maxWidth: '800px', width: '100%', textAlign: 'left', lineHeight: '1.8' }}>
          
          {/* Header */}
          <div style={{ marginBottom: '3.5rem', borderBottom: '1px solid var(--hp-border)', paddingBottom: '2rem' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--hp-text)', marginBottom: '0.75rem', fontFamily: 'Mattone, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Get Started with ReachDesk
            </h1>
            <p style={{ fontSize: '1.15rem', color: 'var(--hp-muted)', margin: 0 }}>
              Your quick-start guide to mastering lead tracking, outreach templates, and automated follow-ups.
            </p>
          </div>

          {/* 3-Step How It Works */}
          <div style={{ marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '1.6rem', color: 'var(--hp-blue)', marginBottom: '1.5rem', fontFamily: 'Mattone, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              How ReachDesk Works
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ backgroundColor: 'rgba(91, 143, 185, 0.1)', color: 'var(--hp-blue)', padding: '0.75rem', borderRadius: '3px', fontWeight: 700, minWidth: '40px', textAlign: 'center' }}>1</div>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', color: 'var(--hp-text)' }}>Add your first lead</h3>
                  <p style={{ margin: 0, color: 'var(--hp-muted)' }}>
                    Quickly add new prospects manually via the CRM dashboard or import your contact list in bulk using standard CSV file uploads.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ backgroundColor: 'rgba(91, 143, 185, 0.1)', color: 'var(--hp-blue)', padding: '0.75rem', borderRadius: '3px', fontWeight: 700, minWidth: '40px', textAlign: 'center' }}>2</div>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', color: 'var(--hp-text)' }}>Send a message using a ready-made template</h3>
                  <p style={{ margin: 0, color: 'var(--hp-muted)' }}>
                    Select an outreach template, customize it with smart tags like name or niche, and copy the body to paste into your favorite outreach channel.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ backgroundColor: 'rgba(91, 143, 185, 0.1)', color: 'var(--hp-blue)', padding: '0.75rem', borderRadius: '3px', fontWeight: 700, minWidth: '40px', textAlign: 'center' }}>3</div>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', color: 'var(--hp-text)' }}>Set a follow-up reminder so nothing slips through</h3>
                  <p style={{ margin: 0, color: 'var(--hp-muted)' }}>
                    Set status to Contacted to kick off automated task reminders that prompt you to re-engage with leads at key intervals until they reply.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* How Follow-up Reminders Work */}
          <div style={{ marginBottom: '3.5rem', padding: '1.5rem', backgroundColor: 'var(--hp-card)', border: '1px solid var(--hp-border)', borderRadius: '3px' }}>
            <h2 style={{ fontSize: '1.3rem', color: 'var(--hp-blue)', marginTop: 0, marginBottom: '1rem', fontFamily: 'Mattone, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={20} /> How Follow-up Reminders Work
            </h2>
            <p style={{ color: 'var(--hp-muted)', margin: '0 0 1rem 0' }}>
              ReachDesk features an automated task scheduling system to keep your prospect outreach active. When a lead's status is updated to <strong>Contacted</strong> (or their last contacted date changes), the system automatically schedules a series of <strong>7 follow-up reminders</strong>:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', color: 'var(--hp-text)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><CheckCircle size={14} style={{ color: 'var(--hp-blue)' }} /> 12 Hours (Reminder #1)</div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><CheckCircle size={14} style={{ color: 'var(--hp-blue)' }} /> 24 Hours (Reminder #2)</div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><CheckCircle size={14} style={{ color: 'var(--hp-blue)' }} /> 3 Days (Reminder #3)</div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><CheckCircle size={14} style={{ color: 'var(--hp-blue)' }} /> 5 Days (Reminder #4)</div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><CheckCircle size={14} style={{ color: 'var(--hp-blue)' }} /> 7 Days (Reminder #5)</div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><CheckCircle size={14} style={{ color: 'var(--hp-blue)' }} /> 14 Days (Reminder #6)</div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><CheckCircle size={14} style={{ color: 'var(--hp-blue)' }} /> 21 Days (Reminder #7)</div>
            </div>
            <p style={{ color: 'var(--hp-muted)', margin: 0 }}>
              To stop the reminders, simply update the lead's status in the CRM to a terminal stop status (e.g. <strong>Positive Reply</strong>, <strong>Booked</strong>, <strong>Client</strong>, or <strong>Not Interested</strong>), and the pending reminders will be automatically dismissed.
            </p>
          </div>

          {/* Templates Section */}
          <div style={{ marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '1.6rem', color: 'var(--hp-blue)', marginBottom: '1rem', fontFamily: 'Mattone, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Custom & Starter Templates
            </h2>
            <p style={{ color: 'var(--hp-muted)', margin: '0 0 1rem 0' }}>
              Save time and keep your messaging consistent by utilizing ReachDesk's template library:
            </p>
            <ul style={{ color: 'var(--hp-muted)', paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li><strong>Starter Library:</strong> Leverage pre-written outreach messages and follow-up templates curated for high response rates.</li>
              <li><strong>Custom Templates:</strong> Create your own template messages or duplicate existing ones, and inject placeholders like <code>[Name]</code> or <code>[niche]</code> that load prospect information automatically.</li>
              <li><strong>Organize with Tags:</strong> Tag your custom templates with comma-separated categories (like <code>cold outreach</code>, <code>agency</code>) to quickly search and filter them later.</li>
            </ul>
          </div>

          {/* Understanding Your Pipeline */}
          <div style={{ marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '1.6rem', color: 'var(--hp-blue)', marginBottom: '1rem', fontFamily: 'Mattone, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Understanding Your Pipeline
            </h2>
            <p style={{ color: 'var(--hp-muted)', marginBottom: '1.5rem' }}>
              ReachDesk groups your active prospects using a standard CRM pipeline containing 9 key stages:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ borderLeft: '3px solid #3b82f6', paddingLeft: '1rem' }}>
                <strong style={{ color: 'var(--hp-text)' }}>Lead:</strong> <span style={{ color: 'var(--hp-muted)' }}>Initial status when a new prospect is added to your CRM.</span>
              </div>
              <div style={{ borderLeft: '3px solid #f59e0b', paddingLeft: '1rem' }}>
                <strong style={{ color: 'var(--hp-text)' }}>Contacted:</strong> <span style={{ color: 'var(--hp-muted)' }}>You have sent the initial outreach message.</span>
              </div>
              <div style={{ borderLeft: '3px solid #10b981', paddingLeft: '1rem' }}>
                <strong style={{ color: 'var(--hp-text)' }}>Waiting:</strong> <span style={{ color: 'var(--hp-muted)' }}>Awaiting reply; reminders continue to help prompt follow-ups.</span>
              </div>
              <div style={{ borderLeft: '3px solid #8b5cf6', paddingLeft: '1rem' }}>
                <strong style={{ color: 'var(--hp-text)' }}>Positive Reply:</strong> <span style={{ color: 'var(--hp-muted)' }}>Lead replied with interest, dismissing pending reminders.</span>
              </div>
              <div style={{ borderLeft: '3px solid #ec4899', paddingLeft: '1rem' }}>
                <strong style={{ color: 'var(--hp-text)' }}>Booked:</strong> <span style={{ color: 'var(--hp-muted)' }}>Meeting or discovery call booked.</span>
              </div>
              <div style={{ borderLeft: '3px solid #06b6d4', paddingLeft: '1rem' }}>
                <strong style={{ color: 'var(--hp-text)' }}>Proposal Sent:</strong> <span style={{ color: 'var(--hp-muted)' }}>Discovery call held; custom proposal or quote delivered.</span>
              </div>
              <div style={{ borderLeft: '3px solid #ef4444', paddingLeft: '1rem' }}>
                <strong style={{ color: 'var(--hp-text)' }}>No Show / Rescheduled:</strong> <span style={{ color: 'var(--hp-muted)' }}>Lead missed the scheduled call or requested a postponement.</span>
              </div>
              <div style={{ borderLeft: '3px solid #6b7280', paddingLeft: '1rem' }}>
                <strong style={{ color: 'var(--hp-text)' }}>Not Interested:</strong> <span style={{ color: 'var(--hp-muted)' }}>Prospect has opted out or isn't interested right now.</span>
              </div>
              <div style={{ borderLeft: '3px solid #10b981', paddingLeft: '1rem' }}>
                <strong style={{ color: 'var(--hp-text)' }}>Client:</strong> <span style={{ color: 'var(--hp-muted)' }}>Lead converted successfully into a paying customer.</span>
              </div>
            </div>
          </div>

          {/* Your Free Trial */}
          <div style={{ marginBottom: '3.5rem', borderTop: '1px solid var(--hp-border)', paddingTop: '2.5rem' }}>
            <h2 style={{ fontSize: '1.6rem', color: 'var(--hp-blue)', marginBottom: '1rem', fontFamily: 'Mattone, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Your Free Trial
            </h2>
            <p style={{ color: 'var(--hp-muted)', margin: 0 }}>
              All new ReachDesk accounts automatically start on a <strong>7-day free trial</strong> with full access to all features, supporting up to <strong>65 leads</strong> and <strong>2 custom templates</strong>. Double leads and unlimited templates are unlocked instantly when upgrading.
            </p>
          </div>

          {/* FAQ */}
          <div style={{ marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '1.6rem', color: 'var(--hp-blue)', marginBottom: '1.5rem', fontFamily: 'Mattone, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Frequently Asked Questions
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--hp-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><HelpCircle size={16} style={{ color: 'var(--hp-blue)' }} /> Can I export my leads?</h4>
                <p style={{ margin: 0, color: 'var(--hp-muted)' }}>Yes! ReachDesk provides built-in export functionality allowing you to download all leads as a CSV file at any time.</p>
              </div>
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--hp-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><HelpCircle size={16} style={{ color: 'var(--hp-blue)' }} /> What happens when my trial ends?</h4>
                <p style={{ margin: 0, color: 'var(--hp-muted)' }}>Your account will be temporarily suspended and locked. We preserve all your leads and templates securely for 30 days, during which you can upgrade to a paid subscription to regain access.</p>
              </div>
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--hp-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><HelpCircle size={16} style={{ color: 'var(--hp-blue)' }} /> Can I import existing contacts?</h4>
                <p style={{ margin: 0, color: 'var(--hp-muted)' }}>Yes! ReachDesk features a CSV import tool in the CRM dashboard that maps and loads bulk contacts instantly.</p>
              </div>
            </div>
          </div>

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
