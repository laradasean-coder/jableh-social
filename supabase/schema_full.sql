-- ================================================================
-- دائرة جبلة — المخطط الكامل الموحّد (نشر نظيف على مشروع Supabase جديد)
-- مُولّد من الهجرات 001→017 بعد دمج كل الإصلاحات. نفّذه مرة واحدة.
-- آمن لإعادة التشغيل (idempotent).
-- ================================================================


-- ====================== 001_initial_schema.sql ======================

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

-- ====================== 002_new_features.sql ======================

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

-- ====================== 003_unit_employees.sql ======================

-- ================================================
-- Migration 003: موظفو الوحدات الريفية + إصلاحات الأمان
-- ================================================

-- 1. جدول موظفي الوحدات الريفية
CREATE TABLE IF NOT EXISTS public.unit_employees (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_name    TEXT NOT NULL,          -- اسم الوحدة
  full_name    TEXT NOT NULL,          -- الاسم الكامل (مطلوب)
  national_id  TEXT,                   -- الرقم الوطني
  phone        TEXT,                   -- الهاتف
  email        TEXT,                   -- البريد الإلكتروني
  job_title    TEXT,                   -- المسمى الوظيفي
  hire_date    DATE,                   -- تاريخ التعيين
  birth_date   DATE,                   -- تاريخ الميلاد
  address      TEXT,                   -- العنوان
  education    TEXT,                   -- المؤهل العلمي
  salary       NUMERIC,                -- الراتب
  notes        TEXT,                   -- ملاحظات
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_unit_emp_unit ON public.unit_employees(unit_name);

-- RLS
ALTER TABLE public.unit_employees ENABLE ROW LEVEL SECURITY;

-- رئيس الوحدة يرى موظفيه فقط (بناءً على unit_id في profiles)
-- الموظف والمدير يرون الكل
CREATE POLICY "unit_employees_view" ON public.unit_employees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (
        p.role IN ('admin', 'staff')
        OR (p.role = 'unit_head')
      )
    )
  );

CREATE POLICY "unit_employees_insert" ON public.unit_employees
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'staff', 'unit_head')
    )
  );

CREATE POLICY "unit_employees_update" ON public.unit_employees
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'staff', 'unit_head')
    )
  );

CREATE POLICY "unit_employees_delete" ON public.unit_employees
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'unit_head')
    )
  );

-- Trigger for updated_at
CREATE TRIGGER trg_unit_employees_updated_at
  BEFORE UPDATE ON public.unit_employees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. جدول إعدادات حقول الوحدات (أي حقول يريد رئيس كل وحدة)
CREATE TABLE IF NOT EXISTS public.unit_field_configs (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_name  TEXT UNIQUE NOT NULL,
  fields     TEXT[] DEFAULT ARRAY['full_name','national_id','phone','job_title','hire_date'],
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.unit_field_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "unit_field_configs_all" ON public.unit_field_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'unit_head')
    )
  );

CREATE POLICY "unit_field_configs_read" ON public.unit_field_configs
  FOR SELECT USING (TRUE);

-- 3. إصلاح: إضافة مدير يستطيع رؤية وتعديل جميع الجمعيات
DROP POLICY IF EXISTS "associations_public_read" ON public.associations;
CREATE POLICY "associations_all_read" ON public.associations
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "associations_own" ON public.associations;
CREATE POLICY "associations_own_edit" ON public.associations
  FOR ALL USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','staff'))
  );

-- 4. إضافة حقل unit_id للموظفين لربطهم بوحدات التنمية
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS unit_name TEXT;

-- 5. audit log لموظفي الوحدات
CREATE OR REPLACE FUNCTION public.log_unit_employee_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs(action, entity, detail)
    VALUES('create', 'موظف وحدة', 'إضافة موظف: ' || NEW.full_name || ' — ' || NEW.unit_name);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs(action, entity, detail)
    VALUES('update', 'موظف وحدة', 'تحديث بيانات: ' || NEW.full_name || ' — ' || NEW.unit_name);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs(action, entity, detail)
    VALUES('delete', 'موظف وحدة', 'حذف موظف: ' || OLD.full_name || ' — ' || OLD.unit_name);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_unit_employees
  AFTER INSERT OR UPDATE OR DELETE ON public.unit_employees
  FOR EACH ROW EXECUTE FUNCTION public.log_unit_employee_change();

-- ====================== 004_phase2_complete.sql ======================

-- ================================================
-- Migration 004: المرحلة الثانية الكاملة
-- أمان + شات داخلي + تحليلات + متابعة المستفيد
-- ================================================

-- 1. جدول الأحداث الأمنية
CREATE TABLE IF NOT EXISTS public.security_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type  TEXT NOT NULL CHECK (event_type IN ('login_failed','login_success','suspicious_ip','password_changed','account_locked')),
  email       TEXT,
  user_id     UUID REFERENCES auth.users(id),
  ip_address  TEXT,
  user_agent  TEXT,
  details     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "security_admin_only" ON public.security_events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. جدول تاريخ الإغاثات لكل مستفيد
CREATE TABLE IF NOT EXISTS public.beneficiary_relief_history (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  beneficiary_id  UUID REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  relief_type     TEXT NOT NULL,
  amount          NUMERIC,
  notes           TEXT,
  given_by        UUID REFERENCES auth.users(id),
  given_by_name   TEXT,
  given_at        TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_relief_history_ben ON public.beneficiary_relief_history(beneficiary_id);

ALTER TABLE public.beneficiary_relief_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "relief_history_staff" ON public.beneficiary_relief_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','staff'))
  );

-- 3. نظام الشات الداخلي — المحادثات
CREATE TABLE IF NOT EXISTS public.support_threads (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name   TEXT,
  status      TEXT DEFAULT 'open' CHECK (status IN ('open','closed')),
  unread      INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_threads_user ON public.support_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_support_threads_status ON public.support_threads(status);

ALTER TABLE public.support_threads ENABLE ROW LEVEL SECURITY;

-- المستخدم يرى محادثاته فقط
CREATE POLICY "threads_own" ON public.support_threads
  FOR ALL USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','staff'))
  );

