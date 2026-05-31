import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Shield, Eye, EyeOff, RefreshCw, AlertCircle, CheckCircle, Building2 } from 'lucide-react'

export default function LoginPage() {
  const [mode,     setMode]     = useState('login') // login | signup
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')

  // signup fields
  const [su, setSu] = useState({ name:'', president_name:'', phone:'', email:'', password:'', confirm:'' })

  const { signIn } = useAuth()
  const navigate   = useNavigate()

  const handleSubmit = async () => {
    if (!email || !password) return setError('يُرجى إدخال البريد وكلمة المرور')
    setLoading(true); setError('')
    try {
      const { error: err } = await signIn(email, password)
      if (err) {
        setError('بيانات الدخول غير صحيحة. يُرجى التحقق من البريد الإلكتروني وكلمة المرور.')
        return
      }
      // فحص الجمعيات قيد المراجعة يتم مركزياً داخل useAuth.fetchProfile،
      // فإن سُجّل الخروج هناك ستبقى الجلسة فارغة. ننتقل للرئيسية والتوجيه
      // حسب الدور يُدار من التطبيق.
      navigate('/')
    } catch (e) {
      setError('تعذّر تسجيل الدخول. حاول مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async () => {
    setError('')
    if (!su.name || !su.president_name || !su.email || !su.password)
      return setError('يُرجى ملء الحقول المطلوبة (*)')
    if (su.password.length < 6) return setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    if (su.password !== su.confirm) return setError('كلمتا المرور غير متطابقتين')
    setLoading(true)
    try {
      const { data, error: signErr } = await supabase.auth.signUp({
        email: su.email,
        password: su.password,
        options: { data: { full_name: su.president_name, role: 'association', phone: su.phone } }
      })
      if (signErr) { setError('تعذّر إنشاء الحساب: ' + signErr.message); setLoading(false); return }

      let userId = data?.user?.id
      // ضمان وجود جلسة لإدراج سجل الجمعية (إن لم يُفعّل تأكيد البريد)
      if (!data?.session) {
        const { data: sIn } = await supabase.auth.signInWithPassword({ email: su.email, password: su.password })
        userId = sIn?.user?.id || userId
      }

      if (userId) {
        await supabase.from('associations').insert({
          name: su.name, president_name: su.president_name,
          phone: su.phone, email: su.email,
          user_id: userId, is_active: false, status: 'pending'
        })
      }
      await supabase.auth.signOut()
      setSuccess('تم إرسال طلب تسجيل الجمعية بنجاح. سيتم تفعيل الحساب بعد مراجعة الإدارة واعتماده.')
      setMode('login')
      setSu({ name:'', president_name:'', phone:'', email:'', password:'', confirm:'' })
    } catch (e) {
      setError('حدث خطأ غير متوقع: ' + e.message)
    }
    setLoading(false)
  }

  const f = (k) => (e) => setSu(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
            {mode==='login' ? <Shield size={36} className="text-blue-700" /> : <Building2 size={36} className="text-blue-700" />}
          </div>
          <h1 className="text-2xl font-bold text-gray-800">{mode==='login' ? 'تسجيل الدخول' : 'تسجيل جمعية جديدة'}</h1>
          <p className="text-gray-500 text-sm mt-1">دائرة جبلة للشؤون الاجتماعية والعمل</p>
        </div>

        {success && (
          <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm mb-4">
            <CheckCircle size={16} className="shrink-0 mt-0.5" /> {success}
          </div>
        )}

        {mode === 'login' ? (
          <div className="space-y-4">
            <div>
              <label className="label">اسم المستخدم أو البريد الإلكتروني</label>
              <input type="text" className="input" dir="ltr" placeholder="user@jabla.gov.sy"
                value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>
            <div>
              <label className="label">كلمة المرور</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className="input pl-10" dir="ltr" placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base">
              {loading ? <><RefreshCw size={18} className="animate-spin" /> جاري الدخول...</> : 'تسجيل الدخول'}
            </button>

            <div className="text-center text-sm text-gray-500">
              جمعية أهلية وتريد إنشاء حساب؟{' '}
              <button onClick={() => { setMode('signup'); setError(''); setSuccess('') }} className="text-blue-600 font-semibold hover:underline">
                سجّل جمعيتك
              </button>
            </div>

            <button onClick={() => navigate('/')} className="btn-secondary w-full text-center">العودة للموقع</button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="label">اسم الجمعية <span className="text-red-500">*</span></label>
              <input className="input w-full" value={su.name} onChange={f('name')} placeholder="اسم الجمعية الرسمي"/>
            </div>
            <div>
              <label className="label">اسم رئيس الجمعية <span className="text-red-500">*</span></label>
              <input className="input w-full" value={su.president_name} onChange={f('president_name')}/>
            </div>
            <div>
              <label className="label">رقم الهاتف</label>
              <input className="input w-full" dir="ltr" value={su.phone} onChange={f('phone')}/>
            </div>
            <div>
              <label className="label">البريد الإلكتروني <span className="text-red-500">*</span></label>
              <input type="email" className="input w-full" dir="ltr" value={su.email} onChange={f('email')}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">كلمة المرور <span className="text-red-500">*</span></label>
                <input type="password" className="input w-full" dir="ltr" value={su.password} onChange={f('password')}/>
              </div>
              <div>
                <label className="label">تأكيد كلمة المرور <span className="text-red-500">*</span></label>
                <input type="password" className="input w-full" dir="ltr" value={su.confirm} onChange={f('confirm')}/>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
              </div>
            )}

            <button onClick={handleSignup} disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base">
              {loading ? <><RefreshCw size={18} className="animate-spin" /> جاري الإرسال...</> : 'إرسال طلب التسجيل'}
            </button>

            <div className="text-center text-sm text-gray-500">
              لديك حساب بالفعل؟{' '}
              <button onClick={() => { setMode('login'); setError('') }} className="text-blue-600 font-semibold hover:underline">
                تسجيل الدخول
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
