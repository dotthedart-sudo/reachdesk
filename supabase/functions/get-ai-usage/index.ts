import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAiCreditLimit, getAiCreditPeriodStart, normalizePlan } from '../_shared/aiCredits.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: profile } = await supabaseUser
    .from('user_profiles')
    .select('plan, created_at')
    .eq('id', user.id)
    .maybeSingle();

  const plan = normalizePlan(profile?.plan);
  const limit = getAiCreditLimit(plan);
  const periodStart = getAiCreditPeriodStart(plan, profile?.created_at);

  const { count, error: countError } = await supabaseUser
    .from('ai_usage_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', periodStart);

  if (countError) {
    console.error('[get-ai-usage] count error:', countError);
    return new Response(JSON.stringify({ error: 'Failed to load usage' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const used = count ?? 0;
  return new Response(
    JSON.stringify({
      plan,
      used,
      limit,
      remaining: Math.max(0, limit - used),
      periodStart,
      isTrialPool: plan === 'trial',
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
