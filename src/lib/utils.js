import { supabase } from './supabase';
import { PLAN_LIMITS, normalizePlan, getPlanLeadLimit, isLifetimePlan, canInviteTeammates } from './planConfig';

export { PLAN_LIMITS, normalizePlan, getPlanLeadLimit, isLifetimePlan, canInviteTeammates };

export const getTeamIds = async (userId) => {
  if (!userId) return [];
  try {
    const { data: p } = await supabase.from('user_profiles')
      .select('team_id').eq('id', userId).maybeSingle();
    if (!p || !p.team_id) return [userId];
    const { data: members } = await supabase.from('user_profiles')
      .select('id').eq('team_id', p.team_id);
    if (!members || members.length === 0) return [userId];
    const ids = members.map(m => m.id).filter(Boolean);
    if (!ids.includes(userId)) ids.push(userId);
    return ids;
  } catch (err) {
    console.error('Error fetching team IDs:', err);
    return [userId];
  }
};

export function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}
