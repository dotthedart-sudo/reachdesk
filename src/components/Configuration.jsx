import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAppContext } from '../App';
import { PLAN_LIMITS, normalizePlan, getEffectivePlan, getEffectiveBillingCycle } from '../lib/utils';
import { getPlanLeadLimit } from '../lib/leadLimits';
import { getAiCreditLimit } from '../lib/aiCredits';
import {
  ensureProTeamWorkspace,
  getSeatsRemaining,
  getSeatsUsed,
  getTeamSeatLimit,
  hasTeamsPageAccess,
  isProTeamOwner,
} from '../lib/teamWorkspace';
import { getAppUrl } from '../utils/domain';
import { 
  Settings, Save, CreditCard, 
  AlertCircle, Users, Mail, UserMinus, User, Upload,
  Download, FileText, Sparkles, Plus, Trash2, Edit3,
  Calendar, CheckCircle, Unlink, Lock, Check, Plug
} from 'lucide-react';
import { BRAND_NAME } from '../config/brand';
import { DIALER_OPTIONS, getDialerPrefs, setDialerPrefs } from '../lib/callDialer';
import {
  DEFAULT_CALL_OUTCOME_RULES,
  DEFAULT_CALL_STATUS_RULES,
  loadCallOutcomeRules,
  saveCallOutcomeRules,
  loadCallStatusRules,
  saveCallStatusRules,
} from '../lib/callOutcomeRules';
import { CALL_OUTCOMES } from '../lib/outreachQueue';
import CurrencySelector, { CURRENCY_MAP } from './CurrencySelector';
import { getBrowserTimeZone, getSupportedTimeZones, formatTimeZoneLabel } from '../lib/dateTime';

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

  // Cancellation States
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('');
  const [cancelErrorMsg, setCancelErrorMsg] = useState('');
  const [aiUsage, setAiUsage] = useState({ used: 0, limit: 0, loading: true });

  // Profile Settings States
  const [profileName, setProfileName] = useState(currentUser?.full_name || '');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(currentUser?.avatar_url || '');
  const [profileAvatarFile, setProfileAvatarFile] = useState(null);
  const [profileAvatarPreview, setProfileAvatarPreview] = useState('');
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
  const dialerPrefsInit = getDialerPrefs(currentUser?.id);
  const [defaultDialer, setDefaultDialer] = useState(dialerPrefsInit.dialer);
  const [ghlDialerUrl, setGhlDialerUrl] = useState(dialerPrefsInit.ghlUrl);
  const [customDialerUrl, setCustomDialerUrl] = useState(dialerPrefsInit.customUrl);
  const [profileTimezone, setProfileTimezone] = useState(currentUser?.timezone || '');
  const [callOutcomeRules, setCallOutcomeRules] = useState(DEFAULT_CALL_OUTCOME_RULES);
  const [callStatusRules, setCallStatusRules] = useState(DEFAULT_CALL_STATUS_RULES);
  const browserTimezone = useMemo(() => getBrowserTimeZone(), []);
  const timezoneOptions = useMemo(() => getSupportedTimeZones(), []);

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
    if (!isProTeamOwner(currentUser)) {
      setTeamLoading(false);
      return;
    }

    setTeamLoading(true);
    setTeamError('');
    try {
      let teamId = currentUser.team_id;
      if (!teamId) {
        teamId = await ensureProTeamWorkspace(currentUser.id);
        if (onRefreshProfile) await onRefreshProfile();
      }
      if (!teamId) {
        setTeamMembers([]);
        setTeamInvitations([]);
        return;
      }

      const { data: members, error: mErr } = await supabase
        .from('user_profiles')
        .select('id, email, team_role, plan')
        .eq('team_id', teamId);

      if (mErr) throw mErr;
      setTeamMembers(members || []);

      const { data: invites, error: iErr } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('team_id', teamId)
        .eq('status', 'pending');

      if (iErr) throw iErr;
      setTeamInvitations(invites || []);
    } catch (err) {
      console.error('Error loading team details:', err);
      setTeamError(err.message || 'Failed to load team workspace.');
    } finally {
      setTeamLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      if (isProTeamOwner(currentUser)) {
        loadTeam();
      } else {
        setTeamMembers([]);
        setTeamInvitations([]);
        setTeamLoading(false);
      }
      setProfileName(currentUser.full_name || '');
      setProfileAvatarUrl(currentUser.avatar_url || '');
      setProfileAvatarFile(null);
      setProfileAvatarPreview('');
      setProfileDefaultCurrency(currentUser.default_currency || 'PKR');
      setProfileTimezone(currentUser.timezone || '');
      setCallOutcomeRules(loadCallOutcomeRules(currentUser.id));
      setCallStatusRules(loadCallStatusRules(currentUser.id));
      setRemindersEnabled(currentUser.reminders_enabled !== false);
      setSuggestionsEnabled(currentUser.suggestions_enabled !== false);
      setSuggestionsAutoApply(currentUser.suggestions_auto_apply !== false);
      setMonthlyRevenueTarget(currentUser.monthly_revenue_target || '');
    }
  }, [currentUser]);

  useEffect(() => {
    async function fetchAiUsage() {
      if (!currentUser?.id) {
        setAiUsage({ used: 0, limit: 0, loading: false });
        return;
      }
      setAiUsage((prev) => ({ ...prev, loading: true }));
      try {
        const { data, error } = await supabase.functions.invoke('get-ai-usage');
        if (error) throw error;
        setAiUsage({
          used: data?.used ?? 0,
          limit: data?.limit ?? getAiCreditLimit(currentUser.plan),
          loading: false,
        });
      } catch (err) {
        console.warn('Failed to load AI usage:', err);
        setAiUsage({
          used: 0,
          limit: getAiCreditLimit(currentUser.plan),
          loading: false,
        });
      }
    }
    fetchAiUsage();
  }, [currentUser?.id, currentUser?.plan]);

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
    const redirectUri = encodeURIComponent(getAppUrl('/auth/google/callback'));
    // calendar.events = read + create/update events; calendar.readonly = list/watch calendars
    const scope = encodeURIComponent(
      'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly'
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
    if (!confirm(`Disconnect Google Calendar? ${BRAND_NAME} will no longer auto-detect bookings from your calendar.`)) return;
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
    const scope = encodeURIComponent('https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file');
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
    if (!confirm(`Disconnect Google Sheets? ${BRAND_NAME} will no longer be able to export or import leads from your sheets.`)) return;
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
          default_currency: profileDefaultCurrency || 'PKR',
          reminders_enabled: remindersEnabled,
          suggestions_enabled: suggestionsEnabled,
          suggestions_auto_apply: suggestionsAutoApply,
          monthly_revenue_target: monthlyRevenueTarget ? Number(monthlyRevenueTarget) : null,
          always_draft_before_sending: alwaysDraft,
          default_country_code: defaultCountryCode.trim() || '+92',
          timezone: profileTimezone.trim() || null,
        })
        .eq('id', currentUser.id);

      if (updateErr) throw updateErr;

      if (onRefreshProfile) onRefreshProfile();

      setDialerPrefs(currentUser.id, {
        dialer: defaultDialer,
        ghlUrl: ghlDialerUrl,
        customUrl: customDialerUrl,
      });

      saveCallOutcomeRules(currentUser.id, callOutcomeRules);
      saveCallStatusRules(currentUser.id, callStatusRules);

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
    onSaveSettings(localBrand, localCurrency, localWebhook, '', '');
  };


  // ── Team Invitation Helpers ────────────────────────────────────────────────

  const handleSendInvite = async (e) => {
    e.preventDefault();
    setTeamError('');
    setTeamSuccess('');

    if (!inviteEmail.trim()) return;

    const seatLimit = getTeamSeatLimit(currentUser?.plan);
    const seatsUsed = getSeatsUsed(teamMembers.length, teamInvitations.length);
    if (seatsUsed >= seatLimit) {
      setTeamError(`All ${seatLimit} seats are in use. Remove a member or cancel a pending invite to add someone else.`);
      return;
    }

    try {
      if (!currentUser.team_id) {
        await ensureProTeamWorkspace(currentUser.id);
        if (onRefreshProfile) await onRefreshProfile();
      }

      const { data, error } = await supabase.functions.invoke('send-team-invite', {
        body: { invitedEmail: inviteEmail.trim().toLowerCase() },
      });

      if (error) throw error;
      if (data?.success === false) throw new Error(data.error || 'Failed to send invite');

      const sentTo = inviteEmail.trim();
      setInviteEmail('');
      setTeamSuccess(
        data?.emailSent
          ? `Invite email sent to ${sentTo}. They must sign up with that address.`
          : `Invite created for ${sentTo}.${data?.warning ? ` ${data.warning}` : ''}`
      );
      loadTeam();
    } catch (err) {
      console.error('Error sending invite:', err);
      setTeamError(err.message || 'Failed to send invite.');
    }
  };

  const handleCancelInvite = async (inviteId) => {
    setTeamError('');
    try {
      const { error } = await supabase
        .from('team_invitations')
        .update({ status: 'cancelled' })
        .eq('id', inviteId);
      if (error) throw error;
      setTeamSuccess('Invite cancelled.');
      loadTeam();
    } catch (err) {
      console.error('Error cancelling invite:', err);
      setTeamError('Failed to cancel invite.');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Remove this member from your workspace? They will lose access to shared leads and templates.')) return;
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          team_id: null,
          team_role: 'owner',
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
    if (currentUser.role === 'admin') return 'System Administrator';
    return `${currentUser.plan.charAt(0).toUpperCase() + currentUser.plan.slice(1)} Plan User`;
  };

  if (!currentUser) {
    return <div className="loading-container">Loading profile...</div>;
  }

  const isProOwner = isProTeamOwner(currentUser);
  const seatLimit = getTeamSeatLimit(currentUser?.plan);
  const seatsUsed = getSeatsUsed(teamMembers.length, teamInvitations.length);
  const seatsRemaining = getSeatsRemaining(currentUser?.plan, teamMembers.length, teamInvitations.length);
  const seatsAtCap = seatsUsed >= seatLimit;

  return (
    <div className="flex-col gap-4" style={{ textAlign: 'left', maxWidth: '800px' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h2>Configuration</h2>
        <p className="color-muted" style={{ fontSize: '0.9rem' }}>
          Profile, pipeline, and workspace settings.
        </p>
      </div>

      {/* SECTION 0: Profile Settings */}
      <form onSubmit={handleSaveProfile} className="flex-col gap-4" style={{ marginBottom: '1.5rem' }}>
        <div className="card rd-page-form">
          <div className="rd-page-form-header">
            <h3>Profile</h3>
            <p className="rd-modal-sub">How you appear on invoices and in the app.</p>
          </div>

          {profileError && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={16} />
              <span>{profileError}</span>
            </div>
          )}

          {profileSuccess && (
            <div className="auth-success-banner" role="status">
              <Check size={15} />
              <span>{profileSuccess}</span>
            </div>
          )}

          <div className="rd-form">
          <div className="rd-form-row">
            <div className="rd-form-group">
              <label className="form-label">Full name</label>
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

            <div className="rd-form-group">
              <label className="form-label">Profile photo</label>
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
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <Upload size={14} /> Choose photo
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

          <div className="rd-form-row">
            <div className="rd-form-group">
              <label className="form-label">Default currency</label>
              <CurrencySelector
                value={profileDefaultCurrency}
                onChange={(val) => setProfileDefaultCurrency(val)}
                placeholder="Select currency..."
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>Used on invoices and targets</span>
            </div>

            <div className="rd-form-group">
              <label className="form-label">Monthly revenue target</label>
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

            <div className="rd-form-group">
              <label className="form-label">Timezone</label>
              <select
                className="form-input"
                value={profileTimezone}
                onChange={(e) => setProfileTimezone(e.target.value)}
                disabled={profileSaving}
              >
                <option value="">Auto — use browser ({formatTimeZoneLabel(browserTimezone)})</option>
                {timezoneOptions.map((tz) => (
                  <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Calendar times and planned call dates use this timezone when set.
              </span>
            </div>
          </div>
          </div>

            {/* Automation & Checkpoint Settings */}
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <h4 className="rd-form-section-title" style={{ marginBottom: '1rem' }}>
                Automation & checkpoints
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

                <div style={{ borderTop: '1px solid var(--border)', margin: '0.75rem 0', paddingTop: '0.75rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>Call outcome rules</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.75rem' }}>
                    When you log a call, Reachdesk can auto-update status and call next step. Customize mappings below.
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {callOutcomeRules.map((rule, idx) => (
                      <div key={rule.outcome} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', alignItems: 'center', fontSize: '0.82rem' }}>
                        <select
                          className="form-input"
                          value={rule.outcome}
                          onChange={(e) => {
                            const next = [...callOutcomeRules];
                            next[idx] = { ...next[idx], outcome: e.target.value };
                            setCallOutcomeRules(next);
                          }}
                          disabled={profileSaving}
                        >
                          {CALL_OUTCOMES.map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Status (optional)"
                          value={rule.suggested_status || ''}
                          onChange={(e) => {
                            const next = [...callOutcomeRules];
                            next[idx] = { ...next[idx], suggested_status: e.target.value || null };
                            setCallOutcomeRules(next);
                          }}
                          disabled={profileSaving}
                        />
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Call next step"
                          value={rule.suggested_call_action || ''}
                          onChange={(e) => {
                            const next = [...callOutcomeRules];
                            next[idx] = { ...next[idx], suggested_call_action: e.target.value || null };
                            setCallOutcomeRules(next);
                          }}
                          disabled={profileSaving}
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: '0.5rem' }}
                    disabled={profileSaving}
                    onClick={() => setCallOutcomeRules([...DEFAULT_CALL_OUTCOME_RULES])}
                  >
                    Reset outcome rules to defaults
                  </button>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', margin: '0.75rem 0', paddingTop: '0.75rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>Status → call next step</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.75rem' }}>
                    Suggested call action shown as a lightbulb in Call Queue when status changes.
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {callStatusRules.map((rule, idx) => (
                      <div key={`${rule.status}-${idx}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'center', fontSize: '0.82rem' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Lead status"
                          value={rule.status}
                          onChange={(e) => {
                            const next = [...callStatusRules];
                            next[idx] = { ...next[idx], status: e.target.value };
                            setCallStatusRules(next);
                          }}
                          disabled={profileSaving}
                        />
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Suggested call next step"
                          value={rule.suggested_call_action || ''}
                          onChange={(e) => {
                            const next = [...callStatusRules];
                            next[idx] = { ...next[idx], suggested_call_action: e.target.value };
                            setCallStatusRules(next);
                          }}
                          disabled={profileSaving}
                        />
                        <button
                          type="button"
                          className="btn-icon"
                          title="Remove rule"
                          disabled={profileSaving}
                          onClick={() => setCallStatusRules(callStatusRules.filter((_, i) => i !== idx))}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: '0.5rem', marginRight: '0.5rem' }}
                    disabled={profileSaving}
                    onClick={() => setCallStatusRules([...callStatusRules, { status: '', suggested_call_action: '' }])}
                  >
                    <Plus size={14} /> Add status rule
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: '0.5rem' }}
                    disabled={profileSaving}
                    onClick={() => setCallStatusRules([...DEFAULT_CALL_STATUS_RULES])}
                  >
                    Reset to defaults
                  </button>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', margin: '0.75rem 0', paddingTop: '0.75rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block', marginBottom: '0.35rem' }}>Default dialer (Cold Calls)</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                    Used by the Call button in Cold Calls mode. Other options stay in the dropdown menu.
                  </span>
                  <select
                    className="form-select"
                    value={defaultDialer}
                    onChange={(e) => setDefaultDialer(e.target.value)}
                    disabled={profileSaving}
                    style={{ maxWidth: 280, marginBottom: '0.5rem' }}
                  >
                    {DIALER_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                  {defaultDialer === 'ghl' && (
                    <input
                      type="url"
                      className="form-input"
                      value={ghlDialerUrl}
                      onChange={(e) => setGhlDialerUrl(e.target.value)}
                      placeholder="https://app.gohighlevel.com/...?phone={phone}"
                      disabled={profileSaving}
                      style={{ fontSize: '0.85rem' }}
                    />
                  )}
                  {defaultDialer === 'custom' && (
                    <input
                      type="url"
                      className="form-input"
                      value={customDialerUrl}
                      onChange={(e) => setCustomDialerUrl(e.target.value)}
                      placeholder="https://your-dialer.com/call?n={phone}"
                      disabled={profileSaving}
                      style={{ fontSize: '0.85rem' }}
                    />
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

          {/* Bank Details section removed */}
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="submit" className="btn btn-primary">
              <Save size={16} /> Save Settings
            </button>
          </div>
        </div>
      </form>


      {/* SECTION 3: Team workspace — managed on Teams page */}
      {(isProOwner || hasTeamsPageAccess(currentUser)) && (
        <div className="card flex-col gap-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
            <Users size={18} style={{ color: 'var(--primary-magenta)' }} />
            <h3 style={{ fontSize: '1.1rem' }}>Team workspace</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Invite teammates, manage seats, and set sharing permissions from the Teams page.
          </p>
          <div>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/teams')}>
              Open Teams
            </button>
          </div>
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
            <Check size={15} style={{ flexShrink: 0 }} />
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
          const planKey = getEffectivePlan(currentUser);
          const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS.trial;
          const maxLeads = getPlanLeadLimit(planKey, getEffectiveBillingCycle(currentUser)) ?? limits.leads;
          const maxTemplates = limits.templates;
          const maxAi = aiUsage.limit || getAiCreditLimit(planKey);

          return (
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Leads Usage */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Leads</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {leadsCount} / {maxLeads === Infinity || maxLeads === null ? 'Unlimited' : maxLeads.toLocaleString()}
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

              {/* AI Credits Usage */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>AI credits {planKey === 'trial' ? '(trial)' : '(this month)'}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {aiUsage.loading ? '…' : `${aiUsage.used} / ${maxAi}`}
                  </span>
                </div>
                <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    background: 'var(--accent-blue)',
                    width: `${maxAi ? Math.min(100, (aiUsage.used / maxAi) * 100) : 0}%`,
                    borderRadius: '4px'
                  }} />
                </div>
              </div>

              {isProOwner && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Team seats</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {teamLoading ? '…' : `${seatsUsed} / ${seatLimit}`}
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      background: seatsAtCap ? 'var(--warning-color)' : 'var(--accent-blue)',
                      width: `${Math.min(100, (seatsUsed / seatLimit) * 100)}%`,
                      borderRadius: '4px'
                    }} />
                  </div>
                </div>
              )}
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
      <div className="card flex-col gap-3" id="integrations">
        <div className="rd-section-head" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-3)', marginBottom: 'var(--space-1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Plug size={18} style={{ color: 'var(--status-cold)' }} />
            <h3 style={{ fontSize: 'var(--text-md)', margin: 0, fontFamily: 'var(--font-heading)' }}>Integrations</h3>
          </div>
        </div>

        {calSuccessMsg && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--success-color) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--success-color) 25%, transparent)', color: 'var(--success-color)', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <CheckCircle size={16} style={{ flexShrink: 0 }} />
            <span>{calSuccessMsg}</span>
          </div>
        )}

        {sheetsSuccessMsg && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--success-color) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--success-color) 25%, transparent)', color: 'var(--success-color)', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <CheckCircle size={16} style={{ flexShrink: 0 }} />
            <span>{sheetsSuccessMsg}</span>
          </div>
        )}

        {/* Google Calendar Row */}
        <div className="rd-integration-row">
          <div className="rd-integration-icon rd-integration-icon--calendar">
            <Calendar size={20} />
          </div>
          <div className="rd-integration-body">
            <strong>Google Calendar</strong>
            <span>
              {calLoading
                ? 'Checking status…'
                : calIntegration
                  ? `Connected · since ${new Date(calIntegration.connected_at).toLocaleDateString()}`
                  : 'Not connected — leads won\'t be auto-marked as Booked'}
            </span>
          </div>
          <div className="rd-integration-actions">
            {!PLAN_LIMITS[getEffectivePlan(currentUser)]?.calendarIntegration ? (
              <button
                type="button"
                onClick={() => navigate('/upgrade')}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Lock size={12} /> Available on Pro plan
              </button>
            ) : !calLoading && (
              calIntegration ? (
                <>
                  <span className="rd-integration-status">
                    <Check size={14} /> Connected
                  </span>
                  <button
                    type="button"
                    onClick={handleDisconnectCalendar}
                    disabled={calDisconnecting}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}
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
        <div className="rd-integration-row">
          <div className="rd-integration-icon rd-integration-icon--sheets">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM10 17H7V14H10V17ZM10 12H7V9H10V12ZM17 17H12V14H17V17ZM17 12H12V9H17V12Z" fill="currentColor"/>
            </svg>
          </div>
          <div className="rd-integration-body">
            <strong>Google Sheets</strong>
            <span>
              {sheetsLoading
                ? 'Checking status…'
                : sheetsIntegration
                  ? `Connected · since ${new Date(sheetsIntegration.connected_at).toLocaleDateString()}`
                  : 'Not connected — export and import from Google Sheets'}
            </span>
          </div>
          <div className="rd-integration-actions">
            {!sheetsLoading && (
              sheetsIntegration ? (
                <>
                  <span className="rd-integration-status">
                    <Check size={14} /> Connected
                  </span>
                  <button
                    type="button"
                    onClick={handleDisconnectSheets}
                    disabled={sheetsDisconnecting}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}
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
                  Connect Sheets
                </button>
              )
            )}
          </div>
        </div>

        <p className="rd-integration-footnote">
          {BRAND_NAME} reads your calendar to detect bookings and can create events you add in-app.
          Disconnect anytime to revoke access. Reconnect if you connected before write access was enabled.
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
