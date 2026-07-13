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

    const { spreadsheetId, sheetName, values, mode } = await req.json();
    if (!spreadsheetId || !sheetName || !values || !Array.isArray(values) || !mode) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: spreadsheetId, sheetName, values, mode' }),
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

    if (mode === 'overwrite') {
      // Clear sheet first
      const clearRange = encodeURIComponent(`'${sheetName}'!A:Z`);
      const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clearRange}:clear`;
      const clearResp = await fetch(clearUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!clearResp.ok) {
        const errText = await clearResp.text();
        console.error('[export-leads-to-sheets-existing] Google Sheets Clear error:', errText);
        return new Response(
          JSON.stringify({ error: 'Failed to clear existing sheet data' }),
          { status: clearResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Write values from A1
      const writeRange = encodeURIComponent(`'${sheetName}'!A1`);
      const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${writeRange}?valueInputOption=USER_ENTERED`;
      const writeResp = await fetch(writeUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: `'${sheetName}'!A1`,
          majorDimension: 'ROWS',
          values: values,
        }),
      });

      if (!writeResp.ok) {
        const errText = await writeResp.text();
        console.error('[export-leads-to-sheets-existing] Google Sheets Write error:', errText);
        return new Response(
          JSON.stringify({ error: 'Failed to write lead data to sheet' }),
          { status: writeResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (mode === 'append') {
      // Check if sheet is empty to decide whether to append headers
      const checkRange = encodeURIComponent(`'${sheetName}'!A1:A1`);
      const checkResp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${checkRange}?majorDimension=ROWS`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const checkData = await checkResp.json();
      const isSheetEmpty = !checkData.values || checkData.values.length === 0;

      // If sheet has data, we append only rows (exclude headers, i.e., values.slice(1))
      // If sheet is empty, we append everything (including headers)
      const dataToAppend = isSheetEmpty ? values : values.slice(1);

      if (dataToAppend.length > 0) {
        const appendRange = encodeURIComponent(`'${sheetName}'!A1`);
        const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${appendRange}:append?valueInputOption=USER_ENTERED`;
        const appendResp = await fetch(appendUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            range: `'${sheetName}'!A1`,
            majorDimension: 'ROWS',
            values: dataToAppend,
          }),
        });

        if (!appendResp.ok) {
          const errText = await appendResp.text();
          console.error('[export-leads-to-sheets-existing] Google Sheets Append error:', errText);
          return new Response(
            JSON.stringify({ error: 'Failed to append lead data to sheet' }),
            { status: appendResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid mode: must be overwrite or append' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[export-leads-to-sheets-existing] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
