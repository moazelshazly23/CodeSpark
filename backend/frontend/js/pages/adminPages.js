/**
 * Code Spark - Admin & Assistant Pages Controller
 * Full CRUD for Curriculum, Exams, Questions, Files, Announcements,
 * Subscriptions, Payment Settings, and Account Security.
 */
import ApiClient, { debounce } from '../api/apiClient.js';
import { Toast, Modal } from '../components/ui.js';
import AuthService from '../auth/authService.js';

export class AdminPages {

  // =========================================================================
  // 1. DASHBOARD & KPIS
  // =========================================================================
  static async renderDashboard(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">لوحة الإحصائيات والإشراف العام 📊</h1>
          <p class="page-subtitle">متابعة نشاط الطلاب، الاشتراكات، والعمليات الأكاديمية لحظيًا</p>
        </div>
        <div style="display:flex;gap:0.75rem;">
          <a href="#/admin/payment-settings" class="btn btn-primary">💳 طرق الدفع والاشتراك</a>
          <a href="#/admin/lessons" class="btn btn-secondary">🎬 إضافة درس جديد</a>
        </div>
      </div>

      <div class="stats-grid" id="admin-kpis-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(14,165,233,0.15);color:var(--color-primary);">👥</div>
          <div>
            <div class="stat-val" id="kpi-students">—</div>
            <div class="stat-label">إجمالي الطلاب المسجلين</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(16,185,129,0.15);color:var(--color-success);">⭐</div>
          <div>
            <div class="stat-val" id="kpi-subscribed">—</div>
            <div class="stat-label">الطلاب المشتركون النشطون</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(245,158,11,0.15);color:var(--color-warning);">📥</div>
          <div>
            <div class="stat-val" id="kpi-pending-reqs">—</div>
            <div class="stat-label">طلبات اشتراك معلقة</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(139,92,246,0.15);color:#8B5CF6;">📚</div>
          <div>
            <div class="stat-val" id="kpi-courses">—</div>
            <div class="stat-label">المناهج والدروس المنشورة</div>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1.5rem;margin-top:2rem;">
        <div class="card">
          <h3 style="font-size:1.15rem;margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;">
            <span>⚡</span> الإجراءات السريعة
          </h3>
          <div style="display:flex;flex-direction:column;gap:0.75rem;">
            <a href="#/admin/announcements" class="btn btn-secondary" style="justify-content:flex-start;">📢 نشر إعلان عام للطلاب</a>
            <a href="#/admin/subscription-requests" class="btn btn-secondary" style="justify-content:flex-start;">📥 مراجعة طلبات التحويل البنكي والمحافظ</a>
            <a href="#/admin/subscriptions" class="btn btn-secondary" style="justify-content:flex-start;">🔑 توليد أكواد تفعيل جديدة</a>
            <a href="#/admin/questions" class="btn btn-secondary" style="justify-content:flex-start;">❓ إضافة أسئلة لبنك الأسئلة</a>
            <a href="#/admin/payment-settings" class="btn btn-secondary" style="justify-content:flex-start;">⚙️ ضبط أرقام فودافون كاش وإنستاباي</a>
          </div>
        </div>

        <div class="card">
          <h3 style="font-size:1.15rem;margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;">
            <span>🛡️</span> حالة النظام وبيانات التشغيل
          </h3>
          <p style="color:var(--color-text-muted);font-size:0.9rem;line-height:1.7;">
            • محرك قواعد البيانات يعمل بنمط <strong>SQLite WAL</strong> فائق السرعة والموثوقية.<br>
            • معالجة آمنة لطلبات التحويل المالي وإشعارات الطلاب التلقائية.<br>
            • عزل محكم لصلاحيات المساعدين التعليميين ومنع العمليات الحساسة.<br>
            • الحفظ الفوري والدائم لكافة الإعدادات والبيانات المسجلة.
          </p>
        </div>
      </div>
    `;

    try {
      const stats = await ApiClient.get('/admin/stats').catch(() => ApiClient.get('/admin/dashboard'));
      if (stats) {
        const setVal = (id, val) => {
          const el = document.getElementById(id);
          if (el) el.textContent = val !== undefined ? val : 0;
        };
        setVal('kpi-students', stats.students_count);
        setVal('kpi-subscribed', stats.subscribed_count);
        setVal('kpi-pending-reqs', stats.pending_subscription_requests);
        setVal('kpi-courses', `${stats.courses_count || 0} كورس / ${stats.lessons_count || 0} درس`);
      }
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    }
  }

  // =========================================================================
  // 2. COURSES & CURRICULUM CRUD
  // =========================================================================
  static async renderCourses(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">المناهج والكورسات 🎓</h1>
          <p class="page-subtitle">إدارة المناهج الدراسية، الوحدات، والمسارات التعليمية</p>
        </div>
        <button id="btn-add-course" class="btn btn-primary">+ إضافة كورس جديد</button>
      </div>

      <div class="card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>عنوان الكورس</th>
                <th>الاسم البرمجي (Slug)</th>
                <th>نوع الوصول</th>
                <th>الحالة</th>
                <th>الترتيب</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody id="courses-table-body">
              <tr><td colspan="6" style="text-align:center;padding:2rem;">جاري تحميل الكورسات...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    async function loadCourses() {
      try {
        const res = await ApiClient.get('/courses');
        const courses = ApiClient.extractList(res, 'courses');
        const tbody = document.getElementById('courses-table-body');
        if (!courses || courses.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--color-text-muted);">لا توجد كورسات مضافة بعد. اضغط على "+ إضافة كورس جديد" للبدء.</td></tr>';
          return;
        }

        tbody.innerHTML = courses.map(c => `
          <tr>
            <td>
              <strong>${c.title}</strong>
              ${c.description ? `<div style="font-size:0.8rem;color:var(--color-text-muted);">${c.description.substring(0, 45)}...</div>` : ''}
            </td>
            <td><code>${c.slug || '—'}</code></td>
            <td>
              <span class="badge ${c.access_type === 'PUBLIC' ? 'badge-success' : 'badge-primary'}">
                ${c.access_type === 'PUBLIC' ? 'عام مجاني' : 'للمشتركين فقط ⭐'}
              </span>
            </td>
            <td>
              <span class="badge ${c.is_published ? 'badge-success' : 'badge-warning'}">
                ${c.is_published ? 'منشور ✅' : 'مسودة ⏸️'}
              </span>
            </td>
            <td>${c.order_index !== undefined ? c.order_index : 0}</td>
            <td>
              <button class="btn btn-secondary btn-sm edit-course-btn" data-id="${c.id}">تعديل ✏️</button>
              <button class="btn btn-danger btn-sm del-course-btn" data-id="${c.id}">حذف 🗑️</button>
            </td>
          </tr>
        `).join('');

        tbody.querySelectorAll('.edit-course-btn').forEach(b => {
          b.addEventListener('click', () => {
            const course = courses.find(x => x.id === b.dataset.id);
            if (course) openCourseModal(course);
          });
        });

        tbody.querySelectorAll('.del-course-btn').forEach(b => {
          b.addEventListener('click', () => {
            const courseId = b.dataset.id;
            Modal.confirm({
              title: 'تأكيد حذف الكورس',
              message: 'هل أنت متأكد من رغبتك في حذف هذا الكورس وجميع الوحدات المرتبطة به؟',
              onConfirm: async () => {
                try {
                  await ApiClient.delete(`/courses/${courseId}`);
                  Toast.success('تم حذف الكورس بنجاح');
                  loadCourses();
                } catch (err) {
                  Toast.error(err.message || 'فشل حذف الكورس');
                }
              }
            });
          });
        });
      } catch (err) {
        console.error(err);
        Toast.error('فشل تحميل قائمة المناهج والكورسات');
      }
    }

    function openCourseModal(course = null) {
      const isEdit = !!course;
      Modal.open({
        title: isEdit ? 'تعديل بيانات الكورس' : 'إضافة كورس تعليمي جديد',
        contentHtml: `
          <form id="form-course-save">
            <div class="form-group">
              <label class="form-label">عنوان الكورس *</label>
              <input type="text" id="m-crs-title" class="form-control" required value="${course?.title || ''}" placeholder="مثال: مدخل إلى البرمجة بلغة بايثون">
            </div>
            <div class="form-group">
              <label class="form-label">الاسم التعريفي (Slug) *</label>
              <input type="text" id="m-crs-slug" class="form-control" required value="${course?.slug || ''}" placeholder="مثال: intro-to-python">
            </div>
            <div class="form-group">
              <label class="form-label">وصف الكورس</label>
              <textarea id="m-crs-desc" class="form-control" rows="3" placeholder="نبذة مختصرة عن أهداف الكورس والموضوعات المغطاة">${course?.description || ''}</textarea>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div class="form-group">
                <label class="form-label">نوع الوصول</label>
                <select id="m-crs-access" class="form-control">
                  <option value="PUBLIC" ${course?.access_type === 'PUBLIC' ? 'selected' : ''}>عام ومتاح للجميع</option>
                  <option value="SUBSCRIBERS_ONLY" ${course?.access_type === 'SUBSCRIBERS_ONLY' ? 'selected' : ''}>للمشتركين فقط ⭐</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">ترتيب العرض</label>
                <input type="number" id="m-crs-order" class="form-control" value="${course?.order_index || 1}" min="0">
              </div>
            </div>
            <div class="form-group" style="margin-top:0.5rem;">
              <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                <input type="checkbox" id="m-crs-pub" ${course ? (course.is_published ? 'checked' : '') : 'checked'}>
                <span>نشر الكورس وجعله مرئيًا للطلاب الآن</span>
              </label>
            </div>
            <div class="modal-actions" style="margin-top:1.5rem;">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('app-modal').style.display='none'">إلغاء</button>
              <button type="submit" class="btn btn-primary">${isEdit ? 'حفظ التعديلات' : 'إنشاء الكورس الآن'}</button>
            </div>
          </form>
        `
      });

      document.getElementById('form-course-save').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          title: document.getElementById('m-crs-title').value.trim(),
          slug: document.getElementById('m-crs-slug').value.trim(),
          description: document.getElementById('m-crs-desc').value.trim(),
          access_type: document.getElementById('m-crs-access').value,
          order_index: parseInt(document.getElementById('m-crs-order').value) || 0,
          is_published: document.getElementById('m-crs-pub').checked
        };

        try {
          if (isEdit) {
            await ApiClient.put(`/courses/${course.id}`, payload);
            Toast.success('تم تحديث بيانات الكورس بنجاح');
          } else {
            await ApiClient.post('/courses', payload);
            Toast.success('تم إنشاء الكورس بنجاح 🎉');
          }
          Modal.close();
          loadCourses();
        } catch (err) {
          Toast.error(err.message || 'فشل حفظ الكورس');
        }
      });
    }

    document.getElementById('btn-add-course').addEventListener('click', () => openCourseModal());
    await loadCourses();
  }

  // =========================================================================
  // 3. LESSONS & VIDEOS CRUD
  // =========================================================================
  static async renderLessons(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">إدارة الدروس والفيديوهات 📚</h1>
          <p class="page-subtitle">إضافة وتعديل شروحات الفيديو والدروس النصية وربطها بالوحدات التعليمية</p>
        </div>
        <button id="btn-add-lesson" class="btn btn-primary">+ إضافة درس جديد</button>
      </div>

      <div class="card" style="margin-bottom:1.5rem;">
        <div style="display:flex;flex-wrap:wrap;gap:1rem;align-items:center;">
          <div style="flex:1;min-width:250px;">
            <label class="form-label" style="font-size:0.85rem;">تصفية حسب الكورس الدراسي</label>
            <select id="filter-lesson-course" class="form-control">
              <option value="">جميع الكورسات والمناهج</option>
            </select>
          </div>
          <div style="flex:1;min-width:250px;">
            <label class="form-label" style="font-size:0.85rem;">بحث عن درس</label>
            <input type="text" id="filter-lesson-search" class="form-control" placeholder="ابحث بعنوان الدرس...">
          </div>
        </div>
      </div>

      <div class="card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>عنوان الدرس</th>
                <th>الوحدة / الكورس</th>
                <th>نوع الفيديو</th>
                <th>المدة</th>
                <th>الوصول</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody id="lessons-table-body">
              <tr><td colspan="7" style="text-align:center;padding:2rem;">جاري تحميل الدروس...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    let allCourses = [];
    let allUnits = [];
    let allLessons = [];

    async function loadData() {
      try {
        const [cRes, uRes, lRes] = await Promise.all([
          ApiClient.get('/courses').catch(() => ({ courses: [] })),
          ApiClient.get('/units').catch(() => ({ units: [] })),
          ApiClient.get('/lessons').catch(() => ({ lessons: [] }))
        ]);

        allCourses = ApiClient.extractList(cRes, 'courses');
        allUnits = ApiClient.extractList(uRes, 'units');
        allLessons = ApiClient.extractList(lRes, 'lessons');

        const courseSelect = document.getElementById('filter-lesson-course');
        if (courseSelect) {
          courseSelect.innerHTML = '<option value="">جميع الكورسات والمناهج</option>' +
            allCourses.map(c => `<option value="${c.id}">${c.title}</option>`).join('');
        }

        renderLessonsTable();
      } catch (err) {
        console.error(err);
        Toast.error('فشل تحميل بيانات الدروس والمناهج');
      }
    }

    function renderLessonsTable() {
      const selectedCourseId = document.getElementById('filter-lesson-course')?.value || '';
      const search = (document.getElementById('filter-lesson-search')?.value || '').toLowerCase().trim();
      const tbody = document.getElementById('lessons-table-body');
      if (!tbody) return;

      let filtered = allLessons;
      if (selectedCourseId) {
        const unitIdsInCourse = allUnits.filter(u => u.course_id === selectedCourseId).map(u => u.id);
        filtered = filtered.filter(l => unitIdsInCourse.includes(l.unit_id));
      }
      if (search) {
        filtered = filtered.filter(l => (l.title || '').toLowerCase().includes(search));
      }

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--color-text-muted);">لا توجد دروس مطابقة. اضغط على "+ إضافة درس جديد".</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(l => {
        const unit = allUnits.find(u => u.id === l.unit_id);
        const course = unit ? allCourses.find(c => c.id === unit.course_id) : null;
        return `
          <tr>
            <td>
              <strong>${l.title}</strong>
              ${l.description ? `<div style="font-size:0.8rem;color:var(--color-text-muted);">${l.description.substring(0, 40)}...</div>` : ''}
            </td>
            <td>
              <div>${unit?.title || 'وحدة غير محددة'}</div>
              <div style="font-size:0.75rem;color:var(--color-primary);">${course?.title || ''}</div>
            </td>
            <td>
              <span class="badge ${l.video_type === 'youtube' ? 'badge-danger' : 'badge-secondary'}">
                ${l.video_type === 'youtube' ? 'YouTube 📺' : 'مرفوع 🎥'}
              </span>
            </td>
            <td>${l.duration_minutes || Math.round((l.duration_seconds || 0)/60) || '—'} دقيقة</td>
            <td>
              <span class="badge ${l.is_free ? 'badge-success' : 'badge-primary'}">
                ${l.is_free ? 'مجاني 🎁' : 'للمشتركين ⭐'}
              </span>
            </td>
            <td>
              <span class="badge ${l.is_published ? 'badge-success' : 'badge-warning'}">
                ${l.is_published ? 'منشور ✅' : 'مسودة ⏸️'}
              </span>
            </td>
            <td>
              <button class="btn btn-secondary btn-sm edit-lesson-btn" data-id="${l.id}">تعديل ✏️</button>
              <button class="btn btn-danger btn-sm del-lesson-btn" data-id="${l.id}">حذف 🗑️</button>
            </td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('.edit-lesson-btn').forEach(b => {
        b.addEventListener('click', () => {
          const lesson = allLessons.find(x => x.id === b.dataset.id);
          if (lesson) openLessonModal(lesson);
        });
      });

      tbody.querySelectorAll('.del-lesson-btn').forEach(b => {
        b.addEventListener('click', () => {
          const lessonId = b.dataset.id;
          Modal.confirm({
            title: 'تأكيد حذف الدرس',
            message: 'هل أنت متأكد من رغبتك في حذف هذا الدرس؟ لن يتمكن الطلاب من مشاهدته بعد الحذف.',
            onConfirm: async () => {
              try {
                await ApiClient.delete(`/lessons/${lessonId}`);
                Toast.success('تم حذف الدرس بنجاح');
                loadData();
              } catch (err) {
                Toast.error(err.message || 'فشل حذف الدرس');
              }
            }
          });
        });
      });
    }

