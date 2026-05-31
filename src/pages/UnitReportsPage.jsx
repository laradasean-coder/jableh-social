import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  ClipboardList, RefreshCw, CheckCircle, Calendar, Filter, User, FileText, Download
} from 'lucide-react'

const TYPE_LABEL = { daily: 'يومي', weekly: 'أسبوعي' }

function exportExcel(rows) {
  import('xlsx').then(XLSX => {
    const head = ['الوحدة','النوع','التاريخ','العنوان','المُرسِل','الحالة','المحتوى']
    const body = rows.map(r => [r.unit_name, TYPE_LABEL[r.report_type], r.report_date, r.title||'', r.submitted_by_name||'', r.status==='reviewed'?'تمت المراجعة':'بانتظار', r.body||''])
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]); ws['!cols'] = head.map(()=>({wch:20}))
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'تقارير الوحدات')
    XLSX.writeFile(wb, `تقارير_الوحدات_${new Date().toLocaleDateString('ar')}.xlsx`)
  })
}

function exportPDF(rows) {
  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet"/>
  <style>*{font-family:'Cairo',sans-serif}body{padding:20px}h1{color:#0D4A35;font-size:18px}
  table{width:100%;border-collapse:collapse;font-size:11px;margin-top:10px}thead tr{background:#0D4A35;color:#fff}
  th,td{padding:7px;text-align:right;border:1px solid #e5e7eb;vertical-align:top}</style></head>
  <body><h1>تقارير الوحدات — دائرة جبلة</h1>
  <table><thead><tr><th>الوحدة</th><th>النوع</th><th>التاريخ</th><th>العنوان</th><th>المُرسِل</th><th>المحتوى</th></tr></thead><tbody>
  ${rows.map(r=>`<tr><td>${r.unit_name}</td><td>${TYPE_LABEL[r.report_type]}</td><td>${r.report_date}</td><td>${r.title||''}</td><td>${r.submitted_by_name||''}</td><td>${(r.body||'').replace(/</g,'&lt;')}</td></tr>`).join('')}
  </tbody></table><script>window.onload=()=>setTimeout(()=>window.print(),400)</script></body></html>`
  const w = window.open('','_blank'); w.document.write(html); w.document.close()
}

export default function UnitReportsPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')   // all | daily | weekly
  const [statusFilter, setStatusFilter] = useState('all') // all | submitted | reviewed
  const [open, setOpen] = useState(null)

  const fetchReports = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('unit_reports').select('*').order('created_at', { ascending: false })
    if (typeFilter !== 'all') q = q.eq('report_type', typeFilter)
    if (statusFilter !== 'all') q = q.eq('status', statusFilter)
    const { data } = await q
    setReports(data || [])
    setLoading(false)
  }, [typeFilter, statusFilter])

  useEffect(() => { fetchReports() }, [fetchReports])

  const markReviewed = async (r) => {
    await supabase.from('unit_reports')
      .update({ status: 'reviewed', reviewed_at: new Date().toISOString() })
      .eq('id', r.id)
    setReports(prev => prev.map(x => x.id===r.id ? { ...x, status:'reviewed' } : x))
  }

  const counts = {
    total: reports.length,
    daily: reports.filter(r=>r.report_type==='daily').length,
    weekly: reports.filter(r=>r.report_type==='weekly').length,
    new: reports.filter(r=>r.status==='submitted').length,
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardList size={24} className="text-green-700"/> تقارير الوحدات
          </h1>
          <p className="text-gray-500 text-sm">التقارير اليومية والأسبوعية الواردة من رؤساء الوحدات</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>exportExcel(reports)} disabled={!reports.length}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-sm font-medium disabled:opacity-50">
            <Download size={15}/> Excel
          </button>
          <button onClick={()=>exportPDF(reports)} disabled={!reports.length}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-sm font-medium disabled:opacity-50">
            <FileText size={15}/> PDF
          </button>
          <button onClick={fetchReports} className="flex items-center gap-2 btn-secondary text-sm">
            <RefreshCw size={15}/> تحديث
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:'إجمالي التقارير', value:counts.total, color:'text-gray-800' },
          { label:'يومية', value:counts.daily, color:'text-blue-600' },
          { label:'أسبوعية', value:counts.weekly, color:'text-purple-600' },
          { label:'بانتظار المراجعة', value:counts.new, color:'text-amber-600' },
        ].map(k => (
          <div key={k.label} className="card text-center">
            <div className={`text-3xl font-bold ${k.color}`}>{k.value}</div>
            <div className="text-xs text-gray-500 mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-1 text-sm text-gray-500"><Filter size={14}/> تصفية:</span>
        <select className="input w-auto text-sm" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
          <option value="all">كل الأنواع</option>
          <option value="daily">يومي</option>
          <option value="weekly">أسبوعي</option>
        </select>
        <select className="input w-auto text-sm" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
          <option value="all">كل الحالات</option>
          <option value="submitted">بانتظار المراجعة</option>
          <option value="reviewed">تمت المراجعة</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw size={24} className="animate-spin text-green-600"/></div>
      ) : reports.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-40"/>
          لا توجد تقارير مطابقة.
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="card">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`badge text-xs ${r.report_type==='daily'?'bg-blue-100 text-blue-700':'bg-purple-100 text-purple-700'}`}>
                      تقرير {TYPE_LABEL[r.report_type]}
                    </span>
                    {r.status==='submitted'
                      ? <span className="badge text-xs bg-amber-100 text-amber-700">بانتظار المراجعة</span>
                      : <span className="badge text-xs bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle size={11}/> تمت المراجعة</span>}
                  </div>
                  <h3 className="font-bold text-gray-800 mt-2">{r.title || 'تقرير'}</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                    <span className="font-semibold text-gray-600">{r.unit_name}</span>
                    <span className="flex items-center gap-1"><Calendar size={11}/>{r.report_date}</span>
                    <span className="flex items-center gap-1"><User size={11}/>{r.submitted_by_name || '—'}</span>
                  </div>
                  <p className={`text-sm text-gray-600 mt-2 whitespace-pre-line ${open===r.id?'':'line-clamp-2'}`}>{r.body}</p>
                  {r.body && r.body.length > 120 && (
                    <button onClick={()=>setOpen(open===r.id?null:r.id)} className="text-xs text-blue-600 mt-1 hover:underline">
                      {open===r.id ? 'إخفاء' : 'عرض كامل'}
                    </button>
                  )}
                </div>
                {r.status==='submitted' && (
                  <button onClick={()=>markReviewed(r)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-sm font-medium shrink-0">
                    <CheckCircle size={14}/> تمت المراجعة
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
