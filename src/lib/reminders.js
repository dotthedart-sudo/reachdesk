import { supabase } from './supabase';

/**
 * Creates follow up reminders when a lead's status changes to 'contacted' or last_contacted_at is updated.
 */
export async function createFollowUpReminders(leadId, leadName, userId, contactedAt) {
  if (!leadId || !userId) return;
  const schedules = [
    { reminder_number: 1, hours: 12 },
    { reminder_number: 2, hours: 24 },
    { reminder_number: 3, hours: 72 },
    { reminder_number: 4, hours: 120 }, // 5 days
    { reminder_number: 5, hours: 168 }, // 7 days
    { reminder_number: 6, hours: 336 }, // 14 days
    { reminder_number: 7, hours: 504 }, // 21 days
  ];

  try {
    // First delete any existing pending reminders for this lead
    await supabase
      .from('follow_up_reminders')
      .delete()
      .eq('lead_id', leadId)
      .eq('status', 'pending');

    const baseTime = contactedAt ? new Date(contactedAt).getTime() : Date.now();
    const validBaseTime = isNaN(baseTime) ? Date.now() : baseTime;

    // Create new reminders
    const reminders = schedules.map(s => ({
      user_id: userId,
      lead_id: leadId,
      lead_name: leadName || 'Lead',
      reminder_number: s.reminder_number,
      scheduled_at: new Date(validBaseTime + s.hours * 60 * 60 * 1000).toISOString(),
      status: 'pending'
    }));

    const { error } = await supabase.from('follow_up_reminders').insert(reminders);
    if (error) console.error('Error creating follow_up_reminders:', error);
  } catch (err) {
    console.error('Exception in createFollowUpReminders:', err);
  }
}

/**
 * Dismisses pending follow up reminders when lead status changes to stop statuses.
 */
export async function dismissFollowUpReminders(leadId) {
  if (!leadId) return;
  try {
    const { error } = await supabase
      .from('follow_up_reminders')
      .update({ status: 'dismissed' })
      .eq('lead_id', leadId)
      .eq('status', 'pending');
    if (error) console.error('Error dismissing follow_up_reminders:', error);
  } catch (err) {
    console.error('Exception in dismissFollowUpReminders:', err);
  }
}

/**
 * Helper to handle lead status or last_contacted_at updates safely.
 */
export async function handleLeadReminderTrigger(lead, updatedFields, userId) {
  if (!lead || !userId) return;
  const leadId = lead.id;
  const leadName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.name || 'Lead';
  
  const newStatus = (updatedFields.status !== undefined ? updatedFields.status : lead.status || '').toLowerCase().replace(/\s+/g, '_');
  const lastContactedUpdated = updatedFields.last_contacted_at !== undefined;

  const STOP_STATUSES = ['positive_reply', 'not_interested', 'no_show', 'client', 'calendly_sent'];

  if (STOP_STATUSES.includes(newStatus)) {
    await dismissFollowUpReminders(leadId);
  } else if (newStatus === 'contacted' || lastContactedUpdated) {
    const contactedAt = updatedFields.last_contacted_at || lead.last_contacted_at || new Date().toISOString();
    await createFollowUpReminders(leadId, leadName, userId, contactedAt);
  }
}
