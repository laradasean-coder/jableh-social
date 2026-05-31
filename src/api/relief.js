import { supabase } from '../lib/supabase'

const PAGE_SIZE = 10

export async function getReliefRequests({ filters = {}, page = 0 } = {}) {
  let q = supabase
    .from('relief_requests')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  if (filters.status)  q = q.eq('status', filters.status)
  if (filters.search)  q = q.ilike('full_name', `%${filters.search}%`)

  const { data, count, error } = await q
  if (error) throw error
  let rows = data || []
  if (filters.sortByPriority) {
    rows = rows.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
  }
  return { data: rows, total: count || 0 }
}

export async function updateReliefStatus(id, status, note = '') {
  const { error } = await supabase
    .from('relief_requests')
    .update({ status })
    .eq('id', id)
  if (error) throw error
  if (note) {
    await supabase.from('audit_logs').insert({
      action: status === 'transferred' ? 'transfer' : status === 'rejected' ? 'reject' : 'update',
      entity: 'طلب إغاثة', detail: note
    })
  }
}

export async function submitReliefRequest(form) {
  const { data, error } = await supabase
    .from('relief_requests')
    .insert(form)
    .select()
    .single()
  if (error) throw error
  return data
}
