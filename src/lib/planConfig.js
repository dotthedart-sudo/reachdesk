/** Single source of truth for plan limits, seats, AI credits, and legacy normalization. */

export const EXCLUDED_COUNTRY_CODES = ['IL'];

/** Legacy Pro team owners (grandfathered) kept 3 seats before Teams tier launch. */
export const LEGACY_PRO_TEAM_SEATS = 3;

export const AI_BOT_CREDITS = {
  trial: 20,
  starter: 100,
  pro: 500,
  teams: 500,
  lifetime: 10,
};

export const PLAN_SEATS = {
  trial: 1,
  starter: 1,
  pro: 1,
  teams: 5,
  lifetime: 1,
};

export function normalizePlan(plan) {
  const p = (plan || 'trial').toLowerCase();
  if (p === 'enterprise') return 'lifetime';
  if (p in PLAN_LIMITS) return p;
  return 'trial';
}

export const PLAN_LIMITS = {
  trial: {
    leads: 50,
    templates: 5,
    users: 1,
    folders: true,
    notes: true,
    bulkImport: true,
    copyAnalytics: true,
    calendarIntegration: true,
    sheetsIntegration: true,
    projectColumn: true,
  },
  starter: {
    leads: 750,
    templates: 10,
    users: 1,
    folders: true,
    notes: true,
    bulkImport: false,
    copyAnalytics: true,
    calendarIntegration: false,
    sheetsIntegration: true,
    projectColumn: true,
  },
  pro: {
    leads: 5000,
    templates: 50,
    users: 1,
    folders: true,
    notes: true,
    bulkImport: true,
    copyAnalytics: true,
    calendarIntegration: true,
    sheetsIntegration: true,
    projectColumn: true,
  },
  teams: {
    leads: null,
    templates: null,
    users: 5,
    folders: true,
    notes: true,
    bulkImport: true,
    copyAnalytics: true,
    calendarIntegration: true,
    sheetsIntegration: true,
    projectColumn: true,
  },
  lifetime: {
    leads: 5000000,
    templates: null,
    users: 1,
    folders: true,
    notes: true,
    bulkImport: true,
    copyAnalytics: true,
    calendarIntegration: true,
    sheetsIntegration: true,
    projectColumn: true,
  },
};

export const NEXT_PLAN = {
  trial: 'Starter',
  starter: 'Pro',
  pro: 'Teams',
  teams: null,
  lifetime: null,
};

export const NEXT_PLAN_ID = {
  trial: 'starter',
  starter: 'pro',
  pro: 'teams',
  teams: null,
  lifetime: null,
};

export function getPlanLeadLimit(plan, billingCycle) {
  const key = normalizePlan(plan);
  const base = PLAN_LIMITS[key]?.leads ?? null;
  if (base === null) return null;
  if (key === 'pro' && (billingCycle ?? '').toLowerCase() === 'yearly') {
    return base * 2;
  }
  return base;
}

export function getPlanSeatLimit(plan) {
  return PLAN_SEATS[normalizePlan(plan)] ?? 1;
}

/** Seat cap for team workspace UI (grandfathered Pro owners with team_id). */
export function getTeamWorkspaceSeatLimit(plan) {
  const key = normalizePlan(plan);
  if (key === 'teams') return PLAN_SEATS.teams;
  if (key === 'pro') return LEGACY_PRO_TEAM_SEATS;
  return 1;
}

export function canInviteTeammates(plan) {
  return normalizePlan(plan) === 'teams';
}

export function isLifetimePlan(plan) {
  return normalizePlan(plan) === 'lifetime';
}
