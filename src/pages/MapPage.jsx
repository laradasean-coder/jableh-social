import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { RefreshCw, MapPin } from 'lucide-react'

const CATEGORIES = {
  disabled:    { label:'ذوو الإعاقة',  color:'#3B82F6', icon:'♿' },
  widow:       { label:'أرامل',         color:'#8B5CF6', icon:'🕊️' },
  orphan:      { label:'أيتام',         color:'#F59E0B', icon:'⭐' },
  divorced:    { label:'مطلقات',        color:'#EC4899', icon:'🌸' },
  poor_family: { label:'أسر فقيرة',    color:'#10B981', icon:'🏠' },
}

// Jabla area districts with approximate coords
const DISTRICT_COORDS = {
  'جبلة':       { lat: 35.362, lng: 35.930 },
  'الدالية':    { lat: 35.290, lng: 35.960 },
  'بيت ياشوط': { lat: 35.410, lng: 35.990 },
  'البودي':     { lat: 35.330, lng: 35.875 },
  'تل حويري':   { lat: 35.380, lng: 35.870 },
  'بسنديانا':   { lat: 35.350, lng: 35.920 },
}

export default function MapPage() {
  const { user } = useAuth()
  const [distData, setDistData] = useState([])
  const [catFilter, setCatFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [hoveredDist, setHoveredDist] = useState(null)
  const [total, setTotal] = useState(0)

  useEffect(() => { if (user) fetchData() }, [user, catFilter])

  const fetchData = async () => {
    setLoading(true)
    let q = supabase.from('beneficiaries').select('district,category')
    if (catFilter) q = q.eq('category', catFilter)
    const { data } = await q
    if (data) {
      const counts = {}
      data.forEach(b => {
        const d = b.district || 'غير محدد'
        counts[d] = (counts[d] || 0) + 1
      })
      setDistData(Object.entries(counts).map(([dist, count]) => ({
        dist, count,
        coords: DISTRICT_COORDS[dist] || null,
        pct: 0
      })))
      setTotal(data.length)
    }
    setLoading(false)
  }

  const maxCount = Math.max(...distData.map(d => d.count), 1)

  // SVG map - simplified Jabla area
  const mapPoints = distData
    .filter(d => d.coords)
    .map(d => ({
      ...d,
      // Convert lat/lng to SVG coords (simple linear mapping)
      svgX: Math.round((d.coords.lng - 35.85) / (36.02 - 35.85) * 560 + 20),
      svgY: Math.round((35.43 - d.coords.lat) / (35.43 - 35.27) * 280 + 20),
      r: Math.round(10 + (d.count / maxCount) * 30),
      opacity: 0.4 + (d.count / maxCount) * 0.6
    }))

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MapPin size={22} className="text-blue-600"/>
            الخريطة الجغرافية
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">توزيع المستفيدين في منطقة جبلة — {total} مستفيد</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input text-sm w-auto" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">كل الفئات</option>
            {Object.entries(CATEGORIES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={fetchData} disabled={loading} className="p-2 hover:bg-gray-100 rounded-xl">
            <RefreshCw size={16} className={loading ? 'animate-spin text-blue-500' : 'text-gray-400'}/>
          </button>
        </div>
      </div>

      {/* SVG Map */}
      <div className="card p-4">
        <div className="relative bg-blue-50 rounded-xl overflow-hidden border border-blue-100" style={{ minHeight: 340 }}>
          <svg viewBox="0 0 600 340" className="w-full" style={{ minHeight: 300 }}>
            {/* Background sea */}
            <rect x="0" y="0" width="600" height="340" fill="#dbeafe" rx="12"/>
            {/* Land area (simplified) */}
            <path d="M80 10 L580 10 L580 330 L80 330 Z" fill="#e9f5e9" opacity="0.6"/>
            {/* District circles */}
            {mapPoints.map(p => (
              <g key={p.dist} onClick={() => setHoveredDist(p.dist === hoveredDist ? null : p.dist)}
                style={{ cursor: 'pointer' }}>
                <circle cx={p.svgX} cy={p.svgY} r={p.r} fill="#3B82F6" opacity={p.opacity}
                  className="transition-all duration-300"/>
                <circle cx={p.svgX} cy={p.svgY} r={Math.max(p.r - 4, 6)} fill="#1d4ed8" opacity={p.opacity * 0.7}/>
                <text x={p.svgX} y={p.svgY - p.r - 5} textAnchor="middle"
                  fill="#1e3a5f" fontSize="11" fontFamily="Cairo, sans-serif" fontWeight="600">
                  {p.dist}
                </text>
                <text x={p.svgX} y={p.svgY + 4} textAnchor="middle"
                  fill="white" fontSize="12" fontFamily="Cairo, sans-serif" fontWeight="700">
                  {p.count}
                </text>
              </g>
            ))}
            {/* Coast label */}
            <text x="30" y="180" fill="#93c5fd" fontSize="11" fontFamily="Cairo" transform="rotate(-90, 30, 180)">
              البحر المتوسط
            </text>
          </svg>

          {hoveredDist && (() => {
            const d = distData.find(x => x.dist === hoveredDist)
            return d ? (
              <div className="absolute top-3 left-3 bg-white rounded-xl shadow-lg p-3 text-xs" dir="rtl">
                <p className="font-bold text-gray-800 mb-1">{d.dist}</p>
                <p className="text-blue-600 font-bold text-lg">{d.count}</p>
                <p className="text-gray-400">مستفيد</p>
              </div>
            ) : null
          })()}
        </div>
      </div>

      {/* District table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">المنطقة</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">العدد</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">النسبة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {distData.sort((a,b) => b.count - a.count).map(d => (
              <tr key={d.dist} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-800">{d.dist}</td>
                <td className="px-4 py-2.5 text-center font-bold text-blue-600">{d.count}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-blue-500"
                        style={{ width: `${Math.round(d.count/total*100)}%` }}/>
                    </div>
                    <span className="text-xs text-gray-500 w-8">{total ? Math.round(d.count/total*100) : 0}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Category legend */}
      <div className="card">
        <p className="text-sm font-bold text-gray-700 mb-3">التوزيع حسب الفئة</p>
        <div className="flex flex-wrap gap-3">
          {Object.entries(CATEGORIES).map(([k,v]) => (
            <button key={k} onClick={() => setCatFilter(catFilter===k ? '' : k)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${catFilter===k ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
              style={catFilter===k ? { background: v.color } : {}}>
              <span>{v.icon}</span>{v.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
