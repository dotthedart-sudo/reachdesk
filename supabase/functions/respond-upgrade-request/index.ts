import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders,
  createServiceClient,
  jsonResponse,
  requireAdmin,
} from '../_shared/auth.ts';
import { allowTestSubscriptions, isRealPaddleSubscriptionId } from '../_shared/billing.ts';
import {
  evaluateProratedUpgrade,
  runProratedUpgrade,
} from '../_shared/subscriptionUpgrade.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();
    const { user, response: authError } = await requireAdmin(req, supabase);
    if (authError || !user) return authError!;

    const { notificationId, action } = await req.json();

    if (!notificationId || !['approve', 'decline'].includes(action)) {
      return jsonResponse({ error: 'Invalid notificationId or action' }, 400);
    }

    const { data: notification, error: notifErr } = await supabase
      .from('admin_notifications')
      .select('*')
      .eq('id', notificationId)
      .maybeSingle();

    if (notifErr || !notification) {
      return jsonResponse({ error: 'Notification not found' }, 404);
    }

    if (!notification.from_user_id) {
      return jsonResponse({ error: 'Notification has no associated user' }, 400);
    }

    if (action === 'approve') {
      const plan = notification.requested_plan;
      if (!plan) {
        return jsonResponse({ error: 'No requested plan on this notification' }, 400);
      }

      const { data: profile, error: profileLoadErr } = await supabase
        .from('user_profiles')
        .select('id, email, plan, billing_cycle, plan_status, paddle_subscription_id, paddle_customer_id, plan_cancels_at')
        .eq('id', notification.from_user_id)
        .maybeSingle();

      if (profileLoadErr || !profile) {
        return jsonResponse({ error: 'User profile not found' }, 404);
      }

      const targetCycle = notification.billing_cycle || profile.billing_cycle;
      const subId = profile.paddle_subscription_id;
      const allowTest = allowTestSubscriptions();
      const hasPaddleSub = isRealPaddleSubscriptionId(subId)
        || (allowTest && String(subId || '').startsWith('sub_'));

      const eligibility = hasPaddleSub
        ? evaluateProratedUpgrade({
          currentPlan: profile.plan,
          targetPlan: plan,
          currentCycle: profile.billing_cycle,
          targetCycle,
          paddleSubscriptionId: subId,
        })
        : { ok: false as const, reason: 'no_subscription', code: 'no_subscription' };

      if (eligibility.ok) {
        const result = await runProratedUpgrade({
          supabase,
          profile,
          targetPlan: eligibility.targetPlan,
          targetCycle: eligibility.targetCycle,
          source: 'paddle_sync',
          actor: `admin:${user.id}`,
        });

        if (!result.ok) {
          return jsonResponse({
            error: result.error || 'Paddle upgrade charge failed. Plan was not changed.',
            code: result.code || 'charge_failed',
            chargeFailed: true,
          }, result.status >= 400 ? result.status : 402);
        }

        // Clear request fields after successful charged upgrade
        await supabase
          .from('user_profiles')
          .update({
            payment_pending: false,
            requested_plan: null,
            status: 'approved',
          })
          .eq('id', notification.from_user_id);
      } else {
        // Manual / bank-transfer / cycle-change path — no Paddle charge
        const profileUpdate: Record<string, unknown> = {
          plan,
          payment_pending: false,
          requested_plan: null,
          status: 'approved',
          account_locked: false,
        };

        if (notification.billing_cycle) {
          profileUpdate.billing_cycle = notification.billing_cycle;
        }

        const { error: profileErr } = await supabase
          .from('user_profiles')
          .update(profileUpdate)
          .eq('id', notification.from_user_id);

        if (profileErr) {
          return jsonResponse({ error: profileErr.message }, 500);
        }
      }
    } else {
      const { error: profileErr } = await supabase
        .from('user_profiles')
        .update({ payment_pending: false, requested_plan: null })
        .eq('id', notification.from_user_id);

      if (profileErr) {
        return jsonResponse({ error: profileErr.message }, 500);
      }
    }

    const { error: updateErr } = await supabase
      .from('admin_notifications')
      .update({
        is_read: true,
        request_status: action === 'approve' ? 'approved' : 'declined',
      })
      .eq('id', notificationId);

    if (updateErr) {
      return jsonResponse({ error: updateErr.message }, 500);
    }

    return jsonResponse({ ok: true, action });
  } catch (err) {
    console.error('[respond-upgrade-request] Error:', err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
