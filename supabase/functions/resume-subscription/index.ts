import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import {
  allowTestSubscriptions,
  BILLING_ERROR_MESSAGE,
  BILLING_SUPPORT_EMAIL,
  isRealPaddleSubscriptionId,
  logBillingEvent,
  sendBillingEmail,
} from '../_shared/billing.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  let userId: string | null = null;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ success: false, error: 'Unauthorized: Missing Authorization header' }, 401);
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
    }

    userId = user.id;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, paddle_subscription_id, plan_status, team_id, team_role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return jsonResponse({ success: false, error: 'Profile not found' }, 404);
    }

    if ((profile.team_role || 'owner').toLowerCase() === 'member' && profile.team_id) {
      return jsonResponse(
        { success: false, error: 'Billing is managed by your workspace owner.' },
        403,
      );
    }

    if (profile.plan_status !== 'cancelling') {
      return jsonResponse({ success: false, error: 'No pending cancellation to resume.' }, 400);
    }

    const subscriptionId = profile.paddle_subscription_id;
    const isTestId = typeof subscriptionId === 'string' && subscriptionId.startsWith('sub_test');

    if (!subscriptionId || !isRealPaddleSubscriptionId(subscriptionId)) {
      if (isTestId && allowTestSubscriptions()) {
        const { error: dbError } = await supabaseAdmin
          .from('user_profiles')
          .update({
            plan_status: 'active',
            plan_cancels_at: null,
            paddle_subscription_status: 'active',
          })
          .eq('id', user.id);

        if (dbError) throw new Error(dbError.message);

        await logBillingEvent(supabaseAdmin, {
          userId: user.id,
          eventType: 'resume_confirmed',
          source: 'user_action',
          rawPayload: { subscription_id: subscriptionId, test_mode: true },
        });

        return jsonResponse({ success: true, message: 'Subscription resumed (test mode).' });
      }

      await logBillingEvent(supabaseAdmin, {
        userId: user.id,
        eventType: 'resume_failed',
        source: 'user_action',
        rawPayload: { subscription_id: subscriptionId },
      });
      return jsonResponse({ success: false, error: BILLING_ERROR_MESSAGE }, 400);
    }

    const paddleApiKey = Deno.env.get('PADDLE_API_KEY');
    if (!paddleApiKey) {
      throw new Error('PADDLE_API_KEY environment variable is not set');
    }

    const paddleResponse = await fetch(`https://api.paddle.com/subscriptions/${subscriptionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${paddleApiKey}`,
      },
      body: JSON.stringify({ scheduled_change: null }),
    });

    if (!paddleResponse.ok) {
      const errText = await paddleResponse.text();
      await logBillingEvent(supabaseAdmin, {
        userId: user.id,
        eventType: 'resume_failed',
        source: 'user_action',
        rawPayload: { subscription_id: subscriptionId, paddle_status: paddleResponse.status, error: errText },
      });
      throw new Error(`Paddle API responded with status ${paddleResponse.status}: ${errText}`);
    }

    const paddleData = await paddleResponse.json();
    const subData = paddleData?.data as Record<string, unknown> | undefined;
    const paddleStatus = typeof subData?.status === 'string' ? subData.status : 'active';

    const { error: dbError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        plan_status: 'active',
        plan_cancels_at: null,
        paddle_subscription_status: paddleStatus,
      })
      .eq('id', user.id)
      .eq('paddle_subscription_id', subscriptionId);

    if (dbError) {
      throw new Error(`Failed to update user profile: ${dbError.message}`);
    }

    await logBillingEvent(supabaseAdmin, {
      userId: user.id,
      eventType: 'resume_confirmed',
      source: 'user_action',
      rawPayload: { subscription_id: subscriptionId, paddle_status: paddleStatus },
    });

    if (profile.email) {
      await sendBillingEmail(
        profile.email,
        'ReachDesk CRM — Subscription resumed',
        `
          <div style="background-color: #0D1117; color: #FFFFFF; font-family: sans-serif; padding: 30px; border-radius: 3px; max-width: 600px; margin: 0 auto; border: 1px solid #21262D;">
            <h2 style="color: #5B8FB9;">Subscription resumed</h2>
            <p>Your scheduled cancellation has been removed. Your ReachDesk plan will renew automatically per your Paddle billing settings.</p>
            <p>Paddle sends upcoming charge and receipt emails for billing. Manage your plan anytime in Settings → Billing.</p>
            <p style="color: #8B949E; font-size: 0.8rem; margin-top: 24px;">Questions? Contact ${BILLING_SUPPORT_EMAIL}</p>
          </div>
        `,
      );
    }

    return jsonResponse({
      success: true,
      message: 'Subscription resumed successfully.',
      data: paddleData,
    });
  } catch (error) {
    console.error('[Resume] Error processing subscription resume:', error);
    if (userId) {
      await logBillingEvent(supabaseAdmin, {
        userId,
        eventType: 'resume_failed',
        source: 'user_action',
        rawPayload: { error: (error as Error).message },
      });
    }
    return jsonResponse({ success: false, error: (error as Error).message }, 400);
  }
});
