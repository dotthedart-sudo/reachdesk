import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DEFAULT_FROM_EMAIL = 'ReachDesk CRM <noreply@mail.app.reachdeskcrm.com>';
const ONBOARDING_FROM_EMAIL = 'ReachDesk <onboarding@mail.app.reachdeskcrm.com>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    const jwtToken = authHeader.replace(/^Bearer\s+/i, '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwtToken)
    if (authError || !user) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401)
    }

    const { fullName, email, mobileNumber, requestedPlan, billingCycle, paidAmount, receiptPath } = await req.json()

    // Only allow the authenticated user to submit for their own email
    if (email && email.toLowerCase() !== (user.email || '').toLowerCase()) {
      return jsonResponse({ success: false, error: 'Forbidden: email mismatch' }, 403)
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    let signedUrl = '#'
    if (receiptPath) {
      const { data: signedData, error: signedError } = await supabaseAdmin.storage
        .from('payment-receipts')
        .createSignedUrl(receiptPath, 604800)

      if (signedError) {
        console.warn(`Failed to generate signed URL: ${signedError.message}`)
      }
      signedUrl = signedData?.signedUrl || '#'
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }

    // Resolve admin recipients: ADMIN_NOTIFY_EMAIL secret, else role=admin profiles
    let recipients: string[] = []
    const adminNotifyEmail = Deno.env.get('ADMIN_NOTIFY_EMAIL')
    if (adminNotifyEmail) {
      recipients = [adminNotifyEmail]
    } else {
      const { data: admins } = await supabaseAdmin
        .from('user_profiles')
        .select('email')
        .eq('role', 'admin')
      recipients = (admins || []).map((a: { email: string }) => a.email).filter(Boolean)
    }

    if (recipients.length === 0) {
      throw new Error('No admin recipients configured')
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: ONBOARDING_FROM_EMAIL,
        to: recipients,
        subject: `New Upgrade Request — ${fullName} (${requestedPlan})`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
            <h2 style="color: #3E7BB8; border-bottom: 2px solid #3E7BB8; padding-bottom: 8px;">New Plan Upgrade / Renewal Request</h2>
            <p>A new payment verification request has been submitted by a customer. Please review the details below:</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 150px;">Full Name:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${fullName}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Mobile:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${mobileNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Plan:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; color: #3E7BB8;">${requestedPlan.toUpperCase()}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Billing Cycle:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${billingCycle.toUpperCase()}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Paid Amount:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; color: #059669;">Rs ${paidAmount.toLocaleString()}</td>
              </tr>
            </table>
            
            <div style="margin-top: 25px; text-align: center;">
              <a href="${signedUrl}" target="_blank" rel="noopener noreferrer" style="background-color: #3E7BB8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                View Payment Receipt (Valid 7 Days)
              </a>
            </div>
            
            <p style="font-size: 0.8rem; color: #888; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
              This email notification is auto-generated by the ReachDesk Payment Flow. The attached receipt link will expire in 7 days.
            </p>
          </div>
        `,
      }),
    })

    if (!emailResponse.ok) {
      const errText = await emailResponse.text()
      throw new Error(`Resend API failed: ${errText}`)
    }

    const resData = await emailResponse.json()

    return jsonResponse({ success: true, message: 'Email sent successfully', data: resData })
  } catch (error) {
    return jsonResponse({ success: false, error: (error as Error).message }, 400)
  }
})
