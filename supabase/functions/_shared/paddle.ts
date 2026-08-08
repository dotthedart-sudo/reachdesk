/**
 * Paddle Billing API helpers for edge functions.
 */

const PADDLE_API_BASE = 'https://api.paddle.com';

export function getPaddleApiKey(): string | null {
  return Deno.env.get('PADDLE_API_KEY') ?? null;
}

export async function paddleFetch(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<{ ok: boolean; status: number; data: unknown; text: string }> {
  const apiKey = getPaddleApiKey();
  if (!apiKey) {
    throw new Error('PADDLE_API_KEY environment variable is not set');
  }

  const response = await fetch(`${PADDLE_API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  return { ok: response.ok, status: response.status, data, text };
}

export function extractCustomData(data: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!data) return {};
  const direct = data.custom_data as Record<string, unknown> | null | undefined;
  if (direct && typeof direct === 'object') return direct;
  const details = data.details as Record<string, unknown> | undefined;
  const nested = details?.custom_data as Record<string, unknown> | null | undefined;
  if (nested && typeof nested === 'object') return nested;
  return {};
}

export function extractCustomerId(data: Record<string, unknown> | null | undefined): string | null {
  if (!data) return null;
  if (typeof data.customer_id === 'string') return data.customer_id;
  const customer = data.customer as Record<string, unknown> | undefined;
  if (typeof customer?.id === 'string') return customer.id;
  return null;
}

export function extractCustomerEmail(data: Record<string, unknown> | null | undefined): string | null {
  if (!data) return null;
  const customer = data.customer as Record<string, unknown> | undefined;
  if (typeof customer?.email === 'string') return customer.email;
  const details = data.customer_details as Record<string, unknown> | undefined;
  if (typeof details?.email === 'string') return details.email;
  if (typeof data.email === 'string') return data.email;
  return null;
}

export function extractSubscriptionId(
  data: Record<string, unknown> | null | undefined,
  eventType?: string,
): string | null {
  if (!data) return null;
  if (typeof eventType === 'string' && eventType.startsWith('subscription.') && typeof data.id === 'string') {
    return data.id;
  }
  if (typeof data.subscription_id === 'string') return data.subscription_id;
  const subscription = data.subscription as Record<string, unknown> | undefined;
  if (typeof subscription?.id === 'string') return subscription.id;
  const items = data.items as Array<Record<string, unknown>> | undefined;
  const fromItem = items?.[0]?.subscription_id;
  if (typeof fromItem === 'string') return fromItem;
  return null;
}

export async function fetchPaddleCustomerEmail(customerId: string): Promise<string | null> {
  const { ok, data } = await paddleFetch(`/customers/${customerId}`);
  if (!ok || !data || typeof data !== 'object') return null;
  const customer = (data as { data?: Record<string, unknown> }).data;
  return typeof customer?.email === 'string' ? customer.email : null;
}

export async function findPaddleCustomerByEmail(email: string): Promise<Record<string, unknown> | null> {
  const q = encodeURIComponent(email.trim());
  const { ok, data } = await paddleFetch(`/customers?email=${q}`);
  if (!ok || !data || typeof data !== 'object') return null;
  const list = (data as { data?: Array<Record<string, unknown>> }).data;
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[0] ?? null;
}

export async function listPaddleSubscriptionsForCustomer(
  customerId: string,
): Promise<Array<Record<string, unknown>>> {
  const { ok, data } = await paddleFetch(
    `/subscriptions?customer_id=${encodeURIComponent(customerId)}`,
  );
  if (!ok || !data || typeof data !== 'object') return [];
  const list = (data as { data?: Array<Record<string, unknown>> }).data;
  return Array.isArray(list) ? list : [];
}

export async function getPaddleSubscription(subscriptionId: string): Promise<Record<string, unknown> | null> {
  const { ok, data } = await paddleFetch(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
  if (!ok || !data || typeof data !== 'object') return null;
  return (data as { data?: Record<string, unknown> }).data ?? null;
}

const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due'] as const;

/** Paginated list of subscriptions for one or more Paddle statuses. */
export async function listPaddleSubscriptionsByStatus(
  status: string,
  perPage = 200,
): Promise<Array<Record<string, unknown>>> {
  const results: Array<Record<string, unknown>> = [];
  let after: string | undefined;

  for (let page = 0; page < 100; page++) {
    const params = new URLSearchParams({
      status,
      per_page: String(perPage),
    });
    if (after) params.set('after', after);

    const { ok, data, text } = await paddleFetch(`/subscriptions?${params.toString()}`);
    if (!ok) {
      throw new Error(`Paddle subscriptions list failed (${status}): ${text}`);
    }

    if (!data || typeof data !== 'object') break;
    const body = data as {
      data?: Array<Record<string, unknown>>;
      meta?: { pagination?: { has_more?: boolean; next?: string } };
    };
    const batch = body.data ?? [];
    results.push(...batch);

    const pagination = body.meta?.pagination;
    if (!pagination?.has_more || batch.length === 0) break;

    const lastId = batch[batch.length - 1]?.id;
    after = typeof lastId === 'string' ? lastId : undefined;
    if (!after) break;
  }

  return results;
}

/** All live subscriptions Paddle considers billable (active, trialing, past_due). */
export async function listAllLivePaddleSubscriptions(): Promise<Array<Record<string, unknown>>> {
  const byId = new Map<string, Record<string, unknown>>();

  for (const status of ACTIVE_SUBSCRIPTION_STATUSES) {
    const subs = await listPaddleSubscriptionsByStatus(status);
    for (const sub of subs) {
      const id = typeof sub.id === 'string' ? sub.id : null;
      if (id) byId.set(id, sub);
    }
  }

  return [...byId.values()];
}
