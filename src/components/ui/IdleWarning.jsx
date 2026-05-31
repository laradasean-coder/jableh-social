import { useAuth } from '../../hooks/useAuth'
import { Clock, LogOut } from 'lucide-react'

export default function IdleWarning() {
  const { idleWarn, setIdleWarn, signOut } = useAuth()
  if (!idleWarn) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[999] p-4" dir="rtl">
      <div className="bg-white rounded-2xl p-7 max-w-sm w-full shadow-2xl text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock size={32} className="text-yellow-600"/>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">انتهاء الجلسة قريباً</h3>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          ستنتهي جلستك خلال دقيقة واحدة بسبب عدم النشاط. هل تريد الاستمرار؟
        </p>
        <div className="flex gap-3">
          <button onClick={signOut}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">
            <LogOut size={15}/> تسجيل خروج
          </button>
          <button onClick={() => setIdleWarn(false)}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors">
            الاستمرار
          </button>
        </div>
      </div>
    </div>
  )
}
