import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Building2, Send, FileText, MessageSquare } from 'lucide-react'

export default function AssociationDashboard() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-gradient-to-br from-purple-700 to-purple-500 text-white rounded-3xl p-7">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
            <Building2 size={28}/>
          </div>
          <div>
            <p className="text-purple-200 text-sm">مرحباً بك</p>
            <h2 className="text-2xl font-bold">{profile?.full_name || 'الجمعية'}</h2>
          </div>
        </div>
        <p className="text-purple-100 text-sm leading-relaxed">
          يمكنك إدارة بيانات جمعيتك وتقديم طلبات الاطلاع على السجلات عبر هذه اللوحة.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          {label:'بيانات جمعيتي',   icon:Building2,  to:'/associations',     color:'purple'},
          {label:'طلب الاطلاع',      icon:Send,        to:'/associations',     color:'blue'},
          {label:'طلبات الوصول',    icon:FileText,    to:'/access-requests',  color:'orange'},
          {label:'التواصل معنا',    icon:MessageSquare,to:'/track',            color:'green'},
        ].map(a=>(
          <button key={a.label} onClick={()=>navigate(a.to)}
            className={`p-5 rounded-2xl bg-${a.color}-50 border border-${a.color}-100 hover:border-${a.color}-300 text-center transition-all hover:scale-105`}>
            <a.icon size={22} className={`text-${a.color}-600 mx-auto mb-2`}/>
            <p className={`font-semibold text-sm text-${a.color}-800`}>{a.label}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