    function openLessonModal(lesson = null) {
      const isEdit = !!lesson;
      let targetUnit = lesson ? allUnits.find(u => u.id === lesson.unit_id) : allUnits[0];
      let selectedCourseId = targetUnit ? targetUnit.course_id : (allCourses[0]?.id || '');

      Modal.open({
        title: isEdit ? 'تعديل بيانات الدرس التعليمي' : 'إضافة درس تعليمي جديد',
        contentHtml: `
          <form id="form-lesson-save">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div class="form-group">
                <label class="form-label">الكورس التابع له *</label>
                <select id="m-les-course" class="form-control" required>
                  ${allCourses.map(c => `<option value="${c.id}" ${c.id === selectedCourseId ? 'selected' : ''}>${c.title}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">الوحدة التعليمية *</label>
                <select id="m-les-unit" class="form-control" required></select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">عنوان الدرس *</label>
              <input type="text" id="m-les-title" class="form-control" required value="${lesson?.title || ''}" placeholder="مثال: المتغيرات وأنواع البيانات في بايثون">
            </div>

            <div style="display:grid;grid-template-columns:1fr 2fr;gap:1rem;">
              <div class="form-group">
                <label class="form-label">نوع الفيديو</label>
                <select id="m-les-vtype" class="form-control">
                  <option value="youtube" ${lesson?.video_type === 'youtube' ? 'selected' : ''}>رابط YouTube</option>
                  <option value="embedded" ${lesson?.video_type === 'embedded' ? 'selected' : ''}>مشغل داخلي / فيديو مباشر</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">رابط الفيديو (URL) *</label>
                <input type="url" id="m-les-vurl" class="form-control" required value="${lesson?.video_url || ''}" placeholder="https://www.youtube.com/watch?v=...">
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div class="form-group">
                <label class="form-label">مدة الفيديو (بالدقائق)</label>
                <input type="number" id="m-les-dur" class="form-control" min="1" value="${lesson?.duration_minutes || Math.round((lesson?.duration_seconds||0)/60) || 15}">
              </div>
              <div class="form-group">
                <label class="form-label">ترتيب العرض</label>
                <input type="number" id="m-les-order" class="form-control" min="0" value="${lesson?.order_index !== undefined ? lesson.order_index : 1}">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">الشرح المكتوب والأكواد التوضيحية (Markdown / Text)</label>
              <textarea id="m-les-content" class="form-control" rows="5" placeholder="# عنوان الشرح\nاكتب تفاصيل الدرس ومقتطفات الأكواد هنا...">${lesson?.content_markdown || ''}</textarea>
            </div>

            <div style="display:flex;gap:2rem;margin-top:0.75rem;">
              <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                <input type="checkbox" id="m-les-free" ${lesson?.is_free ? 'checked' : ''}>
                <span>درس تجريبي مجاني (متاح لغير المشتركين)</span>
              </label>
              <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                <input type="checkbox" id="m-les-pub" ${lesson ? (lesson.is_published ? 'checked' : '') : 'checked'}>
                <span>نشر الدرس وإتاحته للطلاب فورًا</span>
              </label>
            </div>

            <div class="modal-actions" style="margin-top:1.5rem;">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('app-modal').style.display='none'">إلغاء</button>
              <button type="submit" class="btn btn-primary">${isEdit ? 'حفظ تعديلات الدرس' : 'إضافة ونشر الدرس الآن'}</button>
            </div>
          </form>
        `
      });

      const updateUnitOptions = (crsId) => {
        const unitsInCourse = allUnits.filter(u => u.course_id === crsId);
        const unitSelect = document.getElementById('m-les-unit');
        if (unitsInCourse.length === 0) {
          unitSelect.innerHTML = '<option value="">لا توجد وحدات في هذا الكورس بعد</option>';
        } else {
          unitSelect.innerHTML = unitsInCourse.map(u => `
            <option value="${u.id}" ${lesson?.unit_id === u.id ? 'selected' : ''}>${u.title}</option>
          `).join('');
        }
      };

      const courseSelect = document.getElementById('m-les-course');
      courseSelect.addEventListener('change', () => updateUnitOptions(courseSelect.value));
      updateUnitOptions(selectedCourseId);

      document.getElementById('form-lesson-save').addEventListener('submit', async (e) => {
        e.preventDefault();
        const unitId = document.getElementById('m-les-unit').value;
        if (!unitId) {
          Toast.error('يرجى اختيار الوحدة التعليمية أو إضافة وحدة للكورس أولاً');
          return;
        }

        const durMin = parseInt(document.getElementById('m-les-dur').value) || 15;
        const payload = {
          unit_id: unitId,
          title: document.getElementById('m-les-title').value.trim(),
          video_type: document.getElementById('m-les-vtype').value,
          video_url: document.getElementById('m-les-vurl').value.trim(),
          duration_minutes: durMin,
          duration_seconds: durMin * 60,
          order_index: parseInt(document.getElementById('m-les-order').value) || 0,
          content_markdown: document.getElementById('m-les-content').value,
          is_free: document.getElementById('m-les-free').checked,
          is_published: document.getElementById('m-les-pub').checked
        };

        try {
          if (isEdit) {
            await ApiClient.put(`/lessons/${lesson.id}`, payload);
            Toast.success('تم تحديث الدرس بنجاح');
          } else {
            await ApiClient.post('/lessons', payload);
            Toast.success('تم إنشاء ونشر الدرس بنجاح 🎉');
          }
          Modal.close();
          loadData();
        } catch (err) {
          Toast.error(err.message || 'فشل حفظ الدرس');
        }
      });
    }

    document.getElementById('btn-add-lesson').addEventListener('click', () => openLessonModal());
    document.getElementById('filter-lesson-course')?.addEventListener('change', renderLessonsTable);
    document.getElementById('filter-lesson-search')?.addEventListener('input', debounce(renderLessonsTable, 300));
    await loadData();
  }

  // =========================================================================
  // 4. STUDY FILES & GOOGLE DRIVE CRUD
  // =========================================================================
  static async renderStudyFiles(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">الملفات والمذكرات الدراسية 📁</h1>
          <p class="page-subtitle">رفع وإدارة مذكرات الشرح، ملخصات PDF، وملفات التمارين وروابط Google Drive</p>
        </div>
        <button id="btn-add-file" class="btn btn-primary">+ إضافة ملف أو رابط Drive</button>
      </div>

      <div class="card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>عنوان الملف</th>
                <th>المصدر والنوع</th>
                <th>مستوى الوصول</th>
                <th>الحالة</th>
                <th>تاريخ الإضافة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody id="files-table-body">
              <tr><td colspan="6" style="text-align:center;padding:2rem;">جاري تحميل الملفات...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    async function loadFiles() {
      try {
        const res = await ApiClient.get('/files');
        const files = ApiClient.extractList(res, 'files');
        const tbody = document.getElementById('files-table-body');
        if (!files || files.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--color-text-muted);">لا توجد ملفات أو مذكرات مضافة حاليًا.</td></tr>';
          return;
        }

        tbody.innerHTML = files.map(f => {
          const isDrive = f.source_type === 'google_drive' || (f.external_url && f.external_url.includes('drive.google.com'));
          return `
            <tr>
              <td>
                <strong>${f.title}</strong>
                ${f.description ? `<div style="font-size:0.8rem;color:var(--color-text-muted);">${f.description.substring(0, 45)}...</div>` : ''}
              </td>
              <td>
                <span class="badge ${isDrive ? 'badge-primary' : 'badge-secondary'}">
                  ${isDrive ? 'Google Drive ☁️' : 'ملف مباشر 📄'}
                </span>
              </td>
              <td>
                <span class="badge ${f.visibility === 'PUBLIC' ? 'badge-success' : 'badge-warning'}">
                  ${f.visibility === 'PUBLIC' ? 'عام للجميع' : 'للمشتركين فقط ⭐'}
                </span>
              </td>
              <td>
                <span class="badge ${f.is_published ? 'badge-success' : 'badge-danger'}">
                  ${f.is_published ? 'منشور ✅' : 'مخفي ⏸️'}
                </span>
              </td>
              <td style="font-size:0.85rem;">${f.created_at ? f.created_at.substring(0, 10) : '—'}</td>
              <td>
                ${f.external_url ? `<a href="${f.external_url}" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration:none;">معاينة ↗️</a>` : ''}
                <button class="btn btn-danger btn-sm del-file-btn" data-id="${f.id}">حذف 🗑️</button>
              </td>
            </tr>
          `;
        }).join('');

        tbody.querySelectorAll('.del-file-btn').forEach(b => {
          b.addEventListener('click', () => {
            const fileId = b.dataset.id;
            Modal.confirm({
              title: 'تأكيد حذف الملف',
              message: 'هل أنت متأكد من رغبتك في حذف هذا الملف؟ لن يتمكن الطلاب من تحميله بعد الحذف.',
              onConfirm: async () => {
                try {
                  await ApiClient.delete(`/files/${fileId}`);
                  Toast.success('تم حذف الملف بنجاح');
                  loadFiles();
                } catch (err) {
                  Toast.error(err.message || 'فشل حذف الملف');
                }
              }
            });
          });
        });
      } catch (err) {
        console.error(err);
        Toast.error('فشل تحميل قائمة الملفات');
      }
    }

    function openFileModal() {
      Modal.open({
        title: 'إضافة مذكرة دراسية أو رابط Google Drive',
        contentHtml: `
          <form id="form-file-save">
            <div class="form-group">
              <label class="form-label">عنوان المذكرة / الملف *</label>
              <input type="text" id="m-file-title" class="form-control" required placeholder="مثال: مذكرة التراكيب البيانية والخوارزميات (PDF)">
            </div>
            <div class="form-group">
              <label class="form-label">الوصف التعليمي للملف</label>
              <textarea id="m-file-desc" class="form-control" rows="2" placeholder="وصف محتوى الملف وإرشادات المذاكرة..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">نوع المصدر</label>
              <select id="m-file-stype" class="form-control">
                <option value="google_drive">رابط Google Drive مباشر</option>
                <option value="external_url">رابط خارجي مباشر (PDF/Doc/Zip)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">الرابط المباشر (URL) *</label>
              <input type="url" id="m-file-url" class="form-control" required placeholder="https://drive.google.com/file/d/...">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div class="form-group">
                <label class="form-label">مستوى الوصول للطلاب</label>
                <select id="m-file-vis" class="form-control">
                  <option value="PUBLIC">متاح لجميع الطلاب (مجاني)</option>
                  <option value="SUBSCRIBERS_ONLY">متاح للمشتركين فقط ⭐</option>
                </select>
              </div>
              <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:0.5rem;">
                <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                  <input type="checkbox" id="m-file-pub" checked>
                  <span>نشر الملف فورًا</span>
                </label>
              </div>
            </div>
            <div class="modal-actions" style="margin-top:1.5rem;">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('app-modal').style.display='none'">إلغاء</button>
              <button type="submit" class="btn btn-primary">حفظ ونشر الملف 🚀</button>
            </div>
          </form>
        `
      });

      document.getElementById('form-file-save').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          title: document.getElementById('m-file-title').value.trim(),
          description: document.getElementById('m-file-desc').value.trim(),
          source_type: document.getElementById('m-file-stype').value,
          external_url: document.getElementById('m-file-url').value.trim(),
          visibility: document.getElementById('m-file-vis').value,
          is_published: document.getElementById('m-file-pub').checked
        };

        try {
          await ApiClient.post('/files', payload);
          Toast.success('تمت إضافة الملف ونشره بنجاح 🎉');
          Modal.close();
          loadFiles();
        } catch (err) {
          Toast.error(err.message || 'فشل حفظ الملف');
        }
      });
    }

    document.getElementById('btn-add-file').addEventListener('click', openFileModal);
    await loadFiles();
  }

  // =========================================================================
  // 5. QUESTION BANK CRUD
  // =========================================================================
  static async renderQuestionBank(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">بنك الأسئلة المركزي ❓</h1>
          <p class="page-subtitle">إنشاء وإدارة وتصنيف أسئلة الاختيار من متعدد والصواب والخطأ وتحليل الأكواد</p>
        </div>
        <button id="btn-add-question" class="btn btn-primary">+ إضافة سؤال جديد</button>
      </div>

      <div class="card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>نص السؤال</th>
                <th>النوع</th>
                <th>مستوى الصعوبة</th>
                <th>الموضوع</th>
                <th>الإجابة الصحيحة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody id="questions-table-body">
              <tr><td colspan="6" style="text-align:center;padding:2rem;">جاري تحميل الأسئلة...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    async function loadQuestions() {
      try {
        const res = await ApiClient.get('/questions');
        const questions = ApiClient.extractList(res, 'questions');
        const tbody = document.getElementById('questions-table-body');
        if (!questions || questions.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--color-text-muted);">بنك الأسئلة فارغ حاليًا. اضغط على "+ إضافة سؤال جديد".</td></tr>';
          return;
        }

        tbody.innerHTML = questions.map(q => `
          <tr>
            <td><strong>${q.question_text}</strong></td>
            <td>
              <span class="badge badge-secondary">
                ${q.question_type === 'multiple_choice' ? 'اختيار من متعدد' : (q.question_type === 'true_false' ? 'صح أو خطأ' : 'تحليل كود')}
              </span>
            </td>
            <td>
              <span class="badge ${q.difficulty === 'easy' ? 'badge-success' : (q.difficulty === 'medium' ? 'badge-warning' : 'badge-danger')}">
                ${q.difficulty === 'easy' ? 'سهل' : (q.difficulty === 'medium' ? 'متوسط' : 'متقدم')}
              </span>
            </td>
            <td>${q.topic || 'عام'}</td>
            <td><code>${q.correct_answer || '—'}</code></td>
            <td>
              <button class="btn btn-danger btn-sm del-question-btn" data-id="${q.id}">حذف 🗑️</button>
            </td>
          </tr>
        `).join('');

        tbody.querySelectorAll('.del-question-btn').forEach(b => {
          b.addEventListener('click', () => {
            const qId = b.dataset.id;
            Modal.confirm({
              title: 'تأكيد حذف السؤال',
              message: 'هل أنت متأكد من رغبتك في حذف هذا السؤال من بنك الأسئلة؟',
              onConfirm: async () => {
                try {
                  await ApiClient.delete(`/questions/${qId}`);
                  Toast.success('تم حذف السؤال بنجاح');
                  loadQuestions();
                } catch (err) {
                  Toast.error(err.message || 'فشل حذف السؤال');
                }
              }
            });
          });
        });
      } catch (err) {
        console.error(err);
        Toast.error('فشل تحميل أسئلة بنك الأسئلة');
      }
    }

    function openQuestionModal() {
      Modal.open({
        title: 'إضافة سؤال جديد لبنك الأسئلة',
        contentHtml: `
          <form id="form-question-save">
            <div class="form-group">
              <label class="form-label">نص السؤال *</label>
              <textarea id="m-q-text" class="form-control" rows="3" required placeholder="اكتب نص السؤال بدقة..."></textarea>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div class="form-group">
                <label class="form-label">نوع السؤال</label>
                <select id="m-q-type" class="form-control">
                  <option value="multiple_choice">اختيار من متعدد (MCQ)</option>
                  <option value="true_false">صح أو خطأ (True / False)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">مستوى الصعوبة</label>
                <select id="m-q-diff" class="form-control">
                  <option value="easy">سهل (Easy)</option>
                  <option value="medium" selected>متوسط (Medium)</option>
                  <option value="hard">متقدم (Hard)</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">موضوع السؤال (Topic)</label>
              <input type="text" id="m-q-topic" class="form-control" placeholder="مثال: المتغيرات والقوائم">
            </div>
            <div class="form-group">
              <label class="form-label">الخيارات (JSON Format)</label>
              <textarea id="m-q-opts" class="form-control" rows="3">[{"id":"opt1","text":"الخيار الأول"},{"id":"opt2","text":"الخيار الثاني"}]</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">معرّف الإجابة الصحيحة (Correct Answer) *</label>
              <input type="text" id="m-q-ans" class="form-control" required value="opt1" placeholder="مثال: opt1 أو true">
            </div>
            <div class="modal-actions" style="margin-top:1.5rem;">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('app-modal').style.display='none'">إلغاء</button>
              <button type="submit" class="btn btn-primary">حفظ السؤال في البنك 💾</button>
            </div>
          </form>
        `
      });

      document.getElementById('form-question-save').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          question_text: document.getElementById('m-q-text').value.trim(),
          question_type: document.getElementById('m-q-type').value,
          difficulty: document.getElementById('m-q-diff').value,
          topic: document.getElementById('m-q-topic').value.trim() || 'عام',
          options_json: document.getElementById('m-q-opts').value.trim(),
          correct_answer: document.getElementById('m-q-ans').value.trim()
        };

        try {
          await ApiClient.post('/questions', payload);
          Toast.success('تمت إضافة السؤال بنجاح 🎉');
          Modal.close();
          loadQuestions();
        } catch (err) {
          Toast.error(err.message || 'فشل حفظ السؤال');
        }
      });
    }

    document.getElementById('btn-add-question').addEventListener('click', openQuestionModal);
    await loadQuestions();
  }

  // =========================================================================
  // 6. EXAMS & AUTO-GRADING
  // =========================================================================
  static async renderExams(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">الامتحانات والتصحيح الآلي 📝</h1>
          <p class="page-subtitle">إنشاء الامتحانات، ضبط أزمنة الإجابة، ومتابعة درجات ومحاولات الطلاب</p>
        </div>
        <button id="btn-add-exam" class="btn btn-primary">+ إنشاء امتحان جديد</button>
      </div>

      <div class="card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>عنوان الامتحان</th>
                <th>المدة</th>
                <th>درجة النجاح</th>
                <th>المحاولات المسموحة</th>
                <th>الوصول</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody id="exams-table-body">
              <tr><td colspan="7" style="text-align:center;padding:2rem;">جاري تحميل الامتحانات...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    async function loadExams() {
      try {
        const res = await ApiClient.get('/exams');
        const exams = ApiClient.extractList(res, 'exams');
        const tbody = document.getElementById('exams-table-body');
        if (!exams || exams.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--color-text-muted);">لا توجد امتحانات مضافة حاليًا. اضغط على "+ إنشاء امتحان جديد".</td></tr>';
          return;
        }

        tbody.innerHTML = exams.map(ex => `
          <tr>
            <td>
              <strong>${ex.title}</strong>
              ${ex.description ? `<div style="font-size:0.8rem;color:var(--color-text-muted);">${ex.description.substring(0, 45)}...</div>` : ''}
            </td>
            <td>${ex.duration_minutes} دقيقة</td>
            <td>${ex.passing_score}%</td>
            <td>${ex.max_attempts} محاولة</td>
            <td>
              <span class="badge ${ex.access_type === 'PUBLIC' ? 'badge-success' : 'badge-primary'}">
                ${ex.access_type === 'PUBLIC' ? 'عام مجاني' : 'للمشتركين ⭐'}
              </span>
            </td>
            <td>
              <span class="badge ${ex.is_published ? 'badge-success' : 'badge-warning'}">
                ${ex.is_published ? 'منشور ✅' : 'مسودة ⏸️'}
              </span>
            </td>
            <td>
              <button class="btn btn-danger btn-sm del-exam-btn" data-id="${ex.id}">حذف 🗑️</button>
            </td>
          </tr>
        `).join('');

        tbody.querySelectorAll('.del-exam-btn').forEach(b => {
          b.addEventListener('click', () => {
            const exId = b.dataset.id;
            Modal.confirm({
              title: 'تأكيد حذف الامتحان',
              message: 'هل أنت متأكد من رغبتك في حذف هذا الامتحان؟ لن يتمكن الطلاب من دخوله بعد الحذف.',
              onConfirm: async () => {
                try {
                  await ApiClient.delete(`/exams/${exId}`);
                  Toast.success('تم حذف الامتحان بنجاح');
                  loadExams();
                } catch (err) {
                  Toast.error(err.message || 'فشل حذف الامتحان');
                }
              }
            });
          });
        });
      } catch (err) {
        console.error(err);
        Toast.error('فشل تحميل قائمة الامتحانات');
      }
    }

    function openExamModal() {
      Modal.open({
        title: 'إنشاء امتحان جديد',
        contentHtml: `
          <form id="form-exam-save">
            <div class="form-group">
              <label class="form-label">عنوان الامتحان *</label>
              <input type="text" id="m-ex-title" class="form-control" required placeholder="مثال: الاختبار الشامل لوحدة التراكيب البيانية">
            </div>
            <div class="form-group">
              <label class="form-label">وصف الامتحان والتعليمات</label>
              <textarea id="m-ex-desc" class="form-control" rows="2" placeholder="اكتب تعليمات الاختبار وتنبيهات الوقت للطلاب..."></textarea>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
              <div class="form-group">
                <label class="form-label">المدة (بالدقائق)</label>
                <input type="number" id="m-ex-dur" class="form-control" value="45" min="5" required>
              </div>
              <div class="form-group">
                <label class="form-label">درجة النجاح (%)</label>
                <input type="number" id="m-ex-pass" class="form-control" value="60" min="1" max="100" required>
              </div>
              <div class="form-group">
                <label class="form-label">أقصى محاولات</label>
                <input type="number" id="m-ex-att" class="form-control" value="2" min="1" required>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div class="form-group">
                <label class="form-label">مستوى الوصول</label>
                <select id="m-ex-access" class="form-control">
                  <option value="PUBLIC">متاح لجميع الطلاب</option>
                  <option value="SUBSCRIBERS_ONLY">للمشتركين فقط ⭐</option>
                </select>
              </div>
              <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:0.5rem;">
                <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                  <input type="checkbox" id="m-ex-pub" checked>
                  <span>نشر الامتحان وجعله متاحًا فورًا</span>
                </label>
              </div>
            </div>
            <div class="modal-actions" style="margin-top:1.5rem;">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('app-modal').style.display='none'">إلغاء</button>
              <button type="submit" class="btn btn-primary">إنشاء الامتحان الآن 🚀</button>
            </div>
          </form>
        `
      });

      document.getElementById('form-exam-save').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          title: document.getElementById('m-ex-title').value.trim(),
          description: document.getElementById('m-ex-desc').value.trim(),
          duration_minutes: parseInt(document.getElementById('m-ex-dur').value) || 45,
          passing_score: parseFloat(document.getElementById('m-ex-pass').value) || 60.0,
          max_attempts: parseInt(document.getElementById('m-ex-att').value) || 1,
          access_type: document.getElementById('m-ex-access').value,
          is_published: document.getElementById('m-ex-pub').checked,
          questions: []
        };

        try {
          await ApiClient.post('/exams', payload);
          Toast.success('تم إنشاء الامتحان بنجاح 🎉');
          Modal.close();
          loadExams();
        } catch (err) {
          Toast.error(err.message || 'فشل إنشاء الامتحان');
        }
      });
    }

    document.getElementById('btn-add-exam').addEventListener('click', openExamModal);
    await loadExams();
  }

  // =========================================================================
  // 7. ANNOUNCEMENTS CRUD (Fixed & Verified)
  // =========================================================================
  static async renderAnnouncements(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">إدارة ونشر الإعلانات العامة 📢</h1>
          <p class="page-subtitle">بث التنبيهات والأخبار الموجهة للطلاب وتحديثها لحظيًا في لوحة المتابعة</p>
        </div>
        <button id="btn-add-announcement" class="btn btn-primary">+ نشر إعلان جديد</button>
      </div>

      <div class="card">
        <div id="announcements-cards-list" style="display:flex;flex-direction:column;gap:1rem;">
          <div style="text-align:center;padding:2rem;color:var(--color-text-muted);">جاري تحميل الإعلانات...</div>
        </div>
      </div>
    `;

    async function loadAnnouncements() {
      const listEl = document.getElementById('announcements-cards-list');
      if (!listEl) return;

      try {
        const res = await ApiClient.get('/announcements');
        const announcements = ApiClient.extractList(res, 'announcements');

        if (!announcements || announcements.length === 0) {
          listEl.innerHTML = '<div style="text-align:center;padding:2.5rem;color:var(--color-text-muted);">لا توجد إعلانات عامة منشورة حاليًا. اضغط على زر "+ نشر إعلان جديد" بالأعلى لنشر أول إعلان.</div>';
          return;
        }

        listEl.innerHTML = announcements.map(a => `
          <div style="background:var(--color-surface-hover);border:1px solid var(--color-border);border-radius:0.75rem;padding:1.25rem;display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;">
            <div style="flex:1;">
              <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
                <h3 style="font-size:1.1rem;font-weight:700;color:var(--color-text);margin:0;">${a.title}</h3>
                <span class="badge ${a.is_urgent ? 'badge-danger' : 'badge-primary'}">
                  ${a.is_urgent ? 'عاجل ⚠️' : 'إعلان عام 📢'}
                </span>
                <span class="badge ${a.is_published ? 'badge-success' : 'badge-warning'}">
                  ${a.is_published ? 'منشور ✅' : 'مسودة ⏸️'}
                </span>
              </div>
              <p style="color:var(--color-text-muted);font-size:0.95rem;line-height:1.6;white-space:pre-wrap;margin:0 0 0.75rem 0;">${a.content}</p>
              <div style="font-size:0.8rem;color:var(--color-text-dim);">
                📅 تاريخ النشر: ${a.created_at ? a.created_at.substring(0, 16).replace('T', ' ') : '—'}
              </div>
            </div>
            <div style="display:flex;gap:0.5rem;">
              <button class="btn btn-secondary btn-sm edit-ann-btn" data-id="${a.id}">تعديل ✏️</button>
              <button class="btn btn-danger btn-sm del-ann-btn" data-id="${a.id}">حذف 🗑️</button>
            </div>
          </div>
        `).join('');

        listEl.querySelectorAll('.edit-ann-btn').forEach(b => {
          b.addEventListener('click', () => {
            const ann = announcements.find(x => x.id === b.dataset.id);
            if (ann) openAnnouncementModal(ann);
          });
        });

        listEl.querySelectorAll('.del-ann-btn').forEach(b => {
          b.addEventListener('click', () => {
            const annId = b.dataset.id;
            Modal.confirm({
              title: 'تأكيد حذف الإعلان',
              message: 'هل أنت متأكد من رغبتك في حذف هذا الإعلان؟ لن يظهر للطلاب بعد الحذف.',
              onConfirm: async () => {
                try {
                  await ApiClient.delete(`/announcements/${annId}`);
                  Toast.success('تم حذف الإعلان بنجاح');
                  loadAnnouncements();
                } catch (err) {
                  Toast.error(err.message || 'فشل حذف الإعلان');
                }
              }
            });
          });
        });
      } catch (err) {
        console.error('Error loading announcements:', err);
        Toast.error('فشل تحميل قائمة الإعلانات');
      }
    }

    function openAnnouncementModal(ann = null) {
      const isEdit = !!ann;
      Modal.open({
        title: isEdit ? 'تعديل الإعلان العام' : 'نشر إعلان عام جديد للطلاب',
        contentHtml: `
          <form id="form-ann-save">
            <div class="form-group">
              <label class="form-label">عنوان الإعلان *</label>
              <input type="text" id="m-ann-title" class="form-control" required value="${ann?.title || ''}" placeholder="مثال: موعد الاختبار الشامل القادم">
            </div>
            <div class="form-group">
              <label class="form-label">نص الإعلان بالتفصيل *</label>
              <textarea id="m-ann-content" class="form-control" rows="5" required placeholder="اكتب تفاصيل وتوجيهات الإعلان بوضوح للطلاب...">${ann?.content || ''}</textarea>
            </div>
            <div style="display:flex;gap:2rem;margin-top:0.75rem;">
              <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                <input type="checkbox" id="m-ann-urgent" ${ann?.is_urgent ? 'checked' : ''}>
                <span>إعلان هام وعاجل (تظليل بلون مميز ⚠️)</span>
              </label>
              <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                <input type="checkbox" id="m-ann-pub" ${ann ? (ann.is_published ? 'checked' : '') : 'checked'}>
                <span>نشر الإعلان للطلاب فورًا</span>
              </label>
            </div>
            <div class="modal-actions" style="margin-top:1.5rem;">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('app-modal').style.display='none'">إلغاء</button>
              <button type="submit" class="btn btn-primary">${isEdit ? 'حفظ تعديلات الإعلان' : 'نشر الإعلان الآن 📢'}</button>
            </div>
          </form>
        `
      });

      document.getElementById('form-ann-save').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          title: document.getElementById('m-ann-title').value.trim(),
          content: document.getElementById('m-ann-content').value.trim(),
          is_urgent: document.getElementById('m-ann-urgent').checked,
          is_published: document.getElementById('m-ann-pub').checked,
          target_audience: 'ALL'
        };

        try {
          if (isEdit) {
            await ApiClient.put(`/announcements/${ann.id}`, payload);
            Toast.success('تم تحديث الإعلان بنجاح');
          } else {
            await ApiClient.post('/announcements', payload);
            Toast.success('تم نشر الإعلان بنجاح 🎉');
          }
          Modal.close();
          loadAnnouncements();
        } catch (err) {
          Toast.error(err.message || 'فشل حفظ الإعلان');
        }
      });
    }

