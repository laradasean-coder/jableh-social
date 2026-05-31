import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { SettingsProvider, useSiteSettings } from './hooks/useSiteSettings'
import Layout from './components/layout/Layout'
import { canAccess, homePath } from './lib/permissions'
import { lazyWithRetry as lazy } from './lib/lazyWithRetry'
import ChangePasswordModal from './components/ui/ChangePasswordModal'
import ErrorBoundary from './components/ui/ErrorBoundary'
import NotFoundPage from './pages/NotFoundPage'
import MaintenancePage from './pages/MaintenancePage'

const DashboardPage          = lazy(() => import('./pages/DashboardPage'))
const AdminPage              = lazy(() => import('./pages/AdminPage'))
const BeneficiariesPage      = lazy(() => import('./pages/BeneficiariesPage'))
const AssociationsPage       = lazy(() => import('./pages/AssociationsPage'))
const RuralUnitsPage         = lazy(() => import('./pages/RuralUnitsPage'))
const ReliefFormPage         = lazy(() => import('./pages/ReliefFormPage'))
const ReliefAdminPage        = lazy(() => import('./pages/ReliefAdminPage'))
const ReportsPage            = lazy(() => import('./pages/ReportsPage'))
const UnitReportsPage        = lazy(() => import('./pages/UnitReportsPage'))
const AuditLogPage           = lazy(() => import('./pages/AuditLogPage'))
const LoginPage              = lazy(() => import('./pages/LoginPage'))
const EmployeeManagementPage = lazy(() => import('./pages/EmployeeManagementPage'))
const AccessRequestsPage     = lazy(() => import('./pages/AccessRequestsPage'))
const AnalyticsPage          = lazy(() => import('./pages/AnalyticsPage'))
const SupportInboxPage       = lazy(() => import('./pages/SupportInboxPage'))
const StatusPage             = lazy(() => import('./pages/StatusPage'))
const BeneficiaryTrackPage   = lazy(() => import('./pages/BeneficiaryTrackPage'))
const MapPage                = lazy(() => import('./pages/MapPage'))
const ContentManagementPage  = lazy(() => import('./pages/ContentManagementPage'))
const SecurityBackupPage     = lazy(() => import('./pages/SecurityBackupPage'))
const AboutPage              = lazy(() => import('./pages/AboutPage'))
const StaffChatPage          = lazy(() => import('./pages/StaffChatPage'))

function Spinner() {
  return <div className="min-h-[50vh] flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent" style={{borderColor:'#0D4A35',borderTopColor:'transparent'}}/>
  </div>
}

function Protected({ children, roles, navKey }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <Spinner/>
  if (!user)   return <Navigate to="/login" replace/>
  // فحص الدور (توافق خلفي)
  if (roles && profile && !roles.includes(profile.role)) return <Navigate to={homePath(profile)} replace/>
  // فحص الصلاحية حسب القسم/النطاق (الأدق)
  if (navKey && profile && !canAccess(profile, navKey)) return <Navigate to={homePath(profile)} replace/>
  return children
}

// الصفحة الرئيسية حسب الدور: المستخدم المحصور (وحدة/جمعية) يُوجَّه لصفحته
function RoleHome() {
  const { profile } = useAuth()
  const dest = homePath(profile)
  if (dest !== '/') return <Navigate to={dest} replace/>
  return <DashboardPage/>
}

// Gate that checks if a public service is enabled in settings
function ServiceGate({ settingKey, children }) {
  const { isEnabled, loading } = useSiteSettings()
  const { profile } = useAuth()
  if (loading) return <Spinner/>
  // Staff/admin bypass service toggles
  const isStaff = ['admin','staff'].includes(profile?.role)
  if (!isEnabled(settingKey) && !isStaff) {
    return (
      <div className="text-center py-20" dir="rtl">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">هذه الخدمة غير متاحة حالياً</h2>
        <p className="text-gray-500">تم إيقاف هذه الخدمة مؤقتاً. يرجى المراجعة لاحقاً.</p>
      </div>
    )
  }
  return children
}

function AppInner() {
  const { profile } = useAuth()
  const { isEnabled, loading: settingsLoading } = useSiteSettings()

  // Maintenance mode — block everyone except admins
  if (!settingsLoading && isEnabled('maintenance_mode') && profile?.role !== 'admin') {
    return <MaintenancePage/>
  }

  return (
    <>
      {profile?.must_change_password && <ChangePasswordModal/>}
      <ErrorBoundary>
        <Suspense fallback={<Spinner/>}>
          <Routes>
            <Route path="/login" element={<LoginPage/>}/>
            <Route path="/" element={<Layout/>}>
              <Route index element={<RoleHome/>}/>
              <Route path="admin"        element={<AdminPage/>}/>
              <Route path="about"        element={<AboutPage/>}/>
              <Route path="associations" element={<AssociationsPage/>}/>
              <Route path="rural-units"  element={<RuralUnitsPage/>}/>
              <Route path="relief"       element={<ServiceGate settingKey="relief_enabled"><ReliefFormPage/></ServiceGate>}/>
              <Route path="track"        element={<ServiceGate settingKey="track_enabled"><BeneficiaryTrackPage/></ServiceGate>}/>
              <Route path="dashboard"    element={<DashboardPage/>}/>
              <Route path="analytics"    element={<Protected navKey="/analytics"><AnalyticsPage/></Protected>}/>
              <Route path="map"          element={<Protected navKey="/map"><MapPage/></Protected>}/>
              <Route path="beneficiaries" element={<Protected navKey="/beneficiaries"><BeneficiariesPage/></Protected>}/>
              <Route path="relief-admin"  element={<Protected navKey="/relief-admin"><ReliefAdminPage/></Protected>}/>
              <Route path="reports"       element={<Protected navKey="/reports"><ReportsPage/></Protected>}/>
              <Route path="unit-reports"  element={<Protected navKey="/unit-reports"><UnitReportsPage/></Protected>}/>
              <Route path="access-requests" element={<Protected navKey="/access-requests"><AccessRequestsPage/></Protected>}/>
              <Route path="inbox"         element={<Protected navKey="/inbox"><SupportInboxPage/></Protected>}/>
              <Route path="staff-chat"    element={<Protected navKey="/staff-chat"><StaffChatPage/></Protected>}/>
              <Route path="audit-log"     element={<Protected roles={['admin']} navKey="/audit-log"><AuditLogPage/></Protected>}/>
              <Route path="employees"     element={<Protected roles={['admin']}><EmployeeManagementPage/></Protected>}/>
              <Route path="status"        element={<Protected roles={['admin']}><StatusPage/></Protected>}/>
              <Route path="content"       element={<Protected navKey="/content"><ContentManagementPage/></Protected>}/>
              <Route path="security"      element={<Protected roles={['admin']}><SecurityBackupPage/></Protected>}/>
              <Route path="*"            element={<NotFoundPage/>}/>
            </Route>
            <Route path="*" element={<NotFoundPage/>}/>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <AppInner/>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
