import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import CurrencySelector from './CurrencySelector';

export default function SetupModal({ profile, onRefreshProfile, onSaveSettings, navigate }) {
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [brandName, setBrandName] = useState(localStorage.getItem('reachdesk_brand_name') || 'ReachDesk');
  const [defaultCurrency, setDefaultCurrency] = useState(profile?.default_currency || 'PKR');
  const [revenueTarget, setRevenueTarget] = useState(profile?.monthly_revenue_target || '');
  const [useCase, setUseCase] = useState('both'); // 'leads', 'clients', 'both'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // 1. Update user profile in database
      const { error: updateErr } = await supabase
        .from('user_profiles')
        .update({
          full_name: fullName.trim(),
          default_currency: defaultCurrency,
          monthly_revenue_target: revenueTarget ? Number(revenueTarget) : null,
          has_completed_setup: true
        })
        .eq('id', profile.id);

      if (updateErr) throw updateErr;

      // 2. Save settings to localStorage and update context
      onSaveSettings(
        brandName.trim() || 'ReachDesk',
        defaultCurrency,
        localStorage.getItem('reachdesk_webhook_url') || '',
        localStorage.getItem('reachdesk_bank_account') || '',
        localStorage.getItem('reachdesk_bank_iban') || ''
      );

      // 3. Refresh user profile in app context
      if (onRefreshProfile) {
        await onRefreshProfile();
      }

      // 4. Navigate to correct view based on useCase
      if (useCase === 'leads') {
        navigate('/leads');
      } else if (useCase === 'clients') {
        navigate('/invoices');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Error during setup wizard submission:', err);
      setError(err.message || 'Failed to save setup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      const { error: updateErr } = await supabase
        .from('user_profiles')
        .update({ has_completed_setup: true })
        .eq('id', profile.id);

      if (updateErr) throw updateErr;

      if (onRefreshProfile) {
        await onRefreshProfile();
      }
      navigate('/dashboard');
    } catch (err) {
      console.error('Error skipping setup wizard:', err);
      setError('Failed to skip. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(13, 17, 23, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      padding: '1.5rem'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-card, #161B22)',
        border: '1px solid var(--border, #30363D)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '520px',
        padding: '2.5rem',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
        color: 'var(--text-primary, #F0F6FC)',
        fontFamily: 'var(--font-body, system-ui, -apple-system, sans-serif)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{
            fontFamily: 'Mattone, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontSize: '0.85rem',
            color: 'var(--accent-blue, #5B8FB9)',
            display: 'block',
            marginBottom: '0.5rem'
          }}>
            Welcome to ReachDesk
          </span>
          <h2 style={{
            margin: '0 0 0.5rem 0',
            fontSize: '1.75rem',
            fontWeight: 700,
            color: 'var(--text-primary, #FFFFFF)',
            fontFamily: 'var(--font-heading, Mattone, sans-serif)'
          }}>
            Let's Set Up Your Workspace
          </h2>
          <p style={{
            margin: 0,
            fontSize: '0.9rem',
            color: 'var(--text-secondary, #8B949E)'
          }}>
            Configure your basic settings to start tracking leads and payments.
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(248, 81, 73, 0.15)',
            border: '1px solid rgba(248, 81, 73, 0.4)',
            color: '#FF7B72',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            fontSize: '0.85rem',
            marginBottom: '1.5rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary, #C9D1D9)' }}>
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              style={{
                backgroundColor: 'var(--bg-primary, #0D1117)',
                border: '1px solid var(--border, #30363D)',
                borderRadius: '6px',
                padding: '0.65rem 0.85rem',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary, #C9D1D9)' }}>
              Business Name
            </label>
            <input
              type="text"
              required
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. ReachDesk CRM"
              style={{
                backgroundColor: 'var(--bg-primary, #0D1117)',
                border: '1px solid var(--border, #30363D)',
                borderRadius: '6px',
                padding: '0.65rem 0.85rem',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary, #C9D1D9)' }}>
                Default Currency
              </label>
              <CurrencySelector
                value={defaultCurrency}
                onChange={setDefaultCurrency}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary, #C9D1D9)' }}>
                Monthly Target Revenue
              </label>
              <input
                type="number"
                min="0"
                value={revenueTarget}
                onChange={(e) => setRevenueTarget(e.target.value)}
                placeholder="e.g. 5000"
                style={{
                  backgroundColor: 'var(--bg-primary, #0D1117)',
                  border: '1px solid var(--border, #30363D)',
                  borderRadius: '6px',
                  padding: '0.65rem 0.85rem',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary, #C9D1D9)' }}>
              What do you want to use ReachDesk for?
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { id: 'leads', label: 'Lead outreach (finding & pitching clients)' },
                { id: 'clients', label: 'Client management & invoicing' },
                { id: 'both', label: 'Both (full pipeline & revenue tracking)' }
              ].map((opt) => (
                <label
                  key={opt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: useCase === opt.id ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-primary, #0D1117)',
                    border: useCase === opt.id ? '1px solid var(--accent-blue, #5B8FB9)' : '1px solid var(--border, #30363D)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <input
                    type="radio"
                    name="useCase"
                    value={opt.id}
                    checked={useCase === opt.id}
                    onChange={() => setUseCase(opt.id)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: '1rem',
              backgroundColor: 'var(--accent-blue, #5B8FB9)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              padding: '0.75rem',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
              transition: 'opacity 0.15s ease'
            }}
          >
            {isSubmitting ? 'Setting up...' : 'Get Started'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <button
            type="button"
            onClick={handleSkip}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary, #8B949E)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Skip setup wizard
          </button>
        </div>
      </div>
    </div>
  );
}
