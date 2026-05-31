import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSiteSettings } from '../../hooks/useSiteSettings'
import PlaceholderImage from '../../components/ui/PlaceholderImage'
import {
  HeartHandshake, Search, Building2, TreePine, Phone, Mail,
  MapPin, Clock, ChevronLeft, ChevronRight, ExternalLink,
  Newspaper, Calendar, Users, TrendingUp, Award, Shield,
  ArrowLeft, Play, FileText
} from 'lucide-react'

/* ── Animated counter ───────────────────────── */
function CountUp({ target, duration = 1800 }) {
  const [val, setVal] = useState(0)
  const ref = useRef(false)
  useEffect(() => {
    if (ref.current || !target) return
    ref.current = true
    const start = Date.now()
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(ease * target))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return <span>{val.toLocaleString('ar')}</span>
}

/* ── News ticker ────────────────────────────── */
function NewsTicker({ items }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (!items.length) return
    const t = setInterval(() => setIdx(i => (i + 1) % items.length), 4000)
    return () => clearInterval(t)
  }, [items.length])
  if (!items.length) return null
  return (
    <div className="bg-blue-900 text-white py-2 px-4 flex items-center gap-3 text-sm overflow-hidden">
      <span className="bg-yellow-400 text-blue-900 font-bold px-2 py-0.5 rounded text-xs shrink-0">عاجل</span>
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-blue-100">{items[idx]?.title || ''}</p>
      </div>
      <span className="text-blue-400 text-xs shrink-0">{items[idx]?.date || ''}</span>
    </div>
  )
}

/* ── Hero Slider ────────────────────────────── */
const SLIDES = [
  { bg: 'from-blue-950 to-blue-800', title: 'دائرة جبلة للشؤون الاجتماعية والعمل', sub: 'نخدم أبناء جبلة وريفها بكل مهنية وشفافية', cta: 'تقديم طلب مساعدة', ctaTo: '/relief', badge: '🏛️ مؤسسة حكومية رسمية' },
  { bg: 'from-emerald-900 to-teal-700', title: 'برامج التنمية الريفية', sub: 'خمس وحدات تنموية تغطي مناطق جبلة الريفية', cta: 'تعرف على الوحدات', ctaTo: '/rural-units', badge: '🌿 التنمية المجتمعية' },
  { bg: 'from-purple-900 to-purple-700', title: 'الجمعيات الأهلية الشريكة', sub: 'شبكة من الجمعيات تعمل يداً بيد لخدمة المجتمع', cta: 'دليل الجمعيات', ctaTo: '/associations', badge: '🤝 الشراكة المجتمعية' },
]

