import { useAuth } from '../hooks/useAuth'
import AdminDashboard       from './dashboards/AdminDashboard'
import StaffDashboard       from './dashboards/StaffDashboard'
import PublicDashboard      from './dashboards/PublicDashboard'
import AssociationDashboard from './dashboards/AssociationDashboard'
import { SkeletonDashboard } from '../components/ui/skeleton/Skeleton'

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()

  if (loading) return <SkeletonDashboard/>
  if (!user)   return <PublicDashboard/>

  switch(profile?.role) {
    case 'admin':       return <AdminDashboard/>
    case 'staff':       return <StaffDashboard/>
    case 'association': return <AssociationDashboard/>
    case 'unit_head':   return <StaffDashboard/>  // unit heads get staff view
    default:            return <PublicDashboard/>
  }
}