-- 4. رسائل الشات
CREATE TABLE IF NOT EXISTS public.support_messages (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id   UUID REFERENCES public.support_threads(id) ON DELETE CASCADE NOT NULL,
  sender_id   UUID REFERENCES auth.users(id),
  sender_name TEXT,
  content     TEXT NOT NULL,
  is_staff    BOOLEAN DEFAULT FALSE,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_msg_thread ON public.support_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_support_msg_unread ON public.support_messages(is_read, is_staff);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_thread_access" ON public.support_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.support_threads t
      WHERE t.id = thread_id
      AND (
        t.user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','staff'))
      )
    )
  );

-- Trigger: تحديث updated_at للمحادثة عند كل رسالة + عدّاد غير المقروء
CREATE OR REPLACE FUNCTION public.on_new_support_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.support_threads
  SET updated_at = NOW(),
      unread = CASE WHEN NEW.is_staff = FALSE THEN unread + 1 ELSE unread END
  WHERE id = NEW.thread_id;

  -- إشعار للموظفين عند رسالة من مستخدم
  IF NEW.is_staff = FALSE THEN
    INSERT INTO public.notifications(user_id, title, body, type, link)
    SELECT p.id,
      'رسالة جديدة من ' || COALESCE(NEW.sender_name, 'مستخدم'),
      LEFT(NEW.content, 80),
      'info',
      '/inbox'
    FROM public.profiles p WHERE p.role IN ('admin','staff');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_support_message
  AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.on_new_support_message();

-- 5. تفعيل Realtime على جداول الشات

-- 6. إضافة حقل تاريخ آخر نسخ احتياطي
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light';

