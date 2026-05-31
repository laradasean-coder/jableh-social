/**
 * تقرير وزاري رسمي بصيغة PDF
 * بالنموذج المعتمد للجمهورية العربية السورية
 */
import { supabase } from './supabase'

const CAT_LABELS = {
  disabled:'ذوو الإعاقة', widow:'الأرامل', orphan:'الأيتام',
  divorced:'المطلقات', poor_family:'الأسر الفقيرة'
}

export async function generateMinisterialPDF(month, year, settings = {}) {
  // Fetch data for the period
  const start = new Date(year, month, 1).toISOString()
  const end   = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

  const [bensRes, reliefRes, assocRes] = await Promise.all([
    supabase.from('beneficiaries').select('category,status,created_at,district'),
    supabase.from('relief_requests').select('status,created_at').gte('created_at', start).lte('created_at', end),
    supabase.from('associations').select('id').eq('is_active', true),
  ])

  const bens   = bensRes.data || []
  const relief = reliefRes.data || []
  const assocs = assocRes.data || []

  const monthBens = bens.filter(b => {
    const d = new Date(b.created_at)
    return d >= new Date(start) && d <= new Date(end)
  })

  // Category breakdown
  const catCounts = {}
  Object.keys(CAT_LABELS).forEach(k => { catCounts[k] = bens.filter(b => b.category === k).length })

  // District breakdown
  const distCounts = {}
  bens.forEach(b => { if (b.district) distCounts[b.district] = (distCounts[b.district] || 0) + 1 })

  const monthName = new Date(year, month).toLocaleDateString('ar-SY', { month: 'long', year: 'numeric' })
  const orgName   = settings.org_name_ar || 'دائرة جبلة للشؤون الاجتماعية والعمل'
  const ministry  = settings.ministry || 'وزارة الشؤون الاجتماعية والعمل'
  const director  = settings.director_name || '...................'

  const { default: jsPDF } = await import('jspdf')
  await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()

  // ─── Header: official identity ───
  doc.setFillColor(13, 74, 53)  // Orontes Green
  doc.rect(0, 0, W, 38, 'F')
  doc.setFillColor(201, 162, 39)  // Qasioun Gold
  doc.rect(0, 38, W, 1.5, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.text('الجمهورية العربية السورية', W/2, 10, { align: 'center' })
  doc.setFontSize(11)
  doc.setFont(undefined, 'bold')
  doc.text(ministry, W/2, 18, { align: 'center' })
  doc.setFontSize(13)
  doc.text(orgName, W/2, 27, { align: 'center' })
  doc.setFontSize(8)
  doc.setTextColor(201, 162, 39)
  doc.text('شعار النسر الذهبي ⚜', W/2, 34, { align: 'center' })

  // ─── Report title ───
  doc.setTextColor(13, 74, 53)
  doc.setFontSize(15)
  doc.setFont(undefined, 'bold')
  doc.text(`التقرير الشهري — ${monthName}`, W/2, 52, { align: 'center' })

  doc.setDrawColor(201, 162, 39)
  doc.setLineWidth(0.5)
  doc.line(W/2 - 40, 55, W/2 + 40, 55)

  // ─── Summary KPIs table ───
  doc.autoTable({
    startY: 62,
    head: [['البيان', 'العدد']],
    body: [
      ['إجمالي المستفيدين المسجّلين', String(bens.length)],
      ['المستفيدون الجدد هذا الشهر', String(monthBens.length)],
      ['طلبات الإغاثة المستلمة', String(relief.length)],
      ['طلبات تمت معالجتها', String(relief.filter(r => r.status === 'transferred').length)],
      ['طلبات قيد المراجعة', String(relief.filter(r => r.status === 'pending').length)],
      ['الجمعيات الأهلية النشطة', String(assocs.length)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [13, 74, 53], textColor: 255, halign: 'right', fontStyle: 'bold' },
    bodyStyles: { halign: 'right' },
    alternateRowStyles: { fillColor: [240, 248, 244] },
    margin: { right: 14, left: 14 },
  })

  // ─── Category breakdown ───
  doc.setFontSize(12)
  doc.setTextColor(13, 74, 53)
  doc.text('توزيع المستفيدين حسب الفئة', W - 14, doc.lastAutoTable.finalY + 12, { align: 'right' })

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 16,
    head: [['الفئة', 'العدد', 'النسبة']],
    body: Object.entries(CAT_LABELS).map(([k, label]) => [
      label,
      String(catCounts[k]),
      bens.length ? `${Math.round(catCounts[k] / bens.length * 100)}%` : '0%'
    ]),
    theme: 'grid',
    headStyles: { fillColor: [201, 162, 39], textColor: [26,26,26], halign: 'right', fontStyle: 'bold' },
    bodyStyles: { halign: 'right' },
    alternateRowStyles: { fillColor: [253, 250, 240] },
    margin: { right: 14, left: 14 },
  })

  // ─── District breakdown (if any) ───
  const distEntries = Object.entries(distCounts).sort((a,b) => b[1]-a[1]).slice(0, 8)
  if (distEntries.length) {
    doc.setFontSize(12)
    doc.setTextColor(13, 74, 53)
    doc.text('التوزيع الجغرافي', W - 14, doc.lastAutoTable.finalY + 12, { align: 'right' })
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 16,
      head: [['المنطقة', 'عدد المستفيدين']],
      body: distEntries.map(([dist, count]) => [dist, String(count)]),
      theme: 'grid',
      headStyles: { fillColor: [13, 74, 53], textColor: 255, halign: 'right', fontStyle: 'bold' },
      bodyStyles: { halign: 'right' },
      margin: { right: 14, left: 14 },
    })
  }

  // ─── Signature block ───
  let y = doc.lastAutoTable.finalY + 20
  if (y > 250) { doc.addPage(); y = 30 }
  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  doc.text('مدير دائرة جبلة للشؤون الاجتماعية والعمل', W - 14, y, { align: 'right' })
  doc.text(`الاسم: ${director}`, W - 14, y + 8, { align: 'right' })
  doc.text('التوقيع: ............................', W - 14, y + 16, { align: 'right' })
  doc.text(`التاريخ: ${new Date().toLocaleDateString('ar-SY')}`, W - 14, y + 24, { align: 'right' })

  // Official stamp circle
  doc.setDrawColor(13, 74, 53)
  doc.setLineWidth(0.8)
  doc.circle(40, y + 14, 16)
  doc.setFontSize(7)
  doc.setTextColor(13, 74, 53)
  doc.text('الختم الرسمي', 40, y + 14, { align: 'center' })

  // ─── Footer ───
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFillColor(13, 74, 53)
    doc.rect(0, 287, W, 10, 'F')
    doc.setFontSize(7)
    doc.setTextColor(255, 255, 255)
    doc.text(`${orgName} — تقرير رسمي`, W/2, 293, { align: 'center' })
    doc.text(`صفحة ${i} من ${pageCount}`, W - 14, 293, { align: 'right' })
  }

  doc.save(`التقرير_الوزاري_${monthName}.pdf`)
}
