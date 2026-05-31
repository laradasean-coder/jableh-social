/**
 * Edge Function: send-sms
 * بديل Twilio — يدعم Unifonic وInfobip وSMS لبناني/سوري
 *
 * اختر مزوداً وفعّله:
 *
 * الخيار 1 — Unifonic (السعودية، الشام):
 *   supabase secrets set SMS_PROVIDER=unifonic
 *   supabase secrets set UNIFONIC_APP_SID=your_app_sid
 *   supabase secrets set UNIFONIC_SENDER_ID=JablaGov
 *
 * الخيار 2 — Infobip (عالمي، يدعم سوريا):
 *   supabase secrets set SMS_PROVIDER=infobip
 *   supabase secrets set INFOBIP_API_KEY=your_api_key
 *   supabase secrets set INFOBIP_BASE_URL=your_base_url.api.infobip.com
 *   supabase secrets set INFOBIP_SENDER=JablaGov
 *
 * الخيار 3 — WhatsApp Business API مباشرة (بدون Twilio):
 *   supabase secrets set SMS_PROVIDER=whatsapp
 *   supabase secrets set WA_API_TOKEN=your_token
 *   supabase secrets set WA_PHONE_ID=your_phone_id
 *
 * Deploy:
 *   supabase functions deploy send-sms
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PROVIDER     = Deno.env.get('SMS_PROVIDER') || 'unifonic'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface SMSRequest {
  phones: string[]
  message: string
  type?: 'sms' | 'whatsapp'
  log?: boolean
}

// ── Unifonic ───────────────────────────────────────────────────────────
async function sendUnifonic(phones: string[], message: string) {
  const APP_SID   = Deno.env.get('UNIFONIC_APP_SID')
  const SENDER    = Deno.env.get('UNIFONIC_SENDER_ID') || 'JablaGov'

  if (!APP_SID) return { success: false, error: 'Unifonic not configured' }

  const results = await Promise.all(phones.map(async phone => {
    const body = new URLSearchParams({
      AppSid: APP_SID,
      SenderID: SENDER,
      Body: message,
      Recipient: phone.startsWith('+') ? phone : `+963${phone.replace(/^0/, '')}`
    })
    const res = await fetch('https://el.cloud.unifonic.com/rest/SMS/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    })
    return res.json()
  }))
  return { success: true, results }
}

// ── Infobip ────────────────────────────────────────────────────────────
async function sendInfobip(phones: string[], message: string) {
  const API_KEY  = Deno.env.get('INFOBIP_API_KEY')
  const BASE_URL = Deno.env.get('INFOBIP_BASE_URL')
  const SENDER   = Deno.env.get('INFOBIP_SENDER') || 'JablaGov'

  if (!API_KEY || !BASE_URL) return { success: false, error: 'Infobip not configured' }

  const destinations = phones.map(phone => ({
    to: phone.startsWith('+') ? phone.replace('+', '') : `963${phone.replace(/^0/, '')}`
  }))

  const res = await fetch(`https://${BASE_URL}/sms/2/text/advanced`, {
    method: 'POST',
    headers: {
      'Authorization': `App ${API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      messages: [{ from: SENDER, destinations, text: message }]
    })
  })
  const data = await res.json()
  return { success: res.ok, data }
}

// ── WhatsApp Business API (Meta — بدون Twilio) ─────────────────────────
async function sendWhatsApp(phones: string[], message: string) {
  const TOKEN    = Deno.env.get('WA_API_TOKEN')
  const PHONE_ID = Deno.env.get('WA_PHONE_ID')

  if (!TOKEN || !PHONE_ID) return { success: false, error: 'WhatsApp not configured' }

  const results = await Promise.all(phones.map(async phone => {
    const to = phone.startsWith('+') ? phone.replace('+', '') : `963${phone.replace(/^0/, '')}`
    const res = await fetch(`https://graph.facebook.com/v18.0/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message }
      })
    })
    return res.json()
  }))
  return { success: true, results }
}

// ── Log to Supabase ─────────────────────────────────────────────────────
async function logNotification(phones: string[], message: string, status: string, error?: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  await supabase.from('notification_logs').insert(
    phones.map(phone => ({
      type: PROVIDER === 'whatsapp' ? 'whatsapp' : 'sms',
      recipient: phone,
      message,
      status,
      error: error || null,
      sent_at: new Date().toISOString()
    }))
  )
}

// ── Main handler ────────────────────────────────────────────────────────
serve(async (req) => {
  try {
    const { phones, message, log = true }: SMSRequest = await req.json()

    if (!phones?.length || !message) {
      return new Response(JSON.stringify({ error: 'phones and message required' }), { status: 400 })
    }

    let result: Record<string, unknown>

    switch (PROVIDER) {
      case 'unifonic':  result = await sendUnifonic(phones, message);  break
      case 'infobip':   result = await sendInfobip(phones, message);   break
      case 'whatsapp':  result = await sendWhatsApp(phones, message);  break
      default:
        result = { success: false, error: `Unknown provider: ${PROVIDER}` }
    }

    if (log) await logNotification(phones, message, result.success ? 'sent' : 'failed', result.error as string)

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
})
