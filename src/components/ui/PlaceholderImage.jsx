/**
 * PlaceholderImage — صور SVG احترافية كبدائل مؤقتة
 * تُستبدل تلقائياً عند رفع صور حقيقية من داخل الموقع
 */

const THEMES = {
  hero_main: {
    bg: '#1e3a8a', fg: '#93c5fd', accent: '#fbbf24',
    icon: (
      <g>
        <rect x="160" y="80" width="80" height="100" rx="8" fill="#fbbf24" opacity="0.9"/>
        <rect x="170" y="90" width="25" height="20" rx="3" fill="#1e3a8a"/>
        <rect x="205" y="90" width="25" height="20" rx="3" fill="#1e3a8a"/>
        <rect x="170" y="120" width="60" height="8" rx="2" fill="#1e3a8a" opacity="0.6"/>
        <rect x="170" y="135" width="45" height="8" rx="2" fill="#1e3a8a" opacity="0.6"/>
        <rect x="185" y="155" width="30" height="25" rx="4" fill="#1e3a8a"/>
        <circle cx="270" cy="100" r="30" fill="#60a5fa" opacity="0.3"/>
        <circle cx="270" cy="100" r="18" fill="#60a5fa" opacity="0.5"/>
        <path d="M262 100 L268 106 L280 94" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round"/>
        <circle cx="120" cy="130" r="20" fill="#34d399" opacity="0.3"/>
        <circle cx="120" cy="130" r="12" fill="#34d399" opacity="0.5"/>
        <text x="114" y="135" fill="#fff" fontSize="14" fontWeight="bold">👥</text>
      </g>
    ),
    label: 'دائرة جبلة للشؤون الاجتماعية'
  },
  hero_rural: {
    bg: '#064e3b', fg: '#6ee7b7', accent: '#fbbf24',
    icon: (
      <g>
        <ellipse cx="200" cy="160" rx="120" ry="30" fill="#065f46" opacity="0.5"/>
        <path d="M140 160 Q150 80 200 70 Q250 80 260 160Z" fill="#16a34a" opacity="0.8"/>
        <path d="M100 160 Q108 100 145 95 Q182 100 180 160Z" fill="#22c55e" opacity="0.7"/>
        <path d="M220 160 Q228 105 255 102 Q282 105 290 160Z" fill="#22c55e" opacity="0.7"/>
        <rect x="188" y="140" width="24" height="20" rx="2" fill="#92400e"/>
        <circle cx="270" cy="90" r="22" fill="#fbbf24" opacity="0.9"/>
        <path d="M270 78 L274 86 L284 87 L277 94 L279 104 L270 99 L261 104 L263 94 L256 87 L266 86Z" fill="#fef3c7"/>
      </g>
    ),
    label: 'برامج التنمية الريفية'
  },
  hero_associations: {
    bg: '#4c1d95', fg: '#c4b5fd', accent: '#f472b6',
    icon: (
      <g>
        <rect x="100" y="110" width="60" height="70" rx="6" fill="#7c3aed" opacity="0.8"/>
        <rect x="170" y="90" width="60" height="90" rx="6" fill="#6d28d9" opacity="0.9"/>
        <rect x="240" y="105" width="60" height="75" rx="6" fill="#7c3aed" opacity="0.8"/>
        {[115,185,255].map((x,i) => [0,1,2].map(j => (
          <rect key={`w${i}${j}`} x={x+j*15} y={120+j*25} width="10" height="8" rx="1" fill="#ddd6fe" opacity="0.7"/>
        )))}
        <path d="M160 180 Q200 150 240 180" stroke="#f472b6" strokeWidth="3" fill="none" strokeDasharray="6,3"/>
        <circle cx="200" cy="100" r="15" fill="#f472b6" opacity="0.8"/>
        <text x="193" y="106" fill="#fff" fontSize="14">🤝</text>
      </g>
    ),
    label: 'الجمعيات الأهلية الشريكة'
  },
  unit_card: {
    bg: '#1e40af', fg: '#bfdbfe', accent: '#34d399',
    icon: (
      <g>
        <rect x="70" y="60" width="260" height="140" rx="12" fill="#1d4ed8" opacity="0.3"/>
        <rect x="85" y="75" width="70" height="55" rx="6" fill="#3b82f6" opacity="0.7"/>
        <rect x="165" y="75" width="70" height="55" rx="6" fill="#3b82f6" opacity="0.7"/>
        <rect x="245" y="75" width="70" height="55" rx="6" fill="#3b82f6" opacity="0.7"/>
        <rect x="125" y="140" width="150" height="45" rx="6" fill="#2563eb" opacity="0.7"/>
        <rect x="90" y="82" width="20" height="15" rx="2" fill="#bfdbfe" opacity="0.8"/>
        <rect x="116" y="82" width="20" height="15" rx="2" fill="#bfdbfe" opacity="0.8"/>
        <rect x="170" y="82" width="20" height="15" rx="2" fill="#bfdbfe" opacity="0.8"/>
        <rect x="196" y="82" width="20" height="15" rx="2" fill="#bfdbfe" opacity="0.8"/>
        <rect x="140" y="148" width="30" height="30" rx="4" fill="#1d4ed8"/>
        <circle cx="340" cy="90" r="25" fill="#34d399" opacity="0.3"/>
        <text x="328" y="97" fill="#059669" fontSize="18" fontWeight="bold">✓</text>
      </g>
    ),
    label: 'وحدة التنمية الريفية'
  },
  news: {
    bg: '#0c4a6e', fg: '#7dd3fc', accent: '#fbbf24',
    icon: (
      <g>
        <rect x="80" y="70" width="240" height="160" rx="8" fill="#0369a1" opacity="0.5"/>
        <rect x="95" y="85" width="130" height="80" rx="6" fill="#0284c7" opacity="0.6"/>
        <rect x="235" y="85" width="70" height="35" rx="4" fill="#0ea5e9" opacity="0.5"/>
        <rect x="235" y="128" width="70" height="12" rx="2" fill="#38bdf8" opacity="0.4"/>
        <rect x="235" y="148" width="55" height="12" rx="2" fill="#38bdf8" opacity="0.4"/>
        <rect x="95" y="175" width="210" height="10" rx="2" fill="#38bdf8" opacity="0.4"/>
        <rect x="95" y="193" width="180" height="10" rx="2" fill="#38bdf8" opacity="0.4"/>
        <rect x="95" y="211" width="150" height="10" rx="2" fill="#38bdf8" opacity="0.4"/>
        <circle cx="160" cy="125" r="20" fill="#fbbf24" opacity="0.8"/>
        <text x="150" y="132" fill="#fff" fontSize="18">📰</text>
      </g>
    ),
    label: 'أخبار الدائرة'
  },
  activity: {
    bg: '#065f46', fg: '#6ee7b7', accent: '#fbbf24',
    icon: (
      <g>
        <circle cx="200" cy="130" r="70" fill="#047857" opacity="0.3"/>
        <circle cx="200" cy="130" r="50" fill="#059669" opacity="0.4"/>
        {[0,60,120,180,240,300].map((angle,i) => {
          const r = 65
          const x = 200 + r*Math.cos(angle*Math.PI/180)
          const y = 130 + r*Math.sin(angle*Math.PI/180)
          return <circle key={i} cx={x} cy={y} r="8" fill="#34d399" opacity="0.8"/>
        })}
        <circle cx="200" cy="130" r="22" fill="#10b981" opacity="0.9"/>
        <text x="188" y="138" fill="#fff" fontSize="18">⭐</text>
        <rect x="100" y="215" width="200" height="8" rx="4" fill="#34d399" opacity="0.3"/>
        <rect x="130" y="230" width="140" height="6" rx="3" fill="#34d399" opacity="0.2"/>
      </g>
    ),
    label: 'نشاطات وفعاليات'
  }
}

