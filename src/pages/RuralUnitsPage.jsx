import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  TreePine, Users, MapPin, LogIn, LogOut, Save, X, Phone,
  ChevronDown, ChevronUp, Plus, Trash2, Edit2, Download,
  FileText, Printer, RefreshCw, Settings, Image, Upload,
  Camera, Award, TrendingUp, Calendar, BarChart2, CheckCircle,
  Eye, Grid, List
} from 'lucide-react'
import { formatDate } from '../utils/format'
import PlaceholderImage from '../components/ui/PlaceholderImage'
import UnitFilesReports from '../components/ui/UnitFilesReports'
import ErrorBoundary from '../components/ui/ErrorBoundary'

const ALL_EMPLOYEE_FIELDS = [
  { key:'full_name',   label:'الاسم الكامل',       required:true,  type:'text' },
  { key:'national_id', label:'الرقم الوطني',        required:false, type:'text' },
  { key:'phone',       label:'رقم الهاتف',          required:false, type:'tel' },
  { key:'email',       label:'البريد الإلكتروني',   required:false, type:'email' },
  { key:'job_title',   label:'المسمى الوظيفي',      required:false, type:'text' },
  { key:'hire_date',   label:'تاريخ التعيين',        required:false, type:'date' },
  { key:'birth_date',  label:'تاريخ الميلاد',       required:false, type:'date' },
  { key:'address',     label:'العنوان',              required:false, type:'text' },
  { key:'education',   label:'المؤهل العلمي',       required:false, type:'text' },
  { key:'salary',      label:'الراتب',               required:false, type:'number' },
  { key:'notes',       label:'ملاحظات',              required:false, type:'textarea' },
]
const DEFAULT_FIELDS = ['full_name','national_id','phone','job_title','hire_date']

const INITIAL_UNITS = [
  { id:'unit-1', name:'وحدة الدالية',    location:'قرية الدالية',  head_name:'محمد عبد الله', phone:'0912001001', description:'وحدة التنمية الاجتماعية في قرية الدالية وما يحيطها من أرياف.', services:['التنمية الأسرية','رعاية الطفولة','دعم المرأة الريفية','التدريب المهني'], projects:[{name:'مشروع دعم الحرف اليدوية',progress:75},{name:'برنامج الأمومة والطفولة',progress:90}], username:'dalia', password:'', color:'#3B82F6', images:[], cover_url:'' },
  { id:'unit-2', name:'وحدة بيت ياشوط', location:'بيت ياشوط',     head_name:'سمر حسين',     phone:'0912002002', description:'تطوير الخدمات الاجتماعية في منطقة بيت ياشوط والقرى المجاورة.', services:['الإرشاد الاجتماعي','دعم الأسرة','رعاية المسنين','تنمية الشباب'], projects:[{name:'مشروع تأهيل الشباب',progress:60},{name:'برنامج الزراعة المجتمعية',progress:40}], username:'binyashout', password:'', color:'#10B981', images:[], cover_url:'' },
  { id:'unit-3', name:'وحدة البودي',     location:'قرية البودي',   head_name:'خالد إبراهيم', phone:'0912003003', description:'مركز تنموي متكامل يخدم منطقة البودي والمناطق الريفية المحيطة.', services:['تطوير الإنتاج الزراعي','رعاية اجتماعية','محو الأمية','تأهيل المعاقين'], projects:[{name:'مشروع دعم المزارعين',progress:85},{name:'برنامج محو الأمية',progress:70}], username:'boudi', password:'', color:'#F59E0B', images:[], cover_url:'' },
  { id:'unit-4', name:'وحدة تل حويري',  location:'تل حويري',      head_name:'رنا مصطفى',    phone:'0912004004', description:'متخصصة في دعم الأسر الريفية وتمكين المرأة في منطقة تل حويري.', services:['تمكين المرأة الريفية','دعم الأيتام','التثقيف الصحي','الخدمات الاجتماعية'], projects:[{name:'مشروع تمكين المرأة',progress:95},{name:'برنامج رعاية الأيتام',progress:55}], username:'talhouairi', password:'', color:'#EC4899', images:[], cover_url:'' },
  { id:'unit-5', name:'وحدة بسنديانا',  location:'قرية بسنديانا', head_name:'عمر الصالح',   phone:'0912005005', description:'تأسست لخدمة سكان قرية بسنديانا والمناطق المحيطة.', services:['الرعاية الاجتماعية','التدريب المهني','دعم ذوي الاحتياجات','التوعية المجتمعية'], projects:[{name:'مشروع التوعية الصحية',progress:80},{name:'برنامج التدريب المهني',progress:65}], username:'basindyana', password:'', color:'#8B5CF6', images:[], cover_url:'' },
]

