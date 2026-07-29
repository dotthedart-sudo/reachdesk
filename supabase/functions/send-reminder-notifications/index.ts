import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createServiceClient,
  getEnv,
  jsonResponse,
  requirePrivileged,
} from '../_shared/auth.ts';

serve(async (req) => {
  const authError = requirePrivileged(req);
  if (authError) return authError;

  try {
    const supabase = createServiceClient();
    const { serviceRoleKey } = getEnv();
    const now = new Date().toISOString();

    const { data: reminders, error: remError } = await supabase
      .from('follow_up_reminders')
      .select('id, user_id, lead_name, reminder_number')
      .eq('status', 'pending')
      .eq('notified', false)
      .lte('scheduled_at', now);

    if (remError) throw remError;

    if (!reminders || reminders.length === 0) {
      return jsonResponse({ message: 'No pending due reminders.' });
    }

    const userIds = [...new Set(reminders.map((r) => r.user_id))];
    const { data: subs, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('user_id')
      .in('user_id', userIds);

    if (subsError) throw subsError;

    const subscribedUserIds = new Set(subs?.map((s) => s.user_id) || []);
    const remindersToNotify = reminders.filter((r) => subscribedUserIds.has(r.user_id));

    if (remindersToNotify.length === 0) {
      return jsonResponse({ message: 'No reminders have active push subscriptions.' });
    }

    const results = await Promise.allSettled(
      remindersToNotify.map(async (rem) => {
        const leadName = rem.lead_name || 'Lead';
        const bodyText = `Did ${leadName} reply? Tap to update status and stop reminders.`;

        const resp = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              target_user_id: rem.user_id,
              title: 'ReachDesk CRM Reminder',
              body: bodyText,
              url: `/dashboard?reminderId=${rem.id}`,
            }),
          },
        );

        if (!resp.ok) {
          const errBody = await resp.text();
          throw new Error(errBody || 'Push invoke failed');
        }

        const { error: updateError } = await supabase
          .from('follow_up_reminders')
          .update({ notified: true })
          .eq('id', rem.id);

        if (updateError) throw updateError;
        return rem.id;
      }),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(`[send-reminder-notifications] Succeeded: ${succeeded}, Failed: ${failed}`);

    return jsonResponse({ succeeded, failed });
  } catch (err) {
    console.error('[send-reminder-notifications] Error:', err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
