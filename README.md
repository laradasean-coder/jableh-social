# دائرة جبلة للشؤون الاجتماعية والعمل — الإصدار 8.0
## النسخة المكتملة — كل الإصلاحات والميزات

---

## ✅ ما تم إصلاحه في هذا الإصدار

### إصلاحات حرجة
| المشكلة | الحالة | الملف |
|---------|--------|-------|
| `onClose` بدلاً من `onBack` — زر الرجوع لا يعمل | ✅ مُصلح | BeneficiaryDetailPage.jsx |
| `setSaving` غير معرّف في SupportChat | ✅ مُصلح | SupportChat.jsx |
| 18 Tailwind dynamic class تختفي في الإنتاج | ✅ مُصلح | tailwind.config.js (safelist) |
| ALTER PUBLICATION مكرر في migrations | ✅ مُصلح | 004 + migration 006 |
| بيانات admin/admin ظاهرة لكل زائر | ✅ محذوفة | LoginPage.jsx |

### الأمان
- 7 security headers في vercel.json (CSP, HSTS, Referrer-Policy...)
- Dark Mode مُعاد بناؤه بـ CSS Variables نظيفة (لا `!important`)
- useDarkMode يدعم system preference

### البنية الهندسية الجديدة
- **Data Access Layer** `/src/api/` — 4 ملفات تعزل Supabase عن الصفحات
- **Zustand Store** `/src/store/appStore.js` — حالة مركزية
- **utils/format.js** — تنسيق موحّد للتاريخ والأرقام والفئات
- **ErrorBoundary** يلتقط أي خطأ غير متوقع ويعرض رسالة عربية
- **404 NotFoundPage** بتصميم رسمي عربي

### واجهات مخصصة لكل دور
| الدور | الواجهة |
|-------|---------|
| مدير | AdminDashboard — KPIs + تصفير + روابط ادارية |
| موظف | StaffDashboard — أعداد + إجراءات سريعة |
| جمعية | AssociationDashboard — خدمات الجمعية |
| زائر عام | PublicDashboard — Hero + خدمات + تواصل |

### Skeleton Loading
- SkeletonCard, SkeletonTable, SkeletonDashboard, SkeletonList
- تُستخدم تلقائياً أثناء تحميل البيانات

### إصلاح البيانات الوهمية
- NotificationsSystem → Supabase notifications + Realtime حقيقي
- AuditLogPage → supabase audit_logs بدلاً من MOCK_LOGS
- BeneficiaryDetailPage → beneficiary_relief_history حقيقي + إضافة مساعدة

### DuplicateChecker محسّن
- يستخدم pg_trgm RPC server-side (لا يحمّل 500 سجل)
- يرجع لـ client-side كـ fallback

### Migration 006
- `pg_trgm` extension
- RPC `search_similar_beneficiaries`
- `next_review_date`, `closed_at` للمستفيدين
- Indexes للأداء
- Realtime آمن (لا يفشل إذا سبق التفعيل)

---

## 🚀 خطوات التشغيل

```bash
# 1. شغّل migrations بالترتيب في Supabase SQL Editor
001_initial_schema.sql → 002 → 003 → 004 → 005 → 006

# 2. فعّل Realtime من Supabase Dashboard > Database > Replication
# الجداول: beneficiaries, relief_requests, notifications, support_messages, support_threads

# 3. محلياً
cp .env.example .env
# أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY
npm install
npm run dev

# 4. اختبارات
npm test
```

---

## 📁 هيكل المشروع الكامل

```
src/
├── api/              ← Data Access Layer (NEW)
│   ├── beneficiaries.js
│   ├── dashboard.js
│   ├── notifications.js
│   └── relief.js
├── store/            ← Zustand state (NEW)
│   └── appStore.js
├── utils/            ← Shared utilities (NEW)
│   └── format.js
├── components/
│   ├── layout/Layout.jsx
│   └── ui/
│       ├── ErrorBoundary.jsx  ← NEW
│       ├── skeleton/Skeleton.jsx ← NEW
│       ├── NotificationsSystem.jsx ← Fixed (real data)
│       ├── DuplicateChecker.jsx ← Fixed (pg_trgm)
│       ├── SupportChat.jsx ← Fixed (setSending)
│       └── ...
├── pages/
│   ├── dashboards/    ← NEW
│   │   ├── AdminDashboard.jsx
│   │   ├── StaffDashboard.jsx
│   │   ├── PublicDashboard.jsx
│   │   └── AssociationDashboard.jsx
│   ├── DashboardPage.jsx ← Role router
│   ├── NotFoundPage.jsx ← NEW
│   ├── BeneficiaryDetailPage.jsx ← Fixed
│   ├── AuditLogPage.jsx ← Fixed (real data)
│   └── ...
supabase/migrations/
└── 006_v8_improvements.sql ← NEW
```
"# jableh-social" 
