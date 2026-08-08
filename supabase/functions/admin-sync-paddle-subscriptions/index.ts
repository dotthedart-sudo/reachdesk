import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  applyActiveSubscriptionToProfile,
  getScheduledChange,
  logBillingEvent,
  resolvePlanFromPayload,
  resolveProfileForPaddleEvent,
} from '../_shared/billing.ts';
import { corsHeaders, createServiceClient, jsonResponse, requireAdmin } from '../_shared/auth.ts';
import { listAllLivePaddleSubscriptions } from '../_shared/paddle.ts';

type SyncResult = {
  subscription_id: string;
  customer_id: string | null;
  customer_email: string | null;
  user_id?: string;
  email?: string | null;
  plan?: string;
  match_via?: string | null;
  error?: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseAdmin = createServiceClient();

  try {
    const { user, response: authError } = await requireAdmin(req, supabaseAdmin);
    if (authError || !user) return authError!;

    if (req.method === 'GET') {
      const { data: lastSummary } = await supabaseAdmin
        .from('billing_events')
        .select('created_at, raw_payload')
        .eq('event_type', 'admin_full_resync_summary')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return jsonResponse({
        success: true,
        last_sync: lastSummary
          ? {
              synced_at: lastSummary.created_at,
              ...(typeof lastSummary.raw_payload === 'object' && lastSummary.raw_payload
                ? lastSummary.raw_payload as Record<string, unknown>
                : {}),
            }
          : null,
      });
    }

    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const syncedAt = new Date().toISOString();
    const subscriptions = await listAllLivePaddleSubscriptions();

    const updated: SyncResult[] = [];
    const unmatched: SyncResult[] = [];
    const skipped: SyncResult[] = [];
    const errors: SyncResult[] = [];

    for (const subscription of subscriptions) {
      const subId = typeof subscription.id === 'string' ? subscription.id : 'unknown';
      const customerId =
        (typeof subscription.customer_id === 'string' && subscription.customer_id)
        || null;

      const { profile, customerEmail, matchVia } = await resolveProfileForPaddleEvent(
        supabaseAdmin,
        subscription,
        null,
      );

      if (!profile) {
        unmatched.push({
          subscription_id: subId,
          customer_id: customerId,
          customer_email: customerEmail,
        });
        continue;
      }

      const { data: fullProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('id, email, role, plan, plan_status')
        .eq('id', profile.id)
        .maybeSingle();

      if (fullProfile?.role === 'admin') {
        skipped.push({
          subscription_id: subId,
          customer_id: customerId,
          customer_email: customerEmail,
          user_id: fullProfile.id,
          email: fullProfile.email,
          match_via: matchVia,
        });
        continue;
      }

      try {
        const { resolvedPlan, billingCycle } = resolvePlanFromPayload(subscription);
        const paddleStatus = typeof subscription.status === 'string' ? subscription.status : 'active';
        const scheduledChange = getScheduledChange(subscription);
        const pendingCancel = scheduledChange?.action === 'cancel';

        await applyActiveSubscriptionToProfile(supabaseAdmin, profile, {
          resolvedPlan,
          billingCycle,
          paddleCustomerId: customerId,
          paddleSubscriptionId: subId,
          paddleStatus,
          pendingCancel,
          eventData: subscription,
        });

        await logBillingEvent(supabaseAdmin, {
          userId: profile.id,
          eventType: 'admin_full_resync',
          source: 'paddle_sync',
          rawPayload: {
            subscription_id: subId,
            customer_id: customerId,
            plan: resolvedPlan,
            billing_cycle: billingCycle,
            paddle_status: paddleStatus,
            match_via: matchVia,
            synced_by: user.id,
            synced_at: syncedAt,
          },
        });

        updated.push({
          subscription_id: subId,
          customer_id: customerId,
          customer_email: customerEmail ?? profile.email,
          user_id: profile.id,
          email: profile.email,
          plan: resolvedPlan,
          match_via: matchVia,
        });
      } catch (err) {
        errors.push({
          subscription_id: subId,
          customer_id: customerId,
          customer_email: customerEmail,
          user_id: profile.id,
          email: profile.email,
          error: (err as Error).message,
        });
      }
    }

    const summary = {
      synced_at: syncedAt,
      synced_by: user.id,
      paddle_subscription_count: subscriptions.length,
      updated_count: updated.length,
      unmatched_count: unmatched.length,
      skipped_admin_count: skipped.length,
      error_count: errors.length,
      unmatched,
      errors,
    };

    await logBillingEvent(supabaseAdmin, {
      userId: user.id,
      eventType: 'admin_full_resync_summary',
      source: 'paddle_sync',
      rawPayload: summary,
    });

    return jsonResponse({
      success: true,
      ...summary,
      updated,
      skipped,
    });
  } catch (error) {
    console.error('[admin-sync-paddle-subscriptions] Error:', error);
    return jsonResponse({ success: false, error: (error as Error).message }, 500);
  }
});
