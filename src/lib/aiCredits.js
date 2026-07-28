import { AI_BOT_CREDITS, normalizePlan } from './planConfig';

export { AI_BOT_CREDITS };

export function getAiCreditLimit(plan) {
  const key = normalizePlan(plan);
  return AI_BOT_CREDITS[key] ?? 0;
}

/** Trial: fixed pool from account creation. Paid: calendar month. */
export function getAiCreditPeriodStart(profile) {
  const plan = normalizePlan(profile?.plan);
  if (plan === 'trial') {
    const start = profile?.created_at ? new Date(profile.created_at) : new Date();
    return start.toISOString();
  }
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return monthStart.toISOString();
}

export function isAiCreditPeriodTrial(plan) {
  return normalizePlan(plan) === 'trial';
}

export function formatAiCreditLimit(plan) {
  const limit = getAiCreditLimit(plan);
  if (limit == null) return 'Unlimited';
  return String(limit);
}