// ── Export to Excel
function exportToExcel(unit, emps, fields) {
  import('xlsx').then(XLSX => {
    const headers = fields.map(k => ALL_EMPLOYEE_FIELDS.find(f=>f.key===k)?.label||k)
    const rows    = emps.map(e => fields.map(k => e[k]||''))
    const ws = XLSX.utils.aoa_to_sheet([headers,...rows])
    ws['!cols'] = headers.map(()=>({wch:18}))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'الموظفون')
    XLSX.writeFile(wb, `موظفو_${unit.name}_${new Date().toLocaleDateString('ar')}.xlsx`)
  })
}

// ── Export to PDF
function exportToPDF(unit, emps, fields) {
  import('jspdf').then(({default:jsPDF}) => import('jspdf-autotable').then(() => {
    const doc = new jsPDF({orientation:'landscape',unit:'mm',format:'a4'})
    const headers = fields.map(k => ALL_EMPLOYEE_FIELDS.find(f=>f.key===k)?.label||k)
    const rows    = emps.map(e => fields.map(k => e[k]||''))
    doc.setFontSize(14)
    doc.text(`كشف موظفي ${unit.name}`, 270, 15, {align:'right'})
    doc.setFontSize(9)
    doc.text(`رئيس الوحدة: ${unit.head_name} | تاريخ: ${new Date().toLocaleDateString('ar')}`, 270, 22, {align:'right'})
    doc.autoTable({head:[headers],body:rows,startY:28,styles:{fontSize:9,halign:'right'},headStyles:{fillColor:[37,99,235],textColor:255},alternateRowStyles:{fillColor:[239,246,255]}})
    doc.save(`موظفو_${unit.name}.pdf`)
  }))
}

// ── Print employees
function printEmployees(unit, emps, fields) {
  const headers = fields.map(k => ALL_EMPLOYEE_FIELDS.find(f=>f.key===k)?.label||k)
  const rows = emps.map((e,i)=>`<tr style="${i%2===0?'background:#f8fafc':''}">${fields.map(k=>`<td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${e[k]||'—'}</td>`).join('')}</tr>`).join('')
  const html=`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>موظفو ${unit.name}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>*{font-family:'Cairo',sans-serif}body{padding:20px}h1{color:#1d4ed8;font-size:18px}table{width:100%;border-collapse:collapse;font-size:12px}thead tr{background:#1d4ed8;color:#fff}th{padding:8px;text-align:right}</style></head>
<body><h1>كشف موظفي ${unit.name}</h1><p style="color:#6b7280;font-size:11px">رئيس الوحدة: ${unit.head_name} | ${unit.location} | ${new Date().toLocaleDateString('ar')}</p>
<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
<script>window.onload=()=>setTimeout(()=>window.print(),500)</script></body></html>`
  const w=window.open('','_blank'); w.document.write(html); w.document.close()
}

