import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * الوضع الليلي — مخزّن أونلاين في ملف المستخدم (profiles.theme)
 * بدون localStorage. للزائر غير المسجّل يتبع تفضيل النظام فقط.
 */
export function useDarkMode() {
  const [dark, setDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  // Apply class whenever dark changes
  useEffect(() => {
    const root = document.documentElement
    if (dark) { root.classList.add('dark'); document.body.classList.add('dark') }
    else      { root.classList.remove('dark'); document.body.classList.remove('dark') }
  }, [dark])

  // Load saved preference from profile (online)
  useEffect(() => {
    let active = true
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !active) return
      supabase.from('profiles').select('theme').eq('id', user.id).single()
        .then(({ data }) => {
          if (active && data?.theme) setDark(data.theme === 'dark')
        })
    })
    return () => { active = false }
  }, [])

  // Setter that also persists to profile (online)
  const setDarkPersist = async (val) => {
    const next = typeof val === 'function' ? val(dark) : val
    setDark(next)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      supabase.from('profiles').update({ theme: next ? 'dark' : 'light' }).eq('id', user.id).catch(() => {})
    }
  }

  return [dark, setDarkPersist]
}
