import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, Eye, EyeOff, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getMarketingUrl } from '../utils/domain';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeoutPassed, setTimeoutPassed] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const hash = window.location.hash || '';
      const params = window.location.search || '';

      if (hash.includes('type=recovery') || params.includes('type=recovery')) {
        setShowResetForm(true);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && (hash.includes('access_token') || sessionStorage.getItem('is_recovering_password') === 'true')) {
        sessionStorage.removeItem('is_recovering_password');
        setShowResetForm(true);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setShowResetForm(true);
    });

    const timer = setTimeout(() => setTimeoutPassed(true), 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) throw new Error(updateErr.message || 'Failed to update password.');

      setSuccess('Password updated. Redirecting…');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <a href={getMarketingUrl('/homepage')} className="auth-page-logo">
        REACHDESK
      </a>

      <div className="auth-panel">
        <header className="auth-panel-header">
          <h1 className="auth-panel-title">
            {showResetForm ? 'Set a new password' : 'Verifying link…'}
          </h1>
          <p className="auth-panel-sub">
            {showResetForm
              ? 'Choose a password you’ll remember — at least 6 characters.'
              : 'Hang tight while we confirm your recovery link.'}
          </p>
        </header>

        {error && (
          <div className="auth-error-banner" role="alert">
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="auth-success-banner" role="status">
            <Check size={16} />
            <span>{success}</span>
          </div>
        )}

        {showResetForm ? (
          <form className="auth-form-linear" onSubmit={handleResetSubmit}>
            <label className="auth-field">
              <span className="auth-field-label">New password</span>
              <div className="rd-password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input w-full"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={loading}
                  autoFocus
                />
                <button
                  type="button"
                  className="rd-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <label className="auth-field">
              <span className="auth-field-label">Confirm password</span>
              <div className="rd-password-wrap">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="form-input w-full"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="rd-password-toggle"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        ) : (
          <div className="auth-form-linear" style={{ alignItems: 'center' }}>
            <div className="rd-spinner" aria-hidden />
            {timeoutPassed && (
              <>
                <p className="auth-panel-sub" style={{ textAlign: 'center' }}>
                  Taking longer than expected. Make sure you opened the link from your email.
                </p>
                <Link to="/login" className="auth-btn auth-btn-secondary" style={{ textDecoration: 'none' }}>
                  Back to login
                </Link>
              </>
            )}
          </div>
        )}

        {showResetForm && (
          <p className="auth-switch">
            <Link to="/login">Back to login</Link>
          </p>
        )}
      </div>
    </div>
  );
}
