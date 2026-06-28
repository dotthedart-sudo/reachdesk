import { supabase } from './supabase';

export const PLAN_LIMITS = {
  trial:   { leads: Infinity, templates: Infinity, users: Infinity,
             folders: true,  notes: true,  bulkImport: true,  copyAnalytics: true  },
  starter: { leads: 150,      templates: 20,       users: 1,
             folders: true,  notes: true,  bulkImport: false, copyAnalytics: true  },
  pro:     { leads: 1000,     templates: Infinity, users: 1,
             folders: true,  notes: true,  bulkImport: true,  copyAnalytics: true  },
  teams:   { leads: Infinity, templates: Infinity, users: 3,
             folders: true,  notes: true,  bulkImport: true,  copyAnalytics: true  },
  enterprise: { leads: Infinity, templates: Infinity, users: Infinity,
             folders: true,  notes: true,  bulkImport: true,  copyAnalytics: true  }
};

export const getTeamIds = async (userId) => {
  try {
    const { data: p } = await supabase.from('user_profiles')
      .select('team_id').eq('id', userId).maybeSingle();
    if (!p || !p.team_id) return [userId];
    const { data: members } = await supabase.from('user_profiles')
      .select('id').eq('team_id', p.team_id);
    if (!members || members.length === 0) return [userId];
    // Always include the current userId even if the team query omits them
    const ids = members.map(m => m.id);
    if (!ids.includes(userId)) ids.push(userId);
    return ids;
  } catch (err) {
    console.error('Error fetching team IDs:', err);
    return [userId];
  }
};
