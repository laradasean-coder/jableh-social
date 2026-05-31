-- تأكيدات: تفشل وظيفة CI عند أي خطأ
CREATE OR REPLACE FUNCTION pg_temp.chk(cond boolean, name text) RETURNS void AS $$
BEGIN IF cond THEN RAISE NOTICE 'PASS | %', name; ELSE RAISE EXCEPTION 'FAIL | %', name; END IF; END; $$ LANGUAGE plpgsql;
DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM public.profiles WHERE id='66666666-6666-6666-6666-666666666666' AND role='association';
  PERFORM pg_temp.chk(n=1,'منع تصعيد الصلاحيات عند التسجيل الذاتي');
  SELECT count(*) INTO n FROM public.notifications WHERE title LIKE '%طلب تسجيل جمعية%';
  PERFORM pg_temp.chk(n>=2,'إشعار تسجيل الجمعية للمدير والموظف');
  SELECT count(*) INTO n FROM public.notifications WHERE title LIKE '%تقرير%';
  PERFORM pg_temp.chk(n>=4,'إشعارات تقارير الوحدات');
  SELECT count(*) INTO n FROM public.relief_requests WHERE sla_deadline IS NOT NULL;
  PERFORM pg_temp.chk(n=2,'مهلة SLA لطلبات الإغاثة');
  SELECT count(*) INTO n FROM public.global_search('فاطمة');
  PERFORM pg_temp.chk(n>=1,'دالة البحث الموحد global_search');
END $$;
-- RLS: staff يرى المستفيدين، unit_head/association محجوبان
DO $$ DECLARE n int; BEGIN
  PERFORM set_config('app.uid','22222222-2222-2222-2222-222222222222',true); SET LOCAL ROLE authenticated;
  EXECUTE 'SELECT count(*) FROM public.beneficiaries' INTO n; RESET ROLE;
  PERFORM pg_temp.chk(n=3,'RLS: staff يرى المستفيدين');
  PERFORM set_config('app.uid','33333333-3333-3333-3333-333333333333',true); SET LOCAL ROLE authenticated;
  EXECUTE 'SELECT count(*) FROM public.beneficiaries' INTO n; RESET ROLE;
  PERFORM pg_temp.chk(n=0,'RLS: unit_head محجوب عن المستفيدين');
  PERFORM set_config('app.uid','',true); SET LOCAL ROLE anon;
  EXECUTE 'SELECT count(*) FROM public.associations' INTO n; RESET ROLE;
  PERFORM pg_temp.chk(n=1,'RLS: الجمهور يرى الجمعيات المعتمدة فقط');
END $$;
