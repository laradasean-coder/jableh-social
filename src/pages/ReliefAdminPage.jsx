import { timeAgo } from '../utils/format'
import ReliefKanban from '../components/ui/ReliefKanban'
import { notifyApplicant } from '../lib/notifications'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import {
  HeartHandshake, CheckCircle, XCircle, Eye, RefreshCw,
  Phone, MapPin, Users, AlertCircle, Search,
  ChevronRight, ChevronLeft, Clock, FileText,
  ArrowRight, Star, TrendingUp, LayoutGrid, List
} from 'lucide-react'

const CATEGORIES = {
  disabled:    { label:'ذوو الإعاقة',  icon:'♿', color:'#3B82F6' },
  widow:       { label:'الأرامل',       icon:'🕊️', color:'#8B5CF6' },
  orphan:      { label:'الأيتام',       icon:'⭐', color:'#F59E0B' },
  divorced:    { label:'المطلقات',      icon:'🌸', color:'#EC4899' },
  poor_family: { label:'الأسر الفقيرة',icon:'🏠', color:'#10B981' },
}

// Workflow stages
const STAGES = [
  { key:'pending',     label:'استقبال',    color:'yellow', icon: Clock },
  { key:'reviewed',    label:'مراجعة',     color:'blue',   icon: Eye },
  { key:'committee',   label:'لجنة',       color:'purple', icon: Users },
  { key:'transferred', label:'صرف',        color:'green',  icon: CheckCircle },
  { key:'rejected',    label:'مرفوض',      color:'red',    icon: XCircle },
]

// Priority score calculation
function calcPriority(r) {
  let s = 0
  if (r.family_size)     s += Math.min(r.family_size * 8, 64)
  if (r.has_disability)  s += 30
  if ((r.monthly_income || 0) < 50000) s += 20
  if (r.category === 'orphan')   s += 15
  if (r.category === 'disabled') s += 10
  return Math.min(s, 100)
}

function PriorityBadge({ score }) {
  const color = score >= 80 ? 'red' : score >= 50 ? 'orange' : 'gray'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-${color}-100 text-${color}-700`}>
      <Star size={10} fill="currentColor"/>
      {score}
    </span>
  )
}

function WorkflowBar({ current }) {
  const steps = STAGES.filter(s => s.key !== 'rejected')
  const idx = steps.findIndex(s => s.key === current)
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => {
        const done = i < idx, active = i === idx
        return (
          <div key={s.key} className="flex items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all
              ${done   ? 'bg-green-500 text-white' :
                active ? `bg-${s.color}-500 text-white` :
                         'bg-gray-100 text-gray-400'}`}>
              {done ? '✓' : i+1}
            </div>
            {i < steps.length-1 && (
              <div className={`h-0.5 w-4 ${done ? 'bg-green-400' : 'bg-gray-200'}`}/>
            )}
          </div>
        )
      })}
    </div>
  )
}


