-- ================================================
-- Migration 011: تحويل المستفيدين + الأرشفة
-- ================================================

-- 1. جدول تحويل المستفيدين للجمعيات
CREATE TABLE IF NOT EXISTS public.referrals (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  beneficiary_id  UUID REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  association_id  UUID REFERENCES public.associations(id) ON DELETE SET NULL,
  association_name TEXT,
  reason          TEXT,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','completed','rejected')),
  referred_by     UUID REFERENCES auth.users(id),
  referred_by_name TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_ben ON public.referrals(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_referrals_assoc ON public.referrals(association_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals_staff" ON public.referrals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','staff'))
  );

CREATE POLICY "referrals_assoc_read" ON public.referrals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.associations a WHERE a.id = referrals.association_id AND a.user_id = auth.uid())
  );

-- 2. حقول الأرشفة في جدول المستفيدين
ALTER TABLE public.beneficiaries
  ADD COLUMN IF NOT EXISTS archived_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archive_reason  TEXT,
  ADD COLUMN IF NOT EXISTS archived_by     UUID REFERENCES auth.users(id);

-- تحديث الحالة لتشمل "مؤرشف"
ALTER TABLE public.beneficiaries DROP CONSTRAINT IF EXISTS beneficiaries_status_check;
ALTER TABLE public.beneficiaries ADD CONSTRAINT beneficiaries_status_check
  CHECK (status IN ('active','inactive','pending','archived'));

-- View للمستفيدين المؤرشفين
CREATE OR REPLACE VIEW public.archived_beneficiaries AS
SELECT id, full_name, category, district, archive_reason, archived_at
FROM public.beneficiaries
WHERE status = 'archived'
ORDER BY archived_at DESC;

-- 3. Trigger لتحديث updated_at في referrals
CREATE TRIGGER trg_referrals_updated
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Realtime
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
