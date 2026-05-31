export default function SyriaFlag({ width = 60, className = '' }) {
  const h = width * 0.667
  return (
    <svg width={width} height={h} viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"
      className={`rounded-sm shadow-sm ${className}`} role="img" aria-label="علم الجمهورية العربية السورية">
      <rect width="60" height="13.3" fill="#007A3D"/>
      <rect y="13.3" width="60" height="13.4" fill="#FFFFFF"/>
      <rect y="26.7" width="60" height="13.3" fill="#000000"/>
      {/* Three red stars */}
      {[18, 30, 42].map((x, i) => (
        <polygon key={i}
          points={`${x},17 ${x+1.5},21 ${x+5.5},21 ${x+2.5},23.5 ${x+3.5},27.5 ${x},25 ${x-3.5},27.5 ${x-2.5},23.5 ${x-5.5},21 ${x-1.5},21`}
          fill="#CE1126"
        />
      ))}
    </svg>
  )
}
