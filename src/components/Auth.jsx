import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ShieldAlert, Sparkles, ArrowRight, Eye, EyeOff, User, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Auth({ onRegister, onLogin, mode = 'login' }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [plan, setPlan] = useState('trial');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [showPasswordSignup, setShowPasswordSignup] = useState(false);
  const [agreeConsent, setAgreeConsent] = useState(false);

  // New Signup Fields
  const [fullName, setFullName] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [referralSource, setReferralSource] = useState('');

  // Refs
  const fileInputRef = useRef(null);

  // Forgot Password States
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    setError('');
    setForgotMode(false);
    setForgotEmail('');
    setForgotSuccess('');
    setFullName('');
    setAvatarFile(null);
    setAvatarPreview('');
    setReferralSource('');
  }, [mode]);

  const handleAvatarChange = (e) => {
    setError('');
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSizeBytes = 2 * 1024 * 1024;

    if (!allowedTypes.includes(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
      setError('Only JPG, JPEG, PNG, or WebP images are allowed.');
      e.target.value = '';
      setAvatarFile(null);
      setAvatarPreview('');
      return;
    }

    if (file.size > maxSizeBytes) {
      setError('File size must be less than 2MB.');
      e.target.value = '';
      setAvatarFile(null);
      setAvatarPreview('');
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleToggleForgotMode = (val) => {
    setError('');
    setForgotSuccess('');
    setForgotEmail('');
    setForgotMode(val);
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setForgotSuccess('');
    setForgotLoading(true);

    if (!forgotEmail.trim()) {
      setError('Email is required.');
      setForgotLoading(false);
      return;
    }

    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: 'https://reachdesk.vercel.app/reset-password'
      });
      if (resetErr) throw resetErr;
      setForgotSuccess('Check your email for the reset link!');
    } catch (err) {
      setError(err.message || 'Failed to send reset link.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email.trim() || !password.trim() || !fullName.trim()) {
      setError('All fields are required.');
      setLoading(false);
      return;
    }

    // Full Name Validation
    const trimmedName = fullName.trim();
    if (trimmedName.length < 2 || !/^[a-zA-Z\s]+$/.test(trimmedName)) {
      setError('Please enter your real name.');
      setLoading(false);
      return;
    }

    if (!agreeConsent) {
      setError('You must agree to the Terms of Service, Privacy Policy, and Refund Policy.');
      setLoading(false);
      return;
    }

    // Email Regex Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    // Disposable/Fake Email Domain Validation
    const blockedDomains = [
      'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com',
      'throwaway.email', 'yopmail.com', 'sharklasers.com', 'trashmail.com'
    ];
    const emailDomain = email.trim().split('@')[1]?.toLowerCase();
    if (blockedDomains.includes(emailDomain)) {
      setError('Please use a valid email address.');
      setLoading(false);
      return;
    }

    // Avatar File Validation
    if (avatarFile) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const maxSizeBytes = 2 * 1024 * 1024;
      if (!allowedTypes.includes(avatarFile.type) && !/\.(jpe?g|png|webp)$/i.test(avatarFile.name)) {
        setError('Only JPG, JPEG, PNG, or WebP images are allowed.');
        setLoading(false);
        return;
      }
      if (avatarFile.size > maxSizeBytes) {
        setError('File size must be less than 2MB.');
        setLoading(false);
        return;
      }
    }

    try {
      await onRegister(email.trim(), password.trim(), plan, fullName, avatarFile, referralSource);
      navigate('/dashboard');
    } catch (err) {
      let errMsg = err.message || 'Registration failed.';
      if (
        errMsg.toLowerCase().includes('already registered') || 
        errMsg.toLowerCase().includes('user already exists') || 
        errMsg.toLowerCase().includes('email_exists')
      ) {
        errMsg = 'An account with this email already exists. Please log in instead.';
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError('Email and Password are required.');
      setLoading(false);
      return;
    }

    try {
      await onLogin(loginEmail.trim(), loginPassword.trim());
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-container">
      {/* Mini Nav */}
      <nav className="landing-nav">
        <Link to="/homepage" className="landing-nav-logo" style={{ cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <span style={{fontFamily:'Mattone, sans-serif', textTransform:'uppercase', letterSpacing:'0.08em', fontSize:'20px', color:'var(--text-primary)', fontWeight:'400'}}>ReachDesk</span>
        </Link>
        <Link to="/homepage" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', borderRadius: 0 }}>
          Back to Home
        </Link>
      </nav>

      {/* Main Container */}
      <div className="auth-container" style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 1rem', overflowY: 'auto' }}>
        <div className="auth-card" style={{ borderRadius: '6px', padding: '1.75rem 1.5rem', gap: '1rem', width: '100%', maxWidth: '440px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '4px', background: 'rgba(91, 143, 185, 0.1)', border: '1px solid rgba(91, 143, 185, 0.25)', color: 'var(--primary-purple)', marginBottom: '0.5rem' }}>
              <Lock size={24} />
            </div>
            <h2>{forgotMode ? 'Reset your password' : (mode === 'login' ? 'Welcome Back' : 'Create Account')}</h2>
            <p className="color-muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
              {forgotMode 
                ? "Enter your email and we'll send you a reset link" 
                : (mode === 'login' ? 'Access your ReachDesk client workspace' : 'Start your free 7-day trial — no payment needed')}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="auth-error-banner" style={{ borderRadius: '4px', padding: '0.5rem 0.75rem' }}>
              <ShieldAlert size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Auth Toggles */}
          {!forgotMode && (
            <div className="auth-tabs" style={{ borderRadius: '6px' }}>
              <button 
                className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                onClick={() => navigate('/login')}
                disabled={loading}
                style={{ borderRadius: '4px' }}
              >
                Log In
              </button>
              <button 
                className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
                onClick={() => navigate('/signup')}
                disabled={loading}
                style={{ borderRadius: '4px' }}
              >
                Sign Up
              </button>
            </div>
          )}

          {forgotMode ? (
            /* Forgot Password Form */
            <form onSubmit={handleForgotSubmit} className="auth-form" style={{ gap: '0.65rem' }}>
              {forgotSuccess && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>✓</span>
                  <span>{forgotSuccess}</span>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                    <Mail size={16} />
                  </span>
                  <input 
                    type="email" 
                    className="form-input w-full" 
                    placeholder="name@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                    required
                    disabled={forgotLoading}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '0.25rem' }} disabled={forgotLoading}>
                {forgotLoading ? 'Sending link...' : 'Send Reset Link'}
                <ArrowRight size={16} />
              </button>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleToggleForgotMode(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: 0
                  }}
                  disabled={forgotLoading}
                >
                  ← Back to Login
                </button>
              </div>
            </form>
          ) : mode === 'login' ? (
            /* Login Form */
            <form onSubmit={handleLoginSubmit} className="auth-form" style={{ gap: '0.65rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                    <Mail size={16} />
                  </span>
                  <input 
                    type="email" 
                    className="form-input w-full" 
                    placeholder="name@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                    <Lock size={16} />
                  </span>
                  <div className="relative" style={{ display: 'flex', alignItems: 'center' }}>
                    <input 
                      type={showPasswordLogin ? "text" : "password"} 
                      className="form-input w-full" 
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                      required
                      disabled={loading}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPasswordLogin(!showPasswordLogin)} 
                      style={{ position: 'absolute', right: '0.75rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                    >
                      {showPasswordLogin ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleForgotMode(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary-purple)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline'
                    }}
                    disabled={loading}
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '0.25rem' }} disabled={loading}>
                {loading ? 'Logging in...' : 'Log In'}
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            /* Sign Up Form */
            <form onSubmit={handleRegisterSubmit} className="auth-form" style={{ gap: '0.65rem' }}>
              {/* Full Name & Email Address side-by-side grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: 0 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                      <User size={16} />
                    </span>
                    <input 
                      type="text" 
                      className="form-input w-full" 
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      style={{ paddingLeft: '2.25rem' }}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                      <Mail size={16} />
                    </span>
                    <input 
                      type="email" 
                      className="form-input w-full" 
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{ paddingLeft: '2.25rem' }}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Password field full-width */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                    <Lock size={16} />
                  </span>
                  <div className="relative" style={{ display: 'flex', alignItems: 'center' }}>
                    <input 
                      type={showPasswordSignup ? "text" : "password"} 
                      className="form-input w-full" 
                      placeholder="Choose a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                      required
                      disabled={loading}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPasswordSignup(!showPasswordSignup)} 
                      style={{ position: 'absolute', right: '0.75rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                    >
                      {showPasswordSignup ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Slim profile photo uploader row */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                  disabled={loading}
                />
                <div 
                  onClick={() => !loading && fileInputRef.current?.click()}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem', 
                    padding: '0.5rem 0.75rem', 
                    border: '1px dashed var(--border-strong)', 
                    background: 'var(--bg-card)', 
                    cursor: 'pointer', 
                    borderRadius: '4px',
                    userSelect: 'none'
                  }}
                >
                  {avatarPreview ? (
                    <img 
                      src={avatarPreview} 
                      alt="Avatar Preview" 
                      style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }} 
                    />
                  ) : (
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      <Upload size={14} />
                    </div>
                  )}
                  <span style={{ fontSize: '0.8rem', color: avatarFile ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {avatarFile ? avatarFile.name : 'Add profile photo (optional)'}
                  </span>
                </div>
              </div>

              {/* Referral Dropdown */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="referralSource">How did you hear about us?</label>
                <select
                  id="referralSource"
                  className="form-select w-full"
                  value={referralSource}
                  onChange={(e) => setReferralSource(e.target.value)}
                  style={{ borderRadius: '4px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '0.5px solid var(--border-strong)', padding: '0.4rem 0.6rem', fontFamily: 'var(--font-body)', fontSize: '0.85rem', outline: 'none' }}
                  disabled={loading}
                >
                  <option value="">Select an option...</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Twitter/X">Twitter/X</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Google Search">Google Search</option>
                  <option value="Reddit">Reddit</option>
                  <option value="Friend/Colleague Referral">Friend/Colleague Referral</option>
                  <option value="Facebook Groups">Facebook Groups</option>
                  <option value="Product Hunt">Product Hunt</option>
                  <option value="YouTube">YouTube</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Trial info box */}
              <div style={{
                background: 'rgba(91, 143, 185, 0.08)',
                border: '1px solid rgba(91, 143, 185, 0.2)',
                borderRadius: '6px',
                padding: '0.75rem',
                textAlign: 'center',
                marginBottom: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.15rem'
              }}>
                <span style={{ color: 'var(--primary-purple)', fontWeight: '600', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  7-day free trial included
                </span>
                <span className="color-muted" style={{ fontSize: '0.75rem' }}>
                  Full access &middot; No payment needed &middot; Choose plan after trial
                </span>
              </div>

              {/* Consent bordered box containing only the Terms checkbox */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: 0, textAlign: 'left', fontSize: '0.8rem' }}>
                {/* Terms agreement checkbox */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <input 
                    type="checkbox" 
                    id="agreeConsent"
                    checked={agreeConsent}
                    onChange={(e) => setAgreeConsent(e.target.checked)}
                    style={{ marginTop: '0.15rem', cursor: 'pointer' }}
                    required
                    disabled={loading}
                  />
                  <label htmlFor="agreeConsent" style={{ color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', lineHeight: '1.4' }}>
                    I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-purple)', textDecoration: 'none', fontWeight: 600 }}>Terms of Service</a>, <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-purple)', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</a>, and <a href="/refund" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-purple)', textDecoration: 'none', fontWeight: 600 }}>Refund Policy</a>.
                  </label>
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '0.25rem' }} disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account & Launch'}
                <ArrowRight size={16} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

