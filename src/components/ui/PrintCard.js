// PrintCard.jsx — Official single beneficiary print card
// Called from BeneficiariesPage: <PrintCard beneficiary={row} />

export function printBeneficiaryCard(ben) {
  const CATEGORIES = {
    disabled:    { label:'ذوو الإعاقة',  icon:'♿', color:'#3B82F6' },
    widow:       { label:'الأرامل',       icon:'🕊️', color:'#8B5CF6' },
    orphan:      { label:'الأيتام',       icon:'⭐', color:'#F59E0B' },
    divorced:    { label:'المطلقات',      icon:'🌸', color:'#EC4899' },
    poor_family: { label:'الأسر الفقيرة',icon:'🏠', color:'#10B981' },
  }
  const STATUS = {
    active:   'نشط',
    inactive: 'غير نشط',
    pending:  'قيد المراجعة',
  }
  const cat   = CATEGORIES[ben.category] || CATEGORIES.poor_family
  const fmtDate = d => d ? new Date(d).toLocaleDateString('ar-SY',{year:'numeric',month:'long',day:'numeric'}) : '—'

  const w = window.open('', '_blank', 'width=800,height=600')
  w.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <title>بطاقة مستفيد — ${ben.full_name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;font-family:'Cairo',sans-serif}
    body{background:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
    .card{width:680px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.12)}
    .card-header{background:${cat.color};color:#fff;padding:24px 28px;position:relative;overflow:hidden}
    .card-header::before{content:'';position:absolute;width:180px;height:180px;background:rgba(255,255,255,.1);border-radius:50%;top:-60px;left:-40px}
    .card-header::after{content:'';position:absolute;width:120px;height:120px;background:rgba(255,255,255,.1);border-radius:50%;bottom:-40px;right:60px}
    .header-top{display:flex;align-items:center;gap:8px;margin-bottom:12px;position:relative}
    .header-logo{width:40px;height:40px;background:rgba(255,255,255,.25);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#fff}
    .header-org{font-size:11px;opacity:.85;line-height:1.4}
    .header-main{display:flex;align-items:center;gap:16px;position:relative}
    .cat-icon{width:64px;height:64px;background:rgba(255,255,255,.2);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:32px;border:2px solid rgba(255,255,255,.3)}
    .name{font-size:26px;font-weight:800;margin-bottom:4px}
    .cat-label{font-size:13px;opacity:.85}
    .badges{display:flex;gap:8px;margin-top:10px;position:relative}
    .badge{padding:3px 12px;border-radius:999px;background:rgba(255,255,255,.2);font-size:11px;font-weight:600;border:1px solid rgba(255,255,255,.3)}
    .card-body{padding:24px 28px}
    .section-title{font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #f3f4f6}
    .grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px}
    .grid-2{grid-template-columns:1fr 1fr}
    .field{background:#f8fafc;border-radius:10px;padding:12px}
    .field label{font-size:10px;color:#9ca3af;font-weight:600;display:block;margin-bottom:4px;text-transform:uppercase}
    .field span{font-size:14px;font-weight:700;color:#111827}
    .notes-box{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px;margin-bottom:20px}
    .notes-box p{font-size:13px;color:#92400e;line-height:1.7}
    .source-box{display:flex;align-items:center;gap:8px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 14px;margin-bottom:20px}
    .source-box span{font-size:12px;color:#1d4ed8;font-weight:600}
    .card-footer{background:#f8fafc;border-top:1px solid #e5e7eb;padding:14px 28px;display:flex;align-items:center;justify-content:space-between}
    .footer-text{font-size:10px;color:#9ca3af}
    .qr-placeholder{width:48px;height:48px;background:#e5e7eb;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:8px;color:#9ca3af;text-align:center}
    @media print{body{background:#fff;padding:0} .card{box-shadow:none;border-radius:0;width:100%}}
  </style>
</head>
<body>
  <div class="card">
    <div class="card-header">
      <div class="header-top">
        <div class="header-logo">ج</div>
        <div class="header-org">
          الجمهورية العربية السورية<br/>
          دائرة جبلة للشؤون الاجتماعية والعمل
        </div>
        <div style="margin-right:auto;text-align:left;font-size:10px;opacity:.75;position:relative">
          رقم السجل<br/>
          <strong style="font-size:12px">${ben.id?.slice(0,8).toUpperCase() || '—'}</strong>
        </div>
      </div>
      <div class="header-main">
        <div class="cat-icon">${cat.icon}</div>
        <div>
          <div class="name">${ben.full_name}</div>
          <div class="cat-label">${cat.label}</div>
        </div>
      </div>
      <div class="badges">
        <span class="badge">${STATUS[ben.status] || 'نشط'}</span>
        <span class="badge">${ben.gender === 'male' ? '🧑 ذكر' : '👩 أنثى'}</span>
        <span class="badge">📍 ${ben.district || 'جبلة'}</span>
      </div>
    </div>

    <div class="card-body">
      <div class="section-title">المعلومات الشخصية</div>
      <div class="grid">
        <div class="field"><label>رقم الهوية</label><span>${ben.national_id || '—'}</span></div>
        <div class="field"><label>رقم الهاتف</label><span dir="ltr">${ben.phone || '—'}</span></div>
        <div class="field"><label>تاريخ الميلاد</label><span>${fmtDate(ben.birth_date)}</span></div>
      </div>
      <div class="grid grid-2">
        <div class="field"><label>العنوان التفصيلي</label><span>${ben.address || '—'}</span></div>
        <div class="field"><label>تاريخ التسجيل</label><span>${fmtDate(ben.created_at)}</span></div>
      </div>

      ${ben.notes ? `
      <div class="section-title">ملاحظات الحالة</div>
      <div class="notes-box"><p>${ben.notes}</p></div>
      ` : ''}

      <div class="source-box">
        <span>📋 مصدر التسجيل: ${ben.source === 'relief_form' ? 'نموذج إغاثة إلكتروني' : 'تسجيل يدوي من الموظف'}</span>
      </div>
    </div>

    <div class="card-footer">
      <div>
        <div class="footer-text" style="font-weight:700;color:#374151;margin-bottom:2px">وثيقة رسمية</div>
        <div class="footer-text">دائرة جبلة للشؤون الاجتماعية والعمل — تاريخ الإصدار: ${new Date().toLocaleDateString('ar-SY')}</div>
      </div>
      <div class="qr-placeholder">QR<br/>CODE</div>
    </div>
  </div>
  <script>window.onload=()=>{window.print()}</script>
</body>
</html>`)
  w.document.close()
}
