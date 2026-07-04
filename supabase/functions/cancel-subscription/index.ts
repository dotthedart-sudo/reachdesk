import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { subscription_id } = await req.json()

    if (!subscription_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing subscription_id in request body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (typeof subscription_id === 'string' && subscription_id.startsWith('sub_test')) {
      console.log(`[Cancel] Test mode bypass for subscription_id: ${subscription_id}`);
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

      const { error: dbError } = await supabaseAdmin
        .from('user_profiles')
        .update({ plan_status: 'cancelling' })
        .eq('paddle_subscription_id', subscription_id)

      if (dbError) {
        console.error(`[Cancel] DB Update error: ${dbError.message}`)
        throw new Error(`Failed to update user profile in database: ${dbError.message}`)
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Subscription successfully scheduled for cancellation (Test Mode).' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const paddleApiKey = Deno.env.get('PADDLE_API_KEY')
    if (!paddleApiKey) {
      throw new Error('PADDLE_API_KEY environment variable is not set')
    }

    // Call Paddle API to schedule cancellation at the end of the billing period
    const paddleUrl = `https://api.paddle.com/subscriptions/${subscription_id}`
    console.log(`[Cancel] Calling Paddle API for subscription: ${subscription_id}`)
    
    const paddleResponse = await fetch(paddleUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${paddleApiKey}`
      },
      body: JSON.stringify({
        scheduled_change: {
          action: 'cancel',
          effective_at: 'next_billing_period'
        }
      })
    })

    if (!paddleResponse.ok) {
      const errText = await paddleResponse.text()
      throw new Error(`Paddle API responded with status ${paddleResponse.status}: ${errText}`)
    }

    const paddleData = await paddleResponse.json()
    console.log(`[Cancel] Paddle API succeeded:`, paddleData)

    // Update database
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    const { error: dbError } = await supabaseAdmin
      .from('user_profiles')
      .update({ plan_status: 'cancelling' })
      .eq('paddle_subscription_id', subscription_id)

    if (dbError) {
      console.error(`[Cancel] DB Update error: ${dbError.message}`)
      throw new Error(`Failed to update user profile in database: ${dbError.message}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Subscription successfully scheduled for cancellation.', data: paddleData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('[Cancel] Error processing subscription cancellation:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
