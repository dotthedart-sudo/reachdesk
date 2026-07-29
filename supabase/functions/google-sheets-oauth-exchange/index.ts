import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders,
  createServiceClient,
  isAllowedSheetsRedirectUri,
  jsonResponse,
  requireUser,
} from '../_shared/auth.ts';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DEFAULT_REDIRECT_URI = 'https://reachdeskcrm.com/auth/google-sheets/callback';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user, response: authError } = await requireUser(req);
    if (authError || !user) return authError!;

    const userId = user.id;
    const supabase = createServiceClient();
    const { code, redirectUri } = await req.json();

    if (!code) {
      return jsonResponse({ error: 'Missing required parameter: code' }, 400);
    }

    const resolvedRedirect = redirectUri || DEFAULT_REDIRECT_URI;
    if (!isAllowedSheetsRedirectUri(resolvedRedirect)) {
      return jsonResponse({ error: 'Invalid redirect URI' }, 400);
    }

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('plan, role, email')
      .eq('id', userId)
      .maybeSingle();

    const sheetsAllowedPlans = ['trial', 'starter', 'pro', 'teams'];
    const sheetsAccessAllowed =
      userProfile?.role === 'admin' ||
      sheetsAllowedPlans.includes(userProfile?.plan ?? '');

    if (!sheetsAccessAllowed) {
      return jsonResponse(
        { error: 'Google Sheets integration requires a Pro plan or higher' },
        403,
      );
    }

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: Deno.env.get('GOOGLE_SHEETS_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_SHEETS_CLIENT_SECRET')!,
        redirect_uri: resolvedRedirect,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error('[google-sheets-oauth-exchange] Token exchange failed:', tokenData);
      return jsonResponse(
        { error: tokenData.error_description || 'Token exchange failed' },
        400,
      );
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    if (!refresh_token) {
      return jsonResponse(
        {
          error:
            'No refresh_token received. Ensure prompt=consent was used in the OAuth URL.',
        },
        400,
      );
    }

    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    const { error: upsertError } = await supabase
      .from('sheets_integrations')
      .upsert(
        {
          user_id: userId,
          access_token,
          refresh_token,
          token_expires_at: tokenExpiresAt,
          is_active: true,
          connected_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );

    if (upsertError) {
      console.error('[google-sheets-oauth-exchange] DB upsert error:', upsertError);
      return jsonResponse({ error: 'Failed to store tokens: ' + upsertError.message }, 500);
    }

    console.log(`[google-sheets-oauth-exchange] Successfully connected Google Sheets for user ${userId}`);

    return jsonResponse({ success: true });
  } catch (err) {
    console.error('[google-sheets-oauth-exchange] Unexpected error:', err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
