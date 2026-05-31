-- ================================================
-- Migration 012: المناطق القابلة للإدارة + شات الموظفين
-- ================================================

-- 1. جدول المناطق (يديره الأدمن)
CREATE TABLE IF NOT EXISTS public.districts (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  sort_order INT DEFAULT 0,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "districts_read" ON public.districts FOR SELECT USING (TRUE);
CREATE POLICY "districts_admin" ON public.districts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- المناطق الافتراضية
INSERT INTO public.districts (name, sort_order) VALUES
  ('جبلة المدينة', 1), ('الدالية', 2), ('القطيلبية', 3), ('عين الشرقية', 4),
  ('عين شقاق', 5), ('حميميم', 6), ('البرجان', 7), ('الحويز', 8),
  ('وادي القلع', 9), ('دوير بعبدة', 10), ('طوق جبلة', 11),
  ('بيت ياشوط', 12), ('البودي', 13), ('تل حويري', 14), ('بسنديانا', 15)
ON CONFLICT (name) DO NOTHING;

-- 2. حقول إضافية لطلبات الإغاثة
ALTER TABLE public.relief_requests
  ADD COLUMN IF NOT EXISTS disability_card_no TEXT,
  ADD COLUMN IF NOT EXISTS case_image_url     TEXT;

-- 3. شات الموظفين — المحادثات
CREATE TABLE IF NOT EXISTS public.staff_conversations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type        TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct','group')),
  name        TEXT,                          -- للمجموعة العامة
  member_a    UUID REFERENCES auth.users(id),-- للمحادثة الخاصة
  member_b    UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- المجموعة العامة الافتراضية
INSERT INTO public.staff_conversations (id, type, name)
VALUES ('00000000-0000-0000-0000-0000000000ff', 'group', 'القناة العامة للموظفين')
ON CONFLICT (id) DO NOTHING;

-- 4. رسائل شات الموظفين
CREATE TABLE IF NOT EXISTS public.staff_messages (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.staff_conversations(id) ON DELETE CASCADE,
  sender_id       UUID REFERENCES auth.users(id),
  sender_name     TEXT,
  body            TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_msg_conv ON public.staff_messages(conversation_id, created_at);

ALTER TABLE public.staff_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_messages ENABLE ROW LEVEL SECURITY;

-- الموظفون والمديرون فقط
CREATE POLICY "staff_conv_access" ON public.staff_conversations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','staff','unit_head'))
);
CREATE POLICY "staff_msg_access" ON public.staff_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','staff','unit_head'))
);

-- 5. Realtime
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_messages;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_conversations;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
