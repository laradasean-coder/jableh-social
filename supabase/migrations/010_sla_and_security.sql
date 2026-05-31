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