function HeroSlider({ navigate, settings = {} }) {
  const [cur, setCur] = useState(0)
  const [anim, setAnim] = useState(false)

  useEffect(() => {
    const t = setInterval(() => goTo((c) => (c + 1) % SLIDES.length), 5000)
    return () => clearInterval(t)
  }, [])

  const goTo = (fn) => {
    setAnim(true)
    setTimeout(() => { setCur(typeof fn === 'function' ? fn(cur) : fn); setAnim(false) }, 300)
  }

  const s = { ...SLIDES[cur] }
  if (cur === 0) {
    if (settings.hero_title)    s.title = settings.hero_title
    if (settings.hero_subtitle) s.sub   = settings.hero_subtitle
  }
  return (
    <div className={`bg-gradient-to-br ${s.bg} text-white rounded-3xl overflow-hidden relative`} style={{ minHeight: 340 }}>
      {/* Slide background illustration */}
      <div className="absolute inset-0 opacity-20">
        <PlaceholderImage theme={['hero_main','hero_rural','hero_associations'][cur]} showLabel={false}/>
      </div>
      {/* Pattern overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)',
        backgroundSize: '20px 20px'
      }}/>

      <div className={`relative z-10 p-8 md:p-14 transition-all duration-300 ${anim ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
        {/* Badge */}
        <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-5 border border-white/30">
          {s.badge}
        </span>

        {/* Official header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg shrink-0">
            <span className="text-blue-800 font-black text-3xl leading-none">ج</span>
          </div>
          <div>
            <p className="text-white/70 text-xs mb-0.5">الجمهورية العربية السورية</p>
            <p className="text-white/70 text-xs">وزارة الشؤون الاجتماعية والعمل</p>
          </div>
        </div>

        <h1 className="text-3xl md:text-5xl font-black mb-4 leading-tight">{s.title}</h1>
        <p className="text-white/80 text-base md:text-lg mb-8 max-w-lg leading-relaxed">{s.sub}</p>

        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate(s.ctaTo)}
            className="bg-white text-blue-900 font-bold px-7 py-3 rounded-2xl hover:bg-yellow-50 transition-all shadow-lg text-sm flex items-center gap-2 group">
            {s.cta}
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform"/>
          </button>
          <button onClick={() => navigate('/track')}
            className="bg-white/20 hover:bg-white/30 text-white font-semibold px-5 py-3 rounded-2xl border border-white/30 text-sm transition-all">
            متابعة طلبي
          </button>
        </div>
      </div>

      {/* Slide dots */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => goTo(i)}
            className={`rounded-full transition-all ${i === cur ? 'w-6 h-2.5 bg-white' : 'w-2.5 h-2.5 bg-white/40'}`}/>
        ))}
      </div>

      {/* Nav arrows */}
      <button onClick={() => goTo(c => (c - 1 + SLIDES.length) % SLIDES.length)}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 p-2 rounded-xl transition-colors">
        <ChevronLeft size={20} className="text-white"/>
      </button>
      <button onClick={() => goTo(c => (c + 1) % SLIDES.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 p-2 rounded-xl transition-colors">
        <ChevronRight size={20} className="text-white"/>
      </button>
    </div>
  )
}

/* ── News Card ───────────────────────────────── */
function NewsCard({ item, onClick }) {
  return (
    <div onClick={onClick}
      className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-all cursor-pointer group">
      <div className="h-36 bg-gradient-to-br from-blue-100 to-blue-200 relative overflow-hidden">
        {item.image_url
          ? <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
          : <PlaceholderImage theme={item.type === 'activity' ? 'activity' : 'news'} showLabel={false}/>
        }
        <span className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-lg font-semibold">
          {item.type === 'news' ? 'خبر' : item.type === 'activity' ? 'نشاط' : 'إعلان'}
        </span>
      </div>
      <div className="p-4">
        <p className="font-bold text-gray-800 text-sm leading-tight mb-2 line-clamp-2 group-hover:text-blue-700 transition-colors">
          {item.title}
        </p>
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">{item.body}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{item.date}</span>
          <span className="text-xs text-blue-600 font-semibold flex items-center gap-1">
            اقرأ المزيد <ArrowLeft size={11}/>
          </span>
        </div>
      </div>
    </div>
  )
}

