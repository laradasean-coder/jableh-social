import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import BeneficiaryDetailPage from './BeneficiaryDetailPage'
import { printBeneficiaryCard } from '../components/ui/PrintCard'
import { checkDuplicates } from '../components/ui/DuplicateChecker'
import DuplicateWarning from '../components/ui/DuplicateWarning'
import QRCard from '../components/ui/QRCard'
import {
  Search, Plus, X, Trash2, ChevronRight, ChevronLeft,
  RefreshCw, FileSpreadsheet, QrCode, Printer
} from 'lucide-react'

const CATEGORIES = {
  disabled:    { label:'ذوو الإعاقة',   icon:'♿', color:'#3B82F6', bg:'#EFF6FF' },
  widow:       { label:'الأرامل',        icon:'🕊️', color:'#8B5CF6', bg:'#F5F3FF' },
  orphan:      { label:'الأيتام',        icon:'⭐', color:'#F59E0B', bg:'#FFFBEB' },
  divorced:    { label:'المطلقات',       icon:'🌸', color:'#EC4899', bg:'#FDF2F8' },
  poor_family: { label:'الأسر الفقيرة', icon:'🏠', color:'#10B981', bg:'#F0FDF4' },
}
const EMPTY_FORM = { full_name:'', national_id:'', phone:'', address:'', district:'', gender:'female', birth_date:'', category:'poor_family', status:'active', notes:'' }
const PAGE_SIZE = 20

