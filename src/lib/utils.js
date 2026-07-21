import { supabase } from './supabase';

export const PLAN_LIMITS = {
  trial:   { leads: 65,       templates: 3,        users: Infinity,
             folders: true,  notes: true,  bulkImport: true,  copyAnalytics: true, calendarIntegration: true,  sheetsIntegration: true },
  starter: { leads: 1000,     templates: 10,       users: 1,
             folders: true,  notes: true,  bulkImport: false, copyAnalytics: true, calendarIntegration: false, sheetsIntegration: true },
  pro:     { leads: 5000,     templates: null,     users: 1,
             folders: true,  notes: true,  bulkImport: true,  copyAnalytics: true, calendarIntegration: true,  sheetsIntegration: true },
  teams:   { leads: null,     templates: null,     users: 3,
             folders: true,  notes: true,  bulkImport: true,  copyAnalytics: true, calendarIntegration: true,  sheetsIntegration: true },
  enterprise: { leads: null,  templates: null,     users: Infinity,
             folders: true,  notes: true,  bulkImport: true,  copyAnalytics: true, calendarIntegration: true,  sheetsIntegration: true }
};

export const getTeamIds = async (userId) => {
  if (!userId) return [];
  try {
    const { data: p } = await supabase.from('user_profiles')
      .select('team_id').eq('id', userId).maybeSingle();
    if (!p || !p.team_id) return [userId];
    const { data: members } = await supabase.from('user_profiles')
      .select('id').eq('team_id', p.team_id);
    if (!members || members.length === 0) return [userId];
    // Always include the current userId even if the team query omits them
    const ids = members.map(m => m.id).filter(Boolean);
    if (!ids.includes(userId)) ids.push(userId);
    return ids;
  } catch (err) {
    console.error('Error fetching team IDs:', err);
    return [userId];
  }
};