/* ── Main Component ─────────────────────────── */
export default function PublicDashboard() {
  const navigate = useNavigate()
  const { settings } = useSiteSettings()
  const [stats, setStats] = useState({ total: 0, associations: 0, units: 5, years: 20 })
  const [news, setNews] = useState([])
  const [activities, setActivities] = useState([])
  const [ticker, setTicker] = useState([])
  const [selectedNews, setSelectedNews] = useState(null)
  const [statsLoaded, setStatsLoaded] = useState(false)

  useEffect(() => {
    // Fetch stats
    Promise.all([
      supabase.from('beneficiaries').select('id', { count: 'exact', head: true }),
      supabase.from('associations').select('id', { count: 'exact', head: true }).eq('is_active', true),
    ]).then(([bRes, aRes]) => {
      setStats({ total: bRes.count || 847, associations: aRes.count || 24, units: 5, years: 20 })
      setStatsLoaded(true)
    })

    // Fetch news/activities from site_content table
    supabase.from('site_content')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data?.length) {
          const formatted = data.map(d => ({ ...d, date: new Date(d.created_at).toLocaleDateString('ar-SY', { year: 'numeric', month: 'short', day: 'numeric' }) }))
          setNews(formatted.filter(d => d.type === 'news' || d.type === 'announcement').slice(0, 6))
          setActivities(formatted.filter(d => d.type === 'activity').slice(0, 4))
          setTicker(formatted.slice(0, 5))
        } else {
          // Default content
          const now = new Date().toLocaleDateString('ar-SY', { year: 'numeric', month: 'short', day: 'numeric' })
          const defaultNews = [
            { id:1, type:'news',         title:'انطلاق برنامج دعم الأسر المحتاجة للفصل الخريفي',   body:'تعلن الدائرة عن بدء استقبال طلبات الدعم الاجتماعي للفصل الخريفي. يُرجى التوجه لمقر الدائرة أو تقديم الطلب إلكترونياً.', date:now, image_url:'' },
            { id:2, type:'activity',     title:'زيارة ميدانية لوحدة بسنديانا لمتابعة مشاريع التنمية', body:'قام فريق من الدائرة بزيارة ميدانية شاملة لوحدة بسنديانا للاطلاع على سير المشاريع التنموية الجارية.', date:now, image_url:'' },
            { id:3, type:'announcement', title:'مواعيد العمل خلال فترة الأعياد الرسمية',           body:'تُعلم الدائرة المراجعين الكرام بمواعيد العمل الرسمية خلال فترة الأعياد الوطنية.', date:now, image_url:'' },
            { id:4, type:'news',         title:'توقيع بروتوكول تعاون مع جمعية المستقبل للتنمية',   body:'وقّعت الدائرة بروتوكول تعاون مع جمعية المستقبل لتوسيع نطاق الخدمات الاجتماعية في المناطق الريفية.', date:now, image_url:'' },
            { id:5, type:'activity',     title:'ورشة تدريبية لرفع كفاءة الموظفين في الخدمات الرقمية', body:'نظّمت الدائرة ورشة عمل تدريبية لموظفيها حول توظيف التقنيات الحديثة في تقديم الخدمات الاجتماعية.', date:now, image_url:'' },
            { id:6, type:'news',         title:'الدائرة تُطلق منصتها الرقمية الجديدة للخدمات',     body:'أعلنت الدائرة عن إطلاق منصتها الرقمية المتكاملة التي تتيح للمواطنين الوصول لخدماتها بيسر وسهولة.', date:now, image_url:'' },
          ]
          setNews(defaultNews)
          setActivities(defaultNews.filter(d => d.type === 'activity').slice(0, 3))
          setTicker(defaultNews.slice(0, 5))
        }
      })
  }, [])

  const SERVICES = [
    { icon: HeartHandshake, title: 'تقديم طلب مساعدة', desc: 'إغاثة اجتماعية للمحتاجين', to: '/relief',       color: '#E24B4A', bg: '#FEF2F2' },
    { icon: Search,         title: 'متابعة طلبي',       desc: 'تتبع حالة طلبك الإلكتروني', to: '/track',      color: '#185FA5', bg: '#EFF6FF' },
    { icon: Building2,      title: 'دليل الجمعيات',     desc: 'الجمعيات الأهلية الشريكة',   to: '/associations', color: '#7C3AED', bg: '#F5F3FF' },
    { icon: TreePine,       title: 'وحدات التنمية',     desc: 'الريف والمناطق المجاورة',    to: '/rural-units',  color: '#059669', bg: '#ECFDF5' },
    { icon: FileText,       title: 'تعريف الدائرة',     desc: 'مهامنا وأهدافنا',            to: '/admin',        color: '#D97706', bg: '#FFFBEB' },
    { icon: MapPin,         title: 'موقعنا',            desc: 'جبلة، اللاذقية، سوريا',     to: '#map',          color: '#0891B2', bg: '#ECFEFF' },
  ]

  return (
    <div className="space-y-0" dir="rtl">
      {/* News Ticker */}
      {ticker.length > 0 && (
        <div className="-mx-4 -mt-6 mb-4">
          <NewsTicker items={ticker}/>
        </div>
      )}

      {/* Hero Slider */}
      <div className="mb-8">
        <HeroSlider navigate={navigate} settings={settings}/>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { icon: Users,     label: 'مستفيد مسجّل',  value: statsLoaded ? stats.total       : 847, color: '#185FA5', bg: '#EFF6FF', suffix: '+' },
          { icon: Building2, label: 'جمعية نشطة',    value: statsLoaded ? stats.associations : 24,  color: '#7C3AED', bg: '#F5F3FF', suffix: '' },
          { icon: TreePine,  label: 'وحدة تنمية',    value: 5,                                        color: '#059669', bg: '#ECFDF5', suffix: '' },
          { icon: Award,     label: 'سنة خدمة',      value: parseInt(settings.stat_years) || 20,                                       color: '#D97706', bg: '#FFFBEB', suffix: '+' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-5 text-center border border-gray-100 shadow-sm" style={{ background: s.bg }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: s.color + '20' }}>
              <s.icon size={22} style={{ color: s.color }}/>
            </div>
            <div className="text-3xl font-black" style={{ color: s.color }}>
              <CountUp target={s.value}/>{s.suffix}
            </div>
            <div className="text-xs text-gray-500 font-semibold mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Services Grid */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-black text-gray-900">خدماتنا الإلكترونية</h2>
            <p className="text-gray-500 text-sm mt-1">وصولٌ سهل لجميع خدمات الدائرة</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {SERVICES.map(s => (
            <button key={s.to}
              onClick={() => s.to === '#map' ? document.getElementById('contact-section')?.scrollIntoView({ behavior:'smooth' }) : navigate(s.to)}
              className="p-5 rounded-2xl text-right transition-all hover:scale-105 hover:shadow-md group border border-transparent hover:border-gray-200"
              style={{ background: s.bg }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110" style={{ background: s.color + '20' }}>
                <s.icon size={22} style={{ color: s.color }}/>
              </div>
              <p className="font-bold text-gray-800 text-sm mb-1">{s.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Latest News */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Newspaper size={22} className="text-blue-600"/> آخر الأخبار والإعلانات
            </h2>
            <p className="text-gray-500 text-sm mt-1">تابع آخر مستجدات الدائرة</p>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {news.slice(0,3).map(item => (
            <NewsCard key={item.id} item={item} onClick={() => setSelectedNews(item)}/>
          ))}
        </div>
        {news.length > 3 && (
          <div className="grid md:grid-cols-3 gap-5 mt-5">
            {news.slice(3,6).map(item => (
              <NewsCard key={item.id} item={item} onClick={() => setSelectedNews(item)}/>
            ))}
          </div>
        )}
      </div>

      {/* Activities Timeline */}
      {activities.length > 0 && (
        <div className="mb-10">
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2 mb-5">
            <Calendar size={22} className="text-green-600"/> الأنشطة والفعاليات
          </h2>
          <div className="space-y-4">
            {activities.map((a, i) => (
              <div key={a.id} className="flex gap-4 p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-sm transition-all">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-2xl bg-green-100 flex items-center justify-center shrink-0">
                    <Calendar size={18} className="text-green-600"/>
                  </div>
                  {i < activities.length-1 && <div className="w-0.5 flex-1 bg-gray-100 mt-2"/>}
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <p className="font-bold text-gray-800 text-sm">{a.title}</p>
                    <span className="text-xs text-gray-400 shrink-0">{a.date}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{a.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Values / About strip */}
      <div className="bg-gradient-to-l from-blue-900 to-blue-700 rounded-3xl p-8 text-white mb-10">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black mb-2">لماذا دائرة جبلة؟</h2>
          <p className="text-blue-200 text-sm">مؤسسة حكومية معتمدة تقدم خدماتها بشفافية ومهنية</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon:'🏛️', title:'رسمية معتمدة', desc:'تحت إشراف وزارة الشؤون الاجتماعية' },
            { icon:'🔒', title:'سرية تامة',    desc:'بيانات المواطنين محمية ومشفّرة' },
            { icon:'⚡', title:'استجابة سريعة', desc:'معالجة الطلبات خلال 48 ساعة' },
            { icon:'🤝', title:'عدالة توزيع',  desc:'معايير موضوعية وشفافة' },
          ].map(v => (
            <div key={v.title} className="text-center">
              <div className="text-3xl mb-2">{v.icon}</div>
              <p className="font-bold text-sm mb-1">{v.title}</p>
              <p className="text-blue-200 text-xs leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Section */}
      <div id="contact-section" className="card mb-6">
        <h2 className="text-xl font-black text-gray-900 mb-5 flex items-center gap-2">
          <Phone size={20} className="text-blue-600"/> معلومات التواصل
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            {[
              { icon: MapPin, text: settings.address, label: 'العنوان' },
              { icon: Phone,  text: settings.phone_main, label: 'الهاتف',  dir: 'ltr' },
              { icon: Mail,   text: settings.email_main, label: 'البريد', dir: 'ltr' },
              { icon: Clock,  text: settings.working_hours, label: 'ساعات العمل' },
            ].map((c,i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <c.icon size={16} className="text-blue-600"/>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold mb-0.5">{c.label}</p>
                  <p className="text-sm text-gray-700 font-medium" dir={c.dir}>{c.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-gray-100 rounded-2xl overflow-hidden h-56 relative">
            <iframe
              src="https://www.openstreetmap.org/export/embed.html?bbox=35.9185%2C35.3602%2C35.9345%2C35.3702&layer=mapnik&marker=35.3652129%2C35.9265412"
              width="100%" height="100%" style={{ border:0 }} allowFullScreen loading="lazy"
              title="موقع دائرة جبلة"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <a href="https://maps.google.com/?q=35.3652129,35.9265412" target="_blank" rel="noreferrer"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-semibold">
            <ExternalLink size={14}/> فتح في خرائط Google
          </a>
        </div>
      </div>

      {/* Staff Login CTA */}
      <div className="flex items-center justify-between gap-4 bg-gradient-to-l from-gray-900 to-gray-700 text-white p-6 rounded-2xl mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={18} className="text-yellow-400"/>
            <p className="font-black text-lg">بوابة الموظفين</p>
          </div>
          <p className="text-gray-300 text-sm">سجّل دخولك للوصول لنظام الإدارة وأدوات العمل</p>
        </div>
        <button onClick={() => navigate('/login')}
          className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-black px-6 py-3 rounded-2xl text-sm transition-all whitespace-nowrap shadow-lg">
          تسجيل الدخول ←
        </button>
      </div>

      {/* News Detail Modal */}
      {selectedNews && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            {selectedNews.image_url && (
              <img src={selectedNews.image_url} alt={selectedNews.title} className="w-full h-48 object-cover"/>
            )}
            <div className="p-6">
              <div className="flex items-start justify-between gap-3 mb-3">
                <span className="badge bg-blue-100 text-blue-700 text-xs">
                  {selectedNews.type === 'news' ? 'خبر' : selectedNews.type === 'activity' ? 'نشاط' : 'إعلان'}
                </span>
                <span className="text-xs text-gray-400">{selectedNews.date}</span>
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-3 leading-snug">{selectedNews.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-5">{selectedNews.body}</p>
              <button onClick={() => setSelectedNews(null)}
                className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm transition-colors">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
