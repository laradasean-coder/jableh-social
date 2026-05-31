/**
 * Edge Function: ai-assistant
 * مساعد ذكي حقيقي مدعوم بـ Groq (واجهة متوافقة مع OpenAI)
 *
 * Setup:
 *   supabase secrets set GROQ_API_KEY=gsk_xxxxx
 *   (اختياري) supabase secrets set GROQ_MODEL=llama-3.3-70b-versatile
 *   supabase functions deploy ai-assistant
 *
 * يحلّل سؤال المستخدم بالعربية، يستعلم من قاعدة البيانات،
 * ثم يصيغ إجابة طبيعية ذكية.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GROQ_KEY    = Deno.env.get('GROQ_API_KEY')
const GROQ_MODEL  = Deno.env.get('GROQ_MODEL') || 'llama-3.3-70b-versatile'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// أدوات يمكن للمساعد استخدامها للوصول للبيانات
async function gatherContext(supabase: any) {
  const [bens, relief, assocs] = await Promise.all([
    supabase.from('beneficiaries').select('category,status,district,gender'),
    supabase.from('relief_requests').select('status,category,created_at'),
    supabase.from('associations').select('name,is_active'),
  ])

  const b = bens.data || []
  const r = relief.data || []
  const a = assocs.data || []

  // إحصائيات مجمّعة (بدون بيانات شخصية حساسة)
  const catCount: Record<string, number> = {}
  const distCount: Record<string, number> = {}
  b.forEach((x: any) => {
    catCount[x.category] = (catCount[x.category] || 0) + 1
    if (x.district) distCount[x.district] = (distCount[x.district] || 0) + 1
  })

  return {
    total_beneficiaries: b.length,
    by_category: catCount,
    by_district: distCount,
    active_beneficiaries: b.filter((x: any) => x.status === 'active').length,
    pending_beneficiaries: b.filter((x: any) => x.status === 'pending').length,
    total_relief: r.length,
    pending_relief: r.filter((x: any) => x.status === 'pending').length,
    transferred_relief: r.filter((x: any) => x.status === 'transferred').length,
    active_associations: a.filter((x: any) => x.is_active).length,
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { message } = await req.json()
    if (!message) return new Response(JSON.stringify({ error: 'message required' }), { status: 400, headers: corsHeaders })

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
    const context = await gatherContext(supabase)

    if (!GROQ_KEY) {
      return new Response(JSON.stringify({
        reply: 'المساعد الذكي غير مُفعّل بعد. يرجى ضبط مفتاح GROQ_API_KEY من إعدادات الخادم.',
        context
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const CAT_AR: Record<string,string> = {
      disabled:'ذوو الإعاقة', widow:'الأرامل', orphan:'الأيتام', divorced:'المطلقات', poor_family:'الأسر الفقيرة'
    }
    const catText = Object.entries(context.by_category).map(([k,v]) => `${CAT_AR[k]||k}: ${v}`).join('، ')
    const distText = Object.entries(context.by_district).map(([k,v]) => `${k}: ${v}`).join('، ')

    const systemPrompt = `أنت مساعد ذكي لدائرة جبلة للشؤون الاجتماعية والعمل في سوريا. تجيب بالعربية الفصحى باختصار ودقة.
لديك البيانات الإحصائية التالية (محدّثة الآن):
- إجمالي المستفيدين: ${context.total_beneficiaries}
- النشطون: ${context.active_beneficiaries} | المعلّقون: ${context.pending_beneficiaries}
- التوزيع حسب الفئة: ${catText}
- التوزيع حسب المنطقة: ${distText}
- طلبات الإغاثة: ${context.total_relief} (معلّقة: ${context.pending_relief}، تمت: ${context.transferred_relief})
- الجمعيات النشطة: ${context.active_associations}
أجب فقط بناءً على هذه البيانات. إن سُئلت عن شيء خارجها، وضّح أنك تحتاج بيانات إضافية. لا تخترع أرقاماً.`

    const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.3,
        max_tokens: 500,
      })
    })

    const aiData = await aiRes.json()
    const reply = aiData.choices?.[0]?.message?.content || 'تعذّر الحصول على إجابة.'

    return new Response(JSON.stringify({ reply, context }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders })
  }
})
