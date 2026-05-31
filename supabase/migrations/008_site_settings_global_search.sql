-- ================================================
-- Migration 008: إعدادات الموقع + بحث شامل
-- ================================================

-- 1. جدول إعدادات الموقع
CREATE TABLE IF NOT EXISTS public.site_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- الكل يقرأ الإعدادات العامة
CREATE POLICY "settings_read" ON public.site_settings
  FOR SELECT USING (TRUE);

-- المدير فقط يعدّل
CREATE POLICY "settings_admin" ON public.site_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. إعدادات افتراضية
INSERT INTO public.site_settings (key, value) VALUES
  ('org_name_ar',    'دائرة جبلة للشؤون الاجتماعية والعمل'),
  ('org_name_en',    'Jabla Social Affairs and Labor Office'),
  ('ministry',       'وزارة الشؤون الاجتماعية والعمل'),
  ('governorate',    'اللاذقية'),
  ('address',        'مدينة جبلة، محافظة اللاذقية، الجمهورية العربية السورية'),
  ('phone_main',     '+963-41-XXXXXXX'),
  ('email_main',     'jabla.social@mosa.gov.sy'),
  ('working_hours',  'الأحد – الخميس: 8:00 صباحاً – 2:00 مساءً'),
  ('relief_enabled', 'true'),
  ('track_enabled',  'true'),
  ('chat_enabled',   'true'),
  ('maintenance_mode','false'),
  ('footer_text',    'جميع الحقوق محفوظة — دائرة جبلة للشؤون الاجتماعية والعمل'),
  ('hero_title',     'دائرة جبلة للشؤون الاجتماعية والعمل'),
  ('hero_subtitle',  'نخدم أبناء جبلة وريفها بكل مهنية وشفافية'),
  ('stat_years',     '20'),
  ('about_text',     'نسعى لتقديم أفضل الخدمات الاجتماعية لأبناء مدينة جبلة وريفها وتعزيز التنمية المجتمعية المستدامة'),
  ('director_name',  ''),
  ('est_year',       ''),
  ('phone_alt',      ''),
  ('maps_url',       ''),
  ('facebook_url',   ''),
  ('twitter_url',    ''),
  ('instagram_url',  ''),
  ('youtube_url',    '')
ON CONFLICT (key) DO NOTHING;

-- 3. Full-text search index للبحث الشامل
CREATE INDEX IF NOT EXISTS idx_beneficiaries_fts
  ON public.beneficiaries USING gin(to_tsvector('simple', coalesce(full_name,'') || ' ' || coalesce(national_id,'') || ' ' || coalesce(phone,'')));

CREATE INDEX IF NOT EXISTS idx_site_content_fts
  ON public.site_content USING gin(to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(body,'')));

-- 4. RPC للبحث الموحد
CREATE OR REPLACE FUNCTION public.global_search(query TEXT)
RETURNS TABLE(type TEXT, id UUID, title TEXT, subtitle TEXT, meta JSONB)
LANGUAGE sql STABLE AS $$
  (SELECT 'beneficiary'::TEXT, b.id, b.full_name,
    COALESCE(b.district,'') || ' — ' || b.category, jsonb_build_object('status',b.status,'category',b.category)
  FROM public.beneficiaries b
  WHERE b.full_name ILIKE '%' || query || '%' OR b.national_id ILIKE '%' || query || '%' OR b.phone ILIKE '%' || query || '%'
  LIMIT 5)

  UNION ALL

  (SELECT 'association'::TEXT, a.id, a.name,
    COALESCE(a.address,'') || ' — ' || COALESCE(a.president_name,''), jsonb_build_object()
  FROM public.associations a
  WHERE a.name ILIKE '%' || query || '%'
  LIMIT 4)

  UNION ALL

  (SELECT 'relief'::TEXT, r.id, r.full_name,
    'طلب إغاثة — ' || r.status, jsonb_build_object('status',r.status)
  FROM public.relief_requests r
  WHERE r.full_name ILIKE '%' || query || '%' OR r.phone ILIKE '%' || query || '%'
  LIMIT 4)

  UNION ALL

  (SELECT 'content'::TEXT, c.id, c.title,
    LEFT(COALESCE(c.body,''),80), jsonb_build_object('type',c.type)
  FROM public.site_content c
  WHERE (c.title ILIKE '%' || query || '%' OR c.body ILIKE '%' || query || '%')
    AND c.is_published = TRUE
  LIMIT 3);
$$;

GRANT EXECUTE ON FUNCTION public.global_search TO authenticated, anon;
