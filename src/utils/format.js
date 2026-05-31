// Unified formatting utilities — use these everywhere for consistency

/** Format a date in Arabic Syrian locale */
export function formatDate(iso, opts = {}) {
  if (!iso) return '—'
  const defaults = { year: 'numeric', month: 'long', day: 'numeric' }
  return new Date(iso).toLocaleDateString('ar-SY', { ...defaults, ...opts })
}

/** Format a datetime */
export function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ar-SY', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

/** Relative time in Arabic */
export function timeAgo(iso) {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 60)    return 'منذ لحظات'
  if (diff < 3600)  return `منذ ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`
  if (diff < 604800)return `منذ ${Math.floor(diff / 86400)} يوم`
  return formatDate(iso)
}

/** Format number with Arabic numerals option */
export function formatNumber(n) {
  if (n == null) return '—'
  return Math.round(n).toLocaleString('ar')
}

/** Format currency in Syrian pounds */
export function formatCurrency(n) {
  if (n == null) return '—'
  return `${Math.round(n).toLocaleString('ar')} ل.س`
}

/** Category metadata */
export const CATEGORIES = {
  disabled:    { label: 'ذوو الإعاقة',   icon: '♿', color: '#3B82F6', bg: '#EFF6FF', tailwind: 'blue' },
  widow:       { label: 'الأرامل',        icon: '🕊️', color: '#8B5CF6', bg: '#F5F3FF', tailwind: 'purple' },
  orphan:      { label: 'الأيتام',        icon: '⭐', color: '#F59E0B', bg: '#FFFBEB', tailwind: 'yellow' },
  divorced:    { label: 'المطلقات',       icon: '🌸', color: '#EC4899', bg: '#FDF2F8', tailwind: 'pink' },
  poor_family: { label: 'الأسر الفقيرة', icon: '🏠', color: '#10B981', bg: '#F0FDF4', tailwind: 'green' },
}

/** Status metadata */
export const STATUSES = {
  active:   { label: 'نشط',          tw: 'bg-green-100 text-green-700' },
  pending:  { label: 'معلق',          tw: 'bg-yellow-100 text-yellow-700' },
  inactive: { label: 'غير نشط',      tw: 'bg-gray-100 text-gray-500' },
}

/** Role labels */
export const ROLES = {
  admin:       { label: 'مسؤول النظام', tw: 'bg-red-100 text-red-700' },
  staff:       { label: 'موظف',          tw: 'bg-blue-100 text-blue-700' },
  unit_head:   { label: 'رئيس وحدة',    tw: 'bg-green-100 text-green-700' },
  association: { label: 'جمعية',         tw: 'bg-purple-100 text-purple-700' },
}

/** حالة مهلة SLA — يرجع لون وحالة الطلب */
export function slaStatus(deadline) {
  if (!deadline) return null
  const now = Date.now()
  const dl = new Date(deadline).getTime()
  const hoursLeft = (dl - now) / 3600000
  if (hoursLeft < 0)  return { state:'overdue', color:'#E24B4A', label:'متأخر', hours: Math.abs(Math.round(hoursLeft)) }
  if (hoursLeft < 12) return { state:'urgent',  color:'#F59E0B', label:'عاجل',  hours: Math.round(hoursLeft) }
  return { state:'ontime', color:'#10B981', label:'ضمن المهلة', hours: Math.round(hoursLeft) }
}