export default function PlaceholderImage({
  theme = 'unit_card',
  className = '',
  width = 400,
  height = 240,
  showLabel = true
}) {
  const t = THEMES[theme] || THEMES.unit_card
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-full ${className}`}
      role="img"
      aria-label={t.label}
    >
      {/* Background */}
      <rect width={width} height={height} fill={t.bg}/>
      {/* Subtle pattern */}
      <pattern id={`p_${theme}`} width="30" height="30" patternUnits="userSpaceOnUse">
        <circle cx="15" cy="15" r="1" fill={t.fg} opacity="0.15"/>
      </pattern>
      <rect width={width} height={height} fill={`url(#p_${theme})`}/>
      {/* Icon */}
      <g transform={`translate(${width/2 - 200},${height/2 - 130})`}>
        {t.icon}
      </g>
      {/* Label */}
      {showLabel && (
        <>
          <rect x="0" y={height-36} width={width} height="36" fill="rgba(0,0,0,0.5)"/>
          <text
            x={width/2} y={height-14}
            textAnchor="middle"
            fill="white"
            fontSize="13"
            fontFamily="Cairo, Tajawal, sans-serif"
            fontWeight="600"
          >
            {t.label}
          </text>
        </>
      )}
    </svg>
  )
}

export { THEMES }
