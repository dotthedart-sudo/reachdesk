import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ShieldAlert, Sparkles, ArrowRight, Eye, EyeOff, User, Upload, Check } from 'lucide-react';
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

  // OTP Verification States
  const [showVerificationScreen, setShowVerificationScreen] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState('');

  // Refs
  const fileInputRef = useRef(null);

  // Forgot Password States
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    setError('');
    setForgotMode(false);
    setForgotEmail('');
    setForgotSuccess('');
    setFullName('');
    setAvatarFile(null);
    setAvatarPreview('');
    setReferralSource('');
    setShowVerificationScreen(false);
    setVerificationCode('');
    setVerificationError('');
    setResendCooldown(0);
    setResendSuccess('');
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

  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    setVerificationError('');
    setLoading(true);

    if (verificationCode.length !== 6) {
      setVerificationError('Please enter a 6-digit code.');
      setLoading(false);
      return;
    }

    try {
      const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: verificationCode,
        type: 'signup'
      });

      if (verifyErr) throw verifyErr;

      // Verification succeeded! Now that we have an authenticated session,
      // upload the avatar file (if provided) and update user_profiles and auth metadata.
      if (verifyData.user && avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${verifyData.user.id}-${Date.now()}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadErr) {
          console.error('Avatar upload failed:', uploadErr);
        } else {
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          const avatarUrl = urlData?.publicUrl;
          if (avatarUrl) {
            // Update the user profile directly (since we are authenticated)
            await supabase.from('user_profiles')
              .update({ avatar_url: avatarUrl })
              .eq('id', verifyData.user.id);
            // Also update auth metadata to keep it in sync
            await supabase.auth.updateUser({
              data: { avatar_url: avatarUrl }
            });
          }
        }
      }

      navigate('/dashboard');
    } catch (err) {
      setVerificationError('Invalid or expired code, please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setVerificationError('');
    setResendSuccess('');
    setLoading(true);

    try {
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim()
      });
      if (resendErr) throw resendErr;

      setResendSuccess('Verification code resent successfully!');
      setResendCooldown(30);
    } catch (err) {
      setVerificationError(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      const { error: oAuthErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (oAuthErr) throw oAuthErr;
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
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
      setShowVerificationScreen(true);
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
          <span style={{fontFamily:'Mattone, sans-serif', textTransform:'uppercase', letterSpacing:'0.08em', fontSize:'11px', color:'var(--text-primary)', fontWeight:'400'}}>ReachDesk</span>
        </Link>
        <Link to="/homepage" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', borderRadius: '4px', padding: '3px 8px', fontSize: '0.7rem' }}>
          Back to Home
        </Link>
      </nav>

      {/* Main Container */}
      <div className="auth-container" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 1rem', overflowY: 'auto' }}>
        <div className="auth-card" style={{ borderRadius: '6px', padding: '1.75rem 1.5rem', gap: '1rem', width: '100%', maxWidth: '440px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '4px', background: 'rgba(91, 143, 185, 0.1)', border: '1px solid rgba(91, 143, 185, 0.25)', color: 'var(--primary-purple)', marginBottom: '0.5rem' }}>
              {showVerificationScreen ? <Mail size={24} /> : <Lock size={24} />}
            </div>
            <h2>{showVerificationScreen ? 'Verify your email' : (forgotMode ? 'Reset your password' : (mode === 'login' ? 'Welcome Back' : 'Create Account'))}</h2>
            <p className="color-muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
              {showVerificationScreen
                ? `Check your email — enter the 6-digit code we sent to ${email}`
                : (forgotMode 
                    ? "Enter your email and we'll send you a reset link" 
                    : (mode === 'login' ? 'Access your ReachDesk client workspace' : 'Start your free 7-day trial — no payment needed'))}
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
          {!forgotMode && !showVerificationScreen && (
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

          {showVerificationScreen ? (
            /* OTP Verification Form */
            <form onSubmit={handleVerifyOtpSubmit} className="auth-form" style={{ gap: '0.65rem' }}>
              {verificationError && (
                <div className="auth-error-banner" style={{ borderRadius: '4px', padding: '0.5rem 0.75rem' }}>
                  <ShieldAlert size={16} style={{ flexShrink: 0 }} />
                  <span>{verificationError}</span>
                </div>
              )}
              {resendSuccess && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Check size={16} style={{ flexShrink: 0 }} />
                  <span>{resendSuccess}</span>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">6-Digit Verification Code</label>
                <input 
                  type="text" 
                  maxLength={6}
                  className="form-input w-full text-center" 
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  style={{ fontSize: '1.25rem', letterSpacing: '0.25em', fontFamily: 'monospace' }}
                  required
                  disabled={loading}
                />
              </div>

              <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '0.25rem' }} disabled={loading}>
                {loading ? 'Verifying...' : 'Verify'}
                <ArrowRight size={16} />
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleResendCode}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--primary-purple)',
                    fontSize: '0.85rem',
                    cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                    padding: 0,
                    textDecoration: 'underline'
                  }}
                  disabled={resendCooldown > 0 || loading}
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowVerificationScreen(false);
                    setVerificationError('');
                    setResendSuccess('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  disabled={loading}
                >
                  ← Back to Sign Up
                </button>
              </div>
            </form>
          ) : forgotMode ? (
            /* Forgot Password Form */
            <form onSubmit={handleForgotSubmit} className="auth-form" style={{ gap: '0.65rem' }}>
              {forgotSuccess && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '0.875rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Check size={16} style={{ flexShrink: 0 }} />
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
            <>
              {/* Login Form */}
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

              <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                <span style={{ padding: '0 0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="btn btn-secondary w-full"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  borderRadius: '4px',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-strong)',
                  height: '42px',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
                disabled={loading}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" style={{ marginRight: '4px' }}>
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.49 3.77v3.12h3.99a11.96 11.96 0 0 0 3.55-8.74Z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.89-3.12c-1.08.72-2.48 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.21v3.22A12 12 0 0 0 12 24Z"/>
                  <path fill="#FBBC05" d="M5.27 14.17A7.18 7.18 0 0 1 4.8 12c0-.76.13-1.49.36-2.17V6.61H1.21A11.99 11.99 0 0 0 0 12c0 2.3.65 4.45 1.78 6.28l3.49-2.11Z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.92 11.92 0 0 0 12 0 12 12 0 0 0 1.21 6.61l3.49 2.11C5.65 6.86 8.3 4.75 12 4.75Z"/>
                </svg>
                Continue with Google
              </button>
            </>
          ) : (
            <>
              {/* Sign Up Form */}
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

              <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                <span style={{ padding: '0 0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="btn btn-secondary w-full"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  borderRadius: '4px',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-strong)',
                  height: '42px',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
                disabled={loading}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" style={{ marginRight: '4px' }}>
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.49 3.77v3.12h3.99a11.96 11.96 0 0 0 3.55-8.74Z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.89-3.12c-1.08.72-2.48 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.21v3.22A12 12 0 0 0 12 24Z"/>
                  <path fill="#FBBC05" d="M5.27 14.17A7.18 7.18 0 0 1 4.8 12c0-.76.13-1.49.36-2.17V6.61H1.21A11.99 11.99 0 0 0 0 12c0 2.3.65 4.45 1.78 6.28l3.49-2.11Z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.92 11.92 0 0 0 12 0 12 12 0 0 0 1.21 6.61l3.49 2.11C5.65 6.86 8.3 4.75 12 4.75Z"/>
                </svg>
                Continue with Google
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

