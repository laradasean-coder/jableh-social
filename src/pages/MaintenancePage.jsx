import SyriaEmblem from '../components/ui/SyriaEmblem'
import { useSiteSettings } from '../hooks/useSiteSettings'

export default function MaintenancePage() {
  const { settings } = useSiteSettings()
  return (
    <div className="min-h-screen flex items-center justify-center p-6" dir="rtl"
      style={{ background: 'linear-gradient(135deg, #062820 0%, #0D4A35 100%)' }}>
      <div className="text-center max-w-md">
        <SyriaEmblem size={90} className="mx-auto mb-6"/>
        <div className="text-5xl mb-4">🛠️</div>
        <h1 className="text-2xl font-bold text-white mb-3">الموقع قيد الصيانة</h1>
        <p className="text-white/70 leading-relaxed mb-6">
          نقوم حالياً بأعمال صيانة وتحديث لتقديم خدمة أفضل. نعتذر عن الإزعاج وسنعود قريباً.
        </p>
        <p className="text-sm" style={{ color: '#C9A227' }}>
          {settings.org_name_ar}
        </p>
        {settings.phone_main && (
          <p className="text-white/50 text-sm mt-4" dir="ltr">
            للطوارئ: {settings.phone_main}
          </p>
        )}
      </div>
    </div>
  )
}
