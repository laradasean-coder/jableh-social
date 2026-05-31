import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { Shield, Search, Download, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDateTime } from '../utils/format'

const ACTION_TYPES = {
  create:   { label:'إضافة',        tw:'bg-green-100 text-green-700',  icon:'➕' },
  update:   { label:'تعديل',        tw:'bg-blue-100 text-blue-700',    icon:'✏️' },
  delete:   { label:'حذف',          tw:'bg-red-100 text-red-700',      icon:'🗑️' },
  login:    { label:'دخول',         tw:'bg-purple-100 text-purple-700',icon:'🔐' },
  logout:   { label:'خروج',         tw:'bg-gray-100 text-gray-600',    icon:'🚪' },
  approve:  { label:'قبول',         tw:'bg-green-100 text-green-700',  icon:'✅' },
  reject:   { label:'رفض',          tw:'bg-red-100 text-red-700',      icon:'❌' },
  transfer: { label:'تحويل',        tw:'bg-yellow-100 text-yellow-700',icon:'🔄' },
}

export default function AuditLogPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [logs,    setLogs]    = useState([])
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState({ action: '', entity: '' })
  const [loading, setLoading] = useState(false)
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(0)
  const PAGE_SIZE = 50

  useEffect(() => {
    if (profile && profile.role !== 'admin') { navigate('/'); return }
    fetchLogs()
  }, [profile, filter, page])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      let q = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (filter.action) q = q.eq('action', filter.action)
      if (filter.entity) q = q.ilike('entity', `%${filter.entity}%`)
      if (search) q = q.or(`actor.ilike.%${search}%,detail.ilike.%${search}%`)

      const { data, count } = await q
      setLogs(data || [])
      setTotal(count || 0)
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const handleSearch = () => { setPage(0); fetchLogs() }

  const handleExport = async () => {
    const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500)
    const XLSX = await import('xlsx')
    const headers = ['الوقت','المستخدم','الإجراء','الجدول','التفاصيل','IP']
    const rows = (data||[]).map(l => [
      formatDateTime(l.created_at), l.actor||'', ACTION_TYPES[l.action]?.label||l.action,
      l.entity||'', l.detail||'', l.ip||''
    ])
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    ws['!cols'] = headers.map(() => ({ wch: 20 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'سجل العمليات')
    XLSX.writeFile(wb, `سجل_العمليات_${new Date().toLocaleDateString('ar')}.xlsx`)
  }

  const filtered = logs.filter(l => {
    if (!search) return true
    return l.actor?.includes(search) || l.detail?.includes(search)
  })

  if (!user) return null

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield size={22} className="text-gray-500"/> سجل العمليات
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">{total} عملية مسجّلة</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-xl text-sm font-semibold">
            <Download size={14}/> Excel
          </button>
          <button onClick={fetchLogs} disabled={loading} className="btn-secondary text-sm flex items-center gap-2">
            <RefreshCw size={14} className={loading?'animate-spin':''}/> تحديث
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-3 items-center p-4">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input pr-9 text-sm" placeholder="بحث..."
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}/>
        </div>
        <select className="input text-sm w-auto" value={filter.action} onChange={e => setFilter(p=>({...p,action:e.target.value}))}>
          <option value="">كل الإجراءات</option>
          {Object.entries(ACTION_TYPES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="input text-sm w-auto" value={filter.entity} onChange={e => setFilter(p=>({...p,entity:e.target.value}))}>
          <option value="">كل الجداول</option>
          {['مستفيد','طلب إغاثة','موظف وحدة','محادثة دعم','جمعية'].map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><RefreshCw size={24} className="animate-spin text-blue-400"/></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400"><Shield size={40} className="mx-auto mb-3 opacity-30"/><p>لا توجد سجلات</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['الوقت','المستخدم','الإجراء','الجدول','التفاصيل','IP'].map(h=>(
                    <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(l => {
                  const a = ACTION_TYPES[l.action] || { label: l.action, tw: 'bg-gray-100 text-gray-600', icon: '•' }
                  return (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDateTime(l.created_at)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-700 text-xs">{l.actor||'النظام'}</td>
                      <td className="px-4 py-3">
                        <span className={`badge text-xs ${a.tw}`}>{a.icon} {a.label}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{l.entity||'—'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-[200px] truncate" title={l.detail||''}>{l.detail||'—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs" dir="ltr">{l.ip||'—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE,total)} من {total}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p=>p-1)} disabled={page===0} className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30">◀</button>
            <span className="px-3 py-1.5 bg-gray-100 rounded-xl text-sm">{page+1}</span>
            <button onClick={() => setPage(p=>p+1)} disabled={(page+1)*PAGE_SIZE>=total} className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30">▶</button>
          </div>
        </div>
      )}
    </div>
  )
}
