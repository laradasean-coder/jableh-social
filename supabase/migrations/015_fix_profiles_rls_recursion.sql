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
