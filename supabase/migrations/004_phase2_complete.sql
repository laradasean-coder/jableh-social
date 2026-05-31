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
