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
    const payload = await req.json()
    const eventType = payload.event_type || payload.alert_name

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }

    // Extract customer email
    const customerEmail = 
      payload.data?.customer?.email || 
      payload.data?.customer_details?.email || 
      payload.data?.email ||
      payload.email

    if (!customerEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'No customer email found in webhook payload' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const sendEmail = async (subject: string, htmlContent: string) => {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: 'ReachDesk CRM <noreply@mail.reachdesk.esemdot.com>',
          reply_to: 'support@esemdot.com',
          to: [customerEmail],
          subject,
          html: htmlContent
        })
      })

      if (!emailResponse.ok) {
        const errText = await emailResponse.text()
        console.error(`[Webhook] Resend API failed: ${errText}`)
      } else {
        console.log(`[Webhook] Branded email "${subject}" sent to ${customerEmail}`)
      }
    }

    // Handle webhook events
    if (eventType === 'transaction.completed' || eventType === 'subscription.activated') {
      // Fetch user profile to see if it is already active (to differentiate Welcome vs. Renewal)
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('plan, plan_status')
        .eq('email', customerEmail)
        .maybeSingle()

      // Extract Paddle IDs
      const paddleCustomerId = payload.data?.customer?.id || payload.data?.customer_id
      const paddleSubscriptionId = payload.data?.subscription_id || payload.data?.items?.[0]?.subscription_id

      // 1. Update user profile to active Starter plan
      const updateData: any = {
        plan: 'starter',
        plan_status: 'active',
        trial_ends_at: null
      }

      if (paddleCustomerId) {
        updateData.paddle_customer_id = paddleCustomerId
      }
      if (paddleSubscriptionId) {
        updateData.paddle_subscription_id = paddleSubscriptionId
      }

      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update(updateData)
        .eq('email', customerEmail)

      if (updateError) {
        throw new Error(`Failed to update user profile: ${updateError.message}`)
      }

      const isFirstPayment = !profile || profile.plan_status !== 'active'

      if (isFirstPayment) {
        // Welcome Email
        const welcomeHtml = `
          <div style="background-color: #0D1117; color: #FFFFFF; font-family: sans-serif; padding: 30px; border-radius: 3px; max-width: 600px; margin: 0 auto; border: 1px solid #21262D;">
            <div style="text-align: center; margin-bottom: 20px;">
              <span style="font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.08em; font-size: 24px; color: #FFFFFF; font-weight: bold;">ReachDesk</span>
            </div>
            <h2 style="color: #5B8FB9; border-bottom: 1px solid #21262D; padding-bottom: 10px;">Welcome to ReachDesk CRM!</h2>
            <p>Your Starter plan is now active. You have successfully upgraded your account and can now access all advanced CRM tools, email templates, and configurations.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://reachdesk.esemdot.com" style="background-color: #5B8FB9; color: #0D1117; padding: 12px 24px; text-decoration: none; border-radius: 3px; font-weight: bold; display: inline-block;">Log In to Your Workspace</a>
            </div>
            <p>If you have any questions or need support getting started, feel free to reply to this email or contact us at <a href="mailto:support@esemdot.com" style="color: #5B8FB9; text-decoration: none;">support@esemdot.com</a>.</p>
            <p style="color: #8B949E; font-size: 0.8rem; border-top: 1px solid #21262D; padding-top: 15px; margin-top: 30px;">
              This is an automated notification from ReachDesk CRM.
            </p>
          </div>
        `
        await sendEmail("You're in — Welcome to ReachDesk CRM!", welcomeHtml)
      } else {
        // Receipt Email (recurring renewal)
        const planName = payload.data?.items?.[0]?.price?.product?.name || 'Starter Plan'
        const grandTotal = payload.data?.details?.totals?.grand_total || payload.data?.totals?.grand_total || '0.95'
        const formattedTotal = `$${grandTotal}`
        const paymentDate = payload.data?.occurred_at 
          ? new Date(payload.data.occurred_at).toLocaleDateString()
          : new Date().toLocaleDateString()
        const nextBillingDate = payload.data?.next_billed_at
          ? new Date(payload.data.next_billed_at).toLocaleDateString()
          : 'Monthly renewal'

        const receiptHtml = `
          <div style="background-color: #0D1117; color: #FFFFFF; font-family: sans-serif; padding: 30px; border-radius: 3px; max-width: 600px; margin: 0 auto; border: 1px solid #21262D;">
            <div style="text-align: center; margin-bottom: 20px;">
              <span style="font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.08em; font-size: 24px; color: #FFFFFF; font-weight: bold;">ReachDesk</span>
            </div>
            <h2 style="color: #5B8FB9; border-bottom: 1px solid #21262D; padding-bottom: 10px;">Payment Confirmed</h2>
            <p>This is a receipt for your recent renewal payment for your ReachDesk subscription.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; color: #FFFFFF;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #21262D; color: #8B949E; width: 150px;">Subscription Plan:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #21262D; font-weight: bold;">${planName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #21262D; color: #8B949E;">Amount Charged:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #21262D; font-weight: bold; color: #5B8FB9;">${formattedTotal}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #21262D; color: #8B949E;">Payment Date:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #21262D;">${paymentDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #21262D; color: #8B949E;">Next Billing Date:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #21262D;">${nextBillingDate}</td>
              </tr>
            </table>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://reachdesk.esemdot.com/settings" style="background-color: #5B8FB9; color: #0D1117; padding: 12px 24px; text-decoration: none; border-radius: 3px; font-weight: bold; display: inline-block;">Manage Subscription</a>
            </div>
            <p>Thank you for choosing ReachDesk CRM. If you need any assistance, reach out at <a href="mailto:support@esemdot.com" style="color: #5B8FB9; text-decoration: none;">support@esemdot.com</a>.</p>
            <p style="color: #8B949E; font-size: 0.8rem; border-top: 1px solid #21262D; padding-top: 15px; margin-top: 30px;">
              This is an automated notification from ReachDesk CRM.
            </p>
          </div>
        `
        await sendEmail("ReachDesk CRM — Payment Confirmed", receiptHtml)
      }
    } else if (eventType === 'subscription.canceled') {
      // 1. Update user profile to trial inactive
      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update({
          plan: 'trial',
          plan_status: 'inactive'
        })
        .eq('email', customerEmail)

      if (updateError) {
        throw new Error(`Failed to update user profile: ${updateError.message}`)
      }

      // Cancellation Email
      const cancelHtml = `
        <div style="background-color: #0D1117; color: #FFFFFF; font-family: sans-serif; padding: 30px; border-radius: 3px; max-width: 600px; margin: 0 auto; border: 1px solid #21262D;">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.08em; font-size: 24px; color: #FFFFFF; font-weight: bold;">ReachDesk</span>
          </div>
          <h2 style="color: #E05252; border-bottom: 1px solid #21262D; padding-bottom: 10px;">Subscription Cancelled</h2>
          <p>Your subscription to ReachDesk CRM has been cancelled. Your account has been reverted to the trial plan, and paid features are now inactive.</p>
          <p>We're sad to see you go! If this was a mistake or if you decide to come back, you can resubscribe at any time by clicking the button below.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://reachdesk.esemdot.com/upgrade" style="background-color: #5B8FB9; color: #0D1117; padding: 12px 24px; text-decoration: none; border-radius: 3px; font-weight: bold; display: inline-block;">Resubscribe Now</a>
          </div>
          <p>If you have any feedback on how we can improve ReachDesk CRM for you, please let us know by replying to this email.</p>
          <p style="color: #8B949E; font-size: 0.8rem; border-top: 1px solid #21262D; padding-top: 15px; margin-top: 30px;">
            This is an automated notification from ReachDesk CRM.
          </p>
        </div>
      `
      await sendEmail("Your ReachDesk CRM subscription has been cancelled", cancelHtml)
    } else if (eventType === 'transaction.payment_failed') {
      // Payment Failed Email
      const failedHtml = `
        <div style="background-color: #0D1117; color: #FFFFFF; font-family: sans-serif; padding: 30px; border-radius: 3px; max-width: 600px; margin: 0 auto; border: 1px solid #21262D;">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.08em; font-size: 24px; color: #FFFFFF; font-weight: bold;">ReachDesk</span>
          </div>
          <h2 style="color: #E8A838; border-bottom: 1px solid #21262D; padding-bottom: 10px;">Payment Failed</h2>
          <p>We were unable to process the recent renewal payment for your ReachDesk subscription. Please update your payment details to prevent any service interruptions.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://reachdesk.esemdot.com/upgrade" style="background-color: #5B8FB9; color: #0D1117; padding: 12px 24px; text-decoration: none; border-radius: 3px; font-weight: bold; display: inline-block;">Update Payment Details</a>
          </div>
          <p>If you need assistance, please contact our support team at <a href="mailto:support@esemdot.com" style="color: #5B8FB9; text-decoration: none;">support@esemdot.com</a>.</p>
          <p style="color: #8B949E; font-size: 0.8rem; border-top: 1px solid #21262D; padding-top: 15px; margin-top: 30px;">
            This is an automated notification from ReachDesk CRM.
          </p>
        </div>
      `
      await sendEmail("Action needed — ReachDesk CRM payment failed", failedHtml)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('[Webhook] Error processing Paddle Webhook:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
