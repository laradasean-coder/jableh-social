import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/appStore'
import { CATEGORIES, timeAgo } from '../../utils/format'
import { Users, Building2, HeartHandshake, TrendingUp, AlertCircle, CheckCircle, RefreshCw, Trash2, ArrowLeft, Gauge, Activity } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useState } from 'react'

function BarChart({ data }) {
  const max = Math.max(...data.map(d=>d.value),1)
  return (
    <div className="flex items-end gap-2 h-24 mt-2">
      {data.map(d=>(
        <div key={d.key} className="flex flex-col items-center flex-1 gap-1">
          <span className="text-xs font-bold text-gray-600">{d.value}</span>
          <div className="w-full rounded-t-lg" style={{height:`${(d.value/max)*70}px`,backgroundColor:d.color}}/>
          <span className="text-xs text-gray-400 leading-tight text-center" style={{fontSize:'10px'}}>{d.label.split(' ')[0]}</span>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { dashStats, dashLoading, dashLastSync, fetchDashStats } = useAppStore()
  const [showReset, setShowReset] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => { fetchDashStats() }, [])

  const s = dashStats || {}
  const chartData = Object.entries(CATEGORIES).map(([k,v])=>({key:k,label:v.label,color:v.color,value:s[k]||0}))

  const handleReset = async () => {
    setResetting(true)
    await Promise.all([
      supabase.from('relief_requests').delete().neq('id','00000000-0000-0000-0000-000000000000'),
      supabase.from('beneficiaries').delete().neq('id','00000000-0000-0000-0000-000000000000'),
      supabase.from('audit_logs').delete().neq('id','00000000-0000-0000-0000-000000000000'),
    ])
    setShowReset(false); setResetting(false); fetchDashStats()
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">لوحة التحكم — المدير</h1>
          <p className="text-gray-400 text-xs mt-1 flex items-center gap-1">
            آخر تحديث: {dashLastSync ? dashLastSync.toLocaleTimeString('ar') : '—'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchDashStats} disabled={dashLoading} className="flex items-center gap-2 btn-secondary text-sm">
            <RefreshCw size={14} className={dashLoading?'animate-spin':''}/> تحديث
          </button>
          <button onClick={()=>setShowReset(true)} className="flex items-center gap-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm font-medium">
            <Trash2 size={14}/> تصفير البيانات
          </button>
        </div>
      </div>

      {showReset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
            <div className="text-5xl mb-3">⚠️</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">تصفير كامل البيانات</h3>
            <p className="text-gray-500 text-sm mb-5">سيتم حذف جميع المستفيدين وطلبات الإغاثة والسجلات. لا يمكن التراجع.</p>
            <div className="flex gap-3">
              <button onClick={()=>setShowReset(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">إلغاء</button>
              <button onClick={handleReset} disabled={resetting} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm">
                {resetting?'جاري...':'تأكيد التصفير'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {label:'إجمالي المستفيدين',value:s.total||0,icon:Users,color:'blue',to:'/beneficiaries'},
          {label:'طلبات معلقة',value:s.pendingRelief||0,icon:AlertCircle,color:'red',to:'/relief-admin',urgent:s.pendingRelief>0},
          {label:'جمعيات نشطة',value:s.associations||0,icon:Building2,color:'purple',to:'/associations'},
          {label:'سجلات هذا الشهر',value:s.newThisMonth||0,icon:TrendingUp,color:'green',to:'/beneficiaries'},
        ].map(k=>(
          <div key={k.label} onClick={()=>navigate(k.to)}
            className={`card cursor-pointer hover:shadow-md transition-all group ${k.urgent?'ring-2 ring-red-400 ring-offset-1':''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-${k.color}-50 group-hover:scale-110 transition-transform`}>
                <k.icon size={20} className={`text-${k.color}-600`}/>
              </div>
              {k.urgent&&<span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"/>}
            </div>
            <div className={`text-3xl font-bold text-${k.color}-700`}>{k.value}</div>
            <div className="text-sm text-gray-500 mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="card"><h3 className="font-bold text-gray-800 mb-1">توزيع الفئات</h3><BarChart data={chartData}/></div>
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-3">روابط سريعة</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              {label:'سجل العمليات',icon:Activity,to:'/audit-log',color:'gray'},
              {label:'صحة النظام',icon:Gauge,to:'/status',color:'blue'},
              {label:'إدارة الموظفين',icon:Users,to:'/employees',color:'purple'},
              {label:'التحليلات',icon:TrendingUp,to:'/analytics',color:'green'},
            ].map(q=>(
              <button key={q.label} onClick={()=>navigate(q.to)}
                className={`p-3 rounded-xl bg-${q.color}-50 hover:bg-${q.color}-100 border border-${q.color}-200 text-${q.color}-700 text-xs font-semibold text-center transition-all`}>
                <q.icon size={16} className="mx-auto mb-1"/>
                {q.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      {s.recentBens?.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">آخر التسجيلات</h3>
            <button onClick={()=>navigate('/beneficiaries')} className="text-xs text-blue-600 hover:underline flex items-center gap-1">عرض الكل <ArrowLeft size={12}/></button>
          </div>
          <div className="space-y-2">
            {s.recentBens.map(r=>(
              <div key={r.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50">
                <span className="text-lg">{CATEGORIES[r.category]?.icon}</span>
                <span className="flex-1 font-semibold text-sm text-gray-800">{r.full_name}</span>
                <span className="text-xs text-gray-400">{timeAgo(r.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
