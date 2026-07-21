import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
// ⚠️  SYNC WARNING: STARTER_MONTHLY_USD is mirrored in src/components/Paywalls.jsx
//     (BILLING.monthly.starter.usdTotal). Keep both files in sync when prices change.
import { STARTER_MONTHLY_USD, getPlanFromPriceId } from '../_shared/prices.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function verifySignature(
  rawBody: string,
  signatureHeader: string,
  secretKey: string
): Promise<boolean> {
  const parts = signatureHeader.split(';');
  let ts = '';
  let h1 = '';
  for (const part of parts) {
    const [key, val] = part.split('=');
    if (key === 'ts') ts = val;
    if (key === 'h1') h1 = val;
  }

  if (!ts || !h1) {
    return false;
  }

  const payload = `${ts}:${rawBody}`;
  const encoder = new TextEncoder();
  
  const keyBuf = encoder.encode(secretKey);
  const dataBuf = encoder.encode(payload);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuf,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuf = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    dataBuf
  );

  const hashArray = Array.from(new Uint8Array(signatureBuf));
  const expectedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  if (expectedHash.length !== h1.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < expectedHash.length; i++) {
    result |= expectedHash.charCodeAt(i) ^ h1.charCodeAt(i);
  }
  return result === 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const rawBody = await req.text()
    const signatureHeader = req.headers.get('Paddle-Signature')
    const secretKey = Deno.env.get('PADDLE_WEBHOOK_SECRET')

    if (!signatureHeader || !secretKey) {
      console.error('[Webhook] Missing Paddle-Signature header or PADDLE_WEBHOOK_SECRET secret')
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const isValid = await verifySignature(rawBody, signatureHeader, secretKey)
    if (!isValid) {
      console.error('[Webhook] Invalid signature check')
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid signature' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const payload = JSON.parse(rawBody)
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

    const getFormattedAmount = (amount: any, currencyCode: string = 'USD') => {
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount)) return `$${amount}`;
      
      if (currencyCode === 'PKR') {
        return `Rs ${numericAmount.toLocaleString()}`;
      }
      if (currencyCode === 'BDT') {
        return `৳${numericAmount.toLocaleString()}`;
      }
      return `$${numericAmount.toFixed(2)}`;
    };

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

      // Extract Paddle IDs & item details
      const paddleCustomerId = payload.data?.customer?.id || payload.data?.customer_id
      const paddleSubscriptionId = payload.data?.subscription_id || payload.data?.items?.[0]?.subscription_id
      const priceId = payload.data?.items?.[0]?.price_id || payload.data?.items?.[0]?.price?.id
      const rawProductName = payload.data?.items?.[0]?.price?.product?.name || ''

      // Dynamically resolve plan from single source of truth (prices.ts)
      let resolvedPlan = getPlanFromPriceId(priceId)
      if (!resolvedPlan) {
        // Fallback: check product name if priceId was not matched
        const nameLower = rawProductName.toLowerCase()
        if (nameLower.includes('pro')) resolvedPlan = 'pro'
        else if (nameLower.includes('teams') || nameLower.includes('team')) resolvedPlan = 'teams'
        else if (nameLower.includes('starter')) resolvedPlan = 'starter'
        else {
          console.error('[Webhook] UNKNOWN price ID or product name received:', { priceId, rawProductName })
          resolvedPlan = 'starter' // Safe fallback for unrecognized products
        }
      }

      // 1. Update user profile to active plan
      const updateData: any = {
        plan: resolvedPlan,
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
      const rawProductName = payload.data?.items?.[0]?.price?.product?.name || 'Starter Plan'
      const planName = rawProductName.toLowerCase().endsWith('plan') ? rawProductName : `${rawProductName} Plan`

      if (isFirstPayment) {
        // Welcome Email
        const welcomeHtml = `
          <div style="background-color: #0D1117; color: #FFFFFF; font-family: sans-serif; padding: 30px; border-radius: 3px; max-width: 600px; margin: 0 auto; border: 1px solid #21262D;">
            <div style="text-align: center; margin-bottom: 20px;">
              <span style="font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.08em; font-size: 24px; color: #FFFFFF; font-weight: bold;">ReachDesk</span>
            </div>
            <h2 style="color: #5B8FB9; border-bottom: 1px solid #21262D; padding-bottom: 10px;">Welcome to ReachDesk CRM!</h2>
            <p>Your ${planName} is now active. You have successfully upgraded your account and can now access all advanced CRM tools, email templates, and configurations.</p>
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
        const grandTotal = payload.data?.details?.totals?.grand_total || payload.data?.totals?.grand_total || STARTER_MONTHLY_USD
        const currencyCode = payload.data?.currency_code || payload.data?.next_transaction?.currency_code || payload.data?.items?.[0]?.price?.unit_price?.currency_code || 'USD'
        const formattedTotal = getFormattedAmount(grandTotal, currencyCode)
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
    } else if (eventType === 'subscription.updated') {
      const nextBilledAtStr = payload.data?.next_billed_at
      if (nextBilledAtStr) {
        const nextBilledAt = new Date(nextBilledAtStr)
        const now = new Date()
        const diffMs = nextBilledAt.getTime() - now.getTime()
        const diffDays = diffMs / (1000 * 60 * 60 * 24)

        if (diffDays > 0 && diffDays <= 7) {
          const dateStr = nextBilledAt.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })

          const rawProductName = payload.data?.items?.[0]?.price?.product?.name 
            || payload.data?.subscription?.items?.[0]?.price?.product?.name 
            || 'Starter Plan'
          const planName = rawProductName.toLowerCase().endsWith('plan') ? rawProductName : `${rawProductName} Plan`

          const nextBilledAmount = payload.data?.next_transaction?.totals?.grand_total 
            || payload.data?.recurring_transaction_details?.totals?.grand_total 
            || payload.data?.items?.[0]?.price?.unit_price?.amount 
            || STARTER_MONTHLY_USD

          const currencyCode = payload.data?.currency_code 
            || payload.data?.next_transaction?.currency_code 
            || payload.data?.items?.[0]?.price?.unit_price?.currency_code 
            || 'USD'

          const formattedAmount = getFormattedAmount(nextBilledAmount, currencyCode)

          const reminderHtml = `
            <div style="background-color: #FFFFFF; color: #1a1a1a; font-family: sans-serif; padding: 30px; border-radius: 3px; max-width: 600px; margin: 0 auto; border: 1px solid #E5E5E5;">
              <div style="text-align: center; margin-bottom: 20px;">
                <span style="font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.08em; font-size: 24px; color: #1a1a1a; font-weight: bold;">ReachDesk</span>
              </div>
              <h2 style="color: #5B8FB9; border-bottom: 1px solid #E5E5E5; padding-bottom: 10px; margin-top: 0;">Subscription Renewal</h2>
              <p>Your ${planName} renews in 7 days on ${dateStr}. Amount: ${formattedAmount}. No action needed to continue.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://reachdesk.esemdot.com/settings" style="background-color: #5B8FB9; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 3px; font-weight: bold; display: inline-block;">Manage Subscription</a>
              </div>
              <p>If you have any questions or wish to change your plan details, please reach out to us at <a href="mailto:support@esemdot.com" style="color: #5B8FB9; text-decoration: none;">support@esemdot.com</a>.</p>
              <p style="color: #666666; font-size: 0.8rem; border-top: 1px solid #E5E5E5; padding-top: 15px; margin-top: 30px;">
                This is an automated notification from ReachDesk CRM.
              </p>
            </div>
          `
          await sendEmail("Your ReachDesk CRM renewal is coming up", reminderHtml)
        }
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

      const endsAtStr = payload.data?.ends_at || payload.data?.current_billing_period?.ends_at
      const endDate = endsAtStr 
        ? new Date(endsAtStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })

      const rawProductName = payload.data?.items?.[0]?.price?.product?.name 
        || payload.data?.subscription?.items?.[0]?.price?.product?.name 
        || 'Starter Plan'
      const planName = rawProductName.toLowerCase().endsWith('plan') ? rawProductName : `${rawProductName} Plan`

      // Cancellation Email
      const cancelHtml = `
        <div style="background-color: #0D1117; color: #FFFFFF; font-family: sans-serif; padding: 30px; border-radius: 3px; max-width: 600px; margin: 0 auto; border: 1px solid #21262D;">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.08em; font-size: 24px; color: #FFFFFF; font-weight: bold;">ReachDesk</span>
          </div>
          <h2 style="color: #E05252; border-bottom: 1px solid #21262D; padding-bottom: 10px;">Subscription Cancelled</h2>
          <p>Your ${planName} will remain active until ${endDate}. After that, your data will be retained for 30 days before permanent deletion. You can resubscribe anytime to restore full access.</p>
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
