import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Send, RefreshCw, Lightbulb, Bot, User } from 'lucide-react'

const SUGGESTIONS = [
  'كم عدد المستفيدين المسجّلين؟',
  'ما الفئة الأكثر احتياجاً؟',
  'كم طلب إغاثة معلّق؟',
  'ما توزيع المستفيدين حسب المناطق؟',
  'أعطني ملخصاً عن وضع الدائرة',
]

// لوحة المساعد الذكي — تُعرض مضمّنة داخل المركز العائم (FloatingHub)
export default function AIAssistant() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'مرحباً! أنا المساعد الذكي لدائرة جبلة. اسألني عن أي شيء يخص بيانات المستفيدين والإغاثة والجمعيات.' }
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef()

  useEffect(() => {
    if (scrollRef.current?.scrollTo)
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    setMessages(m => [...m, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', { body: { message: msg } })
      if (error) throw error
      setMessages(m => [...m, { role: 'assistant', content: data.reply || 'تعذّر الحصول على إجابة.' }])
    } catch (e) {
      setMessages(m => [...m, {
        role: 'assistant',
        content: 'تعذّر الاتصال بالمساعد الذكي. تأكد من تفعيل خدمة الذكاء الاصطناعي من إعدادات الخادم.'
      }])
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-full min-h-0" dir="rtl">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: m.role === 'user' ? '#C9A227' : '#0D4A35' }}>
              {m.role === 'user' ? <User size={14} className="text-white"/> : <Bot size={14} className="text-white"/>}
            </div>
            <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${m.role === 'user' ? 'bg-white border border-gray-200 text-gray-800' : 'text-white'}`}
              style={m.role === 'assistant' ? { background: '#0D4A35' } : {}}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#0D4A35' }}>
              <Bot size={14} className="text-white"/>
            </div>
            <div className="rounded-2xl px-4 py-3 text-white" style={{ background: '#0D4A35' }}>
              <RefreshCw size={14} className="animate-spin"/>
            </div>
          </div>
        )}
      </div>

      {/* Suggestions (only at start) */}
      {messages.length <= 1 && (
        <div className="px-3 py-2 border-t border-gray-100 flex flex-wrap gap-1.5 bg-white">
          {SUGGESTIONS.slice(0, 3).map(s => (
            <button key={s} onClick={() => send(s)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors flex items-center gap-1">
              <Lightbulb size={11}/>{s}
            </button>
          ))}
        </div>
      )}

      {/* Input — مسافة كافية بين الحقل وزر الإرسال */}
      <div className="p-3 border-t border-gray-100 flex items-center gap-3 bg-white shrink-0"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <input
          className="flex-1 input text-sm py-2.5"
          placeholder="اكتب سؤالك..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          disabled={loading}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 disabled:opacity-50 active:scale-95 transition-transform"
          style={{ background: '#0D4A35' }} aria-label="إرسال">
          <Send size={18}/>
        </button>
      </div>
    </div>
  )
}