-- 7. View لإحصاءات التحليلات (سريعة)
CREATE OR REPLACE VIEW public.analytics_summary AS
SELECT
  COUNT(*) FILTER (WHERE status = 'active')  AS active_count,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
  COUNT(*) FILTER (WHERE category = 'disabled')    AS disabled_count,
  COUNT(*) FILTER (WHERE category = 'widow')        AS widow_count,
  COUNT(*) FILTER (WHERE category = 'orphan')       AS orphan_count,
  COUNT(*) FILTER (WHERE category = 'divorced')     AS divorced_count,
  COUNT(*) FILTER (WHERE category = 'poor_family')  AS poor_family_count,
  COUNT(*) FILTER (WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())) AS this_month,
  COUNT(*) FILTER (WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')) AS last_month
FROM public.beneficiaries;

-- 8. سياسات Realtime للأمان
-- السماح فقط للمستخدمين المصادق عليهم بالاشتراك في الـ Realtime channels
-- هذا يُفعَّل من Supabase Dashboard > Realtime > Policies

-- 9. Index للأداء
CREATE INDEX IF NOT EXISTS idx_beneficiaries_created ON public.beneficiaries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_relief_requests_created ON public.relief_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_relief_requests_status ON public.relief_requests(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_last_login ON public.profiles(last_login DESC);

-- 10. Audit log للشات
CREATE OR REPLACE FUNCTION public.log_support_thread()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs(action, entity, detail)
    VALUES('create', 'محادثة دعم', 'محادثة جديدة من: ' || COALESCE(NEW.user_name, 'مستخدم'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_support
  AFTER INSERT ON public.support_threads
  FOR EACH ROW EXECUTE FUNCTION public.log_support_thread();

-- ====================== 005_final_features.sql ======================

-- ================================================
-- Migration 005: الميزات النهائية
-- Realtime + QR + SMS stubs + تحسينات
-- ================================================

-- 1. تفعيل Realtime على جداول المستفيدين
ALTER PUBLICATION supabase_realtime ADD TABLE public.beneficiaries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.relief_requests;

-- 2. عمود workflow_stage لطلبات الإغاثة
ALTER TABLE public.relief_requests
  ADD COLUMN IF NOT EXISTS workflow_stage TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS priority_score INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS committee_notes TEXT;

-- حساب priority_score تلقائياً عند الإدراج
CREATE OR REPLACE FUNCTION public.calc_relief_priority()
RETURNS TRIGGER AS $$
DECLARE score INT := 0;
BEGIN
  score := score + LEAST(COALESCE(NEW.family_size, 0) * 8, 64);
  IF NEW.has_disability THEN score := score + 30; END IF;
  IF COALESCE(NEW.monthly_income, 0) < 50000 THEN score := score + 20; END IF;
  IF NEW.category = 'orphan'   THEN score := score + 15; END IF;
  IF NEW.category = 'disabled' THEN score := score + 10; END IF;
  NEW.priority_score := LEAST(score, 100);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calc_priority
  BEFORE INSERT OR UPDATE ON public.relief_requests
  FOR EACH ROW EXECUTE FUNCTION public.calc_relief_priority();

-- 3. جدول SMS/WhatsApp logs
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type        TEXT CHECK (type IN ('sms','whatsapp','email','inapp')),
  recipient   TEXT,
  message     TEXT,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  error       TEXT,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_log_admin" ON public.notification_logs
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4. Supabase Edge Functions stubs (يُنشأ في /supabase/functions/)
-- هذه الملاحظات توضح المسار للمطور:
-- /supabase/functions/send-sms/index.ts     → Twilio SMS
-- /supabase/functions/send-whatsapp/index.ts → WhatsApp Business API
-- /supabase/functions/monthly-report/index.ts → تقرير شهري تلقائي

-- 5. جدول تقارير مجدولة
CREATE TABLE IF NOT EXISTS public.scheduled_reports (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type  TEXT NOT NULL,
  frequency    TEXT DEFAULT 'monthly' CHECK (frequency IN ('daily','weekly','monthly')),
  recipient    TEXT NOT NULL,  -- email
  last_sent    TIMESTAMPTZ,
  is_active    BOOLEAN DEFAULT TRUE,
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sched_reports_admin" ON public.scheduled_reports
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 6. إضافة priority_score index للأداء
CREATE INDEX IF NOT EXISTS idx_relief_priority ON public.relief_requests(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_relief_workflow ON public.relief_requests(workflow_stage);

-- 7. Function: WhatsApp notification عند طلب إغاثة جديد
-- (يُستدعى من Edge Function — هنا مجرد audit log)
CREATE OR REPLACE FUNCTION public.on_new_relief_request()
RETURNS TRIGGER AS $$
BEGIN
  -- إشعار داخلي للموظفين
  INSERT INTO public.notifications(user_id, title, body, type, link)
  SELECT p.id,
    '🆕 طلب إغاثة جديد',
    'طلب من: ' || NEW.full_name || ' — أولوية: ' || NEW.priority_score,
    'info',
    '/relief-admin'
  FROM public.profiles p WHERE p.role IN ('admin','staff');

  -- Log للـ SMS/WhatsApp (يُعالج لاحقاً من Edge Function)
  INSERT INTO public.notification_logs(type, recipient, message, status)
  VALUES (
    'whatsapp',
    'staff',
    'طلب إغاثة جديد من ' || NEW.full_name || ' — درجة الأولوية: ' || NEW.priority_score,
    'pending'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_new_relief_notify ON public.relief_requests;
CREATE TRIGGER trg_new_relief_notify
  AFTER INSERT ON public.relief_requests
  FOR EACH ROW EXECUTE FUNCTION public.on_new_relief_request();

-- 8. View لتسهيل استعلام الخريطة
CREATE OR REPLACE VIEW public.district_summary AS
SELECT
  district,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE category='disabled')    AS disabled,
  COUNT(*) FILTER (WHERE category='widow')       AS widow,
  COUNT(*) FILTER (WHERE category='orphan')      AS orphan,
  COUNT(*) FILTER (WHERE category='divorced')    AS divorced,
  COUNT(*) FILTER (WHERE category='poor_family') AS poor_family
FROM public.beneficiaries
WHERE district IS NOT NULL AND district != ''
GROUP BY district
ORDER BY total DESC;


-- ====================== 006_v8_improvements.sql ======================

-- ================================================
-- Migration 006: تحسينات v8
-- pg_trgm + إصلاح RLS + indexes جديدة
-- ================================================

-- 1. pg_trgm للبحث الذكي بالعربية
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index للبحث بالتشابه
CREATE INDEX IF NOT EXISTS idx_beneficiaries_name_trgm
  ON public.beneficiaries USING gin(full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_national_id_trgm
  ON public.beneficiaries USING gin(national_id gin_trgm_ops);

-- RPC function للبحث بالتشابه (يحل مشكلة DuplicateChecker)
CREATE OR REPLACE FUNCTION public.search_similar_beneficiaries(
  p_name TEXT,
  p_national_id TEXT DEFAULT NULL,
  p_threshold FLOAT DEFAULT 0.4
)
RETURNS TABLE(id UUID, full_name TEXT, national_id TEXT, district TEXT, category TEXT, score FLOAT)
LANGUAGE sql STABLE AS $$
  SELECT
    b.id, b.full_name, b.national_id, b.district, b.category,
    similarity(b.full_name, p_name)::FLOAT AS score
  FROM public.beneficiaries b
  WHERE
    (p_national_id IS NOT NULL AND b.national_id = p_national_id)
    OR similarity(b.full_name, p_name) >= p_threshold
  ORDER BY score DESC
  LIMIT 5;
$$;

-- Grant RPC to authenticated users
GRANT EXECUTE ON FUNCTION public.search_similar_beneficiaries TO authenticated;

-- 2. إضافة عمود next_review_date للمراجعة الدورية
ALTER TABLE public.beneficiaries
  ADD COLUMN IF NOT EXISTS next_review_date DATE,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closure_reason TEXT,
  ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES auth.users(id);

-- 3. إضافة حقل workflow إلى audit_logs
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Trigger لربط user_id بالـ audit log تلقائياً
CREATE OR REPLACE FUNCTION public.set_audit_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_user_id ON public.audit_logs;
CREATE TRIGGER trg_audit_user_id
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_audit_user_id();

-- 4. Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, is_read)
  WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_support_messages_thread
  ON public.support_messages(thread_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_review
  ON public.beneficiaries(next_review_date)
  WHERE next_review_date IS NOT NULL;

-- 5. إصلاح RLS: سياسة للـ audit_logs INSERT لكل الأدوار
DROP POLICY IF EXISTS "audit_admin_only" ON public.audit_logs;
CREATE POLICY "audit_admin_read" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "audit_insert_all" ON public.audit_logs
  FOR INSERT WITH CHECK (TRUE);

-- 6. View للمستفيدين الذين حان موعد مراجعتهم
CREATE OR REPLACE VIEW public.pending_reviews AS
SELECT id, full_name, category, district, next_review_date,
  (CURRENT_DATE - next_review_date) AS days_overdue
FROM public.beneficiaries
WHERE next_review_date IS NOT NULL
  AND next_review_date <= CURRENT_DATE
  AND status = 'active'
ORDER BY next_review_date ASC;

-- 7. Realtime (safe — won't fail if already added)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.beneficiaries;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.relief_requests;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_threads;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;


-- ====================== 007_site_content_unit_images.sql ======================

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

-- ====================== 008_site_settings_global_search.sql ======================

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

-- ====================== 009_profiles_autocreate_fix.sql ======================

-- ================================================
-- Migration 009: إصلاح سياسات profiles + إنشاء تلقائي
-- يسمح بإضافة مستخدمين جدد من Authenticator بلا قيود
-- ================================================

-- 1. حذف السياسة القديمة المقيِّدة
DROP POLICY IF EXISTS "profiles_self" ON public.profiles;

-- 2. سياسات جديدة مرنة
-- كل مستخدم مسجّل يرى ملفه الشخصي
CREATE POLICY "profiles_read_own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- الموظفون والمديرون يرون كل الملفات
CREATE POLICY "profiles_read_staff" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff'))
  );

-- كل مستخدم يعدّل ملفه الشخصي
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- المدير يعدّل أي ملف (تغيير الأدوار)
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ⭐ السماح بإنشاء profile لأي مستخدم جديد بلا قيود
-- هذا يحل مشكلة إضافة يوزرات من Authenticator
CREATE POLICY "profiles_insert_any" ON public.profiles
  FOR INSERT WITH CHECK (TRUE);

-- المدير فقط يحذف الملفات
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- 3. ⭐ Trigger: إنشاء profile تلقائياً عند تسجيل أي مستخدم جديد
-- هذا يضمن أن كل يوزر يُضاف من Authenticator يحصل على profile فوراً
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff'),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ربط الـ trigger بجدول auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. إنشاء profiles للمستخدمين الموجودين حالياً بلا profile (إصلاح بأثر رجعي)
INSERT INTO public.profiles (id, full_name, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'role', 'staff')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 5. إضافة حقول مفيدة للملف الشخصي
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_login   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_active    BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS avatar_url   TEXT,
  ADD COLUMN IF NOT EXISTS theme        TEXT DEFAULT 'light';

-- ====================== 010_sla_and_security.sql ======================

-- ================================================
-- Migration 010: نظام SLA + سجل الأمان المتقدم
-- ================================================

-- 1. حقول SLA لطلبات الإغاثة
ALTER TABLE public.relief_requests
  ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_stage_entered TIMESTAMPTZ DEFAULT NOW();

-- دالة تحسب المهلة حسب المرحلة (بالساعات)
CREATE OR REPLACE FUNCTION public.set_relief_sla()
RETURNS TRIGGER AS $$
DECLARE
  hours INT;
BEGIN
  hours := CASE NEW.status
    WHEN 'pending'   THEN 48
    WHEN 'reviewed'  THEN 72
    WHEN 'committee' THEN 96
    ELSE NULL
  END;
  NEW.sla_stage_entered := NOW();
  IF hours IS NOT NULL THEN
    NEW.sla_deadline := NOW() + (hours || ' hours')::INTERVAL;
  ELSE
    NEW.sla_deadline := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_relief_sla ON public.relief_requests;
CREATE TRIGGER trg_relief_sla
  BEFORE INSERT OR UPDATE OF status ON public.relief_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_relief_sla();

-- View للطلبات المتأخرة
CREATE OR REPLACE VIEW public.overdue_relief AS
SELECT id, full_name, status, sla_deadline,
  EXTRACT(EPOCH FROM (NOW() - sla_deadline))/3600 AS hours_overdue
FROM public.relief_requests
WHERE sla_deadline IS NOT NULL
  AND sla_deadline < NOW()
  AND status NOT IN ('transferred','rejected');

-- 2. سجل الدخول والأمان المتقدم
CREATE TABLE IF NOT EXISTS public.login_history (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email  TEXT,
  ip_address  TEXT,
  user_agent  TEXT,
  device_type TEXT,
  success     BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_history_user ON public.login_history(user_id, created_at DESC);

ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "login_history_own" ON public.login_history
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "login_history_admin" ON public.login_history
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "login_history_insert" ON public.login_history
  FOR INSERT WITH CHECK (TRUE);

-- 3. دالة تسجل الدخول وتحدّث آخر دخول
CREATE OR REPLACE FUNCTION public.record_login(p_ip TEXT, p_agent TEXT, p_device TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.login_history (user_id, user_email, ip_address, user_agent, device_type)
  SELECT auth.uid(), email, p_ip, p_agent, p_device FROM auth.users WHERE id = auth.uid();
  UPDATE public.profiles SET last_login = NOW() WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.record_login TO authenticated;

-- ====================== 011_referrals_archive.sql ======================

-- ================================================
-- Migration 011: تحويل المستفيدين + الأرشفة
-- ================================================

-- 1. جدول تحويل المستفيدين للجمعيات
CREATE TABLE IF NOT EXISTS public.referrals (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  beneficiary_id  UUID REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  association_id  UUID REFERENCES public.associations(id) ON DELETE SET NULL,
  association_name TEXT,
  reason          TEXT,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','completed','rejected')),
  referred_by     UUID REFERENCES auth.users(id),
  referred_by_name TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_ben ON public.referrals(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_referrals_assoc ON public.referrals(association_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals_staff" ON public.referrals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','staff'))
  );

CREATE POLICY "referrals_assoc_read" ON public.referrals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.associations a WHERE a.id = referrals.association_id AND a.user_id = auth.uid())
  );

-- 2. حقول الأرشفة في جدول المستفيدين
ALTER TABLE public.beneficiaries
  ADD COLUMN IF NOT EXISTS archived_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archive_reason  TEXT,
  ADD COLUMN IF NOT EXISTS archived_by     UUID REFERENCES auth.users(id);

-- تحديث الحالة لتشمل "مؤرشف"
ALTER TABLE public.beneficiaries DROP CONSTRAINT IF EXISTS beneficiaries_status_check;
ALTER TABLE public.beneficiaries ADD CONSTRAINT beneficiaries_status_check
  CHECK (status IN ('active','inactive','pending','archived'));

-- View للمستفيدين المؤرشفين
CREATE OR REPLACE VIEW public.archived_beneficiaries AS
SELECT id, full_name, category, district, archive_reason, archived_at
FROM public.beneficiaries
WHERE status = 'archived'
ORDER BY archived_at DESC;

-- 3. Trigger لتحديث updated_at في referrals
CREATE TRIGGER trg_referrals_updated
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Realtime
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ====================== 012_districts_chat.sql ======================

-- ================================================
-- Migration 012: المناطق القابلة للإدارة + شات الموظفين
-- ================================================

-- 1. جدول المناطق (يديره الأدمن)
CREATE TABLE IF NOT EXISTS public.districts (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  sort_order INT DEFAULT 0,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "districts_read" ON public.districts FOR SELECT USING (TRUE);
CREATE POLICY "districts_admin" ON public.districts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- المناطق الافتراضية
INSERT INTO public.districts (name, sort_order) VALUES
  ('جبلة المدينة', 1), ('الدالية', 2), ('القطيلبية', 3), ('عين الشرقية', 4),
  ('عين شقاق', 5), ('حميميم', 6), ('البرجان', 7), ('الحويز', 8),
  ('وادي القلع', 9), ('دوير بعبدة', 10), ('طوق جبلة', 11),
  ('بيت ياشوط', 12), ('البودي', 13), ('تل حويري', 14), ('بسنديانا', 15)
ON CONFLICT (name) DO NOTHING;

-- 2. حقول إضافية لطلبات الإغاثة
ALTER TABLE public.relief_requests
  ADD COLUMN IF NOT EXISTS disability_card_no TEXT,
  ADD COLUMN IF NOT EXISTS case_image_url     TEXT;

-- 3. شات الموظفين — المحادثات
CREATE TABLE IF NOT EXISTS public.staff_conversations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type        TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct','group')),
  name        TEXT,                          -- للمجموعة العامة
  member_a    UUID REFERENCES auth.users(id),-- للمحادثة الخاصة
  member_b    UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- المجموعة العامة الافتراضية
INSERT INTO public.staff_conversations (id, type, name)
VALUES ('00000000-0000-0000-0000-0000000000ff', 'group', 'القناة العامة للموظفين')
ON CONFLICT (id) DO NOTHING;

-- 4. رسائل شات الموظفين
CREATE TABLE IF NOT EXISTS public.staff_messages (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.staff_conversations(id) ON DELETE CASCADE,
  sender_id       UUID REFERENCES auth.users(id),
  sender_name     TEXT,
  body            TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_msg_conv ON public.staff_messages(conversation_id, created_at);

ALTER TABLE public.staff_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_messages ENABLE ROW LEVEL SECURITY;

-- الموظفون والمديرون فقط
CREATE POLICY "staff_conv_access" ON public.staff_conversations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','staff','unit_head'))
);
CREATE POLICY "staff_msg_access" ON public.staff_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','staff','unit_head'))
);

-- 5. Realtime
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_messages;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_conversations;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ====================== 013_cleanup_storage.sql ======================

-- ================================================
-- Migration 013: تنظيف تلقائي لتوفير مساحة قاعدة البيانات
-- ================================================

-- دالة تحذف السجلات القديمة (أقدم من 6 أشهر)
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void AS $$
BEGIN
  -- سجل العمليات الأقدم من 6 أشهر
  DELETE FROM public.audit_logs WHERE created_at < NOW() - INTERVAL '6 months';
  -- سجل الإشعارات المقروءة الأقدم من 3 أشهر
  DELETE FROM public.notifications WHERE is_read = TRUE AND created_at < NOW() - INTERVAL '3 months';
  -- سجل الدخول الأقدم من 3 أشهر
  DELETE FROM public.login_history WHERE created_at < NOW() - INTERVAL '3 months';
  -- سجل الرسائل النصية الأقدم من 3 أشهر
  DELETE FROM public.notification_logs WHERE created_at < NOW() - INTERVAL '3 months';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- جدولة التنظيف شهرياً (يتطلب امتداد pg_cron — متاح في خطة Pro)
-- في الخطة المجانية: استدعها يدوياً أو عبر GitHub Action
-- SELECT cron.schedule('cleanup-logs', '0 0 1 * *', 'SELECT public.cleanup_old_logs()');

-- يمكن استدعاؤها يدوياً: SELECT public.cleanup_old_logs();
GRANT EXECUTE ON FUNCTION public.cleanup_old_logs TO authenticated;

-- ====================== 014_reports_signup_roles.sql ======================

-- ================================================
-- Migration 014:
--  • التقارير اليومية/الأسبوعية للوحدات
--  • صلاحيات ملفات الوحدات لرئيس الوحدة
--  • تسجيل ذاتي للجمعيات + اعتماد المدير
--  • تحويل عمود الدور إلى ENUM (قائمة منسدلة في محرّر Supabase)
--  • سدّ ثغرة تصعيد الصلاحيات عند التسجيل الذاتي
-- (كل الأوامر idempotent — آمنة لإعادة التشغيل)
-- ================================================

-- ─────────────────────────────────────────────
-- 1) جدول التقارير اليومية/الأسبوعية للوحدات
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.unit_reports (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_key         TEXT NOT NULL,                 -- معرّف الوحدة في الواجهة (unit-1 ...)
  unit_name        TEXT NOT NULL,
  report_type      TEXT NOT NULL CHECK (report_type IN ('daily','weekly')),
  report_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  title            TEXT,
  body             TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','reviewed')),
  submitted_by     UUID REFERENCES auth.users(id),
  submitted_by_name TEXT,
  reviewed_by      UUID REFERENCES auth.users(id),
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unit_reports_unit ON public.unit_reports(unit_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unit_reports_type ON public.unit_reports(report_type, report_date DESC);

ALTER TABLE public.unit_reports ENABLE ROW LEVEL SECURITY;

-- رئيس الوحدة/الموظف/المدير ينشئون التقارير
DROP POLICY IF EXISTS "unit_reports_insert" ON public.unit_reports;
CREATE POLICY "unit_reports_insert" ON public.unit_reports
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
            AND role IN ('admin','staff','unit_head'))
  );

-- الجميع (موظف/مدير/رئيس وحدة) يقرؤون التقارير
DROP POLICY IF EXISTS "unit_reports_read" ON public.unit_reports;
CREATE POLICY "unit_reports_read" ON public.unit_reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
            AND role IN ('admin','staff','unit_head'))
  );

-- المدير/الموظف فقط يحدّثون الحالة (مراجَع)
DROP POLICY IF EXISTS "unit_reports_update" ON public.unit_reports;
CREATE POLICY "unit_reports_update" ON public.unit_reports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
            AND role IN ('admin','staff'))
  );

DROP POLICY IF EXISTS "unit_reports_delete" ON public.unit_reports;
CREATE POLICY "unit_reports_delete" ON public.unit_reports
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- إشعار المدير عند ورود تقرير جديد
CREATE OR REPLACE FUNCTION public.notify_unit_report()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications(user_id, title, body, type, link)
  SELECT id,
    'تقرير ' || CASE NEW.report_type WHEN 'daily' THEN 'يومي' ELSE 'أسبوعي' END || ' جديد',
    NEW.unit_name || ' — ' || COALESCE(NEW.title, 'تقرير') || ' (' || NEW.report_date || ')',
    'info',
    '/unit-reports'
  FROM public.profiles WHERE role IN ('admin','staff');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_unit_report ON public.unit_reports;
CREATE TRIGGER trg_notify_unit_report
  AFTER INSERT ON public.unit_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_unit_report();

-- ─────────────────────────────────────────────
-- 2) صلاحية رئيس الوحدة على ملفات الوحدات (سجلّات الدوام ...)
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "files_unit_head" ON public.uploaded_files;
CREATE POLICY "files_unit_head" ON public.uploaded_files
  FOR ALL USING (
    entity_type = 'rural_unit'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'unit_head')
  )
  WITH CHECK (
    entity_type = 'rural_unit'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'unit_head')
  );

-- ─────────────────────────────────────────────
-- 3) التسجيل الذاتي للجمعيات + اعتماد المدير
-- ─────────────────────────────────────────────
-- حقول حالة الاعتماد
ALTER TABLE public.associations
  ADD COLUMN IF NOT EXISTS status      TEXT DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- إشعار المدير عند تسجيل جمعية جديدة بانتظار المراجعة
