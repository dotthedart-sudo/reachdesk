import { PLAN_LIMITS } from './utils';

/** Format lead/template counts from PLAN_LIMITS for marketing copy. */
export function formatLeadCount(planId) {
  const count = PLAN_LIMITS[planId]?.leads;
  if (count == null) return 'Unlimited leads';
  return `${count.toLocaleString()} leads`;
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

const STARTER_FEATURES = [
  '1,000 leads',
  '10 templates',
  '7-checkpoint follow-up reminders',
  'Smart folders & Hot/Warm/Cold priorities',
  'Notes & whiteboard',
  'Google Sheets import/export',
  'Convert lead to client',
  'Custom columns & copy analytics',
  'Export CSV',
];

const PRO_FEATURES = [
  '5,000 leads',
  'Unlimited templates',
  'Everything in Starter',
  'Bulk CSV import',
  'Google Calendar sync',
  'Invoices & revenue tracking',
];

const TEAMS_FEATURES = [
  'Unlimited leads',
  '3 team seats',
  'Shared pipeline',
  'Everything in Pro',
];

/**
 * Single source of truth for plan cards on homepage + upgrade page.
 * Derived from PLAN_LIMITS — do not claim features limits don't allow.
 */
export const MARKETING_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: () =>
      `${formatLeadCount('starter')} · ${formatUserCount('starter')} · ${formatTemplateCount('starter')}`,
    features: STARTER_FEATURES,
    comingSoon: false,
    isEnterprise: false,
    highlighted: true,
    ctaLabel: 'Get Starter',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: () =>
      `${formatLeadCount('pro')} · ${formatUserCount('pro')} · ${formatTemplateCount('pro')}`,
    features: PRO_FEATURES,
    comingSoon: false,
    isEnterprise: false,
    highlighted: false,
    ctaLabel: 'Get Pro',
  },
  {
    id: 'teams',
    name: 'Teams',
    tagline: () =>
      `${formatLeadCount('teams')} · ${formatUserCount('teams')} · ${formatTemplateCount('teams')}`,
    features: TEAMS_FEATURES,
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
  headline: 'Start free — 65 leads, no card',
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
