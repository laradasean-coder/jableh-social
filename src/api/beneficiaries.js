import { supabase } from '../lib/supabase'

const PAGE_SIZE = 20

export async function getBeneficiaries({ filters = {}, page = 0 } = {}) {
  let q = supabase
    .from('beneficiaries')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  if (filters.category) q = q.eq('category', filters.category)
  if (filters.status)   q = q.eq('status',   filters.status)
  if (filters.district) q = q.ilike('district', `%${filters.district}%`)
  if (filters.search)   q = q.ilike('full_name', `%${filters.search}%`)

  const { data, count, error } = await q
  if (error) throw error
  return { data: data || [], total: count || 0 }
}

export async function getBeneficiaryById(id) {
  const { data, error } = await supabase
    .from('beneficiaries')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createBeneficiary(form) {
  const { data, error } = await supabase
    .from('beneficiaries')
    .insert({ ...form, source: 'manual' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateBeneficiary(id, form) {
  const { data, error } = await supabase
    .from('beneficiaries')
    .update({ ...form, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBeneficiary(id) {
  const { error } = await supabase.from('beneficiaries').delete().eq('id', id)
  if (error) throw error
}

export async function getBeneficiaryStats() {
  const { data, error } = await supabase.from('beneficiaries').select('category')
  if (error) throw error
  return (data || []).reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1
    return acc
  }, {})
}

export async function getBeneficiaryHistory(beneficiaryId) {
  const { data, error } = await supabase
    .from('beneficiary_relief_history')
    .select('*')
    .eq('beneficiary_id', beneficiaryId)
    .order('given_at', { ascending: false })
  if (error) return []
  return data || []
}

export async function addBeneficiaryHistory(entry) {
  const { data, error } = await supabase
    .from('beneficiary_relief_history')
    .insert(entry)
    .select()
    .single()
  if (error) throw error
  return data
}
