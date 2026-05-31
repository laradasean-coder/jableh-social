import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Send, RefreshCw } from 'lucide-react'

function timeAgo(iso) {
  const d = (Date.now() - new Date(iso)) / 1000
  if (d < 60)    return 'الآن'
  if (d < 3600)  return `${Math.floor(d/60)} د`
  if (d < 86400) return `${Math.floor(d/3600)} س`
  return new Date(iso).toLocaleDateString('ar', { month:'short', day:'numeric' })
}

// لوحة الدعم الفني — تُعرض مضمّنة داخل المركز العائم (FloatingHub)
// active: هل التبويب ظاهر الآن (لتصفير غير المقروء)
// onUnread: لإبلاغ المركز العائم بعدد الرسائل غير المقروءة
export default function SupportChat({ active = true, onUnread }) {
  const { user, profile } = useAuth()
  const [messages, setMessages] = useState([])
  const [text,     setText]     = useState('')
  const [sending,  setSending]  = useState(false)
  const [thread,   setThread]   = useState(null)
  const bottomRef = useRef(null)

  const isStaff = profile?.role === 'admin' || profile?.role === 'staff'

  const getOrCreateThread = useCallback(async () => {
    if (!user || isStaff) return null
    const { data: existing } = await supabase
      .from('support_threads').select('id')
      .eq('user_id', user.id).eq('status', 'open').maybeSingle()
    if (existing) return existing.id
    const { data: created } = await supabase
      .from('support_threads')
      .insert({ user_id: user.id, user_name: profile?.full_name || user.email })
      .select('id').single()
    return created?.id
  }, [user, profile, isStaff])

  const fetchMessages = useCallback(async (tid) => {
    if (!tid) return
    const { data } = await supabase
      .from('support_messages').select('*')
      .eq('thread_id', tid).order('created_at', { ascending: true })
    if (data) setMessages(data)
  }, [])

  useEffect(() => {
    if (!user) return
    let tid = thread
    const init = async () => {
      if (!tid) {
        if (isStaff) return
        tid = await getOrCreateThread()
        setThread(tid)
      }
      await fetchMessages(tid)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
    init()
    if (!tid) return
    const channel = supabase
      .channel(`chat-${tid}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'support_messages',
        filter: `thread_id=eq.${tid}`
      }, (payload) => {
        setMessages(p => [...p, payload.new])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        if (!active && payload.new.is_staff) onUnread?.(n => (n || 0) + 1)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, thread, isStaff, getOrCreateThread, fetchMessages, active, onUnread])

  useEffect(() => {
    if (active) {
      onUnread?.(0)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 100)
    }
  }, [active, onUnread])

  const sendMessage = async () => {
    if (!text.trim() || sending || !user) return
    setSending(true)
    let tid = thread
    if (!tid) { tid = await getOrCreateThread(); setThread(tid) }
    if (!tid) { setSending(false); return }
    const msg = {
      thread_id: tid, sender_id: user.id,
      sender_name: profile?.full_name || user.email,
      content: text.trim(), is_staff: isStaff, is_read: false
    }
    const { data } = await supabase.from('support_messages').insert(msg).select().single()
    if (data) {
      setMessages(p => [...p, data]); setText('')
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
    setSending(false)
  }

  if (!user) return null

  return (
    <div className="flex flex-col h-full min-h-0" dir="rtl">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">👋</div>
            <p className="text-sm text-gray-500">مرحباً! كيف يمكننا مساعدتك؟</p>
            <p className="text-xs text-gray-400 mt-1">اكتب رسالتك وسنرد عليك قريباً</p>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.is_staff ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
              m.is_staff
                ? 'bg-white border border-gray-100 text-gray-700 rounded-tl-sm'
                : 'text-white rounded-tr-sm'
            }`} style={m.is_staff ? {} : { background: '#0D4A35' }}>
              {m.is_staff && (
                <p className="text-xs font-semibold mb-1" style={{ color: '#0D4A35' }}>{m.sender_name}</p>
              )}
              <p>{m.content}</p>
              <p className={`text-xs mt-1 ${m.is_staff ? 'text-gray-400' : 'text-white/70'} text-left`}>
                {timeAgo(m.created_at)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>

      {/* Input — مسافة كافية بين الحقل وزر الإرسال */}
      <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-3 shrink-0"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <input
          className="flex-1 input text-sm py-2.5"
          placeholder="اكتب رسالتك..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
        />
        <button
          onClick={sendMessage}
          disabled={!text.trim() || sending}
          className="w-11 h-11 disabled:bg-gray-300 text-white rounded-xl flex items-center justify-center transition-transform active:scale-95 shrink-0"
          style={{ background: text.trim() ? '#0D4A35' : undefined }} aria-label="إرسال">
          {sending ? <RefreshCw size={18} className="animate-spin"/> : <Send size={18}/>}
        </button>
      </div>
    </div>
  )
}
