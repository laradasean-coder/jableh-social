import { supabase } from '../lib/supabase'

export async function getDashboardStats() {
  const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0,0,0,0)

  const [bensRes, relsRes, assocsRes] = await Promise.all([
    supabase.from('beneficiaries').select('id,category,status,created_at').order('created_at', { ascending: false }).limit(200),
    supabase.from('relief_requests').select('id,full_name,phone,category,created_at').eq('status','pending').limit(20),
    supabase.from('associations').select('id').eq('is_active', true),
  ])

  const bens   = bensRes.data   || []
  const rels   = relsRes.data   || []
  const assocs = assocsRes.data || []

  const catCounts = {}
  bens.forEach(b => { catCounts[b.category] = (catCounts[b.category]||0) + 1 })

  return {
    total: bens.length,
    ...catCounts,
    pending: bens.filter(b => b.status === 'pending').length,
    newThisMonth: bens.filter(b => new Date(b.created_at) >= thisMonth).length,
    pendingRelief: rels.length,
    associations: assocs.length,
    recentBens: bens.slice(0, 5),
    pendingReliefList: rels.slice(0, 5),
  }
}
