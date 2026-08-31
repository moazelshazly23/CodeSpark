# ⚡ منصة Code Spark التعليمية — مادة البرمجة للمرحلة الثانوية
## Code Spark: Free-First Production Architecture ($0 Cost Stack)
### Cloudflare Pages + FastAPI Free Compute + Supabase PostgreSQL + Flexible Video (YouTube + Direct Upload)

---

## 📌 نظرة عامة على المشروع (Project Overview)
**Code Spark** هي منصة ويب تعليمية متكاملة (Full-Stack Educational Platform) مصممة خصيصاً لطلاب المرحلة الثانوية لشرح ومذاكرة مادة البرمجة المقررة عليهم بأسلوب تفاعلي حديث.

تم تصميم المنصة وفق مبدأ **Free-First Production Architecture ($0 Cost Stack)** بحيث تعمل في مرحلة الإطلاق بأقل تكلفة ممكنة مع الحفاظ التام على الأمان والاستقرار وسرعة الأداء، مع واجهة مستخدم دارك عربية معتمدة 100%، ومحرك تشغيل أكواد بايثون معزول، وتصحيح خادمي للامتحانات (Server-Side Grading)، ونظام فيديو مرن يدعم **روابط YouTube غير المدرجة (Unlisted)** و**الرفع المباشر للفيديوهات (Direct Video Upload)**، وقاعدة بيانات إنتاجية علائقية على **Supabase PostgreSQL Free Tier**.

---

## 🏛️ البنية المعمارية للإنتاج المجاني (Free Production Architecture)

```text
                                  ┌─────────────────────────────────────────┐
                                  │               CODE SPARK                │
                                  └────────────────────┬────────────────────┘
                                                       │
                     ┌─────────────────────────────────┴─────────────────────────────────┐
                     │                                                                   │
                     ▼                                                                   ▼
         ┌────────────────────────┐                                          ┌────────────────────────┐
         │     FRONTEND SPA       │                                          │     BACKEND API        │
         │   Cloudflare Pages     │                                          │  FastAPI (Monolithic)  │
         │       [ FREE ]         │                                          │  Render / Koyeb / Fly  │
         └───────────┬────────────┘                                          │       [ FREE ]         │
                     │                                                       └───────────┬────────────┘
                     │  HTTP REST + JWT (CORS Secured)                                   │
                     └───────────────────────────────────────────────────────────────────┤
                                                                                         ▼
                                                                             ┌────────────────────────┐
                                                                             │  SUPABASE POSTGRESQL   │
                                                                             │   Relational Schema    │
                                                                             │       [ FREE ]         │
                                                                             └────────────────────────┘
```

### 📹 البنية الهندسية لنظام الفيديو المرن (Flexible Video Architecture):

```text
                                                LESSON
                                                   │
                                ┌──────────────────┴──────────────────┐
                                │                                     │
                             YouTube                            Direct Upload
                                │                                     │
                          YouTube Embed                        Object Storage
                     (youtube-nocookie.com)              (Supabase Storage / Local)
                                │                                     │
                                └──────────────────┬──────────────────┘
                                                   │
                                                   ▼
                                           Video Player UI
                                      (IFrame / HTML5 Video)
                                                   │
                                                   ▼
                                         Video Progress Engine
                                     (Throttled Bookmark Tracking)
                                                   │
                                                   ▼
                                         Supabase PostgreSQL
                                      (Metadata Only — NO BLOBs)
```

---

## 📺 نظام الفيديو: YouTube + الرفع المباشر (Video System)

يدعم محرر الدروس في لوحة تحكم المشرف طريقتين لإرفاق الفيديوهات:

### 1️⃣ الطريقة الأولى: رابط YouTube (YouTube Unlisted) — الخيار الموصى به ⚡
- **الاستخدام الموصى به**: لجميع فيديوهات الشرح الطويلة والمحاضرات الكاملة لتوفير مساحة التخزين المجانية ونطاق التردد (Bandwidth).
- **الروابط المدعومة**:
  - `https://www.youtube.com/watch?v=VIDEO_ID`
  - `https://youtu.be/VIDEO_ID`
  - `https://www.youtube.com/embed/VIDEO_ID`
  - `https://www.youtube.com/shorts/VIDEO_ID`
- **آلية التضمين**: يتم استخراج `video_id` تلقائياً واستخدام مشغل YouTube الرسمي من نطاق الخصوصية المحسنة `https://www.youtube-nocookie.com/embed/VIDEO_ID`.
- **ملاحظة هامة (Unlisted vs Private)**:
  - **غير مدرج (Unlisted)**: يعني أن الفيديو لا يظهر في نتائج بحث YouTube أو في الصفحة العامة للقناة، ولكن يمكن لأي شخص يمتلك الرابط (مثل طلاب المنصة) مشاهدته بسلاسة.
  - **خاص (Private)**: لا يمكن تضمينه في مواقع خارجية ولا يمكن للطلاب مشاهدته.

