import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Auth: require valid user JWT ───────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ success: false, error: 'Unauthorized: Missing Authorization header' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401)
    }

    // Load caller's profile — cancel only their own subscription
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, paddle_subscription_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return jsonResponse({ success: false, error: 'Profile not found' }, 404)
    }

    const subscription_id = profile.paddle_subscription_id
    if (!subscription_id) {
      return jsonResponse({ success: false, error: 'No active subscription found for this account' }, 400)
    }

    // Optional: if client still sends subscription_id, it must match
    try {
      const body = await req.json().catch(() => ({}))
      if (body?.subscription_id && body.subscription_id !== subscription_id) {
        return jsonResponse({ success: false, error: 'Forbidden: subscription mismatch' }, 403)
      }
    } catch {
      // empty body is fine
    }

    if (typeof subscription_id === 'string' && subscription_id.startsWith('sub_test')) {
      console.log(`[Cancel] Test mode bypass for subscription_id: ${subscription_id}`)

      const { error: dbError } = await supabaseAdmin
        .from('user_profiles')
        .update({ plan_status: 'cancelling' })
        .eq('id', user.id)
        .eq('paddle_subscription_id', subscription_id)

      if (dbError) {
        console.error(`[Cancel] DB Update error: ${dbError.message}`)
        throw new Error(`Failed to update user profile in database: ${dbError.message}`)
      }

      return jsonResponse({
        success: true,
        message: 'Subscription successfully scheduled for cancellation (Test Mode).',
      })
    }

    const paddleApiKey = Deno.env.get('PADDLE_API_KEY')
    if (!paddleApiKey) {
      throw new Error('PADDLE_API_KEY environment variable is not set')
    }

    const paddleUrl = `https://api.paddle.com/subscriptions/${subscription_id}`
    console.log(`[Cancel] Calling Paddle API for subscription: ${subscription_id} (user=${user.id})`)

    const paddleResponse = await fetch(paddleUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${paddleApiKey}`,
      },
      body: JSON.stringify({
        scheduled_change: {
          action: 'cancel',
          effective_at: 'next_billing_period',
        },
      }),
    })

    if (!paddleResponse.ok) {
      const errText = await paddleResponse.text()
      throw new Error(`Paddle API responded with status ${paddleResponse.status}: ${errText}`)
    }

    const paddleData = await paddleResponse.json()
    console.log(`[Cancel] Paddle API succeeded:`, paddleData)

    const { error: dbError } = await supabaseAdmin
      .from('user_profiles')
      .update({ plan_status: 'cancelling' })
      .eq('id', user.id)
      .eq('paddle_subscription_id', subscription_id)

    if (dbError) {
      console.error(`[Cancel] DB Update error: ${dbError.message}`)
      throw new Error(`Failed to update user profile in database: ${dbError.message}`)
    }

    return jsonResponse({
      success: true,
      message: 'Subscription successfully scheduled for cancellation.',
      data: paddleData,
    })
  } catch (error) {
    console.error('[Cancel] Error processing subscription cancellation:', error)
    return jsonResponse({ success: false, error: (error as Error).message }, 400)
  }
})
