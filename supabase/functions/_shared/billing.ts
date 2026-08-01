import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DEFAULT_FROM_EMAIL } from './email.ts';

export const BILLING_SUPPORT_EMAIL = 'support@reachdeskcrm.com';
export const BILLING_ERROR_MESSAGE =
  "We couldn't find an active subscription to cancel. Please contact support@reachdeskcrm.com.";

export function allowTestSubscriptions(): boolean {
  if (Deno.env.get('ALLOW_TEST_SUBSCRIPTIONS') === 'true') return true;
  const env = Deno.env.get('NODE_ENV') ?? Deno.env.get('ENVIRONMENT') ?? '';
  return env !== 'production';
}

export function isRealPaddleSubscriptionId(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false;
  if (id.startsWith('sub_test')) return false;
  return /^sub_[0-9a-z]+$/i.test(id);
}

export function getScheduledChange(data: Record<string, unknown> | null | undefined) {
  if (!data) return null;
  const direct = data.scheduled_change as Record<string, unknown> | null | undefined;
  if (direct) return direct;
  const subscription = data.subscription as Record<string, unknown> | null | undefined;
  return (subscription?.scheduled_change as Record<string, unknown> | null | undefined) ?? null;
}

export function hasPendingCancelSchedule(data: Record<string, unknown> | null | undefined): boolean {
  const scheduled = getScheduledChange(data);
  return scheduled?.action === 'cancel';
}

export function resolvePlanCancelsAt(
  subData: Record<string, unknown> | null | undefined,
  scheduledChange?: Record<string, unknown> | null,
): string | null {
  const scheduled = scheduledChange ?? getScheduledChange(subData);
  if (!scheduled || scheduled.action !== 'cancel') return null;

  const effectiveAt = scheduled.effective_at;
  if (typeof effectiveAt === 'string' && effectiveAt !== 'next_billing_period') {
    const parsed = new Date(effectiveAt);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  const period = subData?.current_billing_period as Record<string, unknown> | undefined;
  const endsAt = period?.ends_at;
  if (typeof endsAt === 'string') {
    const parsed = new Date(endsAt);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  return null;
}

export async function logBillingEvent(
  supabase: SupabaseClient,
  params: {
    userId: string | null;
    eventType: string;
    source: 'user_action' | 'paddle_webhook';
    rawPayload?: unknown;
  },
): Promise<void> {
  const { error } = await supabase.from('billing_events').insert({
    user_id: params.userId,
    event_type: params.eventType,
    source: params.source,
    raw_payload: params.rawPayload ?? null,
  });
  if (error) {
    console.error('[Billing] Failed to log billing event:', error.message);
  }
}

export async function sendBillingEmail(
  to: string,
  subject: string,
  html: string,
): Promise<string | null> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.error('[Billing] RESEND_API_KEY not set — skipping email');
    return null;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: DEFAULT_FROM_EMAIL,
      reply_to: BILLING_SUPPORT_EMAIL,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    console.error('[Billing] Resend failed:', await response.text());
    return null;
  }

  const data = await response.json();
  return data?.id ?? null;
}

export function formatAccessDate(iso: string | null | undefined): string {
  if (!iso) return 'the end of your billing period';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function findProfileByEmail(
  supabase: SupabaseClient,
  email: string,
) {
  const { data } = await supabase
    .from('user_profiles')
    .select('id, email, plan, plan_status, plan_cancels_at, paddle_subscription_id')
    .eq('email', email)
    .maybeSingle();
  return data;
}
