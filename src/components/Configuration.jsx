import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAppContext } from '../App';
import { PLAN_LIMITS } from '../lib/utils';
import { 
  Settings, Save, CreditCard, 
  AlertCircle, Users, Mail, UserMinus, User, Upload,
  Download, FileText, Sparkles, Plus, Trash2, Edit3,
  Calendar, CheckCircle, Unlink, Lock
} from 'lucide-react';
import { exportLeads, exportNotes } from '../utils/exportUtils';
import CurrencySelector, { CURRENCY_MAP } from './CurrencySelector';

const PRESET_COLORS = [
  '#6b7280', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6',
  '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316'
];

// Use CURRENCY_MAP for symbol lookups (covers all 34+ currencies)
const CURRENCY_SYMBOLS = CURRENCY_MAP;

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
  const location = useLocation();
  const { userSnippets = [], handleAddSnippet, handleDeleteSnippet, handleUpdateSnippet, theme } = useAppContext();
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [snippetError, setSnippetError] = useState('');
  const [snippetSuccess, setSnippetSuccess] = useState('');
  const [editingSnippetId, setEditingSnippetId] = useState(null);
  const [editingKey, setEditingKey] = useState('');
  const [editingValue, setEditingValue] = useState('');
  const [editError, setEditError] = useState('');

  const onCreateSnippet = async (e) => {
    e.preventDefault();
    setSnippetError('');
    setSnippetSuccess('');
    const key = newKey.trim().toLowerCase();
    const val = newValue.trim();

    if (!key) {
      setSnippetError('Key is required');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(key)) {
      setSnippetError('Key must be alphanumeric and underscores only');
      return;
    }

    const defaultKeys = ['name', 'first_name', 'last_name', 'email', 'company', 'niche', 'phone', 'status', 'priority', 'action_to_take', 'last_contacted_at', 'project'];
    const isDuplicate = defaultKeys.includes(key) || userSnippets.some(s => s.snippet_key.toLowerCase() === key);
    if (isDuplicate) {
      setSnippetError('Snippet key already exists (or is a reserved keyword)');
      return;
    }

    try {
      await handleAddSnippet({ snippet_key: key, snippet_value: val });
      setNewKey('');
      setNewValue('');
      setSnippetSuccess('Snippet created successfully!');
      setTimeout(() => setSnippetSuccess(''), 3000);
    } catch (err) {
      setSnippetError(err.message || 'Failed to create snippet');
    }
  };

  const onDeleteSnippetClick = async (id) => {
    if (!confirm('Are you sure you want to delete this snippet?')) return;
    try {
      await handleDeleteSnippet(id);
    } catch (err) {
      alert(err.message || 'Failed to delete snippet');
    }
  };

  const onStartEdit = (snip) => {
    setEditingSnippetId(snip.id);
    setEditingKey(snip.snippet_key);
    setEditingValue(snip.snippet_value);
    setEditError('');
  };

  const onSaveEdit = async (id) => {
    setEditError('');
    const key = editingKey.trim().toLowerCase();
    const val = editingValue.trim();

    if (!key) {
      setEditError('Key is required');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(key)) {
      setEditError('Key must be alphanumeric / underscores');
      return;
    }

    const defaultKeys = ['name', 'first_name', 'last_name', 'email', 'company', 'niche', 'phone', 'status', 'priority', 'action_to_take', 'last_contacted_at', 'project'];
    const isDuplicate = defaultKeys.includes(key) || userSnippets.some(s => s.id !== id && s.snippet_key.toLowerCase() === key);
    if (isDuplicate) {
      setEditError('Snippet key already exists');
      return;
    }

    try {
      await handleUpdateSnippet(id, { snippet_key: key, snippet_value: val });
      setEditingSnippetId(null);
    } catch (err) {
      setEditError(err.message || 'Failed to update snippet');
    }
  };

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
  const [suggestionsAutoApply, setSuggestionsAutoApply] = useState(currentUser?.suggestions_auto_apply !== false);
  const [monthlyRevenueTarget, setMonthlyRevenueTarget] = useState(currentUser?.monthly_revenue_target || '');
  const [alwaysDraft, setAlwaysDraft] = useState(currentUser?.always_draft_before_sending !== false);
  const [defaultCountryCode, setDefaultCountryCode] = useState(currentUser?.default_country_code || '+92');

  const [exporting, setExporting] = useState(null); // 'leads' | 'notes' | null

  // ── Google Calendar Integration State ────────────────────────────────────
  const [calIntegration, setCalIntegration] = useState(null); // row from calendar_integrations
  const [calLoading, setCalLoading] = useState(true);
  const [calDisconnecting, setCalDisconnecting] = useState(false);
  const [calSuccessMsg, setCalSuccessMsg] = useState('');

  // ── Google Sheets Integration State ──────────────────────────────────────
  const [sheetsIntegration, setSheetsIntegration] = useState(null); // row from sheets_integrations
  const [sheetsLoading, setSheetsLoading] = useState(true);
  const [sheetsDisconnecting, setSheetsDisconnecting] = useState(false);
  const [sheetsSuccessMsg, setSheetsSuccessMsg] = useState('');

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
      setSuggestionsAutoApply(currentUser.suggestions_auto_apply !== false);
      setMonthlyRevenueTarget(currentUser.monthly_revenue_target || '');
    }
  }, [currentUser]);

  // ── Fetch calendar integration status ────────────────────────────────────
  useEffect(() => {
    async function fetchCalIntegration() {
      if (!currentUser?.id) { setCalLoading(false); return; }
      const { data } = await supabase
        .from('calendar_integrations')
        .select('id, connected_at, watch_expiration, is_active')
        .eq('user_id', currentUser.id)
        .eq('provider', 'google')
        .maybeSingle();
      setCalIntegration(data?.is_active ? data : null);
      setCalLoading(false);
    }
    fetchCalIntegration();
  }, [currentUser?.id]);

  // ── Show success banner if redirected back after OAuth ────────────────────
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('connected') === 'google') {
      setCalSuccessMsg('Google Calendar connected successfully! Leads will now be auto-marked as Booked when they appear in your calendar.');
      // Clean up URL without triggering a navigation
      window.history.replaceState({}, '', '/settings?tab=integrations');
      setTimeout(() => setCalSuccessMsg(''), 8000);
    }
  }, [location.search]);

  // ── Connect Google Calendar (initiates OAuth with CSRF state) ────────────
  const handleConnectCalendar = () => {
    const state = crypto.randomUUID();
    sessionStorage.setItem('google_oauth_state', state);
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = encodeURIComponent('https://reachdeskcrm.com/auth/google/callback');
    const scope = encodeURIComponent(
      'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly'
    );
    window.location.href = [
      'https://accounts.google.com/o/oauth2/v2/auth',
      `?client_id=${clientId}`,
      `&redirect_uri=${redirectUri}`,
      '&response_type=code',
      `&scope=${scope}`,
      '&access_type=offline',
      '&prompt=consent',
      `&state=${state}`,
    ].join('');
  };

  // ── Disconnect Google Calendar ────────────────────────────────────────────
  const handleDisconnectCalendar = async () => {
    if (!confirm('Disconnect Google Calendar? ReachDesk will no longer auto-detect bookings from your calendar.')) return;
    setCalDisconnecting(true);
    try {
      // Step 1: Get the current access token to revoke
      const { data: integration } = await supabase
        .from('calendar_integrations')
        .select('access_token, watch_channel_id, watch_resource_id')
        .eq('user_id', currentUser.id)
        .eq('provider', 'google')
        .single();

      if (integration) {
        // Step 2: Revoke the token at Google's end
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${integration.access_token}`, { method: 'POST' });
        } catch (revokeErr) {
          console.warn('Token revocation error (non-fatal):', revokeErr);
        }

        // Step 3: Stop the active watch channel via edge function
        if (integration.watch_channel_id) {
          try {
            await supabase.functions.invoke('setup-calendar-watch', {
              body: { action: 'stop', userId: currentUser.id },
            });
          } catch (stopErr) {
            console.warn('Watch stop error (non-fatal):', stopErr);
          }
        }
      }

      // Step 4: Remove/deactivate the DB row
      await supabase
        .from('calendar_integrations')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('provider', 'google');

      setCalIntegration(null);
      setCalSuccessMsg('Google Calendar disconnected. You can reconnect anytime.');
      setTimeout(() => setCalSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Disconnect error:', err);
      alert('Failed to disconnect: ' + (err.message || String(err)));
    } finally {
      setCalDisconnecting(false);
    }
  };

  // ── Fetch Sheets integration status ──────────────────────────────────────
  useEffect(() => {
    async function fetchSheetsIntegration() {
      if (!currentUser?.id) { setSheetsLoading(false); return; }
      const { data } = await supabase
        .from('sheets_integrations')
        .select('id, connected_at, is_active')
        .eq('user_id', currentUser.id)
        .maybeSingle();
      setSheetsIntegration(data?.is_active ? data : null);
      setSheetsLoading(false);
    }
    fetchSheetsIntegration();
  }, [currentUser?.id]);

  // ── Show sheets success banner if redirected back after OAuth ─────────────
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('connected') === 'sheets') {
      setSheetsSuccessMsg('Google Sheets connected successfully! You can now import and export leads directly.');
      window.history.replaceState({}, '', '/settings?tab=integrations');
      setTimeout(() => setSheetsSuccessMsg(''), 8000);
    }
  }, [location.search]);

  // ── Connect Google Sheets (initiates OAuth with CSRF state) ──────────────
  const handleConnectSheets = () => {
    const state = crypto.randomUUID();
    sessionStorage.setItem('google_sheets_oauth_state', state);
    sessionStorage.setItem('google_sheets_oauth_origin', '/settings?tab=integrations');
    const clientId = import.meta.env.VITE_GOOGLE_SHEETS_CLIENT_ID;
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/google-sheets/callback');
    const scope = encodeURIComponent('https://www.googleapis.com/auth/spreadsheets');
    window.location.href = [
      'https://accounts.google.com/o/oauth2/v2/auth',
      `?client_id=${clientId}`,
      `&redirect_uri=${redirectUri}`,
      '&response_type=code',
      `&scope=${scope}`,
      '&access_type=offline',
      '&prompt=consent',
      `&state=${state}`,
    ].join('');
  };

  // ── Disconnect Google Sheets ──────────────────────────────────────────────
  const handleDisconnectSheets = async () => {
    if (!confirm('Disconnect Google Sheets? ReachDesk will no longer be able to export or import leads from your sheets.')) return;
    setSheetsDisconnecting(true);
    try {
      const { data: integration } = await supabase
        .from('sheets_integrations')
        .select('access_token')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (integration?.access_token) {
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${integration.access_token}`, { method: 'POST' });
        } catch (revokeErr) {
          console.warn('Token revocation error (non-fatal):', revokeErr);
        }
      }

      await supabase
        .from('sheets_integrations')
        .delete()
        .eq('user_id', currentUser.id);

      setSheetsIntegration(null);
      setSheetsSuccessMsg('Google Sheets disconnected. You can reconnect anytime.');
      setTimeout(() => setSheetsSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Disconnect error:', err);
      alert('Failed to disconnect: ' + (err.message || String(err)));
    } finally {
      setSheetsDisconnecting(false);
    }
  };

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
          suggestions_auto_apply: suggestionsAutoApply,
          monthly_revenue_target: monthlyRevenueTarget ? Number(monthlyRevenueTarget) : null,
          always_draft_before_sending: alwaysDraft,
          default_country_code: defaultCountryCode.trim() || '+92'
        })
        .eq('id', currentUser.id);

      if (updateErr) throw updateErr;

      if (onRefreshProfile) onRefreshProfile();

      // Automatically sync suggestions in database if enabled
      if (suggestionsEnabled && suggestionsAutoApply) {
        try {
          const [rulesRes, leadsRes] = await Promise.all([
            supabase.from('action_suggestion_rules').select('*'),
            supabase.from('leads').select('id, status, action_to_take').eq('user_id', currentUser.id)
          ]);
          const rules = rulesRes.data || [];
          const leadsData = leadsRes.data || [];

          if (leadsData.length > 0 && rules.length > 0) {
            const updates = [];
            for (const lead of leadsData) {
              const matchedRule = rules.find(r => r.status.toLowerCase() === (lead.status || '').toLowerCase());
              const suggestedAction = matchedRule ? matchedRule.suggested_action : null;
              if (suggestedAction && lead.action_to_take !== suggestedAction) {
                updates.push(
                  supabase.from('leads').update({ action_to_take: suggestedAction }).eq('id', lead.id)
                );
              }
            }
            if (updates.length > 0) {
              await Promise.all(updates);
            }
          }
        } catch (syncErr) {
          console.error('Error auto-syncing suggestion mismatches on save:', syncErr);
        }
      }

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
                <label 
                  htmlFor="avatar-upload" 
                  className="btn btn-secondary btn-sm"
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                >
                  <Upload size={14} /> Choose Photo
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleProfileAvatarChange}
                  style={{ display: 'none' }}
                  disabled={profileSaving}
                />
                {profileAvatarFile && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {profileAvatarFile.name.slice(0, 20)}{profileAvatarFile.name.length > 20 ? '...' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Invoice & Payment Defaults */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '0.5rem' }}>
            <div className="form-group">
              <label className="form-label">Default Currency</label>
              <CurrencySelector
                value={profileDefaultCurrency}
                onChange={(val) => setProfileDefaultCurrency(val)}
                placeholder="Select currency..."
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>Auto-fills invoices & target metrics</span>
            </div>

            <div className="form-group">
              <label className="form-label">Monthly Revenue Target</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', pointerEvents: 'none', fontSize: '0.9rem' }}>
                  {CURRENCY_SYMBOLS[profileDefaultCurrency] || '$'}
                </span>
                <input
                  type="number"
                  className="form-input"
                  style={{ paddingLeft: (CURRENCY_SYMBOLS[profileDefaultCurrency] || '$').length > 1 ? '2.75rem' : '1.75rem' }}
                  value={monthlyRevenueTarget}
                  onChange={(e) => setMonthlyRevenueTarget(e.target.value)}
                  placeholder="e.g. 5000"
                  disabled={profileSaving}
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>Monthly earnings goal</span>
            </div>
          </div>

            {/* Automation & Checkpoint Settings */}
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
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

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block' }}>Always draft before sending</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Customize template preview and destinations before initiating messages.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={alwaysDraft}
                    onChange={(e) => setAlwaysDraft(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    disabled={profileSaving}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block' }}>Default Country Code</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Default prefix (e.g. +92) used to normalize local phone numbers for WhatsApp/SMS.</span>
                  </div>
                  <input
                    type="text"
                    value={defaultCountryCode}
                    onChange={(e) => setDefaultCountryCode(e.target.value)}
                    placeholder="+92"
                    style={{ width: '80px', padding: '4px 8px', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: '3px', color: 'var(--text-primary)', fontSize: '0.85rem', textAlign: 'center' }}
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

      {/* SECTION: My Snippets */}
      <div className="card flex-col gap-3" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
          <Sparkles size={18} style={{ color: 'var(--accent-blue)' }} />
          <h3 style={{ fontSize: '1.1rem' }}>My Snippets</h3>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
          Create user-defined snippets with static values (e.g. <code>[calendly_link]</code> or <code>[signature]</code>) to quickly personalize your templates.
        </p>

        {/* Quick Add Snippet Form */}
        <form onSubmit={onCreateSnippet} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: '150px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Snippet Key</label>
            <input
              type="text"
              className="form-input"
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
              placeholder="e.g. calendly_link"
              required
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 2, minWidth: '250px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Snippet Value</label>
            <input
              type="text"
              className="form-input"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              placeholder="e.g. https://calendly.com/username"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '1.3rem', height: '38px', padding: '0 1rem' }}>
            <Plus size={16} /> Add Snippet
          </button>
        </form>

        {snippetError && (
          <div style={{ padding: '0.5rem 0.75rem', borderRadius: '4px', background: 'rgba(224, 82, 82, 0.1)', border: '1px solid rgba(224, 82, 82, 0.2)', color: 'var(--status-hot)', fontSize: '0.8rem' }}>
            {snippetError}
          </div>
        )}

        {snippetSuccess && (
          <div style={{ padding: '0.5rem 0.75rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '0.8rem' }}>
            {snippetSuccess}
          </div>
        )}

        {/* Snippets List */}
        <div style={{ marginTop: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Key</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Value</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600, width: '120px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {userSnippets.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No snippets created yet.
                  </td>
                </tr>
              ) : (
                userSnippets.map(snip => {
                  const isEditing = editingSnippetId === snip.id;
                  return (
                    <tr key={snip.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                        {isEditing ? (
                          <input
                            type="text"
                            className="form-input"
                            value={editingKey}
                            onChange={e => setEditingKey(e.target.value)}
                            style={{ padding: '4px 8px', fontSize: '0.8rem', height: '28px' }}
                          />
                        ) : (
                          <code style={{ fontSize: '0.85rem', color: 'var(--accent-blue)' }}>[{snip.snippet_key}]</code>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <input
                              type="text"
                              className="form-input"
                              value={editingValue}
                              onChange={e => setEditingValue(e.target.value)}
                              style={{ padding: '4px 8px', fontSize: '0.8rem', height: '28px' }}
                            />
                            {editError && (
                              <span style={{ color: 'var(--danger-color)', fontSize: '0.7rem' }}>{editError}</span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>{snip.snippet_value}</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditingSnippetId(null)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '2px 8px', minHeight: 'auto', fontSize: '0.75rem', height: '26px' }}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => onSaveEdit(snip.id)}
                                className="btn btn-primary btn-sm"
                                style={{ padding: '2px 8px', minHeight: 'auto', fontSize: '0.75rem', height: '26px' }}
                              >
                                Save
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => onStartEdit(snip)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px', minHeight: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Edit snippet"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteSnippetClick(snip.id)}
                                className="btn btn-danger btn-sm"
                                style={{ padding: '4px', minHeight: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Delete snippet"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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

      {/* ─── INTEGRATIONS SECTION ─────────────────────────────────────────── */}
      <div className="card flex-col gap-3" id="integrations" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Locked Overlay */}
        {!PLAN_LIMITS[(currentUser?.plan || 'trial').toLowerCase()]?.integrations && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: theme === 'light' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(22, 27, 34, 0.85)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            gap: '0.75rem',
            textAlign: 'center',
            padding: '1.5rem'
          }}>
            <Lock size={32} style={{ color: 'var(--primary-purple)' }} />
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Integrations are Locked</h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '280px' }}>
              Google Calendar integration is a Pro feature. Upgrade to Pro or Teams to automatically sync meetings.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/upgrade')}
              style={{ marginTop: '0.25rem' }}
            >
              Upgrade Now
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
          <Calendar size={18} style={{ color: 'var(--primary-purple)' }} />
          <h3 style={{ fontSize: '1.1rem' }}>Integrations</h3>
        </div>

        {calSuccessMsg && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <CheckCircle size={16} style={{ flexShrink: 0 }} />
            <span>{calSuccessMsg}</span>
          </div>
        )}

        {sheetsSuccessMsg && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <CheckCircle size={16} style={{ flexShrink: 0 }} />
            <span>{sheetsSuccessMsg}</span>
          </div>
        )}

        {/* Google Calendar Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', padding: '0.75rem 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '8px', flexShrink: 0,
              background: 'linear-gradient(135deg, #4285f4, #34a853)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Calendar size={20} style={{ color: '#fff' }} />
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '0.95rem' }}>Google Calendar</strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {calLoading
                  ? 'Checking status…'
                  : calIntegration
                    ? `Connected · since ${new Date(calIntegration.connected_at).toLocaleDateString()}`
                    : 'Not connected — leads won\'t be auto-marked as Booked'
                }
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {!calLoading && (
              calIntegration ? (
                <>
                  <span style={{
                    padding: '0.2rem 0.65rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700,
                    background: 'rgba(16,185,129,0.12)', color: '#10b981'
                  }}>
                    ✓ Connected
                  </span>
                  <button
                    type="button"
                    onClick={handleDisconnectCalendar}
                    disabled={calDisconnecting}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--danger-color, #ef4444)', borderColor: 'var(--danger-color, #ef4444)' }}
                  >
                    <Unlink size={14} />
                    {calDisconnecting ? 'Disconnecting…' : 'Disconnect'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectCalendar}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Calendar size={14} /> Connect
                </button>
              )
            )}
          </div>
        </div>

        {/* Google Sheets Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', padding: '0.75rem 0', borderTop: '1px solid var(--border-color, #30363d)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '8px', flexShrink: 0,
              background: 'linear-gradient(135deg, #0f9d58, #0b8043)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM10 17H7V14H10V17ZM10 12H7V9H10V12ZM17 17H12V14H17V17ZM17 12H12V9H17V12Z" fill="#fff"/>
              </svg>
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '0.95rem' }}>Google Sheets</strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {sheetsLoading
                  ? 'Checking status…'
                  : sheetsIntegration
                    ? `Connected · since ${new Date(sheetsIntegration.connected_at).toLocaleDateString()}`
                    : 'Not connected — export and import from Google Sheets'
                }
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {!sheetsLoading && (
              sheetsIntegration ? (
                <>
                  <span style={{
                    padding: '0.2rem 0.65rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700,
                    background: 'rgba(16,185,129,0.12)', color: '#10b981'
                  }}>
                    ✓ Connected
                  </span>
                  <button
                    type="button"
                    onClick={handleDisconnectSheets}
                    disabled={sheetsDisconnecting}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--danger-color, #ef4444)', borderColor: 'var(--danger-color, #ef4444)' }}
                  >
                    <Unlink size={14} />
                    {sheetsDisconnecting ? 'Disconnecting…' : 'Disconnect'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectSheets}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '2px' }}>
                    <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM10 17H7V14H10V17ZM10 12H7V9H10V12ZM17 17H12V14H17V17ZM17 12H12V9H17V12Z" fill="currentColor"/>
                  </svg>
                  Connect
                </button>
              )
            )}
          </div>
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
          Read-only access to your calendar events. ReachDesk never writes to your calendar.
          Disconnect at any time to revoke all access.
        </p>
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