export default function ReliefAdminPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [requests,  setRequests]  = useState([])
  const [loading,   setLoading]   = useState(false)
  const [selected,  setSelected]  = useState(null)
  const [filterStage, setFilterStage] = useState('')
  const [search,    setSearch]    = useState('')
  const [processing,setProcessing]= useState(false)
  const [note,      setNote]      = useState('')
  const [page,      setPage]      = useState(0)
  const [total,     setTotal]     = useState(0)
  const [sortBy,    setSortBy]    = useState('created_at')
  const [viewMode,  setViewMode]  = useState('list')  // list | kanban
  const PAGE_SIZE = 10

  useEffect(() => { if (user) fetchRequests() }, [user, filterStage, page])

  const fetchRequests = async () => {
    setLoading(true)
    let q = supabase.from('relief_requests')
      .select('*', { count: 'exact' })
      .order(sortBy === 'priority' ? 'family_size' : 'created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page+1)*PAGE_SIZE - 1)
    if (filterStage) q = q.eq('status', filterStage)
    if (search)      q = q.ilike('full_name', `%${search}%`)
    const { data, count } = await q
    let rows = data || []
    if (sortBy === 'priority') rows = rows.sort((a,b) => calcPriority(b) - calcPriority(a))
    setRequests(rows)
    setTotal(count || 0)
    setLoading(false)
  }

  const advance = async (r, newStatus) => {
    setProcessing(true)
    await supabase.from('relief_requests').update({
      status: newStatus,
      ...(newStatus === 'transferred' ? { transferred_to: null } : {})
    }).eq('id', r.id)
    if (note.trim()) {
      await supabase.from('audit_logs').insert({
        action: newStatus === 'transferred' ? 'transfer' : newStatus === 'rejected' ? 'reject' : 'update',
        entity: 'طلب إغاثة',
        detail: `${r.full_name}: ${note.trim()}`
      })
    }
    // إشعار المتقدم بالقرار عبر SMS (إن توفّر مزوّد)
    if (['transferred','rejected','reviewed'].includes(newStatus) && r.phone) {
      notifyApplicant(r.phone, r.full_name, newStatus).catch(() => {})
    }
    setProcessing(false)
    setSelected(null)
    setNote('')
    fetchRequests()
  }

  const nextStage = (current) => {
    const steps = ['pending','reviewed','committee','transferred']
    const idx = steps.indexOf(current)
    return idx < steps.length - 1 ? steps[idx+1] : null
  }

  const stageStats = STAGES.map(s => ({
    ...s, count: requests.filter(r => r.status === s.key).length
  }))

  if (!user) return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">🔒</div>
      <button onClick={() => navigate('/login')} className="btn-primary">تسجيل الدخول</button>
    </div>
  )

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إدارة طلبات الإغاثة</h1>
          <p className="text-gray-500 text-sm">{total} طلب إجمالاً</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode==='list'?'bg-white shadow text-green-700':'text-gray-400'}`} title="قائمة">
              <List size={16}/>
            </button>
            <button onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-lg transition-all ${viewMode==='kanban'?'bg-white shadow text-green-700':'text-gray-400'}`} title="لوحة">
              <LayoutGrid size={16}/>
            </button>
          </div>
          <button onClick={fetchRequests} disabled={loading} className="btn-secondary text-sm flex items-center gap-2">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> تحديث
          </button>
        </div>
      </div>

      {/* Kanban Stage Stats */}
      <div className="grid grid-cols-5 gap-2">
        {STAGES.map(s => {
          const c = requests.filter(r => r.status === s.key).length
          return (
            <button key={s.key} onClick={() => setFilterStage(filterStage===s.key?'':s.key)}
              className={`rounded-2xl p-3 text-center border-2 transition-all ${filterStage===s.key ? `border-${s.color}-400 bg-${s.color}-50` : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}>
              <div className={`text-xl font-bold text-${s.color}-600`}>{c}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </button>
          )
        })}
      </div>

      {/* Search + Sort */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input pr-9 text-sm" placeholder="بحث بالاسم..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
            onKeyDown={e => e.key === 'Enter' && fetchRequests()}/>
        </div>
        <select className="input text-sm w-auto" value={filterStage} onChange={e => { setFilterStage(e.target.value); setPage(0) }}>
          <option value="">كل المراحل</option>
          {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <button onClick={() => setSortBy(s => s === 'priority' ? 'created_at' : 'priority')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${sortBy==='priority' ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-gray-200 text-gray-600'}`}>
          <TrendingUp size={13}/>{sortBy==='priority' ? 'ترتيب بالأولوية ✓' : 'ترتيب بالأولوية'}
        </button>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <ReliefKanban
          requests={requests}
          onUpdate={fetchRequests}
          onSelect={(r) => { setSelected(r); setNote('') }}
        />
      )}

      {/* Requests Table (list view) */}
      {viewMode === 'list' && (<>
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><RefreshCw size={24} className="animate-spin text-blue-400"/></div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-gray-400"><HeartHandshake size={40} className="mx-auto mb-3 opacity-30"/><p>لا توجد طلبات</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['الاسم','الفئة','الأولوية','المرحلة','التاريخ','إجراء'].map(h => (
                    <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map(r => {
                  const next = nextStage(r.status)
                  const priority = calcPriority(r)
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <button onClick={() => { setSelected(r); setNote('') }}
                          className="font-semibold text-blue-700 hover:underline text-right">
                          {r.full_name}
                        </button>
                        <div className="flex items-center gap-2 mt-1">
                          {r.phone && <span className="text-xs text-gray-400" dir="ltr">{r.phone}</span>}
                          {r.district && <span className="text-xs text-gray-400 flex items-center gap-0.5"><MapPin size={9}/>{r.district}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs">{CATEGORIES[r.category]?.icon} {CATEGORIES[r.category]?.label}</span>
                      </td>
                      <td className="px-4 py-3"><PriorityBadge score={priority}/></td>
                      <td className="px-4 py-3"><WorkflowBar current={r.status}/></td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{timeAgo(r.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => { setSelected(r); setNote('') }}
                            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"><Eye size={13}/></button>
                          {next && r.status !== 'rejected' && (
                            <button onClick={() => advance(r, next)} disabled={processing}
                              className="p-1.5 hover:bg-green-50 text-green-600 rounded-lg" title={`تقدم إلى: ${STAGES.find(s=>s.key===next)?.label}`}>
                              <ArrowRight size={13}/>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
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
            <button onClick={() => setPage(p=>p-1)} disabled={page===0}
              className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={18}/></button>
            <span className="px-3 py-1.5 bg-gray-100 rounded-xl text-sm">{page+1}</span>
            <button onClick={() => setPage(p=>p+1)} disabled={(page+1)*PAGE_SIZE>=total}
              className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={18}/></button>
          </div>
        </div>
      )}
      </>)}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">{selected.full_name}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {/* Workflow */}
              <div>
                <p className="text-xs text-gray-400 mb-2">مراحل الطلب</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {STAGES.filter(s=>s.key!=='rejected').map((s, i, arr) => {
                    const done = STAGES.findIndex(x=>x.key===selected.status) > i
                    const active = s.key === selected.status
                    return (
                      <div key={s.key} className="flex items-center gap-1">
                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
                          ${done ? 'bg-green-100 text-green-700' : active ? `bg-${s.color}-100 text-${s.color}-700` : 'bg-gray-100 text-gray-400'}`}>
                          {done ? '✓' : <s.icon size={12}/>} {s.label}
                        </div>
                        {i < arr.length-1 && <ArrowRight size={12} className="text-gray-300"/>}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Priority */}
              <div className="flex items-center gap-3 bg-orange-50 rounded-xl p-3">
                <TrendingUp size={18} className="text-orange-500"/>
                <div>
                  <p className="text-xs text-gray-500">درجة الأولوية</p>
                  <p className="font-bold text-orange-700 text-lg">{calcPriority(selected)} / 100</p>
                </div>
                <div className="flex-1 bg-orange-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-orange-500" style={{ width: `${calcPriority(selected)}%` }}/>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label:'الهاتف',       value: selected.phone,       dir:'ltr' },
                  { label:'العنوان',      value: selected.address },
                  { label:'المنطقة',      value: selected.district },
                  { label:'الجنس',        value: selected.gender==='male'?'ذكر':'أنثى' },
                  { label:'حجم الأسرة',  value: selected.family_size },
                  { label:'الدخل الشهري',value: selected.monthly_income ? `${selected.monthly_income} ل.س` : 'لا يوجد' },
                  { label:'الفئة',        value: CATEGORIES[selected.category]?.label },
                  { label:'إعاقة',        value: selected.has_disability ? 'نعم' : 'لا' },
                  { label:'رقم بطاقة الإعاقة', value: selected.disability_card_no },
                  { label:'المنطقة',      value: selected.district },
                ].map(f => f.value ? (
                  <div key={f.label}>
                    <p className="text-gray-400 text-xs">{f.label}</p>
                    <p className="font-semibold text-gray-700" dir={f.dir}>{f.value}</p>
                  </div>
                ) : null)}
              </div>

              {selected.situation_description && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">وصف الحالة</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{selected.situation_description}</p>
                </div>
              )}

              {selected.case_image_url && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">صورة الحالة</p>
                  <a href={selected.case_image_url} target="_blank" rel="noreferrer">
                    <img src={selected.case_image_url} alt="الحالة" className="max-h-48 rounded-xl border border-gray-200 object-cover"/>
                  </a>
                </div>
              )}

              {/* Note */}
              <div>
                <label className="label text-sm">ملاحظة (اختيارية)</label>
                <textarea className="input w-full h-16 resize-none text-sm" value={note}
                  onChange={e => setNote(e.target.value)} placeholder="أضف ملاحظة على هذا الإجراء..."/>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {selected.status !== 'rejected' && selected.status !== 'transferred' && (
                  <>
                    {nextStage(selected.status) && (
                      <button onClick={() => advance(selected, nextStage(selected.status))} disabled={processing}
                        className="flex-1 btn-primary text-sm flex items-center justify-center gap-2 min-w-28">
                        <ArrowRight size={14}/>
                        {STAGES.find(s=>s.key===nextStage(selected.status))?.label}
                      </button>
                    )}
                    <button onClick={() => advance(selected, 'rejected')} disabled={processing}
                      className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-sm flex items-center gap-1">
                      <XCircle size={14}/> رفض
                    </button>
                  </>
                )}
                <button onClick={() => setSelected(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
