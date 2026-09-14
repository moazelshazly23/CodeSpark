/**
 * Code Spark - Comprehensive Admin & Assistant Management Views
 * Real CRUD operations for Courses, Units, Lessons, Videos, Educational Resources,
 * Question Bank, Exams, Announcements, Subscriptions, Students, and Assistants.
 */
import ApiClient, { debounce } from '../api/apiClient.js';
import { Toast, Modal } from '../components/ui.js';
import AuthService from '../auth/authService.js';

export class AdminPages {

  /* ===================================================================
     1. ADMIN DASHBOARD & REAL KPIS
  =================================================================== */
  static async renderDashboard(container) {
    container.innerHTML = `
      <div style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
        <div>
          <h2 style="font-size:1.8rem;font-weight:900;color:var(--color-text-main);">لوحة التحكم الإدارية والتحليلات 📊</h2>
          <p style="color:var(--color-text-muted);">نظرة عامة لحظية على أداء منصة Code Spark</p>
        </div>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
          <a href="#/admin/subscriptions" class="btn btn-primary btn-sm">🔑 إدارة وتوليد الأكواد</a>
          <a href="#/admin/courses" class="btn btn-secondary btn-sm">📚 إدارة المناهج</a>
          <a href="#/admin/lessons" class="btn btn-secondary btn-sm">🎬 إدارة الدروس</a>
          <a href="#/admin/questions" class="btn btn-secondary btn-sm">📝 بنك الأسئلة</a>
          <a href="#/admin/exams" class="btn btn-secondary btn-sm">🎯 الامتحانات</a>
        </div>
      </div>

      <!-- KPI Grid -->
      <div id="admin-kpis-grid" class="dashboard-grid">
        <div class="card skeleton" style="height:110px;"></div>
        <div class="card skeleton" style="height:110px;"></div>
        <div class="card skeleton" style="height:110px;"></div>
        <div class="card skeleton" style="height:110px;"></div>
      </div>

      <!-- Main Columns -->
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:1.5rem;margin-top:1.5rem;" class="dashboard-columns">
        <div class="card">
          <h3 style="font-weight:800;color:var(--color-text-main);margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;">
            <span>⚡</span> أحدث الأنشطة وسجل التدقيق (Audit Logs)
          </h3>
          <div id="admin-recent-logs" style="display:flex;flex-direction:column;gap:0.75rem;">
            <div class="skeleton" style="height:180px;"></div>
          </div>
        </div>

        <div class="card">
          <h3 style="font-weight:800;color:var(--color-text-main);margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;">
            <span>🛠️</span> إدارة النظام والمحتوى
          </h3>
          <div style="display:flex;flex-direction:column;gap:0.6rem;">
            <a href="#/admin/courses" class="btn btn-secondary btn-sm" style="justify-content:flex-start;">📚 إدارة المناهج والكورسات والوحدات</a>
            <a href="#/admin/lessons" class="btn btn-secondary btn-sm" style="justify-content:flex-start;">🎬 إضافة وتعديل وحذف الدروس</a>
            <a href="#/admin/questions" class="btn btn-secondary btn-sm" style="justify-content:flex-start;">📝 بنك الأسئلة المركزي</a>
            <a href="#/admin/exams" class="btn btn-secondary btn-sm" style="justify-content:flex-start;">🎯 إنشاء وتصحيح الامتحانات</a>
            <a href="#/admin/announcements" class="btn btn-secondary btn-sm" style="justify-content:flex-start;">📢 نشر وإدارة الإعلانات</a>
            <a href="#/admin/students" class="btn btn-secondary btn-sm" style="justify-content:flex-start;">👥 إدارة حسابات الطلاب</a>
            <a href="#/admin/assistants" class="btn btn-secondary btn-sm" style="justify-content:flex-start;">🛡️ صلاحيات المساعدين</a>
            <a href="#/admin/subscriptions" class="btn btn-secondary btn-sm" style="justify-content:flex-start;">🔑 أكواد الاشتراكات</a>
          </div>
        </div>
      </div>
    `;

    try {
      const data = await ApiClient.get('/admin/dashboard');

      document.getElementById('admin-kpis-grid').innerHTML = `
        <div class="card metric-card">
          <div class="metric-icon">👥</div>
          <div class="metric-data">
            <h3>${data.total_students || 0}</h3>
            <p>إجمالي الطلاب المسجلين</p>
          </div>
        </div>

        <div class="card metric-card">
          <div class="metric-icon">🔑</div>
          <div class="metric-data">
            <h3 style="color:#10B981;">${data.active_subscribers || 0}</h3>
            <p>المشتركون النشطون</p>
          </div>
        </div>

        <div class="card metric-card">
          <div class="metric-icon">📚</div>
          <div class="metric-data">
            <h3>${data.total_lessons || 0}</h3>
            <p>الدروس المنشورة</p>
          </div>
        </div>

        <div class="card metric-card">
          <div class="metric-icon">🎯</div>
          <div class="metric-data">
            <h3 style="color:var(--color-primary);">${data.average_score || 0}%</h3>
            <p>متوسط درجات الطلاب</p>
          </div>
        </div>
      `;

      const logs = data.recent_activity || [];
      document.getElementById('admin-recent-logs').innerHTML = logs.length > 0 ? logs.map(l => `
        <div style="padding:0.75rem 1rem;background:var(--color-bg-secondary);border-radius:var(--radius-md);display:flex;justify-content:space-between;align-items:center;">
          <div>
            <span style="font-weight:700;color:var(--color-text-main);">${l.action}</span>
            <span style="font-size:0.85rem;color:var(--color-text-muted);margin-right:0.5rem;">(${l.entity_type})</span>
          </div>
          <span style="font-size:0.75rem;color:var(--color-text-dim);">${l.created_at ? l.created_at.substring(11, 16) : ''}</span>
        </div>
      `).join('') : '<p style="color:var(--color-text-muted);">لا توجد أنشطة مسجلة حديثاً.</p>';

    } catch (err) {
      console.error(err);
      Toast.error('تعذر تحميل بيانات لوحة الإدارة');
    }
  }