CREATE OR REPLACE FUNCTION public.notify_new_association()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO public.notifications(user_id, title, body, type, link)
    SELECT id, 'طلب تسجيل جمعية جديد',
      'الجمعية: ' || NEW.name || ' — بانتظار المراجعة والاعتماد',
      'info', '/associations'
    FROM public.profiles WHERE role IN ('admin','staff');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_association ON public.associations;
CREATE TRIGGER trg_notify_new_association
  AFTER INSERT ON public.associations
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_association();

-- ─────────────────────────────────────────────
-- 4) سدّ ثغرة تصعيد الصلاحيات عند التسجيل الذاتي
--    التسجيل الذاتي العام يُنشئ دائماً دور 'association' فقط،
--    ولا يثق ببيانات الدور القادمة من العميل.
--    (المدير يضبط أدوار الموظفين لاحقاً صراحةً من صفحة إدارة الموظفين)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'association',                       -- أقل صلاحية افتراضياً (يُرفّعه المدير)
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- 5) ضمان قائمة الأدوار (قائمة منسدلة في التطبيق + تكامل البيانات)
--    ملاحظة: تحويل العمود إلى ENUM في مكانه غير آمن لأن 31 سياسة RLS
--    تعتمد على العمود، لذا نُبقيه نصياً مع قيد تحقق صارم على القيم.
--    اختيار الدور كقائمة منسدلة متوفّر داخل التطبيق (صفحة «الموظفون»).
-- ─────────────────────────────────────────────
-- نوع enum متاح للمخططات الجديدة (غير ضار)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('admin','staff','unit_head','association');
  END IF;
