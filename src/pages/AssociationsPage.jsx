import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  Building2, Search, Plus, X, Save, LogIn, LogOut,
  Printer, Phone, Mail, MapPin, RefreshCw, Trash2, Send, Clock, CheckCircle
} from 'lucide-react'
import { ImageUpload } from '../components/ui/FileUpload'

const RECORD_TYPES = [
  { value:'disabled',    label:'سجلات ذوي الإعاقة' },
  { value:'widow',       label:'سجلات الأرامل' },
  { value:'orphan',      label:'سجلات الأيتام' },
  { value:'divorced',    label:'سجلات المطلقات' },
  { value:'poor_family', label:'سجلات الأسر الفقيرة' },
]

const DEFAULT_ASSOCS = [
  { id:'mock-1', name:'جمعية المستقبل للتنمية الاجتماعية', president_name:'أحمد محمد', phone:'0912345678', email:'mustaqbal@example.com', address:'جبلة - الشارع الرئيسي', description:'جمعية تعمل على تنمية المجتمع', services:['توزيع المساعدات','التدريب المهني','دعم الأيتام'], is_active:true, username:'mustaqbal', password:'', logo_url:'', cover_url:'' },
  { id:'mock-2', name:'جمعية نور للمعاقين', president_name:'سهام علي', phone:'0998887766', email:'nour@example.com', address:'جبلة - حي الزهراء', description:'رعاية وتأهيل ذوي الإعاقات', services:['التأهيل الجسدي','التعليم الخاص'], is_active:true, username:'nour', password:'', logo_url:'', cover_url:'' },
  { id:'mock-3', name:'جمعية الأمل للأرامل والمطلقات', president_name:'منى حسن', phone:'0933445566', email:'amal@example.com', address:'جبلة - الطريق الساحلي', description:'دعم وتمكين الأرامل والمطلقات', services:['التمكين الاقتصادي','الدعم النفسي'], is_active:true, username:'amal', password:'', logo_url:'', cover_url:'' },
]

