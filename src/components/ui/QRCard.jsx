import { useEffect, useRef } from 'react'

const CAT = { disabled:'ذوو الإعاقة',widow:'أرمل/ة',orphan:'يتيم/ة',divorced:'مطلقة',poor_family:'أسرة فقيرة' }
const CAT_COLOR = { disabled:'#3B82F6',widow:'#8B5CF6',orphan:'#F59E0B',divorced:'#EC4899',poor_family:'#10B981' }

export default function QRCard({ beneficiary, onClose }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !beneficiary) return
    const url = `${window.location.origin}/beneficiaries?id=${beneficiary.id}`
    import('qrcode').then(QRCode => {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 120, margin: 1,
        color: { dark: '#1e3a5f', light: '#ffffff' }
      })
    }).catch(() => {
      // fallback: draw text QR placeholder
      const ctx = canvasRef.current.getContext('2d')
      ctx.fillStyle = '#f3f4f6'
      ctx.fillRect(0, 0, 120, 120)
      ctx.fillStyle = '#6b7280'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('QR Code', 60, 60)
    })
  }, [beneficiary])

  const print = () => {
    const cat = beneficiary.category
    const color = CAT_COLOR[cat] || '#3B82F6'
    const canvas = canvasRef.current
    const qrDataUrl = canvas ? canvas.toDataURL() : ''
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar">
<head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Cairo',sans-serif}
body{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f3f4f6}
.card{width:85mm;border:2px solid ${color};border-radius:12px;overflow:hidden;background:white;box-shadow:0 4px 12px rgba(0,0,0,.1)}
.header{background:${color};color:white;padding:10px 14px;display:flex;align-items:center;gap:10px}
.logo{width:36px;height:36px;background:rgba(255,255,255,.25);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800}
.h-text h2{font-size:12px;font-weight:700}.h-text p{font-size:9px;opacity:.8}
.body{padding:12px 14px;display:flex;gap:12px;align-items:flex-start}
.info{flex:1}.name{font-size:15px;font-weight:700;color:#111827;margin-bottom:6px}
.row{display:flex;gap:6px;margin-bottom:4px;font-size:11px;color:#374151}
.label{color:#9ca3af;min-width:60px}
.cat-badge{display:inline-block;padding:2px 10px;background:${color}20;color:${color};border-radius:999px;font-size:10px;font-weight:600;margin-top:4px}
.qr-side{flex-shrink:0;text-align:center}
.qr-side img{width:80px;height:80px}
.qr-side p{font-size:8px;color:#9ca3af;margin-top:3px}
.footer{background:#f9fafb;padding:6px 14px;font-size:9px;color:#9ca3af;text-align:center;border-top:1px solid #f3f4f6}
@media print{body{background:white}}
</style></head>
<body>
<div class="card">
  <div class="header">
    <div class="logo">ج</div>
    <div class="h-text">
      <h2>دائرة جبلة للشؤون الاجتماعية</h2>
      <p>بطاقة مستفيد</p>
    </div>
  </div>
  <div class="body">
    <div class="info">
      <div class="name">${beneficiary.full_name}</div>
      ${beneficiary.national_id ? `<div class="row"><span class="label">الرقم الوطني</span><span>${beneficiary.national_id}</span></div>` : ''}
      ${beneficiary.phone ? `<div class="row"><span class="label">الهاتف</span><span dir="ltr">${beneficiary.phone}</span></div>` : ''}
      ${beneficiary.district ? `<div class="row"><span class="label">المنطقة</span><span>${beneficiary.district}</span></div>` : ''}
      <div class="cat-badge">${CAT[cat]||cat}</div>
    </div>
    <div class="qr-side">
      <img src="${qrDataUrl}" alt="QR"/>
      <p>امسح للملف</p>
    </div>
  </div>
  <div class="footer">دائرة جبلة — المديرية العامة للشؤون الاجتماعية والعمل</div>
</div>
<script>window.onload=()=>setTimeout(()=>window.print(),500)</script>
</body></html>`
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
  }

  if (!beneficiary) return null
  const color = CAT_COLOR[beneficiary.category] || '#3B82F6'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">بطاقة QR</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="border-2 rounded-xl p-4 mb-4 text-center" style={{ borderColor: color }}>
          <div className="flex items-center justify-center mb-3">
            <canvas ref={canvasRef} style={{ borderRadius: 8 }}/>
          </div>
          <p className="font-bold text-gray-800">{beneficiary.full_name}</p>
          <p className="text-xs text-gray-500 mt-1">{beneficiary.national_id || beneficiary.district || ''}</p>
          <span className="inline-block mt-2 text-xs px-3 py-1 rounded-full font-semibold"
            style={{ background: color+'20', color }}>
            {CAT[beneficiary.category] || beneficiary.category}
          </span>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">
            إغلاق
          </button>
          <button onClick={print}
            className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm"
            style={{ background: color }}>
            طباعة البطاقة
          </button>
        </div>
      </div>
    </div>
  )
}
