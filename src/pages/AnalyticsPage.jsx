import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, RefreshCw, BarChart2, Calendar } from 'lucide-react'

const CATEGORIES = {
  disabled:    { label: 'ذوو الإعاقة',   color: '#3B82F6' },
  widow:       { label: 'الأرامل',        color: '#8B5CF6' },
  orphan:      { label: 'الأيتام',        color: '#F59E0B' },
  divorced:    { label: 'المطلقات',       color: '#EC4899' },
  poor_family: { label: 'الأسر الفقيرة', color: '#10B981' },
}

function SimpleLineChart({ data, color = '#3B82F6', height = 80 }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d.value), 1)
  const min = 0
  const w = 100 / (data.length - 1)
  const points = data.map((d, i) => {
    const x = i * w
    const y = height - ((d.value - min) / (max - min)) * height
    return `${x},${y}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width:'100%', height }} className="block">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} strokeLinejoin="round" strokeLinecap="round"/>
      {data.map((d, i) => (
        <circle key={i} cx={i*w} cy={height - ((d.value - min)/(max-min))*height} r="1.5" fill={color}/>
      ))}
    </svg>
  )
}

function MiniBar({ data }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-1.5 h-20 mt-3">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center flex-1 gap-1">
          <span className="text-xs font-bold text-gray-600">{d.value}</span>
          <div className="w-full rounded-t transition-all"
            style={{ height: `${Math.round((d.value/max)*52)}px`, backgroundColor: d.color || '#3B82F6' }}/>
          <span className="text-xs text-gray-400 leading-tight text-center" style={{ fontSize:'10px' }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [kpis,     setKpis]     = useState({})
  const [monthly,  setMonthly]  = useState([])
  const [catData,  setCatData]  = useState([])
  const [distData, setDistData] = useState([])
  const [reliefKpi,setReliefKpi]= useState({})
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    fetchAll()
  }, [user])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [bRes, rRes] = await Promise.all([
        supabase.from('beneficiaries').select('category,status,district,created_at'),
        supabase.from('relief_requests').select('status,created_at'),
      ])
      const bens  = bRes.data || []
      const rels  = rRes.data || []
      const now   = new Date()
      const thisM = now.getMonth()
      const prevM = (thisM + 11) % 12

      // KPIs
      const thisMonth = bens.filter(b => new Date(b.created_at).getMonth() === thisM)
      const prevMonth = bens.filter(b => new Date(b.created_at).getMonth() === prevM)
      const growth = prevMonth.length ? Math.round((thisMonth.length - prevMonth.length) / prevMonth.length * 100) : 0
      setKpis({
        total: bens.length,
        thisMonth: thisMonth.length,
        growth,
        pending: bens.filter(b => b.status === 'pending').length,
        reliefTotal: rels.length,
        reliefPending: rels.filter(r => r.status === 'pending').length,
        reliefApproved: rels.filter(r => r.status === 'transferred').length,
      })

      // Monthly trend (last 6 months)
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now)
        d.setMonth(d.getMonth() - (5 - i))
        return { month: d.getMonth(), year: d.getFullYear(), label: d.toLocaleDateString('ar', { month:'short' }) }
      })
      setMonthly(months.map(m => ({
        label: m.label,
        value: bens.filter(b => {
          const d = new Date(b.created_at)
          return d.getMonth() === m.month && d.getFullYear() === m.year
        }).length
      })))

      // Category breakdown
      const cats = Object.entries(CATEGORIES).map(([k, v]) => ({
        label: v.label.split(' ')[0],
        value: bens.filter(b => b.category === k).length,
        color: v.color
      }))
      setCatData(cats)

      // District breakdown (top 6)
      const distCounts = {}
      bens.forEach(b => { if (b.district) distCounts[b.district] = (distCounts[b.district] || 0) + 1 })
      setDistData(Object.entries(distCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([label, value]) => ({ label, value })))

      // Relief KPIs
      const avgTime = rels.length > 0 ? Math.round(rels.reduce((s, r) => {
        const d = (new Date() - new Date(r.created_at)) / 86400000
        return s + d
      }, 0) / rels.length) : 0
      setReliefKpi({
        avgDays: avgTime,
        approvalRate: rels.length ? Math.round(rels.filter(r => r.status === 'transferred').length / rels.length * 100) : 0
      })
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">التحليلات والإحصائيات</h1>
          <p className="text-gray-500 text-sm mt-0.5">بيانات حية من قاعدة البيانات</p>
        </div>
        <button onClick={fetchAll} disabled={loading}
          className="flex items-center gap-2 btn-secondary text-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> تحديث
        </button>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي المستفيدين', value: kpis.total || 0, color: 'blue', sub: `${kpis.thisMonth || 0} هذا الشهر` },
          { label: 'معدل النمو الشهري', value: `${kpis.growth > 0 ? '+' : ''}${kpis.growth || 0}%`, color: kpis.growth >= 0 ? 'green' : 'red', sub: 'مقارنة بالشهر الماضي' },
          { label: 'بانتظار المراجعة', value: kpis.pending || 0, color: 'yellow', sub: 'طلب معلق' },
          { label: 'معدل قبول الإغاثة', value: `${reliefKpi.approvalRate || 0}%`, color: 'purple', sub: `متوسط ${reliefKpi.avgDays || 0} يوم للمعالجة` },
        ].map(k => (
          <div key={k.label} className="card text-center">
            <p className="text-xs text-gray-400 mb-1">{k.label}</p>
            <p className={`text-3xl font-bold text-${k.color}-600`}>{k.value}</p>
            <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Monthly trend */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-blue-500"/>
          <h3 className="font-bold text-gray-800">اتجاه التسجيلات الشهرية (آخر 6 أشهر)</h3>
        </div>
        {monthly.length > 1 ? (
          <div>
            <SimpleLineChart data={monthly} color="#3B82F6" height={90}/>
            <div className="flex justify-between mt-2">
              {monthly.map((m, i) => (
                <span key={i} className="text-xs text-gray-400 text-center flex-1">{m.label}</span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-6">لا توجد بيانات كافية لعرض الاتجاه</p>
        )}
      </div>

      {/* Category + District */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 size={16} className="text-purple-500"/>
            <h3 className="font-bold text-gray-800 text-sm">توزيع الفئات</h3>
          </div>
          {catData.length > 0 ? <MiniBar data={catData}/> : <p className="text-gray-400 text-sm text-center py-6">لا توجد بيانات</p>}
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 size={16} className="text-green-500"/>
            <h3 className="font-bold text-gray-800 text-sm">توزيع جغرافي (أعلى 6 مناطق)</h3>
          </div>
          {distData.length > 0 ? (
            <div className="space-y-2 mt-3">
              {distData.map((d, i) => {
                const max = distData[0]?.value || 1
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-20 shrink-0 truncate">{d.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full bg-blue-500 transition-all"
                        style={{ width: `${Math.round(d.value / max * 100)}%` }}/>
                    </div>
                    <span className="text-xs font-bold text-gray-700 w-6 text-left">{d.value}</span>
                  </div>
                )
              })}
            </div>
          ) : <p className="text-gray-400 text-sm text-center py-6">لا توجد بيانات</p>}
        </div>
      </div>

      {/* Relief summary */}
      <div className="card">
        <h3 className="font-bold text-gray-800 mb-4">ملخص طلبات الإغاثة</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'إجمالي الطلبات', value: kpis.reliefTotal || 0, color: 'blue' },
            { label: 'طلبات معلقة',    value: kpis.reliefPending || 0, color: 'yellow' },
            { label: 'طلبات محوّلة',   value: kpis.reliefApproved || 0, color: 'green' },
          ].map(s => (
            <div key={s.label} className={`bg-${s.color}-50 border border-${s.color}-100 rounded-2xl p-4 text-center`}>
              <div className={`text-2xl font-bold text-${s.color}-700`}>{s.value}</div>
              <div className={`text-xs text-${s.color}-600 mt-1`}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
