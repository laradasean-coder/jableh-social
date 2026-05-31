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
