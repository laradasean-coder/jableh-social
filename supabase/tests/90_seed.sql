\set ON_ERROR_STOP on
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ===== مستخدمون (يُفعّل trigger handle_new_user تلقائياً) =====
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('11111111-1111-1111-1111-111111111111','admin@jabla.gov.sy','{"full_name":"المدير العام"}'),
 ('22222222-2222-2222-2222-222222222222','staff@jabla.gov.sy','{"full_name":"موظف الاستقبال"}'),
 ('33333333-3333-3333-3333-333333333333','head@jabla.gov.sy','{"full_name":"رئيس وحدة الدالية"}'),
 ('44444444-4444-4444-4444-444444444444','assoc1@ngo.sy','{"full_name":"رئيس جمعية المستقبل"}'),
 ('55555555-5555-5555-5555-555555555555','assoc2@ngo.sy','{"full_name":"رئيس جمعية الأمل"}');

-- ترقية الأدوار (المدير يضبطها صراحةً)
UPDATE public.profiles SET role='admin'     WHERE id='11111111-1111-1111-1111-111111111111';
UPDATE public.profiles SET role='staff'     WHERE id='22222222-2222-2222-2222-222222222222';
UPDATE public.profiles SET role='unit_head', unit_name='وحدة الدالية' WHERE id='33333333-3333-3333-3333-333333333333';
-- assoc1/assoc2 يبقيان association (افتراضي)

-- ===== اختبار أمني: مستخدم يحاول طلب دور admin عبر metadata =====
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('66666666-6666-6666-6666-666666666666','attacker@evil.com','{"full_name":"مهاجم","role":"admin"}');

-- ===== مستفيدون (يُفعّل audit) =====
INSERT INTO public.beneficiaries(full_name,national_id,category,district,gender,status) VALUES
 ('فاطمة العلي','0101','widow','الدالية','female','active'),
 ('محمد حسن','0102','disabled','بسنديانا','male','active'),
 ('سارة خليل','0103','orphan','البودي','female','pending');

-- ===== طلبات إغاثة (يُفعّل SLA + audit) =====
INSERT INTO public.relief_requests(full_name,national_id,phone,district,category,family_size,status) VALUES
 ('أحمد إبراهيم','0201','0991','الدالية','poor_family',5,'pending'),
 ('ليلى منصور','0202','0992','بسنديانا','widow',3,'pending');

-- ===== جمعيات: واحدة معتمدة، وواحدة تسجيل ذاتي pending (يُفعّل notify) =====
INSERT INTO public.associations(name,president_name,user_id,status,is_active) VALUES
 ('جمعية المستقبل','رئيس جمعية المستقبل','44444444-4444-4444-4444-444444444444','approved',TRUE);
INSERT INTO public.associations(name,president_name,phone,email,user_id,status,is_active) VALUES
 ('جمعية الأمل','رئيس جمعية الأمل','0933','assoc2@ngo.sy','55555555-5555-5555-5555-555555555555','pending',FALSE);

-- ===== موظفو وحدة =====
INSERT INTO public.unit_employees(unit_name,full_name,national_id,job_title,created_by) VALUES
 ('وحدة الدالية','عبير سالم','0301','أخصائية اجتماعية','33333333-3333-3333-3333-333333333333');

-- ===== ملف وحدة (سجل دوام) =====
INSERT INTO public.uploaded_files(entity_type,entity_id,file_name,file_url,file_type,uploaded_by) VALUES
 ('rural_unit','unit-1','سجل_دوام_مايو.xlsx','https://x/y.xlsx','application/vnd.ms-excel','33333333-3333-3333-3333-333333333333');

-- ===== تقارير الوحدة (يُفعّل notify المدير) =====
INSERT INTO public.unit_reports(unit_key,unit_name,report_type,title,body,submitted_by,submitted_by_name) VALUES
 ('unit-1','وحدة الدالية','daily','تقرير يومي','تم استقبال 12 حالة وتوزيع 8 مساعدات.','33333333-3333-3333-3333-333333333333','رئيس وحدة الدالية'),
 ('unit-1','وحدة الدالية','weekly','تقرير أسبوعي','إنجاز 3 مشاريع خلال الأسبوع.','33333333-3333-3333-3333-333333333333','رئيس وحدة الدالية');

-- ===== شات الموظفين =====
INSERT INTO public.staff_messages(conversation_id,sender_id,sender_name,body) VALUES
 ('00000000-0000-0000-0000-0000000000ff','11111111-1111-1111-1111-111111111111','المدير العام','صباح الخير للجميع'),
 ('00000000-0000-0000-0000-0000000000ff','22222222-2222-2222-2222-222222222222','موظف الاستقبال','تم تجهيز التقارير');

-- ===== طلب وصول من جمعية (يُفعّل notify) =====
INSERT INTO public.access_requests(association_id,association_name,record_type,reason)
 SELECT id,'جمعية المستقبل','widow','دراسة حالات' FROM public.associations WHERE name='جمعية المستقبل';

-- ===== تعديلات إعدادات المدير =====
INSERT INTO public.site_settings(key,value) VALUES
 ('director_name','معتز بلة'),('director_title','مدير دائرة جبلة'),('director_vision','رؤيتنا خدمة المجتمع')
 ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value;