#### 📖 خطوات إضافة فيديو YouTube:
1. ارفع الفيديو على قناتك في YouTube.
2. اختر خيار الرؤية: **غير مدرج (Unlisted)**.
3. انسخ رابط الفيديو من شريط العنوان أو زر المشاركة.
4. افتح لوحة تحكم مشرف Code Spark ثم توجه إلى **المنهج الدراسي**.
5. اضغط على **إضافة درس** أو **تعديل**.
6. اختر تبويب **📺 رابط YouTube**.
7. الصق الرابط؛ سيظهر التضمين والمعاينة الفورية وصورة الغلاف تلقائياً.
8. اضغط **حفظ الدرس 📖**.

---

### 2️⃣ الطريقة الثانية: الرفع المباشر للفيديو (Direct Video Upload) 📁
- **الاستخدام الموصى به**: للفيديوهات القصيرة والمقاطع المباشرة المستضافة داخل بيئة Code Spark.
- **التخزين الخارجي**: يتم حفظ الملف في وحدة التخزين الكائنية (Object Storage مثل Supabase Storage أو القرص المحلي) وحفظ المرجع ومسار التخزين فقط في PostgreSQL (**ممنوع تخزين أي ملفات فيديو داخل قاعدة البيانات كـ BLOB**).
- **الصيغ المدعومة**: `MP4` (`video/mp4`)، `WebM` (`video/webm`).
- **الحد الأقصى لحجم الملف**: **50 ميجابايت (50 MB)** لضمان البقاء داخل الحدود المجانية.
- **مشغل الفيديو**: مشغل HTML5 الأصلي المتجاوب بالكامل (`<video controls playsinline>`) مع دعم التشغيل والإيقاف والتقديم والتحكم في الصوت وملء الشاشة.
- **البث السلس والتقديم (HTTP Range Requests)**: يدعم الخادم استجابة `HTTP 206 Partial Content` مع ترويسة `Accept-Ranges: bytes` لتمكين التقديم السريع (Seeking) دون تحميل الملف بالكامل.
- **الحماية من الملفات المهملة (No Orphaned Files)**:
  - عند استبدال فيديو بآخر جديد: يتم رفع الفيديو الجديد أولاً، ثم حذف الفيديو القديم تلقائياً من وحدة التخزين بعد نجاح الرفع.
  - عند حذف الدرس: يتم حذف ملف الفيديو المرفوع تلقائياً من وحدة التخزين.

#### 📖 خطوات رفع فيديو مباشر:
1. افتح لوحة تحكم مشرف Code Spark ثم توجه إلى **المنهج الدراسي**.
2. اضغط على **إضافة درس** أو **تعديل**.
3. اختر تبويب **📁 رفع فيديو مباشر (MP4)**.
4. اسحب وأفلت ملف الفيديو داخل المربع أو اضغط **اختيار ملف من جهازك**.
5. انتظر شريط التقدم حتى يكتمل الرفع (100%) وتظهر المعاينة المباشرة.
6. يمكنك معاينة الفيديو، أو استبداله، أو حذفه قبل الحفظ.
7. اضغط **حفظ الدرس 📖**.

---

## ⏱️ متابعة تقدم الطالب وموضع المشاهدة (Video Progress & Persistence)

- **حفظ الموضع التلقائي**: عند تشغيل فيديو الشرح (سواء YouTube أو HTML5 Upload)، يتم تتبع موضع التشغيل بالثواني وتسجيله دورياً ومخففاً (Throttled) على الخادم عبر النقطة `POST /api/progress/video`.
- **استئناف المشاهدة عبر الأجهزة (Cross-Device Resume)**: عند انتقال الطالب لجهاز آخر أو تسجيل الدخول مجدداً، يتم فتح الدرس من آخر ثانية توقف عندها (`last_position`).
- **تسجيل إكمال الدرس**: عند وصول الفيديو لنهايته، يتم تسجيل اكتمال الدرس بنجاح (`completed=true`, `progress=100`) ومنح الطالب نقاط الـ XP وإظهار احتفال النجاح.

---

## 📋 حقول تسجيل الطالب (Student Registration Form)

