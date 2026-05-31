import { useState, useEffect } from 'react'

// علم في الذاكرة بدل التخزين المحلي
let pwaDismissedThisSession = false
import { Download, X, Share, Plus, Smartphone } from 'lucide-react'

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showButton, setShowButton] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Already installed?
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      return
    }
    // Previously dismissed this session?
    if (pwaDismissedThisSession) {
      setDismissed(true)
      return
    }

    // Android / Desktop Chrome
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowButton(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS Safari detection (no beforeinstallprompt support)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    if (isIOS && isSafari) {
      setShowButton(true)  // show button that triggers iOS guide
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Android / Desktop
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setShowButton(false)
      setDeferredPrompt(null)
    } else {
      // iOS — show manual guide
      setShowIOSGuide(true)
    }
  }

  const dismiss = () => {
    setShowButton(false)
    setDismissed(true)
    pwaDismissedThisSession = true
  }

  if (!showButton || dismissed) return null

  return (
    <>
      {/* Floating install banner */}
      <div className="fixed bottom-4 right-4 left-4 md:left-auto md:w-80 z-40 animate-slide-up">
        <div className="rounded-2xl shadow-2xl border overflow-hidden"
          style={{ background:'#fff', borderColor:'rgba(13,74,53,0.2)' }}>
          <div className="h-1 w-full" style={{ background:'linear-gradient(to right,#C9A227,#E8C84A,#C9A227)' }}/>
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background:'#0D4A35' }}>
                <Smartphone size={22} className="text-white"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm">ثبّت تطبيق الدائرة</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  أضف المنصة لشاشتك الرئيسية للوصول السريع والعمل دون إنترنت
                </p>
              </div>
              <button onClick={dismiss} className="text-gray-300 hover:text-gray-500 shrink-0">
                <X size={16}/>
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={dismiss}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-500 text-xs font-semibold hover:bg-gray-50">
                لاحقاً
              </button>
              <button onClick={handleInstall}
                className="flex-1 py-2 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5"
                style={{ background:'#0D4A35' }}>
                <Download size={13}/> تثبيت الآن
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* iOS install guide modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50 p-4"
          onClick={() => setShowIOSGuide(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">تثبيت على iPhone</h3>
              <button onClick={() => setShowIOSGuide(false)}><X size={20} className="text-gray-400"/></button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{background:'#0D4A35'}}>1</div>
                <p className="text-sm text-gray-600 flex items-center gap-1.5 flex-wrap">
                  اضغط زر المشاركة <Share size={16} className="text-blue-500"/> في أسفل Safari
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{background:'#0D4A35'}}>2</div>
                <p className="text-sm text-gray-600 flex items-center gap-1.5 flex-wrap">
                  اختر <span className="font-semibold">"إضافة إلى الشاشة الرئيسية"</span> <Plus size={15} className="text-gray-500"/>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{background:'#0D4A35'}}>3</div>
                <p className="text-sm text-gray-600">اضغط <span className="font-semibold">"إضافة"</span> في الأعلى</p>
              </div>
            </div>
            <button onClick={() => setShowIOSGuide(false)}
              className="w-full mt-5 py-2.5 rounded-xl text-white font-semibold text-sm" style={{background:'#0D4A35'}}>
              فهمت
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up { from { transform: translateY(100px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .animate-slide-up { animation: slide-up 0.4s ease-out }
      `}</style>
    </>
  )
}
