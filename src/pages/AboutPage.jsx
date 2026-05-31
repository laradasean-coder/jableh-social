import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useSiteSettings } from '../hooks/useSiteSettings'
import SyriaEmblem from '../components/ui/SyriaEmblem'
import { Target, Eye, Heart, Users, Award, TrendingUp, MapPin, Phone, Mail, Clock } from 'lucide-react'

function CountUp({ target, duration = 1600 }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!target) return
    const start = Date.now()
    const tick = () => {
      const p = Math.min((Date.now()-start)/duration, 1)
      setV(Math.round((1-Math.pow(1-p,3))*target))
      if (p<1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target])
  return <span>{v.toLocaleString('ar')}</span>
}

export default function AboutPage() {
  const { settings } = useSiteSettings()
  const [stats, setStats] = useState({ total: 0, associations: 0 })

  useEffect(() => {
    Promise.all([
      supabase.from('beneficiaries').select('id', { count:'exact', head:true }),
      supabase.from('associations').select('id', { count:'exact', head:true }).eq('is_active', true),
    ]).then(([b, a]) => setStats({ total: b.count||0, associations: a.count||0 }))
  }, [])

  return (
    <div className="space-y-10" dir="rtl">
      {/* Hero */}
      <div className="rounded-3xl p-8 md:p-12 text-white text-center relative overflow-hidden"
        style={{ background:'linear-gradient(135deg,#062820,#0D4A35,#0F6040)' }}>
        <div className="h-1 absolute top-0 inset-x-0" style={{ background:'linear-gradient(to right,#C9A227,#E8C84A,#C9A227)' }}/>
        <SyriaEmblem size={80} className="mx-auto mb-4"/>
        <p className="text-sm mb-1" style={{ color:'#C9A227' }}>الجمهورية العربية السورية — {settings.ministry}</p>
        <h1 className="text-3xl md:text-4xl font-black mb-3">{settings.org_name_ar}</h1>
        <p className="text-white/80 max-w-2xl mx-auto leading-relaxed">
          {settings.about_text || 'نسعى لتقديم أفضل الخدمات الاجتماعية لأبناء مدينة جبلة وريفها وتعزيز التنمية المجتمعية المستدامة'}
        </p>
      </div>

      {/* Vision / Mission / Values */}
      <div className="grid md:grid-cols-3 gap-5">
        {[
          { icon:Eye,    title:'رؤيتنا',  text:'مجتمع متماسك تُصان فيه كرامة الإنسان وتُتاح فيه الخدمات الاجتماعية للجميع بعدالة وشفافية.', color:'#185FA5', bg:'#EFF6FF' },
          { icon:Target, title:'رسالتنا', text:'تقديم خدمات الرعاية والتنمية الاجتماعية للفئات المستحقة في جبلة وريفها بكفاءة ومهنية عالية.', color:'#0D4A35', bg:'#ECFDF5' },
          { icon:Heart,  title:'قيمنا',   text:'العدالة، الشفافية، الكرامة الإنسانية، سرعة الاستجابة، والمسؤولية المجتمعية في كل ما نقدّمه.', color:'#C9A227', bg:'#FFFBEB' },
        ].map(c => (
          <div key={c.title} className="card text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background:c.bg }}>
              <c.icon size={26} style={{ color:c.color }}/>
            </div>
            <h3 className="font-bold text-gray-800 text-lg mb-2">{c.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{c.text}</p>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="rounded-3xl p-8" style={{ background:'#0D4A35' }}>
        <h2 className="text-white text-xl font-bold text-center mb-6">إنجازاتنا بالأرقام</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon:Users,      label:'مستفيد مسجّل', value:stats.total||847 },
            { icon:Award,      label:'جمعية شريكة',  value:stats.associations||24 },
            { icon:MapPin,     label:'وحدة تنموية',  value:5 },
            { icon:TrendingUp, label:'سنة خدمة',     value:parseInt(settings.stat_years)||20 },
          ].map(s => (
            <div key={s.label} className="text-center">
              <s.icon size={28} className="mx-auto mb-2" style={{ color:'#C9A227' }}/>
              <div className="text-3xl font-black text-white"><CountUp target={s.value}/>+</div>
              <p className="text-sm mt-1" style={{ color:'#C9A22799' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-800 mb-5 text-center">تواصل معنا</h2>
        <div className="grid md:grid-cols-2 gap-3 max-w-2xl mx-auto">
          {[
            { icon:MapPin, label:'العنوان', text:settings.address },
            { icon:Phone,  label:'الهاتف',  text:settings.phone_main, dir:'ltr' },
            { icon:Mail,   label:'البريد',  text:settings.email_main, dir:'ltr' },
            { icon:Clock,  label:'الدوام',  text:settings.working_hours },
          ].map((c,i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background:'#0D4A3515' }}>
                <c.icon size={16} style={{ color:'#0D4A35' }}/>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold">{c.label}</p>
                <p className="text-sm text-gray-700 font-medium" dir={c.dir}>{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