export default function BeneficiariesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data,       setData]       = useState([])
  const [stats,      setStats]      = useState({})
  const [loading,    setLoading]    = useState(false)
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(0)
  const [showModal,  setShowModal]  = useState(false)
  const [editRow,    setEditRow]    = useState(null)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [saving,     setSaving]     = useState(false)
  const [detailRow,  setDetailRow]  = useState(null)
  const [exporting,  setExporting]  = useState(false)
  const [duplicates, setDuplicates] = useState([])
  const [dupChecking,setDupChecking]= useState(false)
  const [showQR,     setShowQR]     = useState(null)
  const [realtime,   setRealtime]   = useState(null)
  const [filters,    setFilters]    = useState({ category:'', status:'', district:'', search:'' })

  // Realtime subscription
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('beneficiaries-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beneficiaries' }, () => {
        fetchData(); fetchStats()
      })
      .subscribe()
    setRealtime(ch)
    return () => supabase.removeChannel(ch)
  }, [user])

  const fetchStats = useCallback(async () => {
    const { data: rows } = await supabase.from('beneficiaries').select('category')
    if (rows) { const c = {}; rows.forEach(r => { c[r.category] = (c[r.category]||0)+1 }); setStats(c) }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('beneficiaries').select('*', { count:'exact' })
      .order('created_at', { ascending:false })
      .range(page*PAGE_SIZE, (page+1)*PAGE_SIZE-1)
    if (filters.category) q = q.eq('category', filters.category)
    if (filters.status)   q = q.eq('status', filters.status)
    if (filters.district) q = q.ilike('district', `%${filters.district}%`)
    if (filters.search)   q = q.ilike('full_name', `%${filters.search}%`)
    const { data: rows, count } = await q
    setData(rows || []); setTotal(count || 0); setLoading(false)
  }, [filters, page])

  useEffect(() => { if (user) { fetchStats(); fetchData() } }, [user, filters, page])

  const applyFilters = f => { setFilters(f); setPage(0) }

  // Check duplicates when name or national_id changes
  const checkDup = async () => {
    if (!form.full_name || editRow) return
    setDupChecking(true)
    const dups = await checkDuplicates(form.full_name, form.national_id)
    setDuplicates(dups)
    setDupChecking(false)
  }

  const handleSave = async (force = false) => {
    if (!form.full_name || !form.category) return
    if (!force && !editRow) {
      const dups = await checkDuplicates(form.full_name, form.national_id)
      if (dups.length > 0) { setDuplicates(dups); return }
    }
    setSaving(true)
    if (editRow) await supabase.from('beneficiaries').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editRow.id)
    else         await supabase.from('beneficiaries').insert({ ...form, source: 'manual' })
    setSaving(false); setShowModal(false); setEditRow(null); setForm(EMPTY_FORM); setDuplicates([])
    fetchData(); fetchStats()
  }

  const handleDelete = async id => {
    if (!confirm('هل تريد حذف هذا المستفيد؟')) return
    await supabase.from('beneficiaries').delete().eq('id', id)
    fetchData(); fetchStats()
  }

  const exportToExcel = async () => {
    setExporting(true)
    const { data: all } = await supabase.from('beneficiaries').select('*').order('created_at', { ascending: false })
    const XLSX = await import('xlsx')
    const headers = ['الاسم','الرقم الوطني','الهاتف','العنوان','المنطقة','الجنس','تاريخ الميلاد','الفئة','الحالة','ملاحظات','تاريخ التسجيل']
    const rows = (all||[]).map(b => [
      b.full_name, b.national_id||'', b.phone||'', b.address||'', b.district||'',
      b.gender==='male'?'ذكر':'أنثى', b.birth_date||'',
      CATEGORIES[b.category]?.label||b.category,
      b.status==='active'?'نشط':b.status==='pending'?'معلق':'غير نشط',
      b.notes||'', new Date(b.created_at).toLocaleDateString('ar')
    ])
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    ws['!cols'] = headers.map(() => ({ wch: 18 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'المستفيدون')
    XLSX.writeFile(wb, `المستفيدون_${new Date().toLocaleDateString('ar')}.xlsx`)
    setExporting(false)
  }

  if (!user) return <div className="text-center py-20"><button onClick={() => navigate('/login')} className="btn-primary">تسجيل الدخول</button></div>
  if (detailRow) return <BeneficiaryDetailPage beneficiary={detailRow} onBack={() => setDetailRow(null)} onEdit={r => { setDetailRow(null); setEditRow(r); setForm({...r}); setShowModal(true) }}/>

  return (
    <div className="space-y-5" dir="rtl">
      {showQR && <QRCard beneficiary={showQR} onClose={() => setShowQR(null)}/>}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">قسم الخدمات الاجتماعية</h1>
          <p className="text-gray-500 text-sm">{total} مستفيد مسجّل
            {realtime && <span className="mr-2 text-green-500 text-xs">● مباشر</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportToExcel} disabled={exporting}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-xl text-sm font-semibold">
            <FileSpreadsheet size={14}/>{exporting ? 'جاري...' : 'Excel'}
          </button>
          <button onClick={() => { setShowModal(true); setEditRow(null); setForm(EMPTY_FORM); setDuplicates([]) }}
            className="flex items-center gap-2 btn-primary text-sm">
            <Plus size={15}/> إضافة مستفيد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
        {Object.entries(CATEGORIES).map(([k,v]) => (
          <button key={k} onClick={() => applyFilters({...filters, category: filters.category===k?'':k})}
            className={`rounded-2xl p-3 text-center transition-all hover:scale-105 border-2 ${filters.category===k ? 'border-blue-400 shadow-md' : 'border-transparent'}`}
            style={{ backgroundColor: v.bg }}>
            <div className="text-xl mb-1">{v.icon}</div>
            <div className="font-bold text-lg" style={{ color: v.color }}>{stats[k]||0}</div>
            <div className="text-xs text-gray-500 leading-tight">{v.label}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="card flex flex-wrap gap-3 items-center p-4">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input pr-9 text-sm" placeholder="بحث بالاسم..."
            value={filters.search} onChange={e => applyFilters({...filters, search:e.target.value})}/>
        </div>
        <select className="input text-sm w-auto" value={filters.category} onChange={e => applyFilters({...filters,category:e.target.value})}>
          <option value="">كل الفئات</option>
          {Object.entries(CATEGORIES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="input text-sm w-auto" value={filters.status} onChange={e => applyFilters({...filters,status:e.target.value})}>
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="pending">معلق</option>
          <option value="inactive">غير نشط</option>
        </select>
        <input className="input text-sm w-32" placeholder="المنطقة" value={filters.district}
          onChange={e => applyFilters({...filters,district:e.target.value})}/>
        {(filters.search||filters.category||filters.status||filters.district) && (
          <button onClick={() => applyFilters({category:'',status:'',district:'',search:''})}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
            <X size={13}/> مسح
          </button>
        )}
        <button onClick={() => { fetchData(); fetchStats() }} className="p-2 hover:bg-gray-100 rounded-xl">
          <RefreshCw size={15} className={loading?'animate-spin text-blue-500':'text-gray-400'}/>
        </button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-14"><RefreshCw size={24} className="animate-spin text-blue-400"/></div>
        ) : data.length === 0 ? (
          <div className="text-center py-14 text-gray-400"><p className="text-4xl mb-3">📋</p><p>لا توجد سجلات</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['الاسم','الرقم الوطني','الفئة','المنطقة','الحالة','الهاتف','إجراءات'].map(h => (
                  <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button onClick={() => setDetailRow(row)} className="font-semibold text-blue-700 hover:underline">{row.full_name}</button>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs" dir="ltr">{row.national_id||'—'}</td>
                    <td className="px-4 py-3">
                      <span className="badge text-xs" style={{ background: CATEGORIES[row.category]?.bg, color: CATEGORIES[row.category]?.color }}>
                        {CATEGORIES[row.category]?.icon} {CATEGORIES[row.category]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{row.district||'—'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${row.status==='active'?'bg-green-100 text-green-700':row.status==='pending'?'bg-yellow-100 text-yellow-700':'bg-gray-100 text-gray-500'}`}>
                        {row.status==='active'?'نشط':row.status==='pending'?'معلق':'غير نشط'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs" dir="ltr">{row.phone||'—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => { setEditRow(row); setForm({...row}); setShowModal(true); setDuplicates([]) }}
                          className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg" title="تعديل">✏️</button>
                        <button onClick={() => printBeneficiaryCard(row)}
                          className="p-1.5 hover:bg-purple-50 text-purple-600 rounded-lg" title="طباعة">
                          <Printer size={13}/>
                        </button>
                        <button onClick={() => setShowQR(row)}
                          className="p-1.5 hover:bg-green-50 text-green-600 rounded-lg" title="QR بطاقة">
                          <QrCode size={13}/>
                        </button>
                        <button onClick={() => handleDelete(row.id)}
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg" title="حذف">
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE,total)} من {total}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p=>p-1)} disabled={page===0} className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={18}/></button>
            <span className="px-3 py-1.5 bg-gray-100 rounded-xl text-sm font-medium">{page+1}</span>
            <button onClick={() => setPage(p=>p+1)} disabled={(page+1)*PAGE_SIZE>=total} className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={18}/></button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl my-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800 text-lg">{editRow ? 'تعديل بيانات' : 'إضافة مستفيد جديد'}</h3>
              <button onClick={() => { setShowModal(false); setDuplicates([]) }}><X size={20}/></button>
            </div>

            <DuplicateWarning
              duplicates={duplicates}
              onDismiss={() => setDuplicates([])}
              onProceed={() => { setDuplicates([]); handleSave(true) }}
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label text-sm">الاسم الكامل <span className="text-red-500">*</span></label>
                <input className="input w-full" value={form.full_name}
                  onChange={e => setForm(p => ({...p, full_name: e.target.value}))}
                  onBlur={checkDup}/>
              </div>
              {[
                { key:'national_id', label:'الرقم الوطني' },
                { key:'phone',       label:'رقم الهاتف' },
                { key:'address',     label:'العنوان', span:2 },
                { key:'district',    label:'المنطقة' },
                { key:'birth_date',  label:'تاريخ الميلاد', type:'date' },
              ].map(f => (
                <div key={f.key} className={f.span ? `col-span-${f.span}` : ''}>
                  <label className="label text-sm">{f.label}</label>
                  <input className="input w-full" type={f.type||'text'}
                    value={form[f.key]||''} onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
                    onBlur={f.key==='national_id' ? checkDup : undefined}/>
                </div>
              ))}
              <div>
                <label className="label text-sm">الجنس</label>
                <select className="input w-full" value={form.gender} onChange={e => setForm(p => ({...p, gender: e.target.value}))}>
                  <option value="female">أنثى</option><option value="male">ذكر</option>
                </select>
              </div>
              <div>
                <label className="label text-sm">الفئة <span className="text-red-500">*</span></label>
                <select className="input w-full" value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))}>
                  {Object.entries(CATEGORIES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label text-sm">الحالة</label>
                <select className="input w-full" value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))}>
                  <option value="active">نشط</option><option value="pending">معلق</option><option value="inactive">غير نشط</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="label text-sm">ملاحظات</label>
                <textarea className="input w-full h-16 resize-none" value={form.notes||''} onChange={e => setForm(p => ({...p, notes: e.target.value}))}/>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowModal(false); setDuplicates([]) }} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">إلغاء</button>
              <button onClick={() => handleSave(false)} disabled={saving || dupChecking} className="flex-1 btn-primary text-sm">
                {saving ? 'جاري الحفظ...' : dupChecking ? 'جاري الفحص...' : editRow ? 'حفظ التعديلات' : 'إضافة المستفيد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
