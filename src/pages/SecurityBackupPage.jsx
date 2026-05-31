import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { formatDateTime, timeAgo } from '../utils/format'
import {
  Shield, Download, RefreshCw, Monitor, Smartphone,
  Database, FileJson, FileSpreadsheet, Clock, CheckCircle,
  AlertTriangle, LogIn, HardDrive
} from 'lucide-react'

export default function SecurityBackupPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('security')
  const [logins, setLogins] = useState([])
  const [loading, setLoading] = useState(false)
  const [backupLoading, setBackupLoading] = useState('')

  useEffect(() => {
    if (profile && profile.role !== 'admin') { navigate('/'); return }
    fetchLogins()
  }, [profile])

  const fetchLogins = async () => {
    setLoading(true)
    const { data } = await supabase.from('login_history')
      .select('*').order('created_at', { ascending: false }).limit(50)
    setLogins(data || [])
    setLoading(false)
  }

  // ── النسخ الاحتياطي ──
  const TABLES = [
    { key:'beneficiaries', label:'المستفيدون' },
    { key:'relief_requests', label:'طلبات الإغاثة' },
    { key:'associations', label:'الجمعيات' },
    { key:'unit_employees', label:'موظفو الوحدات' },
    { key:'site_content', label:'محتوى الموقع' },
    { key:'audit_logs', label:'سجل العمليات' },
  ]

  const backupJSON = async () => {
    setBackupLoading('json')
    const backup = { generated_at: new Date().toISOString(), org: 'دائرة جبلة', data: {} }
    for (const t of TABLES) {
      const { data } = await supabase.from(t.key).select('*')
      backup.data[t.key] = data || []
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `نسخة_احتياطية_${new Date().toISOString().slice(0,10)}.json`
    a.click(); URL.revokeObjectURL(url)
    setBackupLoading('')
  }

  const backupExcel = async () => {
    setBackupLoading('excel')
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    for (const t of TABLES) {
      const { data } = await supabase.from(t.key).select('*')
      if (data?.length) {
        const ws = XLSX.utils.json_to_sheet(data)
        XLSX.utils.book_append_sheet(wb, ws, t.label.slice(0, 30))
      }
    }
    XLSX.writeFile(wb, `نسخة_احتياطية_${new Date().toISOString().slice(0,10)}.xlsx`)
    setBackupLoading('')
  }

  const deviceIcon = (type) => type === 'mobile' ? Smartphone : Monitor

  if (!user) return null

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Shield size={22} style={{ color:'#0D4A35' }}/> الأمان والنسخ الاحتياطي
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">مراقبة الدخول وحفظ نسخ احتياطية من البيانات</p>
      </div>

      <div className="flex gap-2">
        {[
          { key:'security', label:'سجل الدخول', icon:LogIn },
          { key:'backup',   label:'النسخ الاحتياطي', icon:Database },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${tab===t.key?'text-white shadow':'bg-white text-gray-600 border border-gray-200'}`}
            style={tab===t.key?{background:'#0D4A35'}:{}}>
            <t.icon size={16}/>{t.label}
          </button>
        ))}
      </div>

      {/* ── سجل الدخول ── */}
      {tab === 'security' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-500 text-sm">آخر {logins.length} عملية دخول</p>
            <button onClick={fetchLogins} disabled={loading} className="btn-secondary text-sm flex items-center gap-2">
              <RefreshCw size={14} className={loading?'animate-spin':''}/> تحديث
            </button>
          </div>

          {logins.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">
              <LogIn size={40} className="mx-auto mb-3 opacity-30"/>
              <p>لا توجد سجلات دخول بعد</p>
              <p className="text-xs mt-1">ستظهر هنا عمليات الدخول بعد تفعيل migration 010</p>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['المستخدم','الجهاز','عنوان IP','الوقت'].map(h => (
                      <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logins.map(l => {
                    const DIcon = deviceIcon(l.device_type)
                    return (
                      <tr key={l.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {l.success ? <CheckCircle size={14} className="text-green-500"/> : <AlertTriangle size={14} className="text-red-500"/>}
                            <span className="font-semibold text-gray-700 text-xs">{l.user_email||'—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><DIcon size={15} className="text-gray-400"/></td>
                        <td className="px-4 py-3 text-gray-400 text-xs" dir="ltr">{l.ip_address||'—'}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{timeAgo(l.created_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── النسخ الاحتياطي ── */}
      {tab === 'backup' && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background:'#0D4A3520' }}>
                <HardDrive size={20} style={{ color:'#0D4A35' }}/>
              </div>
              <div>
                <h3 className="font-bold text-gray-800">تصدير نسخة احتياطية كاملة</h3>
                <p className="text-xs text-gray-500 mt-0.5">احفظ نسخة من جميع بيانات المنظومة</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <p className="text-xs text-gray-500 mb-2">الجداول المُضمَّنة:</p>
              <div className="flex flex-wrap gap-1.5">
                {TABLES.map(t => <span key={t.key} className="badge bg-white text-gray-600 text-xs border border-gray-200">{t.label}</span>)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={backupJSON} disabled={backupLoading}
                className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-sm transition-all">
                {backupLoading==='json' ? <RefreshCw size={16} className="animate-spin"/> : <FileJson size={16}/>}
                تصدير JSON
              </button>
              <button onClick={backupExcel} disabled={backupLoading}
                className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-green-200 bg-green-50 hover:bg-green-100 text-green-700 font-semibold text-sm transition-all">
                {backupLoading==='excel' ? <RefreshCw size={16} className="animate-spin"/> : <FileSpreadsheet size={16}/>}
                تصدير Excel
              </button>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
            <p className="font-bold mb-1 flex items-center gap-2"><AlertTriangle size={15}/> نصيحة أمنية</p>
            <p className="text-amber-700 text-xs leading-relaxed">
              احتفظ بنسخة احتياطية أسبوعياً في مكان آمن. ملف JSON يصلح للاستعادة الكاملة، وملف Excel للمراجعة والأرشفة.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
