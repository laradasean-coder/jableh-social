import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { Activity, Database, Clock, CheckCircle, AlertCircle, RefreshCw, Wifi } from 'lucide-react'

function ping(url) {
  const start = Date.now()
  return fetch(url, { method:'HEAD', cache:'no-store' })
    .then(() => Date.now() - start)
    .catch(() => null)
}

export default function StatusPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [checks, setChecks] = useState({})
  const [loading, setLoading] = useState(false)
  const [lastCheck, setLastCheck] = useState(null)
  const [dbSize, setDbSize] = useState(null)

  useEffect(() => {
    if (profile && profile.role !== 'admin') navigate('/')
    if (profile?.role === 'admin') runChecks()
  }, [profile])

  const runChecks = async () => {
    setLoading(true)
    const results = {}

    // 1. Supabase DB
    try {
      const start = Date.now()
      const { error } = await supabase.from('profiles').select('id').limit(1)
      results.db = { ok: !error, ms: Date.now() - start, label: 'قاعدة البيانات' }
    } catch { results.db = { ok: false, ms: null, label: 'قاعدة البيانات' } }

    // 2. Auth
    try {
      const start = Date.now()
      const { error } = await supabase.auth.getSession()
      results.auth = { ok: !error, ms: Date.now() - start, label: 'خدمة المصادقة' }
    } catch { results.auth = { ok: false, ms: null, label: 'خدمة المصادقة' } }

    // 3. Beneficiaries count
    try {
      const { count } = await supabase.from('beneficiaries').select('id', { count: 'exact', head: true })
      results.bens = { ok: true, count, label: 'إجمالي المستفيدين' }
    } catch { results.bens = { ok: false, label: 'إجمالي المستفيدين' } }

    // 4. Audit log count
    try {
      const { count } = await supabase.from('audit_logs').select('id', { count: 'exact', head: true })
      results.logs = { ok: true, count, label: 'سجلات العمليات' }
    } catch { results.logs = { ok: false, label: 'سجلات العمليات' } }

    // 5. Security events (last 24h)
    try {
      const since = new Date(Date.now() - 86400000).toISOString()
      const { count } = await supabase.from('security_events')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since)
      results.security = { ok: true, count, label: 'أحداث أمنية (24س)' }
    } catch { results.security = { ok: false, label: 'أحداث أمنية (24س)' } }

    // 6. Online users (last 15min)
    try {
      const since = new Date(Date.now() - 900000).toISOString()
      const { count } = await supabase.from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('last_login', since)
      results.online = { ok: true, count, label: 'مستخدمون نشطون (15د)' }
    } catch { results.online = { ok: false, label: 'مستخدمون نشطون' } }

    setChecks(results)
    setLastCheck(new Date())
    setLoading(false)
  }

  const allOk = Object.values(checks).every(c => c.ok)

  return (
    <div className="space-y-6 max-w-3xl" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Activity size={22} className="text-blue-600"/>
            مراقبة صحة النظام
          </h1>
          {lastCheck && (
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <Clock size={11}/>
              آخر فحص: {lastCheck.toLocaleTimeString('ar')}
            </p>
          )}
        </div>
        <button onClick={runChecks} disabled={loading}
          className="flex items-center gap-2 btn-secondary text-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>
          تحديث
        </button>
      </div>

      {/* Overall status */}
      {Object.keys(checks).length > 0 && (
        <div className={`rounded-2xl p-5 flex items-center gap-4 ${allOk ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {allOk
            ? <CheckCircle size={32} className="text-green-500 shrink-0"/>
            : <AlertCircle size={32} className="text-red-500 shrink-0"/>
          }
          <div>
            <p className={`font-bold text-lg ${allOk ? 'text-green-700' : 'text-red-700'}`}>
              {allOk ? 'جميع الخدمات تعمل بشكل طبيعي' : 'يوجد مشكلة في بعض الخدمات'}
            </p>
            <p className={`text-sm mt-0.5 ${allOk ? 'text-green-600' : 'text-red-600'}`}>
              {Object.values(checks).filter(c => c.ok).length} / {Object.values(checks).length} خدمات سليمة
            </p>
          </div>
        </div>
      )}

      {/* Checks grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {Object.entries(checks).map(([key, c]) => (
          <div key={key} className="card flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${c.ok ? 'bg-green-50' : 'bg-red-50'}`}>
              {c.ok
                ? <CheckCircle size={20} className="text-green-500"/>
                : <AlertCircle size={20} className="text-red-500"/>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm">{c.label}</p>
              <p className={`text-xs mt-0.5 ${c.ok ? 'text-green-600' : 'text-red-500'}`}>
                {c.ok ? 'يعمل' : 'خطأ'}
                {c.ms != null && ` — ${c.ms}ms`}
                {c.count != null && ` — ${c.count} سجل`}
              </p>
            </div>
            <div className={`w-2.5 h-2.5 rounded-full ${c.ok ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}/>
          </div>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <RefreshCw size={24} className="animate-spin text-blue-500"/>
        </div>
      )}
    </div>
  )
}
