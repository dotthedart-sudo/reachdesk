/** Default mappings from call outcome → lead status + call_action. User overrides in localStorage. */

import { supabase } from './supabase';

export const DEFAULT_CALL_OUTCOME_RULES = [
  { outcome: 'Voicemail Left', suggested_status: 'Voice Mail sent', suggested_call_action: 'Try again tomorrow' },
  { outcome: 'No Answer', suggested_status: null, suggested_call_action: 'Try again tomorrow' },
  { outcome: 'Busy', suggested_status: null, suggested_call_action: 'Try again tomorrow' },
  { outcome: 'Answered', suggested_status: 'Contacted', suggested_call_action: 'Callback scheduled' },
  { outcome: 'Callback Requested', suggested_status: null, suggested_call_action: 'Callback scheduled' },
  { outcome: 'Not Interested', suggested_status: 'Not Interested', suggested_call_action: 'Not interested — close' },
  { outcome: 'Wrong Number', suggested_status: null, suggested_call_action: 'Wrong number — remove' },
];

export const DEFAULT_CALL_STATUS_RULES = [
  { status: 'Lead', suggested_call_action: 'Call now' },
  { status: 'Contacted', suggested_call_action: 'Callback scheduled' },
  { status: 'Voice Mail sent', suggested_call_action: 'Try again tomorrow' },
  { status: 'Not Interested', suggested_call_action: 'Not interested — close' },
];

const OUTCOME_RULES_KEY = (userId) => `crm_call_outcome_rules_${userId}`;
const STATUS_RULES_KEY = (userId) => `crm_call_status_rules_${userId}`;

export function loadCallOutcomeRules(userId) {
  if (!userId) return [...DEFAULT_CALL_OUTCOME_RULES];
  try {
    const raw = localStorage.getItem(OUTCOME_RULES_KEY(userId));
    if (!raw) return [...DEFAULT_CALL_OUTCOME_RULES];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...DEFAULT_CALL_OUTCOME_RULES];
  } catch {
    return [...DEFAULT_CALL_OUTCOME_RULES];
  }
}

export function saveCallOutcomeRules(userId, rules) {
  if (!userId) return;
  localStorage.setItem(OUTCOME_RULES_KEY(userId), JSON.stringify(rules));
}

export function loadCallStatusRules(userId) {
  if (!userId) return [...DEFAULT_CALL_STATUS_RULES];
  try {
    const raw = localStorage.getItem(STATUS_RULES_KEY(userId));
    if (!raw) return [...DEFAULT_CALL_STATUS_RULES];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...DEFAULT_CALL_STATUS_RULES];
  } catch {
    return [...DEFAULT_CALL_STATUS_RULES];
  }
}

export function saveCallStatusRules(userId, rules) {
  if (!userId) return;
  localStorage.setItem(STATUS_RULES_KEY(userId), JSON.stringify(rules));
}

function normalize(val) {
  if (!val) return '';
  return val.trim().toLowerCase().replace(/_/g, ' ');
}

export function getOutcomeMapping(outcome, userId, dbRules = []) {
  const custom = loadCallOutcomeRules(userId);
  const fromCustom = custom.find((r) => r.outcome === outcome);
  if (fromCustom) return fromCustom;

  const fromDb = (dbRules || []).find((r) => r.outcome === outcome);
  if (fromDb) return fromDb;

  return DEFAULT_CALL_OUTCOME_RULES.find((r) => r.outcome === outcome) || null;
}

export function getCallActionForStatus(status, userId, suggestionRules = []) {
  if (!status) return null;

  const custom = loadCallStatusRules(userId);
  const fromCustom = custom.find((r) => normalize(r.status) === normalize(status));
  if (fromCustom?.suggested_call_action) return fromCustom.suggested_call_action;

  for (const rule of suggestionRules || []) {
    if (rule.suggested_call_action && normalize(rule.status) === normalize(status)) {
      return rule.suggested_call_action;
    }
  }

  const fallback = DEFAULT_CALL_STATUS_RULES.find((r) => normalize(r.status) === normalize(status));
  return fallback?.suggested_call_action || null;
}

export async function applyOutcomeToLead(leadId, outcome, userId, customOutcomeRules = null) {
  const mapping = getOutcomeMapping(outcome, userId, customOutcomeRules);
  const patch = {};
  if (mapping?.suggested_status) patch.status = mapping.suggested_status;
  if (mapping?.suggested_call_action) patch.call_action = mapping.suggested_call_action;

  if (Object.keys(patch).length === 0) return null;

  const { data, error } = await supabase
    .from('leads')
    .update(patch)
    .eq('id', leadId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
