import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)
const IDLE_TIMEOUT = 30 * 60 * 1000
const WARN_BEFORE  = 60 * 1000

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [idleWarn,setIdleWarn]= useState(false)
  const idleRef = useRef(null)
  const warnRef = useRef(null)
  const userRef = useRef(null)
  userRef.current = user

  const resetTimers = useCallback(() => {
    clearTimeout(idleRef.current); clearTimeout(warnRef.current)
    setIdleWarn(false)
    if (!userRef.current) return
    warnRef.current = setTimeout(() => setIdleWarn(true), IDLE_TIMEOUT - WARN_BEFORE)
    idleRef.current = setTimeout(async () => {
      await supabase.auth.signOut()
      setUser(null); setProfile(null); setIdleWarn(false)
      window.location.href = '/login?reason=idle'
    }, IDLE_TIMEOUT)
  }, [])

  useEffect(() => {
    const evs = ['mousemove','keydown','click','touchstart']
    evs.forEach(e => window.addEventListener(e, resetTimers, { passive: true }))
    resetTimers()
    return () => {
      evs.forEach(e => window.removeEventListener(e, resetTimers))
      clearTimeout(idleRef.current); clearTimeout(warnRef.current)
    }
  }, [resetTimers])

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })
    // ملاحظة مهمة: لا تستدعِ أي طلب Supabase (await) مباشرةً داخل onAuthStateChange
    // لأنه يحجز قفل المصادقة (GoTrue) ويسبّب تجمّداً (deadlock) — وهو سبب بقاء
    // مؤشّر "جاري الدخول" يدور بلا نهاية. الحل: تأجيل التنفيذ خارج الـ callback.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!active) return
      setUser(session?.user ?? null)
      if (session?.user) {
        setTimeout(() => { if (active) fetchProfile(session.user.id) }, 0)
      } else {
        setProfile(null); setLoading(false)
      }
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  const fetchProfile = async (userId) => {
    try {
      const { data } = await supabase.from('profiles')
        .select('*').eq('id', userId).maybeSingle()

      // منع دخول الجمعيات قيد المراجعة (نُفّذ هنا مركزياً بدل صفحة الدخول)
      if (data?.role === 'association') {
        const { data: assoc } = await supabase.from('associations')
          .select('status,is_active').eq('user_id', userId).maybeSingle()
        if (assoc && (assoc.status === 'pending' || assoc.is_active === false)) {
          await supabase.auth.signOut()
          setUser(null); setProfile(null); setLoading(false)
          return
        }
      }

      setProfile(data)
      // تحديث آخر دخول دون إيقاف التحميل (لا ننتظره)
      supabase.from('profiles').update({ last_login: new Date().toISOString() })
        .eq('id', userId).then(() => {}, () => {})
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    // ── دخول المطوّر للمعاينة: admin / admin ──
    // متاح فقط في بيئة التطوير (import.meta.env.DEV) ولا يعمل إطلاقاً في
    // النسخة المنشورة (الإنتاج) — لإغلاق ثغرة تجاوز المصادقة من المتصفح.
    if (import.meta.env.DEV &&
        (email === 'admin' || email === 'admin@admin.com') && password === 'admin') {
      const devUser = { id: 'dev-admin-preview', email: 'admin@jabla.gov.sy' }
      setUser(devUser)
      setProfile({
        id: 'dev-admin-preview',
        full_name: 'مدير المعاينة',
        role: 'admin',
        is_active: true,
        must_change_password: false,
      })
      setLoading(false)
      return { data: { user: devUser }, error: null }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      await supabase.from('security_events').insert({
        event_type: 'login_failed', email, details: error.message
      }).catch(() => {})
    } else {
      // تسجيل الدخول الناجح في سجل الأمان
      const ua = navigator.userAgent
      const device = /Mobile|Android|iPhone/i.test(ua) ? 'mobile' : 'desktop'
      supabase.rpc('record_login', { p_ip: '', p_agent: ua.slice(0,200), p_device: device }).catch(() => {})
    }
    return { data, error }
  }

  const signOut = async () => {
    clearTimeout(idleRef.current); clearTimeout(warnRef.current)
    await supabase.auth.signOut()
    setUser(null); setProfile(null); setIdleWarn(false)
  }

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (!error && profile) {
      await supabase.from('profiles').update({ must_change_password: false }).eq('id', profile.id)
      setProfile(p => ({ ...p, must_change_password: false }))
    }
    return { error }
  }

  const value = { user, profile, loading, idleWarn, setIdleWarn, signIn, signOut, updatePassword, fetchProfile }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
