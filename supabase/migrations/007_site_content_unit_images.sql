-- ================================================
-- Migration 007: محتوى الموقع + صور الوحدات
-- ================================================

-- 1. جدول محتوى الموقع (أخبار + إعلانات + نشاطات)
CREATE TABLE IF NOT EXISTS public.site_content (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type         TEXT NOT NULL CHECK (type IN ('news','activity','announcement')),
  title        TEXT NOT NULL,
  body         TEXT,
  image_url    TEXT,
  is_published BOOLEAN DEFAULT TRUE,
  author_id    UUID REFERENCES auth.users(id),
  author_name  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_content_type ON public.site_content(type);
CREATE INDEX IF NOT EXISTS idx_site_content_published ON public.site_content(is_published, created_at DESC);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- الكل يقرأ المحتوى المنشور
CREATE POLICY "site_content_read" ON public.site_content
  FOR SELECT USING (is_published = TRUE OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','staff')));

-- المدير والموظف فقط يضيفون/يعدّلون
CREATE POLICY "site_content_write" ON public.site_content
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','staff'))
  );

-- 2. جدول صور الوحدات الريفية
CREATE TABLE IF NOT EXISTS public.unit_images (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_name  TEXT NOT NULL,
  image_url  TEXT NOT NULL,
  caption    TEXT,
  is_cover   BOOLEAN DEFAULT FALSE,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unit_images_name ON public.unit_images(unit_name);

ALTER TABLE public.unit_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "unit_images_read" ON public.unit_images FOR SELECT USING (TRUE);

CREATE POLICY "unit_images_write" ON public.unit_images
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','staff','unit_head'))
  );

-- 3. Supabase Storage bucket للصور
-- شغّل هذا يدوياً من Supabase Dashboard > Storage:
-- أنشئ bucket اسمه "uploads" واجعله Public

-- 4. إضافة بيانات أولية للأخبار
INSERT INTO public.site_content (type, title, body, is_published) VALUES
  ('news', 'إطلاق المنصة الرقمية لدائرة جبلة', 'أعلنت دائرة جبلة للشؤون الاجتماعية عن إطلاق منصتها الرقمية المتكاملة التي تتيح للمواطنين الوصول لجميع الخدمات بيسر وسهولة.', TRUE),
  ('activity', 'ورشة تدريبية لرفع كفاءة العمل الاجتماعي', 'نظّمت الدائرة ورشة عمل تدريبية شاملة لموظفيها تناولت أحدث أساليب العمل الاجتماعي وتوظيف التقنية في الخدمات.', TRUE),
  ('announcement', 'انتهاء أوقات الدوام الرسمي خلال الأعياد', 'تُعلم الدائرة المراجعين الكرام بأن أوقات العمل الرسمية ستكون من 9 صباحاً حتى 1 ظهراً خلال فترة الأعياد الرسمية.', TRUE),
  ('news', 'توسيع خدمات وحدة بسنديانا الريفية', 'ضمن خطة التطوير الشاملة، تعمل وحدة بسنديانا على توسيع نطاق خدماتها لتشمل مناطق جديدة وفئات مستفيدة إضافية.', TRUE),
  ('activity', 'زيارة ميدانية لمتابعة مشاريع الدالية', 'قام فريق متخصص من الدائرة بزيارة ميدانية لوحدة الدالية للاطلاع على سير المشاريع التنموية الجارية ومتابعة تقدمها.', TRUE)
ON CONFLICT DO NOTHING;

-- 5. Trigger لتحديث updated_at في site_content
CREATE TRIGGER trg_site_content_updated_at
  BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
