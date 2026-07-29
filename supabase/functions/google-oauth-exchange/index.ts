import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  corsHeaders,
  createServiceClient,
  jsonResponse,
  requireUser,
} from '../_shared/auth.ts';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REDIRECT_URI = 'https://reachdeskcrm.com/auth/google/callback';
const SUPABASE_FUNCTIONS_URL = 'https://efxgwqfdstrhrnnvtynl.supabase.co/functions/v1';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user, response: authError } = await requireUser(req);
    if (authError || !user) return authError!;

    const userId = user.id;
    const supabase = createServiceClient();
    const { code } = await req.json();

    if (!code) {
      return jsonResponse({ error: 'Missing required parameter: code' }, 400);
    }

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('plan, role, email')
      .eq('id', userId)
      .maybeSingle();

    const calAllowedPlans = ['trial', 'pro', 'teams'];
    const calAccessAllowed =
      userProfile?.role === 'admin' ||
      calAllowedPlans.includes(userProfile?.plan ?? '');

    if (!calAccessAllowed) {
      return jsonResponse(
        { error: 'Google Calendar integration requires a Pro plan or higher' },
        403,
      );
    }

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error('[google-oauth-exchange] Token exchange failed:', tokenData);
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
      .from('calendar_integrations')
      .upsert(
        {
          user_id: userId,
          provider: 'google',
          access_token,
          refresh_token,
          token_expires_at: tokenExpiresAt,
          calendar_id: 'primary',
          is_active: true,
          connected_at: new Date().toISOString(),
          watch_channel_id: null,
          watch_resource_id: null,
          watch_expiration: null,
        },
        { onConflict: 'user_id,provider' },
      );

    if (upsertError) {
      console.error('[google-oauth-exchange] DB upsert error:', upsertError);
      return jsonResponse({ error: 'Failed to store tokens: ' + upsertError.message }, 500);
    }

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const watchResponse = await fetch(`${SUPABASE_FUNCTIONS_URL}/setup-calendar-watch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ userId }),
    });

    const watchResult = await watchResponse.json();
    if (!watchResponse.ok) {
      console.warn('[google-oauth-exchange] Watch setup warning:', watchResult);
    }

    console.log(`[google-oauth-exchange] Successfully connected Google Calendar for user ${userId}`);

    return jsonResponse({ success: true });
  } catch (err) {
    console.error('[google-oauth-exchange] Unexpected error:', err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
