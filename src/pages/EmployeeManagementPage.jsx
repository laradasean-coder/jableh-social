import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { DEPARTMENTS } from '../lib/permissions'
import {
  Users, Plus, X, Save, RefreshCw, Eye, EyeOff,
  Edit2, Trash2, ShieldCheck, Shield, Lock, UserCheck
} from 'lucide-react'

const ROLES = {
  admin:       { label: 'مسؤول النظام', color: 'bg-red-100 text-red-700' },
  staff:       { label: 'موظف',          color: 'bg-blue-100 text-blue-700' },
  unit_head:   { label: 'رئيس وحدة',    color: 'bg-green-100 text-green-700' },
  association: { label: 'جمعية',         color: 'bg-purple-100 text-purple-700' },
}

const EMPTY_FORM = { email:'', full_name:'', role:'staff', department:'', unit_name:'', phone:'', password:'Jabla@1234', confirm_password:'Jabla@1234' }

export default function EmployeeManagementPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [units,     setUnits]     = useState([])
  const [loading,   setLoading]   = useState(false)
  const [showAdd,   setShowAdd]   = useState(false)
  const [showPwModal, setShowPwModal] = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [pwForm,    setPwForm]    = useState({ password:'', confirm:'' })
  const [showPw,    setShowPw]    = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')

  useEffect(() => {
    if (profile?.role !== 'admin') { navigate('/'); return }
    fetchEmployees()
    fetchUnits()
  }, [profile])

  const fetchUnits = async () => {
    const { data } = await supabase.from('rural_units').select('name').order('name')
    if (data) setUnits(data.map(u => u.name))
  }

  const fetchEmployees = async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    if (data) setEmployees(data)
    setLoading(false)
  }

  const handleAddEmployee = async () => {
    setError('')
    if (!form.email || !form.full_name || !form.password) return setError('جميع الحقول المطلوبة يجب ملؤها')
    if (form.password !== form.confirm_password) return setError('كلمتا المرور غير متطابقتان')
    if (form.password.length < 6) return setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    setSaving(true)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('admin-users', {
        body: { action: 'create', email: form.email, password: form.password,
                full_name: form.full_name, role: form.role, phone: form.phone,
                department: form.role === 'staff' ? (form.department || null) : null,
                unit_name: form.role === 'unit_head' ? (form.unit_name || null) : null }
      })
      if (fnErr || data?.error) {
        setError('حدث خطأ: ' + (data?.error || fnErr.message))
      } else {
        setSuccess('تم إنشاء حساب الموظف بنجاح')
        setShowAdd(false); setForm(EMPTY_FORM)
        fetchEmployees()
      }
    } catch(e) { setError('حدث خطأ غير متوقع: ' + e.message) }
    setSaving(false)
  }

  const handleChangePassword = async () => {
    setError('')
    if (!pwForm.password || pwForm.password.length < 6) return setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    if (pwForm.password !== pwForm.confirm) return setError('كلمتا المرور غير متطابقتان')
    setSaving(true)
    const { data, error: fnErr } = await supabase.functions.invoke('admin-users', {
      body: { action: 'set_password', user_id: showPwModal.id, password: pwForm.password }
    })
    if (fnErr || data?.error) { setError('حدث خطأ: ' + (data?.error || fnErr.message)) }
    else {
      setSuccess('تم تغيير كلمة المرور بنجاح')
      setShowPwModal(null); setPwForm({ password:'', confirm:'' })
    }
    setSaving(false)
  }

  const handleUpdateRole = async (emp, newRole) => {
    const patch = { role: newRole }
    if (newRole !== 'staff')     patch.department = null
    if (newRole !== 'unit_head') patch.unit_name  = null
    await supabase.from('profiles').update(patch).eq('id', emp.id)
    setEmployees(prev => prev.map(e => e.id===emp.id ? {...e, ...patch} : e))
    setSuccess('تم تحديث الدور بنجاح')
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleUpdateField = async (emp, field, value) => {
    const v = value || null
    await supabase.from('profiles').update({ [field]: v }).eq('id', emp.id)
    setEmployees(prev => prev.map(e => e.id===emp.id ? {...e, [field]: v} : e))
    setSuccess('تم التحديث بنجاح')
    setTimeout(() => setSuccess(''), 2500)
  }

  const handleDelete = async (emp) => {
    if (!confirm(`هل تريد حذف حساب "${emp.full_name}"؟`)) return
    const { data, error: fnErr } = await supabase.functions.invoke('admin-users', {
      body: { action: 'delete', user_id: emp.id }
    })
    if (fnErr || data?.error) { setError('تعذّر الحذف: ' + (data?.error || fnErr.message)); return }
    setEmployees(prev => prev.filter(e => e.id !== emp.id))
    setSuccess('تم حذف الموظف')
    setTimeout(() => setSuccess(''), 3000)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إدارة الموظفين</h1>
          <p className="text-gray-500 text-sm mt-1">{employees.length} مستخدم مسجّل</p>
        </div>
        <button onClick={() => { setShowAdd(true); setError(''); setForm(EMPTY_FORM) }}
          className="flex items-center gap-2 btn-primary text-sm">
          <Plus size={16}/> إضافة موظف
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-3 text-green-700 text-sm">
          <UserCheck size={18}/> {success}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw size={24} className="animate-spin text-blue-500"/></div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['الاسم','البريد','الدور','القسم / الوحدة','الهاتف','آخر دخول','إجراءات'].map(h => (
                  <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-800">{emp.full_name||'—'}</div>
                    {emp.must_change_password && (
                      <span className="text-xs text-orange-600 flex items-center gap-1 mt-0.5">
                        <Lock size={10}/> يجب تغيير كلمة المرور
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs" dir="ltr">{emp.email||'—'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={emp.role||'staff'}
                      onChange={e => handleUpdateRole(emp, e.target.value)}
                      className={`badge text-xs cursor-pointer border-0 outline-none ${ROLES[emp.role]?.color||'bg-gray-100 text-gray-600'}`}>
                      {Object.entries(ROLES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {emp.role === 'staff' && (
                      <select
                        value={emp.department||''}
                        onChange={e => handleUpdateField(emp, 'department', e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none bg-white cursor-pointer">
                        <option value="">— عام —</option>
                        {Object.entries(DEPARTMENTS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    )}
                    {emp.role === 'unit_head' && (
                      <select
                        value={emp.unit_name||''}
                        onChange={e => handleUpdateField(emp, 'unit_name', e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none bg-white cursor-pointer">
                        <option value="">— اختر الوحدة —</option>
                        {units.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    )}
                    {emp.role !== 'staff' && emp.role !== 'unit_head' && (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs" dir="ltr">{emp.phone||'—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {emp.last_login ? new Date(emp.last_login).toLocaleDateString('ar') : 'لم يدخل بعد'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setShowPwModal(emp); setError(''); setPwForm({password:'',confirm:''}) }}
                        title="تغيير كلمة المرور"
                        className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors">
                        <Lock size={14}/>
                      </button>
                      <button onClick={() => handleDelete(emp)}
                        title="حذف الموظف"
                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800">إضافة موظف جديد</h3>
              <button onClick={() => setShowAdd(false)}><X size={20}/></button>
            </div>
            {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-xl mb-3">{error}</p>}
            <div className="space-y-3">
              {[
                { key:'full_name', label:'الاسم الكامل', req:true },
                { key:'email', label:'البريد الإلكتروني', req:true, type:'email', dir:'ltr' },
                { key:'phone', label:'رقم الهاتف' },
              ].map(f => (
                <div key={f.key}>
                  <label className="label text-sm">{f.label}{f.req&&<span className="text-red-500 mr-1">*</span>}</label>
                  <input className="input w-full" type={f.type||'text'} dir={f.dir}
                    value={form[f.key]||''} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}/>
                </div>
              ))}
              <div>
                <label className="label text-sm">الدور</label>
                <select className="input w-full" value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}>
                  {Object.entries(ROLES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              {form.role === 'staff' && (
                <div>
                  <label className="label text-sm">القسم الوظيفي</label>
                  <select className="input w-full" value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))}>
                    <option value="">عام (كل أقسام الموظفين)</option>
                    {Object.entries(DEPARTMENTS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">يحدّد القسمُ ما يظهر للموظف في الموقع.</p>
                </div>
              )}
              {form.role === 'unit_head' && (
                <div>
                  <label className="label text-sm">الوحدة الريفية</label>
                  <select className="input w-full" value={form.unit_name} onChange={e=>setForm(p=>({...p,unit_name:e.target.value}))}>
                    <option value="">— اختر الوحدة —</option>
                    {units.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">سيرى رئيس الوحدة وحدتَه فقط عند الدخول.</p>
                </div>
              )}
              <div>
                <label className="label text-sm">كلمة المرور الأولية <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input className="input w-full pl-10" type={showPw?'text':'password'}
                    value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))}/>
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              <div>
                <label className="label text-sm">تأكيد كلمة المرور</label>
                <input className="input w-full" type="password"
                  value={form.confirm_password} onChange={e=>setForm(p=>({...p,confirm_password:e.target.value}))}/>
              </div>
              <p className="text-xs text-gray-400">سيُطلب من الموظف تغيير كلمة المرور عند أول دخول</p>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">إلغاء</button>
              <button onClick={handleAddEmployee} disabled={saving} className="flex-1 btn-primary text-sm">
                {saving ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPwModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800">تغيير كلمة مرور {showPwModal.full_name}</h3>
              <button onClick={() => setShowPwModal(null)}><X size={20}/></button>
            </div>
            {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-xl mb-3">{error}</p>}
            <div className="space-y-3">
              <div>
                <label className="label text-sm">كلمة المرور الجديدة</label>
                <input className="input w-full" type="password"
                  value={pwForm.password} onChange={e=>setPwForm(p=>({...p,password:e.target.value}))}/>
              </div>
              <div>
                <label className="label text-sm">تأكيد كلمة المرور</label>
                <input className="input w-full" type="password"
                  value={pwForm.confirm} onChange={e=>setPwForm(p=>({...p,confirm:e.target.value}))}/>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowPwModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">إلغاء</button>
              <button onClick={handleChangePassword} disabled={saving} className="flex-1 btn-primary text-sm">
                {saving ? 'جاري الحفظ...' : 'تغيير كلمة المرور'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
