import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const now = new Date().toISOString();

    // 1. Fetch due reminders that have not been notified
    const { data: reminders, error: remError } = await supabase
      .from('follow_up_reminders')
      .select('id, user_id, lead_name, reminder_number')
      .eq('status', 'pending')
      .eq('notified', false)
      .lte('scheduled_at', now);

    if (remError) throw remError;

    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending due reminders.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Filter user_ids that have a push subscription
    const userIds = [...new Set(reminders.map((r) => r.user_id))];
    const { data: subs, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('user_id')
      .in('user_id', userIds);

    if (subsError) throw subsError;

    const subscribedUserIds = new Set(subs?.map((s) => s.user_id) || []);

    const remindersToNotify = reminders.filter((r) => subscribedUserIds.has(r.user_id));

    if (remindersToNotify.length === 0) {
      return new Response(JSON.stringify({ message: 'No reminders have active push subscriptions.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. For each due reminder, invoke the send-push-notification edge function
    const results = await Promise.allSettled(
      remindersToNotify.map(async (rem) => {
        const bodyText = `Follow up with ${rem.lead_name || 'Lead'} — Reminder #${rem.reminder_number}`;
        
        // Invoke send-push-notification function
        const { error: invokeError } = await supabase.functions.invoke('send-push-notification', {
          body: {
            target_user_id: rem.user_id,
            title: 'ReachDesk CRM Reminder',
            body: bodyText,
            url: '/dashboard',
          },
        });

        if (invokeError) throw invokeError;

        // Mark as notified
        const { error: updateError } = await supabase
          .from('follow_up_reminders')
          .update({ notified: true })
          .eq('id', rem.id);

        if (updateError) throw updateError;

        return rem.id;
      })
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(`[send-reminder-notifications] Succeeded: ${succeeded}, Failed: ${failed}`);

    return new Response(JSON.stringify({ succeeded, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-reminder-notifications] Error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
