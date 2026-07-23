import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { code, userId, redirectUri } = await req.json();

    if (!code || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: code, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Plan check: Sheets integration requires trial/Pro/Enterprise ──────────
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('plan, role, email')
      .eq('id', userId)
      .maybeSingle();

    const sheetsAllowedPlans = ['trial', 'pro', 'enterprise'];
    const sheetsAccessAllowed =
      userProfile?.role === 'admin' ||
      sheetsAllowedPlans.includes(userProfile?.plan ?? '');

    if (!sheetsAccessAllowed) {
      return new Response(
        JSON.stringify({ error: 'Google Sheets integration requires a Pro plan or higher' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Step 1: Exchange authorization code for tokens ────────────────────────
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: Deno.env.get('GOOGLE_SHEETS_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_SHEETS_CLIENT_SECRET')!,
        redirect_uri: redirectUri || 'https://reachdeskcrm.com/auth/google-sheets/callback',
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error('[google-sheets-oauth-exchange] Token exchange failed:', tokenData);
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

    // ── Step 2: Upsert tokens in sheets_integrations ──────────────────────────
    const { error: upsertError } = await supabase
      .from('sheets_integrations')
      .upsert({
        user_id: userId,
        access_token,
        refresh_token,
        token_expires_at: tokenExpiresAt,
        is_active: true,
        connected_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('[google-sheets-oauth-exchange] DB upsert error:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store tokens: ' + upsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[google-sheets-oauth-exchange] Successfully connected Google Sheets for user ${userId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[google-sheets-oauth-exchange] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
