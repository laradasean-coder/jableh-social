-- ================================================
-- دائرة جبلة للشؤون الاجتماعية والعمل
-- قاعدة البيانات الكاملة - Supabase Migration
-- ================================================

-- 1. جدول الملفات الشخصية للمستخدمين
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name  TEXT,
  role       TEXT DEFAULT 'staff' CHECK (role IN ('admin', 'staff', 'unit_head', 'association')),
  unit_id    UUID,
  phone      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول المستفيدين
CREATE TABLE IF NOT EXISTS public.beneficiaries (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name    TEXT NOT NULL,
  national_id  TEXT UNIQUE,
  phone        TEXT,
  address      TEXT,
  district     TEXT,
  gender       TEXT DEFAULT 'female' CHECK (gender IN ('male', 'female')),
  birth_date   DATE,
  category     TEXT NOT NULL CHECK (category IN ('disabled','widow','orphan','divorced','poor_family')),
  status       TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','pending')),
  notes        TEXT,
  source       TEXT DEFAULT 'manual' CHECK (source IN ('manual','relief_form')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ben_category ON public.beneficiaries(category);
CREATE INDEX IF NOT EXISTS idx_ben_status   ON public.beneficiaries(status);
CREATE INDEX IF NOT EXISTS idx_ben_district ON public.beneficiaries(district);
CREATE INDEX IF NOT EXISTS idx_ben_name     ON public.beneficiaries(full_name);

-- 3. جدول الجمعيات
CREATE TABLE IF NOT EXISTS public.associations (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name             TEXT NOT NULL,
  description      TEXT,
  address          TEXT,
  phone            TEXT,
  email            TEXT,
  president_name   TEXT,
  established_date DATE,
  services         TEXT[] DEFAULT '{}',
  user_id          UUID REFERENCES auth.users(id),
  username         TEXT UNIQUE,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ملفات الجمعيات
CREATE TABLE IF NOT EXISTS public.association_files (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  association_id UUID REFERENCES public.associations(id) ON DELETE CASCADE,
  file_name      TEXT,
  file_url       TEXT,
  file_type      TEXT,
  uploaded_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 5. وحدات التنمية الريفية
CREATE TABLE IF NOT EXISTS public.rural_units (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name             TEXT NOT NULL,
  location         TEXT,
  description      TEXT,
  employee_count   INT DEFAULT 0,
  services         TEXT[] DEFAULT '{}',
  projects         TEXT[] DEFAULT '{}',
  head_name        TEXT,
  head_user_id     UUID REFERENCES auth.users(id),
  phone            TEXT,
  established_date DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- إدراج الوحدات الخمس
INSERT INTO public.rural_units (name, location, head_name, employee_count, services, projects)
VALUES
  ('وحدة الدالية',      'قرية الدالية',    'محمد عبد الله', 8, ARRAY['التنمية الأسرية','رعاية الطفولة','دعم المرأة الريفية','التدريب المهني'], ARRAY['مشروع دعم الحرف اليدوية','برنامج الأمومة والطفولة']),
  ('وحدة بين ياشوط',   'بين ياشوط',       'سمر حسين',     6, ARRAY['الإرشاد الاجتماعي','دعم الأسرة','رعاية المسنين','تنمية الشباب'], ARRAY['مشروع تأهيل الشباب','برنامج الزراعة المجتمعية']),
  ('وحدة البودي',       'قرية البودي',     'خالد إبراهيم', 7, ARRAY['تطوير الإنتاج الزراعي','رعاية اجتماعية','محو الأمية','تأهيل المعاقين'], ARRAY['مشروع دعم المزارعين','برنامج محو الأمية للكبار']),
  ('وحدة تل حويري',    'تل حويري',        'رنا مصطفى',    5, ARRAY['تمكين المرأة الريفية','دعم الأيتام','التثقيف الصحي','الخدمات الاجتماعية'], ARRAY['مشروع تمكين المرأة','برنامج رعاية الأيتام']),
  ('وحدة بسنديانا',    'قرية بسنديانا',   'عمر الصالح',   6, ARRAY['الرعاية الاجتماعية','التدريب المهني','دعم ذوي الاحتياجات','التوعية المجتمعية'], ARRAY['مشروع التوعية الصحية','برنامج التدريب المهني للشباب'])
ON CONFLICT DO NOTHING;

-- 6. نماذج الإغاثة
CREATE TABLE IF NOT EXISTS public.relief_requests (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name               TEXT NOT NULL,
  national_id             TEXT,
  phone                   TEXT NOT NULL,
  address                 TEXT,
  district                TEXT,
  gender                  TEXT DEFAULT 'female',
  birth_date              DATE,
  family_size             INT,
  category                TEXT,
  monthly_income          NUMERIC,
  has_disability          BOOLEAN DEFAULT FALSE,
  situation_description   TEXT,
  status                  TEXT DEFAULT 'pending'
                            CHECK (status IN ('pending','reviewed','transferred','rejected')),
  transferred_to          UUID REFERENCES public.beneficiaries(id),
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- Row Level Security
-- ================================================

ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiaries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.associations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rural_units    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relief_requests ENABLE ROW LEVEL SECURITY;

-- Profiles: كل مستخدم يرى ملفه
CREATE POLICY "profiles_self" ON public.profiles
  FOR ALL USING (id = auth.uid());

-- Beneficiaries: الموظفون والمديرون فقط
CREATE POLICY "beneficiaries_staff" ON public.beneficiaries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- Associations: الجمعية ترى بياناتها فقط
CREATE POLICY "associations_own" ON public.associations
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "associations_public_read" ON public.associations
  FOR SELECT USING (is_active = TRUE);

-- Rural Units: رئيس الوحدة يعدّل وحدته فقط
CREATE POLICY "rural_units_head_update" ON public.rural_units
  FOR UPDATE USING (head_user_id = auth.uid());

CREATE POLICY "rural_units_public_read" ON public.rural_units
  FOR SELECT USING (TRUE);

-- Relief: أي شخص يقدّم طلب، الموظفون يرون الكل
CREATE POLICY "relief_insert_public" ON public.relief_requests
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "relief_staff_read" ON public.relief_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- ================================================
-- Function: auto-update updated_at
-- ================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_beneficiaries_updated_at
  BEFORE UPDATE ON public.beneficiaries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_rural_units_updated_at
  BEFORE UPDATE ON public.rural_units
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ================================================
-- Audit Logs Table (for sجل العمليات page)
-- ================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor      TEXT,
  action     TEXT CHECK (action IN ('create','update','delete','login','logout','approve','reject','transfer')),
  entity     TEXT,
  detail     TEXT,
  ip         TEXT,
  user_id    UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_admin_only" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Function to auto-log beneficiary changes
CREATE OR REPLACE FUNCTION public.log_beneficiary_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs(action, entity, detail)
    VALUES('create','مستفيد', 'تسجيل: ' || NEW.full_name || ' — ' || NEW.category);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs(action, entity, detail)
    VALUES('update','مستفيد','تحديث بيانات: ' || NEW.full_name);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs(action, entity, detail)
    VALUES('delete','مستفيد','حذف سجل: ' || OLD.full_name);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_beneficiaries
  AFTER INSERT OR UPDATE OR DELETE ON public.beneficiaries
  FOR EACH ROW EXECUTE FUNCTION public.log_beneficiary_change();

-- Function to auto-log relief request changes
CREATE OR REPLACE FUNCTION public.log_relief_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs(action, entity, detail)
    VALUES('create','طلب إغاثة','طلب جديد: ' || NEW.full_name);
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO public.audit_logs(action, entity, detail)
    VALUES(
      CASE NEW.status WHEN 'transferred' THEN 'transfer' WHEN 'rejected' THEN 'reject' ELSE 'update' END,
      'طلب إغاثة',
      'تغيير حالة طلب ' || NEW.full_name || ': ' || OLD.status || ' → ' || NEW.status
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_relief
  AFTER INSERT OR UPDATE ON public.relief_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_relief_change();
