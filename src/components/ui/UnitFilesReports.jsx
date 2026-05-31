import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import FileUpload from './FileUpload'
import {
  FolderOpen, FileSpreadsheet, FileText, Image as ImageIcon,
  Trash2, Download, Send, CheckCircle, CalendarDays, ClipboardList, UserCheck
} from 'lucide-react'

const FILE_ACCEPT =
  '.xlsx,.xls,.csv,.doc,.docx,image/*,' +
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,' +
  'application/vnd.ms-excel,application/msword,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const ATT_STATUS = [
  { v:'present', l:'حاضر',  c:'bg-green-100 text-green-700' },
  { v:'absent',  l:'غائب',  c:'bg-red-100 text-red-700' },
  { v:'leave',   l:'إجازة', c:'bg-blue-100 text-blue-700' },
  { v:'late',    l:'متأخر', c:'bg-amber-100 text-amber-700' },
  { v:'mission', l:'مهمة',  c:'bg-purple-100 text-purple-700' },
]

function iconFor(type = '', name = '') {
  const t = (type + ' ' + name).toLowerCase()
  if (/(sheet|excel|xlsx|xls|csv)/.test(t)) return <FileSpreadsheet size={16} className="text-green-600"/>
  if (/(image|png|jpg|jpeg|gif|webp)/.test(t)) return <ImageIcon size={16} className="text-purple-600"/>
  return <FileText size={16} className="text-blue-600"/>
}

