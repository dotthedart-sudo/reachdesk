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

    const { values } = await req.json();
    if (!values || !Array.isArray(values)) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: values' }),
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

    // ── Step 1: Create a new spreadsheet ─────────────────────────────────────
    const formattedDate = new Date().toISOString().split('T')[0];
    const createResp = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: `ReachDesk CRM Leads Export - ${formattedDate}`,
        },
      }),
    });

    if (!createResp.ok) {
      const errText = await createResp.text();
      console.error('[export-leads-to-sheets-new] Google Sheets Create error:', errText);
      return new Response(
        JSON.stringify({ error: 'Failed to create new spreadsheet' }),
        { status: createResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sheetInfo = await createResp.json();
    const spreadsheetId = sheetInfo.spreadsheetId;
    const spreadsheetUrl = sheetInfo.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    // ── Step 2: Write values to the newly created spreadsheet ────────────────
    const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1?valueInputOption=USER_ENTERED`;
    const writeResp = await fetch(writeUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: 'A1',
        majorDimension: 'ROWS',
        values: values,
      }),
    });

    if (!writeResp.ok) {
      const errText = await writeResp.text();
      console.error('[export-leads-to-sheets-new] Google Sheets Write error:', errText);
      return new Response(
        JSON.stringify({ error: 'Spreadsheet was created, but failed to write lead data.' }),
        { status: writeResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ spreadsheetUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[export-leads-to-sheets-new] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
