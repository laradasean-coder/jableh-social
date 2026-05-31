import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useSiteSettings } from '../hooks/useSiteSettings'
import DistrictsManager from '../components/ui/DistrictsManager'
import { useNavigate } from 'react-router-dom'
import {
  Newspaper, Plus, Edit2, Trash2, Eye, EyeOff,
  Save, X, RefreshCw, Upload, Image, Settings,
  Phone, Mail, MapPin, Clock, Globe, Building,
  CheckCircle, AlertCircle, UserCog
} from 'lucide-react'

const CONTENT_TYPES = {
  news:         { label:'خبر',         color:'bg-blue-100 text-blue-700' },
  activity:     { label:'نشاط',        color:'bg-green-100 text-green-700' },
  announcement: { label:'إعلان',       color:'bg-yellow-100 text-yellow-700' },
}

const EMPTY_ITEM = { type:'news', title:'', body:'', image_url:'', is_published:true }

// ─── Settings keys stored in site_settings table ───
const SETTING_GROUPS = [
  {
    id:'contact', label:'معلومات التواصل', icon:Phone,
    fields:[
      { key:'phone_main',    label:'الهاتف الرئيسي',       placeholder:'+963-41-XXXXXXX' },
      { key:'phone_alt',     label:'الهاتف الثانوي',       placeholder:'+963-41-XXXXXXX' },
      { key:'email_main',    label:'البريد الرسمي',        placeholder:'jabla@mosa.gov.sy' },
      { key:'address',       label:'العنوان التفصيلي',      placeholder:'مدينة جبلة، محافظة اللاذقية' },
      { key:'working_hours', label:'ساعات الدوام',         placeholder:'الأحد – الخميس: 8:00 – 14:00' },
      { key:'maps_url',      label:'رابط خرائط Google',    placeholder:'https://maps.google.com/...' },
    ]
  },
  {
    id:'identity', label:'هوية الدائرة', icon:Building,
    fields:[
      { key:'org_name_ar',   label:'اسم الدائرة (عربي)',   placeholder:'دائرة جبلة للشؤون الاجتماعية' },
      { key:'org_name_en',   label:'اسم الدائرة (إنجليزي)',placeholder:'Jabla Social Affairs Office' },
      { key:'ministry',      label:'الوزارة',               placeholder:'وزارة الشؤون الاجتماعية والعمل' },
      { key:'director_name', label:'اسم المدير',           placeholder:'المدير العام' },
      { key:'est_year',      label:'سنة التأسيس',          placeholder:'1980' },
      { key:'governorate',   label:'المحافظة',             placeholder:'اللاذقية' },
    ]
  },
  {
    id:'director', label:'صفحة المدير', icon:UserCog,
    fields:[
      { key:'director_name',   label:'اسم المدير',           placeholder:'معتز بلة' },
      { key:'director_title',  label:'المسمى الوظيفي',       placeholder:'مدير دائرة جبلة للشؤون الاجتماعية والعمل' },
      { key:'director_email',  label:'البريد الإلكتروني',    placeholder:'director@mosa.gov.sy' },
      { key:'director_phone',  label:'رقم التواصل',          placeholder:'+963-XXXXXXXXX' },
      { key:'director_photo',  label:'رابط صورة المدير',     placeholder:'https://... (اتركه فارغاً لأيقونة افتراضية)' },
      { key:'director_intro',  label:'نبذة تعريفية قصيرة',   placeholder:'قائد إنساني بخبرة واسعة...', type:'textarea' },
      { key:'director_bio',    label:'السيرة المهنية (فقرات مفصولة بسطر فارغ)', type:'textarea', full:true },
      { key:'director_vision', label:'نص رؤية الإدارة',      type:'textarea', full:true },
    ]
  },
  {
    id:'social', label:'التواصل الاجتماعي', icon:Globe,
    fields:[
      { key:'facebook_url',  label:'Facebook',  placeholder:'https://facebook.com/...' },
      { key:'twitter_url',   label:'Twitter/X', placeholder:'https://twitter.com/...' },
      { key:'instagram_url', label:'Instagram', placeholder:'https://instagram.com/...' },
      { key:'youtube_url',   label:'YouTube',   placeholder:'https://youtube.com/...' },
    ]
  },
  {
    id:'homepage', label:'الصفحة الرئيسية', icon:Image,
    fields:[
      { key:'hero_title',    label:'عنوان البانر الرئيسي',  placeholder:'دائرة جبلة للشؤون الاجتماعية والعمل' },
      { key:'hero_subtitle', label:'الوصف تحت العنوان',     placeholder:'نخدم أبناء جبلة وريفها بكل مهنية وشفافية' },
      { key:'stat_years',    label:'عدد سنوات الخدمة',       placeholder:'20' },
      { key:'about_text',    label:'نبذة عن الدائرة',        placeholder:'نص تعريفي يظهر في الصفحة الرئيسية' },
    ]
  },
  {
    id:'system', label:'إعدادات النظام', icon:Settings,
    fields:[
      { key:'relief_enabled',   label:'فتح نموذج الإغاثة للعموم', type:'boolean' },
      { key:'track_enabled',    label:'تفعيل متابعة الطلبات',     type:'boolean' },
      { key:'chat_enabled',     label:'تفعيل نظام الشات',         type:'boolean' },
      { key:'maintenance_mode', label:'وضع الصيانة',              type:'boolean', danger:true },
      { key:'footer_text',      label:'نص التذييل',               placeholder:'جميع الحقوق محفوظة' },
    ]
  }
]

