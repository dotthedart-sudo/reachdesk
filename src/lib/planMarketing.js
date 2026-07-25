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
  headline: 'Start 7-day free trial',
  ctaNav: 'Start free trial',
  detail: `7-day trial · ${AI_BOT_CREDITS.trial} AI credits · ${PLAN_LIMITS.trial.leads} leads · ${PLAN_LIMITS.trial.templates} templates · card required`,
  micro: 'Card required · cancel anytime before day 7',
};

export const HOMEPAGE_OUTCOMES = [
  {
    id: 'today',
    title: 'Know who to contact today',
    desc: 'Open ReachDesk and see the exact leads waiting on a follow-up — not a buried spreadsheet row.',
  },
  {
    id: 'slip',
    title: 'Stop quiet leads from dying',
    desc: 'Seven checkpoints keep Warm and Cold leads alive while you deliver client work.',
  },
  {
    id: 'close',
    title: 'Close without switching tools',
    desc: 'Templates, pipeline, and invoices live in one place so booked calls turn into paid work.',
  },
];

export const HOMEPAGE_FEATURES = [
  {
    id: 'pipeline',
    title: 'Pipeline that shows the next move',
    desc: 'Hot, Warm, Cold priorities plus an 11-stage pipeline — every lead has a status and an action.',
  },
  {
    id: 'reminders',
    title: '7-checkpoint follow-ups',
    desc: 'Mark a lead Contacted once. ReachDesk schedules the reminders so nothing slips while you\'re heads-down.',
  },
  {
    id: 'templates',
    title: 'Templates that sound like you',
    desc: 'Save winning outreach. Drop in name, niche, and project placeholders in seconds — or draft with AI.',
  },
  {
    id: 'revenue',
    title: 'Invoices when the deal closes',
    desc: 'Draft invoices from won leads and track monthly revenue without a second spreadsheet.',
  },
];

export const HOW_IT_WORKS_STEPS = [
  {
    step: '1',
    title: 'Capture the lead',
    desc: 'Add a name, niche, and where you found them — takes under a minute.',
  },
  {
    step: '2',
    title: 'Mark Contacted',
    desc: 'ReachDesk schedules your follow-up checkpoints automatically.',
  },
  {
    step: '3',
    title: 'Follow up until close',
    desc: 'Get nudged until they reply, book, or you mark Won / Lost.',
  },
];

export const HOMEPAGE_FIT = [
  'Freelancers juggling delivery and outreach',
  'Solo operators tired of Notes + Sheets + memory',
  'Small agencies that need a shared next-step view',
];
