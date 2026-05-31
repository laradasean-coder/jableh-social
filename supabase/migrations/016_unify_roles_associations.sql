-- ================================================
-- Migration 016:
--   #2 تشديد قراءة الجمعيات (قراءة عامة للمعتمدة فقط)
--   #3 توحيد فحص الأدوار عبر دالة current_user_role() (أداء أوضح + لا تكرار)
-- كل السياسات أُعيد بناؤها مع الإبقاء على نفس المنطق الأمني.
-- ================================================

-- ── #2 الجمعيات ─────────────────────────────
DROP POLICY IF EXISTS "associations_all_read"   ON public.associations;
DROP POLICY IF EXISTS "associations_public_read" ON public.associations;
DROP POLICY IF EXISTS "associations_own_edit"    ON public.associations;
DROP POLICY IF EXISTS "associations_own"         ON public.associations;

-- قراءة عامة للمعتمدة فقط
CREATE POLICY "associations_public_read" ON public.associations
  FOR SELECT USING (status = 'approved' AND is_active = TRUE);
-- المالك + الموظف/المدير: وصول كامل (يشمل رؤية قيد المراجعة)
CREATE POLICY "associations_owner_staff" ON public.associations
  FOR ALL
  USING (user_id = auth.uid() OR public.current_user_role() IN ('admin','staff'))
  WITH CHECK (user_id = auth.uid() OR public.current_user_role() IN ('admin','staff'));

-- ── #3 توحيد فحص الأدوار ────────────────────
-- المستفيدون (admin,staff)
DROP POLICY IF EXISTS "beneficiaries_staff" ON public.beneficiaries;
CREATE POLICY "beneficiaries_staff" ON public.beneficiaries
  FOR ALL USING (public.current_user_role() IN ('admin','staff'))
  WITH CHECK (public.current_user_role() IN ('admin','staff'));

-- طلبات الإغاثة (insert عام موجود؛ القراءة admin,staff)
DROP POLICY IF EXISTS "relief_staff_read" ON public.relief_requests;
CREATE POLICY "relief_staff_read" ON public.relief_requests
  FOR SELECT USING (public.current_user_role() IN ('admin','staff'));

-- تاريخ الإغاثات
DROP POLICY IF EXISTS "relief_history_staff" ON public.beneficiary_relief_history;
CREATE POLICY "relief_history_staff" ON public.beneficiary_relief_history
  FOR ALL USING (public.current_user_role() IN ('admin','staff'))
  WITH CHECK (public.current_user_role() IN ('admin','staff'));

-- طلبات الوصول
DROP POLICY IF EXISTS "access_req_staff_all" ON public.access_requests;
CREATE POLICY "access_req_staff_all" ON public.access_requests
  FOR ALL USING (public.current_user_role() IN ('admin','staff'))
  WITH CHECK (public.current_user_role() IN ('admin','staff'));

-- التحويلات
DROP POLICY IF EXISTS "referrals_staff" ON public.referrals;
CREATE POLICY "referrals_staff" ON public.referrals
  FOR ALL USING (public.current_user_role() IN ('admin','staff'))
  WITH CHECK (public.current_user_role() IN ('admin','staff'));

-- الملفات المرفوعة
DROP POLICY IF EXISTS "files_staff_all" ON public.uploaded_files;
CREATE POLICY "files_staff_all" ON public.uploaded_files
  FOR ALL USING (public.current_user_role() IN ('admin','staff'))
  WITH CHECK (public.current_user_role() IN ('admin','staff'));
DROP POLICY IF EXISTS "files_unit_head" ON public.uploaded_files;
CREATE POLICY "files_unit_head" ON public.uploaded_files
  FOR ALL USING (entity_type='rural_unit' AND public.current_user_role()='unit_head')
  WITH CHECK (entity_type='rural_unit' AND public.current_user_role()='unit_head');

-- سجل العمليات / الأمان / الإعدادات / المناطق / الدخول / السجلات (admin)
DROP POLICY IF EXISTS "audit_admin_read" ON public.audit_logs;
CREATE POLICY "audit_admin_read" ON public.audit_logs FOR SELECT USING (public.current_user_role()='admin');
DROP POLICY IF EXISTS "security_admin_only" ON public.security_events;
CREATE POLICY "security_admin_only" ON public.security_events FOR ALL USING (public.current_user_role()='admin') WITH CHECK (public.current_user_role()='admin');
DROP POLICY IF EXISTS "settings_admin" ON public.site_settings;
CREATE POLICY "settings_admin" ON public.site_settings FOR ALL USING (public.current_user_role()='admin') WITH CHECK (public.current_user_role()='admin');
DROP POLICY IF EXISTS "districts_admin" ON public.districts;
CREATE POLICY "districts_admin" ON public.districts FOR ALL USING (public.current_user_role()='admin') WITH CHECK (public.current_user_role()='admin');
DROP POLICY IF EXISTS "login_history_admin" ON public.login_history;
CREATE POLICY "login_history_admin" ON public.login_history FOR SELECT USING (public.current_user_role()='admin');
DROP POLICY IF EXISTS "notif_log_admin" ON public.notification_logs;
CREATE POLICY "notif_log_admin" ON public.notification_logs FOR ALL USING (public.current_user_role()='admin') WITH CHECK (public.current_user_role()='admin');
DROP POLICY IF EXISTS "sched_reports_admin" ON public.scheduled_reports;
CREATE POLICY "sched_reports_admin" ON public.scheduled_reports FOR ALL USING (public.current_user_role()='admin') WITH CHECK (public.current_user_role()='admin');

