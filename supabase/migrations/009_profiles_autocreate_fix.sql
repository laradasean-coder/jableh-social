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