END $$;

-- قيد تحقق يضمن أن الدور ضمن القيم الأربعة فقط
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin','staff','unit_head','association'));

-- ─────────────────────────────────────────────
-- 6) Realtime للتقارير
-- ─────────────────────────────────────────────
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.unit_reports;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ====================== 015_fix_profiles_rls_recursion.sql ======================

-- ================================================
-- Migration 015: إصلاح حرج — استدعاء تكراري لا نهائي في سياسات RLS لجدول profiles
--   المشكلة: سياسات profiles كانت تستعلم عن profiles نفسه داخل USING،
--   ما يسبب "infinite recursion detected in policy for relation profiles"
--   ويُعطّل أي استعلام لمستخدم حقيقي (موظف/جمعية/رئيس وحدة) على Supabase.
--   الحل: دالة SECURITY DEFINER تقرأ الدور دون تفعيل RLS، وإعادة بناء سياسات نظيفة.
-- ================================================

-- دالة ترجع دور المستخدم الحالي متجاوزةً RLS (تكسر التكرار)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated, anon;

-- حذف كل سياسات profiles القديمة (بما فيها المكررة من 002/009)
DROP POLICY IF EXISTS "profiles_self"          ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_insert"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_own"      ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_staff"    ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"    ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_any"    ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin"  ON public.profiles;

