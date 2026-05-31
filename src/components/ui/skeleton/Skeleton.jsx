// Reusable skeleton loading components

function SkeletonBox({ className = '', style = {} }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded-xl ${className}`}
      style={style}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-3">
        <SkeletonBox className="w-11 h-11 rounded-xl flex-shrink-0"/>
        <div className="flex-1 space-y-2">
          <SkeletonBox className="h-4 w-3/4"/>
          <SkeletonBox className="h-3 w-1/2"/>
        </div>
      </div>
      <SkeletonBox className="h-8 w-1/3"/>
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBox key={i} className="h-3 flex-1"/>
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-t border-gray-50 flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <SkeletonBox key={j} className={`h-4 ${j === 0 ? 'flex-[2]' : 'flex-1'}`}/>
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <SkeletonCard key={i}/>)}
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <div className="card">
          <SkeletonBox className="h-4 w-32 mb-4"/>
          <SkeletonBox className="h-28 w-full"/>
        </div>
        <div className="card">
          <SkeletonBox className="h-4 w-32 mb-4"/>
          <SkeletonBox className="h-28 w-full"/>
        </div>
      </div>
      <SkeletonTable rows={4} cols={4}/>
    </div>
  )
}

export function SkeletonList({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
          <SkeletonBox className="w-9 h-9 rounded-full flex-shrink-0"/>
          <div className="flex-1 space-y-2">
            <SkeletonBox className="h-3.5 w-2/3"/>
            <SkeletonBox className="h-3 w-1/3"/>
          </div>
          <SkeletonBox className="h-6 w-16 rounded-full"/>
        </div>
      ))}
    </div>
  )
}

export default SkeletonBox