  /* ===================================================================
     2. COURSES & UNITS MANAGEMENT (CRUD)
  =================================================================== */
  static async renderCourses(container) {
    container.innerHTML = `
      <div style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
        <div>
          <h2 style="font-size:1.8rem;font-weight:900;color:var(--color-text-main);">إدارة المناهج والكورسات والوحدات 📚</h2>
          <p style="color:var(--color-text-muted);">إنشاء وتعديل المناهج الدراسية وهيكلة الوحدات والدروس المرتبطة بها</p>
        </div>
        <button id="btn-add-course" class="btn btn-primary btn-sm" style="font-weight:700;">+ إضافة كورس جديد</button>
      </div>

      <div class="card">
        <div class="table-container">
          <table class="table" style="width:100%;">
            <thead>
              <tr>
                <th>الكورس / المنهج</th>
                <th>الاسم التعريفي (Slug)</th>
                <th>الوحدات التابعة</th>
                <th>الخصوصية</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody id="courses-table-body">
              <tr><td colspan="6" class="text-center" style="padding:2rem;">جاري التحميل...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    async function loadCourses() {
      try {
        const res = await ApiClient.get('/courses');
        const courses = res.courses || [];
        const tbody = document.getElementById('courses-table-body');

        if (courses.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:2rem;">لا توجد كورسات مضافة بعد.</td></tr>';
          return;
        }

        let rowsHtml = '';
        for (const crs of courses) {
          const unitsRes = await ApiClient.get(`/units?course_id=${crs.id}`).catch(() => ({ units: [] }));
          const unitCount = unitsRes.units?.length || 0;

          rowsHtml += `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:0.75rem;">
                  <img src="${crs.thumbnail_url || '/assets/branding/app_icon.svg'}" style="width:36px;height:36px;object-fit:contain;border-radius:6px;background:var(--color-bg-secondary);">
                  <div>
                    <strong style="color:var(--color-text-main);font-size:1.05rem;">${crs.title}</strong>
                    <div style="font-size:0.75rem;color:var(--color-text-muted);">${crs.description ? crs.description.substring(0, 50) + '...' : ''}</div>
                  </div>
                </div>
              </td>
              <td><code style="font-family:var(--font-mono);color:var(--color-primary);">${crs.slug}</code></td>
              <td><span class="badge" style="background:var(--color-bg-secondary);color:var(--color-cyan-accent);">${unitCount} وحدات</span></td>
              <td>
                <span class="badge ${crs.access_type === 'PUBLIC' ? 'badge-public' : 'badge-subscribers'}">
                  ${crs.access_type === 'PUBLIC' ? 'عام للجميع' : 'للمشتركين فقط 🔑'}
                </span>
              </td>
              <td>
                <span class="badge ${crs.is_published ? 'badge-public' : 'badge-danger'}">
                  ${crs.is_published ? 'منشور ✅' : 'مخفي ⏸️'}
                </span>
              </td>
              <td>
                <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
                  <button class="btn btn-secondary btn-sm manage-units-btn" data-id="${crs.id}" title="إدارة وحدات هذا الكورس">الوحدات 📁</button>
                  <button class="btn btn-secondary btn-sm edit-course-btn" data-id="${crs.id}">تعديل ✏️</button>
                  <button class="btn btn-danger btn-sm del-course-btn" data-id="${crs.id}">حذف 🗑️</button>
                </div>
              </td>
            </tr>
          `;
        }
        tbody.innerHTML = rowsHtml;

        // Bind Edit Course
        document.querySelectorAll('.edit-course-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const crs = courses.find(x => x.id === btn.dataset.id);
            if (crs) openCourseModal(crs, loadCourses);
          });
        });

        // Bind Delete Course
        document.querySelectorAll('.del-course-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const crsId = btn.dataset.id;
            Modal.confirm({
              title: 'تأكيد حذف الكورس',
              message: 'هل أنت متأكد من حذف هذا الكورس وجميع الوحدات والدروس التابعة له نهائياً؟',
              onConfirm: async () => {
                try {
                  await ApiClient.delete(`/courses/${crsId}`);
                  Toast.success('تم حذف الكورس بنجاح');
                  loadCourses();
                } catch (e) {
                  Toast.error(e.message);
                }
              }
            });
          });
        });

        // Bind Manage Units
        document.querySelectorAll('.manage-units-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const crsId = btn.dataset.id;
            const crs = courses.find(x => x.id === crsId);
            openUnitsModal(crs, loadCourses);
          });
        });

        document.getElementById('btn-add-course').onclick = () => openCourseModal(null, loadCourses);

      } catch (err) {
        console.error(err);
        Toast.error('فشل تحميل قائمة الكورسات');
      }
    }

    function openCourseModal(course, onSaved) {
      const isEdit = !!course;
      Modal.open({
        title: isEdit ? `تعديل الكورس: ${course.title}` : 'إضافة كورس تعليمي جديد',
        contentHtml: `
          <form id="form-course-save">
            <div class="form-group">
              <label class="form-label">عنوان الكورس / المنهج</label>
              <input type="text" id="m-crs-title" class="form-input" required value="${course?.title || ''}" placeholder="مثال: أساسيات البرمجة بلغة بايثون">
            </div>
            <div class="form-group">
              <label class="form-label">الاسم التعريفي (Slug)</label>
              <input type="text" id="m-crs-slug" class="form-input" required value="${course?.slug || ''}" placeholder="python-fundamentals">
            </div>
            <div class="form-group">
              <label class="form-label">الوصف الأكاديمي</label>
              <textarea id="m-crs-desc" class="form-input" rows="3" placeholder="اكتب وصفاً موجزاً للكورس...">${course?.description || ''}</textarea>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div class="form-group">
                <label class="form-label">مستوى الوصول</label>
                <select id="m-crs-access" class="form-input">
                  <option value="PUBLIC" ${course?.access_type === 'PUBLIC' ? 'selected' : ''}>عام ومتاح للجميع (PUBLIC)</option>
                  <option value="SUBSCRIBERS_ONLY" ${course?.access_type === 'SUBSCRIBERS_ONLY' ? 'selected' : ''}>للمشتركين فقط (SUBSCRIBERS_ONLY)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">حالة النشر</label>
                <select id="m-crs-pub" class="form-input">
                  <option value="1" ${course?.is_published !== 0 ? 'selected' : ''}>منشور ومتاح للطلاب ✅</option>
                  <option value="0" ${course?.is_published === 0 ? 'selected' : ''}>مسودة غير منشورة ⏸️</option>
                </select>
              </div>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;font-weight:700;margin-top:0.75rem;">
              ${isEdit ? 'حفظ تعديلات الكورس' : 'إنشاء الكورس الآن 🚀'}
            </button>
          </form>
        `
      });

      document.getElementById('form-course-save').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          title: document.getElementById('m-crs-title').value.trim(),
          slug: document.getElementById('m-crs-slug').value.trim() || 'course-' + Date.now(),
          description: document.getElementById('m-crs-desc').value.trim(),
          thumbnail_url: course?.thumbnail_url || '/assets/branding/app_icon.svg',
          order_index: course?.order_index || 1,
          is_published: document.getElementById('m-crs-pub').value === '1',
          access_type: document.getElementById('m-crs-access').value
        };

        try {
          if (isEdit) {
            await ApiClient.put(`/courses/${course.id}`, payload);
            Toast.success('تم تعديل الكورس بنجاح');
          } else {
            await ApiClient.post('/courses', payload);
            Toast.success('تمت إضافة الكورس بنجاح 🎉');
          }
          Modal.close();
          onSaved();
        } catch (err) {
          Toast.error(err.message);
        }
      });
    }

    async function openUnitsModal(course, onSaved) {
      const uRes = await ApiClient.get(`/units?course_id=${course.id}`).catch(() => ({ units: [] }));
      const units = uRes.units || [];

      Modal.open({
        title: `إدارة وحدات: ${course.title}`,
        contentHtml: `
          <div style="margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:0.9rem;color:var(--color-text-muted);">الوحدات التابعة لهذا الكورس (${units.length})</span>
            <button id="sub-btn-new-unit" class="btn btn-primary btn-sm">+ إضافة وحدة جديدة</button>
          </div>
          <div id="modal-units-list" style="max-height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:0.75rem;">
            ${units.length > 0 ? units.map(u => `
              <div style="padding:0.75rem 1rem;background:var(--color-bg-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <strong style="color:var(--color-text-main);">${u.title}</strong>
                  <div style="font-size:0.75rem;color:var(--color-text-muted);">${u.description || ''}</div>
                </div>
                <div style="display:flex;gap:0.4rem;">
                  <button class="btn btn-danger btn-sm m-del-unit-btn" data-uid="${u.id}">حذف</button>
                </div>
              </div>
            `).join('') : '<p style="color:var(--color-text-muted);text-align:center;padding:1rem;">لا توجد وحدات في هذا الكورس بعد.</p>'}
          </div>
        `
      });

      document.querySelectorAll('.m-del-unit-btn').forEach(b => {
        b.addEventListener('click', async () => {
          try {
            await ApiClient.delete(`/units/${b.dataset.uid}`);
            Toast.success('تم حذف الوحدة');
            Modal.close();
            openUnitsModal(course, onSaved);
          } catch (e) {
            Toast.error(e.message);
          }
        });
      });

      document.getElementById('sub-btn-new-unit').onclick = () => {
        Modal.open({
          title: `إضافة وحدة جديدة لكورس: ${course.title}`,
          contentHtml: `
            <form id="form-unit-add">
              <div class="form-group">
                <label class="form-label">عنوان الوحدة</label>
                <input type="text" id="m-unit-title" class="form-input" required placeholder="مثال: الوحدة الأولى: المفاهيم التأسيسية">
              </div>
              <div class="form-group">
                <label class="form-label">وصف الوحدة</label>
                <textarea id="m-unit-desc" class="form-input" rows="2" placeholder="وصف محتوى ومخرجات الوحدة..."></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">مستوى الوصول</label>
                <select id="m-unit-acc" class="form-input">
                  <option value="PUBLIC">عام للجميع</option>
                  <option value="SUBSCRIBERS_ONLY" selected>للمشتركين فقط 🔑</option>
                </select>
              </div>
              <button type="submit" class="btn btn-primary" style="width:100%;font-weight:700;">إضافة الوحدة</button>
            </form>
          `
        });

        document.getElementById('form-unit-add').addEventListener('submit', async (e) => {
          e.preventDefault();
          try {
            await ApiClient.post('/units', {
              course_id: course.id,
              title: document.getElementById('m-unit-title').value.trim(),
              description: document.getElementById('m-unit-desc').value.trim(),
              order_index: units.length + 1,
              is_published: true,
              access_type: document.getElementById('m-unit-acc').value
            });
            Toast.success('تمت إضافة الوحدة بنجاح');
            openUnitsModal(course, onSaved);
          } catch (err) {
            Toast.error(err.message);
          }
        });
      };
    }

    await loadCourses();
  }

  /* ===================================================================
     3. LESSONS MANAGEMENT (Full CRUD for Admin & Assistants)
  =================================================================== */
  static async renderLessons(container) {
    container.innerHTML = `
      <div style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
        <div>
          <h2 style="font-size:1.8rem;font-weight:900;color:var(--color-text-main);">إدارة الدروس والفيديوهات 🎬</h2>
          <p style="color:var(--color-text-muted);">إضافة وتعديل وحذف الدروس وتحديد خصوصية المشاهدة ومصادر الفيديوهات والمذكرات</p>
        </div>
        <button id="btn-add-lesson" class="btn btn-primary btn-sm" style="font-weight:700;">+ إضافة درس جديد</button>
      </div>

      <!-- Filters & Search Bar -->
      <div class="card" style="margin-bottom:1.5rem;display:flex;gap:1rem;flex-wrap:wrap;padding:1rem;">
        <input type="text" id="filter-lesson-search" class="form-input" placeholder="بحث في عنوان الدرس..." style="flex:1;min-width:200px;">
        <select id="filter-lesson-unit" class="form-input" style="width:auto;min-width:200px;">
          <option value="">جميع الوحدات</option>
        </select>
        <select id="filter-lesson-access" class="form-input" style="width:auto;">
          <option value="">كافة مستويات الوصول</option>
          <option value="PUBLIC">عام ومجاني</option>
          <option value="SUBSCRIBERS_ONLY">للمشتركين فقط</option>
        </select>
      </div>

      <div class="card">
        <div class="table-container">
          <table class="table" style="width:100%;">
            <thead>
              <tr>
                <th>ترتيب</th>
                <th>عنوان الدرس</th>
                <th>الوحدة</th>
                <th>نوع الفيديو</th>
                <th>الخصوصية</th>
                <th>الحالة</th>
                <th>المدة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody id="lessons-table-body">
              <tr><td colspan="8" class="text-center" style="padding:2rem;">جاري التحميل...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    async function loadLessons() {
      try {
        const [lessons, coursesRes] = await Promise.all([
          ApiClient.get('/lessons'),
          ApiClient.get('/courses')
        ]);

        const courses = coursesRes.courses || [];
        let allUnits = [];
        if (courses.length > 0) {
          for (const c of courses) {
            const uRes = await ApiClient.get(`/units?course_id=${c.id}`).catch(() => ({ units: [] }));
            if (uRes.units) allUnits = allUnits.concat(uRes.units);
          }
        }

        // Populate unit dropdown filter
        const unitSelect = document.getElementById('filter-lesson-unit');
        if (unitSelect && unitSelect.options.length <= 1) {
          allUnits.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = u.title;
            unitSelect.appendChild(opt);
          });
        }

        const searchQuery = document.getElementById('filter-lesson-search')?.value.toLowerCase().trim() || '';
        const selectedUnit = document.getElementById('filter-lesson-unit')?.value || '';
        const selectedAccess = document.getElementById('filter-lesson-access')?.value || '';

        let filtered = lessons;
        if (searchQuery) {
          filtered = filtered.filter(l => l.title.toLowerCase().includes(searchQuery) || (l.description && l.description.toLowerCase().includes(searchQuery)));
        }
        if (selectedUnit) {
          filtered = filtered.filter(l => l.unit_id === selectedUnit);
        }
        if (selectedAccess) {
          filtered = filtered.filter(l => l.access_type === selectedAccess);
        }

        const tbody = document.getElementById('lessons-table-body');
        if (!filtered || filtered.length === 0) {
          tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding:2rem;">لا توجد دروس تطابق خيارات البحث.</td></tr>';
          return;
        }

        tbody.innerHTML = filtered.map(l => {
          const unitObj = allUnits.find(u => u.id === l.unit_id);
          return `
            <tr>
              <td><strong>#${l.order_index || 1}</strong></td>
              <td>
                <strong style="color:var(--color-text-main);">${l.title}</strong>
                <div style="font-size:0.75rem;color:var(--color-text-muted);">${l.slug}</div>
              </td>
              <td><span style="font-size:0.85rem;color:var(--color-text-dim);">${unitObj?.title || 'الوحدة الأساسية'}</span></td>
              <td>
                <span class="badge" style="background:var(--color-bg-secondary);color:var(--color-cyan-accent);">
                  ${l.video_type === 'youtube' ? 'YouTube 🎬' : (l.video_type === 'uploaded' ? 'رفع مباشر 📁' : 'بدون فيديو')}
                </span>
              </td>
              <td>
                <span class="badge ${l.access_type === 'PUBLIC' ? 'badge-public' : 'badge-subscribers'}">
                  ${l.access_type === 'PUBLIC' ? 'عام' : 'مشتركين 🔑'}
                </span>
              </td>
              <td>
                <button class="btn btn-sm toggle-pub-btn" data-id="${l.id}" data-pub="${l.is_published}" style="padding:2px 8px;font-size:0.75rem;border:none;">
                  <span class="badge ${l.is_published ? 'badge-public' : 'badge-danger'}">
                    ${l.is_published ? 'منشور ✅' : 'مسودة ⏸️'}
                  </span>
                </button>
              </td>
              <td>${Math.round((l.duration_seconds || 0) / 60)} دقيقة</td>
              <td>
                <div style="display:flex;gap:0.4rem;">
                  <button class="btn btn-secondary btn-sm edit-lesson-btn" data-id="${l.id}">تعديل ✏️</button>
                  <button class="btn btn-danger btn-sm del-lesson-btn" data-id="${l.id}">حذف 🗑️</button>
                </div>
              </td>
            </tr>
          `;
        }).join('');

        // Bind Edit Lesson
        document.querySelectorAll('.edit-lesson-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const les = lessons.find(x => x.id === btn.dataset.id);
            if (les) openLessonFormModal(les, allUnits, loadLessons);
          });
        });

        // Bind Delete Lesson
        document.querySelectorAll('.del-lesson-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const lesId = btn.dataset.id;
            Modal.confirm({
              title: 'تأكيد حذف الدرس',
              message: 'هل أنت متأكد من رغبتك في حذف هذا الدرس وجميع التمارين والمرفقات التابعة له نهائياً؟',
              onConfirm: async () => {
                try {
                  await ApiClient.delete(`/lessons/${lesId}`);
                  Toast.success('تم حذف الدرس بنجاح');
                  loadLessons();
                } catch (e) {
                  Toast.error(e.message);
                }
              }
            });
          });
        });

        // Toggle published state
        document.querySelectorAll('.toggle-pub-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const les = lessons.find(x => x.id === btn.dataset.id);
            if (!les) return;
            const newPub = les.is_published === 1 ? false : true;
            try {
              await ApiClient.put(`/lessons/${les.id}`, { ...les, is_published: newPub });
              Toast.success(newPub ? 'تم نشر الدرس' : 'تم إلغاء نشر الدرس');
              loadLessons();
            } catch (e) {
              Toast.error(e.message);
            }
          });
        });

        document.getElementById('btn-add-lesson').onclick = () => openLessonFormModal(null, allUnits, loadLessons);

      } catch (err) {
        console.error(err);
        Toast.error('فشل تحميل قائمة الدروس');
      }
    }

    function openLessonFormModal(lesson, units, onSaved) {
      const isEdit = !!lesson;
      Modal.open({
        title: isEdit ? `تعديل الدرس: ${lesson.title}` : 'إضافة درس تعليمي جديد',
        contentHtml: `
          <form id="form-lesson-save">
            <div class="form-group">
              <label class="form-label">الوحدة التعليمية التابع لها الدرس</label>
              <select id="m-les-unit" class="form-input" required>
                ${units.map(u => `
                  <option value="${u.id}" ${lesson?.unit_id === u.id ? 'selected' : ''}>${u.title}</option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">عنوان الدرس</label>
              <input type="text" id="m-les-title" class="form-input" required value="${lesson?.title || ''}" placeholder="مثال: جمل الشروط والقرارات المنطقية">
            </div>
            <div class="form-group">
              <label class="form-label">الاسم التعريفي (Slug)</label>
              <input type="text" id="m-les-slug" class="form-input" required value="${lesson?.slug || ''}" placeholder="conditional-statements">
            </div>
            <div class="form-group">
              <label class="form-label">نوع الفيديو ومصدره</label>
              <select id="m-les-vtype" class="form-input">
                <option value="youtube" ${lesson?.video_type === 'youtube' ? 'selected' : ''}>يوتيوب (YouTube URL)</option>
                <option value="uploaded" ${lesson?.video_type === 'uploaded' ? 'selected' : ''}>رفع فيديو مباشر من الجهاز (Upload Video File)</option>
                <option value="none" ${lesson?.video_type === 'none' ? 'selected' : ''}>بدون فيديو (نص ومذكرات فقط)</option>
              </select>
            </div>
            <div class="form-group" id="video-url-container">
              <label class="form-label">رابط الفيديو أو معرف اليوتيوب</label>
              <input type="text" id="m-les-vurl" class="form-input" value="${lesson?.video_url || ''}" placeholder="https://www.youtube.com/watch?v=...">
            </div>
            <div class="form-group" id="video-upload-container" style="display:none;">
              <label class="form-label">رفع ملف الفيديو مباشرة (MP4, WebM)</label>
              <input type="file" id="m-les-vfile" class="form-input" accept="video/mp4,video/webm">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
              <div class="form-group">
                <label class="form-label">مستوى الوصول</label>
                <select id="m-les-access" class="form-input">
                  <option value="PUBLIC" ${lesson?.access_type === 'PUBLIC' ? 'selected' : ''}>متاح للجميع (PUBLIC)</option>
                  <option value="SUBSCRIBERS_ONLY" ${lesson?.access_type === 'SUBSCRIBERS_ONLY' ? 'selected' : ''}>للمشتركين فقط 🔑</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">المدة المقدرة (دقيقة)</label>
                <input type="number" id="m-les-dur" class="form-input" value="${Math.round((lesson?.duration_seconds || 600) / 60)}" min="1">
              </div>
              <div class="form-group">
                <label class="form-label">الترتيب داخل الوحدة</label>
                <input type="number" id="m-les-ord" class="form-input" value="${lesson?.order_index || 1}" min="1">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">شرح الدرس وملاحظات المحاضرة (Markdown)</label>
              <textarea id="m-les-content" class="form-input" rows="4" placeholder="اكتب الشرح والملاحظات البرمجية والأكواد التوضيحية...">${lesson?.content_markdown || ''}</textarea>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;font-weight:700;margin-top:0.5rem;">
              ${isEdit ? 'حفظ تعديلات الدرس' : 'إضافة ونشر الدرس الآن 🎬'}
            </button>
          </form>
        `
      });

      // Video type toggle
      const vtypeSelect = document.getElementById('m-les-vtype');
      const vurlBox = document.getElementById('video-url-container');
      const vfileBox = document.getElementById('video-upload-container');

      vtypeSelect.addEventListener('change', () => {
        if (vtypeSelect.value === 'uploaded') {
          vurlBox.style.display = 'none';
          vfileBox.style.display = 'block';
        } else if (vtypeSelect.value === 'youtube') {
          vurlBox.style.display = 'block';
          vfileBox.style.display = 'none';
        } else {
          vurlBox.style.display = 'none';
          vfileBox.style.display = 'none';
        }
      });
      if (lesson?.video_type === 'uploaded') {
        vtypeSelect.dispatchEvent(new Event('change'));
      }

      document.getElementById('form-lesson-save').addEventListener('submit', async (e) => {
        e.preventDefault();
        let vUrl = document.getElementById('m-les-vurl').value.trim();
        let vId = null;

        // Check if uploaded video
        const vFile = document.getElementById('m-les-vfile')?.files[0];
        if (vtypeSelect.value === 'uploaded' && vFile) {
          const fd = new FormData();
          fd.append('file', vFile);
          Toast.info('جاري رفع ملف الفيديو...');
          try {
            const upRes = await ApiClient.upload('/resources/upload', fd);
            vUrl = upRes.file_url;
          } catch (err) {
            Toast.error('فشل رفع الفيديو: ' + err.message);
            return;
          }
        } else if (vtypeSelect.value === 'youtube') {
          if (vUrl.includes('v=')) {
            vId = vUrl.split('v=')[1].split('&')[0];
          } else if (vUrl.includes('youtu.be/')) {
            vId = vUrl.split('youtu.be/')[1].split('?')[0];
          } else if (vUrl.length === 11 && !vUrl.includes('/')) {
            vId = vUrl;
          }
        }

        const payload = {
          unit_id: document.getElementById('m-les-unit').value,
          title: document.getElementById('m-les-title').value.trim(),
          slug: document.getElementById('m-les-slug').value.trim() || 'lesson-' + Date.now(),
          description: document.getElementById('m-les-title').value.trim(),
          content_markdown: document.getElementById('m-les-content').value,
          video_type: vtypeSelect.value,
          video_url: vUrl,
          video_id: vId,
          duration_seconds: (parseFloat(document.getElementById('m-les-dur').value) || 10) * 60,
          order_index: parseInt(document.getElementById('m-les-ord').value) || 1,
          access_type: document.getElementById('m-les-access').value,
          is_published: true
        };

        try {
          if (isEdit) {
            await ApiClient.put(`/lessons/${lesson.id}`, payload);
            Toast.success('تم تعديل الدرس بنجاح');
          } else {
            await ApiClient.post('/lessons', payload);
            Toast.success('تمت إضافة ونشر الدرس بنجاح 🎉');
          }
          Modal.close();
          onSaved();
        } catch (err) {
          Toast.error(err.message);
        }
      });
    }

    document.getElementById('filter-lesson-search')?.addEventListener('input', debounce(loadLessons, 300));
    document.getElementById('filter-lesson-unit')?.addEventListener('change', loadLessons);
    document.getElementById('filter-lesson-access')?.addEventListener('change', loadLessons);

    await loadLessons();
  }

  /* ===================================================================
     4. QUESTION BANK MANAGEMENT (Full CRUD for Admin & Assistants)
  =================================================================== */
  static async renderQuestionBank(container) {
    container.innerHTML = `
      <div style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
        <div>
          <h2 style="font-size:1.8rem;font-weight:900;color:var(--color-text-main);">بنك الأسئلة المركزي 📝</h2>
          <p style="color:var(--color-text-muted);">إضافة وتعديل وحذف أسئلة الاختيار من متعدد والصواب والخطأ وتحليل الأكواد وتصنيفها</p>
        </div>
        <button id="btn-add-question" class="btn btn-primary btn-sm" style="font-weight:700;">+ إضافة سؤال جديد</button>
      </div>

      <div class="card" style="margin-bottom:1.5rem;display:flex;gap:1rem;flex-wrap:wrap;padding:1rem;">
        <input type="text" id="filter-q-search" class="form-input" placeholder="بحث في نص السؤال..." style="flex:1;min-width:200px;">
        <select id="filter-q-diff" class="form-input" style="width:auto;">
          <option value="">جميع الصعوبات</option>
          <option value="easy">سهل (Easy)</option>
          <option value="medium">متوسط (Medium)</option>
          <option value="hard">صعب (Hard)</option>
        </select>
        <select id="filter-q-type" class="form-input" style="width:auto;">
          <option value="">جميع الأنواع</option>
          <option value="multiple_choice">اختيار من متعدد (MCQ)</option>
          <option value="true_false">صح أو خطأ (True/False)</option>
          <option value="code">تحليل كود برمجى</option>
        </select>
      </div>

      <div class="card">
        <div class="table-container">
          <table class="table" style="width:100%;">
            <thead>
              <tr>
                <th>نص السؤال</th>
                <th>النوع</th>
                <th>الصعوبة</th>
                <th>الموضوع</th>
                <th>الإجابة الصحيحة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody id="questions-table-body">
              <tr><td colspan="6" class="text-center" style="padding:2rem;">جاري التحميل...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    async function loadQuestions() {
      const search = document.getElementById('filter-q-search')?.value || '';
      const diff = document.getElementById('filter-q-diff')?.value || '';
      const qtype = document.getElementById('filter-q-type')?.value || '';

      let url = `/questions?`;
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (diff) url += `difficulty=${diff}&`;
      if (qtype) url += `qtype=${qtype}&`;

      try {
        const res = await ApiClient.get(url);
        const questions = res.questions || [];
        const tbody = document.getElementById('questions-table-body');

        if (questions.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:2rem;">لا توجد أسئلة تطابق البحث.</td></tr>';
          return;
        }

        tbody.innerHTML = questions.map(q => `
          <tr>
            <td style="max-width:320px;">
              <strong style="color:var(--color-text-main);line-height:1.4;">${q.question_text}</strong>
              ${q.explanation ? `<div style="font-size:0.75rem;color:var(--color-text-muted);margin-top:0.2rem;">الشرح: ${q.explanation}</div>` : ''}
            </td>
            <td>
              <span class="badge" style="background:var(--color-bg-secondary);color:var(--color-primary);font-size:0.75rem;">
                ${q.question_type === 'multiple_choice' ? 'اختيار من متعدد' : (q.question_type === 'true_false' ? 'صح/خطأ' : 'كود')}
              </span>
            </td>
            <td>
              <span class="badge" style="background:rgba(245,158,11,0.15);color:#F59E0B;font-size:0.75rem;">
                ${q.difficulty}
              </span>
            </td>
            <td>${q.topic || 'عام'}</td>
            <td><code style="background:var(--color-bg-surface);padding:0.2rem 0.5rem;border-radius:4px;color:#10B981;font-weight:700;">${q.correct_answer}</code></td>
            <td>
              <div style="display:flex;gap:0.4rem;">
                <button class="btn btn-secondary btn-sm edit-q-btn" data-id="${q.id}">تعديل ✏️</button>
                <button class="btn btn-danger btn-sm del-q-btn" data-id="${q.id}">حذف 🗑️</button>
              </div>
            </td>
          </tr>
        `).join('');

        // Bind Edit Question
        document.querySelectorAll('.edit-q-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const q = questions.find(x => x.id === btn.dataset.id);
            if (q) openQuestionModal(q, loadQuestions);
          });
        });

        // Bind Delete Question
        document.querySelectorAll('.del-q-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const qId = btn.dataset.id;
            Modal.confirm({
              title: 'تأكيد حذف السؤال',
              message: 'هل أنت متأكد من رغبتك في حذف هذا السؤال نهائياً من بنك الأسئلة؟',
              onConfirm: async () => {
                try {
                  await ApiClient.delete(`/questions/${qId}`);
                  Toast.success('تم حذف السؤال بنجاح');
                  loadQuestions();
                } catch (e) {
                  Toast.error(e.message);
                }
              }
            });
          });
        });

        document.getElementById('btn-add-question').onclick = () => openQuestionModal(null, loadQuestions);

      } catch (err) {
        console.error(err);
        Toast.error('فشل تحميل بنك الأسئلة');
      }
    }

    function openQuestionModal(q, onSaved) {
      const isEdit = !!q;
      const opts = q?.options_json ? JSON.parse(q.options_json) : [
        { id: "opt1", text: "" },
        { id: "opt2", text: "" },
        { id: "opt3", text: "" },
        { id: "opt4", text: "" }
      ];

      Modal.open({
        title: isEdit ? 'تعديل السؤال' : 'إضافة سؤال جديد إلى بنك الأسئلة',
        contentHtml: `
          <form id="form-q-save">
            <div class="form-group">
              <label class="form-label">نص السؤال</label>
              <textarea id="m-q-text" class="form-input" rows="3" required placeholder="اكتب نص السؤال هنا بوضوح...">${q?.question_text || ''}</textarea>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div class="form-group">
                <label class="form-label">نوع السؤال</label>
                <select id="m-q-type" class="form-input">
                  <option value="multiple_choice" ${q?.question_type === 'multiple_choice' ? 'selected' : ''}>اختيار من متعدد (MCQ)</option>
                  <option value="true_false" ${q?.question_type === 'true_false' ? 'selected' : ''}>صح أو خطأ (True / False)</option>
                  <option value="code" ${q?.question_type === 'code' ? 'selected' : ''}>تحليل مخرجات كود</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">مستوى الصعوبة</label>
                <select id="m-q-diff" class="form-input">
                  <option value="easy" ${q?.difficulty === 'easy' ? 'selected' : ''}>سهل (Easy)</option>
                  <option value="medium" ${q?.difficulty === 'medium' ? 'selected' : ''}>متوسط (Medium)</option>
                  <option value="hard" ${q?.difficulty === 'hard' ? 'selected' : ''}>صعب (Hard)</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">الموضوع البرمجي (Topic)</label>
              <input type="text" id="m-q-topic" class="form-input" value="${q?.topic || ''}" placeholder="مثال: المتغيرات، الدوال، الحلقات التكرارية">
            </div>
            
            <div style="margin-top:1rem;margin-bottom:0.5rem;font-weight:700;color:var(--color-primary);">الخيارات وتحديد الإجابة الصحيحة:</div>
            <div style="display:flex;flex-direction:column;gap:0.6rem;">
              <div style="display:flex;gap:0.5rem;align-items:center;">
                <input type="radio" name="correct_opt" value="opt1" ${q?.correct_answer === 'opt1' ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--color-primary);">
                <input type="text" id="opt-val-1" class="form-input" placeholder="الخيار الأول (opt1)" value="${opts[0]?.text || ''}">
              </div>
              <div style="display:flex;gap:0.5rem;align-items:center;">
                <input type="radio" name="correct_opt" value="opt2" ${q?.correct_answer === 'opt2' || !q ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--color-primary);">
                <input type="text" id="opt-val-2" class="form-input" placeholder="الخيار الثاني (opt2)" value="${opts[1]?.text || ''}">
              </div>
              <div style="display:flex;gap:0.5rem;align-items:center;">
                <input type="radio" name="correct_opt" value="opt3" ${q?.correct_answer === 'opt3' ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--color-primary);">
                <input type="text" id="opt-val-3" class="form-input" placeholder="الخيار الثالث (opt3)" value="${opts[2]?.text || ''}">
              </div>
              <div style="display:flex;gap:0.5rem;align-items:center;">
                <input type="radio" name="correct_opt" value="opt4" ${q?.correct_answer === 'opt4' ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--color-primary);">
                <input type="text" id="opt-val-4" class="form-input" placeholder="الخيار الرابع (opt4)" value="${opts[3]?.text || ''}">
              </div>
            </div>

            <div class="form-group" style="margin-top:1rem;">
              <label class="form-label">شرح وتفسير الإجابة النموذجية (Explanation)</label>
              <textarea id="m-q-exp" class="form-input" rows="2" placeholder="اكتب سبب صحة الإجابة ليظهر للطالب بعد الحل...">${q?.explanation || ''}</textarea>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;font-weight:700;margin-top:0.5rem;">
              ${isEdit ? 'حفظ التعديلات' : 'إضافة السؤال لبنك الأسئلة 📝'}
            </button>
          </form>
        `
      });

      document.getElementById('form-q-save').addEventListener('submit', async (e) => {
        e.preventDefault();
        const selectedRadio = document.querySelector('input[name="correct_opt"]:checked');
        const correctVal = selectedRadio ? selectedRadio.value : 'opt2';

        const customOpts = [
          { id: "opt1", text: document.getElementById('opt-val-1').value.trim() },
          { id: "opt2", text: document.getElementById('opt-val-2').value.trim() },
          { id: "opt3", text: document.getElementById('opt-val-3').value.trim() },
          { id: "opt4", text: document.getElementById('opt-val-4').value.trim() }
        ];

        const payload = {
          question_text: document.getElementById('m-q-text').value.trim(),
          question_type: document.getElementById('m-q-type').value,
          difficulty: document.getElementById('m-q-diff').value,
          topic: document.getElementById('m-q-topic').value.trim() || 'عام',
          options_json: JSON.stringify(customOpts),
          correct_answer: correctVal,
          explanation: document.getElementById('m-q-exp').value.trim()
        };

        try {
          if (isEdit) {
            await ApiClient.put(`/questions/${q.id}`, payload);
            Toast.success('تم تعديل السؤال بنجاح');
          } else {
            await ApiClient.post('/questions', payload);
            Toast.success('تمت إضافة السؤال لبنك الأسئلة بنجاح 🎉');
          }
          Modal.close();
          onSaved();
        } catch (err) {
          Toast.error(err.message);
        }
      });
    }

    document.getElementById('filter-q-search')?.addEventListener('input', debounce(loadQuestions, 300));
    document.getElementById('filter-q-diff')?.addEventListener('change', loadQuestions);
    document.getElementById('filter-q-type')?.addEventListener('change', loadQuestions);

    await loadQuestions();
  }

  /* ===================================================================
     5. EXAMS MANAGEMENT & SUBMISSIONS (Full CRUD for Admin & Assistants)
  =================================================================== */
  static async renderExams(container) {
    container.innerHTML = `
      <div style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
        <div>
          <h2 style="font-size:1.8rem;font-weight:900;color:var(--color-text-main);">إدارة وتصحيح الامتحانات 🎯</h2>
          <p style="color:var(--color-text-muted);">إنشاء وتعديل الامتحانات واختيار الأسئلة من بنك الأسئلة ومتابعة نتائج الطلاب لحظياً</p>
        </div>
        <button id="btn-add-exam" class="btn btn-primary btn-sm" style="font-weight:700;">+ إنشاء امتحان جديد</button>
      </div>

      <div class="card">
        <div class="table-container">
          <table class="table" style="width:100%;">
            <thead>
              <tr>
                <th>عنوان الامتحان</th>
                <th>المدة</th>
                <th>درجة النجاح</th>
                <th>المحاولات</th>
                <th>الوصول</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody id="exams-table-body">
              <tr><td colspan="7" class="text-center" style="padding:2rem;">جاري التحميل...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    async function loadExams() {
      try {
        const [exams, qRes] = await Promise.all([
          ApiClient.get('/exams'),
          ApiClient.get('/questions').catch(() => ({ questions: [] }))
        ]);

        const allQuestions = qRes.questions || [];
        const tbody = document.getElementById('exams-table-body');

        if (!exams || exams.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding:2rem;">لا توجد امتحانات مضافة بعد.</td></tr>';
          return;
        }

        tbody.innerHTML = exams.map(ex => `
          <tr>
            <td>
              <strong style="color:var(--color-text-main);">${ex.title}</strong>
              <div style="font-size:0.75rem;color:var(--color-text-muted);">${ex.description || ''}</div>
            </td>
            <td>${ex.duration_minutes} دقيقة</td>
            <td><span style="color:#10B981;font-weight:700;">${ex.passing_score}%</span></td>
            <td>${ex.max_attempts}</td>
            <td>
              <span class="badge ${ex.access_type === 'PUBLIC' ? 'badge-public' : 'badge-subscribers'}">
                ${ex.access_type === 'PUBLIC' ? 'عام' : 'مشتركين 🔑'}
              </span>
            </td>
            <td>
              <span class="badge ${ex.is_published ? 'badge-public' : 'badge-danger'}">
                ${ex.is_published ? 'منشور ✅' : 'مسودة ⏸️'}
              </span>
            </td>
            <td>
              <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
                <button class="btn btn-secondary btn-sm view-results-btn" data-id="${ex.id}">النتائج 📊</button>
                <button class="btn btn-secondary btn-sm edit-exam-btn" data-id="${ex.id}">تعديل ✏️</button>
                <button class="btn btn-danger btn-sm del-exam-btn" data-id="${ex.id}">حذف 🗑️</button>
              </div>
            </td>
          </tr>
        `).join('');

        // View Student Results
        document.querySelectorAll('.view-results-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const exId = btn.dataset.id;
            try {
              const results = await ApiClient.get(`/exams/${exId}/results`);
              Modal.open({
                title: 'نتائج ومحاولات الطلاب في الامتحان',
                contentHtml: `
                  <div class="table-container" style="max-height:350px;overflow-y:auto;">
                    <table class="table" style="width:100%;">
                      <thead>
                        <tr>
                          <th>الطالب</th>
                          <th>اسم المستخدم</th>
                          <th>الدرجة المحققة</th>
                          <th>النسبة</th>
                          <th>الحالة</th>
                          <th>تاريخ التسليم</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${results && results.length > 0 ? results.map(r => `
                          <tr>
                            <td><strong>${r.student_name}</strong></td>
                            <td style="font-family:var(--font-mono);">${r.student_username}</td>
                            <td>${r.score} / ${r.total_possible}</td>
                            <td><strong>${r.percentage}%</strong></td>
                            <td>
                              <span class="badge ${r.is_passed ? 'badge-public' : 'badge-danger'}">
                                ${r.is_passed ? 'ناجح ✅' : 'راسب ❌'}
                              </span>
                            </td>
                            <td>${r.completed_at ? r.completed_at.substring(0, 16).replace('T', ' ') : '—'}</td>
                          </tr>
                        `).join('') : '<tr><td colspan="6" class="text-center" style="padding:1.5rem;">لا توجد محاولات مسجلة بعد لهذا الامتحان.</td></tr>'}
                      </tbody>
                    </table>
                  </div>
                `
              });
            } catch (e) {
              Toast.error(e.message);
            }
          });
        });

        // Edit Exam
        document.querySelectorAll('.edit-exam-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const ex = exams.find(x => x.id === btn.dataset.id);
            const fullExam = await ApiClient.get(`/exams/${ex.id}`).catch(() => ex);
            openExamModal(fullExam, allQuestions, loadExams);
          });
        });

        // Delete Exam
        document.querySelectorAll('.del-exam-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const exId = btn.dataset.id;
            Modal.confirm({
              title: 'تأكيد حذف الامتحان',
              message: 'هل أنت متأكد من رغبتك في حذف هذا الامتحان بالكامل وكافة محاولات الطلاب المرتبطة به؟',
              onConfirm: async () => {
                try {
                  await ApiClient.delete(`/exams/${exId}`);
                  Toast.success('تم حذف الامتحان بنجاح');
                  loadExams();
                } catch (e) {
                  Toast.error(e.message);
                }
              }
            });
          });
        });

        document.getElementById('btn-add-exam').onclick = () => openExamModal(null, allQuestions, loadExams);

      } catch (err) {
        console.error(err);
        Toast.error('فشل تحميل قائمة الامتحانات');
      }
    }

    function openExamModal(exam, allQuestions, onSaved) {
      const isEdit = !!exam;
      const linkedQIds = exam?.questions ? exam.questions.map(q => q.id) : [];

      Modal.open({
        title: isEdit ? `تعديل الامتحان: ${exam.title}` : 'إنشاء وتكوين امتحان جديد',
        contentHtml: `
          <form id="form-exam-save">
            <div class="form-group">
              <label class="form-label">عنوان الامتحان</label>
              <input type="text" id="m-ex-title" class="form-input" required value="${exam?.title || ''}" placeholder="مثال: امتحان نهاية الوحدة الأولى">
            </div>
            <div class="form-group">
              <label class="form-label">الوصف والتعليمات للطلاب</label>
              <textarea id="m-ex-desc" class="form-input" rows="2" placeholder="اكتب تعليمات الامتحان للطلاب...">${exam?.description || ''}</textarea>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
              <div class="form-group">
                <label class="form-label">المدة (بالدقائق)</label>
                <input type="number" id="m-ex-dur" class="form-input" required value="${exam?.duration_minutes || 45}" min="5">
              </div>
              <div class="form-group">
                <label class="form-label">درجة النجاح (%)</label>
                <input type="number" id="m-ex-pass" class="form-input" required value="${exam?.passing_score || 75}" min="1" max="100">
              </div>
              <div class="form-group">
                <label class="form-label">المحاولات المتاحة</label>
                <input type="number" id="m-ex-att" class="form-input" required value="${exam?.max_attempts || 1}" min="1">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">مستوى الوصول</label>
              <select id="m-ex-access" class="form-input">
                <option value="SUBSCRIBERS_ONLY" ${exam?.access_type === 'SUBSCRIBERS_ONLY' ? 'selected' : ''}>مخصص للمشتركين فقط 🔑</option>
                <option value="PUBLIC" ${exam?.access_type === 'PUBLIC' ? 'selected' : ''}>عام ومتاح للجميع (PUBLIC)</option>
              </select>
            </div>

            <div style="margin-top:1rem;margin-bottom:0.5rem;font-weight:800;color:var(--color-primary);">اختر الأسئلة من بنك الأسئلة (${allQuestions.length} سؤال متاح):</div>
            <div style="max-height:220px;overflow-y:auto;background:var(--color-bg-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:0.75rem;display:flex;flex-direction:column;gap:0.6rem;">
              ${allQuestions.length > 0 ? allQuestions.map((q, idx) => `
                <label style="display:flex;align-items:center;gap:0.75rem;cursor:pointer;padding:0.4rem;border-radius:var(--radius-sm);background:var(--color-bg-card);">
                  <input type="checkbox" name="exam_q_pick" value="${q.id}" ${linkedQIds.includes(q.id) ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--color-primary);">
                  <div style="font-size:0.85rem;color:var(--color-text-main);flex:1;">
                    <span style="color:#F59E0B;font-weight:700;">[${q.difficulty}] </span>
                    <span>${q.question_text}</span>
                  </div>
                </label>
              `).join('') : '<p style="font-size:0.85rem;color:var(--color-text-muted);">لا توجد أسئلة في بنك الأسئلة. قم بإضافة أسئلة أولاً.</p>'}
            </div>

            <button type="submit" class="btn btn-primary" style="width:100%;font-weight:700;margin-top:1.25rem;">
              ${isEdit ? 'حفظ تعديلات الامتحان' : 'إنشاء ونشر الامتحان 🎯'}
            </button>
          </form>
        `
      });

      document.getElementById('form-exam-save').addEventListener('submit', async (e) => {
        e.preventDefault();
        const pickedQIds = Array.from(document.querySelectorAll('input[name="exam_q_pick"]:checked')).map(cb => ({
          question_id: cb.value,
          points: 5.0
        }));

        const payload = {
          title: document.getElementById('m-ex-title').value.trim(),
          description: document.getElementById('m-ex-desc').value.trim(),
          duration_minutes: parseInt(document.getElementById('m-ex-dur').value) || 45,
          passing_score: parseFloat(document.getElementById('m-ex-pass').value) || 75.0,
          max_attempts: parseInt(document.getElementById('m-ex-att').value) || 1,
          access_type: document.getElementById('m-ex-access').value,
          is_published: true,
          questions: pickedQIds
        };

        try {
          if (isEdit) {
            await ApiClient.put(`/exams/${exam.id}`, payload);
            Toast.success('تم تعديل الامتحان بنجاح');
          } else {
            await ApiClient.post('/exams', payload);
            Toast.success('تم إنشاء ونشر الامتحان بنجاح 🎉');
          }
          Modal.close();
          onSaved();
        } catch (err) {
          Toast.error(err.message);
        }
      });
    }

    await loadExams();
  }

  /* ===================================================================
     6. ANNOUNCEMENTS MANAGEMENT (Full CRUD for Admin & Assistants)
  =================================================================== */
  static async renderAnnouncements(container) {
    container.innerHTML = `
      <div style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
        <div>
          <h2 style="font-size:1.8rem;font-weight:900;color:var(--color-text-main);">إدارة ونشر الإعلانات العامة 📢</h2>
          <p style="color:var(--color-text-muted);">بث الرسائل والتبليغات الموجهة لكافة الطلاب أو المشتركين أو المساعدين وتحديثها لحظياً</p>
        </div>
        <button id="btn-add-announcement" class="btn btn-primary btn-sm" style="font-weight:700;">+ نشر إعلان جديد</button>
      </div>

      <div id="announcements-cards-list" style="display:flex;flex-direction:column;gap:1rem;">
        <div class="card skeleton" style="height:120px;"></div>
      </div>
    `;

    async function loadAnnouncements() {
      try {
        const announcements = await ApiClient.get('/announcements');
        const listEl = document.getElementById('announcements-cards-list');

        if (!announcements || announcements.length === 0) {
          listEl.innerHTML = '<div class="card empty-state"><p>لا توجد إعلانات منشورة حالياً.</p></div>';
          return;
        }

        listEl.innerHTML = announcements.map(a => `
          <div class="card" style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;border-right:4px solid var(--color-primary);">
            <div style="flex:1;">
              <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.4rem;">
                <h3 style="font-weight:800;color:var(--color-text-main);font-size:1.25rem;">${a.title}</h3>
                <span class="badge" style="background:var(--color-bg-secondary);color:var(--color-cyan-accent);">
                  الجمهور: ${a.target_audience === 'ALL' ? 'الكل 👥' : (a.target_audience === 'STUDENTS' ? 'الطلاب 🎓' : (a.target_audience === 'SUBSCRIBERS' ? 'المشتركون 🔑' : 'المساعدون 🛡️'))}
                </span>
              </div>
              <p style="color:var(--color-text-muted);font-size:0.95rem;line-height:1.6;margin-bottom:0.75rem;">
                ${a.content}
              </p>
              <div style="font-size:0.8rem;color:var(--color-text-dim);">
                تاريخ النشر: ${a.publish_date ? a.publish_date.substring(0, 10) : ''}
              </div>
            </div>
            <button class="btn btn-danger btn-sm del-ann-btn" data-id="${a.id}">حذف الإعلان 🗑️</button>
          </div>
        `).join('');

        document.querySelectorAll('.del-ann-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const aId = btn.dataset.id;
            Modal.confirm({
              title: 'تأكيد حذف الإعلان',
              message: 'هل أنت متأكد من رغبتك في حذف هذا الإعلان؟ لن يظهر للطلاب بعد الحذف.',
              onConfirm: async () => {
                try {
                  await ApiClient.delete(`/announcements/${aId}`);
                  Toast.success('تم حذف الإعلان بنجاح');
                  loadAnnouncements();
                } catch (e) {
                  Toast.error(e.message);
                }
              }
            });
          });
        });

        document.getElementById('btn-add-announcement').onclick = () => {
          Modal.open({
            title: 'نشر إعلان عام جديد للطلاب',
            contentHtml: `
              <form id="form-ann-save">
                <div class="form-group">
                  <label class="form-label">عنوان الإعلان</label>
                  <input type="text" id="m-ann-title" class="form-input" required placeholder="مثال: موعد اختبار منتصف الفصل القادم">
                </div>
                <div class="form-group">
                  <label class="form-label">الجمهور المستهدف</label>
                  <select id="m-ann-aud" class="form-input">
                    <option value="ALL">كافة المستخدمين (الكل 👥)</option>
                    <option value="STUDENTS">الطلاب فقط 🎓</option>
                    <option value="SUBSCRIBERS">المشتركون فقط 🔑</option>
                    <option value="ASSISTANTS">المساعدون التعليميون 🛡️</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">نص الإعلان بالتفصيل</label>
                  <textarea id="m-ann-content" class="form-input" rows="4" required placeholder="اكتب نص الإعلان هنا بوضوح لجميع الطلاب..."></textarea>
                </div>
                <button type="submit" class="btn btn-primary" style="width:100%;font-weight:700;">نشر الإعلان الآن 📢</button>
              </form>
            `
          });

          document.getElementById('form-ann-save').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
              await ApiClient.post('/announcements', {
                title: document.getElementById('m-ann-title').value.trim(),
                target_audience: document.getElementById('m-ann-aud').value,
                content: document.getElementById('m-ann-content').value.trim()
              });
              Modal.close();
              Toast.success('تم نشر الإعلان بنجاح 🎉');
              loadAnnouncements();
            } catch (err) {
              Toast.error(err.message);
            }
          });
        };

      } catch (err) {
        console.error(err);
        Toast.error('فشل تحميل قائمة الإعلانات');
      }
    }

    await loadAnnouncements();
  }

  /* ===================================================================
     7. SUBSCRIPTION CODES MANAGEMENT
  =================================================================== */
  static async renderSubscriptions(container) {
    container.innerHTML = `
      <div style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
        <div>
          <h2 style="font-size:1.8rem;font-weight:900;color:var(--color-text-main);">إدارة وتوليد أكواد الاشتراكات 🔑</h2>
          <p style="color:var(--color-text-muted);">إنشاء وتتبع أكواد التفعيل وتحديد مدد الصلاحية للطلاب</p>
        </div>
        <button id="btn-generate-code" class="btn btn-primary btn-sm" style="font-weight:700;">+ توليد كود جديد</button>
      </div>

      <div class="card">
        <div class="table-container">
          <table class="table" style="width:100%;">
            <thead>
              <tr>
                <th>كود الاشتراك</th>
                <th>نوع المدة</th>
                <th>الأيام</th>
                <th>الحالة</th>
                <th>المستخدم المستفيد</th>
                <th>تاريخ التوليد</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody id="codes-table-body">
              <tr><td colspan="7" class="text-center" style="padding:2rem;">جاري التحميل...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    async function loadCodes() {
      try {
        const res = await ApiClient.get('/subscriptions/codes');
        const codes = res.codes || [];
        const tbody = document.getElementById('codes-table-body');
        
        if (codes.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding:2rem;">لا توجد أكواد مولدة بعد.</td></tr>';
          return;
        }

        tbody.innerHTML = codes.map(c => `
          <tr>
            <td><strong style="font-family:var(--font-mono);color:var(--color-primary);">${c.code}</strong></td>
            <td>${c.duration_type}</td>
            <td>${c.duration_days} يوم</td>
            <td>
              <span class="badge ${c.status === 'ACTIVE' ? 'badge-public' : (c.status === 'USED' ? 'badge-subscribers' : 'badge-danger')}">
                ${c.status === 'ACTIVE' ? 'نشط وغير مستخدم' : (c.status === 'USED' ? 'تم الاستخدام' : 'معطل / منتهي')}
              </span>
            </td>
            <td>${c.used_by || '—'}</td>
            <td>${c.created_at ? c.created_at.substring(0, 10) : ''}</td>
            <td>
              <button class="btn btn-secondary btn-sm copy-code-btn" data-code="${c.code}" style="padding:0.25rem 0.6rem;font-size:0.8rem;">نسخ</button>
            </td>
          </tr>
        `).join('');

        document.querySelectorAll('.copy-code-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            navigator.clipboard.writeText(btn.dataset.code);
            Toast.success(`تم نسخ الكود: ${btn.dataset.code}`);
          });
        });
      } catch (e) {
        Toast.error('فشل تحميل قائمة الأكواد');
      }
    }

    await loadCodes();

    document.getElementById('btn-generate-code').addEventListener('click', () => {
      Modal.open({
        title: 'توليد كود اشتراك جديد',
        contentHtml: `
          <form id="form-gen-code">
            <div class="form-group">
              <label class="form-label">مدة الاشتراك</label>
              <select id="gen-duration" class="form-input">
                <option value="1_MONTH">شهر واحد (30 يوم)</option>
                <option value="3_MONTHS" selected>3 أشهر (90 يوم)</option>
                <option value="6_MONTHS">6 أشهر (180 يوم)</option>
                <option value="12_MONTHS">سنة كاملة (365 يوم)</option>
                <option value="LIFETIME">مدى الحياة (Lifetime)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">كود مخصص (اختياري، اتركه فارغاً لتوليد كود تلقائي CS-XXXX-XXXX)</label>
              <input type="text" id="gen-custom-code" class="form-input" placeholder="مثال: CS-SUMMER-2026" style="text-transform:uppercase;">
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;font-weight:700;margin-top:0.5rem;">توليد الكود الآن 🔑</button>
          </form>
        `
      });

      document.getElementById('form-gen-code').addEventListener('submit', async (e) => {
        e.preventDefault();
        const duration = document.getElementById('gen-duration').value;
        const custom = document.getElementById('gen-custom-code').value.trim() || null;
        try {
          const res = await ApiClient.post('/subscriptions/codes/generate', {
            duration_type: duration,
            custom_code: custom
          });
          Modal.close();
          Toast.success(`تم توليد الكود بنجاح: ${res.code.code}`);
          loadCodes();
        } catch (err) {
          Toast.error(err.message);
        }
      });
    });
  }

  /* ===================================================================
     8. ASSISTANTS & PERMISSIONS MANAGEMENT
  =================================================================== */
  static async renderAssistants(container) {
    container.innerHTML = `
      <div style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
        <div>
          <h2 style="font-size:1.8rem;font-weight:900;color:var(--color-text-main);">إدارة المساعدين التعليميين والصلاحيات 🛡️</h2>
          <p style="color:var(--color-text-muted);">تخصيص صلاحيات الوصول التفصيلية لكل مساعد تعليمي</p>
        </div>
        <button id="btn-add-assistant" class="btn btn-primary btn-sm" style="font-weight:700;">+ إضافة مساعد جديد</button>
      </div>

      <div id="assistants-cards-grid" style="display:grid;grid-template-columns:1fr;gap:1.25rem;">
        <div class="card skeleton" style="height:160px;"></div>
      </div>
    `;

    async function loadAssistants() {
      try {
        const res = await ApiClient.get('/assistants');
        const assistants = res.assistants || [];
        const availPerms = res.available_permissions || {};
        const grid = document.getElementById('assistants-cards-grid');

        if (assistants.length === 0) {
          grid.innerHTML = '<div class="card empty-state"><p>لا يوجد مساعدين مسجلين حالياً.</p></div>';
          return;
        }

        grid.innerHTML = assistants.map(a => `
          <div class="card" style="border:1px solid var(--color-border);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;margin-bottom:1rem;">
              <div>
                <h3 style="font-weight:800;color:var(--color-text-main);font-size:1.3rem;">${a.full_name}</h3>
                <div style="font-size:0.85rem;color:var(--color-text-muted);">
                  اسم المستخدم: <span style="font-family:var(--font-mono);color:var(--color-primary);">${a.username}</span> • البريد: ${a.email}
                </div>
              </div>
              <div style="display:flex;gap:0.5rem;">
                <button class="btn btn-secondary btn-sm edit-perms-btn" data-asst-id="${a.id}">تعديل الصلاحيات ✏️</button>
                <button class="btn btn-danger btn-sm del-asst-btn" data-asst-id="${a.id}">حذف</button>
              </div>
            </div>

            <div>
              <h4 style="font-size:0.9rem;font-weight:700;color:var(--color-text-muted);margin-bottom:0.6rem;">الصلاحيات المفعلة حالياً:</h4>
              <div style="display:flex;flex-wrap:wrap;gap:0.4rem;">
                ${a.permissions && a.permissions.length > 0 ? a.permissions.map(p => `
                  <span class="badge" style="background:var(--color-bg-secondary);color:var(--color-cyan-accent);border:1px solid var(--color-border);font-size:0.8rem;">
                    ${availPerms[p] || p}
                  </span>
                `).join('') : '<span style="font-size:0.85rem;color:var(--color-text-dim);">لا توجد صلاحيات مفعلة</span>'}
              </div>
            </div>
          </div>
        `).join('');

        document.querySelectorAll('.edit-perms-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const asstId = btn.dataset.asstId;
            const asst = assistants.find(x => x.id === asstId);
            if (!asst) return;

            const currentPerms = asst.permissions || [];
            Modal.open({
              title: `تعديل صلاحيات المساعد: ${asst.full_name}`,
              contentHtml: `
                <form id="form-edit-perms">
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;max-height:350px;overflow-y:auto;padding:0.5rem;" class="perms-grid">
                    ${Object.entries(availPerms).map(([key, label]) => `
                      <label style="display:flex;align-items:center;gap:0.6rem;background:var(--color-bg-surface);padding:0.6rem 0.8rem;border-radius:var(--radius-sm);border:1px solid var(--color-border);cursor:pointer;">
                        <input type="checkbox" name="asst_perm" value="${key}" ${currentPerms.includes(key) ? 'checked' : ''} style="accent-color:var(--color-primary);width:16px;height:16px;">
                        <span style="font-size:0.85rem;color:var(--color-text-main);">${label}</span>
                      </label>
                    `).join('')}
                  </div>
                  <button type="submit" class="btn btn-primary" style="width:100%;margin-top:1.25rem;font-weight:700;">حفظ الصلاحيات</button>
                </form>
              `
            });

            document.getElementById('form-edit-perms').addEventListener('submit', async (e) => {
              e.preventDefault();
              const checked = Array.from(document.querySelectorAll('input[name="asst_perm"]:checked')).map(cb => cb.value);
              try {
                await ApiClient.put(`/assistants/${asstId}/permissions`, { permissions: checked });
                Modal.close();
                Toast.success('تم تحديث صلاحيات المساعد بنجاح');
                loadAssistants();
              } catch (err) {
                Toast.error(err.message);
              }
            });
          });
        });

        document.querySelectorAll('.del-asst-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            Modal.confirm({
              title: 'حذف المساعد',
              message: 'هل أنت متأكد من حذف حساب هذا المساعد وسحب كافة صلاحياته؟',
              onConfirm: async () => {
                await ApiClient.delete(`/assistants/${btn.dataset.asstId}`);
                Toast.success('تم حذف المساعد');
                loadAssistants();
              }
            });
          });
        });

      } catch (err) {
        Toast.error('فشل تحميل قائمة المساعدين');
      }
    }

    await loadAssistants();

    document.getElementById('btn-add-assistant').addEventListener('click', () => {
      Modal.open({
        title: 'إضافة مساعد تعليمي جديد',
        contentHtml: `
          <form id="form-new-asst">
            <div class="form-group">
              <label class="form-label">الاسم بالكامل</label>
              <input type="text" id="asst-name" class="form-input" required placeholder="مثال: م. أحمد عبد الله">
            </div>
            <div class="form-group">
              <label class="form-label">اسم المستخدم</label>
              <input type="text" id="asst-user" class="form-input" required placeholder="ahmed_assistant">
            </div>
            <div class="form-group">
              <label class="form-label">البريد الإلكتروني</label>
              <input type="email" id="asst-email" class="form-input" required placeholder="assistant@codespark.edu">
            </div>
            <div class="form-group">
              <label class="form-label">كلمة المرور</label>
              <input type="password" id="asst-pass" class="form-input" required placeholder="••••••••" minlength="6">
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;font-weight:700;">إنشاء الحساب</button>
          </form>
        `
      });

      document.getElementById('form-new-asst').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await ApiClient.post('/assistants', {
            full_name: document.getElementById('asst-name').value,
            username: document.getElementById('asst-user').value,
            email: document.getElementById('asst-email').value,
            password: document.getElementById('asst-pass').value,
            permissions: ["questions.read", "questions.create", "exams.read", "exams.create"]
          });
          Modal.close();
          Toast.success('تم إضافة المساعد التعليمي بنجاح');
          loadAssistants();
        } catch (err) {
          Toast.error(err.message);
        }
      });
    });
  }

  /* ===================================================================
     9. STUDENTS MANAGEMENT
  =================================================================== */
  static async renderStudents(container) {
    container.innerHTML = `
      <div style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
        <div>
          <h2 style="font-size:1.8rem;font-weight:900;color:var(--color-text-main);">إدارة الطلاب المسجلين 👥</h2>
          <p style="color:var(--color-text-muted);">متابعة حسابات واشتراكات وتقدم الطلاب</p>
        </div>
      </div>

      <div class="card">
        <div class="table-container">
          <table class="table" style="width:100%;">
            <thead>
              <tr>
                <th>الطالب</th>
                <th>اسم المستخدم</th>
                <th>البريد الإلكتروني</th>
                <th>حالة الاشتراك</th>
                <th>النقاط (XP)</th>
                <th>تاريخ التسجيل</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody id="students-table-body">
              <tr><td colspan="7" class="text-center" style="padding:2rem;">جاري التحميل...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    try {
      const res = await ApiClient.get('/students');
      const students = res.students || [];
      const tbody = document.getElementById('students-table-body');

      if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding:2rem;">لا يوجد طلاب مسجلون بعد.</td></tr>';
        return;
      }

      tbody.innerHTML = students.map(s => `
        <tr>
          <td><strong>${s.full_name}</strong></td>
          <td style="font-family:var(--font-mono);">${s.username}</td>
          <td>${s.email}</td>
          <td>
            <span class="badge ${s.is_subscribed ? 'badge-public' : 'badge-subscribers'}">
              ${s.is_subscribed ? 'مشترك نشط 🔑' : 'خطة مجانية'}
            </span>
          </td>
          <td><span style="color:#F59E0B;font-weight:700;">${s.stats?.xp || 0} XP</span></td>
          <td>${s.created_at ? s.created_at.substring(0, 10) : ''}</td>
          <td>
            <button class="btn btn-secondary btn-sm toggle-student-btn" data-id="${s.id}">
              ${s.is_active ? 'نشط ✅' : 'معطل ❌'}
            </button>
          </td>
        </tr>
      `).join('');

      document.querySelectorAll('.toggle-student-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            const res = await ApiClient.put(`/students/${btn.dataset.id}/toggle-active`);
            Toast.success(res.is_active ? 'تم تفعيل الحساب' : 'تم تعطيل الحساب');
            AdminPages.renderStudents(container);
          } catch (e) {
            Toast.error(e.message);
          }
        });
      });

    } catch (e) {
      Toast.error('فشل تحميل قائمة الطلاب');
    }
  }

}
