import React, { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CurrencySelector from './CurrencySelector';

const USE_CASES = [
  { id: 'leads', label: 'Lead outreach', desc: 'Finding & pitching clients' },
  { id: 'clients', label: 'Clients & invoicing', desc: 'Manage projects and payments' },
  { id: 'both', label: 'Both', desc: 'Full pipeline & revenue tracking' },
];

/**
 * Post-auth workspace setup (Linear-style): photo, name, company — then optional prefs.
 */
export default function SetupModal({ profile, onRefreshProfile, onSaveSettings, navigate }) {
  const fileRef = useRef(null);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        brandName.trim() || 'ReachDesk',
        defaultCurrency,
        localStorage.getItem('reachdesk_webhook_url') || '',
        localStorage.getItem('reachdesk_bank_account') || '',
        localStorage.getItem('reachdesk_bank_iban') || ''
      );

      if (onRefreshProfile) await onRefreshProfile();

      if (useCase === 'leads') navigate('/leads');
      else if (useCase === 'clients') navigate('/invoices');
      else navigate('/dashboard');
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
      navigate('/dashboard');
    } catch (err) {
      console.error('Error skipping setup wizard:', err);
      setError('Failed to skip. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop rd-setup-backdrop">
      <div className="modal-content rd-modal">
        <div className="rd-modal-header rd-modal-header-center">
          <div>
            <p className="rd-modal-eyebrow">Welcome to ReachDesk</p>
            <h3>Create your workspace</h3>
            <p className="rd-modal-sub">Add a photo, your name, and company — takes a minute.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rd-modal-form">
          <div className="rd-modal-body">
            {error && (
              <div className="auth-error-banner" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
                <span>{error}</span>
              </div>
            )}

            <div className="rd-form">
              <div className="rd-form-group rd-setup-avatar">
                <span className="form-label">Profile photo</span>
                <div className="rd-setup-avatar-row">
                  <button
                    type="button"
                    className="rd-setup-avatar-btn"
                    onClick={() => !isSubmitting && fileRef.current?.click()}
                    disabled={isSubmitting}
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="" />
                    ) : (
                      <Upload size={20} />
                    )}
                  </button>
                  <div className="rd-setup-avatar-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
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
                    <span className="rd-setup-avatar-hint">Optional · JPG/PNG · max 2MB</span>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarChange}
                    hidden
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="rd-form-group">
                <label className="form-label" htmlFor="setup-full-name">Your name</label>
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

              <div className="rd-form-group">
                <label className="form-label" htmlFor="setup-brand">Company / workspace name</label>
                <input
                  id="setup-brand"
                  type="text"
                  required
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Acme Studio"
                  className="form-input"
                  disabled={isSubmitting}
                />
              </div>

              <div className="rd-form-row">
                <div className="rd-form-group">
                  <label className="form-label">Default currency</label>
                  <CurrencySelector value={defaultCurrency} onChange={setDefaultCurrency} />
                </div>
                <div className="rd-form-group">
                  <label className="form-label" htmlFor="setup-target">Monthly revenue target</label>
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
              </div>

              <div className="rd-form-group">
                <span className="form-label">What will you use ReachDesk for?</span>
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
          </div>

          <div className="rd-modal-footer rd-modal-footer-stack">
            <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Setting up…' : 'Continue'}
            </button>
            <button
              type="button"
              className="auth-text-btn"
              onClick={handleSkip}
              disabled={isSubmitting}
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
