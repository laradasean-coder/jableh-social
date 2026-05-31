-- ================================================
-- Migration 018: الأقسام الوظيفية + حصر نطاق الوحدات
--   1) عمود department في profiles (الأقسام الخمسة)
--   2) دالة current_user_unit() لقراءة وحدة المستخدم دون تكرار RLS
--   3) إعادة بناء سياسات unit_employees / unit_field_configs بحيث
--      يرى رئيس الوحدة موظفي وحدته فقط (admin/staff يرون الكل)
-- ================================================

-- 1) عمود القسم الوظيفي
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department TEXT;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_department_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_department_check
  CHECK (department IS NULL OR department IN
    ('legal','rural_dev','admin_affairs','relief','follow_up'));

CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department);
CREATE INDEX IF NOT EXISTS idx_profiles_unit_name  ON public.profiles(unit_name);

-- 2) دالة ترجع اسم وحدة المستخدم الحالي (SECURITY DEFINER لكسر تكرار RLS)
CREATE OR REPLACE FUNCTION public.current_user_unit()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT unit_name FROM public.profiles WHERE id = auth.uid()
$$;
GRANT EXECUTE ON FUNCTION public.current_user_unit() TO authenticated, anon;

-- 3) إعادة بناء سياسات موظفي الوحدات مع حصر رئيس الوحدة بوحدته
DROP POLICY IF EXISTS "unit_employees_view"   ON public.unit_employees;
DROP POLICY IF EXISTS "unit_employees_insert" ON public.unit_employees;
DROP POLICY IF EXISTS "unit_employees_update" ON public.unit_employees;
DROP POLICY IF EXISTS "unit_employees_delete" ON public.unit_employees;

-- القراءة: admin/staff كل شيء — رئيس الوحدة وحدته فقط
CREATE POLICY "unit_employees_view" ON public.unit_employees
  FOR SELECT USING (
    public.current_user_role() IN ('admin','staff')
    OR (public.current_user_role() = 'unit_head'
        AND unit_name = public.current_user_unit())
  );

CREATE POLICY "unit_employees_insert" ON public.unit_employees
  FOR INSERT WITH CHECK (
    public.current_user_role() IN ('admin','staff')
    OR (public.current_user_role() = 'unit_head'
        AND unit_name = public.current_user_unit())
  );

CREATE POLICY "unit_employees_update" ON public.unit_employees
  FOR UPDATE USING (
    public.current_user_role() IN ('admin','staff')
    OR (public.current_user_role() = 'unit_head'
        AND unit_name = public.current_user_unit())
  );

CREATE POLICY "unit_employees_delete" ON public.unit_employees
  FOR DELETE USING (
    public.current_user_role() = 'admin'
    OR (public.current_user_role() = 'unit_head'
        AND unit_name = public.current_user_unit())
  );

-- إعدادات حقول الوحدات: رئيس الوحدة على وحدته فقط
DROP POLICY IF EXISTS "unit_field_configs_all" ON public.unit_field_configs;
CREATE POLICY "unit_field_configs_all" ON public.unit_field_configs
  FOR ALL USING (
    public.current_user_role() = 'admin'
    OR (public.current_user_role() = 'unit_head'
        AND unit_name = public.current_user_unit())
  )
  WITH CHECK (
    public.current_user_role() = 'admin'
    OR (public.current_user_role() = 'unit_head'
        AND unit_name = public.current_user_unit())
  );
