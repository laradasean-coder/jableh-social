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

