import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getPlanFromPriceId } from '../_shared/prices.ts';
import {
  findProfileByEmail,
  getScheduledChange,
  hasPendingCancelSchedule,
  logBillingEvent,
  resolvePlanCancelsAt,
  sendBillingEmail,
} from '../_shared/billing.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifySignature(
  rawBody: string,
  signatureHeader: string,
  secretKey: string,
): Promise<boolean> {
  const parts = signatureHeader.split(';');
  let ts = '';
  let h1 = '';
  for (const part of parts) {
    const [key, val] = part.split('=');
    if (key === 'ts') ts = val;
    if (key === 'h1') h1 = val;
  }

  if (!ts || !h1) return false;

  const payload = `${ts}:${rawBody}`;
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signatureBuf = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(payload));
  const expectedHash = Array.from(new Uint8Array(signatureBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (expectedHash.length !== h1.length) return false;
  let result = 0;
  for (let i = 0; i < expectedHash.length; i++) {
    result |= expectedHash.charCodeAt(i) ^ h1.charCodeAt(i);
  }
  return result === 0;
}

function resolvePlanFromPayload(data: Record<string, unknown>) {
  const items = data.items as Array<Record<string, unknown>> | undefined;
  const firstItem = items?.[0];
  const price = firstItem?.price as Record<string, unknown> | undefined;
  const priceId = (firstItem?.price_id as string) || (price?.id as string);
  const rawProductName = ((price?.product as Record<string, unknown>)?.name as string) || '';

  let resolvedPlan = getPlanFromPriceId(priceId);
  if (!resolvedPlan) {
    const nameLower = rawProductName.toLowerCase();
    if (nameLower.includes('pro')) resolvedPlan = 'pro';
    else if (nameLower.includes('teams') || nameLower.includes('team')) resolvedPlan = 'teams';
    else if (nameLower.includes('starter')) resolvedPlan = 'starter';
    else resolvedPlan = 'starter';
  }

  return { resolvedPlan, rawProductName, priceId };
}

async function ensureTeamsWorkspace(
  supabaseAdmin: ReturnType<typeof createClient>,
  customerEmail: string,
  resolvedPlan: string,
  updateData: Record<string, unknown>,
) {
  if (resolvedPlan !== 'teams') return;

  const { data: existingTeamProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('id, email, team_id, team_role')
    .eq('email', customerEmail)
    .maybeSingle();

  if (
    existingTeamProfile
    && !existingTeamProfile.team_id
    && (existingTeamProfile.team_role || 'owner') !== 'member'
  ) {
    const ownerEmail = existingTeamProfile.email || customerEmail;
    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .insert({
        owner_id: existingTeamProfile.id,
        name: `${ownerEmail}'s Team`,
      })
      .select('id')
      .single();

    if (teamError || !team) {
      throw new Error(`Failed to create team workspace: ${teamError?.message || 'unknown error'}`);
    }

    updateData.team_id = team.id;
    updateData.team_role = 'owner';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('Paddle-Signature');
    const secretKey = Deno.env.get('PADDLE_WEBHOOK_SECRET');
    const testBypassSecret = Deno.env.get('TEST_BYPASS_SECRET');
    const allowTestBypass = Deno.env.get('ALLOW_TEST_BYPASS') === 'true';
    const isTestMode = allowTestBypass && !!testBypassSecret && req.headers.get('X-Test-Bypass') === testBypassSecret;

    if (!isTestMode && (!signatureHeader || !secretKey)) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    if (!isTestMode) {
      const isValid = await verifySignature(rawBody, signatureHeader!, secretKey!);
      if (!isValid) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid signature' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        });
      }
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.event_type || payload.alert_name;
    const data = (payload.data || {}) as Record<string, unknown>;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const customerEmail =
      (data.customer as Record<string, unknown> | undefined)?.email as string
      || (data.customer_details as Record<string, unknown> | undefined)?.email as string
      || data.email as string
      || payload.email as string;

    if (!customerEmail) {
      return new Response(JSON.stringify({ success: false, error: 'No customer email found in webhook payload' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const profile = await findProfileByEmail(supabaseAdmin, customerEmail);
    let lastEmailId: string | null = null;

    if (eventType === 'transaction.completed' || eventType === 'subscription.activated') {
      const { resolvedPlan, rawProductName } = resolvePlanFromPayload(data);
      const paddleCustomerId = (data.customer as Record<string, unknown> | undefined)?.id as string
        || data.customer_id as string;
      const paddleSubscriptionId = data.subscription_id as string
        || ((data.items as Array<Record<string, unknown>> | undefined)?.[0]?.subscription_id as string);
      const paddleStatus = typeof data.status === 'string' ? data.status : 'active';
      const pendingCancel = hasPendingCancelSchedule(data)
        || (profile?.plan_status === 'cancelling' && !!profile?.plan_cancels_at);

      const updateData: Record<string, unknown> = {
        plan: resolvedPlan,
        trial_ends_at: null,
        paddle_subscription_status: paddleStatus,
      };

      if (pendingCancel) {
        updateData.plan_status = 'cancelling';
        updateData.plan_cancels_at = resolvePlanCancelsAt(data);
      } else {
        updateData.plan_status = 'active';
        updateData.plan_cancels_at = null;
      }

      if (paddleCustomerId) updateData.paddle_customer_id = paddleCustomerId;
      if (paddleSubscriptionId) updateData.paddle_subscription_id = paddleSubscriptionId;

      await ensureTeamsWorkspace(supabaseAdmin, customerEmail, resolvedPlan, updateData);

      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update(updateData)
        .eq('email', customerEmail);

      if (updateError) throw new Error(`Failed to update user profile: ${updateError.message}`);

      await logBillingEvent(supabaseAdmin, {
        userId: profile?.id ?? null,
        eventType: 'webhook_transaction_completed',
        source: 'paddle_webhook',
        rawPayload: { event_type: eventType, pending_cancel: pendingCancel, subscription_id: paddleSubscriptionId },
      });

      const isFirstPayment = !profile || profile.plan_status !== 'active';
      if (isFirstPayment) {
        const planName = rawProductName.toLowerCase().endsWith('plan') ? rawProductName : `${rawProductName} Plan`;
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (resendApiKey) {
          const welcomeHtml = `
            <div style="background-color: #0D1117; color: #FFFFFF; font-family: sans-serif; padding: 30px; border-radius: 3px; max-width: 600px; margin: 0 auto; border: 1px solid #21262D;">
              <h2 style="color: #5B8FB9;">Welcome to ReachDesk CRM!</h2>
              <p>Your ${planName} is now active.</p>
              <p style="color: #8B949E; font-size: 0.85rem;">Paddle sends receipts and renewal reminders for billing. ReachDesk emails you about workspace access.</p>
            </div>
          `;
          lastEmailId = await sendBillingEmail(customerEmail, "You're in — Welcome to ReachDesk CRM!", welcomeHtml);
        }
      }
    } else if (eventType === 'subscription.updated') {
      const scheduledChange = getScheduledChange(data);
      const paddleStatus = typeof data.status === 'string' ? data.status : null;
      const updateData: Record<string, unknown> = {
        paddle_subscription_status: paddleStatus,
      };

      if (scheduledChange?.action === 'cancel') {
        updateData.plan_status = 'cancelling';
        updateData.plan_cancels_at = resolvePlanCancelsAt(data, scheduledChange);
      } else if (
        (scheduledChange == null || scheduledChange === null)
        && profile?.plan_status === 'cancelling'
      ) {
        updateData.plan_status = 'active';
        updateData.plan_cancels_at = null;
      }

      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update(updateData)
        .eq('email', customerEmail);

      if (updateError) throw new Error(`Failed to update user profile: ${updateError.message}`);

      if (Object.keys(updateData).length > 1) {
        await logBillingEvent(supabaseAdmin, {
          userId: profile?.id ?? null,
          eventType: scheduledChange?.action === 'cancel'
            ? 'webhook_subscription_cancel_scheduled'
            : 'webhook_subscription_updated',
          source: 'paddle_webhook',
          rawPayload: { scheduled_change: scheduledChange, status: paddleStatus },
        });
      }
    } else if (eventType === 'subscription.canceled') {
      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update({
          plan: 'trial',
          plan_status: 'inactive',
          plan_cancels_at: null,
          paddle_subscription_status: 'canceled',
        })
        .eq('email', customerEmail);

      if (updateError) throw new Error(`Failed to update user profile: ${updateError.message}`);

      await logBillingEvent(supabaseAdmin, {
        userId: profile?.id ?? null,
        eventType: 'webhook_subscription_canceled',
        source: 'paddle_webhook',
        rawPayload: data,
      });
    } else if (eventType === 'transaction.payment_failed') {
      await logBillingEvent(supabaseAdmin, {
        userId: profile?.id ?? null,
        eventType: 'webhook_transaction_payment_failed',
        source: 'paddle_webhook',
        rawPayload: data,
      });
    }

    return new Response(JSON.stringify({ success: true, email_id: lastEmailId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[Webhook] Error processing Paddle Webhook:', error);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
