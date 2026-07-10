import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, ShieldAlert, Sparkles, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
    // Check if the current URL has a recovery token in the hash.
    // Supabase JS v2 exchanges the token and fires PASSWORD_RECOVERY via
    // onAuthStateChange, but we also do an immediate check as a fallback.
    const checkSession = async () => {
      const hash = window.location.hash || '';
      const params = window.location.search || '';
      
      // Direct recovery URL check
      if (hash.includes('type=recovery') || params.includes('type=recovery')) {
        setShowResetForm(true);
        return;
      }

      // Also check if Supabase already exchanged the token (page reload after exchange)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && (hash.includes('access_token') || sessionStorage.getItem('is_recovering_password') === 'true')) {
        sessionStorage.removeItem('is_recovering_password');
        setShowResetForm(true);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowResetForm(true);
      }
    });

    const timer = setTimeout(() => {
      setTimeoutPassed(true);
    }, 5000);

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
      
      if (updateErr) {
        throw new Error(updateErr.message || 'Failed to update password.');
      }

      setSuccess('Password updated successfully! Redirecting...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <div className="landing-container">
      <nav className="landing-nav">
        <Link to="/homepage" className="landing-nav-logo" style={{ cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <span className="landing-logo-text" style={{ fontSize: '11px' }}>ReachDesk CRM</span>
        </Link>
        <Link to="/login" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', borderRadius: '4px', padding: '3px 8px', fontSize: '0.7rem' }}>
          Back to Login
        </Link>
      </nav>

      <div className="auth-container">
        <div className="auth-card">
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', color: 'var(--primary-purple)', marginBottom: '1rem' }}>
              <Sparkles size={24} />
            </div>
            <h2>{showResetForm ? 'Update Password' : 'Verifying Recovery Link'}</h2>
            <p className="color-muted" style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
              {showResetForm 
                ? 'Create a secure new password for your account' 
                : 'Please wait while we verify your secure recovery link...'}
            </p>
          </div>

          {error && (
            <div className="auth-error-banner" style={{ marginTop: '1rem' }}>
              <ShieldAlert size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>✓</span>
              <span>{success}</span>
            </div>
          )}

          {showResetForm ? (
            <form onSubmit={handleResetSubmit} className="auth-form" style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                    <Lock size={16} />
                  </span>
                  <div className="relative" style={{ display: 'flex', alignItems: 'center' }}>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      className="form-input w-full" 
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                      required
                      disabled={loading}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      style={{ position: 'absolute', right: '0.75rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                    <Lock size={16} />
                  </span>
                  <div className="relative" style={{ display: 'flex', alignItems: 'center' }}>
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      className="form-input w-full" 
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                      required
                      disabled={loading}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                      style={{ position: 'absolute', right: '0.75rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '0.5rem' }} disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
              <div className="loading-spinner-inner" style={{ border: '3px solid rgba(139, 92, 246, 0.1)', borderTop: '3px solid var(--primary-purple)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
              
              {timeoutPassed && (
                <div style={{ marginTop: '1rem', animation: 'fadeIn 0.5s ease-out' }}>
                  <p className="color-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    Verification taking longer than expected. Please ensure you clicked the link in your email.
                  </p>
                  <Link to="/login" className="btn btn-secondary w-full" style={{ textDecoration: 'none' }}>
                    Back to Login
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