export default function ContentManagementPage() {
  const { user, profile } = useAuth()
  const { refresh: refreshSettings } = useSiteSettings()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('news')
  const [items,    setItems]    = useState([])
  const [settings, setSettings] = useState({})
  const [loading,  setLoading]  = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form,     setForm]     = useState(EMPTY_ITEM)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [uploading,setUploading]= useState(false)
  const imgRef = useRef()

  useEffect(() => {
    if (profile && profile.role !== 'admin') { navigate('/'); return }
    fetchContent()
    fetchSettings()
  }, [profile])

  const fetchContent = async () => {
    setLoading(true)
    const { data } = await supabase.from('site_content')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setItems(data)
    setLoading(false)
  }

  const fetchSettings = async () => {
    const { data } = await supabase.from('site_settings').select('*')
    if (data) {
      const map = {}
      data.forEach(s => { map[s.key] = s.value })
      setSettings(map)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    const entries = Object.entries(settings)
    for (const [key, value] of entries) {
      await supabase.from('site_settings')
        .upsert({ key, value: String(value), updated_at: new Date().toISOString() }, { onConflict:'key' })
    }
    setSaved(true)
    await refreshSettings()
    setTimeout(() => setSaved(false), 3000)
    setSaving(false)
  }

  const handleImageUpload = async (file) => {
    setUploading(true)
    const path = `content/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('uploads').upload(path, file, { upsert: false })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path)
      setForm(p => ({ ...p, image_url: publicUrl }))
    }
    setUploading(false)
  }

  const saveContent = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    const { data: { user: u } } = await supabase.auth.getUser()
    const payload = {
      ...form,
      author_id: u?.id,
      author_name: profile?.full_name || u?.email,
      updated_at: new Date().toISOString()
    }
    if (editItem) {
      await supabase.from('site_content').update(payload).eq('id', editItem.id)
      setItems(p => p.map(x => x.id === editItem.id ? { ...x, ...payload } : x))
    } else {
      const { data } = await supabase.from('site_content').insert(payload).select().single()
      if (data) setItems(p => [data, ...p])
    }
    setShowForm(false); setEditItem(null); setForm(EMPTY_ITEM)
    setSaving(false)
  }

  const togglePublish = async (item) => {
    const val = !item.is_published
    await supabase.from('site_content').update({ is_published: val }).eq('id', item.id)
    setItems(p => p.map(x => x.id === item.id ? { ...x, is_published: val } : x))
  }

  const deleteItem = async (id) => {
    if (!confirm('حذف هذا العنصر؟')) return
    await supabase.from('site_content').delete().eq('id', id)
    setItems(p => p.filter(x => x.id !== id))
  }

  const openEdit = (item) => {
    setEditItem(item); setForm({ ...item }); setShowForm(true)
  }

  if (!user) return null

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Settings size={22} className="text-green-700"/> إدارة المحتوى والإعدادات
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">كل متغيرات الموقع تُدار من هنا</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key:'news',     label:'الأخبار والإعلانات', icon:Newspaper },
          { key:'settings', label:'إعدادات الموقع',     icon:Settings },
          { key:'hub',      label:'مركز الإدارة',       icon:Building },
          { key:'districts',label:'المناطق',            icon:MapPin },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab===t.key?'text-white shadow':'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            style={activeTab===t.key?{background:'#0D4A35'}:{}}>
            <t.icon size={16}/>{t.label}
          </button>
        ))}
      </div>

      {/* ── NEWS TAB ── */}
      {activeTab === 'news' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-500 text-sm">{items.length} عنصر محتوى</p>
            <button onClick={() => { setShowForm(true); setEditItem(null); setForm(EMPTY_ITEM) }}
              className="flex items-center gap-2 btn-primary text-sm">
              <Plus size={15}/> إضافة خبر/إعلان
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><RefreshCw size={22} className="animate-spin text-green-600"/></div>
          ) : (
            <div className="space-y-3">
              {items.map(item => (
                <div key={item.id} className={`card flex gap-4 p-4 ${!item.is_published?'opacity-60':''}`}>
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="w-20 h-16 rounded-xl object-cover shrink-0"/>
                  ) : (
                    <div className="w-20 h-16 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                      <Image size={20} className="text-gray-300"/>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <span className={`badge text-xs mr-2 ${CONTENT_TYPES[item.type]?.color||'bg-gray-100 text-gray-600'}`}>
                          {CONTENT_TYPES[item.type]?.label}
                        </span>
                        <span className={`badge text-xs ${item.is_published?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>
                          {item.is_published?'منشور':'مخفي'}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => togglePublish(item)} className={`p-1.5 rounded-lg ${item.is_published?'hover:bg-yellow-50 text-yellow-600':'hover:bg-green-50 text-green-600'}`}>
                          {item.is_published ? <EyeOff size={15}/> : <Eye size={15}/>}
                        </button>
                        <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"><Edit2 size={15}/></button>
                        <button onClick={() => deleteItem(item.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={15}/></button>
                      </div>
                    </div>
                    <p className="font-bold text-gray-800 text-sm mt-1 truncate">{item.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{item.body}</p>
                    <p className="text-gray-300 text-xs mt-1">
                      {item.author_name || 'النظام'} • {new Date(item.created_at).toLocaleDateString('ar-SY')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SETTINGS TAB ── */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {saved && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4 text-green-700 text-sm">
              <CheckCircle size={18}/> تم حفظ الإعدادات بنجاح
            </div>
          )}

          {SETTING_GROUPS.map(group => (
            <div key={group.id} className="card">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{background:'#0D4A35'}}>
                  <group.icon size={16} className="text-white"/>
                </div>
                {group.label}
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {group.fields.map(field => (
                  <div key={field.key} className={field.full ? 'md:col-span-2' : ''}>
                    <label className="label text-sm">{field.label}</label>
                    {field.type === 'boolean' ? (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSettings(p => ({ ...p, [field.key]: p[field.key] === 'true' ? 'false' : 'true' }))}
                          className={`relative w-12 h-6 rounded-full transition-all ${settings[field.key]==='true'?'bg-green-500':'bg-gray-300'}`}>
                          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${settings[field.key]==='true'?'left-6':'left-0.5'}`}/>
                        </button>
                        <span className={`text-sm font-medium ${settings[field.key]==='true'?'text-green-600':'text-gray-400'}`}>
                          {settings[field.key]==='true' ? 'مفعّل' : 'معطّل'}
                        </span>
                        {field.danger && settings[field.key]==='true' && (
                          <span className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle size={12}/> الموقع في وضع الصيانة
                          </span>
                        )}
                      </div>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        className="input w-full h-28 resize-y"
                        placeholder={field.placeholder}
                        value={settings[field.key] || ''}
                        onChange={e => setSettings(p => ({ ...p, [field.key]: e.target.value }))}
                      />
                    ) : (
                      <input
                        className="input w-full"
                        placeholder={field.placeholder}
                        value={settings[field.key] || ''}
                        onChange={e => setSettings(p => ({ ...p, [field.key]: e.target.value }))}
                        dir={field.key.includes('url') || field.key.includes('email') || field.key.includes('phone') || field.key.includes('photo') ? 'ltr' : 'rtl'}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="sticky bottom-4">
            <button onClick={saveSettings} disabled={saving}
              className="w-full py-3 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-xl"
              style={{background:'#0D4A35'}}>
              {saving ? <><RefreshCw size={16} className="animate-spin"/>جاري الحفظ...</> : <><Save size={16}/>حفظ جميع الإعدادات</>}
            </button>
          </div>
        </div>
      )}


      {/* ── ADMIN HUB TAB ── */}
      {activeTab === 'hub' && (
        <div className="space-y-5">
          <p className="text-gray-500 text-sm">روابط سريعة لإدارة جميع أقسام المنظومة</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label:'إدارة المستفيدين',  desc:'إضافة وتعديل بيانات المستفيدين', icon:'👥', to:'/beneficiaries', color:'#3B82F6' },
              { label:'طلبات الإغاثة',     desc:'مراجعة ومعالجة الطلبات',         icon:'🆘', to:'/relief-admin', color:'#E24B4A' },
              { label:'الجمعيات',          desc:'إدارة الجمعيات الأهلية',        icon:'🏢', to:'/associations', color:'#7C3AED' },
              { label:'الوحدات الريفية',   desc:'الوحدات والموظفون والصور',      icon:'🌿', to:'/rural-units', color:'#059669' },
              { label:'الموظفون',          desc:'إدارة حسابات الموظفين',         icon:'👤', to:'/employees', color:'#D97706' },
              { label:'التحليلات',         desc:'إحصائيات ومؤشرات الأداء',       icon:'📊', to:'/analytics', color:'#0891B2' },
              { label:'سجل العمليات',      desc:'تتبع كل النشاطات',              icon:'📋', to:'/audit-log', color:'#6B7280' },
              { label:'صحة النظام',        desc:'مراقبة حالة المنظومة',          icon:'💚', to:'/status', color:'#10B981' },
              { label:'رسائل المواطنين',   desc:'رسائل الدعم من المستخدمين',     icon:'💬', to:'/inbox', color:'#8B5CF6' },
              { label:'محادثات الموظفين',  desc:'شات داخلي عام وخاص',           icon:'👥', to:'/staff-chat', color:'#0D4A35' },
              { label:'طلبات الوصول',      desc:'موافقات حسابات جديدة',          icon:'🔑', to:'/access-requests', color:'#F59E0B' },
              { label:'التقارير',          desc:'تصدير التقارير الرسمية',        icon:'📄', to:'/reports', color:'#1A5F7A' },
              { label:'الخريطة',           desc:'التوزيع الجغرافي',              icon:'🗺️', to:'/map', color:'#0D4A35' },
              { label:'الأمان والنسخ',     desc:'سجل الدخول والنسخ الاحتياطي',   icon:'🔐', to:'/security', color:'#1A1A1A' },
              { label:'صفحة عن الدائرة',   desc:'الصفحة التعريفية العامة',       icon:'⚜️', to:'/about', color:'#C9A227' },
            ].map(item => (
              <button key={item.to} onClick={() => navigate(item.to)}
                className="card text-right hover:shadow-md transition-all hover:scale-105 group"
                style={{ borderTop: `3px solid ${item.color}` }}>
                <div className="text-3xl mb-2">{item.icon}</div>
                <p className="font-bold text-gray-800 text-sm mb-1">{item.label}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── DISTRICTS TAB ── */}
      {activeTab === 'districts' && <DistrictsManager/>}

      {/* ── Add/Edit Modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">{editItem ? 'تعديل' : 'إضافة'} محتوى</h3>
              <button onClick={() => { setShowForm(false); setEditItem(null) }}><X size={20}/></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label text-sm">النوع</label>
                <div className="flex gap-2">
                  {Object.entries(CONTENT_TYPES).map(([k,v]) => (
                    <button key={k} onClick={() => setForm(p => ({...p, type:k}))}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${form.type===k?'border-green-600 bg-green-50 text-green-700':'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label text-sm">العنوان <span className="text-red-500">*</span></label>
                <input className="input w-full" value={form.title} onChange={e => setForm(p => ({...p, title:e.target.value}))} placeholder="عنوان الخبر أو الإعلان..."/>
              </div>
              <div>
                <label className="label text-sm">المحتوى</label>
                <textarea className="input w-full h-28 resize-none" value={form.body||''} onChange={e => setForm(p => ({...p, body:e.target.value}))} placeholder="تفاصيل الخبر أو الإعلان..."/>
              </div>
              <div>
                <label className="label text-sm">الصورة</label>
                {form.image_url ? (
                  <div className="relative inline-block">
                    <img src={form.image_url} alt="" className="h-24 rounded-xl object-cover"/>
                    <button onClick={() => setForm(p => ({...p, image_url:''}))}
                      className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">✕</button>
                  </div>
                ) : (
                  <>
                    <input ref={imgRef} type="file" accept="image/*" className="hidden"
                      onChange={e => e.target.files[0] && handleImageUpload(e.target.files[0])}/>
                    <button onClick={() => imgRef.current.click()} disabled={uploading}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-600 transition-colors">
                      {uploading ? <RefreshCw size={14} className="animate-spin"/> : <Upload size={14}/>}
                      {uploading ? 'جاري الرفع...' : 'رفع صورة'}
                    </button>
                    <p className="text-xs text-gray-400 mt-1">أو أدخل رابط الصورة:</p>
                    <input className="input w-full text-sm mt-1" dir="ltr" placeholder="https://..." value={form.image_url||''} onChange={e => setForm(p => ({...p, image_url:e.target.value}))}/>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setForm(p => ({...p, is_published:!p.is_published}))}
                  className={`relative w-11 h-6 rounded-full transition-all ${form.is_published?'bg-green-500':'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.is_published?'left-5':'left-0.5'}`}/>
                </button>
                <label className="text-sm font-semibold text-gray-700">
                  {form.is_published ? 'منشور على الموقع' : 'مخفي (مسودة)'}
                </label>
              </div>
            </div>
            <div className="flex gap-3 p-5 pt-0">
              <button onClick={() => { setShowForm(false); setEditItem(null) }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">إلغاء</button>
              <button onClick={saveContent} disabled={saving || !form.title.trim()}
                className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm"
                style={{background:'#0D4A35'}}>
                {saving ? 'جاري الحفظ...' : editItem ? 'حفظ التعديلات' : 'نشر المحتوى'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
