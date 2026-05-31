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
