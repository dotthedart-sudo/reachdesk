import React, { useRef, useState } from 'react';
import { Upload, X, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CurrencySelector from './CurrencySelector';
import AuthLogo from './AuthLogo';
import { BRAND_NAME } from '../config/brand';

const USE_CASES = [
  { id: 'leads', label: 'Lead outreach', desc: 'Finding & pitching clients' },
  { id: 'clients', label: 'Clients & invoicing', desc: 'Manage projects and payments' },
  { id: 'both', label: 'Both', desc: 'Full pipeline & revenue tracking' },
];

const STEP_COPY = [
  {
    title: 'Name your workspace',
    sub: 'This is how your CRM will appear in settings and exports.',
  },
  {
    title: 'Set up your profile',
    sub: 'Add a photo and your name — optional, but helps on invoices and reminders.',
  },
  {
    title: 'Almost done',
    sub: `Pick defaults for currency and how you’ll use ${BRAND_NAME}.`,
  },
];

/**
 * Post-auth workspace setup — full-page Linear-style wizard (not a modal).
 */
export default function SetupModal({ profile, onRefreshProfile, onSaveSettings, navigate }) {
  const fileRef = useRef(null);
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [brandName, setBrandName] = useState(
    localStorage.getItem('reachdesk_brand_name') ||
    (profile?.full_name ? `${profile.full_name.trim().split(' ')[0]}'s workspace` : '')
  );
  const [defaultCurrency, setDefaultCurrency] = useState(profile?.default_currency || 'PKR');
  const [revenueTarget, setRevenueTarget] = useState(profile?.monthly_revenue_target || '');
  const [useCase, setUseCase] = useState('both');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleAvatarChange = (e) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
      setError('Use a JPG, PNG, or WebP image.');
      e.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB.');
      e.target.value = '';
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const clearAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(profile?.avatar_url || '');
    if (fileRef.current) fileRef.current.value = '';
  };

  const uploadAvatarIfNeeded = async () => {
    if (!avatarFile || !profile?.id) return profile?.avatar_url || null;

    const ext = avatarFile.name.split('.').pop() || 'jpg';
    const fileName = `${profile.id}-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarFile, { cacheControl: '3600', upsert: true });

    if (uploadErr) {
      console.error('Avatar upload failed:', uploadErr);
      throw new Error('Could not upload profile photo.');
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const avatarUrl = urlData?.publicUrl || null;
    if (avatarUrl) {
      await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });
    }
    return avatarUrl;
  };

  const goToDashboard = (path) => {
    sessionStorage.setItem('rd_reveal', '1');
    navigate(path);
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const avatarUrl = await uploadAvatarIfNeeded();

      const updates = {
        full_name: fullName.trim(),
        default_currency: defaultCurrency,
        monthly_revenue_target: revenueTarget ? Number(revenueTarget) : null,
        has_completed_setup: true,
      };
      if (avatarUrl) updates.avatar_url = avatarUrl;

      const { error: updateErr } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', profile.id);

      if (updateErr) throw updateErr;

      onSaveSettings(
        brandName.trim() || BRAND_NAME,
        defaultCurrency,
        localStorage.getItem('reachdesk_webhook_url') || '',
        localStorage.getItem('reachdesk_bank_account') || '',
        localStorage.getItem('reachdesk_bank_iban') || ''
      );

      if (onRefreshProfile) await onRefreshProfile();

      if (useCase === 'leads') goToDashboard('/leads');
      else if (useCase === 'clients') goToDashboard('/invoices');
      else goToDashboard('/dashboard');
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
      if (onRefreshProfile) await onRefreshProfile();
      goToDashboard('/dashboard');
    } catch (err) {
      console.error('Error skipping setup wizard:', err);
      setError('Failed to skip. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = (e) => {
    e.preventDefault();
    setError('');

    if (step === 0 && !brandName.trim()) {
      setError('Enter a workspace name.');
      return;
    }
    if (step === 1 && !fullName.trim()) {
      setError('Enter your name.');
      return;
    }
    if (step < 2) {
      setStep((s) => s + 1);
      return;
    }
    handleFinish();
  };

  const { title, sub } = STEP_COPY[step];

  return (
    <div className="auth-page rd-setup-page">
      <AuthLogo />

      <div className="auth-panel auth-panel-setup">
        {step > 0 && (
          <button
            type="button"
            className="auth-back rd-setup-back"
            onClick={() => { setError(''); setStep((s) => s - 1); }}
            disabled={isSubmitting}
          >
            <ArrowLeft size={16} /> Back
          </button>
        )}

        <header className="auth-panel-header">
          <h1 className="auth-panel-title">{title}</h1>
          <p className="auth-panel-sub">{sub}</p>
        </header>

        {error && (
          <div className="auth-error-banner" role="alert">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleNext} className="rd-setup-form">
          {step === 0 && (
            <div className="rd-setup-fields">
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="setup-brand">Workspace name</label>
                <input
                  id="setup-brand"
                  type="text"
                  required
                  autoFocus
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Acme Studio"
                  className="form-input"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="rd-setup-fields">
              <div className="rd-setup-avatar-center">
                <button
                  type="button"
                  className="rd-setup-avatar-btn rd-setup-avatar-btn-lg"
                  onClick={() => !isSubmitting && fileRef.current?.click()}
                  disabled={isSubmitting}
                  aria-label="Upload profile photo"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="" />
                  ) : (
                    <Upload size={22} />
                  )}
                </button>
                <div className="rd-setup-avatar-center-actions">
                  <button
                    type="button"
                    className="auth-text-btn"
                    onClick={() => fileRef.current?.click()}
                    disabled={isSubmitting}
                  >
                    Upload photo
                  </button>
                  {(avatarFile || (avatarPreview && avatarPreview !== profile?.avatar_url)) && (
                    <button
                      type="button"
                      className="auth-text-btn"
                      onClick={clearAvatar}
                      disabled={isSubmitting}
                    >
                      <X size={12} /> Remove
                    </button>
                  )}
                </div>
                <span className="rd-setup-avatar-hint">Optional · JPG/PNG · max 2MB</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarChange}
                  hidden
                  disabled={isSubmitting}
                />
              </div>

              <div className="auth-field">
                <label className="auth-field-label" htmlFor="setup-full-name">Your name</label>
                <input
                  id="setup-full-name"
                  type="text"
                  required
                  autoFocus
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="form-input"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="rd-setup-fields">
              <div className="auth-field">
                <label className="auth-field-label">Default currency</label>
                <CurrencySelector value={defaultCurrency} onChange={setDefaultCurrency} />
              </div>

              <div className="auth-field">
                <label className="auth-field-label" htmlFor="setup-target">Monthly revenue target</label>
                <input
                  id="setup-target"
                  type="number"
                  min="0"
                  value={revenueTarget}
                  onChange={(e) => setRevenueTarget(e.target.value)}
                  placeholder="Optional"
                  className="form-input"
                  disabled={isSubmitting}
                />
              </div>

              <div className="auth-field">
                <span className="auth-field-label">What will you use {BRAND_NAME} for?</span>
                <div className="rd-choice-list" role="radiogroup">
                  {USE_CASES.map((opt) => (
                    <label
                      key={opt.id}
                      className={`rd-choice ${useCase === opt.id ? 'is-selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="useCase"
                        value={opt.id}
                        checked={useCase === opt.id}
                        onChange={() => setUseCase(opt.id)}
                        disabled={isSubmitting}
                      />
                      <span className="rd-choice-text">
                        <strong>{opt.label}</strong>
                        <span>{opt.desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="rd-setup-actions">
            <button type="submit" className="auth-btn auth-btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Setting up…' : step < 2 ? 'Continue' : 'Open workspace'}
            </button>
            <button
              type="button"
              className="auth-text-btn rd-setup-skip"
              onClick={handleSkip}
              disabled={isSubmitting}
            >
              Skip for now
            </button>
          </div>
        </form>

        <div className="rd-setup-progress" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`rd-setup-progress-dot${i === step ? ' is-active' : i < step ? ' is-done' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
