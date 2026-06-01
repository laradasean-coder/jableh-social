import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Send, RefreshCw, Circle, CheckCheck, User, Clock } from 'lucide-react'
import { timeAgo } from '../utils/format'


export default function SupportInboxPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [threads,  setThreads]  = useState([])
  const [active,   setActive]   = useState(null)
  const [messages, setMessages] = useState([])
  const [text,     setText]     = useState('')
  const [sending,  setSending]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const bottomRef = useRef(null)
  const threadChRef = useRef(null)

  useEffect(() => {
    if (!profile || !['admin','staff'].includes(profile.role)) { navigate('/'); return }
    fetchThreads()
    // اشتراك حيّ: أي محادثة جديدة أو رسالة واردة من الزوار تُحدّث القائمة فوراً
    const ch = supabase.channel('inbox-threads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_threads' }, () => fetchThreads())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, () => fetchThreads())
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
      if (threadChRef.current) { supabase.removeChannel(threadChRef.current); threadChRef.current = null }
    }
  }, [profile])

  const fetchThreads = async () => {
    setLoading(true)
    let { data, error } = await supabase
      .from('support_threads')
      .select('*, support_messages(count)')
      .eq('status', 'open')
      .order('updated_at', { ascending: false })
    if (error) {
      console.error('fetchThreads embed failed, falling back', error)
      const res = await supabase.from('support_threads').select('*')
        .eq('status', 'open').order('updated_at', { ascending: false })
      data = res.data; error = res.error
      if (error) console.error('fetchThreads failed', error)
    }
    if (data) setThreads(data)
    setLoading(false)
  }

  const openThread = useCallback(async (t) => {
    setActive(t)
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('thread_id', t.id)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
    // mark unread as read
    await supabase.from('support_messages')
      .update({ is_read: true })
      .eq('thread_id', t.id)
      .eq('is_staff', false)
      .eq('is_read', false)
    setThreads(p => p.map(th => th.id === t.id ? { ...th, unread: 0 } : th))
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)

    // Realtime for this thread — أزل الاشتراك السابق أولاً لمنع التكرار وتسرّب القنوات
    if (threadChRef.current) { supabase.removeChannel(threadChRef.current); threadChRef.current = null }
    const ch = supabase.channel(`inbox-${t.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `thread_id=eq.${t.id}` },
        (payload) => {
          setMessages(p => p.some(m => m.id === payload.new.id) ? p : [...p, payload.new])
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        })
      .subscribe()
    threadChRef.current = ch
  }, [])

  const sendReply = async () => {
    if (!text.trim() || !active || sending) return
    setSending(true)
    const { data, error } = await supabase.from('support_messages').insert({
      thread_id: active.id,
      sender_id: user.id,
      sender_name: profile?.full_name || 'موظف',
      content: text.trim(),
      is_staff: true,
      is_read: false
    }).select().single()
    if (error) {
      console.error('reply failed', error)
      alert('تعذّر إرسال الرد: ' + error.message)
    } else if (data) {
      setMessages(p => p.some(m => m.id === data.id) ? p : [...p, data])
      setText('')
      await supabase.from('support_threads').update({ updated_at: new Date().toISOString() }).eq('id', active.id)
    }
    setSending(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const closeThread = async (id) => {
    if (!confirm('إغلاق هذه المحادثة وإخفاؤها من القائمة؟')) return
    const { error } = await supabase.from('support_threads').update({ status: 'closed' }).eq('id', id)
    if (error) { alert('تعذّر إغلاق المحادثة: ' + error.message); return }
    setThreads(p => p.filter(t => t.id !== id))
    if (active?.id === id) { setActive(null); setMessages([]) }
  }

  const unreadTotal = threads.reduce((s, t) => s + (t.unread || 0), 0)

  return (
    <div className="flex h-[calc(100vh-140px)] gap-0 rounded-2xl overflow-hidden border border-gray-100" dir="rtl">
      {/* Thread list */}
      <div className="w-72 flex-shrink-0 border-l border-gray-100 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <MessageCircle size={18} className="text-blue-600"/>
            صندوق الرسائل
            {unreadTotal > 0 && (
              <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{unreadTotal}</span>
            )}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">{threads.length} محادثة</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8"><RefreshCw size={20} className="animate-spin text-blue-400"/></div>
          ) : threads.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">لا توجد محادثات</div>
          ) : threads.map(t => (
            <button key={t.id} onClick={() => openThread(t)}
              className={`w-full text-right px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${active?.id === t.id ? 'bg-blue-50 border-r-2 border-r-blue-500' : ''}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User size={13} className="text-blue-600"/>
                  </div>
                  <span className="text-sm font-semibold text-gray-800 truncate max-w-[120px]">{t.user_name}</span>
                </div>
                <span className="text-xs text-gray-400">{timeAgo(t.updated_at || t.created_at)}</span>
              </div>
              <div className="flex items-center justify-between mr-9">
                <span className={`text-xs ${t.status==='closed' ? 'text-gray-300 line-through' : 'text-gray-400'} truncate`}>
                  {t.status==='closed' ? 'مغلقة' : 'مفتوحة'}
                </span>
                {t.unread > 0 && (
                  <span className="w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{t.unread}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageCircle size={48} className="mx-auto mb-3 opacity-30"/>
              <p className="text-sm">اختر محادثة من القائمة</p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
                  <User size={16} className="text-blue-600"/>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{active.user_name}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock size={10}/>
                    {timeAgo(active.created_at)}
                  </div>
                </div>
              </div>
              <button onClick={() => closeThread(active.id)}
                className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-xl transition-colors">
                إغلاق المحادثة
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.is_staff ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.is_staff
                      ? 'bg-blue-600 text-white rounded-bl-sm'
                      : 'bg-white border border-gray-100 text-gray-700 rounded-br-sm'
                  }`}>
                    {!m.is_staff && <p className="text-xs text-blue-600 font-semibold mb-1">{m.sender_name}</p>}
                    <p>{m.content}</p>
                    <p className={`text-xs mt-1 ${m.is_staff ? 'text-blue-200' : 'text-gray-400'} text-right`}>
                      {timeAgo(m.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef}/>
            </div>

            <div className="p-3 bg-white border-t border-gray-100 flex gap-2 flex-shrink-0">
              <input
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 transition-colors"
                placeholder="اكتب ردك..."
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
              />
              <button onClick={sendReply} disabled={!text.trim() || sending}
                className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
                {sending ? <RefreshCw size={15} className="animate-spin"/> : <Send size={15}/>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
