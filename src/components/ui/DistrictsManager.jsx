import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { MapPin, Plus, Trash2, RefreshCw, Eye, EyeOff, GripVertical } from 'lucide-react'

export default function DistrictsManager() {
  const [districts, setDistricts] = useState([])
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => { fetch() }, [])

  const fetch = async () => {
    setLoading(true)
    const { data } = await supabase.from('districts').select('*').order('sort_order')
    setDistricts(data || [])
    setLoading(false)
  }

  const add = async () => {
    if (!newName.trim()) return
    setAdding(true)
    const maxOrder = Math.max(0, ...districts.map(d => d.sort_order || 0))
    const { data } = await supabase.from('districts')
      .insert({ name: newName.trim(), sort_order: maxOrder + 1 }).select().single()
    if (data) setDistricts(p => [...p, data])
    setNewName(''); setAdding(false)
  }

  const toggle = async (d) => {
    await supabase.from('districts').update({ is_active: !d.is_active }).eq('id', d.id)
    setDistricts(p => p.map(x => x.id === d.id ? { ...x, is_active: !x.is_active } : x))
  }

  const remove = async (id) => {
    if (!confirm('حذف هذه المنطقة؟')) return
    await supabase.from('districts').delete().eq('id', id)
    setDistricts(p => p.filter(x => x.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-500 text-sm">{districts.length} منطقة — تظهر في نموذج طلب الإغاثة</p>
        <button onClick={fetch} disabled={loading} className="btn-secondary text-sm flex items-center gap-2">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> تحديث
        </button>
      </div>

      {/* Add new */}
      <div className="card flex gap-2 items-end">
        <div className="flex-1">
          <label className="label text-sm">إضافة منطقة جديدة</label>
          <input className="input w-full" placeholder="اسم المنطقة" value={newName}
            onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}/>
        </div>
        <button onClick={add} disabled={adding || !newName.trim()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm" style={{ background:'#0D4A35' }}>
          <Plus size={15}/> إضافة
        </button>
      </div>

      {/* List */}
      <div className="card p-0 overflow-hidden">
        {districts.map((d, i) => (
          <div key={d.id} className={`flex items-center gap-3 px-4 py-3 ${i < districts.length-1 ? 'border-b border-gray-50' : ''} ${!d.is_active ? 'opacity-50' : ''}`}>
            <GripVertical size={15} className="text-gray-300"/>
            <MapPin size={16} style={{ color:'#0D4A35' }}/>
            <span className="flex-1 font-semibold text-gray-700 text-sm">{d.name}</span>
            <button onClick={() => toggle(d)} className={`p-1.5 rounded-lg ${d.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
              title={d.is_active ? 'مفعّلة' : 'مخفية'}>
              {d.is_active ? <Eye size={15}/> : <EyeOff size={15}/>}
            </button>
            <button onClick={() => remove(d.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={15}/></button>
          </div>
        ))}
        {districts.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-400 text-sm">لا توجد مناطق — أضف الأولى</div>
        )}
      </div>
    </div>
  )
}
