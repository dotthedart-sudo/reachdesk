import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function getEnv() {
  return {
    supabaseUrl: Deno.env.get('SUPABASE_URL') ?? '',
    anonKey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    serviceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    cronSecret: Deno.env.get('CRON_SECRET') ?? '',
  };
}

export function createServiceClient(): SupabaseClient {
  const { supabaseUrl, serviceRoleKey } = getEnv();
  return createClient(supabaseUrl, serviceRoleKey);
}

export function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  return authHeader.replace(/^Bearer\s+/i, '').trim();
}

/** Service-role bearer or matching x-cron-secret / CRON_SECRET header. */
export function isPrivilegedRequest(req: Request): boolean {
  const { serviceRoleKey, cronSecret } = getEnv();
  const token = getBearerToken(req);
  if (token && token === serviceRoleKey) return true;
  const cronHeader = req.headers.get('x-cron-secret');
  if (cronSecret && cronHeader === cronSecret) return true;
  return false;
}

/** Returns an error Response when the caller is not privileged; null when allowed. */
export function requirePrivileged(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (!isPrivilegedRequest(req)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }
  return null;
}

export type AuthUser = { id: string; email?: string | null };

export async function requireUser(
  req: Request,
): Promise<{ user: AuthUser | null; response: Response | null }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return {
      user: null,
      response: jsonResponse({ error: 'Unauthorized: Missing Authorization header' }, 401),
    };
  }

  const { supabaseUrl, anonKey } = getEnv();
  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error,
  } = await supabaseUser.auth.getUser();

  if (error || !user) {
    return { user: null, response: jsonResponse({ error: 'Unauthorized' }, 401) };
  }

  return { user: { id: user.id, email: user.email }, response: null };
}

export async function requireAdmin(
  req: Request,
  supabase: SupabaseClient,
): Promise<{ user: AuthUser | null; response: Response | null }> {
  const { user, response } = await requireUser(req);
  if (response || !user) return { user, response };

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') {
    return { user: null, response: jsonResponse({ error: 'Forbidden: admin only' }, 403) };
  }

  return { user, response: null };
}

const DEFAULT_SHEETS_REDIRECT_ORIGINS = [
  'https://reachdeskcrm.com',
  'https://app.reachdeskcrm.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

export function isAllowedSheetsRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    if (url.pathname !== '/auth/google-sheets/callback') return false;
    const extra = Deno.env.get('ALLOWED_OAUTH_ORIGINS');
    const allowed = extra
      ? [...DEFAULT_SHEETS_REDIRECT_ORIGINS, ...extra.split(',').map((s) => s.trim())]
      : DEFAULT_SHEETS_REDIRECT_ORIGINS;
    return allowed.some(
      (origin) => url.origin === origin || url.hostname.endsWith('.reachdeskcrm.com'),
    );
  } catch {
    return false;
  }
}
