import { supabase } from '../../lib/supabase'

// Client-side fallback similarity (for offline / Supabase unavailable)
export function similarity(a = '', b = '') {
  a = a.trim().replace(/\s+/g,' ')
  b = b.trim().replace(/\s+/g,' ')
  if (!a || !b) return 0
  if (a === b) return 1
  const wa = new Set(a.split(' ')), wb = new Set(b.split(' '))
  const inter = [...wa].filter(w => wb.has(w)).length
  return inter / Math.max(wa.size, wb.size)
}

/**
 * Check for duplicate beneficiaries using server-side pg_trgm
 * Falls back to client-side similarity if RPC unavailable
 */
export async function checkDuplicates(full_name, national_id) {
  if (!full_name?.trim()) return []

  // Try server-side pg_trgm search (efficient)
  try {
    const { data, error } = await supabase.rpc('search_similar_beneficiaries', {
      p_name: full_name.trim(),
      p_national_id: national_id?.trim() || null,
      p_threshold: 0.4
    })

    if (!error && data?.length > 0) {
      return data.map(d => ({
        ...d,
        matchType: d.national_id && d.national_id === national_id?.trim()
          ? 'رقم وطني مطابق'
          : `تشابه في الاسم ${Math.round(d.score * 100)}%`,
        score: d.score
      }))
    }
  } catch (e) {
    // RPC not available yet — fall back to client-side
    console.warn('pg_trgm RPC unavailable, using client-side similarity')
  }

  // Client-side fallback (fetches limited set)
  const { data: all } = await supabase
    .from('beneficiaries')
    .select('id,full_name,national_id,district,category')
    .limit(200)

  if (!all) return []

  const results = []

  // Exact national_id match
  if (national_id?.trim()) {
    all.filter(r => r.national_id === national_id.trim())
       .forEach(r => results.push({ ...r, matchType: 'رقم وطني مطابق', score: 1.0 }))
  }

  // Name similarity
  all.forEach(row => {
    const score = similarity(full_name, row.full_name)
    if (score >= 0.7 && !results.find(d => d.id === row.id)) {
      results.push({ ...row, matchType: `تشابه في الاسم ${Math.round(score*100)}%`, score })
    }
  })

  return results.sort((a,b) => b.score - a.score).slice(0, 3)
}