-- المحتوى (كتابة admin,staff)
DROP POLICY IF EXISTS "site_content_write" ON public.site_content;
CREATE POLICY "site_content_write" ON public.site_content
  FOR ALL USING (public.current_user_role() IN ('admin','staff'))
  WITH CHECK (public.current_user_role() IN ('admin','staff'));

-- صور الوحدات (admin,staff,unit_head)
DROP POLICY IF EXISTS "unit_images_write" ON public.unit_images;
CREATE POLICY "unit_images_write" ON public.unit_images
  FOR ALL USING (public.current_user_role() IN ('admin','staff','unit_head'))
  WITH CHECK (public.current_user_role() IN ('admin','staff','unit_head'));

-- موظفو الوحدات
DROP POLICY IF EXISTS "unit_employees_view" ON public.unit_employees;
CREATE POLICY "unit_employees_view" ON public.unit_employees FOR SELECT USING (public.current_user_role() IN ('admin','staff','unit_head'));
DROP POLICY IF EXISTS "unit_employees_insert" ON public.unit_employees;
CREATE POLICY "unit_employees_insert" ON public.unit_employees FOR INSERT WITH CHECK (public.current_user_role() IN ('admin','staff','unit_head'));
DROP POLICY IF EXISTS "unit_employees_update" ON public.unit_employees;
CREATE POLICY "unit_employees_update" ON public.unit_employees FOR UPDATE USING (public.current_user_role() IN ('admin','staff','unit_head'));
DROP POLICY IF EXISTS "unit_employees_delete" ON public.unit_employees;
CREATE POLICY "unit_employees_delete" ON public.unit_employees FOR DELETE USING (public.current_user_role() IN ('admin','unit_head'));

-- إعدادات حقول الوحدات (admin,unit_head)
DROP POLICY IF EXISTS "unit_field_configs_all" ON public.unit_field_configs;
CREATE POLICY "unit_field_configs_all" ON public.unit_field_configs
  FOR ALL USING (public.current_user_role() IN ('admin','unit_head'))
  WITH CHECK (public.current_user_role() IN ('admin','unit_head'));

-- شات الموظفين (admin,staff,unit_head)
DROP POLICY IF EXISTS "staff_conv_access" ON public.staff_conversations;
CREATE POLICY "staff_conv_access" ON public.staff_conversations
  FOR ALL USING (public.current_user_role() IN ('admin','staff','unit_head'))
  WITH CHECK (public.current_user_role() IN ('admin','staff','unit_head'));
DROP POLICY IF EXISTS "staff_msg_access" ON public.staff_messages;
CREATE POLICY "staff_msg_access" ON public.staff_messages
  FOR ALL USING (public.current_user_role() IN ('admin','staff','unit_head'))
  WITH CHECK (public.current_user_role() IN ('admin','staff','unit_head'));

-- شات الدعم (المالك أو موظف)
DROP POLICY IF EXISTS "threads_own" ON public.support_threads;
CREATE POLICY "threads_own" ON public.support_threads
  FOR ALL USING (user_id = auth.uid() OR public.current_user_role() IN ('admin','staff'))
  WITH CHECK (user_id = auth.uid() OR public.current_user_role() IN ('admin','staff'));
DROP POLICY IF EXISTS "messages_thread_access" ON public.support_messages;
CREATE POLICY "messages_thread_access" ON public.support_messages
  FOR ALL USING (EXISTS (SELECT 1 FROM public.support_threads t
      WHERE t.id = support_messages.thread_id
        AND (t.user_id = auth.uid() OR public.current_user_role() IN ('admin','staff'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.support_threads t
      WHERE t.id = support_messages.thread_id
        AND (t.user_id = auth.uid() OR public.current_user_role() IN ('admin','staff'))));

-- تقارير الوحدات
DROP POLICY IF EXISTS "unit_reports_insert" ON public.unit_reports;
CREATE POLICY "unit_reports_insert" ON public.unit_reports FOR INSERT WITH CHECK (public.current_user_role() IN ('admin','staff','unit_head'));
DROP POLICY IF EXISTS "unit_reports_read" ON public.unit_reports;
CREATE POLICY "unit_reports_read" ON public.unit_reports FOR SELECT USING (public.current_user_role() IN ('admin','staff','unit_head'));
DROP POLICY IF EXISTS "unit_reports_update" ON public.unit_reports;
CREATE POLICY "unit_reports_update" ON public.unit_reports FOR UPDATE USING (public.current_user_role() IN ('admin','staff'));
DROP POLICY IF EXISTS "unit_reports_delete" ON public.unit_reports;
CREATE POLICY "unit_reports_delete" ON public.unit_reports FOR DELETE USING (public.current_user_role()='admin');
