import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, CheckCircle, AlertCircle, Loader2, ArrowLeft, Landmark } from 'lucide-react';

import { BILLING } from './Paywalls';

// Monthly pricing only
const MONTHLY_USD = BILLING.monthly.starter.usdTotal;
const MONTHLY_PKR = BILLING.monthly.starter.pkrPerMonth;

const selectedPlan = 'starter';

export default function UpgradeRequestForm({
  profile,
  isModal = false,
  initialPlan = 'starter',
  onCancel,
  onSuccess
}) {
  const [fullName, setFullName]       = useState(profile?.full_name || '');
  const [mobileNumber, setMobileNumber] = useState(profile?.mobile_number || '');
  const [receiptFile, setReceiptFile] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitted, setSubmitted]     = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 5MB limit.');
      setReceiptFile(null);
      e.target.value = null;
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('Invalid file type. Only JPG, PNG, WEBP, and PDF files are accepted.');
      setReceiptFile(null);
      e.target.value = null;
      return;
    }
    setErrorMessage('');
    setReceiptFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim()) { setErrorMessage('Full Name is required.'); return; }
    const digitsOnly = mobileNumber.replace(/\D/g, '');
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      setErrorMessage('Mobile Number must contain between 10 and 15 digits.');
      return;
    }
    if (!receiptFile) { setErrorMessage('Payment receipt is required.'); return; }

    setLoading(true);
    try {
      const sanitizedFileName = receiptFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const storagePath = `${profile.id}/${Date.now()}_${sanitizedFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(storagePath, receiptFile);
      if (uploadError) throw new Error(`Receipt upload failed: ${uploadError.message}`);

      const descriptiveMsg = `${fullName} (${profile.email}) requested Starter Plan (Monthly) — ${MONTHLY_USD}/mo (≈ Rs ${MONTHLY_PKR})`;
      const { error: notifError } = await supabase
        .from('admin_notifications')
        .insert({
          from_user_id: profile.id,
          from_email: profile.email,
          from_name: fullName,
          type: 'plan_request',
          requested_plan: 'starter',
          billing_cycle: 'monthly',
          paid_amount: MONTHLY_PKR,
          mobile_number: digitsOnly,
          full_name: fullName,
          receipt_url: storagePath,
          request_status: 'pending',
          message: descriptiveMsg
        });
      if (notifError) throw new Error(`Failed to save notification: ${notifError.message}`);

      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          payment_pending: true,
          requested_plan: 'starter',
          requested_billing_cycle: 'monthly',
          paid_amount: MONTHLY_PKR
        })
        .eq('id', profile.id);
      if (profileError) throw new Error(`Failed to update profile: ${profileError.message}`);

      supabase.functions.invoke('send-upgrade-email', {
        body: { fullName, email: profile.email, mobileNumber: digitsOnly, requestedPlan: 'starter', billingCycle: 'monthly', paidAmount: MONTHLY_PKR, receiptPath: storagePath }
      }).catch(err => console.error('Silent Edge Function invocation error:', err));

      supabase.functions.invoke('send-push-notification', {
        body: { notify_admin: true, title: 'Upgrade Request', body: `${profile.email} requested starter plan (monthly)`, url: '/admin' }
      }).catch(err => console.warn('[Push] Upgrade request admin notification failed:', err));

      // Also send push directly to the specific admin user (user id: f647945e-f1d3-42fd-b85b-2b2a92134fba)
      supabase.functions.invoke('send-push-notification', {
        body: {
          target_user_id: 'f647945e-f1d3-42fd-b85b-2b2a92134fba',
          title: 'Upgrade Request',
          body: `${profile.email} requested starter plan (monthly)`,
          url: '/admin'
        }
      }).catch(err => console.warn('[Push] Direct admin upgrade push failed:', err));

      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'An error occurred during submission.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex-col align-center text-center gap-3" style={{ padding: '2rem 1rem' }}>
        <div style={{ color: 'var(--accent-green)', marginBottom: '0.5rem' }}>
          <CheckCircle size={48} />
        </div>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem' }}>Request Submitted!</h3>
        <p className="color-muted" style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
          We'll review your payment and activate your plan soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex-col gap-3" style={{ textAlign: 'left', width: '100%' }}>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.8rem', padding: 0, marginBottom: '0.5rem', fontWeight: 600 }}
        >
          <ArrowLeft size={14} /> Back to plans
        </button>
      )}

      {errorMessage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: 'rgba(224, 82, 82, 0.08)', border: '0.5px solid var(--status-hot)', borderRadius: '4px', color: 'var(--status-hot)', fontFamily: 'var(--font-body)', fontSize: '0.8rem' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Plan display — Starter only */}
      <div style={{ padding: '0.875rem 1rem', background: 'var(--bg-card)', border: '1.5px solid var(--accent-blue)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '2px' }}>Selected Plan</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', color: 'var(--text-primary)' }}>Starter</div>
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', background: 'var(--accent-blue)', color: '#0D1117', borderRadius: '3px', padding: '2px 8px', fontWeight: 600, letterSpacing: '0.04em' }}>
          Most Popular
        </div>
      </div>

      {/* Amount to Pay — prominent */}
      <div style={{ padding: '1rem', borderRadius: '6px', background: 'var(--bg-card)', border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Monthly Price
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', color: 'var(--text-primary)', lineHeight: 1 }}>
            <span style={{ fontFamily: 'var(--font-heading)' }}>$</span>{MONTHLY_USD}<span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>/mo</span>
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            ≈ Rs {MONTHLY_PKR}/mo · Monthly billing
          </div>
        </div>
      </div>

      {/* Full Name */}
      <div className="form-group">
        <label className="form-label">Full Name</label>
        <input type="text" className="form-input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Enter your full name" required disabled={loading} />
      </div>

      {/* Email */}
      <div className="form-group">
        <label className="form-label">Email Address</label>
        <input type="email" className="form-input" value={profile?.email || ''} disabled readOnly style={{ opacity: 0.5, cursor: 'not-allowed' }} />
      </div>

      {/* Mobile */}
      <div className="form-group">
        <label className="form-label">Mobile Number</label>
        <input type="tel" className="form-input" value={mobileNumber} onChange={e => setMobileNumber(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 03001234567" required disabled={loading} />
      </div>

      {/* Bank Details */}
      <div style={{ fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: '6px', padding: '0.875rem 1rem', border: '0.5px dashed var(--border-strong)', marginBottom: '0.25rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'var(--font-body)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          <Landmark size={14} /> Bank Transfer Details
        </div>
        <div><span style={{ color: 'var(--text-muted)' }}>Account No:</span> <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>05200112553962</strong></div>
        <div><span style={{ color: 'var(--text-muted)' }}>IBAN:</span> <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>PK78MEZN0005200112553962</strong></div>
      </div>

      {/* Attach Receipt */}
      <div className="form-group">
        <label className="form-label">Attach Payment Receipt</label>
        <div style={{ position: 'relative' }}>
          <input type="file" id="receipt-file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleFileChange} required disabled={loading} style={{ display: 'none' }} />
          <label
            htmlFor="receipt-file"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '4px', border: '1px dashed var(--border-strong)', background: 'transparent', color: 'var(--text-muted)', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.8rem', textAlign: 'center', transition: 'all 0.15s ease' }}
            onMouseOver={e => !loading && (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
            onMouseOut={e => !loading && (e.currentTarget.style.borderColor = 'var(--border-strong)')}
          >
            <Upload size={15} />
            {receiptFile ? receiptFile.name : 'Choose JPG, PNG, WEBP or PDF (max 5MB)'}
          </label>
        </div>
      </div>

      {/* Submit */}
      <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '0.5rem', justifyContent: 'center' }} disabled={loading}>
        {loading ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : 'Submit for Approval'}
      </button>
    </form>
  );
}
