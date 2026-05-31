import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { CATEGORIES } from '../../utils/format'
import {
  Search, X, User, Building2, TreePine,
  HeartHandshake, Newspaper, RefreshCw
} from 'lucide-react'

const RESULT_TYPES = {
  beneficiary:  { label:'مستفيد',    icon:User,         color:'#3B82F6', route: r => `/beneficiaries?id=${r.id}` },
  association:  { label:'جمعية',     icon:Building2,    color:'#7C3AED', route: r => `/associations` },
  unit:         { label:'وحدة تنمية',icon:TreePine,      color:'#059669', route: r => `/rural-units` },
  relief:       { label:'طلب إغاثة', icon:HeartHandshake,color:'#E24B4A', route: r => `/relief-admin` },
  content:      { label:'خبر/إعلان', icon:Newspaper,    color:'#D97706', route: r => `/` },
}

function highlight(text = '', query = '') {
  if (!query.trim() || !text) return text
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi')
  const parts = text.split(re)
  return parts.map((p, i) =>
    re.test(p) ? <mark key={i} style={{background:'#C9A227',color:'#000',borderRadius:2,padding:'0 2px'}}>{p}</mark> : p
  )
}

export default function GlobalSearch({ onClose }) {
  const navigate  = useNavigate()
  const [q,       setQ]       = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [scope,   setScope]   = useState('all') // all | beneficiaries | associations | relief | content
  const inputRef  = useRef()
  const debounce  = useRef()

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!q.trim() || q.length < 2) { setResults([]); return }
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => doSearch(q.trim()), 300)
    return () => clearTimeout(debounce.current)
  }, [q, scope])

  const doSearch = useCallback(async (query) => {
    setLoading(true)
    const all = []

    await Promise.all([
      // Beneficiaries
      (scope === 'all' || scope === 'beneficiaries') && (async () => {
        const { data } = await supabase.from('beneficiaries')
          .select('id,full_name,category,district,status')
          .or(`full_name.ilike.%${query}%,national_id.ilike.%${query}%,phone.ilike.%${query}%`)
          .limit(5)
        ;(data||[]).forEach(r => all.push({ type:'beneficiary', id:r.id, title:r.full_name, sub:`${CATEGORIES[r.category]?.label||''} — ${r.district||''}`, data:r }))
      })(),

      // Associations
      (scope === 'all' || scope === 'associations') && (async () => {
        const { data } = await supabase.from('associations')
          .select('id,name,address,president_name')
          .ilike('name', `%${query}%`)
          .limit(4)
        ;(data||[]).forEach(r => all.push({ type:'association', id:r.id, title:r.name, sub:r.address||r.president_name||'', data:r }))
      })(),

      // Relief requests
      (scope === 'all' || scope === 'relief') && (async () => {
        const { data } = await supabase.from('relief_requests')
          .select('id,full_name,phone,status,category')
          .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
          .limit(4)
        ;(data||[]).forEach(r => all.push({ type:'relief', id:r.id, title:r.full_name, sub:`طلب إغاثة — ${r.status==='pending'?'معلق':'تمت المعالجة'}`, data:r }))
      })(),

      // Site content (news)
      (scope === 'all' || scope === 'content') && (async () => {
        const { data } = await supabase.from('site_content')
          .select('id,title,body,type')
          .or(`title.ilike.%${query}%,body.ilike.%${query}%`)
          .eq('is_published', true)
          .limit(3)
        ;(data||[]).forEach(r => all.push({ type:'content', id:r.id, title:r.title, sub:(r.body||'').slice(0,60)+'...', data:r }))
      })(),
    ])

    setResults(all)
    setLoading(false)
  }, [scope])

  const go = (result) => {
    const route = RESULT_TYPES[result.type]?.route(result.data)
    if (route) navigate(route)
    onClose()
  }

  // Keyboard close
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const SCOPES = [
    { key:'all',           label:'الكل' },
    { key:'beneficiaries', label:'المستفيدون' },
    { key:'associations',  label:'الجمعيات' },
    { key:'relief',        label:'الإغاثة' },
    { key:'content',       label:'الأخبار' },
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4" dir="rtl"
      style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)'}}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">

        {/* Search input */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <Search size={20} className="text-gray-400 shrink-0"/>
          <input
            ref={inputRef}
            className="flex-1 text-lg outline-none text-gray-800 bg-transparent placeholder-gray-400"
            placeholder="ابحث في المستفيدين، الجمعيات، الإغاثة، الأخبار..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          {loading && <RefreshCw size={16} className="animate-spin text-gray-400 shrink-0"/>}
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 shrink-0"><X size={18}/></button>
        </div>

        {/* Scope tabs */}
        <div className="flex gap-1 px-4 py-2 bg-gray-50 border-b border-gray-100 overflow-x-auto">
          {SCOPES.map(s => (
            <button key={s.key} onClick={() => setScope(s.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${scope===s.key?'text-white':'bg-white text-gray-500 hover:bg-gray-100'}`}
              style={scope===s.key?{background:'#0D4A35'}:{}}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {q.length < 2 ? (
            <div className="py-10 text-center text-gray-400">
              <Search size={36} className="mx-auto mb-3 opacity-30"/>
              <p className="text-sm">اكتب كلمتين على الأقل للبحث</p>
              <p className="text-xs mt-1">يبحث في المستفيدين، الجمعيات، طلبات الإغاثة، والأخبار</p>
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="py-10 text-center text-gray-400">
              <p className="text-sm">لا توجد نتائج لـ "{q}"</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {results.map((r, i) => {
                const meta = RESULT_TYPES[r.type]
                const Icon = meta?.icon || Search
                return (
                  <button key={`${r.type}-${r.id}`}
                    onClick={() => go(r)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-right">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{background:meta?.color+'20'}}>
                      <Icon size={17} style={{color:meta?.color}}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">
                        {highlight(r.title, q)}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {highlight(r.sub, q)}
                      </p>
                    </div>
                    <span className="badge text-xs shrink-0" style={{background:meta?.color+'15',color:meta?.color}}>
                      {meta?.label}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400">
          <span>↵ للانتقال</span>
          <span>ESC للإغلاق</span>
          <span className="mr-auto">{results.length > 0 ? `${results.length} نتيجة` : ''}</span>
        </div>
      </div>
    </div>
  )
}