نموذج التسجيل مخصص فقط للحقول الأساسية المطلوبة:
1. **الاسم الكامل للطالب** (`name` - ثلاثي على الأقل)
2. **رقم هاتف الطالب** (`phone` - 11 رقم مصري / واتساب)
3. **رقم هاتف ولي الأمر** (`parent_phone` - 11 رقم)
4. **الصف الدراسي** (`grade` - الأول الثانوي / الثاني الثانوي / الثالث الثانوي)
5. **البريد الإلكتروني** (`email` - اختياري)
6. **كود تفعيل الاشتراك** (`subscription_code` - اختياري)
7. **كلمة المرور** (`password` - 6 أحرف على الأقل)
8. **تأكيد كلمة المرور** (`confirm_password`)

> 🚫 **تمت إزالة حقل "الشعبة / الفصل" (علمي / أدبي / علمي علوم / علمي رياضة) نهائياً** من الواجهة والتحقق وطلبات التسجيل ونماذج لوحة المشرف لتبسيط تجربة التسجيل للطلاب.

---

## 🚀 دليل النشر المجاني خطوة بخطوة (FREE DEPLOYMENT GUIDE)

### الخطوة 1: إنشاء مشروع Supabase المجاني
1. توجه إلى [Supabase](https://supabase.com) وأنشئ حساباً مجانياً (لا يتطلب بطاقة ائتمان).
2. أنشئ مشروعاً جديداً باسم `codespark-production`.
3. اختر كلمة مرور قوية لقاعدة البيانات واحتفظ بها في مكان آمن.
4. اختر أقرب منطقة جغرافية لجمهور المنصة (مثل `Frankfurt / eu-central-1` لمصر والشرق الأوسط).

### الخطوة 2: الحصول على رابط الاتصال (PostgreSQL Connection String)
1. من لوحة تحكم Supabase، اذهب إلى **Project Settings** > **Database**.
2. انسخ رابط الاتصال:
   - **الاتصال المباشر (Direct Connection - Port 5432)**:
     `postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?sslmode=require`
   - **أو الـ Session Pooler (Port 6543)** للبيئات السحابية ذات الاتصالات المتعددة:
     `postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require`

### الخطوة 3: (اختياري) إنشاء Storage Bucket للفيديوهات المرفوعة
1. من لوحة تحكم Supabase، توجه إلى **Storage** > **New Bucket**.
2. سمِّ الـ Bucket باسم `codespark-videos` واجعله **Public** (أو Private مع استخدام Service Role Key).
3. انسخ الـ `SUPABASE_URL` و `SUPABASE_SERVICE_ROLE_KEY` وضعها في متغيرات البيئة.

### الخطوة 4: تشغيل التهجير وبذر البيانات (Migrations & Seed)
قبل تشغيل الخادم، نفّذ الأمر التالي لإنشاء الجداول وبذر البيانات الأولية:
```bash
cd backend
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
python3 migrate.py upgrade head
python3 -c "from app.seed_data import seed_database; seed_database()"
```

### الخطوة 5: نشر الواجهة الخلفية (FastAPI on Free Compute)
يمكنك النشر على إحدى الخدمات المجانية التالية:
- **Render (Web Service Free)**:
  - اربط مستودع GitHub.
  - Build Command: `pip install -r backend/requirements.txt`
  - Start Command: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
  - أضف Environment Variables: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `CORS_ORIGINS`.
- **Koyeb Free** أو **Fly.io Free** كبدائل ممتازة.

### الخطوة 6: نشر الواجهة الأمامية على Cloudflare Pages Free
1. توجه إلى [Cloudflare Dashboard](https://dash.cloudflare.com) > **Workers & Pages**.
2. أنشئ مشروع Pages جديد واربط مستودع GitHub.
3. إعدادات البناء:
   - **Framework Preset**: None / HTML
   - **Build Command**: (فارغ - موقع ثابت مباشر)
   - **Build Output Directory**: `/` (المجلد الرئيسي)
4. تأكد من وجود ملف `_redirects` في المجلد الرئيسي لضمان توجيه مسارات الـ SPA:
   ```text
   /* /index.html 200
   ```
5. اضغط **Save and Deploy**. ستمنحك Cloudflare نطاقاً مجانياً فورياً مثل: `https://codespark.pages.dev`.

### الخطوة 7: ضبط CORS ورابط الـ API
1. في متغيرات بيئة الـ Backend (Render/Koyeb)، اضبط:
   ```env
   FRONTEND_URL=https://codespark.pages.dev
   CORS_ORIGINS=https://codespark.pages.dev
   ```
2. في الـ Frontend، حدد رابط الـ API الإنتاجي إما عبر `window.__CODESPARK_CONFIG__.API_URL` في `index.html` أو عبر إعدادات التطبيق.

---

## 💰 تحليل التكلفة والحدود المجانية (EXPECTED COST & FREE TIER LIMITS)

| المكوّن | المزود المجاني | المزايا والحدود المجانية | ما يجب الانتباه له |
|---|---|---|---|
| **الواجهة الأمامية (Frontend)** | Cloudflare Pages Free | استضافة غير محدودة للنطاق الترددي (Unlimited Bandwidth)، شبكة CDN عالمية، شهادة SSL تلقائية مجاناً | حد 500 عملية بناء شهرياً (Builds/month) |
| **قاعدة البيانات (Database)** | Supabase PostgreSQL Free | مساحة 500MB PostgreSQL، اتصالات Pooling، نسخ احتياطي يومي مجاني | يتوقف المشروع مؤقتاً (Pause) إذا انعدم النشاط لـ 7 أيام متتالية |
| **استضافة الفيديوهات (YouTube)** | YouTube Unlisted | استضافة وتدفق مجاني 100% بدون حدود تخزين وبدون استهلاك لسيرفر المنصة | يجب الالتزام بشروط استخدام YouTube واستخدام وضع Unlisted |
| **استضافة الفيديوهات (Upload)** | Supabase Storage / Local | 500MB سعة تخزين مجانية على Supabase Storage، أو مساحة القرص المحلي | حد أقصى 50MB للملف؛ يُفضل استخدام YouTube للملفات الكبيرة |
| **الواجهة الخلفية (Backend)** | Render Free / Koyeb Free | 512MB RAM، معالجة مجانية كافية للمنصة التعليمية | يدخل الخادم في وضع السكون (Sleep) بعد 15 دقيقة من انعدام الزيارات (Cold Start ~30s) |

---

## 💾 دليل النسخ الاحتياطي اليدوي لقاعدة البيانات (MANUAL BACKUP)

لحفظ نسخة احتياطية محلية من قاعدة بيانات Supabase PostgreSQL في أي وقت:
```bash
# 1. تصدير كامل البيانات والجداول إلى ملف SQL
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require" > codespark_backup_$(date +%Y%m%d).sql

# 2. استعادة النسخة الاحتياطية على أي خادم PostgreSQL
psql "postgresql://postgres:[PASSWORD]@db.[TARGET-PROJECT-REF].supabase.co:5432/postgres?sslmode=require" < codespark_backup_20260827.sql
```

---

## 🧪 تشغيل اختبارات القبول الشاملة (Running Acceptance Tests)

```bash
cd backend
python3 test_acceptance_suite.py
```

تغطي حزمة الاختبارات **24 اختبار قبول آلي شامل**:
1. فحص صحة الاتصال بقاعدة البيانات (`/api/health`)
2. تسجيل الطالب واستمرارية الحفظ العلائقي
3. تسجيل الدخول وإصدار توكنات JWT الآمنة
4. تسجيل دخول المشرف وصلاحيات الإدارة
5. تطبيق الجدار الأمني (RBAC) ومنع الطلاب من مسارات الإدارة (403)
6. إنشاء الوحدات الدراسية واسترجاعها
7. إنشاء الدروس وظهورها الفوري للطلاب
8. تسجيل إكمال الدروس ومنح نقاط الـ XP
9. دورة حياة الامتحانات ومنع تسريب الإجابات قبل التسليم
10. التصحيح الخادمي الدقيق للامتحانات ونقاط القوة والضعف
11. استمرارية الجلسة والبيانات عبر الأجهزة المختلفة
12. أمان كلمات المرور وخوارزمية PBKDF2
13. أمان محاكي Python AST ومنع الأوامر والمكتبات الخطرة
14. نظام تذاكر الدعم الأكاديمي والردود
15. إدارة الإعدادات وبنك الأسئلة
16. تسجيل الطلاب بدون حقل الشعبة/الفصل
17. استخراج وتنسيق روابط YouTube بجميع أنواعها والتضمين الآمن
18. إنشاء درس بفيديو YouTube ومعاينة المشغل
19. رفع فيديو مباشر والتحقق من الحجم والصيغة وحظر الطلاب (403)
20. تدفق وبث الفيديو المباشر واستجابة التقديم HTTP 206 Range
21. استبدال الفيديو وحذف الملف القديم تلقائياً (منع الملفات المهملة)
22. حذف الدرس وتطهير ملف الفيديو من وحدة التخزين
23. متابعة تقدم مشاهدة الفيديو واستئناف الموضع عبر الأجهزة
24. التحقق العلائقي وتأكيد خلو قاعدة البيانات من أي Video BLOBs

---
**Code Spark © 2026 — مصممة بكل فخر لطلاب البرمجة للمرحلة الثانوية ⚡**
