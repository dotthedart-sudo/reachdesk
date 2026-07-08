import { supabase } from './supabase';

export const CHECKPOINT_OFFSETS_HOURS = [12, 24, 72, 120, 168, 336, 504];

export const RESOLVED_STATUSES = ['Positive Reply', 'Booked', 'Client'];

export const REPLY_CHECK_STATUSES = ['Contacted', 'Waiting'];
export const FOLLOW_UP_CHECK_STATUSES = ['No Show / Rescheduled', 'Not Interested', 'Calendly Sent'];

/**
 * Returns the suggested action based on the rules and current status.
 */
export function getSuggestionForStatus(status, suggestionRules = []) {
  if (!status) return null;
  const rule = suggestionRules.find(r => r.status === status);
  if (rule) return rule.suggested_action;
  
  // Fallback default suggestions
  const fallbacks = {
    'Lead': 'Send first pitch',
    'Contacted': 'Wait for reply',
    'Waiting': 'Wait for reply',
    'No Show / Rescheduled': 'Send a follow up',
    'Not Interested': 'Send a different pitch',
    'Positive Reply': 'Send proposal',
    'Proposal Sent': 'Send Calendly',
    'Calendly Sent': 'Wait for reply',
    'Booked': 'Prepare for call',
    'Client': 'No action needed'
  };
  return fallbacks[status] || null;
}

/**
 * Automatically applies the status's suggestion to the action_to_take of the lead.
 */
export async function applySuggestion(lead, suggestionRules = []) {
  if (!lead) return null;
  const suggestion = getSuggestionForStatus(lead.status, suggestionRules);
  if (!suggestion) return null;
  
  const { error } = await supabase
    .from('leads')
    .update({ action_to_take: suggestion })
    .eq('id', lead.id);
    
  if (error) {
    console.error('Error applying suggestion:', error);
    throw error;
  }
  return { action_to_take: suggestion };
}

/**
 * Core function to handle status updates, next_checkpoint_at logic.
 * Only touches leads table columns: status, next_checkpoint_at, last_contacted_at, action_to_take.
 */
export async function updateLeadStatusAndCheckpoint({
  lead,
  leadId,
  newStatus,
  customHours = null,
  suggestionRules = [],
  currentUser = null,
  extraUpdates = {}
}) {
  let targetLead = lead;
  
  // 1. Fetch lead from database if only leadId is provided
  if (!targetLead && leadId) {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .maybeSingle();
    if (error) throw error;
    targetLead = data;
  }
  
  if (!targetLead) {
    throw new Error('Lead not found');
  }
  
  const isFirstContact = newStatus === 'Contacted' && !targetLead.last_contacted_at;
  
  // Determine target last_contacted_at
  let lastContacted = targetLead.last_contacted_at;
  if (isFirstContact) {
    lastContacted = new Date().toISOString();
  }
  
  const baseTime = lastContacted ? new Date(lastContacted).getTime() : Date.now();
  const nowMs = Date.now();
  
  // Calculate next checkpoint timestamp
  let nextCheckpoint = null;
  const isFollowUpCycle = REPLY_CHECK_STATUSES.includes(newStatus) || FOLLOW_UP_CHECK_STATUSES.includes(newStatus);
  
  if (isFollowUpCycle && lastContacted) {
    if (isFirstContact) {
      // First checkpoint can be overridden by custom hours
      let hoursOffset = 12; // default first offset from CHECKPOINT_OFFSETS_HOURS[0]
      if (customHours !== null && customHours !== undefined) {
        hoursOffset = customHours;
      } else if (targetLead.custom_reminder_hours !== null && targetLead.custom_reminder_hours !== undefined) {
        hoursOffset = Number(targetLead.custom_reminder_hours);
      }
      nextCheckpoint = new Date(baseTime + hoursOffset * 60 * 60 * 1000).toISOString();
    } else {
      // Subsequent checkpoints ignore custom hours and use the cumulative array sequence
      let nextOffsetHours = null;
      for (const hours of CHECKPOINT_OFFSETS_HOURS) {
        const scheduledTime = baseTime + hours * 60 * 60 * 1000;
        if (scheduledTime > nowMs) {
          nextOffsetHours = hours;
          break;
        }
      }
      if (nextOffsetHours !== null) {
        nextCheckpoint = new Date(baseTime + nextOffsetHours * 60 * 60 * 1000).toISOString();
      }
    }
  }
  
  // Determine suggested action
  const suggestedAction = getSuggestionForStatus(newStatus, suggestionRules);
  
  // Build lead update payload
  const leadUpdate = {
    status: newStatus,
    next_checkpoint_at: nextCheckpoint,
    ...extraUpdates
  };
  
  // Only include last_contacted_at in update if it was freshly set
  if (isFirstContact) {
    leadUpdate.last_contacted_at = lastContacted;
  }
  
  // Apply suggestions automatically if enabled
  const suggestionsEnabled = currentUser ? currentUser.suggestions_enabled : true;
  const autoApply = currentUser ? currentUser.suggestions_auto_apply !== false : true;
  if (suggestionsEnabled && autoApply && suggestedAction) {
    leadUpdate.action_to_take = suggestedAction;
  }

  // Automatically adjust priority based on status changes
  if (['Lead', 'Not Interested'].includes(newStatus)) {
    leadUpdate.priority = 'Cold';
  } else if (['Positive Reply', 'Proposal Sent', 'Calendly Sent'].includes(newStatus)) {
    leadUpdate.priority = 'Warm';
  } else if (['Booked', 'Client'].includes(newStatus)) {
    leadUpdate.priority = 'Hot';
  }
  
  // Update leads table
  const { data: updatedLead, error: updateError } = await supabase
    .from('leads')
    .update(leadUpdate)
    .eq('id', targetLead.id)
    .select()
    .single();
    
  if (updateError) throw updateError;
  
  return updatedLead;
}
