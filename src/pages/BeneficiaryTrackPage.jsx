import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Search, CheckCircle, Clock, XCircle, RefreshCw, ArrowLeft } from 'lucide-react'

const STATUS_MAP = {
  pending:    { label: 'قيد المراجعة', color: 'yellow', icon: Clock, tip: 'طلبك وصلنا وهو قيد المراجعة من قِبل الموظف المختص.' },
  reviewed:   { label: 'تمت المراجعة', color: 'blue',   icon: CheckCircle, tip: 'تمت مراجعة طلبك. سيتم التواصل معك قريباً.' },
  transferred:{ label: 'تمت الموافقة', color: 'green',  icon: CheckCircle, tip: 'تمت الموافقة على طلبك وإحالته للجهة المختصة.' },
  rejected:   { label: 'مرفوض',        color: 'red',    icon: XCircle, tip: 'لم يتم قبول الطلب. يمكنك التواصل مع الدائرة لمعرفة السبب.' },
}

export default function BeneficiaryTrackPage() {
  const [national_id, setNationalId] = useState('')
  const [phone,       setPhone]      = useState('')
  const [result,      setResult]     = useState(null)
  const [searched,    setSearched]   = useState(false)
  const [loading,     setLoading]    = useState(false)

  const search = async () => {
    if (!national_id.trim() && !phone.trim()) return
    setLoading(true); setSearched(false); setResult(null)
    const { data } = await supabase
      .from('relief_requests')
      .select('id,full_name,status,category,created_at,situation_description')
      .or(national_id ? `national_id.eq.${national_id.trim()}` : `phone.eq.${phone.trim()}`)
      .order('created_at', { ascending: false })
      .limit(3)
    setResult(data || [])
    setSearched(true)
    setLoading(false)
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 py-8 px-4" dir="rtl">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Search size={28} className="text-blue-600"/>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">متابعة طلب الإغاثة</h1>
        <p className="text-gray-500 text-sm mt-2 leading-relaxed">
          أدخل رقمك الوطني أو رقم هاتفك لمعرفة حالة طلبك دون الحاجة لتسجيل الدخول
        </p>
      </div>

      <div className="card space-y-3">
        <div>
          <label className="label text-sm">الرقم الوطني</label>
          <input className="input w-full" placeholder="أدخل الرقم الوطني"
            value={national_id} onChange={e => setNationalId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}/>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200"/>
          <span className="text-xs text-gray-400">أو</span>
          <div className="flex-1 h-px bg-gray-200"/>
        </div>
        <div>
          <label className="label text-sm">رقم الهاتف المسجّل في الطلب</label>
          <input className="input w-full" placeholder="أدخل رقم الهاتف" dir="ltr"
            value={phone} onChange={e => setPhone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}/>
        </div>
        <button onClick={search} disabled={loading || (!national_id.trim() && !phone.trim())}
          className="w-full btn-primary flex items-center justify-center gap-2">
          {loading ? <><RefreshCw size={15} className="animate-spin"/>جاري البحث...</> : <><Search size={15}/>بحث عن طلبي</>}
        </button>
      </div>

      {searched && (
        <div className="space-y-3">
          {result?.length === 0 ? (
            <div className="card text-center py-8">
              <div className="text-4xl mb-3">🔍</div>
              <p className="font-semibold text-gray-700">لا توجد طلبات مسجّلة</p>
              <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                تأكد من صحة الرقم الوطني أو رقم الهاتف،<br/>أو توجّه لدائرة جبلة لتقديم طلب جديد
              </p>
            </div>
          ) : result.map(r => {
            const s = STATUS_MAP[r.status] || STATUS_MAP['pending']
            const Icon = s.icon
            return (
              <div key={r.id} className={`card border-r-4 border-r-${s.color}-400`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 bg-${s.color}-100 rounded-xl flex items-center justify-center shrink-0`}>
                    <Icon size={20} className={`text-${s.color}-600`}/>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="font-bold text-gray-800">{r.full_name}</p>
                      <span className={`badge bg-${s.color}-100 text-${s.color}-700 text-xs`}>{s.label}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      تاريخ التقديم: {new Date(r.created_at).toLocaleDateString('ar', { year:'numeric', month:'long', day:'numeric' })}
                    </p>
                    <p className="text-sm text-gray-600 mt-2 leading-relaxed bg-gray-50 rounded-xl p-3">
                      {s.tip}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-center text-xs text-gray-400">
        للاستفسار والمساعدة: تواصل مع دائرة جبلة للشؤون الاجتماعية والعمل
      </p>
    </div>
  )
}
