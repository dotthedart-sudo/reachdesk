/** Dashboard weekly activity + dual pipeline counts (messages vs calls). */

import { displayCallStatus, normalizeCallStatus } from './callOutcomeRules';

export const MESSAGE_PIPELINE_STAGES = [
  'Lead',
  'Contacted',
  'Positive Reply',
  'Proposal Sent',
  'Calendly Sent',
  'Booked',
  'Closed Won',
];

export const MESSAGE_STAGE_COLORS = {
  Lead: '#3b82f6',
  Contacted: '#f59e0b',
  'Positive Reply': '#8b5cf6',
  'Proposal Sent': '#06b6d4',
  'Calendly Sent': '#6B9FD4',
  Booked: '#ec4899',
  'Closed Won': '#22c55e',
};

/** Collapsed call funnel for dashboard clarity. */
export const CALL_PIPELINE_STAGES = [
  { id: 'not_called', label: 'Not called', color: '#3b82f6' },
  { id: 'attempted', label: 'Attempted', color: '#f59e0b' },
  { id: 'connected', label: 'Connected', color: '#10b981' },
  { id: 'callback', label: 'Callback', color: '#06b6d4' },
  { id: 'closed', label: 'Closed', color: '#64748b' },
];

function callBucket(callStatus) {
  const s = normalizeCallStatus(callStatus);
  if (!s || s === 'not called') return 'not_called';
  if (s === 'callback requested') return 'callback';
  if (['answered', 'interested', 'meeting booked'].includes(s)) return 'connected';
  if (['wrong number', 'not interested'].includes(s)) return 'closed';
  // No answer, busy, voicemail left, etc.
  return 'attempted';
}

export function countMessagePipeline(leads = []) {
  const counts = {};
  MESSAGE_PIPELINE_STAGES.forEach((st) => {
    counts[st] = leads.filter((l) => l.status === st).length;
  });
  return counts;
}

export function countCallPipeline(leads = []) {
  const counts = Object.fromEntries(CALL_PIPELINE_STAGES.map((s) => [s.id, 0]));
  for (const lead of leads) {
    const bucket = callBucket(lead.call_status);
    counts[bucket] = (counts[bucket] || 0) + 1;
  }
  return counts;
}

/**
 * This-week activity for the current user (clear “how much I did”).
 * @param {object} opts
 * @param {Array} opts.leads
 * @param {Array} opts.attempts - lead_call_attempts for current user
 * @param {string} opts.currentUserId
 * @param {number} [opts.days=7]
 */
export function computeWeekActivity({ leads = [], attempts = [], currentUserId, days = 7 }) {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const ownLeads = leads.filter((l) => l.user_id === currentUserId);

  const messaged = ownLeads.filter((l) => {
    const contacted = l.last_contacted_at ? new Date(l.last_contacted_at).getTime() : 0;
    return contacted >= since;
  }).length;

  const calledLeadIds = new Set();
  for (const a of attempts) {
    const t = new Date(a.occurred_at || a.created_at).getTime();
    if (t >= since) calledLeadIds.add(a.lead_id);
  }

  const now = Date.now();
  const followUpsDue = ownLeads.filter(
    (l) => l.next_checkpoint_at && new Date(l.next_checkpoint_at).getTime() <= now,
  ).length;

  return { messaged, called: calledLeadIds.size, followUpsDue, days };
}

export function attemptTimestamp(attempt) {
  if (!attempt) return null;
  return attempt.occurred_at || attempt.created_at;
}

export { displayCallStatus };
