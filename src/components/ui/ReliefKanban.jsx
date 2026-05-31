import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { timeAgo, slaStatus } from '../../utils/format'
import { Clock, Eye, Users, CheckCircle, XCircle, Star, Phone, MapPin, GripVertical } from 'lucide-react'

const CATEGORIES = {
  disabled:    { label:'ذوو الإعاقة',  icon:'♿', color:'#3B82F6' },
  widow:       { label:'الأرامل',       icon:'🕊️', color:'#8B5CF6' },
  orphan:      { label:'الأيتام',       icon:'⭐', color:'#F59E0B' },
  divorced:    { label:'المطلقات',      icon:'🌸', color:'#EC4899' },
  poor_family: { label:'الأسر الفقيرة',icon:'🏠', color:'#10B981' },
}

const COLUMNS = [
  { key:'pending',     label:'استقبال', color:'#F59E0B', bg:'#FFFBEB', icon: Clock },
  { key:'reviewed',    label:'مراجعة',  color:'#3B82F6', bg:'#EFF6FF', icon: Eye },
  { key:'committee',   label:'لجنة',    color:'#8B5CF6', bg:'#F5F3FF', icon: Users },
  { key:'transferred', label:'صرف',     color:'#10B981', bg:'#ECFDF5', icon: CheckCircle },
]

function calcPriority(r) {
  let s = 0
  if (r.family_size)     s += Math.min(r.family_size * 8, 64)
  if (r.has_disability)  s += 30
  if ((r.monthly_income || 0) < 50000) s += 20
  if (r.category === 'orphan')   s += 15
  if (r.category === 'disabled') s += 10
  return Math.min(s, 100)
}

function PriorityDot({ score }) {
  const color = score >= 80 ? '#E24B4A' : score >= 50 ? '#F59E0B' : '#9CA3AF'
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color }}>
      <Star size={11} fill="currentColor"/>{score}
    </span>
  )
}

export default function ReliefKanban({ requests, onUpdate, onSelect }) {
  const [dragId, setDragId]   = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [saving, setSaving]   = useState(false)

  const onDragStart = (e, req) => {
    setDragId(req.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDrop = async (e, colKey) => {
    e.preventDefault()
    setDragOver(null)
    const req = requests.find(r => r.id === dragId)
    if (!req || req.status === colKey) { setDragId(null); return }

    setSaving(true)
    await supabase.from('relief_requests').update({ status: colKey }).eq('id', req.id)
    await supabase.from('audit_logs').insert({
      action: colKey === 'transferred' ? 'transfer' : 'update',
      entity: 'طلب إغاثة',
      detail: `${req.full_name}: نُقل إلى ${COLUMNS.find(c=>c.key===colKey)?.label || colKey}`
    })
    setSaving(false)
    setDragId(null)
    if (onUpdate) onUpdate()
  }

  return (
    <div className="overflow-x-auto pb-4">
      {saving && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm z-50 shadow-lg">
          جاري التحديث...
        </div>
      )}
      <div className="flex gap-4 min-w-max" dir="rtl">
        {COLUMNS.map(col => {
          const items = requests.filter(r => r.status === col.key)
                                .sort((a,b) => calcPriority(b) - calcPriority(a))
          return (
            <div
              key={col.key}
              onDragOver={e => { e.preventDefault(); setDragOver(col.key) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => onDrop(e, col.key)}
              className="w-72 shrink-0 rounded-2xl transition-all"
              style={{
                background: dragOver === col.key ? col.bg : '#F8FAF9',
                outline: dragOver === col.key ? `2px dashed ${col.color}` : 'none'
              }}>
              {/* Column header */}
              <div className="flex items-center justify-between p-3 sticky top-0 rounded-t-2xl z-10"
                style={{ background: col.bg }}>
                <div className="flex items-center gap-2">
                  <col.icon size={16} style={{ color: col.color }}/>
                  <span className="font-bold text-sm" style={{ color: col.color }}>{col.label}</span>
                </div>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: col.color }}>
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 min-h-[200px]">
                {items.map(req => {
                  const cat = CATEGORIES[req.category] || {}
                  const priority = calcPriority(req)
                  return (
                    <div
                      key={req.id}
                      draggable
                      onDragStart={e => onDragStart(e, req)}
                      onClick={() => onSelect && onSelect(req)}
                      className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 cursor-move hover:shadow-md transition-all"
                      style={{ opacity: dragId === req.id ? 0.4 : 1, borderRight: `3px solid ${cat.color || '#ccc'}` }}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <GripVertical size={12} className="text-gray-300 shrink-0"/>
                          <span className="font-bold text-gray-800 text-sm truncate">{req.full_name}</span>
                        </div>
                        <PriorityDot score={priority}/>
                      </div>
                      <div className="flex items-center gap-1 mb-1.5">
                        <span className="text-xs">{cat.icon}</span>
                        <span className="text-xs text-gray-500">{cat.label}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {req.phone && <span className="flex items-center gap-0.5" dir="ltr"><Phone size={9}/>{req.phone}</span>}
                        {req.district && <span className="flex items-center gap-0.5"><MapPin size={9}/>{req.district}</span>}
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-gray-300">{timeAgo(req.created_at)}</span>
                        {(() => { const sla = slaStatus(req.sla_deadline); return sla && sla.state !== 'ontime' ? (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ color: sla.color, background: sla.color + '18' }}>
                            {sla.state === 'overdue' ? `متأخر ${sla.hours}س` : `عاجل ${sla.hours}س`}
                          </span>
                        ) : null })()}
                      </div>
                    </div>
                  )
                })}
                {items.length === 0 && (
                  <div className="text-center py-8 text-gray-300 text-xs">
                    اسحب طلباً هنا
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
