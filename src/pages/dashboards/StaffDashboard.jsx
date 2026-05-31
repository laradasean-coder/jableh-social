import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/appStore'
import { CATEGORIES, timeAgo } from '../../utils/format'
import { Users, HeartHandshake, CheckCircle, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react'
import { SkeletonDashboard } from '../../components/ui/skeleton/Skeleton'

export default function StaffDashboard() {
  const navigate = useNavigate()
  const { dashStats: s, dashLoading, fetchDashStats, dashLastSync } = useAppStore()

  useEffect(() => { fetchDashStats() }, [])

  if (dashLoading && !s) return <SkeletonDashboard/>

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">لوحة التحكم</h1>
          <p className="text-gray-400 text-xs mt-1">آخر تحديث: {dashLastSync?.toLocaleTimeString('ar')||'—'}</p>
        </div>
        <button onClick={fetchDashStats} disabled={dashLoading} className="btn-secondary text-sm flex items-center gap-2">
          <RefreshCw size={14} className={dashLoading?'animate-spin':''}/> تحديث
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          {label:'إجمالي المستفيدين',value:s?.total||0,color:'blue',to:'/beneficiaries'},
          {label:'طلبات إغاثة معلقة',value:s?.pendingRelief||0,color:'red',to:'/relief-admin',urgent:s?.pendingRelief>0},
          {label:'جديد هذا الشهر',value:s?.newThisMonth||0,color:'green',to:'/beneficiaries'},
        ].map(k=>(
          <div key={k.label} onClick={()=>navigate(k.to)}
            className={`card cursor-pointer hover:shadow-md transition-all ${k.urgent?'ring-2 ring-red-400':''}`}>
            <div className={`text-3xl font-bold text-${k.color}-600 mb-1`}>{k.value}</div>
            <div className="text-sm text-gray-500">{k.label}</div>
            {k.urgent&&<span className="text-xs text-red-500 font-semibold">⚠️ يحتاج مراجعة</span>}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="card">
        <h3 className="font-bold text-gray-800 mb-4">إجراءات سريعة</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            {label:'إضافة مستفيد جديد',icon:Users,to:'/beneficiaries',color:'blue'},
            {label:'مراجعة طلبات الإغاثة',icon:HeartHandshake,to:'/relief-admin',color:'red'},
          ].map(a=>(
            <button key={a.label} onClick={()=>navigate(a.to)}
              className={`p-4 rounded-2xl bg-${a.color}-50 border border-${a.color}-200 text-${a.color}-700 font-semibold text-sm hover:scale-105 transition-all text-center`}>
              <a.icon size={20} className="mx-auto mb-2"/>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent beneficiaries */}
      {s?.recentBens?.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">آخر التسجيلات</h3>
            <button onClick={()=>navigate('/beneficiaries')} className="text-xs text-blue-600 hover:underline flex items-center gap-1">عرض الكل <ArrowLeft size={12}/></button>
          </div>
          <div className="space-y-2">
            {s.recentBens.map(r=>(
              <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50">
                <span className="text-lg">{CATEGORIES[r.category]?.icon}</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-800">{r.full_name}</p>
                  <p className="text-xs text-gray-400">{CATEGORIES[r.category]?.label}</p>
                </div>
                <span className={`badge text-xs ${r.status==='active'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>
                  {r.status==='active'?'نشط':'معلق'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
