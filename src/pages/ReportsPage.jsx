import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  FileText, Download, Printer, RefreshCw, CheckCircle,
  BarChart2, Users, Building2, FileSpreadsheet
} from 'lucide-react'

const CATEGORIES = {
  disabled:    { label:'ذوو الإعاقة',   color:'#3B82F6' },
  widow:       { label:'الأرامل',        color:'#8B5CF6' },
  orphan:      { label:'الأيتام',        color:'#F59E0B' },
  divorced:    { label:'المطلقات',       color:'#EC4899' },
  poor_family: { label:'الأسر الفقيرة', color:'#10B981' },
}

async function fetchReportData(dateFrom, dateTo) {
  let bQuery = supabase.from('beneficiaries').select('*')
  if (dateFrom) bQuery = bQuery.gte('created_at', dateFrom)
  if (dateTo)   bQuery = bQuery.lte('created_at', dateTo + 'T23:59:59')

  let rQuery = supabase.from('relief_requests').select('*')
  if (dateFrom) rQuery = rQuery.gte('created_at', dateFrom)
  if (dateTo)   rQuery = rQuery.lte('created_at', dateTo + 'T23:59:59')

  const [{ data: bens }, { data: rels }, { data: assocs }, { data: units }] = await Promise.all([
    bQuery,
    rQuery,
    supabase.from('associations').select('*').eq('is_active', true),
    supabase.from('rural_units').select('*'),
  ])

  const catCounts = {}
  const distCounts = {}
  ;(bens||[]).forEach(b => {
    catCounts[b.category] = (catCounts[b.category]||0) + 1
    distCounts[b.district||'غير محدد'] = (distCounts[b.district||'غير محدد']||0) + 1
  })

  return {
    beneficiaries: bens||[],
    relief: rels||[],
    associations: assocs||[],
    units: units||[],
    catCounts,
    distCounts,
    total: (bens||[]).length,
    pending_relief: (rels||[]).filter(r=>r.status==='pending').length,
  }
}

