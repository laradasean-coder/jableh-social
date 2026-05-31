import { lazy } from 'react'

// يحلّ مشكلة الشاشة البيضاء عند فشل تحميل ملف شيفرة الصفحة (chunk)
// وهو ما يحدث غالباً بعد إعادة نشر نسخة جديدة بينما الـ Service Worker
// لا يزال يشير لملفات النسخة القديمة. الحل: إعادة تحميل الصفحة مرة واحدة
// تلقائياً لجلب أحدث الملفات بدل ترك المستخدم أمام شاشة بيضاء.
const RELOAD_KEY = 'jabla_chunk_reload'

export function lazyWithRetry(factory) {
  return lazy(async () => {
    try {
      const mod = await factory()
      // نجح التحميل → صفّر علم إعادة التحميل
      try { window.sessionStorage.removeItem(RELOAD_KEY) } catch { /* ignore */ }
      return mod
    } catch (err) {
      const alreadyReloaded = (() => {
        try { return window.sessionStorage.getItem(RELOAD_KEY) === '1' } catch { return false }
      })()
      if (!alreadyReloaded) {
        try { window.sessionStorage.setItem(RELOAD_KEY, '1') } catch { /* ignore */ }
        window.location.reload()
        // لا نُكمل التحميل؛ ستُعاد الصفحة فوراً
        return new Promise(() => {})
      }
      // فشل حتى بعد إعادة التحميل → اترك ErrorBoundary يعرض رسالة مفهومة
      throw err
    }
  })
}
