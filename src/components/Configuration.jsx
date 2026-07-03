import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PLAN_LIMITS } from '../lib/utils';
import { 
  Settings, Save, CreditCard, GitBranch, Plus, 
  Trash2, ChevronUp, ChevronDown, AlertCircle, Users, Mail, UserMinus, User, Upload,
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
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

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

  // Statuses states
  const [statuses, setStatuses] = useState([]);
  const [statusesLoading, setStatusesLoading] = useState(true);
  const [stagesMsg, setStagesMsg] = useState('');

  // Team states
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamInvitations, setTeamInvitations] = useState([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [teamError, setTeamError] = useState('');
  const [teamSuccess, setTeamSuccess] = useState('');

  // Load Statuses from Supabase
  const loadStatuses = async () => {
    setStatusesLoading(true);
    try {
      const { data, error } = await supabase
        .from('custom_statuses')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setStatuses(data || []);
    } catch (err) {
      console.error('Error fetching custom statuses:', err);
    } finally {
      setStatusesLoading(false);
    }
  };

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
      loadStatuses();
      loadTeam();
      setProfileName(currentUser.full_name || '');
      setProfileAvatarUrl(currentUser.avatar_url || '');
      setProfileAvatarFile(null);
      setProfileAvatarPreview('');
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
          avatar_url: finalAvatarUrl
        })
        .eq('id', currentUser.id);

      if (updateErr) throw updateErr;

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

  // ── Pipeline Status CRUD Helpers ──────────────────────────────────────────

  const handleAddStage = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_statuses')
        .insert({
          user_id: currentUser.id,
          label: 'New Stage',
          color: '#6b7280',
          sort_order: statuses.length
        })
        .select()
        .single();

      if (error) throw error;
      setStatuses(prev => [...prev, data]);
      if (onRefreshStatuses) onRefreshStatuses();
    } catch (err) {
      console.error('Error adding pipeline stage:', err);
    }
  };

  const handleUpdateStage = async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('custom_statuses')
        .update(updates)
        .eq('id', id)
        .eq('user_id', currentUser.id)
        .select()
        .single();

      if (error) throw error;
      setStatuses(prev => prev.map(s => s.id === id ? data : s));
      if (onRefreshStatuses) onRefreshStatuses();
    } catch (err) {
      console.error('Error updating pipeline stage:', err);
    }
  };

  const handleDeleteStage = async (id, label) => {
    try {
      // Check usage first
      const { count, error: countErr } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', currentUser.id)
        .eq('status', label);

      if (countErr) throw countErr;

      if (count && count > 0) {
        if (!confirm(`Warning: ${count} lead(s) are currently in the "${label}" stage. Deleting this stage will move all those leads to the default "Lead" stage. Do you want to proceed?`)) {
          return;
        }

        // Migrate leads
        const { error: updateErr } = await supabase
          .from('leads')
          .update({ status: 'Lead' })
          .eq('user_id', currentUser.id)
          .eq('status', label);

        if (updateErr) throw updateErr;
      }

      const { error: deleteErr } = await supabase
        .from('custom_statuses')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUser.id);

      if (deleteErr) throw deleteErr;

      setStatuses(prev => prev.filter(s => s.id !== id));
      if (onRefreshStatuses) onRefreshStatuses();
      setStagesMsg('success:Stage deleted successfully!');
      setTimeout(() => setStagesMsg(''), 3000);
    } catch (err) {
      console.error('Error deleting pipeline stage:', err);
      setStagesMsg('error:Failed to delete stage.');
    }
  };

  const handleMoveUp = async (index) => {
    if (index === 0) return;
    const s1 = statuses[index - 1];
    const s2 = statuses[index];

    try {
      await Promise.all([
        supabase.from('custom_statuses').update({ sort_order: index }).eq('id', s1.id),
        supabase.from('custom_statuses').update({ sort_order: index - 1 }).eq('id', s2.id)
      ]);
      loadStatuses();
      if (onRefreshStatuses) onRefreshStatuses();
    } catch (err) {
      console.error('Error reordering stages:', err);
    }
  };

  const handleMoveDown = async (index) => {
    if (index === statuses.length - 1) return;
    const s1 = statuses[index];
    const s2 = statuses[index + 1];

    try {
      await Promise.all([
        supabase.from('custom_statuses').update({ sort_order: index + 1 }).eq('id', s1.id),
        supabase.from('custom_statuses').update({ sort_order: index }).eq('id', s2.id)
      ]);
      loadStatuses();
      if (onRefreshStatuses) onRefreshStatuses();
    } catch (err) {
      console.error('Error reordering stages:', err);
    }
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

      {/* SECTION 2: Pipeline Stages CRUD */}
      <div className="card flex-col gap-3">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
          <GitBranch size={18} style={{ color: '#10b981' }} />
          <h3 style={{ fontSize: '1.1rem' }}>Pipeline Stages Editor</h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Create and color-code pipeline stages for CRM. Leads inside deleted stages will fallback to "Lead" status.
        </p>

        {stagesMsg && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem',
            background: stagesMsg.startsWith('error:') ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
            border: `1px solid ${stagesMsg.startsWith('error:') ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
            borderRadius: '8px', fontSize: '0.85rem', color: stagesMsg.startsWith('error:') ? '#ef4444' : '#10b981',
          }}>
            <AlertCircle size={15} />
            {stagesMsg.replace(/^(error:|success:)/, '')}
          </div>
        )}

        {statusesLoading ? (
          <div>Loading stages...</div>
        ) : (
          <div className="flex-col gap-2">
            {statuses.map((stage, idx) => (
              <div
                key={stage.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.6rem 0.9rem', background: 'var(--bg-tertiary)',
                  borderRadius: '8px', border: '1px solid var(--border-color)',
                }}
              >
                {/* Order Up/Down */}
                <div className="flex-col" style={{ gap: '1px' }}>
                  <button
                    type="button"
                    onClick={() => handleMoveUp(idx)}
                    disabled={idx === 0}
                    style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer', color: 'var(--text-secondary)' }}
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(idx)}
                    disabled={idx === statuses.length - 1}
                    style={{ background: 'none', border: 'none', cursor: idx === statuses.length - 1 ? 'not-allowed' : 'pointer', color: 'var(--text-secondary)' }}
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                {/* Color Dot Input */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: stage.color, border: '2px solid rgba(255,255,255,0.15)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                    <input
                      type="color"
                      value={stage.color}
                      onChange={e => handleUpdateStage(stage.id, { color: e.target.value })}
                      style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                    />
                  </div>
                </div>

                {/* Color Presets */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  {PRESET_COLORS.slice(0, 6).map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleUpdateStage(stage.id, { color: c })}
                      style={{
                        width: '14px', height: '14px', borderRadius: '50%',
                        background: c, border: stage.color === c ? '2px solid white' : '1px solid rgba(255,255,255,0.15)',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>

                {/* Label input */}
                <input
                  type="text"
                  className="form-input"
                  value={stage.label}
                  onChange={e => handleUpdateStage(stage.id, { label: e.target.value })}
                  style={{ flex: 1, padding: '0.35rem 0.65rem', fontSize: '0.88rem' }}
                  placeholder="Stage name"
                />

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleDeleteStage(stage.id, stage.label)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger-color)' }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleAddStage}
          >
            <Plus size={15} /> Add Stage
          </button>
        </div>
      </div>

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
                    {leadsCount} / {maxLeads === Infinity ? 'Unlimited' : maxLeads}
                  </span>
                </div>
                <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    background: 'var(--accent-blue)',
                    width: `${maxLeads === Infinity ? 0 : Math.min(100, (leadsCount / maxLeads) * 100)}%`,
                    borderRadius: '4px'
                  }} />
                </div>
              </div>

              {/* Templates Usage */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Templates</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {templatesCount} / {maxTemplates === Infinity ? 'Unlimited' : maxTemplates}
                  </span>
                </div>
                <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    background: 'var(--accent-blue)',
                    width: `${maxTemplates === Infinity ? 0 : Math.min(100, (templatesCount / maxTemplates) * 100)}%`,
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
              Your Starter plan will remain active until {currentUser?.plan_expires_at ? new Date(currentUser.plan_expires_at).toLocaleDateString() : currentUser?.trial_ends_at ? new Date(currentUser.trial_ends_at).toLocaleDateString() : 'the end of the current billing period'}. After that, your account will be downgraded. You will not be charged again.
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
