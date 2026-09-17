/** * Code Spark - Comprehensive Admin & Assistant Management Views * Real CRUD operations for Courses, Units, Lessons, Videos, Educational Resources, * Question Bank, Exams, Announcements, Subscriptions, Students, and Assistants. */ import ApiClient, { debounce } from '../api/apiClient.js'; import { Toast, Modal } from '../components/ui.js'; import AuthService from '../auth/authService.js'; export class AdminPages { /* =================================================================== 1. ADMIN DASHBOARD & REAL KPIS =================================================================== */ static async renderDashboard(container) { container.innerHTML = ` 

## لوحة التحكم الإدارية والتحليلات ��

نظرة عامة لحظية على أداء منصة Code Spark

[�� إدارة وتوليد الأكواد](#/admin/subscriptions) [�� إدارة المناهج](#/admin/courses) [�� إدارة الدروس](#/admin/lessons) [�� بنك الأسئلة](#/admin/questions) [�� الامتحانات](#/admin/exams)

### ⚡ أحدث الأنشطة وسجل التدقيق (Audit Logs)

### ��️ إدارة النظام والمحتوى

[�� إدارة المناهج والكورسات والوحدات](#/admin/courses) [�� إضافة وتعديل وحذف الدروس](#/admin/lessons) [�� بنك الأسئلة المركزي](#/admin/questions) [�� إنشاء وتصحيح الامتحانات](#/admin/exams) [�� نشر وإدارة الإعلانات](#/admin/announcements) [�� إدارة حسابات الطلاب](#/admin/students) [��️ صلاحيات المساعدين](#/admin/assistants) [�� أكواد الاشتراكات](#/admin/subscriptions)

`; try { const data = await ApiClient.get('/admin/dashboard'); document.getElementById('admin-kpis-grid').innerHTML = ` 

��

### ${data.total_students || 0}

إجمالي الطلاب المسجلين

��

### ${data.active_subscribers || 0}

المشتركون النشطون

��

### ${data.total_lessons || 0}

الدروس المنشورة

��

### ${data.average_score || 0}%

متوسط درجات الطلاب

`; const logs = data.recent_activity || []; document.getElementById('admin-recent-logs').innerHTML = logs.length > 0 ? logs.map(l => ` 

${l.action} (${l.entity_type})

${l.created_at ? l.created_at.substring(11, 16) : ''}

`).join('') : '

لا توجد أنشطة مسجلة حديثاً.

'; } catch (err) { console.error(err); Toast.error('تعذر تحميل بيانات لوحة الإدارة'); } } /* =================================================================== 2. COURSES & UNITS MANAGEMENT (CRUD) =================================================================== */ static async renderCourses(container) { container.innerHTML = ` 

## إدارة المناهج والكورسات والوحدات ��

إنشاء وتعديل المناهج الدراسية وهيكلة الوحدات والدروس المرتبطة بها

\+ إضافة كورس جديد

| الكورس / المنهج | الاسم التعريفي (Slug) | الوحدات التابعة | الخصوصية | الحالة | الإجراءات |
| :-: | :-: | :-: | :-: | :-: | :-: |
| جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... |

`; async function loadCourses() { try { const res = await ApiClient.get('/courses'); const courses = res.courses || []; const tbody = document.getElementById('courses-table-body'); if (courses.length === 0) { tbody.innerHTML = 'لا توجد كورسات مضافة بعد.'; return; } let rowsHtml = ''; for (const crs of courses) { const unitsRes = await ApiClient.get(`/units?course_id=${crs.id}`).catch(() => ({ units: [] })); const unitCount = unitsRes.units?.length || 0; rowsHtml += ` 

**${crs.title}** 

${crs.description ? crs.description.substring(0, 50) + '...' : ''}

${crs.slug} ${unitCount} وحدات ${crs.access_type === 'PUBLIC' ? 'عام للجميع' : 'للمشتركين فقط ��'} ${crs.is_published ? 'منشور ✅' : 'مخفي ⏸️'} 

الوحدات �� تعديل ✏️ حذف ��️

`; } tbody.innerHTML = rowsHtml; // Bind Edit Course document.querySelectorAll('.edit-course-btn').forEach(btn => { btn.addEventListener('click', () => { const crs = courses.find(x => x.id === btn.dataset.id); if (crs) openCourseModal(crs, loadCourses); }); }); // Bind Delete Course document.querySelectorAll('.del-course-btn').forEach(btn => { btn.addEventListener('click', () => { const crsId = btn.dataset.id; Modal.confirm({ title: 'تأكيد حذف الكورس', message: 'هل أنت متأكد من حذف هذا الكورس وجميع الوحدات والدروس التابعة له نهائياً؟', onConfirm: async () => { try { await ApiClient.delete(`/courses/${crsId}`); Toast.success('تم حذف الكورس بنجاح'); loadCourses(); } catch (e) { Toast.error(e.message); } } }); }); }); // Bind Manage Units document.querySelectorAll('.manage-units-btn').forEach(btn => { btn.addEventListener('click', () => { const crsId = btn.dataset.id; const crs = courses.find(x => x.id === crsId); openUnitsModal(crs, loadCourses); }); }); document.getElementById('btn-add-course').onclick = () => openCourseModal(null, loadCourses); } catch (err) { console.error(err); Toast.error('فشل تحميل قائمة الكورسات'); } } function openCourseModal(course, onSaved) { const isEdit = !!course; Modal.open({ title: isEdit ? `تعديل الكورس: ${course.title}` : 'إضافة كورس تعليمي جديد', contentHtml: ` 

عنوان الكورس / المنهج

الاسم التعريفي (Slug)

الوصف الأكاديمي ${course?.description || ''}

مستوى الوصول عام ومتاح للجميع (PUBLIC) للمشتركين فقط (SUBSCRIBERS_ONLY)

حالة النشر منشور ومتاح للطلاب ✅ مسودة غير منشورة ⏸️

${isEdit ? 'حفظ تعديلات الكورس' : 'إنشاء الكورس الآن ��'} ` }); document.getElementById('form-course-save').addEventListener('submit', async (e) => { e.preventDefault(); const payload = { title: document.getElementById('m-crs-title').value.trim(), slug: document.getElementById('m-crs-slug').value.trim() || 'course-' + Date.now(), description: document.getElementById('m-crs-desc').value.trim(), thumbnail_url: course?.thumbnail_url || '/assets/branding/app_icon.svg', order_index: course?.order_index || 1, is_published: document.getElementById('m-crs-pub').value === '1', access_type: document.getElementById('m-crs-access').value }; try { if (isEdit) { await ApiClient.put(`/courses/${course.id}`, payload); Toast.success('تم تعديل الكورس بنجاح'); } else { await ApiClient.post('/courses', payload); Toast.success('تمت إضافة الكورس بنجاح ��'); } Modal.close(); onSaved(); } catch (err) { Toast.error(err.message); } }); } async function openUnitsModal(course, onSaved) { const uRes = await ApiClient.get(`/units?course_id=${course.id}`).catch(() => ({ units: [] })); const units = uRes.units || []; Modal.open({ title: `إدارة وحدات: ${course.title}`, contentHtml: ` 

الوحدات التابعة لهذا الكورس (${units.length}) + إضافة وحدة جديدة

${units.length > 0 ? units.map(u => ` 

**${u.title}** 

${u.description || ''}

حذف

`).join('') : '

لا توجد وحدات في هذا الكورس بعد.

'}

` }); document.querySelectorAll('.m-del-unit-btn').forEach(b => { b.addEventListener('click', async () => { try { await ApiClient.delete(`/units/${b.dataset.uid}`); Toast.success('تم حذف الوحدة'); Modal.close(); openUnitsModal(course, onSaved); } catch (e) { Toast.error(e.message); } }); }); document.getElementById('sub-btn-new-unit').onclick = () => { Modal.open({ title: `إضافة وحدة جديدة لكورس: ${course.title}`, contentHtml: ` 

عنوان الوحدة

وصف الوحدة

مستوى الوصول عام للجميع للمشتركين فقط ��

إضافة الوحدة ` }); document.getElementById('form-unit-add').addEventListener('submit', async (e) => { e.preventDefault(); try { await ApiClient.post('/units', { course_id: course.id, title: document.getElementById('m-unit-title').value.trim(), description: document.getElementById('m-unit-desc').value.trim(), order_index: units.length + 1, is_published: true, access_type: document.getElementById('m-unit-acc').value }); Toast.success('تمت إضافة الوحدة بنجاح'); openUnitsModal(course, onSaved); } catch (err) { Toast.error(err.message); } }); }; } await loadCourses(); } /* =================================================================== 3. LESSONS MANAGEMENT (Full CRUD for Admin & Assistants) =================================================================== */ static async renderLessons(container) { container.innerHTML = ` 

## إدارة الدروس والفيديوهات ��

إضافة وتعديل وحذف الدروس وتحديد خصوصية المشاهدة ومصادر الفيديوهات والمذكرات

\+ إضافة درس جديد

جميع الوحدات كافة مستويات الوصول عام ومجاني للمشتركين فقط

| ترتيب | عنوان الدرس | الوحدة | نوع الفيديو | الخصوصية | الحالة | المدة | الإجراءات |
| :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... |

`; async function loadLessons() { try { const [lessons, coursesRes] = await Promise.all([ ApiClient.get('/lessons'), ApiClient.get('/courses') ]); const courses = coursesRes.courses || []; let allUnits = []; if (courses.length > 0) { for (const c of courses) { const uRes = await ApiClient.get(`/units?course_id=${c.id}`).catch(() => ({ units: [] })); if (uRes.units) allUnits = allUnits.concat(uRes.units); } } // Populate unit dropdown filter const unitSelect = document.getElementById('filter-lesson-unit'); if (unitSelect && unitSelect.options.length <= 1) { allUnits.forEach(u => { const opt = document.createElement('option'); opt.value = u.id; opt.textContent = u.title; unitSelect.appendChild(opt); }); } const searchQuery = document.getElementById('filter-lesson-search')?.value.toLowerCase().trim() || ''; const selectedUnit = document.getElementById('filter-lesson-unit')?.value || ''; const selectedAccess = document.getElementById('filter-lesson-access')?.value || ''; let filtered = lessons; if (searchQuery) { filtered = filtered.filter(l => l.title.toLowerCase().includes(searchQuery) || (l.description && l.description.toLowerCase().includes(searchQuery))); } if (selectedUnit) { filtered = filtered.filter(l => l.unit_id === selectedUnit); } if (selectedAccess) { filtered = filtered.filter(l => l.access_type === selectedAccess); } const tbody = document.getElementById('lessons-table-body'); if (!filtered || filtered.length === 0) { tbody.innerHTML = 'لا توجد دروس تطابق خيارات البحث.'; return; } tbody.innerHTML = filtered.map(l => { const unitObj = allUnits.find(u => u.id === l.unit_id); return ` **#${l.order_index || 1}** **${l.title}** 

${l.slug}

${unitObj?.title || 'الوحدة الأساسية'} ${l.video_type === 'youtube' ? 'YouTube ��' : (l.video_type === 'uploaded' ? 'رفع مباشر ��' : 'بدون فيديو')} ${l.access_type === 'PUBLIC' ? 'عام' : 'مشتركين ��'} ${l.is_published ? 'منشور ✅' : 'مسودة ⏸️'} ${Math.round((l.duration_seconds || 0) / 60)} دقيقة 

تعديل ✏️ حذف ��️

`; }).join(''); // Bind Edit Lesson document.querySelectorAll('.edit-lesson-btn').forEach(btn => { btn.addEventListener('click', () => { const les = lessons.find(x => x.id === btn.dataset.id); if (les) openLessonFormModal(les, allUnits, loadLessons); }); }); // Bind Delete Lesson document.querySelectorAll('.del-lesson-btn').forEach(btn => { btn.addEventListener('click', () => { const lesId = btn.dataset.id; Modal.confirm({ title: 'تأكيد حذف الدرس', message: 'هل أنت متأكد من رغبتك في حذف هذا الدرس وجميع التمارين والمرفقات التابعة له نهائياً؟', onConfirm: async () => { try { await ApiClient.delete(`/lessons/${lesId}`); Toast.success('تم حذف الدرس بنجاح'); loadLessons(); } catch (e) { Toast.error(e.message); } } }); }); }); // Toggle published state document.querySelectorAll('.toggle-pub-btn').forEach(btn => { btn.addEventListener('click', async () => { const les = lessons.find(x => x.id === btn.dataset.id); if (!les) return; const newPub = les.is_published === 1 ? false : true; try { await ApiClient.put(`/lessons/${les.id}`, { ...les, is_published: newPub }); Toast.success(newPub ? 'تم نشر الدرس' : 'تم إلغاء نشر الدرس'); loadLessons(); } catch (e) { Toast.error(e.message); } }); }); document.getElementById('btn-add-lesson').onclick = () => openLessonFormModal(null, allUnits, loadLessons); } catch (err) { console.error(err); Toast.error('فشل تحميل قائمة الدروس'); } } function openLessonFormModal(lesson, units, onSaved) { const isEdit = !!lesson; Modal.open({ title: isEdit ? `تعديل الدرس: ${lesson.title}` : 'إضافة درس تعليمي جديد', contentHtml: ` 

الوحدة التعليمية التابع لها الدرس ${units.map(u => ` ${u.title} `).join('')}

عنوان الدرس

الاسم التعريفي (Slug)

نوع الفيديو ومصدره يوتيوب (YouTube URL) رفع فيديو مباشر من الجهاز (Upload Video File) بدون فيديو (نص ومذكرات فقط)

رابط الفيديو أو معرف اليوتيوب

رفع ملف الفيديو مباشرة (MP4, WebM)

مستوى الوصول متاح للجميع (PUBLIC) للمشتركين فقط ��

المدة المقدرة (دقيقة)

الترتيب داخل الوحدة

شرح الدرس وملاحظات المحاضرة (Markdown) ${lesson?.content_markdown || ''}

${isEdit ? 'حفظ تعديلات الدرس' : 'إضافة ونشر الدرس الآن ��'} ` }); // Video type toggle const vtypeSelect = document.getElementById('m-les-vtype'); const vurlBox = document.getElementById('video-url-container'); const vfileBox = document.getElementById('video-upload-container'); vtypeSelect.addEventListener('change', () => { if (vtypeSelect.value === 'uploaded') { vurlBox.style.display = 'none'; vfileBox.style.display = 'block'; } else if (vtypeSelect.value === 'youtube') { vurlBox.style.display = 'block'; vfileBox.style.display = 'none'; } else { vurlBox.style.display = 'none'; vfileBox.style.display = 'none'; } }); if (lesson?.video_type === 'uploaded') { vtypeSelect.dispatchEvent(new Event('change')); } document.getElementById('form-lesson-save').addEventListener('submit', async (e) => { e.preventDefault(); let vUrl = document.getElementById('m-les-vurl').value.trim(); let vId = null; // Check if uploaded video const vFile = document.getElementById('m-les-vfile')?.files[0]; if (vtypeSelect.value === 'uploaded' && vFile) { const fd = new FormData(); fd.append('file', vFile); Toast.info('جاري رفع ملف الفيديو...'); try { const upRes = await ApiClient.upload('/resources/upload', fd); vUrl = upRes.file_url; } catch (err) { Toast.error('فشل رفع الفيديو: ' + err.message); return; } } else if (vtypeSelect.value === 'youtube') { if (vUrl.includes('v=')) { vId = vUrl.split('v=')[1].split('&')[0]; } else if (vUrl.includes('youtu.be/')) { vId = vUrl.split('youtu.be/')[1].split('?')[0]; } else if (vUrl.length === 11 && !vUrl.includes('/')) { vId = vUrl; } } const payload = { unit_id: document.getElementById('m-les-unit').value, title: document.getElementById('m-les-title').value.trim(), slug: document.getElementById('m-les-slug').value.trim() || 'lesson-' + Date.now(), description: document.getElementById('m-les-title').value.trim(), content_markdown: document.getElementById('m-les-content').value, video_type: vtypeSelect.value, video_url: vUrl, video_id: vId, duration_seconds: (parseFloat(document.getElementById('m-les-dur').value) || 10) * 60, order_index: parseInt(document.getElementById('m-les-ord').value) || 1, access_type: document.getElementById('m-les-access').value, is_published: true }; try { if (isEdit) { await ApiClient.put(`/lessons/${lesson.id}`, payload); Toast.success('تم تعديل الدرس بنجاح'); } else { await ApiClient.post('/lessons', payload); Toast.success('تمت إضافة ونشر الدرس بنجاح ��'); } Modal.close(); onSaved(); } catch (err) { Toast.error(err.message); } }); } document.getElementById('filter-lesson-search')?.addEventListener('input', debounce(loadLessons, 300)); document.getElementById('filter-lesson-unit')?.addEventListener('change', loadLessons); document.getElementById('filter-lesson-access')?.addEventListener('change', loadLessons); await loadLessons(); } /* =================================================================== 4. QUESTION BANK MANAGEMENT (Full CRUD for Admin & Assistants) =================================================================== */ static async renderQuestionBank(container) { container.innerHTML = ` 

## بنك الأسئلة المركزي ��

إضافة وتعديل وحذف أسئلة الاختيار من متعدد والصواب والخطأ وتحليل الأكواد وتصنيفها

\+ إضافة سؤال جديد

جميع الصعوبات سهل (Easy) متوسط (Medium) صعب (Hard) جميع الأنواع اختيار من متعدد (MCQ) صح أو خطأ (True/False) تحليل كود برمجى

| نص السؤال | النوع | الصعوبة | الموضوع | الإجابة الصحيحة | الإجراءات |
| :-: | :-: | :-: | :-: | :-: | :-: |
| جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... |

`; async function loadQuestions() { const search = document.getElementById('filter-q-search')?.value || ''; const diff = document.getElementById('filter-q-diff')?.value || ''; const qtype = document.getElementById('filter-q-type')?.value || ''; let url = `/questions?`; if (search) url += `search=${encodeURIComponent(search)}&`; if (diff) url += `difficulty=${diff}&`; if (qtype) urlUESTS MANAGEMENT (ADMIN & ASSISTANTS) =================================================================== */ static async renderSubscriptionRequests(container) { container.innerHTML = ` 

## �� مراجعة واعتماد طلبات تفعيل الاشتراكات

متابعة تحويلات InstaPay وإيصالات الطلاب واعتماد تفعيل الحسابات فورياً

[⚙️ إعدادات الباقات وأرقام الدفع](#/admin/settings) [�� أكواد الاشتراكات](#/admin/subscriptions)

جميع الحالات قيد المراجعة والانتظار (Pending) ⏳ المعتمدة والمفعلة (Approved) ✅ المرفوضة (Rejected) ❌

| الطالب | الهاتف | الباقة والمدة | المبلغ المسدد | رقم العملية / المرجع | الإيصال المرفق | تاريخ التحويل | الحالة | الإجراءات |
| :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... | جاري التحميل... |

### معاينة إيصال التحويل ��️

✕ إغلاق

`; const proofModal = document.getElementById('proof-modal'); const proofImg = document.getElementById('proof-modal-img'); const proofCaption = document.getElementById('proof-modal-caption'); document.getElementById('close-proof-modal')?.addEventListener('click', () => { if (proofModal) proofModal.style.display = 'none'; }); proofModal?.addEventListener('click', (e) => { if (e.target === proofModal) proofModal.style.display = 'none'; }); async function loadRequests() { const status = document.getElementById('filter-sub-req-status')?.value || ''; const search = document.getElementById('filter-sub-req-search')?.value.toLowerCase().trim() || ''; let url = '/subscriptions/requests'; if (status) url += `?status_filter=${status}`; try { const requests = await ApiClient.get(url); const tbody = document.getElementById('sub-req-table-body'); let filtered = requests || []; if (search) { filtered = filtered.filter(r => (r.student_name && r.student_name.toLowerCase().includes(search)) || (r.student_email && r.student_email.toLowerCase().includes(search)) || (r.phone && r.phone.includes(search)) || (r.payment_reference && r.payment_reference.toLowerCase().includes(search)) ); } if (filtered.length === 0) { tbody.innerHTML = 'لا توجد طلبات تطابق الفلتر المحدد.'; return; } tbody.innerHTML = filtered.map(r => ` **${r.student_name || 'طالب'}** 

${r.student_email}

${r.phone || '—'} ${r.package_name} ${r.duration_months ? `

${r.duration_months} أشهر

` : ''} ${r.amount ? `${r.amount} ج.م` : '—'} ${r.payment_reference} ${r.admin_notes ? `

ملاحظة: ${r.admin_notes}

` : ''} ${r.proof_file_url ? ` ��️ عرض الإيصال ` : 'بدون إيصال'} ${r.transfer_date || r.created_at?.substring(0, 10)} ${r.status === 'APPROVED' ? 'معتمد ومفعل ✅' : (r.status === 'PENDING' ? 'قيد الانتظار ⏳' : 'مرفوض ❌')} 

${r.status === 'PENDING' ? ` اعتماد ✅ رفض ❌ ` : ` تم اتخاذ القرار `}

`).join(''); document.querySelectorAll('.view-proof-btn').forEach(btn => { btn.addEventListener('click', () => { if (proofImg && proofModal) { proofImg.src = btn.dataset.url; if (proofCaption) proofCaption.textContent = `إيصال الطالب: ${btn.dataset.name} | رقم المرجع: ${btn.dataset.ref}`; proofModal.style.display = 'flex'; } }); }); document.querySelectorAll('.approve-req-btn').forEach(btn => { btn.addEventListener('click', () => { const reqId = btn.dataset.id; Modal.confirm({ title: 'تأكيد اعتماد وتفعيل الاشتراك', message: 'هل أنت متأكد من صحة التحويل؟ سيتم تفعيل حساب الطالب في قاعدة البيانات فوراً وفتح كافة المناهج والامتحانات.', onConfirm: async () => { try { const res = await ApiClient.post(`/subscriptions/requests/${reqId}/approve`); Toast.success(res.message || 'تم اعتماد وتفعيل الاشتراك بنجاح ��'); loadRequests(); } catch (err) { Toast.error(err.message); } } }); }); }); document.querySelectorAll('.reject-req-btn').forEach(btn => { btn.addEventListener('click', () => { const reqId = btn.dataset.id; const reason = prompt('أدخل سبب رفض الطلب لإخطار الطالب به:', 'بيانات التحويل غير مطابقة أو العملية غير مكتملة'); if (reason !== null) { ApiClient.post(`/subscriptions/requests/${reqId}/reject`, { rejection_reason: reason.trim() || 'بيانات التحويل غير صحيحة' }) .then(res => { Toast.success('تم رفض الطلب وإخطار الطالب'); loadRequests(); }) .catch(err => Toast.error(err.message)); } }); }); } catch (err) { console.error(err); Toast.error('فشل تحميل قائمة طلبات الاشتراكات'); } } document.getElementById('filter-sub-req-status')?.addEventListener('change', loadRequests); document.getElementById('filter-sub-req-search')?.addEventListener('input', debounce(loadRequests, 300)); await loadRequests(); } /* =================================================================== 11. ADMIN PLATFORM SETTINGS & 11-PLAN SUBSCRIPTION MANAGEMENT =================================================================== */ static async renderSettings(container) { container.innerHTML = ` 

## ⚙️ إعدادات المنصة وإدارة باقات الاشتراكات

تحكم كامل في أرقام التحويل المعتمدة وتعديل أسعار ومدد باقات الاشتراكات (1 إلى 11 شهراً)

### �� رقم التحويل وبيانات السداد (InstaPay / المحافظ)

الرقم الذي يظهر لجميع الطلاب في صفحة الاشتراك. عند تعديل هذا الرقم يتم حفظه في قاعدة البيانات ويظهر تلقائياً للطلاب فوراً دون الحاجة لتعديل أي كود برمجي.

رقم التحويل المعتمد للطلاب (Transfer/Payment Phone) *

رقم التواصل والدعم الفني (WhatsApp Phone)

الرابط المباشر لتطبيق InstaPay

�� حفظ بيانات الدفع في قاعدة البيانات

### �� إدارة باقات الاشتراكات الأكاديمية (11 باقة معتمدة)

يمكنك تعديل أسعار الباقات أو تفعيلها/تعطيلها. المعاملات السابقة تظل محمية بالمبلغ الأصلي المسدد.

\+ إضافة باقة اشتراك جديدة

| المدة (شهور) | اسم الباقة | السعر (ج.م) | ترتيب العرض | الحالة | إجمالي الطلبات | الإجراءات |
| :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| جاري تحميل الباقات... | جاري تحميل الباقات... | جاري تحميل الباقات... | جاري تحميل الباقات... | جاري تحميل الباقات... | جاري تحميل الباقات... | جاري تحميل الباقات... |

### إضافة باقة اشتراك جديدة

✕

اسم الباقة *

المدة بالشهور *

السعر (ج.م) *

ترتيب العرض

إلغاء حفظ الباقة الجديدة ✨

`; async function loadPaymentSettings() { try { const sett = await ApiClient.get('/subscriptions/payment-info'); const phoneInput = document.getElementById('admin-set-payment-phone'); const contactInput = document.getElementById('admin-set-contact-phone'); const linkInput = document.getElementById('admin-set-instapay-link'); if (phoneInput && sett.payment_phone) phoneInput.value = sett.payment_phone; if (contactInput && sett.contact_phone) contactInput.value = sett.contact_phone; if (linkInput && sett.instapay_link) linkInput.value = sett.instapay_link; } catch (e) { console.error(e); } } document.getElementById('admin-payment-settings-form')?.addEventListener('submit', async (e) => { e.preventDefault(); const phoneVal = document.getElementById('admin-set-payment-phone').value.trim(); const contactVal = document.getElementById('admin-set-contact-phone').value.trim(); const linkVal = document.getElementById('admin-set-instapay-link').value.trim(); const btn = document.getElementById('btn-save-payment-settings'); btn.disabled = true; btn.textContent = 'جاري الحفظ...'; try { const res = await ApiClient.put('/subscriptions/admin/payment-info', { payment_phone: phoneVal, contact_phone: contactVal, instapay_link: linkVal }); Toast.success(res.message || 'تم تحديث بيانات التحويل بنجاح! ستظهر للطلاب فوراً.'); } catch (err) { Toast.error(err.message || 'تعذر تحديث بيانات التحويل'); } finally { btn.disabled = false; btn.textContent = '�� حفظ بيانات الدفع في قاعدة البيانات'; } }); async function loadAdminPlans() { const tbody = document.getElementById('admin-plans-table-body'); try { const plans = await ApiClient.get('/subscriptions/admin/plans'); if (!plans || plans.length === 0) { tbody.innerHTML = 'لا توجد باقات معرفة.'; return; } tbody.innerHTML = plans.map(p => ` ${p.duration_months} شهر 

ج.م

${p.is_active ? 'مفعلة ✅' : 'معطلة ❌'} ${p.total_requests || 0} طلب 

حفظ �� حذف ��️

`).join(''); tbody.querySelectorAll('tr').forEach(tr => { const planId = tr.dataset.planId; const nameInput = tr.querySelector('.plan-name-input'); const priceInput = tr.querySelector('.plan-price-input'); const orderInput = tr.querySelector('.plan-order-input'); const toggleBtn = tr.querySelector('.toggle-plan-active-btn'); const saveBtn = tr.querySelector('.save-plan-row-btn'); const delBtn = tr.querySelector('.delete-plan-row-btn'); toggleBtn?.addEventListener('click', async () => { const currentActive = toggleBtn.dataset.active === '1'; const newActive = !currentActive; try { await ApiClient.put(`/subscriptions/admin/plans/${planId}`, { is_active: newActive }); Toast.success(newActive ? 'تم تفعيل الباقة بنجاح' : 'تم تعطيل الباقة بنجاح'); loadAdminPlans(); } catch (err) { Toast.error(err.message); } }); saveBtn?.addEventListener('click', async () => { const newName = nameInput.value.trim(); const newPrice = parseFloat(priceInput.value); const newOrder = parseInt(orderInput.value) || 0; if (!newName || isNaN(newPrice) || newPrice < 0) { Toast.error('يرجى إدخال اسم وسعر صحيح'); return; } saveBtn.disabled = true; saveBtn.textContent = '...'; try { await ApiClient.put(`/subscriptions/admin/plans/${planId}`, { name: newName, price: newPrice, order_index: newOrder }); Toast.success('تم حفظ تعديلات الباقة بنجاح!'); } catch (err) { Toast.error(err.message); } finally { saveBtn.disabled = false; saveBtn.textContent = 'حفظ ��'; } }); delBtn?.addEventListener('click', () => { Modal.confirm({ title: 'تأكيد إزالة أو تعطيل الباقة', message: 'هل تريد إزالة هذه الباقة؟ إذا كانت هناك طلبات سابقة مسجلة بها، فسيتم تعطيلها بأمان للحفاظ على سجلات الطلاب.', onConfirm: async () => { try { const res = await ApiClient.delete(`/subscriptions/admin/plans/${planId}`); Toast.success(res.message || 'تم حذف الباقة بنجاح'); loadAdminPlans(); } catch (err) { Toast.error(err.message); } } }); }); }); } catch (err) { console.error(err); tbody.innerHTML = 'فشل تحميل الباقات'; } } const addPlanModal = document.getElementById('add-plan-modal'); document.getElementById('btn-open-add-plan-modal')?.addEventListener('click', () => { if (addPlanModal) addPlanModal.style.display = 'flex'; }); document.getElementById('close-add-plan-modal')?.addEventListener('click', () => { if (addPlanModal) addPlanModal.style.display = 'none'; }); document.getElementById('cancel-add-plan')?.addEventListener('click', () => { if (addPlanModal) addPlanModal.style.display = 'none'; }); document.getElementById('form-add-new-plan')?.addEventListener('submit', async (e) => { e.preventDefault(); const name = document.getElementById('new-plan-name').value.trim(); const months = parseInt(document.getElementById('new-plan-months').value); const price = parseFloat(document.getElementById('new-plan-price').value); const order = parseInt(document.getElementById('new-plan-order').value) || months; if (!name || isNaN(months) || isNaN(price)) { Toast.error('يرجى ملء جميع الحقول المطلوبة بشكل صحيح'); return; } try { const res = await ApiClient.post('/subscriptions/admin/plans', { name: name, duration_months: months, price: price, order_index: order }); Toast.success(res.message || 'تمت إضافة الباقة بنجاح! ✨'); if (addPlanModal) addPlanModal.style.display = 'none'; document.getElementById('form-add-new-plan').reset(); loadAdminPlans(); } catch (err) { Toast.error(err.message || 'تعذر إنشاء الباقة'); } }); await Promise.all([loadPaymentSettings(), loadAdminPlans()]); } }