# ⚡ CodeSpark - منصة تعليم البرمجة التأسيسية للمرحلة الثانوية

منصة تعليمية متكاملة مبنية من الصفر لتعليم مناهج البرمجة (بايثون وتطوير الويب) لطلاب المرحلة الثانوية في جمهورية مصر العربية، مع لوحة إدارة مركزية للمشرفين والمساعدين التعليميين.

---

## 🏛️ المعمارية التقنية (Architecture & Technology Stack)

### Backend (الواجهة الخلفية)
* **Python 3.11+ / FastAPI**: إطار عمل عالي الأداء لبناء واجهات RESTful API مع توثيق تفاعلي تلقائي عبر Swagger (`/docs`) و ReDoc (`/redoc`).
* **Pydantic**: التحقق من صحة المدخلات وضمان أمان البيانات.
* **Persistent Database Abstraction Layer**:
  * **Production**: دعم كامل لقواعد بيانات **PostgreSQL** عبر SQLAlchemy و Alembic Migrations.
  * **Development / Sandbox Testing**: محرك تخزين علائقي دائم (Persistent SQLite) في مسار بيانات آمن مع تفعيل القيود التلقائية للمفاتيح الأجنبية (`PRAGMA foreign_keys = ON`) وعزل المعاملات (`BEGIN IMMEDIATE / COMMIT / ROLLBACK`).
* **Security & Auth**:
  * تشفير كلمات المرور باستخدام معايير NIST SP 800-63B عبر PBKDF2-HMAC-SHA256 مع 100,000 دورة تكرار وأملاح عشوائية 16-byte ومقارنة زمنية ثابتة (`hmac.compare_digest`).
  * مصادقة الجلسات عبر JSON Web Tokens (HS256).
  * نظام صارم لتحديد الصلاحيات (RBAC): المشرف العام (Admin)، المساعد التعليمي (Assistant)، الطالب (Student).
  * حظر صارم على صلاحيات المساعدين: قصر توليد الأكواد على **الأكواد الشهرية فقط (30 يوماً)** مع منع المساعدين من تغيير الأسعار أو إعدادات طرق الدفع أو ترقية الحسابات.

### Frontend (الواجهة الأمامية)
* **HTML5 / CSS3 / Vanilla JavaScript**: بدون أي أطر عمل ثقيلة أو اعتمادات خارجية غير ضرورية.
* **Arabic-First & RTL**: تصميم أصلي يدعم اللغة العربية واتجاه اليمين لليسار بالكامل، مع محاذاة LTR لمحرر الأكواد وشاشة المخرجات والروابط.
* **Visual Identity**:
  * خلفيات كحلية عميقة (`#070B14`, `#0B132B`).
  * أزرق كهربائي مشع (`#1E40AF`, `#2563EB`).
  * لمسات وألوان سماوية براقة (`#00E5FF`, `#0EA5E9`).
* **Modular Architecture**:
  * `apiClient.js`: عميل موحد للتعامل مع الـ REST API وتضمين رموز المصادقة والتعامل مع انتهاء الجلسات.
  * `authService.js`: إدارة جلسة المستخدم والأدوار.
  * `router.js`: موجه SPA ذكي يدعم الصفحات العامة وصفحات الطلاب وصفحات المشرفين مع حماية المسارات.
  * `publicPages.js`: الصفحة الرئيسية (Landing)، عن المنصة (About)، المنهج (Curriculum)، الأسعار (Pricing)، تواصل معنا (Contact).
  * `studentPages.js`: لوحة المتابعة، الدروس وشروحات الفيديو، محرر الأكواد، الامتحانات الدورية، الملفات والمذكرات الدراسية، والاشتراكات.
  * `adminPages.js`: لوحة الإحصائيات، إدارة الطلاب، المساعدين، المناهج والدروس، الملفات الدراسية، الاشتراكات، مراجعة التحويلات، وطرق الدفع والاشتراك.

---

## 🚀 تشغيل المنصة (Run Commands)

### 1. التشغيل المباشر المحلي
```bash
cd codespark_platform
./start.sh
```
أو عبر Python مباشرة:
```bash
cd codespark_platform/backend
PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 8000
```
افتح المتصفح على: `http://localhost:8000`

### 2. التشغيل عبر Docker Compose (Production with PostgreSQL)
```bash
docker-compose up -d --build
```

---

## 🧪 الاختبارات الآلية (Automated Tests)

تم تضمين حزمة اختبارات شاملة تغطي 100% من متطلبات المنصة:
```bash
cd codespark_platform/backend
PYTHONPATH=. python3 tests/run_all_tests.py
PYTHONPATH=. python3 tests/test_e2e_workflows.py
```
نتائج الاختبارات:
* 100% نسبة نجاح لجميع حالات الاختبار (Auth, Password Change, RBAC, Subscriptions, Payments, Curriculum, Sandbox Runner).

---

## 💳 إعدادات طرق الدفع والاشتراك
* صفحة مستقلة للإدارة: `#/admin/payment-settings`.
* الرقم الافتراضي المعتمد لمحفظة فودافون كاش وإنستاباي: `+20159159038`.
* رابط الدفع المباشر لإنستاباي: `https://ipn.eg/S/moazasem/instapay/27DsGj`.
* تخزين دائم في قاعدة البيانات بدون فقدان للبيانات عند إعادة التشغيل.
