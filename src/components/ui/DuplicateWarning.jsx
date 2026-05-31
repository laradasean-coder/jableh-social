import { AlertTriangle, X } from 'lucide-react'

const CAT = { disabled:'ذوو الإعاقة',widow:'أرامل',orphan:'أيتام',divorced:'مطلقات',poor_family:'أسر فقيرة' }

export default function DuplicateWarning({ duplicates, onDismiss, onProceed }) {
  if (!duplicates?.length) return null
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-4" dir="rtl">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 text-orange-700">
          <AlertTriangle size={18}/>
          <p className="font-bold text-sm">تحذير: سجلات مشابهة موجودة</p>
        </div>
        <button onClick={onDismiss} className="text-orange-400 hover:text-orange-700"><X size={16}/></button>
      </div>
      <div className="space-y-2 mb-3">
        {duplicates.map(d => (
          <div key={d.id} className="bg-white rounded-xl p-3 border border-orange-100 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-800">{d.full_name}</span>
              <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{d.matchType}</span>
            </div>
            <p className="text-gray-500 mt-1">
              {d.national_id && <span className="ml-3">رقم وطني: {d.national_id}</span>}
              {d.district && <span className="ml-3">المنطقة: {d.district}</span>}
              {d.category && <span>الفئة: {CAT[d.category]||d.category}</span>}
            </p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={onDismiss}
          className="flex-1 py-2 text-xs rounded-xl border border-orange-300 text-orange-700 font-semibold hover:bg-orange-100">
          مراجعة السجلات
        </button>
        <button onClick={onProceed}
          className="flex-1 py-2 text-xs rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700">
          إضافة على أي حال
        </button>
      </div>
    </div>
  )
}
