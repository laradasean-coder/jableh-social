-- ================================================
-- Migration 013: تنظيف تلقائي لتوفير مساحة قاعدة البيانات
-- ================================================

-- دالة تحذف السجلات القديمة (أقدم من 6 أشهر)
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void AS $$
BEGIN
  -- سجل العمليات الأقدم من 6 أشهر
  DELETE FROM public.audit_logs WHERE created_at < NOW() - INTERVAL '6 months';
  -- سجل الإشعارات المقروءة الأقدم من 3 أشهر
  DELETE FROM public.notifications WHERE is_read = TRUE AND created_at < NOW() - INTERVAL '3 months';
  -- سجل الدخول الأقدم من 3 أشهر
  DELETE FROM public.login_history WHERE created_at < NOW() - INTERVAL '3 months';
  -- سجل الرسائل النصية الأقدم من 3 أشهر
  DELETE FROM public.notification_logs WHERE created_at < NOW() - INTERVAL '3 months';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- جدولة التنظيف شهرياً (يتطلب امتداد pg_cron — متاح في خطة Pro)
-- في الخطة المجانية: استدعها يدوياً أو عبر GitHub Action
-- SELECT cron.schedule('cleanup-logs', '0 0 1 * *', 'SELECT public.cleanup_old_logs()');

-- يمكن استدعاؤها يدوياً: SELECT public.cleanup_old_logs();
GRANT EXECUTE ON FUNCTION public.cleanup_old_logs TO authenticated;
