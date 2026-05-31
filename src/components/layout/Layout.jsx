import { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useDarkMode } from '../../hooks/useDarkMode'
import { useSiteSettings } from '../../hooks/useSiteSettings'
import NotificationsSystem from '../ui/NotificationsSystem'
import FloatingHub from '../ui/FloatingHub'
import IdleWarning from '../ui/IdleWarning'
import { navVisible, roleDisplay } from '../../lib/permissions'
import InstallPWA from '../ui/InstallPWA'
import GlobalSearch from '../ui/GlobalSearch'
import SyriaEmblem from '../ui/SyriaEmblem'
import SyriaFlag from '../ui/SyriaFlag'
import {
  LayoutDashboard, Users, Building2, TreePine,
  HeartHandshake, LogIn, LogOut, Menu, X, Shield,
  FileText, ClipboardList, Activity, UserCog, Key,
  TrendingUp, MessageSquare, Search, Gauge, Map, Moon, Sun,
  Newspaper, Award, ChevronLeft, ChevronRight
} from 'lucide-react'

const navItems = [
  { to:'/',               label:'الرئيسية',        icon:LayoutDashboard, public:true },
  { to:'/analytics',      label:'التحليلات',        icon:TrendingUp,      public:false },
  { to:'/admin',          label:'الإدارة',          icon:Shield,          public:true },
  { to:'/about',          label:'عن الدائرة',       icon:Award,           public:true },
  { to:'/beneficiaries',  label:'قسم الخدمات',     icon:Users,           public:false },
  { to:'/associations',   label:'الجمعيات',         icon:Building2,       public:true },
  { to:'/rural-units',    label:'التنمية الريفية',  icon:TreePine,        public:true },
  { to:'/map',            label:'الخريطة',          icon:Map,             public:false },
  { to:'/relief',         label:'نموذج الإغاثة',   icon:HeartHandshake,  public:true },
  { to:'/track',          label:'متابعة طلبي',      icon:Search,          public:true },
  { to:'/relief-admin',   label:'إدارة الإغاثة',   icon:ClipboardList,   public:false },
  { to:'/access-requests',label:'طلبات الوصول',    icon:Key,             public:false, staffOnly:true },
  { to:'/inbox',          label:'رسائل المواطنين',  icon:MessageSquare,   public:false, staffOnly:true },
  { to:'/staff-chat',     label:'محادثات الموظفين', icon:Users,           public:false, staffOnly:true },
  { to:'/reports',        label:'التقارير',         icon:FileText,        public:false },
  { to:'/unit-reports',   label:'تقارير الوحدات',   icon:ClipboardList,   public:false, staffOnly:true },
  { to:'/content',        label:'إدارة المحتوى',   icon:Newspaper,       public:false, adminOnly:true },
  { to:'/audit-log',      label:'سجل العمليات',    icon:Activity,        public:false, adminOnly:true },
  { to:'/security',       label:'الأمان والنسخ',   icon:Shield,          public:false, adminOnly:true },
  { to:'/employees',      label:'الموظفون',         icon:UserCog,         public:false, adminOnly:true },
  { to:'/status',         label:'صحة النظام',       icon:Gauge,           public:false, adminOnly:true },
]