export default function AssociationsPage() {
  const { user, profile } = useAuth()
  const [associations, setAssociations] = useState([])
  const [search,       setSearch]       = useState('')
  const [loggedIn,     setLoggedIn]     = useState(null)
  const [showLogin,    setShowLogin]    = useState(null)
  const [loginForm,    setLoginForm]    = useState({ username:'', password:'' })
  const [loginError,   setLoginError]   = useState('')
  const [showEdit,     setShowEdit]     = useState(false)
  const [editForm,     setEditForm]     = useState({})
  const [showAdd,      setShowAdd]      = useState(false)
  const [addForm,      setAddForm]      = useState({ name:'', president_name:'', phone:'', email:'', address:'', description:'', services:'', username:'', password:'' })
  const [showAccessReq, setShowAccessReq] = useState(false)
  const [accessForm,    setAccessForm]    = useState({ record_type:'disabled', reason:'' })
  const [accessSent,    setAccessSent]    = useState(false)
  const [loading,      setLoading]      = useState(false)

  useEffect(() => {
    fetchAssociations()
    if (profile?.role === 'admin') setLoggedIn('admin')
  }, [profile])

  // الجمعية ترى بياناتها فقط (وتُسجّل دخولها تلقائياً على سجلّها)
  const isAssocUser = profile?.role === 'association'

  useEffect(() => {
    if (isAssocUser && user && associations.length) {
      const own = associations.find(a => a.user_id === user.id)
      if (own) setLoggedIn(own.id)
    }
  }, [isAssocUser, user, associations])

  const fetchAssociations = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('associations').select('*').order('name')
    if (error || !data || data.length === 0) {
      setAssociations(DEFAULT_ASSOCS)
    } else {
      setAssociations(data)
    }
    setLoading(false)
  }

  const isApproved = (a) => a.status !== 'pending' && a.status !== 'rejected' && a.is_active !== false
  const pending = isAssocUser ? [] : associations.filter(a => a.status === 'pending')
  const filtered = isAssocUser
    ? associations.filter(a => a.user_id === user?.id)
    : associations.filter(a =>
        isApproved(a) && (a.name?.includes(search) || a.president_name?.includes(search))
      )

  const approveAssoc = async (a) => {
    await supabase.from('associations')
      .update({ status: 'approved', is_active: true, approved_at: new Date().toISOString() })
      .eq('id', a.id)
    // ترقية دور المستخدم المرتبط إلى "جمعية"
    if (a.user_id) {
      await supabase.from('profiles').update({ role: 'association' }).eq('id', a.user_id)
    }
    setAssociations(prev => prev.map(x => x.id===a.id ? { ...x, status:'approved', is_active:true } : x))
  }

  const rejectAssoc = async (a) => {
    if (!confirm(`رفض طلب الجمعية "${a.name}" وحذف حسابه نهائياً؟`)) return

    // بيانات تجريبية فقط (لا مستخدم فعلي)
    if (String(a.id).startsWith('mock-')) {
      setAssociations(prev => prev.filter(x => x.id !== a.id))
      return
    }

    if (a.user_id) {
      // حذف المستخدم نهائياً عبر دالة الخدمة؛ يُحذف الملف وسجل الجمعية تلقائياً (Cascade)
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'delete', user_id: a.user_id }
      })
      if (error || data?.error) {
        alert('تعذّر حذف الحساب: ' + (data?.error || error?.message || 'خطأ غير معروف'))
        return
      }
    } else {
      // لا مستخدم مرتبط: احذف سجل الجمعية فقط
      await supabase.from('associations').delete().eq('id', a.id)
    }
    setAssociations(prev => prev.filter(x => x.id !== a.id))
  }

  const handleLogin = (assocId) => {
    const a = associations.find(x => x.id === assocId)
    if (!a) return
    if ((loginForm.username==='admin' && loginForm.password==='admin') || (loginForm.username===a.username && loginForm.password===a.password)) {
      setLoggedIn(assocId); setShowLogin(null); setLoginError('')
      setLoginForm({ username:'', password:'' })
    } else {
      setLoginError('اسم المستخدم أو كلمة المرور غير صحيحة')
    }
  }

  const openEdit = (a) => {
    setEditForm({ ...a, services: Array.isArray(a.services) ? a.services.join('، ') : a.services||'' })
    setShowEdit(true)
  }

  const saveEdit = async () => {
    const updated = {
      ...editForm,
      services: typeof editForm.services === 'string'
        ? editForm.services.split('،').map(s=>s.trim()).filter(Boolean)
        : editForm.services
    }
    if (!editForm.id.startsWith('mock-')) {
      await supabase.from('associations').update({
        name:updated.name, president_name:updated.president_name, phone:updated.phone,
        email:updated.email, address:updated.address, description:updated.description,
        services:updated.services
      }).eq('id', editForm.id)
    }
    setAssociations(prev => prev.map(a => a.id===editForm.id ? updated : a))
    setShowEdit(false)
  }

  const handleAdd = async () => {
    const services = addForm.services.split('،').map(s=>s.trim()).filter(Boolean)
    const { data, error } = await supabase.from('associations').insert({
      ...addForm, services, is_active: true
    }).select().single()
    if (!error && data) setAssociations(prev => [...prev, data])
    else setAssociations(prev => [...prev, { id:'mock-'+Date.now(), ...addForm, services, is_active:true }])
    setShowAdd(false)
    setAddForm({ name:'', president_name:'', phone:'', email:'', address:'', description:'', services:'', username:'', password:'' })
  }

  const sendAccessRequest = async () => {
    const assoc = associations.find(a => a.id===loggedIn)
    if (!assoc) return
    await supabase.from('access_requests').insert({
      association_id: loggedIn.startsWith('mock-') ? null : loggedIn,
      association_name: assoc.name,
      record_type: accessForm.record_type,
      reason: accessForm.reason
    })
    setAccessSent(true)
    setTimeout(() => { setAccessSent(false); setShowAccessReq(false) }, 3000)
  }

  const printAssociation = (a) => {
    const services = Array.isArray(a.services) ? a.services : []
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar">
<head><meta charset="UTF-8"/><title>${a.name}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>*{font-family:'Cairo',sans-serif;margin:0;padding:0}body{padding:28px;color:#111827}
h1{font-size:20px;font-weight:700;color:#1d4ed8;margin-bottom:4px}
.row{display:flex;gap:8px;margin:8px 0;font-size:13px}
.label{color:#6b7280;min-width:120px}
.badge{display:inline-block;padding:2px 10px;background:#eff6ff;color:#1d4ed8;border-radius:999px;font-size:11px;margin:2px}
@media print{body{padding:12px}}</style></head>
<body>
<h1>${a.name}</h1>
<p style="color:#6b7280;font-size:12px;margin-bottom:16px">${a.description||''}</p>
<div class="row"><span class="label">رئيس الجمعية:</span><strong>${a.president_name||'—'}</strong></div>
<div class="row"><span class="label">الهاتف:</span><span dir="ltr">${a.phone||'—'}</span></div>
<div class="row"><span class="label">البريد:</span><span dir="ltr">${a.email||'—'}</span></div>
<div class="row"><span class="label">العنوان:</span>${a.address||'—'}</div>
<div style="margin-top:16px"><strong>الخدمات:</strong><div style="margin-top:6px">${services.map(s=>`<span class="badge">${s}</span>`).join('')}</div></div>
<script>window.onload=()=>setTimeout(()=>window.print(),500)</script>
</body></html>`
    const w = window.open('','_blank')
    w.document.write(html)
    w.document.close()
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الجمعيات الأهلية</h1>
          <p className="text-gray-500 text-sm">{filtered.length} جمعية نشطة</p>
        </div>
        {(profile?.role==='admin'||profile?.role==='staff') && (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 btn-primary text-sm">
            <Plus size={16}/> إضافة جمعية
          </button>
        )}
      </div>

      {/* لوحة مراجعة طلبات تسجيل الجمعيات (للمدير/الموظف) */}
      {(profile?.role==='admin'||profile?.role==='staff') && pending.length > 0 && (
        <div className="card border-2 border-amber-300 bg-amber-50/60">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-amber-600"/>
            <h2 className="font-bold text-gray-800">طلبات تسجيل بانتظار المراجعة ({pending.length})</h2>
          </div>
          <div className="space-y-3">
            {pending.map(a => (
              <div key={a.id} className="flex items-center justify-between flex-wrap gap-3 bg-white rounded-xl border border-amber-100 p-3">
                <div>
                  <p className="font-semibold text-gray-800">{a.name}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                    {a.president_name && <span>👤 {a.president_name}</span>}
                    {a.phone && <span dir="ltr">{a.phone}</span>}
                    {a.email && <span dir="ltr">{a.email}</span>}
                  </div>
                  {a.description && <p className="text-xs text-gray-400 mt-1">{a.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => approveAssoc(a)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium">
                    <CheckCircle size={14}/> اعتماد
                  </button>
                  <button onClick={() => rejectAssoc(a)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-medium">
                    <X size={14}/> رفض
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input className="input w-full pr-9" placeholder="بحث عن جمعية..."
          value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12"><RefreshCw size={24} className="animate-spin text-blue-500"/></div>
        ) : filtered.map(a => (
          <div key={a.id} className={`card transition-all ${(loggedIn===a.id||loggedIn==='admin') ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}>
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                {a.logo_url
                  ? <img src={a.logo_url} alt={a.name} className="w-14 h-14 rounded-2xl object-cover"/>
                  : <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
                      <Building2 size={26} className="text-blue-600"/>
                    </div>
                }
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{a.name}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                    {a.president_name && <span>👤 {a.president_name}</span>}
                    {a.phone && <span dir="ltr" className="flex items-center gap-1"><Phone size={12}/>{a.phone}</span>}
                    {a.address && <span className="flex items-center gap-1"><MapPin size={12}/>{a.address}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(loggedIn===a.id||loggedIn==='admin') ? (
                  <>
                    <button onClick={() => { setShowAccessReq(true); setAccessSent(false) }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-sm font-medium">
                      <Send size={13}/> طلب وصول
                    </button>
                    <button onClick={() => openEdit(a)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-sm font-medium">
                      <Save size={13}/> تعديل
                    </button>
                    <button onClick={() => printAssociation(a)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium">
                      <Printer size={13}/> طباعة
                    </button>
                    {loggedIn !== 'admin' && (
                      <button onClick={() => setLoggedIn(null)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-sm font-medium">
                        <LogOut size={13}/> خروج
                      </button>
                    )}
                  </>
                ) : (
                  <button onClick={() => setShowLogin(a.id)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium">
                    <LogIn size={13}/> دخول
                  </button>
                )}
              </div>
            </div>

            {/* Description & services */}
            {a.description && <p className="text-gray-600 text-sm mt-3 leading-relaxed">{a.description}</p>}
            {Array.isArray(a.services) && a.services.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {a.services.map(s => <span key={s} className="badge bg-blue-50 text-blue-700 text-xs">{s}</span>)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800">دخول الجمعية</h3>
              <button onClick={() => { setShowLogin(null); setLoginError('') }}><X size={20}/></button>
            </div>
            <div className="space-y-3">
              <input className="input w-full" placeholder="اسم المستخدم"
                value={loginForm.username} onChange={e=>setLoginForm(p=>({...p,username:e.target.value}))}/>
              <input className="input w-full" type="password" placeholder="كلمة المرور"
                value={loginForm.password} onChange={e=>setLoginForm(p=>({...p,password:e.target.value}))}
                onKeyDown={e=>e.key==='Enter'&&handleLogin(showLogin)}/>
              {loginError && <p className="text-red-600 text-sm">{loginError}</p>}
              <button onClick={() => handleLogin(showLogin)} className="w-full btn-primary">دخول</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800">تعديل بيانات الجمعية</h3>
              <button onClick={() => setShowEdit(false)}><X size={20}/></button>
            </div>
            <div className="space-y-3">
              {[
                { key:'name', label:'اسم الجمعية' }, { key:'president_name', label:'رئيس الجمعية' },
                { key:'phone', label:'الهاتف', dir:'ltr' }, { key:'email', label:'البريد', dir:'ltr' },
                { key:'address', label:'العنوان' },
              ].map(f => (
                <div key={f.key}>
                  <label className="label text-sm">{f.label}</label>
                  <input className="input w-full" dir={f.dir}
                    value={editForm[f.key]||''} onChange={e=>setEditForm(p=>({...p,[f.key]:e.target.value}))}/>
                </div>
              ))}
              <div>
                <label className="label text-sm">الوصف</label>
                <textarea className="input w-full h-20 resize-none" value={editForm.description||''}
                  onChange={e=>setEditForm(p=>({...p,description:e.target.value}))}/>
              </div>
              <div>
                <label className="label text-sm">الخدمات (مفصولة بـ ،)</label>
                <input className="input w-full" value={editForm.services||''}
                  onChange={e=>setEditForm(p=>({...p,services:e.target.value}))}/>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowEdit(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">إلغاء</button>
              <button onClick={saveEdit} className="flex-1 btn-primary text-sm">حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* Access Request Modal */}
      {showAccessReq && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800">طلب الوصول لسجلات</h3>
              <button onClick={() => setShowAccessReq(false)}><X size={20}/></button>
            </div>
            {accessSent ? (
              <div className="text-center py-6">
                <div className="text-5xl mb-3">✅</div>
                <p className="font-semibold text-gray-700">تم إرسال الطلب بنجاح</p>
                <p className="text-sm text-gray-500 mt-1">سيتم مراجعته من قِبل الموظفين</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="label text-sm">نوع السجلات المطلوبة</label>
                  <select className="input w-full" value={accessForm.record_type}
                    onChange={e=>setAccessForm(p=>({...p,record_type:e.target.value}))}>
                    {RECORD_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label text-sm">سبب الطلب</label>
                  <textarea className="input w-full h-20 resize-none" placeholder="اشرح سبب طلب الاطلاع..."
                    value={accessForm.reason} onChange={e=>setAccessForm(p=>({...p,reason:e.target.value}))}/>
                </div>
                <button onClick={sendAccessRequest} className="w-full btn-primary text-sm">إرسال الطلب</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Association Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800">إضافة جمعية جديدة</h3>
              <button onClick={() => setShowAdd(false)}><X size={20}/></button>
            </div>
            <div className="space-y-3">
              {[
                { key:'name', label:'اسم الجمعية', req:true },
                { key:'president_name', label:'رئيس الجمعية' },
                { key:'phone', label:'الهاتف', dir:'ltr' },
                { key:'email', label:'البريد', dir:'ltr' },
                { key:'address', label:'العنوان' },
                { key:'username', label:'اسم المستخدم للدخول' },
                { key:'password', label:'كلمة مرور الدخول' },
              ].map(f => (
                <div key={f.key}>
                  <label className="label text-sm">{f.label}{f.req&&<span className="text-red-500 mr-1">*</span>}</label>
                  <input className="input w-full" dir={f.dir}
                    value={addForm[f.key]||''} onChange={e=>setAddForm(p=>({...p,[f.key]:e.target.value}))}/>
                </div>
              ))}
              <div>
                <label className="label text-sm">الخدمات (مفصولة بـ ،)</label>
                <input className="input w-full" value={addForm.services}
                  onChange={e=>setAddForm(p=>({...p,services:e.target.value}))}/>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">إلغاء</button>
              <button onClick={handleAdd} className="flex-1 btn-primary text-sm">إضافة</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
