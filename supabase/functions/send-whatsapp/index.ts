/**
 * Edge Function: send-whatsapp
 * يستخدم Meta WhatsApp Business API مباشرة (بدون Twilio)
 *
 * Setup:
 *   supabase secrets set WA_API_TOKEN=EAA...
 *   supabase secrets set WA_PHONE_ID=123456789
 *
 * للحصول على التوكن:
 *   1. اذهب إلى developers.facebook.com
 *   2. أنشئ تطبيق WhatsApp Business
 *   3. احصل على Phone Number ID و Access Token
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const TOKEN    = Deno.env.get('WA_API_TOKEN')
  const PHONE_ID = Deno.env.get('WA_PHONE_ID')

  try {
    const { phone, message } = await req.json()
    if (!TOKEN || !PHONE_ID) {
      return new Response(JSON.stringify({ error: 'WhatsApp not configured. Set WA_API_TOKEN and WA_PHONE_ID.' }), { status: 200 })
    }

    const to = phone.startsWith('+') ? phone.replace('+','') : `963${phone.replace(/^0/,'')}`
    const res = await fetch(`https://graph.facebook.com/v18.0/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product:'whatsapp', to, type:'text', text:{ body:message } })
    })
    const data = await res.json()
    return new Response(JSON.stringify({ success: res.ok, data }), { headers: {'Content-Type':'application/json'} })
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
})
