import { Award, Briefcase, Heart, Users, Star, Mail, Phone } from 'lucide-react'
import { useSiteSettings } from '../hooks/useSiteSettings'

const achievements = [
  { icon: Users, value: '12,000+', label: 'مستفيد مسجّل' },
  { icon: Heart, value: '85+',     label: 'جمعية أهلية' },
  { icon: Star,  value: '5',       label: 'وحدات تنمية ريفية' },
  { icon: Award, value: '20+',     label: 'سنة خدمة' },
]

const workAreas = [
  'رعاية ذوي الإعاقة وتأمين احتياجاتهم',
  'دعم الأسر الفقيرة والمحتاجة',
  'برامج تمكين المرأة والأرامل والمطلقات',
  'تنمية المجتمعات الريفية وتطوير الكوادر',
  'الإشراف على الجمعيات الأهلية ودعمها',
  'تنسيق جهود الإغاثة الإنسانية في المنطقة',
  'إعداد الدراسات الاجتماعية والإحصائية',
  'تفعيل برامج الحماية الاجتماعية الشاملة',
]

// النصوص الافتراضية تُستخدم فقط إن لم يُدخل المدير قيمة في لوحة إدارة المحتوى
const FALLBACK = {
  name:  'معتز بلة',
  title: 'مدير دائرة جبلة للشؤون الاجتماعية والعمل',
  email: 'moataz.bela@mosa.gov.sy',
  phone: '+963XXXXXXX',
  intro: 'قائد إنساني بخبرة واسعة في مجال الشؤون الاجتماعية والعمل، يحمل رؤية تنموية شاملة لخدمة أبناء المنطقة.',
  bio: `يتولى السيد {name} إدارة دائرة جبلة للشؤون الاجتماعية والعمل، ويحمل خبرة مهنية واسعة في مجال الخدمة الاجتماعية والعمل الإنساني تمتد لأكثر من عقدين من الزمن.

تدرّج في مناصب عدة داخل وزارة الشؤون الاجتماعية والعمل، وأسهم في إطلاق مبادرات اجتماعية متعددة أسفرت عن تحسين ملموس في مستوى الخدمات المقدمة لأبناء المنطقة.

يؤمن بأن التنمية الحقيقية تبدأ من تمكين الأفراد وبناء المجتمعات القادرة على الاعتماد على ذاتها، وعمل على تعزيز الشراكة بين الجهات الحكومية والجمعيات الأهلية لتحقيق هذا الهدف.`,
  vision: 'نسعى إلى بناء منظومة اجتماعية متكاملة تضمن الكرامة الإنسانية لكل فرد، وتوفر شبكة حماية اجتماعية فعّالة تشمل الجميع دون استثناء. رسالتنا خدمة أبناء جبلة وريفها بكل إخلاص وتفانٍ.',
}

export default function AdminPage() {
  const { settings } = useSiteSettings()

  const name   = settings.director_name?.trim()   || FALLBACK.name
  const title  = settings.director_title?.trim()  || FALLBACK.title
  const email  = settings.director_email?.trim()  || FALLBACK.email
  const phone  = settings.director_phone?.trim()  || FALLBACK.phone
  const photo  = settings.director_photo?.trim()  || ''
  const intro  = settings.director_intro?.trim()  || FALLBACK.intro
  const bioRaw = settings.director_bio?.trim()    || FALLBACK.bio.replace('{name}', name)
  const vision = settings.director_vision?.trim() || FALLBACK.vision

  const bioParagraphs = bioRaw.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 text-white
                      rounded-3xl p-8 shadow-xl">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="shrink-0">
            <div className="w-36 h-36 rounded-3xl bg-white/20 border-4 border-white/30
                            flex items-center justify-center shadow-2xl overflow-hidden">
              {photo
                ? <img src={photo} alt={name} className="w-full h-full object-cover"/>
                : <span className="text-6xl">👤</span>}
            </div>
          </div>
          <div className="flex-1 text-center md:text-right">
            <p className="text-slate-300 text-sm mb-1">{title}</p>
            <h1 className="text-4xl font-bold mb-2">{name}</h1>
            <p className="text-slate-300 text-base mb-4">{intro}</p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <a href={`mailto:${email}`}
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25
                           px-4 py-2 rounded-xl text-sm transition-colors">
                <Mail size={15} /> البريد الإلكتروني
              </a>
              <a href={`tel:${phone}`}
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25
                           px-4 py-2 rounded-xl text-sm transition-colors">
                <Phone size={15} /> التواصل المباشر
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {achievements.map(a => (
          <div key={a.label} className="card text-center hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <a.icon size={22} className="text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-800">{a.value}</div>
            <div className="text-sm text-gray-500 mt-1">{a.label}</div>
          </div>
        ))}
      </div>

      {/* Biography */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Briefcase size={20} className="text-blue-700" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">السيرة المهنية</h2>
          </div>
          <div className="space-y-4 text-gray-600 leading-loose">
            {bioParagraphs.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Heart size={20} className="text-green-700" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">مجالات العمل الإنساني</h2>
          </div>
          <ul className="space-y-3">
            {workAreas.map((area, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-600">
                <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-green-700 text-xs font-bold">
                  {i + 1}
                </span>
                {area}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Vision */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-3xl p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <Star size={24} className="text-yellow-300" />
          <h2 className="text-2xl font-bold">رؤية الإدارة</h2>
        </div>
        <blockquote className="text-blue-100 text-lg leading-loose border-r-4 border-yellow-300 pr-5 italic whitespace-pre-line">
          {vision}
        </blockquote>
        <p className="text-yellow-300 font-bold mt-4 text-left">— {name}</p>
      </div>
    </div>
  )
}
