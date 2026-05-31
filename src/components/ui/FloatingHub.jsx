import { useState } from 'react'
import { MessageCircle, Sparkles, X, LifeBuoy } from 'lucide-react'
import SupportChat from './SupportChat'
import AIAssistant from './AIAssistant'

// المركز العائم الموحّد: زر واحد يفتح لوحة بتبويبين (دعم فني / مساعد ذكي)
// يحل مشكلة تداخل النافذتين، وعلى الجوال يظهر كلوحة سفلية كاملة مع زر إغلاق ثابت.
export default function FloatingHub({ showSupport = true, showAI = false }) {
  const [open, setOpen]   = useState(false)
  const [tab, setTab]     = useState(showSupport ? 'support' : 'ai')
  const [unread, setUnread] = useState(0)

  if (!showSupport && !showAI) return null

  const tabs = [
    showSupport && { key: 'support', label: 'الدعم الفني', icon: LifeBuoy },
    showAI      && { key: 'ai',      label: 'المساعد الذكي', icon: Sparkles },
  ].filter(Boolean)

  return (
    <>
      {/* الزر العائم الوحيد */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 md:bottom-6 left-4 md:left-6 z-[60] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg,#0D4A35,#0F6040)' }}
          aria-label="المساعدة والدعم">
          <MessageCircle size={24}/>
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
              {unread}
            </span>
          )}
        </button>
      )}

      {open && (
        <>
          {/* خلفية معتمة على الجوال */}
          <div className="fixed inset-0 bg-black/40 z-[59] md:hidden" onClick={() => setOpen(false)}/>

          <div className="hub-panel fixed z-[60] bg-white shadow-2xl flex flex-col overflow-hidden
                          inset-x-0 bottom-0 rounded-t-3xl h-[85vh]
                          md:inset-auto md:bottom-6 md:left-6 md:w-96 md:h-[34rem] md:rounded-2xl md:border"
            style={{ borderColor: 'rgba(13,74,53,0.15)' }} dir="rtl">

            {/* الرأس + زر الإغلاق (ثابت دائماً وظاهر) */}
            <div className="text-white shrink-0" style={{ background: 'linear-gradient(135deg,#0D4A35,#0F6040)' }}>
              {/* مقبض السحب على الجوال */}
              <div className="md:hidden flex justify-center pt-2">
                <span className="w-10 h-1.5 rounded-full bg-white/30"/>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    {tab === 'ai'
                      ? <Sparkles size={18} style={{ color: '#E8C84A' }}/>
                      : <LifeBuoy size={18} style={{ color: '#E8C84A' }}/>}
                  </div>
                  <div>
                    <p className="font-bold text-sm leading-tight">
                      {tab === 'ai' ? 'المساعد الذكي' : 'الدعم الفني'}
                    </p>
                    <p className="text-xs text-white/60">دائرة جبلة — في خدمتك</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)}
                  className="w-9 h-9 flex items-center justify-center hover:bg-white/15 rounded-xl transition-colors"
                  aria-label="إغلاق">
                  <X size={20}/>
                </button>
              </div>

              {/* تبويبات */}
              {tabs.length > 1 && (
                <div className="flex px-3 gap-1 pb-1">
                  {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-t-lg transition-colors
                        ${tab === t.key ? 'bg-white text-[#0D4A35]' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                      <t.icon size={14}/>{t.label}
                      {t.key === 'support' && unread > 0 && tab !== 'support' && (
                        <span className="w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{unread}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* المحتوى — كلا اللوحتين تبقيان لكن نُظهر النشطة فقط لحفظ الحالة */}
            <div className="flex-1 min-h-0 relative">
              {showSupport && (
                <div className={`absolute inset-0 ${tab === 'support' ? 'block' : 'hidden'}`}>
                  <SupportChat active={open && tab === 'support'} onUnread={setUnread}/>
                </div>
              )}
              {showAI && (
                <div className={`absolute inset-0 ${tab === 'ai' ? 'block' : 'hidden'}`}>
                  <AIAssistant/>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
