import { supabase } from './supabase';
import {
  canInviteTeammates,
  getTeamWorkspaceSeatLimit,
} from './planConfig';

export { PLAN_SEATS as TEAM_SEAT_LIMIT } from './planConfig';

export function isProTeamOwner(profile) {
  if (!profile) return false;
  if (profile.plan_status && profile.plan_status !== 'active') return false;
  const role = (profile.team_role || 'owner').toLowerCase();
  if (role !== 'owner') return false;
  const plan = (profile.plan || 'trial').toLowerCase();
  if (plan === 'teams') return true;
  // Grandfather: legacy Pro owners who already created a workspace
  if (plan === 'pro' && profile.team_id) return true;
  return false;
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

/** Creates team_id for Teams owners via DB RPC. Returns updated team_id or null. */
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
  const plan = (profile.plan || 'trial').toLowerCase();
  const role = (profile.team_role || 'owner').toLowerCase();
  if (plan !== 'teams' || role === 'member' || profile.team_id) return profile;
  if (profile.plan_status && profile.plan_status !== 'active') return profile;
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

export { canInviteTeammates };
