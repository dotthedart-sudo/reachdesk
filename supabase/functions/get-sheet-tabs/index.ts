import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { spreadsheetId } = await req.json();
    if (!spreadsheetId) {
      return new Response(
        JSON.stringify({ error: 'Missing spreadsheetId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate user
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get integration
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: integration, error: fetchErr } = await supabaseAdmin
      .from('sheets_integrations')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchErr || !integration) {
      return new Response(
        JSON.stringify({ error: 'Google Sheets not connected' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken = integration.access_token;
    const isExpired = new Date(integration.token_expires_at) <= new Date(Date.now() + 60_000);

    if (isExpired) {
      const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_SHEETS_CLIENT_ID')!,
          client_secret: Deno.env.get('GOOGLE_SHEETS_CLIENT_SECRET')!,
          refresh_token: integration.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!resp.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to refresh access token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const refreshed = await resp.json();
      accessToken = refreshed.access_token;

      await supabaseAdmin
        .from('sheets_integrations')
        .update({
          access_token: accessToken,
          token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        })
        .eq('user_id', user.id);
    }

    // Call Google Sheets API to fetch tabs
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`;
    const sheetsResp = await fetch(sheetsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!sheetsResp.ok) {
      const errText = await sheetsResp.text();
      console.error('[get-sheet-tabs] Google Sheets API error:', errText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch spreadsheet tabs from Google Sheets API' }),
        { status: sheetsResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sheetsData = await sheetsResp.json();
    const tabs = (sheetsData.sheets || []).map((sheet: any) => ({
      name: sheet.properties.title,
    }));

    return new Response(
      JSON.stringify({ tabs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[get-sheet-tabs] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
