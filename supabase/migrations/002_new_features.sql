-- ================================================
-- Migration 002: ميزات جديدة
-- ================================================

-- 1. صلاحيات المدير لرؤية جميع الملفات الشخصية
DROP POLICY IF EXISTS "profiles_self" ON public.profiles;
CREATE POLICY "profiles_self" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));
CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE USING (id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));
CREATE POLICY "profiles_admin_insert" ON public.profiles
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ) OR id = auth.uid());

-- 2. جدول طلبات الوصول (الجمعيات تطلب الاطلاع على سجلات)
CREATE TABLE IF NOT EXISTS public.access_requests (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  association_id   UUID REFERENCES public.associations(id) ON DELETE CASCADE,
  association_name TEXT,
  record_type      TEXT NOT NULL, -- 'disabled','widow','orphan','divorced','poor_family'
  reason           TEXT,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by      UUID REFERENCES auth.users(id),
  reviewed_at      TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "access_req_assoc_insert" ON public.access_requests
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "access_req_staff_all" ON public.access_requests
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','staff')
  ));

-- 3. جدول الملفات المرفوعة (storage metadata)
CREATE TABLE IF NOT EXISTS public.uploaded_files (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type  TEXT NOT NULL, -- 'association','rural_unit','beneficiary','relief'
  entity_id    TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  file_url     TEXT NOT NULL,
  file_type    TEXT,
  file_size    INT,
  uploaded_by  UUID REFERENCES auth.users(id),
  uploaded_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "files_staff_all" ON public.uploaded_files
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','staff')
  ));
CREATE POLICY "files_public_read" ON public.uploaded_files
  FOR SELECT USING (entity_type IN ('association','rural_unit'));

-- 4. إضافة حقول الصورة إلى الجمعيات والوحدات
ALTER TABLE public.associations ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.associations ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE public.rural_units  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 5. إضافة حقل المنطقة للإغاثة عند اختيار "أخرى"
ALTER TABLE public.relief_requests ADD COLUMN IF NOT EXISTS custom_district TEXT;

-- 6. إضافة حقل "أول دخول - تغيير كلمة المرور"
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- 7. إشعارات داخلية
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT,
  type        TEXT DEFAULT 'info' CHECK (type IN ('info','warning','success','error','access_request')),
  is_read     BOOLEAN DEFAULT FALSE,
  link        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_own" ON public.notifications
  FOR ALL USING (user_id = auth.uid());

-- Function: notify staff when access request arrives
CREATE OR REPLACE FUNCTION public.notify_access_request()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications(user_id, title, body, type, link)
  SELECT id, 
    'طلب وصول جديد من جمعية',
    'طلبت ' || NEW.association_name || ' الاطلاع على سجلات: ' || NEW.record_type,
    'access_request',
    '/beneficiaries'
  FROM public.profiles WHERE role IN ('admin','staff');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_access_request
  AFTER INSERT ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_access_request();