export default function UnitFilesReports({ unitKey, unitName, color = '#0D4A35' }) {
  const { profile } = useAuth()
  const [tab, setTab] = useState('files')
  const today = new Date().toISOString().slice(0, 10)

  // files
  const [files, setFiles] = useState([])
  const [loadingFiles, setLoadingFiles] = useState(true)

  // report
  const [rep, setRep] = useState({ report_type: 'daily', report_date: today, title: '', body: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [repErr, setRepErr] = useState('')

  // attendance
  const [emps, setEmps] = useState([])
  const [att, setAtt] = useState({})         // employee_id -> status
  const [attDate, setAttDate] = useState(today)
  const [recipients, setRecipients] = useState([])
  const [recipient, setRecipient] = useState('')
  const [attMsg, setAttMsg] = useState('')

  const fetchFiles = useCallback(async () => {
    setLoadingFiles(true)
    const { data } = await supabase.from('uploaded_files').select('*')
      .eq('entity_type', 'rural_unit').eq('entity_id', unitKey)
      .order('uploaded_at', { ascending: false })
    setFiles(data || []); setLoadingFiles(false)
  }, [unitKey])

  const fetchAttendance = useCallback(async () => {
    const { data: e } = await supabase.from('unit_employees').select('id,full_name').eq('unit_name', unitName)
    setEmps(e || [])
    const { data: a } = await supabase.from('attendance').select('employee_id,status')
      .eq('unit_key', unitKey).eq('att_date', attDate)
    const map = {}; (a || []).forEach(r => { map[r.employee_id] = r.status })
    setAtt(map)
  }, [unitKey, unitName, attDate])

  useEffect(() => { fetchFiles() }, [fetchFiles])
  useEffect(() => { if (tab === 'attendance') fetchAttendance() }, [tab, fetchAttendance])
  useEffect(() => {
    supabase.rpc('list_staff_recipients').then(({ data }) => {
      setRecipients(data || [])
      if (data && data[0] && !recipient) setRecipient(data[0].id)
    })
  }, []) // eslint-disable-line

  const deleteFile = async (f) => {
    if (!confirm(`حذف الملف "${f.file_name}"؟`)) return
    await supabase.from('uploaded_files').delete().eq('id', f.id)
    setFiles(prev => prev.filter(x => x.id !== f.id))
  }

  const submitReport = async () => {
    setRepErr('')
    if (!rep.body.trim()) return setRepErr('يُرجى كتابة محتوى التقرير')
    setSending(true)
    const { error } = await supabase.from('unit_reports').insert({
      unit_key: unitKey, unit_name: unitName, report_type: rep.report_type,
      report_date: rep.report_date,
      title: rep.title || (rep.report_type === 'daily' ? 'تقرير يومي' : 'تقرير أسبوعي'),
      body: rep.body,
      submitted_by: profile?.id && profile.id !== 'dev-admin-preview' ? profile.id : null,
      submitted_by_name: profile?.full_name || 'رئيس الوحدة',
    })
    setSending(false)
    if (error) return setRepErr('تعذّر إرسال التقرير: ' + error.message)
    setSent(true); setRep({ report_type:'daily', report_date:today, title:'', body:'' })
    setTimeout(() => setSent(false), 4000)
  }

  const setStatus = (id, v) => setAtt(p => ({ ...p, [id]: v }))

  const saveAttendance = async () => {
    setAttMsg('')
    const rows = emps.map(e => ({
      unit_key: unitKey, unit_name: unitName, employee_id: e.id, employee_name: e.full_name,
      att_date: attDate, status: att[e.id] || 'present',
      recorded_by: profile?.id && profile.id !== 'dev-admin-preview' ? profile.id : null,
    }))
    if (rows.length === 0) return setAttMsg('لا يوجد موظفون في هذه الوحدة لتسجيل دوامهم')
    const { error } = await supabase.from('attendance')
      .upsert(rows, { onConflict: 'unit_key,employee_id,att_date' })
    setAttMsg(error ? 'تعذّر الحفظ: ' + error.message : 'تم حفظ سجل الدوام ✓')
    setTimeout(() => setAttMsg(''), 4000)
  }

  const sendSheet = async () => {
    setAttMsg('')
    if (!recipient) return setAttMsg('اختر الموظف المسؤول')
    await saveAttendance()
    const counts = ATT_STATUS.map(s => `${s.l}: ${emps.filter(e => (att[e.id]||'present')===s.v).length}`).join('، ')
    const lines = emps.map(e => `• ${e.full_name}: ${ATT_STATUS.find(s=>s.v===(att[e.id]||'present'))?.l}`).join('\n')
    const summary = `كشف دوام ${unitName} ليوم ${attDate}\n${counts}\n\n${lines}`
    const { error } = await supabase.rpc('send_attendance_sheet', {
      p_recipient: recipient, p_unit_name: unitName, p_date: attDate, p_summary: summary,
    })
    setAttMsg(error ? 'تعذّر الإرسال: ' + error.message : 'تم إرسال الكشف إلى الموظف المسؤول ✓')
    setTimeout(() => setAttMsg(''), 4000)
  }

  const TabBtn = ({ id, icon:Icon, label }) => (
    <button onClick={() => setTab(id)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${tab===id?'bg-white shadow text-gray-800':'text-gray-500 hover:bg-white/60'}`}>
      <Icon size={15}/> {label}
    </button>
  )

  return (
    <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <TabBtn id="files" icon={FolderOpen} label="سجلّات وملفات الوحدة"/>
        <TabBtn id="attendance" icon={UserCheck} label="سجل الدوام"/>
        <TabBtn id="report" icon={ClipboardList} label="رفع تقرير للمدير"/>
      </div>

      {tab === 'files' && (
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <p className="text-sm text-gray-500">ملفات Excel / Word / صور (سجلات وغيرها)</p>
            <FileUpload entityType="rural_unit" entityId={unitKey} accept={FILE_ACCEPT}
              label="رفع ملف / سجل" onUploaded={fetchFiles}/>
          </div>
          {loadingFiles ? <p className="text-sm text-gray-400 py-4 text-center">جاري التحميل...</p>
          : files.length === 0 ? <p className="text-sm text-gray-400 py-6 text-center bg-white rounded-xl border border-dashed">لا توجد ملفات بعد.</p>
          : <div className="space-y-2">
              {files.map(f => (
                <div key={f.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-3 py-2">
                  {iconFor(f.file_type, f.file_name)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{f.file_name}</p>
                    <p className="text-xs text-gray-400">{f.file_size ? (f.file_size/1024).toFixed(0)+' KB' : ''} · {f.uploaded_at ? new Date(f.uploaded_at).toLocaleDateString('ar') : ''}</p>
                  </div>
                  <a href={f.file_url} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"><Download size={15}/></a>
                  <button onClick={() => deleteFile(f)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={15}/></button>
                </div>
              ))}
            </div>}
        </div>
      )}

      {tab === 'attendance' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="label text-sm flex items-center gap-1"><CalendarDays size={13}/> التاريخ</label>
            <input type="date" className="input w-auto" value={attDate} onChange={e=>setAttDate(e.target.value)}/>
          </div>
          {emps.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center bg-white rounded-xl border border-dashed">
              لا يوجد موظفون مسجّلون في الوحدة. أضِف الموظفين أولاً من كشف الموظفين.
            </p>
          ) : (
            <div className="space-y-2">
              {emps.map(e => (
                <div key={e.id} className="flex items-center justify-between gap-3 bg-white rounded-xl border border-gray-100 px-3 py-2 flex-wrap">
                  <span className="text-sm text-gray-800 font-medium">{e.full_name}</span>
                  <div className="flex gap-1 flex-wrap">
                    {ATT_STATUS.map(s => (
                      <button key={s.v} onClick={()=>setStatus(e.id, s.v)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${ (att[e.id]||'present')===s.v ? s.c+' ring-1 ring-offset-1' : 'bg-gray-50 text-gray-400'}`}>
                        {s.l}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <select className="input w-auto text-sm" value={recipient} onChange={e=>setRecipient(e.target.value)}>
              <option value="">— الموظف المسؤول —</option>
              {recipients.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
            </select>
            <button onClick={saveAttendance} className="btn-secondary text-sm flex items-center gap-1.5"><CheckCircle size={14}/> حفظ</button>
            <button onClick={sendSheet} disabled={emps.length===0}
              className="flex items-center gap-1.5 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60" style={{background:color}}>
              <Send size={14}/> إرسال الكشف للمسؤول
            </button>
          </div>
          {attMsg && <p className="text-sm text-green-700">{attMsg}</p>}
        </div>
      )}

      {tab === 'report' && (
        <div className="space-y-3">
          {sent && <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm"><CheckCircle size={16}/> تم إرسال التقرير إلى صفحة تقارير المدير.</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-sm">نوع التقرير</label>
              <select className="input w-full" value={rep.report_type} onChange={e=>setRep(p=>({...p,report_type:e.target.value}))}>
                <option value="daily">تقرير يومي</option><option value="weekly">تقرير أسبوعي</option>
              </select>
            </div>
            <div>
              <label className="label text-sm flex items-center gap-1"><CalendarDays size={13}/> التاريخ</label>
              <input type="date" className="input w-full" value={rep.report_date} onChange={e=>setRep(p=>({...p,report_date:e.target.value}))}/>
            </div>
          </div>
          <div>
            <label className="label text-sm">عنوان التقرير (اختياري)</label>
            <input className="input w-full" value={rep.title} onChange={e=>setRep(p=>({...p,title:e.target.value}))}/>
          </div>
          <div>
            <label className="label text-sm">محتوى التقرير</label>
            <textarea className="input w-full h-32 resize-y" value={rep.body} onChange={e=>setRep(p=>({...p,body:e.target.value}))}/>
          </div>
          {repErr && <p className="text-red-600 text-sm">{repErr}</p>}
          <button onClick={submitReport} disabled={sending} className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60" style={{background:color}}>
            <Send size={15}/> {sending ? 'جاري الإرسال...' : 'إرسال إلى المدير'}
          </button>
        </div>
      )}
    </div>
  )
}
