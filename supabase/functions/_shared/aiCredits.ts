/** Plan-based AI credit limits — mirror of src/lib/planConfig.js */



export const AI_BOT_CREDITS: Record<string, number> = {

  trial: 20,

  starter: 100,

  pro: 500,

  teams: 500,

  lifetime: 10,

};



export function normalizePlan(plan: string | null | undefined): string {

  const p = (plan || 'trial').toLowerCase();

  if (p === 'enterprise') return 'lifetime';

  if (p in AI_BOT_CREDITS) return p;

  return 'trial';

}



export function getAiCreditLimit(plan: string | null | undefined): number {

  return AI_BOT_CREDITS[normalizePlan(plan)] ?? 0;

}



export function getAiCreditPeriodStart(

  plan: string,

  createdAt: string | null | undefined,

): string {

  const key = normalizePlan(plan);

  if (key === 'trial') {

    const start = createdAt ? new Date(createdAt) : new Date();

    return start.toISOString();

  }

  const now = new Date();

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  return monthStart.toISOString();

}

