import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PLAN_LIMITS } from '../lib/utils';
import { 
  Settings, Save, CreditCard, 
  AlertCircle, Users, Mail, UserMinus, User, Upload,
  Download, FileText
} from 'lucide-react';
import { exportLeads, exportNotes } from '../utils/exportUtils';

const PRESET_COLORS = [
  '#6b7280', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6',
  '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316'
];

export default function Configuration({
  brandName,
  currencySymbol,
  webhookUrl,
  bankAccount,
  bankIban,
  onSaveSettings,
  currentUser,
  leadsCount,
  templatesCount = 0,
  onRefreshStatuses,
  onRefreshProfile
}) {
  const navigate = useNavigate();
  const [localBrand, setLocalBrand] = useState(brandName);
  const [localCurrency, setLocalCurrency] = useState(currencySymbol);
  const [localWebhook, setLocalWebhook] = useState(webhookUrl);
  const [localBankAccount, setLocalBankAccount] = useState(bankAccount || '');
  const [localBankIban, setLocalBankIban] = useState(bankIban || '');

  // Cancellation States
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('');
  const [cancelErrorMsg, setCancelErrorMsg] = useState('');

  // Profile Settings States
  const [profileName, setProfileName] = useState(currentUser?.full_name || '');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(currentUser?.avatar_url || '');
  const [profileAvatarFile, setProfileAvatarFile] = useState(null);
  const [profileAvatarPreview, setProfileAvatarPreview] = useState('');
  const [profileBankAccount, setProfileBankAccount] = useState(currentUser?.bank_account || '');
  const [profileBankIban, setProfileBankIban] = useState(currentUser?.bank_iban || '');
  const [profileDefaultCurrency, setProfileDefaultCurrency] = useState(currentUser?.default_currency || 'PKR');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(currentUser?.reminders_enabled !== false);
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(currentUser?.suggestions_enabled !== false);
  const [suggestionsAutoApply, setSuggestionsAutoApply] = useState(!!currentUser?.suggestions_auto_apply);

  const [exporting, setExporting] = useState(null); // 'leads' | 'notes' | null

  const handleExportLeadsClick = async () => {
    if (exporting) return;
    setExporting('leads');
    try {
      await exportLeads(currentUser.id);
    } catch (err) {
      console.error('Export leads error:', err);
      alert('Failed to export leads: ' + err.message);
    } finally {
      setExporting(null);
    }
  };

  const handleExportNotesClick = async () => {
    if (exporting) return;
    setExporting('notes');
    try {
      await exportNotes(currentUser.id);
    } catch (err) {
      console.error('Export notes error:', err);
      alert('Failed to export notes: ' + err.message);
    } finally {
      setExporting(null);
    }
  };

  // Team states
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamInvitations, setTeamInvitations] = useState([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [teamError, setTeamError] = useState('');
  const [teamSuccess, setTeamSuccess] = useState('');
  // Load Team Members
  const loadTeam = async () => {
    if (!currentUser.team_id) {
      setTeamLoading(false);
      return;
    }
    setTeamLoading(true);
    try {
      // Members
      const { data: members, error: mErr } = await supabase
        .from('user_profiles')
        .select('id, email, team_role, plan')
        .eq('team_id', currentUser.team_id);

      if (mErr) throw mErr;
      setTeamMembers(members || []);

      // Pending Invitations
      const { data: invites, error: iErr } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('team_id', currentUser.team_id)
        .eq('status', 'pending');

      if (iErr) throw iErr;
      setTeamInvitations(invites || []);
    } catch (err) {
      console.error('Error loading team details:', err);
    } finally {
      setTeamLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadTeam();
      setProfileName(currentUser.full_name || '');
      setProfileAvatarUrl(currentUser.avatar_url || '');
      setProfileAvatarFile(null);
      setProfileAvatarPreview('');
      setProfileBankAccount(currentUser.bank_account || '');
      setProfileBankIban(currentUser.bank_iban || '');
      setProfileDefaultCurrency(currentUser.default_currency || 'PKR');
      setRemindersEnabled(currentUser.reminders_enabled !== false);
      setSuggestionsEnabled(currentUser.suggestions_enabled !== false);
      setSuggestionsAutoApply(!!currentUser.suggestions_auto_apply);
    }
  }, [currentUser]);

  const handleProfileAvatarChange = (e) => {
    setProfileError('');
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSizeBytes = 2 * 1024 * 1024;

    if (!allowedTypes.includes(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
      setProfileError('Only JPG, JPEG, PNG, or WebP images are allowed.');
      e.target.value = '';
      setProfileAvatarFile(null);
      setProfileAvatarPreview('');
      return;
    }

    if (file.size > maxSizeBytes) {
      setProfileError('File size must be less than 2MB.');
      e.target.value = '';
      setProfileAvatarFile(null);
      setProfileAvatarPreview('');
      return;
    }

    setProfileAvatarFile(file);
    setProfileAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileSaving(true);

    const trimmedName = profileName.trim();
    if (trimmedName.length < 2 || !/^[a-zA-Z\s]+$/.test(trimmedName)) {
      setProfileError('Please enter your real name.');
      setProfileSaving(false);
      return;
    }

    try {
      let finalAvatarUrl = profileAvatarUrl;

      if (profileAvatarFile) {
        const fileExt = profileAvatarFile.name.split('.').pop();
        const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(fileName, profileAvatarFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadErr) {
          throw new Error(`Profile photo upload failed: ${uploadErr.message}`);
        }

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        finalAvatarUrl = urlData?.publicUrl || null;
      }

      const { error: updateErr } = await supabase
        .from('user_profiles')
        .update({
          full_name: trimmedName,
          avatar_url: finalAvatarUrl,
          bank_account: profileBankAccount.trim() || null,
          bank_iban: profileBankIban.trim() || null,
          default_currency: profileDefaultCurrency || 'PKR',
          reminders_enabled: remindersEnabled,
          suggestions_enabled: suggestionsEnabled,
          suggestions_auto_apply: suggestionsAutoApply
        })
        .eq('id', currentUser.id);

      if (updateErr) throw updateErr;

      // Also sync to localStorage so Invoice Generator picks it up immediately
      if (profileBankAccount) localStorage.setItem('reachdesk_bank_account', profileBankAccount.trim());
      if (profileBankIban) localStorage.setItem('reachdesk_bank_iban', profileBankIban.trim());
      if (profileDefaultCurrency) localStorage.setItem('reachdesk_currency_symbol', profileDefaultCurrency);

      setProfileSuccess('Profile updated successfully!');
      setProfileAvatarFile(null);
      setProfileAvatarPreview('');
      if (onRefreshProfile) {
        await onRefreshProfile();
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSubmitSettings = (e) => {
    e.preventDefault();
    onSaveSettings(localBrand, localCurrency, localWebhook, localBankAccount, localBankIban);
  };


  // ── Team Invitation Helpers ────────────────────────────────────────────────

  const handleSendInvite = async (e) => {
    e.preventDefault();
    setTeamError('');
    setTeamSuccess('');

    if (!inviteEmail.trim()) return;

    try {
      // 1. Verify plan limits
      const plan = (currentUser.plan || 'teams').toLowerCase();
      
      // Calculate current members + pending invites
      const totalCount = teamMembers.length + teamInvitations.length;

      if (plan === 'teams' && totalCount >= 3) {
        setTeamError('Max 3 members allowed on Teams plan. Please contact us for Enterprise plan options.');
        return;
      }

      // 2. Create Invite
      const { error } = await supabase
        .from('team_invitations')
        .insert({
          team_id: currentUser.team_id,
          invited_email: inviteEmail.trim().toLowerCase(),
          invited_by: currentUser.id,
          status: 'pending'
        });

      if (error) throw error;

      setInviteEmail('');
      setTeamSuccess(`Invite sent to ${inviteEmail.trim()} successfully!`);
      loadTeam();
    } catch (err) {
      console.error('Error sending invite:', err);
      setTeamError(err.message || 'Failed to send invite.');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Are you sure you want to remove this member from the team? They will be downgraded to a trial plan.')) return;
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          team_id: null, 
          team_role: 'owner', 
          plan: 'trial',
          status: 'approved',
          trial_ends_at: new Date(Date.now() + 168*60*60*1000).toISOString() // 7-day trial
        })
        .eq('id', memberId);

      if (error) throw error;
      setTeamMembers(prev => prev.filter(m => m.id !== memberId));
      setTeamSuccess('Team member removed.');
    } catch (err) {
      console.error('Error removing team member:', err);
      setTeamError('Failed to remove team member.');
    }
  };

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    setCancelErrorMsg('');
    setCancelSuccessMsg('');
    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: { subscription_id: currentUser?.paddle_subscription_id }
      });

      if (error) throw error;
      if (data && data.success === false) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      setCancelSuccessMsg('Your subscription has been cancelled. Access continues till end of billing period.');
      setCancelModalOpen(false);
      if (onRefreshProfile) {
        await onRefreshProfile();
      }
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setCancelErrorMsg(err instanceof Error ? err.message : 'Failed to cancel subscription. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };

  const getIdentityRole = () => {
    if (!currentUser) return 'Unknown';
    if (currentUser.role === 'admin' || currentUser.email === 'dotthedart@gmail.com') return 'System Administrator';
    return `${currentUser.plan.charAt(0).toUpperCase() + currentUser.plan.slice(1)} Plan User`;
  };

  if (!currentUser) {
    return <div className="loading-container">Loading profile...</div>;
  }

  const isTeamOrEnterprise = ['teams', 'enterprise'].includes((currentUser.plan || '').toLowerCase());

  return (
    <div className="flex-col gap-4" style={{ textAlign: 'left', maxWidth: '800px' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h2>Configuration Settings</h2>
        <p className="color-muted" style={{ fontSize: '0.9rem' }}>
          Manage your business configurations, custom status pipeline, and team workspace.
        </p>
      </div>

      {/* SECTION 0: Profile Settings */}
      <form onSubmit={handleSaveProfile} className="flex-col gap-4" style={{ marginBottom: '1.5rem' }}>
        <div className="card flex-col gap-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
            <User size={18} style={{ color: 'var(--primary-purple)' }} />
            <h3 style={{ fontSize: '1.1rem' }}>Profile Settings</h3>
          </div>

          {profileError && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(224, 82, 82, 0.1)', border: '1px solid rgba(224, 82, 82, 0.2)', color: 'var(--status-hot)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{profileError}</span>
            </div>
          )}

          {profileSuccess && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>✓</span>
              <span>{profileSuccess}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'center' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="e.g. Jane Doe"
                required
                disabled={profileSaving}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Profile Photo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {profileAvatarPreview ? (
                  <img
                    src={profileAvatarPreview}
                    alt="Avatar Preview"
                    style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }}
                  />
                ) : profileAvatarUrl ? (
                  <img
                    src={profileAvatarUrl}
                    alt="Current Avatar"
                    style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }}
                  />
                ) : (
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-secondary)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    <Upload size={16} />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfileAvatarChange}
                  style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}
                  disabled={profileSaving}
                />
              </div>
            </div>
          </div>

          {/* Invoice & Payment Defaults */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginTop: '0.5rem' }}>
            <div className="form-group">
              <label className="form-label">Default Currency</label>
              <select
                className="form-select"
                value={profileDefaultCurrency}
                onChange={(e) => setProfileDefaultCurrency(e.target.value)}
                disabled={profileSaving}
              >
                <option value="PKR">PKR (Rs.)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
                <option value="AED">AED (Dhs)</option>
              </select>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>Auto-fills invoices</span>
            </div>
            <div className="form-group">
              <label className="form-label">Bank Account Number</label>
              <input
                type="text"
                className="form-input"
                value={profileBankAccount}
                onChange={(e) => setProfileBankAccount(e.target.value)}
                placeholder="e.g. 05200112553962"
                disabled={profileSaving}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>Auto-fills payment instructions</span>
            </div>
            <div className="form-group">
              <label className="form-label">Bank IBAN</label>
              <input
                type="text"
                className="form-input"
                value={profileBankIban}
                onChange={(e) => setProfileBankIban(e.target.value)}
                placeholder="e.g. PK78MEZN0005200112553962"
                disabled={profileSaving}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>Auto-fills payment instructions</span>
            </div>

            {/* Automation & Checkpoint Settings */}
            <div style={{ gridColumn: 'span 2', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Settings size={18} style={{ color: 'var(--primary-purple)' }} />
                Automation & Checkpoints
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block' }}>Follow-up Reminders</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Generate reminders automatically based on checkpoint timeline.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={remindersEnabled}
                    onChange={(e) => setRemindersEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    disabled={profileSaving}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block' }}>Action Suggestions</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Enable status-based action suggestions and warning bulbs.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={suggestionsEnabled}
                    onChange={(e) => setSuggestionsEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    disabled={profileSaving}
                  />
                </div>

                {suggestionsEnabled && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '1rem' }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block' }}>Auto-apply Suggestions</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Automatically sync action_to_take when a lead's status changes.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={suggestionsAutoApply}
                      onChange={(e) => setSuggestionsAutoApply(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      disabled={profileSaving}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={profileSaving}>
              <Save size={16} /> {profileSaving ? 'Saving Profile...' : 'Save Profile'}
            </button>
          </div>
        </div>
      </form>

      {/* SECTION 0.5: Data Export backup */}
      <div className="card flex-col gap-3" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
          <Download size={18} style={{ color: 'var(--primary-purple)' }} />
          <h3 style={{ fontSize: '1.1rem' }}>Data Export (Backup)</h3>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
          Download a proactive backup of your freelance data at any time. Leads are exported as a CSV spreadsheet, and notes are exported as a structured plain text document.
        </p>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportLeadsClick}
            disabled={exporting === 'leads'}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} />
            {exporting === 'leads' ? 'Exporting...' : 'Export Leads (CSV)'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportNotesClick}
            disabled={exporting === 'notes'}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FileText size={14} />
            {exporting === 'notes' ? 'Exporting...' : 'Export Notes (TXT)'}
          </button>
        </div>
      </div>

      {/* SECTION 1: Business specifications */}
      <form onSubmit={handleSubmitSettings} className="flex-col gap-4">
        <div className="card flex-col gap-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
            <Settings size={18} style={{ color: 'var(--primary-purple)' }} />
            <h3 style={{ fontSize: '1.1rem' }}>Business Footprint Settings</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Freelancer Brand Label Name</label>
              <input
                type="text"
                className="form-input"
                value={localBrand}
                onChange={(e) => setLocalBrand(e.target.value)}
                placeholder="e.g. ESEMDOT Core Solutions"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Operation Currency Node Symbol</label>
              <input
                type="text"
                className="form-input"
                value={localCurrency}
                onChange={(e) => setLocalCurrency(e.target.value)}
                placeholder="e.g. PKR"
                required
              />
            </div>
          </div>
          
          {/* Webhook URL — hidden for Starter plan */}
          {(currentUser?.plan || '').toLowerCase() !== 'starter' && (
            <div className="form-group">
              <label className="form-label">Webhook URL (Telemetry Integrations)</label>
              <input
                type="url"
                className="form-input"
                value={localWebhook}
                onChange={(e) => setLocalWebhook(e.target.value)}
                placeholder="e.g. https://api.yourdomain.com/v1/telemetry"
              />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Bank Account Number</label>
              <input
                type="text"
                className="form-input"
                value={localBankAccount}
                onChange={(e) => setLocalBankAccount(e.target.value)}
                placeholder="e.g. 05200112553962"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Bank IBAN</label>
              <input
                type="text"
                className="form-input"
                value={localBankIban}
                onChange={(e) => setLocalBankIban(e.target.value)}
                placeholder="e.g. PK78MEZN0005200112553962"
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="submit" className="btn btn-primary">
              <Save size={16} /> Save Settings
            </button>
          </div>
        </div>
      </form>


      {/* SECTION 3: Team Members invite panel */}
      {isTeamOrEnterprise && currentUser.team_id && (
        <div className="card flex-col gap-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
            <Users size={18} style={{ color: 'var(--primary-magenta)' }} />
            <h3 style={{ fontSize: '1.1rem' }}>Team Workspace Members</h3>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Your Team Plan allows up to <strong style={{ color: 'var(--primary-magenta)' }}>3 members</strong> (Enterprise allows unlimited). Invite teammates to share templates, leads, and tracking data.
          </p>

          {teamError && <div style={{ color: 'var(--danger-color)', fontSize: '0.85rem' }}>{teamError}</div>}
          {teamSuccess && <div style={{ color: 'var(--success-color)', fontSize: '0.85rem' }}>{teamSuccess}</div>}

          {teamLoading ? (
            <div>Loading team directory...</div>
          ) : (
            <div className="flex-col gap-2" style={{ margin: '1rem 0' }}>
              {teamMembers.map(member => (
                <div key={member.id} className="flex justify-between align-center" style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{member.email}</span>
                    {member.id === currentUser.id && <span className="badge badge-approved" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>You</span>}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({member.team_role})</span>
                  </div>
                  {member.id !== currentUser.id && member.team_role !== 'owner' && (
                    <button 
                      onClick={() => handleRemoveMember(member.id)}
                      className="btn btn-danger btn-sm"
                      style={{ padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <UserMinus size={12} /> Remove
                    </button>
                  )}
                </div>
              ))}

              {teamInvitations.map(invite => (
                <div key={invite.id} className="flex justify-between align-center" style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px dashed var(--border-color)', borderRadius: '6px', opacity: 0.7 }}>
                  <div>
                    <span className="color-muted">{invite.invited_email}</span>
                    <span className="badge badge-pending" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>Pending Invite</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Send Invitation Form */}
          <form onSubmit={handleSendInvite} style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Mail size={16} />
              </span>
              <input
                type="email"
                required
                placeholder="colleague@email.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="form-input w-full"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Send Invite
            </button>
          </form>
        </div>
      )}

      {/* SECTION 3.5 & 4: Billing & Subscription */}
      <div className="card flex-col gap-3">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
          <CreditCard size={18} style={{ color: 'var(--accent-blue)' }} />
          <h3 style={{ fontSize: '1.1rem' }}>Billing &amp; Subscription</h3>
        </div>

        {cancelSuccessMsg && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>✓</span>
            <span>{cancelSuccessMsg}</span>
          </div>
        )}

        {cancelErrorMsg && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(224, 82, 82, 0.1)', border: '1px solid rgba(224, 82, 82, 0.2)', color: 'var(--status-hot)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{cancelErrorMsg}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', minWidth: '100px' }}>Current Plan</span>
            <span style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              textTransform: 'capitalize'
            }}>
              {currentUser?.plan || 'Trial'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', minWidth: '100px' }}>Status</span>
            <span style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              padding: '2px 10px',
              borderRadius: '3px',
              background: currentUser?.plan_status === 'active'
                ? 'rgba(16, 185, 129, 0.1)'
                : currentUser?.plan_status === 'cancelling'
                  ? 'rgba(245, 158, 11, 0.1)'
                  : 'rgba(245, 158, 11, 0.1)',
              color: currentUser?.plan_status === 'active'
                ? '#10b981'
                : currentUser?.plan_status === 'cancelling'
                  ? 'var(--warning-color)'
                  : 'var(--warning-color)',
              border: `1px solid ${
                currentUser?.plan_status === 'active'
                  ? '#10b981'
                  : currentUser?.plan_status === 'cancelling'
                    ? 'rgba(245, 158, 11, 0.4)'
                    : 'rgba(245, 158, 11, 0.4)'
              }`,
            }}>
              {currentUser?.plan_status === 'active'
                ? 'Active'
                : currentUser?.plan_status === 'cancelling'
                  ? 'Cancelling'
                  : currentUser?.plan === 'trial'
                    ? 'Trial'
                    : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Usage Progress Section */}
        {(() => {
          const planKey = (currentUser?.plan || 'trial').toLowerCase();
          const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS.trial;
          const maxLeads = limits.leads;
          const maxTemplates = limits.templates;

          return (
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Leads Usage */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Leads</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {leadsCount} / {maxLeads === Infinity || maxLeads === null ? 'Unlimited' : maxLeads}
                  </span>
                </div>
                <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    background: 'var(--accent-blue)',
                    width: `${maxLeads === Infinity || maxLeads === null ? 0 : Math.min(100, (leadsCount / maxLeads) * 100)}%`,
                    borderRadius: '4px'
                  }} />
                </div>
              </div>

              {/* Templates Usage */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Templates</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {templatesCount} / {maxTemplates === Infinity || maxTemplates === null ? 'Unlimited' : maxTemplates}
                  </span>
                </div>
                <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    background: 'var(--accent-blue)',
                    width: `${maxTemplates === Infinity || maxTemplates === null ? 0 : Math.min(100, (templatesCount / maxTemplates) * 100)}%`,
                    borderRadius: '4px'
                  }} />
                </div>
              </div>
            </div>
          );
        })()}

        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/upgrade')}
          >
            <CreditCard size={15} /> Manage Plan
          </button>

          {currentUser?.plan_status === 'active' && currentUser?.paddle_subscription_id && (
            <button
              type="button"
              onClick={() => setCancelModalOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--status-hot)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                padding: 0,
                marginTop: '0.25rem',
                textDecoration: 'underline',
                fontFamily: 'inherit'
              }}
            >
              Cancel Subscription
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {cancelModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000,
          padding: '1rem'
        }}>
          <div className="card flex-col gap-4" style={{ maxWidth: '450px', width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '3px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-primary)', fontFamily: 'Mattone, sans-serif' }}>Cancel Subscription?</h3>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
              Are you sure? Your plan will remain active until the end of your current billing period, then your data is retained for 30 days.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setCancelModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--accent-blue)',
                  color: 'var(--accent-blue)',
                  borderRadius: '3px',
                  padding: '0.4rem 1rem',
                  cursor: 'pointer'
                }}
                disabled={cancelLoading}
              >
                Keep My Plan
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleCancelSubscription}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--status-hot)',
                  color: 'var(--status-hot)',
                  borderRadius: '3px',
                  padding: '0.4rem 1rem',
                  cursor: 'pointer'
                }}
                disabled={cancelLoading}
              >
                {cancelLoading ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
