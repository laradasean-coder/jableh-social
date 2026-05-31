/**
 * Edge Function: monthly-report
 * Schedule via Supabase Cron: "0 8 1 * *" (1st of each month at 8am)
 *
 * Set secrets:
 *   supabase secrets set RESEND_API_KEY=re_xxx
 *   supabase secrets set REPORT_EMAIL=admin@jabla.gov.sy
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: stats } = await supabase.from('analytics_summary').select('*').single()
  const { count: reliefCount } = await supabase.from('relief_requests')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(new Date().setDate(1)).toISOString())

  const month = new Date().toLocaleDateString('ar', { month: 'long', year: 'numeric' })
  const html = `
    <div dir="rtl" style="font-family:Arial;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1d4ed8">التقرير الشهري — ${month}</h2>
      <p>دائرة جبلة للشؤون الاجتماعية والعمل</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <tr style="background:#eff6ff"><td style="padding:10px;border:1px solid #dbeafe">إجمالي المستفيدين</td><td style="padding:10px;border:1px solid #dbeafe;font-weight:bold">${stats?.active_count || 0}</td></tr>
        <tr><td style="padding:10px;border:1px solid #dbeafe">مسجّلون هذا الشهر</td><td style="padding:10px;border:1px solid #dbeafe;font-weight:bold">${stats?.this_month || 0}</td></tr>
        <tr style="background:#eff6ff"><td style="padding:10px;border:1px solid #dbeafe">طلبات إغاثة جديدة</td><td style="padding:10px;border:1px solid #dbeafe;font-weight:bold">${reliefCount || 0}</td></tr>
      </table>
    </div>`

  const RESEND_KEY = Deno.env.get('RESEND_API_KEY')
  const TO_EMAIL   = Deno.env.get('REPORT_EMAIL') || 'admin@jabla.gov.sy'

  if (RESEND_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'reports@jabla.gov.sy', to: TO_EMAIL,
        subject: `التقرير الشهري — ${month}`, html })
    })
  }

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
})