export default function Layout() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const touch = useRef({ x: 0, y: 0 })

  // تمرير باللمس مريح للتنقل بين الأقسام (يمين/يسار) على الجوال
  const onTouchStart = (e) => {
    const t = e.changedTouches[0]; touch.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e) => {
    const t = e.changedTouches[0]
    const dx = t.clientX - touch.current.x, dy = t.clientY - touch.current.y
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    const paths = visible.map(i => i.to)
    const idx = paths.indexOf(location.pathname)
    if (idx === -1) return
    // RTL: السحب لليسار يعني التالي، لليمين يعني السابق
    const next = dx < 0 ? idx + 1 : idx - 1
    if (next >= 0 && next < paths.length) navigate(paths[next])
  }
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dark, setDark] = useDarkMode()
  const [showSearch, setShowSearch] = useState(false)
  const { settings, isEnabled } = useSiteSettings()

  const visible = navItems.filter(i => navVisible(profile, i, !!user))

  // تمرير شريط أقسام سطح المكتب عبر أزرار (يمين/يسار) عندما تفيض الأقسام
  const navScrollRef = useRef(null)
  const [navOverflow, setNavOverflow] = useState(false)
  useEffect(() => {
    const el = navScrollRef.current
    if (!el) return
    const update = () => setNavOverflow(el.scrollWidth - el.clientWidth > 4)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => { ro.disconnect(); window.removeEventListener('resize', update) }
  }, [visible.length])
  const scrollNav = (dir) => navScrollRef.current?.scrollBy({ left: dir * 280, behavior: 'smooth' })

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      <IdleWarning/>
      {showSearch && <GlobalSearch onClose={() => setShowSearch(false)}/>}

      <header className="syria-header text-white shadow-xl z-50 sticky top-0">
        {/* Gold accent bar */}
        <div className="h-1 w-full" style={{background:'linear-gradient(to right, #C9A227, #E8C84A, #C9A227)'}}/>

        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Emblem + Identity */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <SyriaEmblem size={44} className="shrink-0"/>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <SyriaFlag width={32} className="shrink-0"/>
                <p className="text-xs leading-tight" style={{color:'#C9A227', fontWeight:600}}>
                  {`الجمهورية العربية السورية — ${settings.ministry}`}
                </p>
              </div>
              <h1 className="font-black text-white text-base leading-tight truncate">
                {settings.org_name_ar}
              </h1>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => setShowSearch(true)}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors" title="بحث عام">
              <Search size={18}/>
            </button>
            <button onClick={() => setDark(d => !d)}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors" title={dark?'الوضع النهاري':'الوضع الليلي'}>
              {dark ? <Sun size={18}/> : <Moon size={18}/>}
            </button>
            {user && <NotificationsSystem/>}
            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-white text-sm font-bold leading-tight">{profile?.full_name||user.email?.split('@')[0]}</span>
                  <span className="text-xs" style={{color:'#C9A227'}}>
                    {roleDisplay(profile)}
                  </span>
                </div>
                <button onClick={async()=>{await signOut();navigate('/')}}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-colors hover:bg-white/10">
                  <LogOut size={14}/>
                </button>
              </div>
            ) : (
              <button onClick={()=>navigate('/login')}
                className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-bold transition-all border"
                style={{background:'#C9A227',borderColor:'#C9A227',color:'#1A1A1A'}}>
                <LogIn size={15}/> دخول
              </button>
            )}
            <button className="md:hidden p-2" onClick={()=>setMobileOpen(!mobileOpen)}>
              {mobileOpen?<X size={22}/>:<Menu size={22}/>}
            </button>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:block border-t border-white/10">
          <div className="max-w-7xl mx-auto px-2 flex items-center gap-1">
            {navOverflow && (
              <button type="button" onClick={() => scrollNav(1)}
                className="shrink-0 p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
                aria-label="تمرير الأقسام لليمين">
                <ChevronRight size={18}/>
              </button>
            )}
            <div ref={navScrollRef} className="flex-1 flex gap-0.5 overflow-x-auto py-1 scrollbar-hide scroll-smooth">
              {visible.map(i => (
                <NavLink key={i.to} to={i.to} end={i.to==='/'}
                  className={({isActive})=>`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors
                    ${isActive?'text-white':'text-white/70 hover:text-white hover:bg-white/10'}`}
                  style={({isActive})=>isActive?{background:'rgba(201,162,39,0.25)',color:'#E8C84A'}:{}}>
                  <i.icon size={13}/>{i.label}
                </NavLink>
              ))}
            </div>
            {navOverflow && (
              <button type="button" onClick={() => scrollNav(-1)}
                className="shrink-0 p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
                aria-label="تمرير الأقسام لليسار">
                <ChevronLeft size={18}/>
              </button>
            )}
          </div>
        </nav>

        {/* Gold bottom line */}
        <div className="h-0.5 w-full" style={{background:'rgba(201,162,39,0.3)'}}/>

        {/* Mobile Nav */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-white/10 pb-2 max-h-64 overflow-y-auto">
            {visible.map(i => (
              <NavLink key={i.to} to={i.to} end={i.to==='/'}
                onClick={()=>setMobileOpen(false)}
                className={({isActive})=>`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors
                  ${isActive?'bg-white/10 text-white':'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                <i.icon size={15}/>{i.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 pb-24 md:pb-6"
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <Outlet/>
      </main>

      {/* شريط التنقّل السفلي — للجوال فقط (تجربة تطبيق عصرية) */}
      {visible.length > 0 && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${Math.min(visible.length, 4) + 1}, minmax(0,1fr))` }}>
            {visible.slice(0, 4).map(i => (
              <NavLink key={i.to} to={i.to} end={i.to==='/'}
                className={({isActive})=>`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors
                  ${isActive ? 'text-[#0D4A35]' : 'text-gray-400'}`}>
                {({isActive}) => (
                  <>
                    <span className={`flex items-center justify-center w-10 h-7 rounded-full transition-colors ${isActive ? 'bg-[#0D4A35]/10' : ''}`}>
                      <i.icon size={19}/>
                    </span>
                    <span className="truncate max-w-[64px]">{i.label}</span>
                  </>
                )}
              </NavLink>
            ))}
            <button onClick={()=>setMobileOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold text-gray-400">
              <span className="flex items-center justify-center w-10 h-7 rounded-full"><Menu size={19}/></span>
              <span>المزيد</span>
            </button>
          </div>
        </nav>
      )}

      {/* مركز المساعدة العائم الموحّد (دعم فني + مساعد ذكي) */}
      <FloatingHub
        showSupport={isEnabled('chat_enabled') && !!user}
        showAI={!!user && ['admin','staff'].includes(profile?.role)}
      />
      <InstallPWA/>

      <footer className="border-t py-5 text-center" style={{background:'var(--syria-green)',color:'rgba(255,255,255,0.7)'}}>
        <div className="flex items-center justify-center gap-3 mb-2">
          <SyriaEmblem size={28}/>
          <span className="text-white font-bold text-sm">{settings.org_name_ar}</span>
          <SyriaFlag width={36}/>
        </div>
        <p className="text-xs" style={{color:'#C9A227'}}>{settings.footer_text} © {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}
