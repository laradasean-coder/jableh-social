import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { CheckCircle, XCircle, Clock, RefreshCw, Shield, Eye } from 'lucide-react'

const RECORD_TYPES = {
  disabled:    'سجلات ذوي الإعاقة',
  widow:       'سجلات الأرامل',
  orphan:      'سجلات الأيتام',
  divorced:    'سجلات المطلقات',
  poor_family: 'سجلات الأسر الفقيرة',
}

const STATUS = {
  pending:  { label: 'قيد المراجعة', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved: { label: 'موافق عليه',   color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  rejected: { label: 'مرفوض',        color: 'bg-red-100 text-red-700',      icon: XCircle },
}

const MOCK_REQUESTS = [
  { id: 'r1', association_name: 'جمعية نور للمعاقين', record_type: 'disabled',
    reason: 'نحتاج للتنسيق في تقديم الخدمات لذوي الإعاقة', status: 'pending',
    created_at: new Date().toISOString() },
  { id: 'r2', association_name: 'جمعية الأمل', record_type: 'widow',
    reason: 'لتقديم مساعدات للأرامل المسجلات في الدائرة', status: 'approved',
    created_at: new Date(Date.now() - 86400000).toISOString() },
]

export default function AccessRequestsPage() {
  const { profile } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [useMock,  setUseMock]  = useState(false)
  const [saving,   setSaving]   = useState(null)

  useEffect(() => { fetchRequests() }, [])

  const fetchRequests = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('access_requests').select('*').order('created_at', { ascending: false })
    if (error || !data) { setRequests(MOCK_REQUESTS); setUseMock(true) }
    else setRequests(data)
    setLoading(false)
  }

  const handleDecision = async (req, decision) => {
    setSaving(req.id)
    const update = {
      status: decision,
      reviewed_by: profile?.id,
      reviewed_at: new Date().toISOString(),
      expires_at: decision === 'approved'
        ? new Date(Date.now() + 30 * 24 * 3600000).toISOString() : null
    }
    if (useMock) {
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, ...update } : r))
    } else {
      await supabase.from('access_requests').update(update).eq('id', req.id)
      // Send notification if approved
      if (decision === 'approved') {
        await supabase.from('notifications').insert({
          title: decision === 'approved' ? 'تمت الموافقة على طلبكم' : 'تم رفض طلبكم',
          body: `طلب الاطلاع على ${RECORD_TYPES[req.record_type]}`,
          type: decision === 'approved' ? 'success' : 'error',
        })
      }
      fetchRequests()
    }
    setSaving(null)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">طلبات وصول الجمعيات</h1>
          <p className="text-gray-500 text-sm mt-1">مراجعة طلبات الجمعيات للاطلاع على سجلات الدائرة</p>
        </div>
        <button onClick={fetchRequests} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>
          تحديث
        </button>
      </div>

      {useMock && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-yellow-800 text-sm">
          ⚠️ وضع تجريبي
        </div>
      )}

      <div className="space-y-3">
        {requests.map(req => {
          const st = STATUS[req.status]
          const StIcon = st.icon
          return (
            <div key={req.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-gray-800">{req.association_name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${st.color}`}>
                      <StIcon size={11}/> {st.label}
                    </span>
                  </div>
                  <p className="text-sm text-blue-700 font-semibold mb-1">
                    <Eye size={13} className="inline ml-1"/>
                    يطلب الاطلاع على: {RECORD_TYPES[req.record_type] || req.record_type}
                  </p>
                  <p className="text-sm text-gray-600">{req.reason}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(req.created_at).toLocaleDateString('ar-SY')}
                    {req.expires_at && ` · تنتهي الصلاحية: ${new Date(req.expires_at).toLocaleDateString('ar-SY')}`}
                  </p>
                </div>
                {req.status === 'pending' && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleDecision(req, 'approved')}
                      disabled={saving === req.id}
                      className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors">
                      {saving === req.id ? <RefreshCw size={13} className="animate-spin"/> : <CheckCircle size={13}/>}
                      موافقة
                    </button>
                    <button
                      onClick={() => handleDecision(req, 'rejected')}
                      disabled={saving === req.id}
                      className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm transition-colors">
                      <XCircle size={13}/> رفض
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {!loading && requests.length === 0 && (
          <div className="card text-center text-gray-400 py-12">
            <Shield size={40} className="mx-auto mb-3 opacity-30"/>
            لا توجد طلبات وصول
          </div>
        )}
      </div>
    </div>
  )
}
