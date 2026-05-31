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
