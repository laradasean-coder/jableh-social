import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SettingsContext = createContext(null)

const DEFAULTS = {
  org_name_ar: 'دائرة جبلة للشؤون الاجتماعية والعمل',
  org_name_en: 'Jabla Social Affairs and Labor Office',
  ministry: 'وزارة الشؤون الاجتماعية والعمل',
  governorate: 'اللاذقية',
  address: 'مدينة جبلة، محافظة اللاذقية، الجمهورية العربية السورية',
  phone_main: '+963-41-XXXXXXX',
  phone_alt: '',
  email_main: 'jabla.social@mosa.gov.sy',
  working_hours: 'الأحد – الخميس: 8:00 صباحاً – 2:00 مساءً',
  maps_url: '',
  director_name: '',
  est_year: '',
  facebook_url: '', twitter_url: '', instagram_url: '', youtube_url: '',
  relief_enabled: 'true',
  track_enabled: 'true',
  chat_enabled: 'true',
  maintenance_mode: 'false',
  footer_text: 'جميع الحقوق محفوظة — دائرة جبلة للشؤون الاجتماعية والعمل',
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('site_settings').select('key,value')
      if (data?.length) {
        const map = { ...DEFAULTS }
        data.forEach(s => { map[s.key] = s.value })
        setSettings(map)
      }
    } catch (e) { /* use defaults */ }
    setLoading(false)
  }

  useEffect(() => { fetchSettings() }, [])

  const isEnabled = (key) => settings[key] === 'true'

  return (
    <SettingsContext.Provider value={{ settings, loading, isEnabled, refresh: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSiteSettings = () => {
  const ctx = useContext(SettingsContext)
  if (!ctx) return { settings: DEFAULTS, loading: false, isEnabled: () => true, refresh: () => {} }
  return ctx
}
