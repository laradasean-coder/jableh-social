import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Lock, Eye, EyeOff, RefreshCw, Shield } from 'lucide-react'

export default function ChangePasswordModal() {
  const { updatePassword } = useAuth()
  const [pw,      setPw]      = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw,  setShowPw]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleSubmit = async () => {
    setError('')
    if (!pw) return setError('أدخل كلمة المرور الجديدة')
    if (pw.length < 6) return setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    if (pw !== confirm) return setError('كلمتا المرور غير متطابقتان')
    setLoading(true)
    const { error: err } = await updatePassword(pw)
    if (err) setError('فشل التغيير: ' + err.message)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-5">
        <div className="text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-orange-600"/>
          </div>
          <h2 className="text-xl font-bold text-gray-800">يجب تغيير كلمة المرور</h2>
          <p className="text-gray-500 text-sm mt-1">
            هذا أول دخول لك. يرجى تغيير كلمة المرور الافتراضية قبل المتابعة.
          </p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">كلمة المرور الجديدة</label>
            <div className="relative">
              <input className="input pl-10" type={showPw ? 'text' : 'password'} dir="ltr"
                value={pw} onChange={e => setPw(e.target.value)} placeholder="6 أحرف على الأقل"/>
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
          </div>
          <div>
            <label className="label">تأكيد كلمة المرور</label>
            <input className="input" type="password" dir="ltr"
              value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="أعد الإدخال"/>
          </div>
        </div>
        {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded-lg">{error}</p>}
        <button onClick={handleSubmit} disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3">
          {loading ? <RefreshCw size={16} className="animate-spin"/> : <Lock size={16}/>}
          تغيير كلمة المرور والمتابعة
        </button>
      </div>
    </div>
  )
}
