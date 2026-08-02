import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  applyActiveSubscriptionToProfile,
  findProfileByEmail,
  findProfileById,
  isRealPaddleSubscriptionId,
  logBillingEvent,
  resolvePlanFromPayload,
} from '../_shared/billing.ts';
import { corsHeaders, jsonResponse, requireUser } from '../_shared/auth.ts';
import {
  findPaddleCustomerByEmail,
  getPaddleSubscription,
  listPaddleSubscriptionsForCustomer,
} from '../_shared/paddle.ts';
import { getBillingCycleFromPriceId, getPlanFromPriceId } from '../_shared/prices.ts';

/**
 * Pull the latest active subscription from Paddle and write it onto user_profiles.
 * - Authenticated users can sync themselves (post-checkout recovery).
 * - Admins can pass { email } or { user_id } to repair any account.
 * - Privileged/service role may pass email/user_id as well.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    let body: { email?: string; user_id?: string; subscription_id?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { user, response: userErr } = await requireUser(req);
    if (userErr || !user) return userErr!;

    const { data: callerProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, role, plan, plan_status, paddle_subscription_id, paddle_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = callerProfile?.role === 'admin';
    let targetUserId = user.id;
    let targetEmail = callerProfile?.email || user.email || null;

    if (isAdmin && (body.user_id || body.email)) {
      if (body.user_id) {
        const p = await findProfileById(supabaseAdmin, body.user_id);
        if (!p) return jsonResponse({ success: false, error: 'User not found' }, 404);
        targetUserId = p.id;
        targetEmail = p.email;
      } else if (body.email) {
        const p = await findProfileByEmail(supabaseAdmin, body.email);
        if (!p) return jsonResponse({ success: false, error: 'User not found' }, 404);
        targetUserId = p.id;
        targetEmail = p.email;
      }
    } else if (!isAdmin && (body.user_id || body.email)) {
      // Non-admins cannot sync other accounts
      if (body.user_id && body.user_id !== user.id) {
        return jsonResponse({ success: false, error: 'Forbidden' }, 403);
      }
      if (body.email && targetEmail && body.email.toLowerCase() !== targetEmail.toLowerCase()) {
        return jsonResponse({ success: false, error: 'Forbidden' }, 403);
      }
    }

    const profile = await findProfileById(supabaseAdmin, targetUserId);
    if (!profile) {
      return jsonResponse({ success: false, error: 'Profile not found' }, 404);
    }

    let subscription: Record<string, unknown> | null = null;

    if (body.subscription_id && isRealPaddleSubscriptionId(body.subscription_id)) {
      subscription = await getPaddleSubscription(body.subscription_id);
    }

    if (!subscription) {
      let customerId = profile.paddle_customer_id || null;

      if (!customerId && targetEmail) {
        const customer = await findPaddleCustomerByEmail(targetEmail);
        customerId = typeof customer?.id === 'string' ? customer.id : null;
      }

      if (!customerId) {
        await logBillingEvent(supabaseAdmin, {
          userId: profile.id,
          eventType: 'sync_no_paddle_customer',
          source: 'paddle_sync',
          rawPayload: { email: targetEmail },
        });
        return jsonResponse({
          success: false,
          error: 'No Paddle customer found for this account. Confirm the email matches Paddle checkout.',
        }, 404);
      }

      const subs = await listPaddleSubscriptionsForCustomer(customerId);
      subscription = pickBestSubscription(subs);

      if (!subscription && isRealPaddleSubscriptionId(profile.paddle_subscription_id)) {
        subscription = await getPaddleSubscription(profile.paddle_subscription_id!);
      }
    }

    if (!subscription) {
      await logBillingEvent(supabaseAdmin, {
        userId: profile.id,
        eventType: 'sync_no_active_subscription',
        source: 'paddle_sync',
        rawPayload: { email: targetEmail },
      });
      return jsonResponse({
        success: false,
        error: 'No active Paddle subscription found for this customer.',
      }, 404);
    }

    const subId = typeof subscription.id === 'string' ? subscription.id : null;
    const customerId =
      (typeof subscription.customer_id === 'string' && subscription.customer_id)
      || profile.paddle_customer_id
      || null;
    const status = typeof subscription.status === 'string' ? subscription.status : 'active';

    if (!['active', 'trialing', 'past_due', 'paused'].includes(status)) {
      return jsonResponse({
        success: false,
        error: `Subscription status is "${status}", not an active plan.`,
        subscription_id: subId,
      }, 409);
    }

    const { resolvedPlan, billingCycle } = resolvePlanFromSubscription(subscription);

    await applyActiveSubscriptionToProfile(supabaseAdmin, profile, {
      resolvedPlan,
      billingCycle,
      paddleCustomerId: customerId,
      paddleSubscriptionId: subId,
      paddleStatus: status,
      pendingCancel: false,
      eventData: subscription,
    });

    // Re-read pending cancel from subscription payload
    const scheduled = subscription.scheduled_change as Record<string, unknown> | null | undefined;
    if (scheduled?.action === 'cancel') {
      await applyActiveSubscriptionToProfile(supabaseAdmin, profile, {
        resolvedPlan,
        billingCycle,
        paddleCustomerId: customerId,
        paddleSubscriptionId: subId,
        paddleStatus: status,
        pendingCancel: true,
        eventData: subscription,
      });
    }

    await logBillingEvent(supabaseAdmin, {
      userId: profile.id,
      eventType: 'sync_subscription_applied',
      source: 'paddle_sync',
      rawPayload: {
        subscription_id: subId,
        customer_id: customerId,
        plan: resolvedPlan,
        status,
        synced_by: user.id,
      },
    });

    const { data: refreshed } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, plan, plan_status, billing_cycle, paddle_subscription_id, paddle_customer_id, trial_ends_at')
      .eq('id', profile.id)
      .single();

    return jsonResponse({
      success: true,
      profile: refreshed,
      subscription_id: subId,
      plan: resolvedPlan,
    });
  } catch (error) {
    console.error('[sync-paddle-subscription] Error:', error);
    return jsonResponse({ success: false, error: (error as Error).message }, 500);
  }
});

function pickBestSubscription(subs: Array<Record<string, unknown>>): Record<string, unknown> | null {
  if (!subs.length) return null;
  const rank = (s: Record<string, unknown>) => {
    const status = String(s.status || '');
    if (status === 'active') return 0;
    if (status === 'trialing') return 1;
    if (status === 'past_due') return 2;
    if (status === 'paused') return 3;
    return 9;
  };
  return [...subs].sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

function resolvePlanFromSubscription(subscription: Record<string, unknown>) {
  const fromPayload = resolvePlanFromPayload(subscription);
  if (fromPayload.priceId) return fromPayload;

  // Fallback: nested items[].price.id
  const items = subscription.items as Array<Record<string, unknown>> | undefined;
  const price = items?.[0]?.price as Record<string, unknown> | undefined;
  const priceId = (typeof price?.id === 'string' && price.id) || undefined;
  const plan = getPlanFromPriceId(priceId) || 'starter';
  return {
    resolvedPlan: plan,
    rawProductName: '',
    priceId,
    billingCycle: getBillingCycleFromPriceId(priceId),
  };
}
