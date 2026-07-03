import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check both Cloudflare connecting IP and x-forwarded-for
    const clientIp = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim();
    
    console.log('Detected Client IP in Edge Function:', clientIp);

    let ipapiInfo = { country_code: null, currency: null };
    
    // Check if we have a valid non-local client IP
    const isValidIp = clientIp && 
      clientIp !== '127.0.0.1' && 
      clientIp !== '::1' && 
      !clientIp.startsWith('192.168.') && 
      !clientIp.startsWith('10.') &&
      !clientIp.startsWith('172.16.') &&
      !clientIp.startsWith('172.17.') &&
      !clientIp.startsWith('172.18.') &&
      !clientIp.startsWith('172.19.') &&
      !clientIp.startsWith('172.20.') &&
      !clientIp.startsWith('172.21.') &&
      !clientIp.startsWith('172.22.') &&
      !clientIp.startsWith('172.23.') &&
      !clientIp.startsWith('172.24.') &&
      !clientIp.startsWith('172.25.') &&
      !clientIp.startsWith('172.26.') &&
      !clientIp.startsWith('172.27.') &&
      !clientIp.startsWith('172.28.') &&
      !clientIp.startsWith('172.29.') &&
      !clientIp.startsWith('172.30.') &&
      !clientIp.startsWith('172.31.');

    // 1. Try freeipapi.com as Primary (generous rate limits)
    if (isValidIp) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      try {
        const url = `https://freeipapi.com/api/json/${clientIp}`;
        console.log(`Querying primary freeipapi: ${url}`);
        const response = await fetch(url, { signal: controller.signal });
        if (response.ok) {
          const data = await response.json();
          console.log('freeipapi.com Response:', data);
          if (data.countryCode) {
            ipapiInfo.country_code = data.countryCode;
            ipapiInfo.currency = data.currencies?.[0] || 'USD';
          }
        }
      } catch (err) {
        console.warn('Primary location API (freeipapi.com) failed or timed out:', err.message);
      } finally {
        clearTimeout(timeoutId);
      }
    }

    // 2. Try ipapi.co as Fallback
    if (!ipapiInfo.country_code) {
      const fallbackController = new AbortController();
      const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 2500);
      try {
        const targetUrl = isValidIp ? `https://ipapi.co/${clientIp}/json/` : 'https://ipapi.co/json/';
        console.log(`Querying fallback ipapi.co: ${targetUrl}`);
        const response = await fetch(targetUrl, { signal: fallbackController.signal });
        if (response.ok) {
          const data = await response.json();
          console.log('ipapi.co Response:', data);
          if (data.country_code && data.currency) {
            ipapiInfo.country_code = data.country_code;
            ipapiInfo.currency = data.currency;
          }
        }
      } catch (err) {
        console.warn('Fallback location API (ipapi.co) failed or timed out:', err.message);
      } finally {
        clearTimeout(fallbackTimeoutId);
      }
    }

    console.log('Returning final geolocation data:', ipapiInfo);

    return new Response(
      JSON.stringify(ipapiInfo),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Error in detect-location function:', error.message);
    return new Response(
      JSON.stringify({ country_code: null, currency: null }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
