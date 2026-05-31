import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, X, CheckCheck, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { timeAgo } from '../../utils/format'
import { useAppStore } from '../../store/appStore'

const TYPE_ROUTES = {
  relief: '/relief-admin', beneficiary: '/beneficiaries',
  association: '/associations', access_request: '/access-requests',
  info: '/', warning: '/', success: '/', error: '/'
}

const TYPE_COLORS = {
  relief: 'bg-red-100 text-red-600',
  beneficiary: 'bg-blue-100 text-blue-600',
  association: 'bg-purple-100 text-purple-600',
  access_request: 'bg-orange-100 text-orange-600',
  info: 'bg-blue-100 text-blue-600',
  default: 'bg-gray-100 text-gray-600'
}

export default function NotificationsSystem() {
  const { user } = useAuth()
  const [notifs, setNotifs]   = useState([])
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef()
  const navigate = useNavigate()
  const { setUnreadCount } = useAppStore()

  const unread = notifs.filter(n => !n.is_read).length

  // Close on outside click
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Fetch from Supabase + Realtime
  useEffect(() => {
    if (!user?.id) return
    fetchNotifs()

    const ch = supabase.channel(`notifs-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, payload => {
        setNotifs(p => [payload.new, ...p])
        setUnreadCount(n => n + 1)
      })
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [user?.id])

  useEffect(() => { setUnreadCount(unread) }, [unread])

  const fetchNotifs = async () => {
    if (!user?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setNotifs(data)
    setLoading(false)
  }

  const markRead = async id => {
    setNotifs(p => p.map(n => n.id === id ? { ...n, is_read: true } : n))
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  }

  const markAllRead = async () => {
    setNotifs(p => p.map(n => ({ ...n, is_read: true })))
    if (user?.id) await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
  }

  const dismiss = async (e, id) => {
    e.stopPropagation()
    setNotifs(p => p.filter(n => n.id !== id))
    await supabase.from('notifications').delete().eq('id', id)
  }

  const handleClick = notif => {
    markRead(notif.id)
    setOpen(false)
    const route = notif.link || TYPE_ROUTES[notif.type] || '/'
    navigate(route)
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
        aria-label="الإشعارات">
        <Bell size={20}/>
        {unread > 0 && (
          <span className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden" dir="rtl">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              الإشعارات
              {unread > 0 && <span className="badge bg-red-100 text-red-700 text-xs">{unread} جديد</span>}
            </h3>
            {unread > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                <CheckCheck size={13}/> تحديد الكل
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm">جاري التحميل...</div>
            ) : notifs.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Bell size={32} className="mx-auto mb-2 opacity-30"/>
                <p className="text-sm">لا توجد إشعارات</p>
              </div>
            ) : notifs.map(n => {
              const colorCls = TYPE_COLORS[n.type] || TYPE_COLORS.default
              return (
                <div key={n.id}
                  onClick={() => handleClick(n)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 ${!n.is_read ? 'bg-blue-50/40' : ''}`}>
                  <div className={`w-9 h-9 ${colorCls} rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-sm`}>
                    {n.type === 'relief' ? '🆘' : n.type === 'access_request' ? '🔑' : n.type === 'beneficiary' ? '👤' : '🔔'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold leading-tight ${!n.is_read ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</p>
                      <button onClick={e => dismiss(e, n.id)} className="text-gray-300 hover:text-gray-500 shrink-0 mt-0.5">
                        <X size={13}/>
                      </button>
                    </div>
                    {n.body && <p className="text-xs text-gray-500 mt-0.5 truncate">{n.body}</p>}
                    <div className="flex items-center gap-1 mt-1">
                      <Clock size={10} className="text-gray-300"/>
                      <span className="text-xs text-gray-300">{timeAgo(n.created_at)}</span>
                      {!n.is_read && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-auto"/>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {notifs.length > 0 && (
            <div className="px-4 py-2.5 border-t bg-gray-50 text-center">
              <button onClick={() => { setOpen(false); navigate('/relief-admin') }}
                className="text-xs text-blue-600 hover:underline font-semibold">
                عرض طلبات الإغاثة المعلقة ←
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