    document.getElementById('btn-add-announcement').addEventListener('click', () => openAnnouncementModal());
    await loadAnnouncements();
  }

  // =========================================================================
  // 8. SUBSCRIPTION REQUESTS REVIEW & APPROVAL
  // =========================================================================
  static async renderSubscriptionRequests(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">طلبات الاشتراكات وإيصالات الدفع 📥</h1>
          <p class="page-subtitle">مراجعة إيصالات التحويل البنكي وفودافون كاش وإنستاباي وتفعيل الحسابات فورًا</p>
        </div>
      </div>

      <div class="card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>اسم الطالب</th>
                <th>الباقة المطلوبة</th>
                <th>المبلغ المحول</th>
                <th>طريقة الدفع والرقم</th>
                <th>المرجع والتحويل</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody id="sub-requests-table-body">
              <tr><td colspan="7" style="text-align:center;padding:2rem;">جاري تحميل طلبات الاشتراكات...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    async function loadRequests() {
      try {
        const res = await ApiClient.get('/subscriptions/requests');
        const reqs = ApiClient.extractList(res, 'requests');
        const tbody = document.getElementById('sub-requests-table-body');
        if (!reqs || reqs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--color-text-muted);">لا توجد طلبات اشتراك مسجلة حاليًا.</td></tr>';
          return;
        }

        tbody.innerHTML = reqs.map(r => `
          <tr>
            <td>
              <strong>${r.student_name || 'طالب'}</strong>
              <div style="font-size:0.8rem;color:var(--color-text-muted);">${r.phone || ''}</div>
            </td>
            <td><strong>${r.package_name || `${r.duration_months} أشهر`}</strong></td>
            <td><strong>${r.amount} ج.م</strong></td>
            <td>
              <span class="badge badge-primary">${r.payment_method || 'فودافون كاش'}</span>
              <div style="font-size:0.8rem;color:var(--color-text-muted);">${r.payment_number || '—'}</div>
            </td>
            <td><code>${r.payment_reference || '—'}</code></td>
            <td>
              <span class="badge ${r.status === 'APPROVED' ? 'badge-success' : (r.status === 'REJECTED' ? 'badge-danger' : 'badge-warning')}">
                ${r.status === 'APPROVED' ? 'معتمد ومفعل ✅' : (r.status === 'REJECTED' ? 'مرفوض ❌' : 'قيد المراجعة ⏳')}
              </span>
            </td>
            <td>
              ${r.status === 'PENDING' ? `
                <button class="btn btn-success btn-sm approve-req-btn" data-id="${r.id}">تفعيل واعتماد ✅</button>
                <button class="btn btn-danger btn-sm reject-req-btn" data-id="${r.id}">رفض ❌</button>
              ` : `
                <span style="font-size:0.85rem;color:var(--color-text-dim);">مكتمل</span>
              `}
            </td>
          </tr>
        `).join('');

        tbody.querySelectorAll('.approve-req-btn').forEach(b => {
          b.addEventListener('click', () => {
            const reqId = b.dataset.id;
            Modal.confirm({
              title: 'تأكيد تفعيل الاشتراك',
              message: 'هل تم التأكد من استلام المبلغ المحول؟ سيتم تفعيل حساب الطالب فورا وفتح كافة المناهج والامتحانات.',
              onConfirm: async () => {
                try {
                  await ApiClient.post(`/subscriptions/requests/${reqId}/review`, {
                    action: 'approve',
                    admin_notes: 'تم استلام التحويل وتفعيل الاشتراك بنجاح'
                  }).catch(() => ApiClient.post(`/subscriptions/requests/${reqId}/approve`));
                  Toast.success('تم تفعيل اشتراك الطالب بنجاح! 🚀');
                  loadRequests();
                } catch (err) {
                  Toast.error(err.message || 'فشل تفعيل الاشتراك');
                }
              }
            });
          });
        });

        tbody.querySelectorAll('.reject-req-btn').forEach(b => {
          b.addEventListener('click', () => {
            const reqId = b.dataset.id;
            const reason = prompt('أدخل سبب رفض الطلب لإشعار الطالب به:', 'بيانات التحويل غير مطابقة أو لم يتم العثور على المبلغ');
            if (reason !== null) {
              ApiClient.post(`/subscriptions/requests/${reqId}/review`, {
                action: 'reject',
                admin_notes: reason.trim() || 'بيانات التحويل غير صحيحة'
              }).catch(() => ApiClient.post(`/subscriptions/requests/${reqId}/reject`, { rejection_reason: reason.trim() }))
              .then(() => {
                Toast.success('تم رفض الطلب وتحديث الحالة');
                loadRequests();
              })
              .catch(err => Toast.error(err.message || 'فشل رفض الطلب'));
            }
          });
        });
      } catch (err) {
        console.error(err);
        Toast.error('فشل تحميل قائمة طلبات الاشتراكات');
      }
    }

    await loadRequests();
  }

  // =========================================================================
  // 9. SUBSCRIPTION CODES MANAGEMENT
  // =========================================================================
  static async renderSubscriptions(container) {
    const user = AuthService.getUser();
    const isAdmin = user?.role === 'admin';

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">أكواد تفعيل الاشتراكات 🔑</h1>
          <p class="page-subtitle">توليد أكواد التفعيل الأكاديمية ومتابعة الأكواد المستخدمة والصالحة</p>
        </div>
        <button id="btn-gen-code" class="btn btn-primary">+ توليد كود اشتراك جديد</button>
      </div>

      <div class="card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>كود الاشتراك</th>
                <th>نوع المدة</th>
                <th>عدد الأيام</th>
                <th>الحالة</th>
                <th>المستخدم المستفيد</th>
                <th>تاريخ التوليد</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody id="codes-table-body">
              <tr><td colspan="7" style="text-align:center;padding:2rem;">جاري تحميل الأكواد...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    async function loadCodes() {
      try {
        const res = await ApiClient.get('/subscriptions/codes');
        const codes = ApiClient.extractList(res, 'codes');
        const tbody = document.getElementById('codes-table-body');
        if (!codes || codes.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--color-text-muted);">لا توجد أكواد مولدة بعد.</td></tr>';
          return;
        }

        tbody.innerHTML = codes.map(c => `
          <tr>
            <td><code><strong>${c.code}</strong></code></td>
            <td><span class="badge badge-primary">${c.duration_type}</span></td>
            <td>${c.duration_days} يوم</td>
            <td>
              <span class="badge ${c.status === 'ACTIVE' ? 'badge-success' : (c.status === 'USED' ? 'badge-secondary' : 'badge-danger')}">
                ${c.status === 'ACTIVE' ? 'نشط وغير مستخدم' : (c.status === 'USED' ? 'تم الاستخدام' : 'منتهي / معطل')}
              </span>
            </td>
            <td>${c.used_by || '—'}</td>
            <td style="font-size:0.85rem;">${c.created_at ? c.created_at.substring(0, 10) : '—'}</td>
            <td>
              <button class="btn btn-secondary btn-sm copy-code-btn" data-code="${c.code}">نسخ 📋</button>
            </td>
          </tr>
        `).join('');

        tbody.querySelectorAll('.copy-code-btn').forEach(b => {
          b.addEventListener('click', () => {
            navigator.clipboard.writeText(b.dataset.code);
            Toast.success(`تم نسخ الكود: ${b.dataset.code}`);
          });
        });
      } catch (err) {
        console.error(err);
        Toast.error('فشل تحميل قائمة الأكواد');
      }
    }

    document.getElementById('btn-gen-code').addEventListener('click', () => {
      Modal.open({
        title: 'توليد كود اشتراك جديد',
        contentHtml: `
          <form id="form-gen-code">
            <div class="form-group">
              <label class="form-label">مدة كود الاشتراك *</label>
              <select id="m-code-dur" class="form-control" required>
                <option value="1_MONTH">شهر واحد (30 يوم) - متاح للمساعدين والمشرف</option>
                ${isAdmin ? `
                  <option value="3_MONTHS">3 أشهر (فصلي - 90 يوم)</option>
                  <option value="6_MONTHS">6 أشهر (نصف سنوي - 180 يوم)</option>
                  <option value="12_MONTHS">سنة كاملة (365 يوم)</option>
                  <option value="LIFETIME">مدى الحياة (Lifetime)</option>
                ` : ''}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">اسم الدفعة أو ملاحظة داخلية</label>
              <input type="text" id="m-code-batch" class="form-control" placeholder="مثال: دفعة أوائل الطلاب - سبتمبر 2026">
            </div>
            <div class="modal-actions" style="margin-top:1.5rem;">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('app-modal').style.display='none'">إلغاء</button>
              <button type="submit" class="btn btn-primary">توليد الكود الآن ⚡</button>
            </div>
          </form>
        `
      });

      document.getElementById('form-gen-code').addEventListener('submit', async (e) => {
        e.preventDefault();
        const durType = document.getElementById('m-code-dur').value;
        const batch = document.getElementById('m-code-batch').value.trim() || 'كود يدوي';

        try {
          const res = await ApiClient.post('/subscriptions/codes', {
            duration_type: durType,
            batch_name: batch
          });
          Toast.success(`تم توليد الكود بنجاح: ${res.code?.code || ''} 🎉`);
          Modal.close();
          loadCodes();
        } catch (err) {
          Toast.error(err.message || 'فشل توليد الكود');
        }
      });
    });

    await loadCodes();
  }

  // =========================================================================
  // 10. DEDICATED PAYMENT & SUBSCRIPTION SETTINGS ("طرق الدفع والاشتراك")
  // =========================================================================
  static async renderPaymentSettings(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">طرق الدفع والاشتراك 💳</h1>
          <p class="page-subtitle">إدارة أرقام فودافون كاش وإنستاباي، باقات الاشتراكات الأكاديمية، والأسعار والعروض</p>
        </div>
      </div>

      <!-- 1. Wallet & Transfer Settings -->
      <div class="card" style="margin-bottom:2rem;">
        <h3 style="font-size:1.15rem;font-weight:700;margin-bottom:0.75rem;display:flex;align-items:center;gap:0.5rem;">
          <span>📱</span> أرقام التحويل المعتمدة لجميع الطلاب
        </h3>
        <p style="color:var(--color-text-muted);font-size:0.9rem;margin-bottom:1.25rem;">
          الأرقام والروابط المحددة هنا تُحفظ في قاعدة البيانات وتظهر تلقائيًا للطلاب في صفحة الاشتراك. الرقم الافتراضي لفودافون كاش هو <code>+20159159038</code>.
        </p>

        <form id="form-payment-details">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.25rem;">
            <div class="form-group">
              <label class="form-label">رقم محفظة فودافون كاش المعتمد *</label>
              <input type="text" id="pay-voda-phone" class="form-control" required placeholder="+20159159038">
            </div>
            <div class="form-group">
              <label class="form-label">رقم / معرف حساب InstaPay *</label>
              <input type="text" id="pay-insta-phone" class="form-control" required placeholder="+20159159038 أو username@instapay">
            </div>
            <div class="form-group">
              <label class="form-label">رابط الدفع المباشر لتطبيق InstaPay</label>
              <input type="url" id="pay-insta-link" class="form-control" placeholder="https://ipn.eg/S/...">
            </div>
            <div class="form-group">
              <label class="form-label">رقم الدعم والتواصل المالي (WhatsApp)</label>
              <input type="text" id="pay-contact-phone" class="form-control" placeholder="+201559159038">
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin-top:1rem;">
            <div class="form-group">
              <label class="form-label">نص شريط العروض الترويجي للطلاب</label>
              <input type="text" id="pay-offer-banner" class="form-control" placeholder="مثال: خصم خاص 25% لفترة محدودة بمناسبة انطلاق الفصل الدراسي">
            </div>
            <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:0.5rem;">
              <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                <input type="checkbox" id="pay-offers-vis" checked>
                <span>إظهار شريط العروض والخصومات في صفحة الطلاب</span>
              </label>
            </div>
          </div>

          <button type="submit" class="btn btn-primary" style="margin-top:1.25rem;">💾 حفظ بيانات وطرق الدفع في قاعدة البيانات</button>
        </form>
      </div>

      <!-- 2. Subscription Plans Management -->
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:1rem;">
          <div>
            <h3 style="font-size:1.15rem;font-weight:700;margin:0;display:flex;align-items:center;gap:0.5rem;">
              <span>⭐</span> باقات وخطط الاشتراكات الأكاديمية
            </h3>
            <p style="color:var(--color-text-muted);font-size:0.85rem;margin-top:0.25rem;">
              تعديل أسعار ومدد الباقات وحالتها (نشطة / مخفية). تظهر جميع الباقات النشطة تلقائيًا لجميع الطلاب.
            </p>
          </div>
          <button id="btn-add-plan" class="btn btn-primary btn-sm">+ إضافة باقة جديدة</button>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>اسم الباقة</th>
                <th>المدة (شهور)</th>
                <th>السعر (ج.م)</th>
                <th>ترتيب العرض</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody id="plans-table-body">
              <tr><td colspan="6" style="text-align:center;padding:2rem;">جاري تحميل باقات الاشتراكات...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Load Payment Info
    try {
      const sett = await ApiClient.get('/settings').catch(() => ({}));
      const payInfo = await ApiClient.get('/subscriptions/payment-info').catch(() => ({}));

      const vPhone = sett.payment_phone || sett.vodafone_cash || payInfo.vodafone_cash || payInfo.payment_phone || '+20159159038';
      const iPhone = sett.instapay_phone || payInfo.instapay_phone || '+20159159038';
      const iLink = sett.instapay_link || payInfo.instapay_link || 'https://ipn.eg/S/moazasem/instapay/27DsGj';
      const cPhone = sett.contact_phone || payInfo.contact_phone || '+201559159038';
      const banner = sett.offer_banner_text || payInfo.offer_banner_text || 'عروض الفصل الدراسي الجديد - احجز مقعدك الآن';
      const vis = sett.offers_visible !== undefined ? sett.offers_visible : true;

      document.getElementById('pay-voda-phone').value = vPhone;
      document.getElementById('pay-insta-phone').value = iPhone;
      document.getElementById('pay-insta-link').value = iLink;
      document.getElementById('pay-contact-phone').value = cPhone;
      document.getElementById('pay-offer-banner').value = banner;
      document.getElementById('pay-offers-vis').checked = vis;
    } catch (err) {
      console.error('Error loading payment info:', err);
    }

    // Save Payment Info
    document.getElementById('form-payment-details').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        payment_phone: document.getElementById('pay-voda-phone').value.trim(),
        vodafone_cash: document.getElementById('pay-voda-phone').value.trim(),
        instapay_phone: document.getElementById('pay-insta-phone').value.trim(),
        instapay_link: document.getElementById('pay-insta-link').value.trim(),
        contact_phone: document.getElementById('pay-contact-phone').value.trim(),
        offer_banner_text: document.getElementById('pay-offer-banner').value.trim(),
        offers_visible: document.getElementById('pay-offers-vis').checked
      };

      try {
        await ApiClient.put('/settings', payload);
        Toast.success('تم حفظ بيانات طرق الدفع بنجاح في قاعدة البيانات 🚀');
      } catch (err) {
        Toast.error(err.message || 'فشل حفظ بيانات الدفع');
      }
    });

    // Load & Manage Plans
    async function loadPlans() {
      try {
        const res = await ApiClient.get('/subscriptions/plans');
        const plans = ApiClient.extractList(res, 'plans');
        const tbody = document.getElementById('plans-table-body');
        if (!plans || plans.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--color-text-muted);">لا توجد باقات معتمدة حاليًا.</td></tr>';
          return;
        }

        tbody.innerHTML = plans.map(p => `
          <tr>
            <td><strong>${p.name}</strong></td>
            <td>${p.duration_months} ${p.duration_months === 1 ? 'شهر' : 'أشهر'}</td>
            <td><strong>${p.price} ج.م</strong></td>
            <td>${p.order_index !== undefined ? p.order_index : 0}</td>
            <td>
              <span class="badge ${p.is_active ? 'badge-success' : 'badge-secondary'}">
                ${p.is_active ? 'نشطة وظاهرة للطلاب ✅' : 'مخفية ⏸️'}
              </span>
            </td>
            <td>
              <button class="btn btn-secondary btn-sm edit-plan-btn" data-id="${p.id}">تعديل ✏️</button>
              <button class="btn btn-danger btn-sm del-plan-btn" data-id="${p.id}">حذف 🗑️</button>
            </td>
          </tr>
        `).join('');

        tbody.querySelectorAll('.edit-plan-btn').forEach(b => {
          b.addEventListener('click', () => {
            const plan = plans.find(x => x.id === b.dataset.id);
            if (plan) openPlanModal(plan);
          });
        });

        tbody.querySelectorAll('.del-plan-btn').forEach(b => {
          b.addEventListener('click', () => {
            const planId = b.dataset.id;
            Modal.confirm({
              title: 'تأكيد حذف باقة الاشتراك',
              message: 'هل أنت متأكد من حذف هذه الباقة؟ لن تظهر للطلاب في صفحة الاشتراكات.',
              onConfirm: async () => {
                try {
                  await ApiClient.delete(`/subscriptions/plans/${planId}`);
                  Toast.success('تم حذف باقة الاشتراك بنجاح');
                  loadPlans();
                } catch (err) {
                  Toast.error(err.message || 'فشل حذف الباقة');
                }
              }
            });
          });
        });
      } catch (err) {
        console.error(err);
        Toast.error('فشل تحميل قائمة باقات الاشتراكات');
      }
    }

    function openPlanModal(plan = null) {
      const isEdit = !!plan;
      Modal.open({
        title: isEdit ? 'تعديل باقة الاشتراك الأكاديمية' : 'إضافة باقة اشتراك جديدة',
        contentHtml: `
          <form id="form-plan-save">
            ${!isEdit ? `
              <div class="form-group">
                <label class="form-label">معرّف الباقة الفريد (Plan ID) *</label>
                <input type="text" id="m-plan-id" class="form-control" required placeholder="مثال: plan_summer_2026">
              </div>
            ` : ''}
            <div class="form-group">
              <label class="form-label">اسم الباقة المعروض للطلاب *</label>
              <input type="text" id="m-plan-name" class="form-control" required value="${plan?.name || ''}" placeholder="مثال: اشتراك الفصل الدراسي الكامل">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div class="form-group">
                <label class="form-label">مدة الاشتراك (بالشهور) *</label>
                <input type="number" id="m-plan-dur" class="form-control" required min="1" max="60" value="${plan?.duration_months || 1}">
              </div>
              <div class="form-group">
                <label class="form-label">السعر الإجمالي (ج.م) *</label>
                <input type="number" id="m-plan-price" class="form-control" required min="0" step="1" value="${plan?.price || 100}">
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div class="form-group">
                <label class="form-label">ترتيب العرض</label>
                <input type="number" id="m-plan-order" class="form-control" min="0" value="${plan?.order_index !== undefined ? plan.order_index : 10}">
              </div>
              <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:0.5rem;">
                <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                  <input type="checkbox" id="m-plan-active" ${plan ? (plan.is_active ? 'checked' : '') : 'checked'}>
                  <span>تفعيل الباقة وظهورها للطلاب</span>
                </label>
              </div>
            </div>
            <div class="modal-actions" style="margin-top:1.5rem;">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('app-modal').style.display='none'">إلغاء</button>
              <button type="submit" class="btn btn-primary">${isEdit ? 'حفظ تعديلات الباقة' : 'إنشاء الباقة الآن 🚀'}</button>
            </div>
          </form>
        `
      });

      document.getElementById('form-plan-save').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          name: document.getElementById('m-plan-name').value.trim(),
          duration_months: parseInt(document.getElementById('m-plan-dur').value) || 1,
          price: parseFloat(document.getElementById('m-plan-price').value) || 0.0,
          order_index: parseInt(document.getElementById('m-plan-order').value) || 0,
          is_active: document.getElementById('m-plan-active').checked
        };
        if (!isEdit) {
          payload.id = document.getElementById('m-plan-id').value.trim();
        }

        try {
          if (isEdit) {
            await ApiClient.put(`/subscriptions/plans/${plan.id}`, payload);
            Toast.success('تم تحديث باقة الاشتراك بنجاح');
          } else {
            await ApiClient.post('/subscriptions/plans', payload);
            Toast.success('تمت إضافة باقة الاشتراك بنجاح 🎉');
          }
          Modal.close();
          loadPlans();
        } catch (err) {
          Toast.error(err.message || 'فشل حفظ باقة الاشتراك');
        }
      });
    }

    document.getElementById('btn-add-plan').addEventListener('click', () => openPlanModal());
    await loadPlans();
  }

  // =========================================================================
  // 11. DEDICATED ACCOUNT & SECURITY SETTINGS ("إعدادات الحساب والأمان")
  // =========================================================================
  static async renderSettings(container) {
    const user = AuthService.getUser() || {};

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">إعدادات الحساب والأمان ⚙️</h1>
          <p class="page-subtitle">تعديل بيانات الحساب الشخصي وتغيير كلمة المرور وتأمين الجلسة</p>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:2rem;">
        <!-- 1. Profile & Email Form -->
        <div class="card">
          <h3 style="font-size:1.15rem;font-weight:700;margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;">
            <span>👤</span> تعديل البيانات الشخصية والبريد الإلكتروني
          </h3>
          <p style="color:var(--color-text-muted);font-size:0.85rem;margin-bottom:1.25rem;">
            يمكنك تحديث اسمك المعروض ورقم الهاتف والبريد الإلكتروني المستخدم في تسجيل الدخول.
          </p>

          <form id="form-update-profile">
            <div class="form-group">
              <label class="form-label">الاسم الكامل *</label>
              <input type="text" id="prof-fullname" class="form-control" required value="${user.full_name || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">اسم المستخدم (للعرض فقط)</label>
              <input type="text" class="form-control" value="${user.username || ''}" disabled style="opacity:0.7;">
            </div>
            <div class="form-group">
              <label class="form-label">البريد الإلكتروني المستخدم للدخول *</label>
              <input type="email" id="prof-email" class="form-control" required value="${user.email || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">رقم الهاتف</label>
              <input type="text" id="prof-phone" class="form-control" value="${user.phone || ''}" placeholder="+2010...">
            </div>

            <button type="submit" class="btn btn-primary" style="width:100%;margin-top:1rem;">حفظ تعديلات الملف الشخصي</button>
          </form>
        </div>

        <!-- 2. Password Change Form -->
        <div class="card">
          <h3 style="font-size:1.15rem;font-weight:700;margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;">
            <span>🔒</span> تغيير كلمة المرور المشفرة
          </h3>
          <p style="color:var(--color-text-muted);font-size:0.85rem;margin-bottom:1.25rem;">
            لحماية حسابك الإداري، يرجى كتابة كلمة المرور الحالية للتأكد من هويتك، ثم تعيين كلمة مرور قوية جديدة.
          </p>

          <form id="form-change-password">
            <div class="form-group">
              <label class="form-label">كلمة المرور الحالية *</label>
              <input type="password" id="pw-current" class="form-control" required placeholder="أدخل كلمة المرور الحالية للحساب">
            </div>
            <div class="form-group">
              <label class="form-label">كلمة المرور الجديدة * (6 خانات على الأقل)</label>
              <input type="password" id="pw-new" class="form-control" required minlength="6" placeholder="••••••••">
            </div>
            <div class="form-group">
              <label class="form-label">تأكيد كلمة المرور الجديدة *</label>
              <input type="password" id="pw-confirm" class="form-control" required minlength="6" placeholder="••••••••">
            </div>

            <div id="pw-error-feedback" style="display:none;color:var(--color-danger);font-size:0.85rem;margin-bottom:1rem;"></div>

            <button type="submit" class="btn btn-primary" style="width:100%;margin-top:0.5rem;">تحديث كلمة المرور الآن 🔐</button>
          </form>
        </div>
      </div>
    `;

    // Handle Profile Update
    document.getElementById('form-update-profile').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        full_name: document.getElementById('prof-fullname').value.trim(),
        email: document.getElementById('prof-email').value.trim(),
        phone: document.getElementById('prof-phone').value.trim() || null
      };

      try {
        const res = await ApiClient.put('/users/profile', payload);
        if (res.user) {
          const updatedUser = { ...user, ...res.user };
          localStorage.setItem('codespark_user', JSON.stringify(updatedUser));
          const nameEl = document.getElementById('user-display-name');
          if (nameEl) nameEl.textContent = updatedUser.full_name || updatedUser.username;
        }
        Toast.success('تم تحديث البيانات الشخصية والبريد بنجاح! 🚀');
      } catch (err) {
        Toast.error(err.message || 'فشل تحديث البيانات');
      }
    });

    // Handle Password Change
    document.getElementById('form-change-password').addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('pw-current').value;
      const newPassword = document.getElementById('pw-new').value;
      const confirmPassword = document.getElementById('pw-confirm').value;
      const feedback = document.getElementById('pw-error-feedback');

      feedback.style.display = 'none';

      if (newPassword !== confirmPassword) {
        feedback.textContent = 'كلمة المرور الجديدة وتأكيدها غير متطابقين!';
        feedback.style.display = 'block';
        return;
      }

      if (newPassword.length < 6) {
        feedback.textContent = 'يجب أن تتكون كلمة المرور الجديدة من 6 خانات على الأقل!';
        feedback.style.display = 'block';
        return;
      }

      try {
        const res = await ApiClient.post('/users/change-password', {
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword
        });

        Toast.success(res.message || 'تم تغيير كلمة المرور بنجاح! 🔒');
        document.getElementById('form-change-password').reset();
      } catch (err) {
        feedback.textContent = err.message || 'فشل تغيير كلمة المرور';
        feedback.style.display = 'block';
        Toast.error(err.message || 'فشل تغيير كلمة المرور');
      }
    });
  }

  // =========================================================================
  // 12. STUDENTS MANAGEMENT
  // =========================================================================
  static async renderStudents(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">إدارة حسابات الطلاب 👥</h1>
          <p class="page-subtitle">متابعة حسابات الطلاب المسجلين والتحكم في حالة الحسابات</p>
        </div>
      </div>

      <div class="card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>اسم الطالب</th>
                <th>اسم المستخدم</th>
                <th>البريد الإلكتروني</th>
                <th>الهاتف</th>
                <th>الحالة</th>
                <th>تاريخ التسجيل</th>
              </tr>
            </thead>
            <tbody id="students-table-body">
              <tr><td colspan="6" style="text-align:center;padding:2rem;">جاري تحميل بيانات الطلاب...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    try {
      const res = await ApiClient.get('/students');
      const students = ApiClient.extractList(res, 'students');
      const tbody = document.getElementById('students-table-body');
      if (!students || students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--color-text-muted);">لا يوجد طلاب مسجلون حاليًا.</td></tr>';
        return;
      }

      tbody.innerHTML = students.map(s => `
        <tr>
          <td><strong>${s.full_name || s.username}</strong></td>
          <td><code>${s.username}</code></td>
          <td>${s.email || '—'}</td>
          <td>${s.phone || '—'}</td>
          <td>
            <span class="badge ${s.is_active ? 'badge-success' : 'badge-danger'}">
              ${s.is_active ? 'نشط ✅' : 'معطل ❌'}
            </span>
          </td>
          <td style="font-size:0.85rem;">${s.created_at ? s.created_at.substring(0, 10) : '—'}</td>
        </tr>
      `).join('');
    } catch (err) {
      console.error(err);
      Toast.error('فشل تحميل قائمة الطلاب');
    }
  }

  // =========================================================================
  // 13. ASSISTANTS MANAGEMENT
  // =========================================================================
  static async renderAssistants(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">المساعدين التعليميين والصلاحيات 🧑‍🏫</h1>
          <p class="page-subtitle">تعيين مساعدين وإسناد صلاحيات إدارة المناهج وتوليد الأكواد الشهرية</p>
        </div>
      </div>

      <div class="card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>اسم المساعد</th>
                <th>اسم المستخدم</th>
                <th>البريد الإلكتروني</th>
                <th>الهاتف</th>
                <th>حدود الصلاحيات المطبقة</th>
              </tr>
            </thead>
            <tbody id="assistants-table-body">
              <tr><td colspan="5" style="text-align:center;padding:2rem;">جاري تحميل بيانات المساعدين...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    try {
      const res = await ApiClient.get('/assistants');
      const assistants = ApiClient.extractList(res, 'assistants');
      const tbody = document.getElementById('assistants-table-body');
      if (!assistants || assistants.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--color-text-muted);">لا يوجد مساعدون مسجلون حاليًا.</td></tr>';
        return;
      }

      tbody.innerHTML = assistants.map(a => `
        <tr>
          <td><strong>${a.full_name || a.username}</strong></td>
          <td><code>${a.username}</code></td>
          <td>${a.email || '—'}</td>
          <td>${a.phone || '—'}</td>
          <td>
            <span class="badge badge-primary">إدارة المناهج والدروس</span>
            <span class="badge badge-secondary">أكواد شهرية فقط (30 يوم)</span>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error(err);
      Toast.error('فشل تحميل قائمة المساعدين');
    }
  }
}
