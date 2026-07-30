import { supabase } from './supabase';
import { PLAN_LIMITS, normalizePlan } from './planConfig';
import { isActiveTeamMember } from './teamWorkspace';

export { CALL_OUTCOMES, computeNextFollowUp, leadDisplayName } from './outreachQueue';

export function hasOutreachByPlan(profile) {
  if (!profile) return false;
  if (profile.role === 'admin') return true;
  const key = normalizePlan(profile.plan);
  return !!PLAN_LIMITS[key]?.coldOutreach;
}

/** Trial/Pro/Teams plan OR active Teams workspace member. */
export async function getEffectiveOutreachAccess(profile) {
  if (!profile) return false;
  if (hasOutreachByPlan(profile)) return true;
  return isActiveTeamMember(profile);
}

export async function getEffectiveCalendarAccess(profile) {
  if (!profile) return false;
  if (profile.role === 'admin') return true;
  const key = normalizePlan(profile.plan);
  if (PLAN_LIMITS[key]?.calendarIntegration) return true;
  return isActiveTeamMember(profile);
}

export function hasTeamCallActivity(profile) {
  if (!profile?.team_id) return false;
  const plan = normalizePlan(profile.plan);
  return plan === 'teams' || plan === 'trial';
}

export async function insertCallAttempt({
  userId,
  leadId,
  outcome,
  note,
  noteVisibility = 'team',
  teamId = null,
}) {
  const payload = {
    lead_id: leadId,
    user_id: userId,
    outcome,
    note: note?.trim() || null,
    note_visibility: noteVisibility === 'private' ? 'private' : 'team',
  };
  if (teamId) payload.team_id = teamId;

  const { data, error } = await supabase
    .from('lead_call_attempts')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateCallAttempt(id, { outcome, note, noteVisibility }) {
  const updates = {};
  if (outcome !== undefined) updates.outcome = outcome;
  if (note !== undefined) updates.note = note?.trim() || null;
  if (noteVisibility !== undefined) {
    updates.note_visibility = noteVisibility === 'private' ? 'private' : 'team';
  }
  const { data, error } = await supabase
    .from('lead_call_attempts')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCallAttempt(id) {
  const { error } = await supabase.from('lead_call_attempts').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchMyCallAttempts(userId) {
  const { data, error } = await supabase
    .from('lead_call_attempts')
    .select('id, lead_id, user_id, outcome, note, note_visibility, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchTeamCallActivity({
  memberId = null,
  outcome = null,
  fromDate = null,
  toDate = null,
  limit = 200,
} = {}) {
  const { data, error } = await supabase.rpc('get_team_call_activity', {
    p_member_id: memberId || null,
    p_outcome: outcome || null,
    p_from: fromDate || null,
    p_to: toDate || null,
    p_limit: limit,
  });
  if (error) throw error;
  return data || [];
}

export async function fetchLeadCallTimeline(leadId) {
  const { data, error } = await supabase.rpc('get_lead_call_timeline', {
    p_lead_id: leadId,
  });
  if (error) throw error;
  return data || [];
}

export async function fetchTeamCallStats({ fromDate = null, toDate = null } = {}) {
  const { data, error } = await supabase.rpc('get_team_call_stats', {
    p_from: fromDate || null,
    p_to: toDate || null,
  });
  if (error) throw error;
  return data || [];
}

export async function fetchTeamMembersForCalls(teamId) {
  if (!teamId) return [];
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, team_role')
    .eq('team_id', teamId)
    .order('team_role', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchTeamCallPermissions(teamId) {
  if (!teamId) {
    return {
      call_activity_sharing: 'off',
      call_notes_visible_to_team: false,
      memberPermissions: {},
    };
  }
  const [{ data: team }, { data: perms }] = await Promise.all([
    supabase
      .from('teams')
      .select('call_activity_sharing, call_notes_visible_to_team')
      .eq('id', teamId)
      .maybeSingle(),
    supabase
      .from('team_member_permissions')
      .select('user_id, can_view_team_call_activity, can_view_call_notes')
      .eq('team_id', teamId),
  ]);

  const memberPermissions = {};
  for (const row of perms || []) {
    memberPermissions[row.user_id] = {
      can_view_team_call_activity: !!row.can_view_team_call_activity,
      can_view_call_notes: !!row.can_view_call_notes,
    };
  }

  return {
    call_activity_sharing: team?.call_activity_sharing || 'off',
    call_notes_visible_to_team: !!team?.call_notes_visible_to_team,
    memberPermissions,
  };
}

export async function updateTeamCallSettings(teamId, settings) {
  const { data, error } = await supabase
    .from('teams')
    .update({
      call_activity_sharing: settings.call_activity_sharing || 'off',
      call_notes_visible_to_team: !!settings.call_notes_visible_to_team,
    })
    .eq('id', teamId)
    .select('call_activity_sharing, call_notes_visible_to_team')
    .single();
  if (error) throw error;
  return data;
}

export async function upsertMemberCallPermission(teamId, userId, permissions) {
  const { data, error } = await supabase
    .from('team_member_permissions')
    .upsert(
      {
        team_id: teamId,
        user_id: userId,
        can_view_team_call_activity: !!permissions.can_view_team_call_activity,
        can_view_call_notes: !!permissions.can_view_call_notes,
      },
      { onConflict: 'team_id,user_id' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/** Recent team calls on a lead (for calling session hint). */
export async function fetchRecentCallsOnLead(leadId, excludeUserId = null, days = 7) {
  const timeline = await fetchLeadCallTimeline(leadId);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return timeline.filter((row) => {
    if (excludeUserId && row.user_id === excludeUserId) return false;
    return new Date(row.created_at).getTime() >= cutoff;
  });
}
