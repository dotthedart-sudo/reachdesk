import { supabase } from './supabase';

export const CHECKPOINT_OFFSETS_HOURS = [12, 24, 72, 120, 168, 336, 504];

export const RESOLVED_STATUSES = ['Positive Reply', 'Booked', 'Rescheduled', 'Closed Won', 'Client'];

export const REPLY_CHECK_STATUSES = ['Contacted', 'Calendly Sent', 'Proposal Sent', 'Followed up'];
export const FOLLOW_UP_CHECK_STATUSES = ['No show', 'Not Interested'];

/** Closed Won and Client both mean the lead is already a client. */
export function isClientStatus(status) {
  const n = (status || '').toLowerCase().trim().replace(/_/g, ' ');
  return n === 'client' || n === 'closed won';
}

/**
 * Returns the suggested action based on the rules and current status.
 */
export function getSuggestionForStatus(status, suggestionRules = []) {
  if (!status) return null;

  // Normalize string: trim, lowercase, replace underscores with spaces
  const normalize = (val) => {
    if (!val) return '';
    return val.trim().toLowerCase().replace(/_/g, ' ');
  };

  const normStatus = normalize(status);

  // 1. Try matching rule in database case-insensitively
  const rule = suggestionRules.find(r => normalize(r.status) === normStatus);
  if (rule) return rule.suggested_action;

  // 2. Fallback default suggestions
  const fallbacks = {
    'lead': 'Send first pitch',
    'contacted': 'Wait for reply',
    'positive reply': 'Send proposal',
    'calendly sent': 'Wait for reply',
    'booked': 'Prepare for call',
    'no show': 'Send a follow up',
    'rescheduled': 'Prepare for call',
    'proposal sent': 'Send Calendly',
    'followed up': 'Wait for reply',
    'not interested': 'Send a different pitch',
    'closed won': 'Send invoice'
  };

  if (fallbacks[normStatus]) {
    return fallbacks[normStatus];
  }

  // Fallback to substring matching if not matched directly
  for (const [key, val] of Object.entries(fallbacks)) {
    if (normStatus.includes(key) || key.includes(normStatus)) {
      return val;
    }
  }

  return null;
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
  if (suggestionsEnabled && autoApply && suggestedAction && !extraUpdates.action_to_take) {
    leadUpdate.action_to_take = suggestedAction;
  }

  // Automatically adjust priority based on status changes
  if (['Lead', 'Contacted', 'No show', 'Not Interested'].includes(newStatus)) {
    leadUpdate.priority = 'Cold';
  } else if (['Positive Reply', 'Calendly Sent', 'Booked', 'Rescheduled', 'Proposal Sent', 'Followed up'].includes(newStatus)) {
    leadUpdate.priority = 'Warm';
  } else if (isClientStatus(newStatus)) {
    leadUpdate.priority = 'Hot';
    if (!extraUpdates.lifecycle_stage) {
      leadUpdate.lifecycle_stage = 'client';
    }
  }
  
  // Update leads table
  const { data: updatedLead, error: updateError } = await supabase
    .from('leads')
    .update(leadUpdate)
    .eq('id', targetLead.id)
    .select()
    .single();
    
  if (updateError) throw updateError;

  let draftCreated = false;
  if (['Booked', 'Rescheduled'].includes(newStatus)) {
    try {
      draftCreated = await createAutoDraftInvoice(updatedLead, currentUser?.id || updatedLead.user_id);
    } catch (e) {
      console.error('Failed to create auto draft invoice:', e);
    }
  }

  if (updatedLead) {
    updatedLead.draftCreated = draftCreated;
  }
  
  return updatedLead;
}

export async function createAutoDraftInvoice(lead, userId) {
  // Check if a draft invoice already exists for this lead
  const { data: existing, error: checkErr } = await supabase
    .from('invoices')
    .select('id')
    .eq('lead_id', lead.id)
    .eq('status', 'draft')
    .limit(1);
    
  if (checkErr) {
    console.error('Error checking existing draft invoice:', checkErr);
    return false;
  }
  
  if (existing && existing.length > 0) {
    // Draft invoice already exists, do not create duplicate
    return false;
  }
  
  const invoiceNum = 'INV-' + Math.floor(100000 + Math.random() * 900000);
  const clientName = lead.full_name || [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unnamed Client';
  const clientEmail = lead.email || '';
  
  const dbInvoice = {
    user_id: userId,
    lead_id: lead.id,
    invoice_number: invoiceNum,
    client_name: clientName,
    client_email: clientEmail,
    status: 'draft',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: null,
    currency: 'USD',
    subtotal: 0,
    tax: 0,
    total: 0,
    items: []
  };
  
  const { error: insErr } = await supabase
    .from('invoices')
    .insert(dbInvoice);
    
  if (insErr) {
    console.error('Error inserting auto-draft invoice:', insErr);
    return false;
  }
  return true;
}
