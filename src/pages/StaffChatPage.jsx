import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { timeAgo } from '../utils/format'
import { Users, User, Send, RefreshCw, MessageSquare, Hash, Search } from 'lucide-react'

const GENERAL_ID = '00000000-0000-0000-0000-0000000000ff'

export default function StaffChatPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [staff, setStaff]       = useState([])
  const [active, setActive]     = useState({ id: GENERAL_ID, type: 'group', name: 'القناة العامة للموظفين' })
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [search, setSearch]     = useState('')
  const scrollRef = useRef()
  const channelRef = useRef()

  // Load staff list
  useEffect(() => {
    if (profile && !['admin','staff','unit_head'].includes(profile.role)) { navigate('/'); return }
    supabase.from('profiles').select('id,full_name,role')
      .in('role', ['admin','staff','unit_head'])
      .then(({ data }) => setStaff((data || []).filter(s => s.id !== user?.id)))
  }, [profile])

  // Deterministic direct conversation id helper: find or create
  const openDirect = async (other) => {
    // find existing direct conv between the two (either order)
    const { data: existing } = await supabase.from('staff_conversations')
      .select('*').eq('type','direct')
      .or(`and(member_a.eq.${user.id},member_b.eq.${other.id}),and(member_a.eq.${other.id},member_b.eq.${user.id})`)
      .maybeSingle()

    let conv = existing
    if (!conv) {
      const { data } = await supabase.from('staff_conversations')
        .insert({ type:'direct', member_a: user.id, member_b: other.id }).select().single()
      conv = data
    }
    if (conv) setActive({ id: conv.id, type:'direct', name: other.full_name })
  }

  // Load messages + subscribe whenever active changes
  useEffect(() => {
    if (!active?.id) return
    loadMessages()
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    channelRef.current = supabase.channel(`staff-${active.id}`)
      .on('postgres_changes', {
        event:'INSERT', schema:'public', table:'staff_messages',
        filter:`conversation_id=eq.${active.id}`
      }, payload => setMessages(m => [...m, payload.new]))
      .subscribe()
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [active?.id])

  useEffect(() => {
    if (scrollRef.current?.scrollTo) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior:'smooth' })
  }, [messages])

  const loadMessages = async () => {
    setLoading(true)
    const { data } = await supabase.from('staff_messages')
      .select('*').eq('conversation_id', active.id).order('created_at').limit(100)
    setMessages(data || [])
    setLoading(false)
  }

  const send = async () => {
    if (!input.trim()) return
    const body = input.trim()
    setInput('')
    await supabase.from('staff_messages').insert({
      conversation_id: active.id,
      sender_id: user.id,
      sender_name: profile?.full_name || user.email,
      body
    })
    await supabase.from('staff_conversations').update({ updated_at: new Date().toISOString() }).eq('id', active.id)
  }

  const filtered = staff.filter(s => !search || s.full_name?.includes(search))
  const roleLabel = r => r==='admin'?'مدير':r==='unit_head'?'رئيس وحدة':'موظف'

  if (!user) return null

  return (
    <div className="space-y-4" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <MessageSquare size={22} style={{ color:'#0D4A35' }}/> محادثات الموظفين
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">قناة عامة + محادثات خاصة بين الموظفين</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4" style={{ height:'calc(100vh - 220px)' }}>
        {/* Sidebar */}
        <div className="card p-0 overflow-hidden flex flex-col">
          {/* General channel */}
          <button onClick={() => setActive({ id: GENERAL_ID, type:'group', name:'القناة العامة للموظفين' })}
            className={`flex items-center gap-3 p-4 border-b border-gray-100 transition-colors ${active.id===GENERAL_ID ? '' : 'hover:bg-gray-50'}`}
            style={active.id===GENERAL_ID ? { background:'#0D4A3510' } : {}}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background:'#0D4A35' }}>
              <Hash size={18}/>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-800 text-sm">القناة العامة</p>
              <p className="text-xs text-gray-400">كل الموظفين</p>
            </div>
          </button>

          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input className="input pr-9 text-sm py-2" placeholder="بحث عن موظف..."
                value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
          </div>

          {/* Staff list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.map(s => (
              <button key={s.id} onClick={() => openDirect(s)}
                className={`w-full flex items-center gap-3 p-3 border-b border-gray-50 transition-colors text-right ${active.type==='direct' && active.name===s.full_name ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0" style={{ background:'#C9A227' }}>
                  <User size={16}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{s.full_name || 'موظف'}</p>
                  <p className="text-xs text-gray-400">{roleLabel(s.role)}</p>
                </div>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-center text-gray-400 text-sm py-6">لا يوجد موظفون</p>}
          </div>
        </div>

        {/* Chat area */}
        <div className="card p-0 overflow-hidden flex flex-col md:col-span-2">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-100 text-white" style={{ background:'#0D4A35' }}>
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              {active.type==='group' ? <Hash size={17}/> : <User size={17}/>}
            </div>
            <div>
              <p className="font-bold text-sm">{active.name}</p>
              <p className="text-xs text-white/60">{active.type==='group' ? 'قناة عامة' : 'محادثة خاصة'}</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
            {loading ? (
              <div className="flex justify-center py-8"><RefreshCw size={20} className="animate-spin text-gray-400"/></div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-8">
                <MessageSquare size={32} className="mx-auto mb-2 opacity-30"/>
                لا رسائل بعد — ابدأ المحادثة
              </div>
            ) : messages.map(m => {
              const mine = m.sender_id === user.id
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-3 py-2 ${mine ? 'text-white' : 'bg-white border border-gray-200 text-gray-800'}`}
                    style={mine ? { background:'#0D4A35' } : {}}>
                    {!mine && active.type==='group' && (
                      <p className="text-xs font-bold mb-0.5" style={{ color:'#C9A227' }}>{m.sender_name}</p>
                    )}
                    <p className="text-sm leading-relaxed">{m.body}</p>
                    <p className={`text-xs mt-1 ${mine ? 'text-white/60' : 'text-gray-400'}`}>{timeAgo(m.created_at)}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 flex gap-2">
            <input className="flex-1 input text-sm" placeholder="اكتب رسالة..."
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==='Enter' && send()}/>
            <button onClick={send} disabled={!input.trim()}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 disabled:opacity-50" style={{ background:'#0D4A35' }}>
              <Send size={16}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
