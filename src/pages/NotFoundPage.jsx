import { useNavigate } from 'react-router-dom'
import { Home, HeartHandshake, Search, Phone } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6" dir="rtl">
      <div className="text-center max-w-lg">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
            <span className="text-white font-bold text-xl">ج</span>
          </div>
          <div className="text-right">
            <p className="font-bold text-gray-800">دائرة جبلة</p>
            <p className="text-xs text-gray-400">الشؤون الاجتماعية والعمل</p>
          </div>
        </div>

        <div className="text-8xl font-bold text-blue-600 mb-4 leading-none">٤٠٤</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-3">الصفحة غير موجودة</h1>
        <p className="text-gray-500 leading-relaxed mb-8">
          الصفحة التي تبحث عنها غير موجودة أو ربما نُقلت إلى مكان آخر.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: 'الصفحة الرئيسية',  icon: Home,          to: '/',          color: 'blue' },
            { label: 'تقديم طلب مساعدة', icon: HeartHandshake, to: '/relief',    color: 'green' },
            { label: 'متابعة طلبي',       icon: Search,         to: '/track',     color: 'purple' },
            { label: 'تسجيل الدخول',      icon: Phone,          to: '/login',     color: 'gray' },
          ].map(l => (
            <button key={l.to} onClick={() => navigate(l.to)}
              className={`flex items-center gap-3 p-4 rounded-2xl bg-${l.color}-50 hover:bg-${l.color}-100 border border-${l.color}-200 text-${l.color}-700 font-semibold text-sm transition-all text-right`}>
              <l.icon size={18} className="shrink-0"/>
              {l.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400">
          للمساعدة: تواصل مع دائرة جبلة للشؤون الاجتماعية والعمل
        </p>
      </div>
    </div>
  )
}
