import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

/**
 * GoogleSheetsCallback
 *
 * Handles the OAuth redirect from Google after the user grants permission.
 * URL pattern: /auth/google-sheets/callback?code=...&state=...
 *
 * Flow:
 * 1. Verify CSRF `state` parameter matches what was stored in sessionStorage
 * 2. Get current user session
 * 3. Call google-sheets-oauth-exchange edge function with the code
 * 4. On success → redirect to origin (CRM or Settings)
 * 5. On failure → show error with Try Again option
 */
export default function GoogleSheetsCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const errorParam = params.get('error');

      // ── User denied access ───────────────────────────────────────────────
      if (errorParam === 'access_denied') {
        setErrorMessage('You declined to connect Google Sheets. You can try again anytime.');
        setStatus('error');
        return;
      }

      if (!code) {
        setErrorMessage('No authorization code received from Google.');
        setStatus('error');
        return;
      }

      // ── CSRF verification ─────────────────────────────────────────────────
      const storedState = sessionStorage.getItem('google_sheets_oauth_state');
      sessionStorage.removeItem('google_sheets_oauth_state');

      if (!storedState || storedState !== state) {
        setErrorMessage('Security check failed: OAuth state mismatch. Please try connecting again.');
        setStatus('error');
        return;
      }

      // ── Get current user session ──────────────────────────────────────────
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.user?.id) {
        setErrorMessage('You must be logged in to connect Google Sheets. Please log in and try again.');
        setStatus('error');
        return;
      }

      const userId = session.user.id;
      // Detect redirect uri based on environment
      const redirectUri = window.location.origin + '/auth/google-sheets/callback';

      // ── Call the exchange edge function ───────────────────────────────────
      try {
        const { data, error } = await supabase.functions.invoke('google-sheets-oauth-exchange', {
          body: { code, userId, redirectUri },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        // ── Success ───────────────────────────────────────────────────────
        setStatus('success');

        // Fetch origin redirect or default to Settings
        const origin = sessionStorage.getItem('google_sheets_oauth_origin');
        sessionStorage.removeItem('google_sheets_oauth_origin');

        let targetUrl = '/settings?tab=integrations&connected=sheets';
        if (origin) {
          // If origin was CRM, append connected=sheets so CRM can detect and handle it
          if (origin.includes('/crm')) {
            targetUrl = origin.includes('?') ? `${origin}&connected=sheets` : `${origin}?connected=sheets`;
          } else {
            targetUrl = origin;
          }
        }

        // Small delay so user can see the success message
        setTimeout(() => {
          navigate(targetUrl, { replace: true });
        }, 1800);
      } catch (err) {
        console.error('[GoogleSheetsCallback] Exchange error:', err);
        setErrorMessage(err?.message || 'Failed to connect Google Sheets. Please try again.');
        setStatus('error');
      }
    }

    handleCallback();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary, #0d1117)',
    fontFamily: 'var(--font-body, Inter, sans-serif)',
    padding: '2rem',
  };

  const cardStyle = {
    background: 'var(--bg-card, #161b22)',
    border: '1px solid var(--border-color, #30363d)',
    borderRadius: '12px',
    padding: '2.5rem 3rem',
    textAlign: 'center',
    maxWidth: '480px',
    width: '100%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  };

  if (status === 'loading') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <Loader size={40} style={{ color: 'var(--accent-blue, #3b82f6)', animation: 'spin 1s linear infinite' }} />
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', color: 'var(--text-primary, #e6edf3)' }}>
            Connecting Google Sheets…
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted, #8b949e)', fontSize: '0.9rem' }}>
            Exchanging credentials with Google to link your spreadsheet integrations.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <CheckCircle size={40} style={{ color: '#10b981' }} />
          </div>
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', color: 'var(--text-primary, #e6edf3)' }}>
            Google Sheets Connected!
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted, #8b949e)', fontSize: '0.9rem' }}>
            You can now import and export leads directly from Google Sheets.
            Redirecting you back…
          </p>
        </div>
      </div>
    );
  }

  // Error state
  const origin = sessionStorage.getItem('google_sheets_oauth_origin') || '/settings?tab=integrations';
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <XCircle size={40} style={{ color: '#ef4444' }} />
        </div>
        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', color: 'var(--text-primary, #e6edf3)' }}>
          Connection Failed
        </h2>
        <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-muted, #8b949e)', fontSize: '0.9rem' }}>
          {errorMessage}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(origin)}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '6px',
              border: 'none',
              background: 'var(--accent-blue, #3b82f6)',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
