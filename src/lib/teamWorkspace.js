import { supabase } from './supabase';
import {
  canInviteTeammates,
  getTeamWorkspaceSeatLimit,
  normalizePlan,
} from './planConfig';

export { PLAN_SEATS as TEAM_SEAT_LIMIT } from './planConfig';

/** Owner who can manage invites/permissions (Teams, Trial, or grandfathered Pro with team_id). */
export function isProTeamOwner(profile) {
  if (!profile) return false;
  const role = (profile.team_role || 'owner').toLowerCase();
  if (role !== 'owner') return false;
  const plan = normalizePlan(profile.plan);
  if (plan === 'teams' || plan === 'trial') {
    if (plan === 'teams' && profile.plan_status && profile.plan_status !== 'active') return false;
    return true;
  }
  // Grandfather: legacy Pro owners who already created a workspace
  if (plan === 'pro' && profile.team_id) {
    if (profile.plan_status && profile.plan_status !== 'active') return false;
    return true;
  }
  return false;
}

/** Full Teams page access (not upgrade-locked): trial, teams (any role), or grandfathered Pro owner. */
export function hasTeamsPageAccess(profile) {
  if (!profile) return false;
  const plan = normalizePlan(profile.plan);
  if (plan === 'trial') return true;
  if (plan === 'teams') {
    if (profile.plan_status && profile.plan_status !== 'active') return false;
    return true;
  }
  if (plan === 'pro' && profile.team_id) {
    if (profile.plan_status && profile.plan_status !== 'active') return false;
    return true;
  }
  return false;
}

/** Starter / Pro (no workspace) / lifetime — nav visible but page shows upgrade. */
export function isTeamsFeatureLocked(profile) {
  return !hasTeamsPageAccess(profile);
}

export function isTeamOwner(profile) {
  if (!profile) return false;
  return (profile.team_role || 'owner').toLowerCase() === 'owner';
}

export function getTeamSeatLimit(plan) {
  return getTeamWorkspaceSeatLimit(plan);
}

export function getSeatsUsed(memberCount, pendingInviteCount) {
  return (memberCount ?? 0) + (pendingInviteCount ?? 0);
}

export function getSeatsRemaining(plan, memberCount, pendingInviteCount) {
  return Math.max(0, getTeamSeatLimit(plan) - getSeatsUsed(memberCount, pendingInviteCount));
}

/** Creates team_id for eligible owners via DB RPC. Returns updated team_id or null. */
export async function ensureProTeamWorkspace(userId) {
  if (!userId) return null;
  const { data, error } = await supabase.rpc('ensure_pro_team_workspace');
  if (error) {
    console.error('[teamWorkspace] ensure_pro_team_workspace failed:', error);
    throw error;
  }
  return data;
}

export async function acceptTeamInvitationByToken(inviteToken) {
  if (!inviteToken) return { ok: false, error: 'Missing invite token' };
  const { data, error } = await supabase.rpc('accept_team_invitation', {
    p_invite_token: inviteToken,
  });
  if (error) throw error;
  return data ?? { ok: false, error: 'Unknown error' };
}

export async function acceptPendingTeamInviteByEmail() {
  const { data, error } = await supabase.rpc('accept_pending_team_invite_by_email');
  if (error) throw error;
  return data ?? { ok: false };
}

export function getStoredInviteToken() {
  try {
    return sessionStorage.getItem('rd_invite_token') || null;
  } catch {
    return null;
  }
}

export function storeInviteToken(token) {
  try {
    if (token) sessionStorage.setItem('rd_invite_token', token);
    else sessionStorage.removeItem('rd_invite_token');
  } catch { /* ignore */ }
}

export async function processTeamInvites() {
  const token = getStoredInviteToken();
  if (token) {
    const result = await acceptTeamInvitationByToken(token);
    if (result?.ok) {
      storeInviteToken(null);
      return result;
    }
  }
  return acceptPendingTeamInviteByEmail();
}

export async function ensureProOwnerWorkspaceIfNeeded(profile) {
  if (!profile?.id) return profile;
  const plan = normalizePlan(profile.plan);
  const role = (profile.team_role || 'owner').toLowerCase();
  if ((plan !== 'teams' && plan !== 'trial') || role === 'member' || profile.team_id) return profile;
  if (plan === 'teams' && profile.plan_status && profile.plan_status !== 'active') return profile;
  await ensureProTeamWorkspace(profile.id);
  const { data: refreshed } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', profile.id)
    .maybeSingle();
  return refreshed || profile;
}

export async function getTeamOwnerProfile(teamId) {
  if (!teamId) return null;
  const { data } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, plan')
    .eq('team_id', teamId)
    .eq('team_role', 'owner')
    .maybeSingle();
  return data;
}

export async function getTeamSettings(teamId) {
  if (!teamId) {
    return { members_can_view_revenue: false, members_see_own_leads_only: false };
  }
  const { data, error } = await supabase
    .from('teams')
    .select('members_can_view_revenue, members_see_own_leads_only')
    .eq('id', teamId)
    .maybeSingle();
  if (error) {
    console.error('[teamWorkspace] getTeamSettings failed:', error);
    return { members_can_view_revenue: false, members_see_own_leads_only: false };
  }
  return {
    members_can_view_revenue: !!data?.members_can_view_revenue,
    members_see_own_leads_only: !!data?.members_see_own_leads_only,
  };
}

export async function updateTeamSettings(teamId, settings) {
  if (!teamId) throw new Error('Missing team id');
  const { data, error } = await supabase
    .from('teams')
    .update({
      members_can_view_revenue: !!settings.members_can_view_revenue,
      members_see_own_leads_only: !!settings.members_see_own_leads_only,
    })
    .eq('id', teamId)
    .select('members_can_view_revenue, members_see_own_leads_only')
    .single();
  if (error) throw error;
  return data;
}

export { canInviteTeammates };
