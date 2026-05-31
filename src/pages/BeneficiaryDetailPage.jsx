import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { updateBeneficiary, getBeneficiaryHistory } from '../api/beneficiaries'
import { CATEGORIES, STATUSES, formatDate } from '../utils/format'
import {
  ArrowRight, Printer, Edit2, Save, X, User, Phone,
  MapPin, Calendar, FileText, Tag, Activity, Clock,
  CheckCircle, AlertCircle, XCircle, Hash, Plus, RefreshCw,
  Send, Archive, Building2
} from 'lucide-react'

const STATUS_ICONS = { active: CheckCircle, inactive: XCircle, pending: AlertCircle }

export default function BeneficiaryDetailPage({ beneficiary: initial, onBack, onEdit, onUpdate }) {
  const [ben,      setBen]      = useState(initial)
  const [editing,  setEditing]  = useState(false)
  const [form,     setForm]     = useState({ ...initial })
  const [saving,   setSaving]   = useState(false)
  const [history,  setHistory]  = useState([])
  const [hLoading, setHLoading] = useState(false)
  const [showAddH, setShowAddH] = useState(false)
  const [hForm,    setHForm]    = useState({ relief_type: '', amount: '', notes: '' })
  const printRef = useRef()
  const [showReferral, setShowReferral] = useState(false)
  const [showArchive,  setShowArchive]  = useState(false)
  const [associations, setAssociations] = useState([])
  const [refForm, setRefForm] = useState({ association_id:'', reason:'' })
  const [archiveReason, setArchiveReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const cat = CATEGORIES[ben.category] || CATEGORIES.poor_family
  const stMeta = STATUSES[ben.status] || STATUSES.active
  const StIcon = STATUS_ICONS[ben.status] || AlertCircle

  useEffect(() => { fetchHistory() }, [ben.id])

  const fetchHistory = async () => {
    setHLoading(true)
    const data = await getBeneficiaryHistory(ben.id)
    setHistory(data)
    setHLoading(false)
  }

  const openReferral = async () => {
    const { data } = await supabase.from('associations').select('id,name').eq('is_active', true)
    setAssociations(data || [])
    setShowReferral(true)
  }

  const submitReferral = async () => {
    if (!refForm.association_id) return
    setActionLoading(true)
    const assoc = associations.find(a => a.id === refForm.association_id)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('referrals').insert({
      beneficiary_id: ben.id,
      association_id: refForm.association_id,
      association_name: assoc?.name,
      reason: refForm.reason,
      referred_by: user?.id,
      referred_by_name: user?.email,
    })
    await supabase.from('audit_logs').insert({
      action: 'transfer', entity: 'مستفيد',
      detail: `تحويل ${ben.full_name} إلى ${assoc?.name}`
    })
    setActionLoading(false)
    setShowReferral(false)
    setRefForm({ association_id:'', reason:'' })
  }

  const submitArchive = async () => {
    if (!archiveReason.trim()) return
    setActionLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const updated = await updateBeneficiary(ben.id, {
      status: 'archived',
      archived_at: new Date().toISOString(),
      archive_reason: archiveReason,
      archived_by: user?.id,
    })
    await supabase.from('audit_logs').insert({
      action: 'update', entity: 'مستفيد',
      detail: `أرشفة ${ben.full_name}: ${archiveReason}`
    })
    setBen(updated)
    if (onUpdate) onUpdate(updated)
    setActionLoading(false)
    setShowArchive(false)
  }

  const unarchive = async () => {
    const updated = await updateBeneficiary(ben.id, { status: 'active', archived_at: null, archive_reason: null })
    setBen(updated)
    if (onUpdate) onUpdate(updated)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateBeneficiary(ben.id, form)
      setBen(updated)
      if (onUpdate) onUpdate(updated)
      setEditing(false)
    } catch(e) { console.error(e) }
    setSaving(false)
  }

  const addHistory = async () => {
    if (!hForm.relief_type) return
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('beneficiary_relief_history').insert({
      beneficiary_id: ben.id,
      relief_type: hForm.relief_type,
      amount: hForm.amount ? parseFloat(hForm.amount) : null,
      notes: hForm.notes,
      given_by: user?.id,
      given_by_name: user?.email,
      given_at: new Date().toISOString()
    }).select().single()
    if (data) setHistory(p => [data, ...p])
    setShowAddH(false)
    setHForm({ relief_type: '', amount: '', notes: '' })
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="rounded-3xl text-white p-6 mb-6" style={{ background: cat.color }}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl text-sm transition-colors">
            <ArrowRight size={15}/> رجوع
          </button>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl text-sm transition-colors">
              <Printer size={14}/> طباعة
            </button>
            {editing ? (
              <>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 bg-white text-green-700 hover:bg-green-50 px-3 py-1.5 rounded-xl text-sm font-bold">
                  <Save size={14}/>{saving ? 'حفظ...' : 'حفظ'}
                </button>
                <button onClick={() => { setEditing(false); setForm({...ben}) }}
                  className="bg-white/20 hover:bg-white/30 px-2 py-1.5 rounded-xl">
                  <X size={14}/>
                </button>
              </>
            ) : (
              <>
                <button onClick={openReferral}
                  className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl text-sm transition-colors">
                  <Send size={14}/> تحويل لجمعية
                </button>
                {ben.status === 'archived' ? (
                  <button onClick={unarchive}
                    className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl text-sm transition-colors">
                    <Archive size={14}/> إلغاء الأرشفة
                  </button>
                ) : (
                  <button onClick={() => setShowArchive(true)}
                    className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl text-sm transition-colors">
                    <Archive size={14}/> أرشفة
                  </button>
                )}
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl text-sm transition-colors">
                  <Edit2 size={14}/> تعديل
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">
            {cat.icon}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{ben.full_name}</h2>
            <div className="flex items-center gap-3 mt-1 text-white/80 text-sm flex-wrap">
              <span className="flex items-center gap-1"><StIcon size={13}/>{stMeta.label}</span>
              <span className="flex items-center gap-1"><Tag size={13}/>{cat.label}</span>
              <span className="flex items-center gap-1"><Clock size={13}/>{formatDate(ben.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-5">
        {/* Personal Info */}
        <div className="card">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <User size={16} className="text-blue-500"/> المعلومات الشخصية
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'الرقم الوطني', key: 'national_id', icon: Hash,     type: 'text' },
              { label: 'الهاتف',       key: 'phone',       icon: Phone,     type: 'tel' },
              { label: 'تاريخ الميلاد',key: 'birth_date',  icon: Calendar,  type: 'date' },
            ].map(f => (
              <div key={f.key} className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <f.icon size={13} className="text-gray-400"/>
                  <label className="text-xs text-gray-400 font-medium">{f.label}</label>
                </div>
                {editing ? (
                  <input type={f.type} className="input text-sm py-1 px-2"
                    value={form[f.key]||''} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}/>
                ) : (
                  <span className="font-semibold text-gray-800 text-sm" dir={f.key==='phone'?'ltr':'rtl'}>
                    {ben[f.key]||'—'}
                  </span>
                )}
              </div>
            ))}
            <div className="bg-gray-50 rounded-xl p-3">
              <label className="text-xs text-gray-400 font-medium block mb-1">الجنس</label>
              {editing ? (
                <select className="input text-sm py-1 px-2" value={form.gender} onChange={e=>setForm(p=>({...p,gender:e.target.value}))}>
                  <option value="female">أنثى</option><option value="male">ذكر</option>
                </select>
              ) : <span className="font-semibold text-gray-800 text-sm">{ben.gender==='male'?'ذكر':'أنثى'}</span>}
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <label className="text-xs text-gray-400 font-medium block mb-1">الفئة</label>
              {editing ? (
                <select className="input text-sm py-1 px-2" value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                  {Object.entries(CATEGORIES).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              ) : <span className="font-semibold text-sm" style={{color:cat.color}}>{cat.icon} {cat.label}</span>}
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <label className="text-xs text-gray-400 font-medium block mb-1">الحالة</label>
              {editing ? (
                <select className="input text-sm py-1 px-2" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                  <option value="active">نشط</option><option value="pending">معلق</option><option value="inactive">غير نشط</option>
                </select>
              ) : <span className={`badge text-xs ${stMeta.tw}`}>{stMeta.label}</span>}
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="card">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <MapPin size={16} className="text-green-500"/> العنوان والموقع
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 md:col-span-2">
              <label className="text-xs text-gray-400 font-medium block mb-1">العنوان التفصيلي</label>
              {editing ? (
                <input className="input text-sm py-1 px-2" value={form.address||''} onChange={e=>setForm(p=>({...p,address:e.target.value}))}/>
              ) : <span className="font-semibold text-gray-800 text-sm">{ben.address||'—'}</span>}
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <label className="text-xs text-gray-400 font-medium block mb-1">المنطقة</label>
              {editing ? (
                <select className="input text-sm py-1 px-2" value={form.district||''} onChange={e=>setForm(p=>({...p,district:e.target.value}))}>
                  <option value="">اختر</option>
                  {['جبلة','الدالية','بيت ياشوط','البودي','تل حويري','بسنديانا','أخرى'].map(d=><option key={d}>{d}</option>)}
                </select>
              ) : <span className="font-semibold text-gray-800 text-sm">{ben.district||'—'}</span>}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card">
          <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
            <FileText size={16} className="text-yellow-500"/> ملاحظات
          </h3>
          {editing ? (
            <textarea className="input h-28 resize-none text-sm" value={form.notes||''} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="ملاحظات..."/>
          ) : (
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-sm text-gray-700 min-h-[60px]">
              {ben.notes || <span className="text-gray-400 italic">لا توجد ملاحظات</span>}
            </div>
          )}
        </div>

        {/* Relief History — REAL DATA */}
        <div className="card no-print">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
              <Activity size={16} className="text-purple-500"/> سجل المساعدات
            </h3>
            <div className="flex gap-2">
              <button onClick={fetchHistory} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <RefreshCw size={14} className={hLoading?'animate-spin text-blue-400':'text-gray-400'}/>
              </button>
              <button onClick={() => setShowAddH(true)}
                className="flex items-center gap-1 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-1.5 rounded-xl font-semibold">
                <Plus size={12}/> إضافة مساعدة
              </button>
            </div>
          </div>

          {showAddH && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-4 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label text-xs">نوع المساعدة</label>
                  <input className="input text-sm" placeholder="مثال: مواد غذائية" value={hForm.relief_type} onChange={e=>setHForm(p=>({...p,relief_type:e.target.value}))}/>
                </div>
                <div>
                  <label className="label text-xs">المبلغ / القيمة (اختياري)</label>
                  <input type="number" className="input text-sm" placeholder="ل.س" value={hForm.amount} onChange={e=>setHForm(p=>({...p,amount:e.target.value}))}/>
                </div>
              </div>
              <input className="input text-sm" placeholder="ملاحظات..." value={hForm.notes} onChange={e=>setHForm(p=>({...p,notes:e.target.value}))}/>
              <div className="flex gap-2">
                <button onClick={() => setShowAddH(false)} className="btn-secondary text-xs py-1.5 flex-1">إلغاء</button>
                <button onClick={addHistory} className="btn-primary text-xs py-1.5 flex-1">تسجيل المساعدة</button>
              </div>
            </div>
          )}

          {hLoading ? (
            <div className="text-center py-6 text-gray-400 text-sm">جاري التحميل...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">لا يوجد سجل مساعدات بعد</div>
          ) : (
            <div className="space-y-2">
              {history.map(h => (
                <div key={h.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl text-sm">
                  <div className="w-2 h-2 bg-purple-400 rounded-full shrink-0"/>
                  <span className="font-semibold text-gray-700 flex-1">{h.relief_type}</span>
                  {h.amount && <span className="text-green-600 font-bold text-xs">{Number(h.amount).toLocaleString('ar')} ل.س</span>}
                  <span className="text-gray-400 text-xs">{h.given_by_name?.split('@')[0] || 'النظام'}</span>
                  <span className="text-gray-300 text-xs">{formatDate(h.given_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Referral Modal */}
      {showReferral && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Building2 size={18} className="text-purple-600"/> تحويل لجمعية</h3>
              <button onClick={() => setShowReferral(false)}><X size={20} className="text-gray-400"/></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">تحويل <span className="font-bold text-gray-700">{ben.full_name}</span> إلى جمعية لمتابعة حالته.</p>
            <div className="space-y-3">
              <div>
                <label className="label text-sm">الجمعية</label>
                <select className="input w-full" value={refForm.association_id} onChange={e => setRefForm(p => ({...p, association_id: e.target.value}))}>
                  <option value="">اختر جمعية</option>
                  {associations.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label text-sm">سبب التحويل</label>
                <textarea className="input w-full h-20 resize-none" placeholder="مثال: يحتاج دعماً طبياً متخصصاً" value={refForm.reason} onChange={e => setRefForm(p => ({...p, reason: e.target.value}))}/>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowReferral(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">إلغاء</button>
              <button onClick={submitReferral} disabled={actionLoading || !refForm.association_id}
                className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2" style={{ background:'#7C3AED' }}>
                {actionLoading ? <RefreshCw size={14} className="animate-spin"/> : <Send size={14}/>}تأكيد التحويل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {showArchive && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Archive size={18} className="text-amber-600"/> أرشفة الملف</h3>
              <button onClick={() => setShowArchive(false)}><X size={20} className="text-gray-400"/></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">سيُنقل <span className="font-bold text-gray-700">{ben.full_name}</span> للأرشيف ويختفي من القوائم النشطة. يمكن استرجاعه لاحقاً.</p>
            <div>
              <label className="label text-sm">سبب الأرشفة</label>
              <select className="input w-full mb-2" value={archiveReason} onChange={e => setArchiveReason(e.target.value)}>
                <option value="">اختر السبب</option>
                <option value="تحسّن الوضع المعيشي">تحسّن الوضع المعيشي</option>
                <option value="انتقل خارج المنطقة">انتقل خارج المنطقة</option>
                <option value="وفاة">وفاة</option>
                <option value="عدم استيفاء الشروط">عدم استيفاء الشروط</option>
                <option value="سبب آخر">سبب آخر</option>
              </select>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowArchive(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">إلغاء</button>
              <button onClick={submitArchive} disabled={actionLoading || !archiveReason}
                className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2" style={{ background:'#D97706' }}>
                {actionLoading ? <RefreshCw size={14} className="animate-spin"/> : <Archive size={14}/>}تأكيد الأرشفة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