function generateHTMLReport(data, dateFrom, dateTo) {
  const now = new Date().toLocaleDateString('ar-SY', { year:'numeric', month:'long', day:'numeric' })
  const period = dateFrom && dateTo ? `${dateFrom} — ${dateTo}` : 'جميع الأوقات'

  const catRows = Object.entries(CATEGORIES).map(([k,v]) => `
    <tr>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;font-weight:600">${v.label}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;text-align:center;font-weight:700;color:${v.color}">${data.catCounts[k]||0}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;text-align:center">
        <div style="background:#f3f4f6;border-radius:999px;height:8px;overflow:hidden">
          <div style="height:100%;border-radius:999px;background:${v.color};width:${data.total?Math.round((data.catCounts[k]||0)/data.total*100):0}%"></div>
        </div>
        <small style="color:#9ca3af">${data.total?Math.round((data.catCounts[k]||0)/data.total*100):0}%</small>
      </td>
    </tr>`).join('')

  const distRows = Object.entries(data.distCounts).sort((a,b)=>b[1]-a[1]).map(([d,c]) => `
    <tr>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6">${d}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;text-align:center;font-weight:700;color:#2563eb">${c}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;text-align:center">${data.total?Math.round(c/data.total*100):0}%</td>
    </tr>`).join('')

  const reliefRows = data.relief.slice(0,20).map(r => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${r.full_name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6" dir="ltr">${r.phone}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${CATEGORIES[r.category]?.label||r.category}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:center">
        <span style="padding:3px 10px;border-radius:999px;font-size:11px;background:${r.status==='pending'?'#fef3c7':r.status==='reviewed'?'#dbeafe':r.status==='transferred'?'#d1fae5':'#fee2e2'};color:${r.status==='pending'?'#92400e':r.status==='reviewed'?'#1e40af':r.status==='transferred'?'#065f46':'#991b1b'}">
          ${r.status==='pending'?'معلق':r.status==='reviewed'?'قيد المراجعة':r.status==='transferred'?'محوّل':'مرفوض'}
        </span>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:11px;color:#6b7280">${new Date(r.created_at).toLocaleDateString('ar')}</td>
    </tr>`).join('')

  return `<!DOCTYPE html><html dir="rtl" lang="ar">
<head><meta charset="UTF-8"/><title>تقرير — دائرة جبلة</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet"/>
<style>*{margin:0;padding:0;box-sizing:border-box;font-family:'Cairo',sans-serif}body{background:#fff;color:#1f2937;padding:32px;max-width:960px;margin:0 auto}
.header{border-bottom:3px solid #1d4ed8;padding-bottom:20px;margin-bottom:24px;display:flex;align-items:center;gap:16px}
.logo{width:56px;height:56px;background:#1d4ed8;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:26px;font-weight:800;flex-shrink:0}
h1{font-size:20px;font-weight:800;color:#1d4ed8}
h2{font-size:15px;font-weight:700;color:#1d4ed8;margin:24px 0 10px;padding-bottom:6px;border-bottom:2px solid #eff6ff}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
.kpi{text-align:center;background:#f8fafc;border-radius:10px;padding:14px}
.kpi .v{font-size:26px;font-weight:800;color:#1d4ed8}.kpi .l{font-size:11px;color:#6b7280;margin-top:3px}
table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:24px}
thead tr{background:#1d4ed8;color:#fff}th{padding:9px 12px;text-align:right;font-weight:600}
.footer{margin-top:36px;padding-top:14px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:11px;color:#9ca3af}
@media print{body{padding:12px}.no-print{display:none}}</style></head>
<body>
<div class="header">
  <div class="logo">ج</div>
  <div>
    <p style="font-size:11px;color:#6b7280">الجمهورية العربية السورية — وزارة الشؤون الاجتماعية والعمل</p>
    <h1>دائرة جبلة للشؤون الاجتماعية والعمل</h1>
    <p style="font-size:11px;color:#6b7280;margin-top:4px">الفترة: ${period} | تاريخ الإصدار: ${now}</p>
  </div>
</div>
<div class="kpis">
  <div class="kpi"><div class="v">${data.total}</div><div class="l">إجمالي المستفيدين</div></div>
  <div class="kpi"><div class="v">${data.pending_relief}</div><div class="l">طلبات إغاثة معلقة</div></div>
  <div class="kpi"><div class="v">${data.associations.length}</div><div class="l">جمعية نشطة</div></div>
  <div class="kpi"><div class="v">${data.units.length||5}</div><div class="l">وحدة تنمية ريفية</div></div>
</div>
<h2>توزيع المستفيدين حسب الفئة</h2>
<table><thead><tr><th>الفئة</th><th style="text-align:center">العدد</th><th style="text-align:center">النسبة</th></tr></thead><tbody>${catRows}</tbody></table>
<h2>التوزيع الجغرافي</h2>
<table><thead><tr><th>المنطقة</th><th style="text-align:center">العدد</th><th style="text-align:center">النسبة</th></tr></thead><tbody>${distRows||'<tr><td colspan="3" style="text-align:center;padding:16px;color:#9ca3af">لا توجد بيانات</td></tr>'}</tbody></table>
${data.relief.length>0?`<h2>طلبات الإغاثة (آخر ${Math.min(20,data.relief.length)})</h2>
<table><thead><tr><th>الاسم</th><th>الهاتف</th><th>الفئة</th><th style="text-align:center">الحالة</th><th>التاريخ</th></tr></thead><tbody>${reliefRows}</tbody></table>`:''}
<div class="footer">
  <span>وثيقة رسمية — دائرة جبلة للشؤون الاجتماعية والعمل</span>
  <span>${now}</span>
</div>
<script>window.onload=()=>setTimeout(()=>window.print(),700)</script>
</body></html>`
}

async function exportAllToExcel(data) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  // Sheet 1: Beneficiaries
  const benHeaders = ['الاسم','الرقم الوطني','الهاتف','العنوان','المنطقة','الجنس','تاريخ الميلاد','الفئة','الحالة','ملاحظات','تاريخ التسجيل']
  const benRows = data.beneficiaries.map(b => [
    b.full_name, b.national_id||'', b.phone||'', b.address||'', b.district||'',
    b.gender==='male'?'ذكر':'أنثى', b.birth_date||'',
    CATEGORIES[b.category]?.label||b.category,
    b.status==='active'?'نشط':b.status==='pending'?'معلق':'غير نشط',
    b.notes||'', new Date(b.created_at).toLocaleDateString('ar')
  ])
  const ws1 = XLSX.utils.aoa_to_sheet([benHeaders, ...benRows])
  ws1['!cols'] = benHeaders.map(h => ({ wch: Math.max(h.length*2, 12) }))
  XLSX.utils.book_append_sheet(wb, ws1, 'المستفيدون')

  // Sheet 2: Relief
  if (data.relief.length > 0) {
    const relHeaders = ['الاسم','الهاتف','العنوان','المنطقة','الفئة','حجم الأسرة','الدخل الشهري','الحالة','التاريخ']
    const relRows = data.relief.map(r => [
      r.full_name, r.phone||'', r.address||'', r.district||'',
      CATEGORIES[r.category]?.label||r.category,
      r.family_size||'', r.monthly_income||'',
      r.status==='pending'?'معلق':r.status==='reviewed'?'مراجعة':r.status==='transferred'?'محوّل':'مرفوض',
      new Date(r.created_at).toLocaleDateString('ar')
    ])
    const ws2 = XLSX.utils.aoa_to_sheet([relHeaders, ...relRows])
    ws2['!cols'] = relHeaders.map(h => ({ wch: Math.max(h.length*2, 12) }))
    XLSX.utils.book_append_sheet(wb, ws2, 'طلبات الإغاثة')
  }

  // Sheet 3: Summary
  const sumHeaders = ['الفئة','العدد','النسبة']
  const sumRows = Object.entries(CATEGORIES).map(([k,v]) => [
    v.label, data.catCounts[k]||0,
    data.total ? `${Math.round((data.catCounts[k]||0)/data.total*100)}%` : '0%'
  ])
  const ws3 = XLSX.utils.aoa_to_sheet([sumHeaders, ...sumRows])
  XLSX.utils.book_append_sheet(wb, ws3, 'ملخص الفئات')

  XLSX.writeFile(wb, `تقرير_جبلة_${new Date().toLocaleDateString('ar')}.xlsx`)
}

const REPORT_TYPES = [
  { id:'full', title:'التقرير الشامل', desc:'جميع البيانات — المستفيدون والإغاثة والجمعيات', icon:FileText, color:'blue' },
  { id:'beneficiaries', title:'تقرير المستفيدين', desc:'إحصائيات وتوزيع المستفيدين حسب الفئة والمنطقة', icon:Users, color:'purple' },
  { id:'relief', title:'تقرير طلبات الإغاثة', desc:'الطلبات الواردة والمعالجة خلال الفترة المحددة', icon:BarChart2, color:'red' },
  { id:'associations', title:'تقرير الجمعيات', desc:'دليل الجمعيات النشطة وخدماتها', icon:Building2, color:'green' },
]

import { generateMinisterialPDF } from '../lib/ministerialReport'
import { useSiteSettings } from '../hooks/useSiteSettings'

export default function ReportsPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')
  const [loading,    setLoading]    = useState(false)
  const [generated,  setGenerated]  = useState(false)
  const [exporting,  setExporting]  = useState(false)
  const [minLoading, setMinLoading] = useState(false)
  const now = new Date()
  const [repMonth,   setRepMonth]   = useState(now.getMonth())
  const [repYear,    setRepYear]    = useState(now.getFullYear())
  const { settings } = useSiteSettings()

  if (!user) return (
    <div className="text-center py-20 space-y-4">
      <div className="text-6xl">🔒</div>
      <h2 className="text-2xl font-bold text-gray-700">للموظفين المخوّلين فقط</h2>
      <button onClick={() => navigate('/login')} className="btn-primary">تسجيل الدخول</button>
    </div>
  )

  const handleGeneratePDF = async (reportId) => {
    setLoading(true)
    try {
      const data = await fetchReportData(dateFrom, dateTo)
      const html = generateHTMLReport(data, dateFrom, dateTo)
      const w = window.open('', '_blank')
      w.document.write(html)
      w.document.close()
      setGenerated(true)
      setTimeout(() => setGenerated(false), 4000)
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const handleExportExcel = async () => {
    setExporting(true)
    try {
      const data = await fetchReportData(dateFrom, dateTo)
      await exportAllToExcel(data)
    } catch(e) { console.error(e) }
    setExporting(false)
  }

  const handleMinisterialPDF = async () => {
    setMinLoading(true)
    try {
      await generateMinisterialPDF(repMonth, repYear, settings)
    } catch(e) { console.error(e) }
    setMinLoading(false)
  }

  const MONTHS = ['كانون الثاني','شباط','آذار','نيسان','أيار','حزيران','تموز','آب','أيلول','تشرين الأول','تشرين الثاني','كانون الأول']

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">التقارير الرسمية</h1>
        <p className="text-gray-500 text-sm mt-1">توليد وتصدير التقارير الإدارية من البيانات الفعلية</p>
      </div>

      {/* Controls */}
      <div className="card flex flex-wrap gap-4 items-end">
        <div>
          <label className="label text-sm">من تاريخ</label>
          <input type="date" className="input w-auto text-sm" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/>
        </div>
        <div>
          <label className="label text-sm">إلى تاريخ</label>
          <input type="date" className="input w-auto text-sm" value={dateTo} onChange={e=>setDateTo(e.target.value)}/>
        </div>
        <p className="text-xs text-gray-400 pb-2">اتركهما فارغَين لتقرير شامل</p>
        <div className="mr-auto">
          <button onClick={handleExportExcel} disabled={exporting}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            <FileSpreadsheet size={16}/>
            {exporting ? 'جاري التصدير...' : 'تصدير Excel شامل'}
          </button>
        </div>
      </div>

      {generated && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4 text-green-700">
          <CheckCircle size={20}/>
          <p className="font-semibold text-sm">تم توليد التقرير — اختر "حفظ كـ PDF" من نافذة الطباعة</p>
        </div>
      )}

      {/* التقرير الوزاري الرسمي */}
      <div className="card" style={{ borderTop:'3px solid #C9A227' }}>
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background:'#0D4A35' }}>
            <span className="text-2xl">⚜️</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-800">التقرير الوزاري الرسمي</h3>
            <p className="text-sm text-gray-500 mt-1">تقرير شهري بالنموذج المعتمد للوزارة — جاهز للتوقيع والختم</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label text-sm">الشهر</label>
            <select className="input w-auto text-sm" value={repMonth} onChange={e=>setRepMonth(Number(e.target.value))}>
              {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-sm">السنة</label>
            <select className="input w-auto text-sm" value={repYear} onChange={e=>setRepYear(Number(e.target.value))}>
              {[0,1,2].map(off => { const y = now.getFullYear()-off; return <option key={y} value={y}>{y}</option> })}
            </select>
          </div>
          <button onClick={handleMinisterialPDF} disabled={minLoading}
            className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors mr-auto"
            style={{ background:'#0D4A35' }}>
            {minLoading ? <><RefreshCw size={15} className="animate-spin"/>جاري التوليد...</> : <><FileText size={15}/>إصدار التقرير الوزاري PDF</>}
          </button>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid md:grid-cols-2 gap-5">
        {REPORT_TYPES.map(r => (
          <div key={r.id} className="card hover:shadow-md transition-all">
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-12 h-12 bg-${r.color}-100 rounded-2xl flex items-center justify-center shrink-0`}>
                <r.icon size={22} className={`text-${r.color}-600`}/>
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{r.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{r.desc}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleGeneratePDF(r.id)} disabled={loading}
                className={`flex-1 flex items-center justify-center gap-2 bg-${r.color}-600 hover:bg-${r.color}-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors`}>
                {loading ? <><RefreshCw size={14} className="animate-spin"/>جاري...</> : <><Printer size={14}/>عرض وطباعة PDF</>}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-sm text-blue-800">
        <p className="font-bold mb-2">💡 خيارات التصدير المتاحة</p>
        <ul className="space-y-1 text-blue-700 list-disc list-inside">
          <li>زر "تصدير Excel شامل" يصدّر جميع البيانات في ملف xlsx متعدد الأوراق</li>
          <li>أزرار "عرض وطباعة PDF" تفتح تقريراً HTML قابلاً للطباعة كـ PDF</li>
          <li>وحدات التنمية الريفية تملك تصدير Excel/PDF خاص بموظفي كل وحدة</li>
        </ul>
      </div>
    </div>
  )
}