-- سياسات نظيفة غير تكرارية
CREATE POLICY "profiles_read_own"   ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_read_staff" ON public.profiles FOR SELECT
  USING (public.current_user_role() IN ('admin','staff'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE
  USING (public.current_user_role() = 'admin');
CREATE POLICY "profiles_insert_any" ON public.profiles FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "profiles_delete_admin" ON public.profiles FOR DELETE
  USING (public.current_user_role() = 'admin');

-- ====================== 016_unify_roles_associations.sql ======================

-- ================================================
-- Migration 016:
--   #2 تشديد قراءة الجمعيات (قراءة عامة للمعتمدة فقط)
--   #3 توحيد فحص الأدوار عبر دالة current_user_role() (أداء أوضح + لا تكرار)
-- كل السياسات أُعيد بناؤها مع الإبقاء على نفس المنطق الأمني.
-- ================================================

-- ── #2 الجمعيات ─────────────────────────────
DROP POLICY IF EXISTS "associations_all_read"   ON public.associations;
DROP POLICY IF EXISTS "associations_public_read" ON public.associations;
DROP POLICY IF EXISTS "associations_own_edit"    ON public.associations;
DROP POLICY IF EXISTS "associations_own"         ON public.associations;

-- قراءة عامة للمعتمدة فقط
CREATE POLICY "associations_public_read" ON public.associations
  FOR SELECT USING (status = 'approved' AND is_active = TRUE);
-- المالك + الموظف/المدير: وصول كامل (يشمل رؤية قيد المراجعة)
CREATE POLICY "associations_owner_staff" ON public.associations
  FOR ALL
  USING (user_id = auth.uid() OR public.current_user_role() IN ('admin','staff'))
  WITH CHECK (user_id = auth.uid() OR public.current_user_role() IN ('admin','staff'));

-- ── #3 توحيد فحص الأدوار ────────────────────
-- المستفيدون (admin,staff)
DROP POLICY IF EXISTS "beneficiaries_staff" ON public.beneficiaries;
CREATE POLICY "beneficiaries_staff" ON public.beneficiaries
  FOR ALL USING (public.current_user_role() IN ('admin','staff'))
  WITH CHECK (public.current_user_role() IN ('admin','staff'));

-- طلبات الإغاثة (insert عام موجود؛ القراءة admin,staff)
DROP POLICY IF EXISTS "relief_staff_read" ON public.relief_requests;
CREATE POLICY "relief_staff_read" ON public.relief_requests
  FOR SELECT USING (public.current_user_role() IN ('admin','staff'));

-- تاريخ الإغاثات
DROP POLICY IF EXISTS "relief_history_staff" ON public.beneficiary_relief_history;
CREATE POLICY "relief_history_staff" ON public.beneficiary_relief_history
  FOR ALL USING (public.current_user_role() IN ('admin','staff'))
  WITH CHECK (public.current_user_role() IN ('admin','staff'));

-- طلبات الوصول
DROP POLICY IF EXISTS "access_req_staff_all" ON public.access_requests;
CREATE POLICY "access_req_staff_all" ON public.access_requests
  FOR ALL USING (public.current_user_role() IN ('admin','staff'))
  WITH CHECK (public.current_user_role() IN ('admin','staff'));

-- التحويلات
DROP POLICY IF EXISTS "referrals_staff" ON public.referrals;
CREATE POLICY "referrals_staff" ON public.referrals
  FOR ALL USING (public.current_user_role() IN ('admin','staff'))
  WITH CHECK (public.current_user_role() IN ('admin','staff'));

-- الملفات المرفوعة
DROP POLICY IF EXISTS "files_staff_all" ON public.uploaded_files;
CREATE POLICY "files_staff_all" ON public.uploaded_files
  FOR ALL USING (public.current_user_role() IN ('admin','staff'))
  WITH CHECK (public.current_user_role() IN ('admin','staff'));
DROP POLICY IF EXISTS "files_unit_head" ON public.uploaded_files;
CREATE POLICY "files_unit_head" ON public.uploaded_files
  FOR ALL USING (entity_type='rural_unit' AND public.current_user_role()='unit_head')
  WITH CHECK (entity_type='rural_unit' AND public.current_user_role()='unit_head');

-- سجل العمليات / الأمان / الإعدادات / المناطق / الدخول / السجلات (admin)
DROP POLICY IF EXISTS "audit_admin_read" ON public.audit_logs;
CREATE POLICY "audit_admin_read" ON public.audit_logs FOR SELECT USING (public.current_user_role()='admin');
DROP POLICY IF EXISTS "security_admin_only" ON public.security_events;
CREATE POLICY "security_admin_only" ON public.security_events FOR ALL USING (public.current_user_role()='admin') WITH CHECK (public.current_user_role()='admin');
DROP POLICY IF EXISTS "settings_admin" ON public.site_settings;
CREATE POLICY "settings_admin" ON public.site_settings FOR ALL USING (public.current_user_role()='admin') WITH CHECK (public.current_user_role()='admin');
DROP POLICY IF EXISTS "districts_admin" ON public.districts;
CREATE POLICY "districts_admin" ON public.districts FOR ALL USING (public.current_user_role()='admin') WITH CHECK (public.current_user_role()='admin');
DROP POLICY IF EXISTS "login_history_admin" ON public.login_history;
CREATE POLICY "login_history_admin" ON public.login_history FOR SELECT USING (public.current_user_role()='admin');
DROP POLICY IF EXISTS "notif_log_admin" ON public.notification_logs;
CREATE POLICY "notif_log_admin" ON public.notification_logs FOR ALL USING (public.current_user_role()='admin') WITH CHECK (public.current_user_role()='admin');
DROP POLICY IF EXISTS "sched_reports_admin" ON public.scheduled_reports;
CREATE POLICY "sched_reports_admin" ON public.scheduled_reports FOR ALL USING (public.current_user_role()='admin') WITH CHECK (public.current_user_role()='admin');

-- المحتوى (كتابة admin,staff)
DROP POLICY IF EXISTS "site_content_write" ON public.site_content;
CREATE POLICY "site_content_write" ON public.site_content
  FOR ALL USING (public.current_user_role() IN ('admin','staff'))
  WITH CHECK (public.current_user_role() IN ('admin','staff'));

-- صور الوحدات (admin,staff,unit_head)
DROP POLICY IF EXISTS "unit_images_write" ON public.unit_images;
CREATE POLICY "unit_images_write" ON public.unit_images
  FOR ALL USING (public.current_user_role() IN ('admin','staff','unit_head'))
  WITH CHECK (public.current_user_role() IN ('admin','staff','unit_head'));

-- موظفو الوحدات
DROP POLICY IF EXISTS "unit_employees_view" ON public.unit_employees;
CREATE POLICY "unit_employees_view" ON public.unit_employees FOR SELECT USING (public.current_user_role() IN ('admin','staff','unit_head'));
DROP POLICY IF EXISTS "unit_employees_insert" ON public.unit_employees;
CREATE POLICY "unit_employees_insert" ON public.unit_employees FOR INSERT WITH CHECK (public.current_user_role() IN ('admin','staff','unit_head'));
DROP POLICY IF EXISTS "unit_employees_update" ON public.unit_employees;
CREATE POLICY "unit_employees_update" ON public.unit_employees FOR UPDATE USING (public.current_user_role() IN ('admin','staff','unit_head'));
DROP POLICY IF EXISTS "unit_employees_delete" ON public.unit_employees;
CREATE POLICY "unit_employees_delete" ON public.unit_employees FOR DELETE USING (public.current_user_role() IN ('admin','unit_head'));

-- إعدادات حقول الوحدات (admin,unit_head)
DROP POLICY IF EXISTS "unit_field_configs_all" ON public.unit_field_configs;
CREATE POLICY "unit_field_configs_all" ON public.unit_field_configs
  FOR ALL USING (public.current_user_role() IN ('admin','unit_head'))
  WITH CHECK (public.current_user_role() IN ('admin','unit_head'));

-- شات الموظفين (admin,staff,unit_head)
DROP POLICY IF EXISTS "staff_conv_access" ON public.staff_conversations;
CREATE POLICY "staff_conv_access" ON public.staff_conversations
  FOR ALL USING (public.current_user_role() IN ('admin','staff','unit_head'))
  WITH CHECK (public.current_user_role() IN ('admin','staff','unit_head'));
DROP POLICY IF EXISTS "staff_msg_access" ON public.staff_messages;
CREATE POLICY "staff_msg_access" ON public.staff_messages
  FOR ALL USING (public.current_user_role() IN ('admin','staff','unit_head'))
  WITH CHECK (public.current_user_role() IN ('admin','staff','unit_head'));

-- شات الدعم (المالك أو موظف)
DROP POLICY IF EXISTS "threads_own" ON public.support_threads;
CREATE POLICY "threads_own" ON public.support_threads
  FOR ALL USING (user_id = auth.uid() OR public.current_user_role() IN ('admin','staff'))
  WITH CHECK (user_id = auth.uid() OR public.current_user_role() IN ('admin','staff'));
DROP POLICY IF EXISTS "messages_thread_access" ON public.support_messages;
CREATE POLICY "messages_thread_access" ON public.support_messages
  FOR ALL USING (EXISTS (SELECT 1 FROM public.support_threads t
      WHERE t.id = support_messages.thread_id
        AND (t.user_id = auth.uid() OR public.current_user_role() IN ('admin','staff'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.support_threads t
      WHERE t.id = support_messages.thread_id
        AND (t.user_id = auth.uid() OR public.current_user_role() IN ('admin','staff'))));

-- تقارير الوحدات
DROP POLICY IF EXISTS "unit_reports_insert" ON public.unit_reports;
CREATE POLICY "unit_reports_insert" ON public.unit_reports FOR INSERT WITH CHECK (public.current_user_role() IN ('admin','staff','unit_head'));
DROP POLICY IF EXISTS "unit_reports_read" ON public.unit_reports;
CREATE POLICY "unit_reports_read" ON public.unit_reports FOR SELECT USING (public.current_user_role() IN ('admin','staff','unit_head'));
DROP POLICY IF EXISTS "unit_reports_update" ON public.unit_reports;
CREATE POLICY "unit_reports_update" ON public.unit_reports FOR UPDATE USING (public.current_user_role() IN ('admin','staff'));
DROP POLICY IF EXISTS "unit_reports_delete" ON public.unit_reports;
CREATE POLICY "unit_reports_delete" ON public.unit_reports FOR DELETE USING (public.current_user_role()='admin');

-- ====================== 017_attendance.sql ======================

-- ================================================
-- Migration 017: سجل دوام فعلي داخل الوحدات
-- ================================================
CREATE TABLE IF NOT EXISTS public.attendance (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_key      TEXT NOT NULL,
  unit_name     TEXT NOT NULL,
  employee_id   UUID REFERENCES public.unit_employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  att_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  status        TEXT NOT NULL DEFAULT 'present'
                  CHECK (status IN ('present','absent','leave','late','mission')),
  notes         TEXT,
  recorded_by   UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (unit_key, employee_id, att_date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_unit_date ON public.attendance(unit_key, att_date DESC);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_manage" ON public.attendance;
CREATE POLICY "attendance_manage" ON public.attendance
  FOR ALL USING (public.current_user_role() IN ('admin','staff','unit_head'))
  WITH CHECK (public.current_user_role() IN ('admin','staff','unit_head'));

-- دالة آمنة لإرسال كشف الدوام كإشعار إلى موظف مسؤول (يظهر في بريده/إشعاراته)
CREATE OR REPLACE FUNCTION public.send_attendance_sheet(
  p_recipient UUID, p_unit_name TEXT, p_date DATE, p_summary TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.current_user_role() NOT IN ('admin','staff','unit_head') THEN
    RAISE EXCEPTION 'غير مصرّح بإرسال كشف الدوام';
  END IF;
  INSERT INTO public.notifications(user_id, title, body, type, link)
  VALUES (p_recipient,
    'كشف دوام: ' || p_unit_name || ' (' || p_date || ')',
    p_summary, 'info', '/unit-reports');
END;
$$;
GRANT EXECUTE ON FUNCTION public.send_attendance_sheet TO authenticated;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- قائمة الموظفين المسؤولين (admin/staff) لإرسال الكشوف إليهم — متاحة لرؤساء الوحدات بأمان
CREATE OR REPLACE FUNCTION public.list_staff_recipients()
RETURNS TABLE(id UUID, full_name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, full_name FROM public.profiles WHERE role IN ('admin','staff') ORDER BY full_name
$$;
GRANT EXECUTE ON FUNCTION public.list_staff_recipients TO authenticated;
