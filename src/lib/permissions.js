// ================================================
//  نظام الصلاحيات المركزي (RBAC)
//  - role: مستوى الصلاحية (admin / staff / unit_head / association / user)
//  - department: القسم الوظيفي للموظف (يحدد ما يظهر له)
//  المرجع الوحيد لما يراه كل مستخدم في الموقع.
// ================================================

// الأقسام الوظيفية للموظفين
export const DEPARTMENTS = {
  legal:        { label: 'الشؤون القانونية',  color: 'bg-indigo-100 text-indigo-700' },
  rural_dev:    { label: 'مدير التنمية الريفية', color: 'bg-emerald-100 text-emerald-700' },
  admin_affairs:{ label: 'الشؤون الإدارية',    color: 'bg-amber-100 text-amber-700' },
  relief:       { label: 'الشؤون الإغاثية',    color: 'bg-rose-100 text-rose-700' },
  follow_up:    { label: 'موظف متابعة',         color: 'bg-sky-100 text-sky-700' },
}

// تسميات الأدوار
export const ROLE_LABELS = {
  admin:       'مسؤول النظام',
  staff:       'موظف',
  unit_head:   'رئيس وحدة',
  association: 'جمعية',
  user:        'مستخدم',
}

// الصفحات الأساسية المتاحة لأي موظف مسجّل
const BASE = ['/', '/about']

// خريطة: قسم → الأقسام/المسارات المسموح بها لهذا القسم
const DEPT_KEYS = {
  legal:         ['/associations', '/access-requests', '/inbox', '/reports', '/audit-log'],
  rural_dev:     ['/rural-units', '/unit-reports', '/reports', '/map', '/staff-chat', '/analytics'],
  admin_affairs: ['/content', '/reports', '/inbox', '/access-requests', '/analytics', '/staff-chat'],
  relief:        ['/relief-admin', '/relief', '/beneficiaries', '/reports', '/map', '/track'],
  follow_up:     ['/analytics', '/reports', '/beneficiaries', '/relief-admin', '/map', '/staff-chat'],
}

// مجموعة الموظف العام (بدون قسم محدّد) — صلاحيات واسعة للتوافق مع الحسابات القديمة
const STAFF_FULL = [
  '/analytics', '/beneficiaries', '/map', '/relief', '/track', '/relief-admin',
  '/access-requests', '/inbox', '/staff-chat', '/reports', '/unit-reports',
  '/associations', '/rural-units',
]

// هل المستخدم محصور في نطاق محدّد (وحدة أو جمعية)؟
export function isScoped(profile) {
  return profile?.role === 'unit_head' || profile?.role === 'association'
}

// المسارات المسموح بها لمستخدم معيّن (Set)
export function allowedRouteKeys(profile) {
  if (!profile) return new Set(BASE)
  if (profile.role === 'admin') return null // null = كل شيء مسموح

  if (profile.role === 'unit_head')
    return new Set([...BASE, '/rural-units', '/unit-reports', '/staff-chat'])

  if (profile.role === 'association')
    return new Set([...BASE, '/associations', '/track'])

  if (profile.role === 'staff') {
    const dept = profile.department
    if (dept && DEPT_KEYS[dept]) return new Set([...BASE, ...DEPT_KEYS[dept]])
    // موظف عام بلا قسم: صلاحيات واسعة (توافق خلفي)
    return new Set([...BASE, ...STAFF_FULL])
  }

  // مستخدم/مواطن
  return new Set(BASE)
}

// هل يستطيع المستخدم الوصول لمسار محمي؟
export function canAccess(profile, key) {
  if (!profile) return false
  if (profile.role === 'admin') return true
  const set = allowedRouteKeys(profile)
  return set ? set.has(key) : true
}

// هل يظهر عنصر التنقّل لهذا المستخدم؟ (يراعي الصفحات العامة)
export function navVisible(profile, item, isLoggedIn) {
  if (!isLoggedIn) return !!item.public
  if (!profile) return !!item.public
  if (profile.role === 'admin') return true

  // المستخدمون المحصورون يرون مساراتهم فقط
  if (isScoped(profile)) {
    const set = allowedRouteKeys(profile)
    return set.has(item.to)
  }

  // الموظفون: المسموح به + الصفحات العامة التعريفية
  if (profile.role === 'staff') {
    if (canAccess(profile, item.to)) return true
    return !!item.public && !item.staffOnly && !item.adminOnly
  }

  // المواطن العادي
  return !!item.public
}

// الصفحة الرئيسية المناسبة لكل مستخدم بعد الدخول
export function homePath(profile) {
  if (!profile) return '/'
  if (profile.role === 'unit_head')   return '/rural-units'
  if (profile.role === 'association') return '/associations'
  return '/'
}

// تسمية موحّدة لعرض الدور/القسم
export function roleDisplay(profile) {
  if (!profile) return ''
  if (profile.role === 'staff' && profile.department && DEPARTMENTS[profile.department])
    return DEPARTMENTS[profile.department].label
  return ROLE_LABELS[profile.role] || 'مستخدم'
}
