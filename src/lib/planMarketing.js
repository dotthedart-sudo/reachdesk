import { PLAN_LIMITS } from './utils';
import { getPlanLeadLimit } from './leadLimits';

/** Format lead/template counts from PLAN_LIMITS for marketing copy. */
export function formatLeadCount(planId) {
  const count = PLAN_LIMITS[planId]?.leads;
  if (count == null) return 'Unlimited leads';
  return `${count.toLocaleString()} leads`;
}

export function formatLeadCountForBilling(planId, billingCycle) {
  const limit = getPlanLeadLimit(planId, billingCycle);
  if (limit == null) return 'Unlimited leads';
  return `${limit.toLocaleString()} leads`;
}

/** Yearly lead cap when billing is not yearly (Starter/Pro only). */
export function getYearlyLeadUpsellCount(planId, billingCycle) {
  const isYearly = (billingCycle ?? '').toLowerCase() === 'yearly';
  if (isYearly || (planId !== 'starter' && planId !== 'pro')) return null;
  const base = getPlanLeadLimit(planId, billingCycle);
  const yearly = getPlanLeadLimit(planId, 'yearly');
  if (base == null || yearly == null || yearly <= base) return null;
  return yearly;
}

/** Tagline + feature lead line — appends yearly upsell when not on yearly billing. */
export function formatLeadLineForMarketing(planId, billingCycle) {
  const current = formatLeadCountForBilling(planId, billingCycle);
  const yearlyCount = getYearlyLeadUpsellCount(planId, billingCycle);
  if (!yearlyCount) return current;
  return {
    label: current,
    badge: `${yearlyCount.toLocaleString()} if billed yearly`,
  };
}

function formatLeadForTagline(planId, billingCycle) {
  const line = formatLeadLineForMarketing(planId, billingCycle);
  if (typeof line === 'string') return line;
  return `${line.label} (${line.badge})`;
}

export function formatTemplateCount(planId) {
  const count = PLAN_LIMITS[planId]?.templates;
  if (count == null) return 'Unlimited templates';
  return `${count} templates`;
}

export function formatUserCount(planId) {
  const count = PLAN_LIMITS[planId]?.users;
  if (count == null || count === Infinity) return 'Unlimited users';
  if (count === 1) return '1 user';
  return `${count} users`;
}

export function getPlanTagline(planId, billingCycle) {
  return `${formatLeadForTagline(planId, billingCycle)} · ${formatUserCount(planId)} · ${formatTemplateCount(planId)}`;
}

/** Monthly AI bot credits — marketing ladder from trial (10 / 7 days). */
export const AI_BOT_CREDITS = {
  trial: 10,
  starter: 50,
  pro: 250,
  teams: 500,
};

const STARTER_FEATURES_BASE = [
  '10 templates',
  `${AI_BOT_CREDITS.starter} AI bot credits / month`,
  '7-checkpoint follow-up reminders',
  'Smart folders · Hot/Warm/Cold priorities',
  'Notes · whiteboard',
  'Google Sheets import/export',
  'Convert lead to client',
  'Custom columns · copy analytics',
  'Export CSV',
];

const PRO_FEATURES_BASE = [
  'Unlimited templates',
  `${AI_BOT_CREDITS.pro} AI bot credits / month`,
  'Everything in Starter',
  'Bulk CSV import',
  'Google Calendar sync',
  'Invoices · revenue tracking',
];

const TEAMS_FEATURES_BASE = [
  '3 team seats',
  `${AI_BOT_CREDITS.teams} AI bot credits / month`,
  'Shared pipeline',
  'Everything in Pro',
];

/**
 * Feature list for plan cards — lead count is dynamic per billing cycle.
 * Yearly Starter/Pro append a bonus row for 2× lead capacity.
 */
export function getPlanFeatures(planId, billingCycle) {
  const leadLine = formatLeadLineForMarketing(planId, billingCycle);
  const isYearly = (billingCycle ?? '').toLowerCase() === 'yearly';
  const hasYearlyBonus =
    isYearly && (planId === 'starter' || planId === 'pro');

  if (planId === 'starter') {
    const features = [leadLine, ...STARTER_FEATURES_BASE];
    if (hasYearlyBonus) {
      features.push({ label: '2× lead capacity on yearly', badge: 'Bonus' });
    }
    return features;
  }

  if (planId === 'pro') {
    const features = [leadLine, ...PRO_FEATURES_BASE];
    if (hasYearlyBonus) {
      features.push({ label: '2× lead capacity on yearly', badge: 'Bonus' });
    }
    return features;
  }

  if (planId === 'teams') {
    return [leadLine, ...TEAMS_FEATURES_BASE];
  }

  return [];
}

/**
 * Single source of truth for plan cards on homepage + upgrade page.
 * Derived from PLAN_LIMITS — do not claim features limits don't allow.
 */
export const MARKETING_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: (billing) => getPlanTagline('starter', billing),
    getFeatures: (billing) => getPlanFeatures('starter', billing),
    comingSoon: false,
    isEnterprise: false,
    highlighted: true,
    ctaLabel: 'Get Starter',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: (billing) => getPlanTagline('pro', billing),
    getFeatures: (billing) => getPlanFeatures('pro', billing),
    comingSoon: false,
    isEnterprise: false,
    highlighted: false,
    ctaLabel: 'Get Pro',
  },
  {
    id: 'teams',
    name: 'Teams',
    tagline: (billing) => getPlanTagline('teams', billing),
    getFeatures: (billing) => getPlanFeatures('teams', billing),
    comingSoon: true,
    isEnterprise: false,
    highlighted: false,
    ctaLabel: 'Coming soon',
  },
];

/** Alias for Paywalls upgrade page */
export const PLANS = MARKETING_PLANS;

export const TRIAL_MARKETING = {
  leads: PLAN_LIMITS.trial.leads,
  templates: PLAN_LIMITS.trial.templates,
  aiCredits: AI_BOT_CREDITS.trial,
  days: 7,
  headline: 'Start 7-day free trial — card required',
  detail: `7-day free trial (card required) · ${AI_BOT_CREDITS.trial} AI bot credits · ${PLAN_LIMITS.trial.leads} leads · ${PLAN_LIMITS.trial.templates} templates`,
};

export const HOMEPAGE_FEATURES = [
  {
    id: 'pipeline',
    title: 'Pipeline & priorities',
    desc: 'See every lead, status, and next step in one place — Hot, Warm, Cold, and an 11-stage pipeline.',
  },
  {
    id: 'reminders',
    title: '7-checkpoint follow-ups',
    desc: 'Mark a lead Contacted and ReachDesk schedules reminders so quiet leads don\'t slip away.',
  },
  {
    id: 'templates',
    title: 'Templates you reuse',
    desc: 'Save your best outreach once. Drop in name, niche, and project placeholders in seconds.',
  },
  {
    id: 'revenue',
    title: 'Invoices & revenue',
    desc: 'Draft invoices when deals close and track monthly revenue without a separate spreadsheet.',
  },
];

export const HOW_IT_WORKS_STEPS = [
  { step: '1', title: 'Add the lead', desc: 'Drop in a name, niche, and where you found them.' },
  { step: '2', title: 'Mark Contacted', desc: 'ReachDesk schedules your follow-up checkpoints.' },
  { step: '3', title: 'Follow up until close', desc: 'Get reminded until they reply, book, or you mark Won/Lost.' },
];
