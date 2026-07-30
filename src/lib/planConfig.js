/** Single source of truth for plan limits, seats, AI credits, and legacy normalization. */

export const EXCLUDED_COUNTRY_CODES = ['IL'];

/** Legacy Pro team owners (grandfathered) kept 3 seats before Teams tier launch. */
export const LEGACY_PRO_TEAM_SEATS = 3;

export const AI_BOT_CREDITS = {
  trial: 20,
  starter: 100,
  pro: 500,
  teams: 500,
};

export const PLAN_SEATS = {
  trial: 5,
  starter: 1,
  pro: 1,
  teams: 5,
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
    users: 5,
    folders: true,
    notes: true,
    bulkImport: true,
    copyAnalytics: true,
    calendarIntegration: true,
    sheetsIntegration: true,
    projectColumn: true,
    coldOutreach: true,
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
    coldOutreach: false,
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
    coldOutreach: true,
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
    coldOutreach: true,
  },
};

export const NEXT_PLAN = {
  trial: 'Starter',
  starter: 'Pro',
  pro: 'Teams',
  teams: null,
};

export const NEXT_PLAN_ID = {
  trial: 'starter',
  starter: 'pro',
  pro: 'teams',
  teams: null,
};

export function getPlanLeadLimit(plan, billingCycle) {
  const key = normalizePlan(plan);
  const base = PLAN_LIMITS[key]?.leads ?? null;
  if (base === null) return null;
  if (key === 'starter' || key === 'pro') {
    if ((billingCycle ?? '').toLowerCase() === 'yearly') {
      return base * 2;
    }
  }
  return base;
}

/** Plan used for limits and feature gates (team members inherit workspace owner plan). */
export function getEffectivePlan(profile) {
  if (!profile) return 'trial';
  return normalizePlan(profile.effective_plan ?? profile.plan);
}

export function getEffectiveBillingCycle(profile) {
  return profile?.effective_billing_cycle ?? profile?.billing_cycle ?? null;
}

export function getPlanSeatLimit(plan) {
  return PLAN_SEATS[normalizePlan(plan)] ?? 1;
}

/** Seat cap for team workspace UI (trial/Teams = 5; grandfathered Pro owners with team_id = 3). */
export function getTeamWorkspaceSeatLimit(plan) {
  const key = normalizePlan(plan);
  if (key === 'teams' || key === 'trial') return PLAN_SEATS.teams;
  if (key === 'pro') return LEGACY_PRO_TEAM_SEATS;
  return 1;
}

export function canInviteTeammates(plan) {
  const key = normalizePlan(plan);
  return key === 'teams' || key === 'trial';
}
