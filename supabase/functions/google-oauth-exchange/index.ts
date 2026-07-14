import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REDIRECT_URI = 'https://reachdeskcrm.com/auth/google/callback';
const SUPABASE_FUNCTIONS_URL = 'https://efxgwqfdstrhrnnvtynl.supabase.co/functions/v1';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { code, userId } = await req.json();

    if (!code || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: code, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Plan check: Calendar integration requires trial/Pro/Enterprise ─────────
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('plan, role, email')
      .eq('id', userId)
      .maybeSingle();

    const calAllowedPlans = ['trial', 'pro', 'enterprise'];
    const calAccessAllowed =
      userProfile?.role === 'admin' ||
      userProfile?.email === 'dotthedart@gmail.com' ||
      calAllowedPlans.includes(userProfile?.plan ?? '');

    if (!calAccessAllowed) {
      return new Response(
        JSON.stringify({ error: 'Google Calendar integration requires a Pro plan or higher' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Step 1: Exchange authorization code for tokens ────────────────────────
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
      return new Response(
        JSON.stringify({ error: tokenData.error_description || 'Token exchange failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    if (!refresh_token) {
      return new Response(
        JSON.stringify({ error: 'No refresh_token received. Ensure prompt=consent was used in the OAuth URL.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // ── Step 2: Upsert tokens in calendar_integrations ────────────────────────
    const { error: upsertError } = await supabase
      .from('calendar_integrations')
      .upsert({
        user_id: userId,
        provider: 'google',
        access_token,
        refresh_token,
        token_expires_at: tokenExpiresAt,
        calendar_id: 'primary',
        is_active: true,
        connected_at: new Date().toISOString(),
        // Clear any stale watch data — will be set by setup-calendar-watch
        watch_channel_id: null,
        watch_resource_id: null,
        watch_expiration: null,
      }, { onConflict: 'user_id,provider' });

    if (upsertError) {
      console.error('[google-oauth-exchange] DB upsert error:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store tokens: ' + upsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Step 3: Set up calendar watch channel ─────────────────────────────────
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const watchResponse = await fetch(`${SUPABASE_FUNCTIONS_URL}/setup-calendar-watch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ userId, accessToken: access_token }),
    });

    const watchResult = await watchResponse.json();
    if (!watchResponse.ok) {
      // Watch setup failure is non-fatal — tokens are stored, user is connected.
      // Watch can be set up on next page load or next renewal run.
      console.warn('[google-oauth-exchange] Watch setup warning:', watchResult);
    }

    console.log(`[google-oauth-exchange] Successfully connected Google Calendar for user ${userId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[google-oauth-exchange] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
