/**
 * Edge Function: admin-users
 * إدارة حسابات الموظفين بأمان عبر مفتاح الخدمة (لا يُكشف للمتصفح).
 * يتحقق أن المُستدعي مسجّل دخول ودوره 'admin' قبل تنفيذ أي إجراء.
 *
 * Setup:
 *   (SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY مضبوطان تلقائياً في بيئة الدالة)
 *   supabase functions deploy admin-users
 *
 * Body: { action: 'create'|'set_password'|'delete', ... }
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  // 1) التحقق من هوية المُستدعي عبر التوكن
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return json({ error: 'غير مصرّح: لا يوجد توكن' }, 401)

  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user) return json({ error: 'جلسة غير صالحة' }, 401)

  // 2) التحقق أن المُستدعي مدير
  const { data: profile } = await admin
    .from('profiles').select('role').eq('id', userData.user.id).single()
  if (profile?.role !== 'admin') return json({ error: 'هذا الإجراء يتطلب صلاحية مدير' }, 403)

  // 3) تنفيذ الإجراء
  let body: any
  try { body = await req.json() } catch { return json({ error: 'طلب غير صالح' }, 400) }
  const { action } = body || {}

  try {
    if (action === 'create') {
      const { email, password, full_name, role, phone, department, unit_name } = body
      if (!email || !password || !full_name) return json({ error: 'حقول مطلوبة ناقصة' }, 400)
      if (String(password).length < 6) return json({ error: 'كلمة المرور قصيرة' }, 400)
      const safeRole = ['admin','staff','unit_head','association'].includes(role) ? role : 'staff'
      const validDepts = ['legal','rural_dev','admin_affairs','relief','follow_up']
      const safeDept = safeRole === 'staff' && validDepts.includes(department) ? department : null
      const safeUnit = safeRole === 'unit_head' && unit_name ? String(unit_name) : null

      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { full_name },
      })
      if (cErr) return json({ error: cErr.message }, 400)

      const { error: pErr } = await admin.from('profiles').upsert({
        id: created.user.id, full_name, role: safeRole, phone: phone || null,
        department: safeDept, unit_name: safeUnit, must_change_password: true,
      })
      if (pErr) return json({ error: pErr.message }, 400)
      return json({ ok: true, id: created.user.id })
    }

    if (action === 'set_password') {
      const { user_id, password } = body
      if (!user_id || !password || String(password).length < 6) return json({ error: 'بيانات غير صالحة' }, 400)
      const { error: uErr } = await admin.auth.admin.updateUserById(user_id, { password })
      if (uErr) return json({ error: uErr.message }, 400)
      await admin.from('profiles').update({ must_change_password: false }).eq('id', user_id)
      return json({ ok: true })
    }

    if (action === 'delete') {
      const { user_id } = body
      if (!user_id) return json({ error: 'المعرّف مطلوب' }, 400)
      if (user_id === userData.user.id) return json({ error: 'لا يمكنك حذف حسابك' }, 400)
      const { error: dErr } = await admin.auth.admin.deleteUser(user_id)
      if (dErr) return json({ error: dErr.message }, 400)
      return json({ ok: true })
    }

    return json({ error: 'إجراء غير معروف' }, 400)
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