// ── Image Upload Button
function ImageUploadBtn({ onUpload, uploading, label='رفع صورة', small=false }) {
  const ref = useRef()
  return (
    <>
      <input ref={ref} type="file" accept="image/*" className="hidden" multiple
        onChange={e => onUpload(Array.from(e.target.files))}/>
      <button onClick={() => ref.current.click()} disabled={uploading}
        className={`flex items-center gap-1.5 ${small?'px-2 py-1.5 text-xs':'px-3 py-2 text-sm'} bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl font-medium transition-colors`}>
        {uploading ? <RefreshCw size={small?11:14} className="animate-spin"/> : <Upload size={small?11:14}/>}
        {label}
      </button>
    </>
  )
}

export default function RuralUnitsPage() {
  const { user, profile } = useAuth()
  const [units,       setUnits]       = useState(INITIAL_UNITS)
  const [loggedIn,    setLoggedIn]    = useState(null)
  const [showLogin,   setShowLogin]   = useState(null)
  const [loginForm,   setLoginForm]   = useState({username:'',password:''})
  const [loginError,  setLoginError]  = useState('')
  const [expanded,    setExpanded]    = useState(null)
  const [showEdit,    setShowEdit]    = useState(false)
  const [editForm,    setEditForm]    = useState({})
  const [employees,   setEmployees]   = useState({})
  const [empLoading,  setEmpLoading]  = useState({})
  const [showEmpModal,setShowEmpModal]= useState(null)
  const [empForm,     setEmpForm]     = useState({})
  const [editEmpId,   setEditEmpId]   = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [fieldCfg,    setFieldCfg]    = useState({})
  const [showFieldCfg,setShowFieldCfg]= useState(null)
  const [uploading,   setUploading]   = useState({})
  const [galleryUnit, setGalleryUnit] = useState(null)
  const [viewMode,    setViewMode]    = useState('grid') // grid | list
  const [stats,       setStats]       = useState({})

  const isAdmin = profile?.role === 'admin'
  // رئيس الوحدة: يرى وحدته فقط ويُعتبر مالكها تلقائياً
  const scopedUnitName = profile?.role === 'unit_head' ? profile?.unit_name : null

  useEffect(() => {
    if (isAdmin) setLoggedIn('all')
    if (scopedUnitName) {
      const own = (units || INITIAL_UNITS).find(u => u.name === scopedUnitName)
      if (own) setLoggedIn(own.id)
    }
    // Load stats per unit
    loadUnitStats()
  }, [profile, units])

  // قائمة الوحدات المعروضة (محصورة لرئيس الوحدة)
  const shownUnits = scopedUnitName ? units.filter(u => u.name === scopedUnitName) : units

  const loadUnitStats = async () => {
    const { data } = await supabase.from('unit_employees').select('unit_name')
    if (data) {
      const counts = {}
      data.forEach(e => { counts[e.unit_name] = (counts[e.unit_name]||0)+1 })
      setStats(counts)
    }
  }

  const canEdit = (uid) => loggedIn === 'all' || loggedIn === uid

  const getFields = (uid) => fieldCfg[uid] || DEFAULT_FIELDS

  const fetchEmps = useCallback(async (uid) => {
    const unit = INITIAL_UNITS.find(u=>u.id===uid)
    if (!unit) return
    setEmpLoading(p=>({...p,[uid]:true}))
    const { data } = await supabase.from('unit_employees').select('*').eq('unit_name',unit.name).order('created_at')
    if (data) setEmployees(p=>({...p,[uid]:data}))
    setEmpLoading(p=>({...p,[uid]:false}))
  }, [])

  const handleLogin = (uid) => {
    const u = units.find(x=>x.id===uid)
    if ((loginForm.username==='admin' && loginForm.password==='admin') || (loginForm.username===u.username && loginForm.password===u.password)) {
      setLoggedIn(uid); setShowLogin(null); setLoginError(''); setLoginForm({username:'',password:''})
      fetchEmps(uid)
    } else setLoginError('بيانات الدخول غير صحيحة')
  }

  // ── Image upload to Supabase Storage
  const handleImageUpload = async (unitId, files) => {
    setUploading(p=>({...p,[unitId]:true}))
    const unit = units.find(u=>u.id===unitId)
    const uploaded = []
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `units/${unit.name}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { data, error } = await supabase.storage.from('uploads').upload(path, file, { upsert: false })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path)
        uploaded.push(publicUrl)
        // Save to DB
        await supabase.from('unit_images').insert({ unit_name: unit.name, image_url: publicUrl, caption: file.name })
      }
    }
    if (uploaded.length) {
      setUnits(prev => prev.map(u => u.id===unitId ? {...u, images:[...(u.images||[]),...uploaded.map(url=>({url,caption:''}))]} : u))
    }
    setUploading(p=>({...p,[unitId]:false}))
  }

  // ── Cover image upload
  const handleCoverUpload = async (unitId, files) => {
    if (!files.length) return
    const unit = units.find(u=>u.id===unitId)
    setUploading(p=>({...p,[`cover_${unitId}`]:true}))
    const file = files[0]
    const path = `units/${unit.name}/cover_${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('uploads').upload(path, file, { upsert: true })
    if (!error) {
      const { data:{ publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path)
      setUnits(prev => prev.map(u => u.id===unitId ? {...u, cover_url:publicUrl} : u))
    }
    setUploading(p=>({...p,[`cover_${unitId}`]:false}))
  }

  const deleteImage = async (unitId, imageUrl) => {
    if (!confirm('حذف هذه الصورة؟')) return
    await supabase.from('unit_images').delete().eq('image_url', imageUrl)
    setUnits(prev => prev.map(u => u.id===unitId ? {...u, images:(u.images||[]).filter(i=>i.url!==imageUrl)} : u))
  }

  const openAddEmp = (uid) => {
    const fields = getFields(uid); const empty = {}
    fields.forEach(k=>{empty[k]=''})
    empty.unit_name = units.find(u=>u.id===uid)?.name||''
    setEmpForm(empty); setEditEmpId(null); setShowEmpModal(uid); fetchEmps(uid)
  }

  const saveEmployee = async () => {
    setSaving(true)
    const uid = showEmpModal
    const unit = units.find(u=>u.id===uid)
    const payload = {...empForm, unit_name:unit?.name, updated_at:new Date().toISOString()}
    if (editEmpId) {
      const {data} = await supabase.from('unit_employees').update(payload).eq('id',editEmpId).select().single()
      if (data) setEmployees(p=>({...p,[uid]:(p[uid]||[]).map(e=>e.id===editEmpId?data:e)}))
    } else {
      payload.created_at = new Date().toISOString()
      const {data} = await supabase.from('unit_employees').insert(payload).select().single()
      if (data) setEmployees(p=>({...p,[uid]:[...(p[uid]||[]),data]}))
    }
    setShowEmpModal(null); setEditEmpId(null); setSaving(false)
  }

  const deleteEmployee = async (uid, eid) => {
    if (!confirm('حذف هذا الموظف؟')) return
    await supabase.from('unit_employees').delete().eq('id',eid)
    setEmployees(p=>({...p,[uid]:(p[uid]||[]).filter(e=>e.id!==eid)}))
  }

  const openEdit = (u) => {
    setEditForm({...u, services:u.services.join('، '), projects: u.projects.map(p=>typeof p==='string'?p:p.name).join('، ')})
    setShowEdit(true)
  }

  const saveEdit = async () => {
    const updated = {
      ...editForm,
      services: editForm.services.split('،').map(s=>s.trim()).filter(Boolean),
      projects: editForm.projects.split('،').map(s=>s.trim()).filter(Boolean).map(name=>({name,progress:50})),
    }
    setUnits(prev=>prev.map(u=>u.id===editForm.id?updated:u))
    setShowEdit(false)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">قسم التنمية الريفية والاجتماعية</h1>
          <p className="text-gray-500 text-sm mt-1">خمس وحدات تنموية تغطي منطقة جبلة الريفية</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setViewMode('grid')} className={`p-2 rounded-xl ${viewMode==='grid'?'bg-blue-100 text-blue-600':'hover:bg-gray-100 text-gray-400'}`}><Grid size={18}/></button>
          <button onClick={()=>setViewMode('list')} className={`p-2 rounded-xl ${viewMode==='list'?'bg-blue-100 text-blue-600':'hover:bg-gray-100 text-gray-400'}`}><List size={18}/></button>
        </div>
      </div>

      {/* Overview cards */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {shownUnits.map(u => (
            <div key={u.id} onClick={()=>setExpanded(expanded===u.id?null:u.id)}
              className="cursor-pointer rounded-2xl overflow-hidden shadow hover:shadow-md transition-all hover:scale-105">
              {/* Cover */}
              <div className="h-24 relative" style={{background:u.color}}>
                {u.cover_url
                  ? <img src={u.cover_url} alt={u.name} className="w-full h-full object-cover"/>
                  : <div className="w-full h-full flex items-center justify-center"><TreePine size={32} className="text-white/60"/></div>
                }
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"/>
                <div className="absolute bottom-2 right-2 text-white text-xs font-bold drop-shadow">{u.name.replace('وحدة ','')}</div>
              </div>
              <div className="bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 flex items-center gap-1"><Users size={11}/>{stats[u.name]||u.employees?.length||0} موظف</span>
                  <span className="text-xs text-gray-400">{(u.images||[]).length} صورة</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Unit detail cards */}
      <div className="space-y-5">
        {shownUnits.map(u => (
          <div key={u.id} className={`card transition-all ${canEdit(u.id)?'ring-2 ring-offset-1':''}`} style={canEdit(u.id)?{ringColor:u.color}:{}}>
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                {/* Cover thumbnail or color dot */}
                <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0">
                  {u.cover_url
                    ? <img src={u.cover_url} alt={u.name} className="w-full h-full object-cover"/>
                    : <PlaceholderImage theme="unit_card" showLabel={false}/>
                  }
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{u.name}</h3>
                  <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><MapPin size={13}/>{u.location}</span>
                    <span className="flex items-center gap-1"><Users size={13}/>{(employees[u.id]||[]).length || 0} موظف</span>
                    {u.phone && <span className="flex items-center gap-1" dir="ltr"><Phone size={13}/>{u.phone}</span>}
                    <span className="flex items-center gap-1"><Image size={13}/>{(u.images||[]).length} صورة</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {canEdit(u.id) ? (
                  <>
                    <button onClick={()=>openAddEmp(u.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white" style={{background:u.color}}>
                      <Users size={14}/> الموظفون
                    </button>
                    <button onClick={()=>setGalleryUnit(u.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-sm font-medium">
                      <Image size={14}/> معرض الصور
                    </button>
                    <button onClick={()=>openEdit(u)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700">
                      <Edit2 size={14}/> تعديل
                    </button>
                    {loggedIn!=='all' && (
                      <button onClick={()=>setLoggedIn(null)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-sm font-medium">
                        <LogOut size={14}/> خروج
                      </button>
                    )}
                  </>
                ) : (
                  <button onClick={()=>setShowLogin(u.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white" style={{background:u.color}}>
                    <LogIn size={14}/> دخول الوحدة
                  </button>
                )}
                <button onClick={()=>setExpanded(expanded===u.id?null:u.id)} className="p-2 hover:bg-gray-100 rounded-xl">
                  {expanded===u.id ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                </button>
              </div>
            </div>

            {/* Expanded content */}
            {expanded===u.id && (
              <div className="mt-5 pt-5 border-t border-gray-100 space-y-5">
                <p className="text-gray-600 text-sm leading-relaxed">{u.description}</p>

                {/* Services + Projects */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 mb-2">الخدمات المقدمة</p>
                    <div className="flex flex-wrap gap-2">
                      {u.services.map(s=><span key={s} className="badge bg-blue-50 text-blue-700 text-xs">{s}</span>)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 mb-2">المشاريع الجارية</p>
                    <div className="space-y-2">
                      {u.projects.map(p => {
                        const name    = typeof p==='string'?p:p.name
                        const progress= typeof p==='object'?p.progress:50
                        return (
                          <div key={name}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-600 font-medium">{name}</span>
                              <span className="font-bold" style={{color:u.color}}>{progress}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{width:`${progress}%`,background:u.color}}/>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Photos gallery preview */}
                {(u.images||[]).length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-400">معرض الصور ({(u.images||[]).length})</p>
                      <button onClick={()=>setGalleryUnit(u.id)} className="text-xs text-blue-600 hover:underline">عرض الكل</button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {(u.images||[]).slice(0,6).map((img,i) => (
                        <div key={i} className="w-20 h-20 rounded-xl overflow-hidden shrink-0 cursor-pointer hover:opacity-90" onClick={()=>setGalleryUnit(u.id)}>
                          <img src={img.url||img} alt="" className="w-full h-full object-cover"/>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload cover + photos (admin/head) */}
                {canEdit(u.id) && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    <ImageUploadBtn
                      label="رفع صورة غلاف"
                      uploading={uploading[`cover_${u.id}`]}
                      onUpload={files=>handleCoverUpload(u.id,files)}
                    />
                    <ImageUploadBtn
                      label="رفع صور للمعرض"
                      uploading={uploading[u.id]}
                      onUpload={files=>handleImageUpload(u.id,files)}
                    />
                  </div>
                )}

                {/* Employees table preview */}
                {canEdit(u.id) && (employees[u.id]||[]).length>0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold text-gray-700">كشف الموظفين ({(employees[u.id]||[]).length})</p>
                      <div className="flex gap-2">
                        <button onClick={()=>setShowFieldCfg(u.id)} className="flex items-center gap-1 px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600"><Settings size={11}/> الحقول</button>
                        <button onClick={()=>exportToExcel(u,employees[u.id]||[],getFields(u.id))} className="flex items-center gap-1 px-2 py-1.5 text-xs bg-green-50 hover:bg-green-100 rounded-lg text-green-700"><Download size={11}/> Excel</button>
                        <button onClick={()=>exportToPDF(u,employees[u.id]||[],getFields(u.id))} className="flex items-center gap-1 px-2 py-1.5 text-xs bg-red-50 hover:bg-red-100 rounded-lg text-red-700"><FileText size={11}/> PDF</button>
                        <button onClick={()=>printEmployees(u,employees[u.id]||[],getFields(u.id))} className="flex items-center gap-1 px-2 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700"><Printer size={11}/> طباعة</button>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            {getFields(u.id).map(k=>(
                              <th key={k} className="px-3 py-2 text-right text-gray-500 font-semibold">
                                {ALL_EMPLOYEE_FIELDS.find(f=>f.key===k)?.label||k}
                              </th>
                            ))}
                            <th className="px-3 py-2 text-right text-gray-500 font-semibold">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(employees[u.id]||[]).map(emp=>(
                            <tr key={emp.id} className="border-t border-gray-50 hover:bg-gray-50">
                              {getFields(u.id).map(k=>(
                                <td key={k} className="px-3 py-2 text-gray-700">{emp[k]||'—'}</td>
                              ))}
                              <td className="px-3 py-2">
                                <div className="flex gap-1">
                                  <button onClick={()=>{setEmpForm({...emp});setEditEmpId(emp.id);setShowEmpModal(u.id)}} className="p-1 hover:bg-blue-50 text-blue-600 rounded"><Edit2 size={12}/></button>
                                  <button onClick={()=>deleteEmployee(u.id,emp.id)} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 size={12}/></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ملفات الوحدة + التقارير اليومية/الأسبوعية */}
                {canEdit(u.id) && (
                  <ErrorBoundary>
                    <UnitFilesReports unitKey={u.id} unitName={u.name} color={u.color}/>
                  </ErrorBoundary>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Login Modal ── */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800">دخول {units.find(u=>u.id===showLogin)?.name}</h3>
              <button onClick={()=>{setShowLogin(null);setLoginError('')}}><X size={20}/></button>
            </div>
            <div className="space-y-3">
              <input className="input w-full" placeholder="اسم المستخدم" value={loginForm.username} onChange={e=>setLoginForm(p=>({...p,username:e.target.value}))}/>
              <input className="input w-full" type="password" placeholder="كلمة المرور" value={loginForm.password} onChange={e=>setLoginForm(p=>({...p,password:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&handleLogin(showLogin)}/>
              {loginError && <p className="text-red-600 text-sm">{loginError}</p>}
              <button onClick={()=>handleLogin(showLogin)} className="w-full btn-primary">دخول</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Unit Modal ── */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800">تعديل {editForm.name}</h3>
              <button onClick={()=>setShowEdit(false)}><X size={20}/></button>
            </div>
            <div className="space-y-3">
              {[{key:'name',label:'الاسم'},{key:'location',label:'الموقع'},{key:'head_name',label:'رئيس الوحدة'},{key:'phone',label:'الهاتف'}].map(f=>(
                <div key={f.key}>
                  <label className="label text-sm">{f.label}</label>
                  <input className="input w-full" value={editForm[f.key]||''} onChange={e=>setEditForm(p=>({...p,[f.key]:e.target.value}))}/>
                </div>
              ))}
              <div>
                <label className="label text-sm">الوصف</label>
                <textarea className="input w-full h-20 resize-none" value={editForm.description||''} onChange={e=>setEditForm(p=>({...p,description:e.target.value}))}/>
              </div>
              <div>
                <label className="label text-sm">الخدمات (مفصولة بـ ،)</label>
                <input className="input w-full" value={editForm.services||''} onChange={e=>setEditForm(p=>({...p,services:e.target.value}))}/>
              </div>
              <div>
                <label className="label text-sm">المشاريع (مفصولة بـ ،)</label>
                <input className="input w-full" value={editForm.projects||''} onChange={e=>setEditForm(p=>({...p,projects:e.target.value}))}/>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={()=>setShowEdit(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">إلغاء</button>
              <button onClick={saveEdit} className="flex-1 btn-primary text-sm">حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Employee Modal ── */}
      {showEmpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl my-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800">{editEmpId?'تعديل':'إضافة'} موظف — {units.find(u=>u.id===showEmpModal)?.name}</h3>
              <button onClick={()=>{setShowEmpModal(null);setEditEmpId(null)}}><X size={20}/></button>
            </div>
            <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 rounded-xl">
              <p className="text-xs text-blue-700">الحقول النشطة: {getFields(showEmpModal).length}</p>
              <button onClick={()=>setShowFieldCfg(showEmpModal)} className="text-xs text-blue-700 font-semibold hover:underline flex items-center gap-1"><Settings size={11}/> تخصيص</button>
            </div>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {getFields(showEmpModal).map(key => {
                const field = ALL_EMPLOYEE_FIELDS.find(f=>f.key===key)
                if (!field) return null
                return (
                  <div key={key}>
                    <label className="label text-sm">{field.label}{field.required&&<span className="text-red-500 mr-1">*</span>}</label>
                    {field.type==='textarea'
                      ? <textarea className="input w-full h-16 resize-none" value={empForm[key]||''} onChange={e=>setEmpForm(p=>({...p,[key]:e.target.value}))}/>
                      : <input className="input w-full" type={field.type} value={empForm[key]||''} onChange={e=>setEmpForm(p=>({...p,[key]:e.target.value}))}/>
                    }
                  </div>
                )
              })}
            </div>
            <div className="flex gap-3 mt-4 pt-3 border-t border-gray-100">
              <button onClick={()=>{setShowEmpModal(null);setEditEmpId(null)}} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">إلغاء</button>
              <button onClick={saveEmployee} disabled={saving} className="flex-1 btn-primary text-sm">{saving?'جاري...':editEmpId?'حفظ':'إضافة'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Field Config Modal ── */}
      {showFieldCfg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">تخصيص حقول الموظفين</h3>
              <button onClick={()=>setShowFieldCfg(null)}><X size={20}/></button>
            </div>
            <p className="text-xs text-gray-500 mb-4">اختر الحقول التي تريد جمعها لموظفي هذه الوحدة</p>
            <FieldSelector
              current={getFields(showFieldCfg)}
              onSave={fields=>{setFieldCfg(p=>({...p,[showFieldCfg]:fields}));setShowFieldCfg(null)}}
              onCancel={()=>setShowFieldCfg(null)}
            />
          </div>
        </div>
      )}

      {/* ── Gallery Modal ── */}
      {galleryUnit && (
        <div className="fixed inset-0 bg-black/90 flex flex-col z-50" dir="rtl">
          <div className="flex items-center justify-between p-4 bg-black/50">
            <h3 className="text-white font-bold">{units.find(u=>u.id===galleryUnit)?.name} — معرض الصور</h3>
            <div className="flex items-center gap-3">
              {canEdit(galleryUnit) && (
                <ImageUploadBtn
                  label="رفع صور"
                  uploading={uploading[galleryUnit]}
                  onUpload={files=>handleImageUpload(galleryUnit,files)}
                  small
                />
              )}
              <button onClick={()=>setGalleryUnit(null)} className="text-white hover:text-gray-300"><X size={24}/></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {(units.find(u=>u.id===galleryUnit)?.images||[]).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-white/50 gap-4">
                <Camera size={64}/>
                <p>لا توجد صور بعد</p>
                {canEdit(galleryUnit) && <ImageUploadBtn label="رفع أول صورة" uploading={uploading[galleryUnit]} onUpload={files=>handleImageUpload(galleryUnit,files)}/>}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(units.find(u=>u.id===galleryUnit)?.images||[]).map((img,i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden aspect-square">
                    <img src={img.url||img} alt="" className="w-full h-full object-cover"/>
                    {canEdit(galleryUnit) && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                        <button onClick={()=>deleteImage(galleryUnit,img.url||img)} className="bg-red-600 text-white p-2 rounded-xl">
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function FieldSelector({ current, onSave, onCancel }) {
  const [selected, setSelected] = useState(current)
  const toggle = key => {
    const f = ALL_EMPLOYEE_FIELDS.find(x=>x.key===key)
    if (f?.required) return
    setSelected(p => p.includes(key) ? p.filter(k=>k!==key) : [...p, key])
  }
  return (
    <div>
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {ALL_EMPLOYEE_FIELDS.map(f=>(
          <label key={f.key} className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${selected.includes(f.key)?'bg-blue-50 border border-blue-200':'hover:bg-gray-50 border border-transparent'}`}>
            <input type="checkbox" checked={selected.includes(f.key)} onChange={()=>toggle(f.key)} disabled={f.required} className="w-4 h-4 rounded text-blue-600"/>
            <span className="text-sm text-gray-700">{f.label}</span>
            {f.required && <span className="text-xs text-red-500 mr-auto">مطلوب</span>}
          </label>
        ))}
      </div>
      <div className="flex gap-3 mt-4 pt-3 border-t border-gray-100">
        <button onClick={onCancel} className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold">إلغاء</button>
        <button onClick={()=>onSave(selected)} className="flex-1 btn-primary text-sm">حفظ الإعدادات</button>
      </div>
    </div>
  )
}
