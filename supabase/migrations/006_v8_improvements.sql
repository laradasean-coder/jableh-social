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

