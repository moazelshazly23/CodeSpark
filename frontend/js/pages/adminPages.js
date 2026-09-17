/**
 * CodeSpark - Administrator & Staff Management Portal
 * Includes Analytics, Students, Assistants, Curriculum, Lessons, Study Files,
 * Question Bank, Exams, Subscription Plans, Codes, Payment Requests,
 * SEPARATE Payment Settings ("طرق الدفع والاشتراك"), and Announcements.
 */
import ApiClient from '../api/apiClient.js';
import AuthService from '../auth/authService.js';
import { Toast, Modal } from '../components/ui.js';

export class AdminPages {
  // ---------------------------------------------------------------------------
  // 1. Admin Analytics Dashboard
  // ---------------------------------------------------------------------------
  static async renderDashboard(container) {
    const user = AuthService.getUser() || {};
    container.innerHTML = `
      <div class="admin-dashboard">
        <div class="page-header mb-4">
          <div class="page-badge">الإدارة المركزية</div>
          <h1 class="page-title">لوحة الإحصائيات والمتابعة العامة 📊</h1>
          <p class="text-muted">مرحباً بك يا ${user.full_name || 'المشرف'}، إليك ملخص نشاط المنصة وحالة الاشتراكات اليوم.</p>
        </div>

        <div class="grid grid-4 mb-4" id="admin-stats-grid">
          <div class="card stat-card"><div class="stat-val" id="st-students">...</div><div class="stat-lbl">إجمالي الطلاب</div></div>
          <div class="card stat-card"><div class="stat-val" id="st-subs">...</div><div class="stat-lbl">الاشتراكات النشطة</div></div>
          <div class="card stat-card"><div class="stat-val" id="st-reqs">...</div><div class="stat-lbl">طلبات الدفع المعلقة</div></div>
          <div class="card stat-card"><div class="stat-val" id="st-lessons">...</div><div class="stat-lbl">الدروس التعليمية</div></div>
        </div>

        <!-- Quick Shortcuts -->
        <div class="card p-4 mb-4">
          <h3 class="mb-3">إجراءات إدارية سريعة ⚡</h3>
          <div style="display:flex;gap:1rem;flex-wrap:wrap;">
            <a href="#/admin/subscription-requests" class="btn btn-primary">📥 مراجعة طلبات الاشتراكات</a>
            <a href="#/admin/payment-settings" class="btn btn-secondary">💳 ضبط أرقام فودافون كاش وإنستاباي</a>
            <a href="#/admin/subscriptions" class="btn btn-secondary">🔑 توليد أكواد تفعيل جديدة</a>
            <a href="#/admin/lessons" class="btn btn-secondary">📚 إضافة وتعديل الدروس</a>
            <a href="#/admin/files" class="btn btn-secondary">📁 إدارة الملفات والمذكرات</a>
            <a href="#/admin/announcements" class="btn btn-secondary">📢 نشر إعلان عام</a>
          </div>
        </div>
      </div>
    `;

    try {
      const stats = await ApiClient.get('/admin/stats');
      document.getElementById('st-students').textContent = stats.total_students || 0;
      document.getElementById('st-subs').textContent = stats.active_subscriptions || 0;
      document.getElementById('st-reqs').textContent = stats.pending_payment_requests || 0;
      document.getElementById('st-lessons').textContent = stats.total_lessons || 0;
    } catch (err) {
      console.error('Error loading admin stats:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Student Management
  // ---------------------------------------------------------------------------
  static async renderStudents(container) {
    container.innerHTML = `
      <div class="admin-students-page">
        <div class="page-header mb-4">
          <div class="page-badge">شؤون الطلاب</div>
          <h1 class="page-title">إدارة حسابات الطلاب 👥</h1>
        </div>

        <div class="card p-4 mb-4">
          <div class="table-search-bar mb-3" style="display:flex;gap:1rem;">
            <input type="text" id="input-search-students" class="form-input" placeholder="البحث بالاسم أو اسم المستخدم أو الهاتف...">
            <button id="btn-search-students" class="btn btn-primary">بحث</button>
          </div>

          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>الاسم بالكامل</th>
                  <th>اسم المستخدم</th>
                  <th>البريد الإلكتروني</th>
                  <th>رقم الهاتف</th>
                  <th>الحالة</th>
                  <th>تاريخ التسجيل</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody id="students-table-body">
                <tr><td colspan="7" class="text-center text-muted">جاري تحميل الطلاب...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    async function loadStudents(query = '') {
      try {
        const res = await ApiClient.get('/users/all', { role: 'student', search: query });
        const students = Array.isArray(res) ? res : res.users || [];
        const tbody = document.getElementById('students-table-body');
        if (!students || students.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">لا يوجد طلاب مسجلين.</td></tr>';
          return;
        }

        tbody.innerHTML = students.map(s => `
          <tr>
            <td><strong>${s.full_name}</strong></td>
            <td><code>${s.username}</code></td>
            <td>${s.email}</td>
            <td>${s.phone || '—'}</td>
            <td>
              <span class="badge ${s.is_active ? 'badge-success' : 'badge-danger'}">
                ${s.is_active ? 'نشط' : 'معطل'}
              </span>
            </td>
            <td>${new Date(s.created_at).toLocaleDateString('ar-EG')}</td>
            <td>
              <button class="btn btn-sm btn-secondary btn-toggle-student" data-id="${s.id}">
                ${s.is_active ? 'تعطيل الحساب' : 'تنشيط الحساب'}
              </button>
            </td>
          </tr>
        `).join('');

        tbody.querySelectorAll('.btn-toggle-student').forEach(b => {
          b.addEventListener('click', async () => {
            try {
              await ApiClient.post(`/users/${b.dataset.id}/toggle-active`);
              Toast.success('تم تعديل حالة الحساب بنجاح');
              loadStudents(query);
            } catch (err) {
              Toast.error(err.message || 'فشل تعديل حالة الحساب');
            }
          });
        });
      } catch (err) {
        console.error('Error loading students:', err);
      }
    }

    loadStudents();
    document.getElementById('btn-search-students').addEventListener('click', () => {
      loadStudents(document.getElementById('input-search-students').value.trim());
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Assistants Management
  // ---------------------------------------------------------------------------
  static async renderAssistants(container) {
    container.innerHTML = `
      <div class="admin-assistants-page">
        <div class="page-header mb-4" style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div class="page-badge">فريق العمل</div>
            <h1 class="page-title">إدارة المساعدين التعليميين والصلاحيات 🧑‍🏫</h1>
          </div>
          <button class="btn btn-primary" id="btn-open-create-asst">➕ إضافة مساعد جديد</button>
        </div>

        <div class="card p-4 mb-4">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>اسم المستخدم</th>
                  <th>البريد الإلكتروني</th>
                  <th>الهاتف</th>
                  <th>الصلاحيات</th>
                </tr>
              </thead>
              <tbody id="assistants-table-body">
                <tr><td colspan="5" class="text-center text-muted">جاري تحميل المساعدين...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Create Assistant Modal -->
        <div id="modal-create-asst" class="modal-wrapper" style="display:none;">
          <div class="modal-content" style="max-width:550px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
              <h3>إضافة مساعد تعليمي جديد</h3>
              <button class="btn btn-sm btn-secondary" onclick="document.getElementById('modal-create-asst').style.display='none'">✕</button>
            </div>
            <form id="form-create-assistant">
              <div class="form-group">
                <label class="form-label">الاسم بالكامل *</label>
                <input type="text" id="asst-name" class="form-input" required>
              </div>
              <div class="form-group">
                <label class="form-label">اسم المستخدم *</label>
                <input type="text" id="asst-user" class="form-input" required>
              </div>
              <div class="form-group">
                <label class="form-label">البريد الإلكتروني *</label>
                <input type="email" id="asst-email" class="form-input" required>
              </div>
              <div class="form-group">
                <label class="form-label">رقم الهاتف</label>
                <input type="tel" id="asst-phone" class="form-input">
              </div>
              <div class="form-group">
                <label class="form-label">كلمة المرور *</label>
                <input type="password" id="asst-pass" class="form-input" minlength="6" required>
              </div>
              <div class="alert alert-info mt-2" style="font-size:0.85rem;">
                ℹ️ تنبيه أمني: يمنح المساعد تلقائياً صلاحية توليد الأكواد الشهرية فقط ومتابعة الطلاب، ولا يمكنه تغيير الأسعار أو إعدادات طرق الدفع.
              </div>
              <div style="display:flex;gap:1rem;margin-top:1.5rem;">
                <button type="submit" class="btn btn-primary" style="flex:1;">إنشاء حساب المساعد</button>
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-create-asst').style.display='none'">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    async function loadAssistants() {
      try {
        const res = await ApiClient.get('/assistants');
        const assts = ApiClient.extractList(res, 'assistants');
        const tbody = document.getElementById('assistants-table-body');
        if (!assts || assts.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">لا يوجد مساعدين مسجلين.</td></tr>';
          return;
        }

        tbody.innerHTML = assts.map(a => `
          <tr>
            <td><strong>${a.full_name}</strong></td>
            <td><code>${a.username}</code></td>
            <td>${a.email}</td>
            <td>${a.phone || '—'}</td>
            <td>
              <span class="badge badge-info">توليد أكواد شهرية (30 يوماً)</span>
              <span class="badge badge-primary">متابعة بنك الأسئلة</span>
            </td>
          </tr>
        `).join('');
      } catch (err) {
        console.error('Error loading assistants:', err);
      }
    }

    loadAssistants();

    document.getElementById('btn-open-create-asst').addEventListener('click', () => {
      document.getElementById('modal-create-asst').style.display = 'flex';
    });

    document.getElementById('form-create-assistant').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await ApiClient.post('/assistants', {
          full_name: document.getElementById('asst-name').value.trim(),
          username: document.getElementById('asst-user').value.trim(),
          email: document.getElementById('asst-email').value.trim(),
          phone: document.getElementById('asst-phone').value.trim(),
          password: document.getElementById('asst-pass').value,
          permissions: ['codes.monthly_generate', 'students.read', 'questions.read']
        });
        Toast.success('تم إنشاء حساب المساعد التعليمي بنجاح! 🚀');
        document.getElementById('modal-create-asst').style.display = 'none';
        document.getElementById('form-create-assistant').reset();
        loadAssistants();
      } catch (err) {
        Toast.error(err.message || 'فشل إنشاء حساب المساعد');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 4. Curriculum & Units Management
  // ---------------------------------------------------------------------------
  static async renderCourses(container) {
    container.innerHTML = `
      <div class="admin-courses-page">
        <div class="page-header mb-4" style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div class="page-badge">المقررات الدراسية</div>
            <h1 class="page-title">إدارة المناهج والوحدات التعليمية 🎓</h1>
          </div>
          <button class="btn btn-primary" id="btn-add-unit">➕ إضافة وحدة تعليمية جديدة</button>
        </div>

        <div id="admin-curriculum-tree" class="card p-4">
          <div class="text-center text-muted">جاري تحميل هيكل المنهج الدراسي...</div>
        </div>

        <!-- Add Unit Modal -->
        <div id="modal-add-unit" class="modal-wrapper" style="display:none;">
          <div class="modal-content" style="max-width:500px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
              <h3>إضافة وحدة تعليمية جديدة</h3>
              <button class="btn btn-sm btn-secondary" onclick="document.getElementById('modal-add-unit').style.display='none'">✕</button>
            </div>
            <form id="form-create-unit">
              <input type="hidden" id="unit-course-id">
              <div class="form-group">
                <label class="form-label">عنوان الوحدة *</label>
                <input type="text" id="unit-title" class="form-input" placeholder="مثال: الوحدة الثالثة: الدوال البرمجية (Functions)" required>
              </div>
              <div class="form-group">
                <label class="form-label">وصف محتوى الوحدة</label>
                <textarea id="unit-desc" class="form-input" rows="3" placeholder="مقدمة موجزة عن مفاهيم هذه الوحدة"></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">ترتيب الظهور</label>
                <input type="number" id="unit-order" class="form-input" value="3">
              </div>
              <div style="display:flex;gap:1rem;margin-top:1.5rem;">
                <button type="submit" class="btn btn-primary" style="flex:1;">حفظ الوحدة</button>
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-add-unit').style.display='none'">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    async function loadCurriculum() {
      try {
        const res = await ApiClient.get('/courses');
        const courses = ApiClient.extractList(res, 'courses');
        const treeEl = document.getElementById('admin-curriculum-tree');

        if (!courses || courses.length === 0) {
          treeEl.innerHTML = '<div class="text-center text-muted">لا توجد مناهج مضافة.</div>';
          return;
        }

        let html = '';
        for (const c of courses) {
          document.getElementById('unit-course-id').value = c.id;
          const detail = await ApiClient.get(`/courses/${c.id}`);
          const units = detail.units || [];

          html += `
            <div class="course-admin-box mb-4">
              <div class="course-title-row mb-3" style="display:flex;justify-content:space-between;align-items:center;">
                <h2>${c.title}</h2>
                <span class="badge badge-primary">${c.academic_term || 'العام الدراسي'}</span>
              </div>
              <div class="units-list">
                ${units.map(u => `
                  <div class="unit-admin-item card p-3 mb-2" style="background:#090E1A;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                      <div>
                        <strong>${u.title}</strong>
                        <div class="text-muted" style="font-size:0.85rem;">${u.description || ''} • (${(u.lessons || []).length} دروس)</div>
                      </div>
                      <div style="display:flex;gap:0.5rem;">
                        <a href="#/admin/lessons" class="btn btn-sm btn-outline-cyan">إدارة دروس الوحدة 📚</a>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }
        treeEl.innerHTML = html;
      } catch (err) {
        console.error('Error loading admin curriculum:', err);
      }
    }

    loadCurriculum();

    document.getElementById('btn-add-unit').addEventListener('click', () => {
      document.getElementById('modal-add-unit').style.display = 'flex';
    });

    document.getElementById('form-create-unit').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await ApiClient.post('/units', {
          course_id: document.getElementById('unit-course-id').value,
          title: document.getElementById('unit-title').value.trim(),
          description: document.getElementById('unit-desc').value.trim(),
          order_index: parseInt(document.getElementById('unit-order').value, 10) || 0,
          is_published: true
        });
        Toast.success('تمت إضافة الوحدة التعليمية بنجاح! 🚀');
        document.getElementById('modal-add-unit').style.display = 'none';
        document.getElementById('form-create-unit').reset();
        loadCurriculum();
      } catch (err) {
        Toast.error(err.message || 'فشل إضافة الوحدة');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 5. Lessons Management
  // ---------------------------------------------------------------------------
  static async renderLessons(container) {
    container.innerHTML = `
      <div class="admin-lessons-page">
        <div class="page-header mb-4" style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div class="page-badge">المحتوى الأكاديمي</div>
            <h1 class="page-title">إدارة الدروس وشروحات الفيديو 📚</h1>
          </div>
          <button class="btn btn-primary" id="btn-open-create-lesson">➕ إضافة درس جديد</button>
        </div>

        <div class="card p-4 mb-4">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>عنوان الدرس</th>
                  <th>الوحدة / المنهج</th>
                  <th>نوع الفيديو</th>
                  <th>المدة</th>
                  <th>الوصول</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody id="admin-lessons-tbody">
                <tr><td colspan="6" class="text-center text-muted">جاري تحميل الدروس...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Create Lesson Modal -->
        <div id="modal-create-lesson" class="modal-wrapper" style="display:none;">
          <div class="modal-content" style="max-width:700px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
              <h3>إضافة درس تعليمي جديد</h3>
              <button class="btn btn-sm btn-secondary" onclick="document.getElementById('modal-create-lesson').style.display='none'">✕</button>
            </div>
            <form id="form-create-lesson">
              <div class="form-group">
                <label class="form-label">الوحدة التعليمية التابع لها *</label>
                <select id="les-unit-select" class="form-input" required></select>
              </div>
              <div class="form-group">
                <label class="form-label">عنوان الدرس *</label>
                <input type="text" id="les-title" class="form-input" placeholder="مثال: مدخل إلى الحلقات التكرارية (Loops)" required>
              </div>
              <div class="form-group">
                <label class="form-label">وصف الدرس</label>
                <textarea id="les-desc" class="form-input" rows="2" placeholder="وصف محتوى الدرس والهدف منه"></textarea>
              </div>
              <div class="grid grid-2">
                <div class="form-group">
                  <label class="form-label">نوع الفيديو</label>
                  <select id="les-video-type" class="form-input">
                    <option value="youtube">رابط يوتيوب (YouTube URL)</option>
                    <option value="uploaded">فيديو مرفوع مباشر</option>
                    <option value="none">بدون فيديو (شرح نصي فقط)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">رابط الفيديو (YouTube URL)</label>
                  <input type="text" id="les-video-url" class="form-input" placeholder="https://www.youtube.com/watch?v=...">
                </div>
              </div>
              <div class="grid grid-2">
                <div class="form-group">
                  <label class="form-label">مدة الفيديو (بالدقائق)</label>
                  <input type="number" id="les-duration" class="form-input" value="15">
                </div>
                <div class="form-group">
                  <label class="form-label">مستوى الوصول</label>
                  <select id="les-is-free" class="form-input">
                    <option value="0">مخصص للمشتركين فقط (Paid) 🔒</option>
                    <option value="1">درس تجريبي مفتوح ومجاني (Free) 🟢</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">المحتوى النظري والشرح (Markdown)</label>
                <textarea id="les-markdown" class="form-input" rows="5" placeholder="# اكتب الشرح وكود الدرس هنا..."></textarea>
              </div>
              <div style="display:flex;gap:1rem;margin-top:1.5rem;">
                <button type="submit" class="btn btn-primary" style="flex:1;">حفظ الدرس ونشره</button>
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-create-lesson').style.display='none'">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    async function loadLessonsData() {
      try {
        const [lesRes, coursesRes] = await Promise.all([
          ApiClient.get('/lessons'),
          ApiClient.get('/courses')
        ]);
        const lessons = ApiClient.extractList(lesRes, 'lessons');
        const courses = ApiClient.extractList(coursesRes, 'courses');
        const tbody = document.getElementById('admin-lessons-tbody');

        // Populate unit select in modal
        const unitSelect = document.getElementById('les-unit-select');
        unitSelect.innerHTML = '';
        for (const c of courses) {
          const detail = await ApiClient.get(`/courses/${c.id}`);
          (detail.units || []).forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = `${c.title} -> ${u.title}`;
            unitSelect.appendChild(opt);
          });
        }

        if (!lessons || lessons.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">لا توجد دروس مسجلة.</td></tr>';
          return;
        }

        tbody.innerHTML = lessons.map(l => `
          <tr>
            <td><strong>${l.title}</strong></td>
            <td>${l.unit_title || '—'}</td>
            <td><span class="badge badge-info">${l.video_type}</span></td>
            <td>${l.duration_minutes || 15} دقيقة</td>
            <td>
              <span class="badge ${l.is_free ? 'badge-success' : 'badge-primary'}">
                ${l.is_free ? 'مجاني 🟢' : 'للمشتركين 🔒'}
              </span>
            </td>
            <td>
              <button class="btn btn-sm btn-danger btn-del-lesson" data-id="${l.id}">حذف</button>
            </td>
          </tr>
        `).join('');

        tbody.querySelectorAll('.btn-del-lesson').forEach(btn => {
          btn.addEventListener('click', async () => {
            if (confirm('هل أنت متأكد من رغبتك في حذف هذا الدرس؟')) {
              try {
                await ApiClient.delete(`/lessons/${btn.dataset.id}`);
                Toast.success('تم حذف الدرس بنجاح');
                loadLessonsData();
              } catch (err) {
                Toast.error(err.message || 'فشل حذف الدرس');
              }
            }
          });
        });
      } catch (err) {
        console.error('Error loading admin lessons:', err);
      }
    }

    loadLessonsData();

    document.getElementById('btn-open-create-lesson').addEventListener('click', () => {
      document.getElementById('modal-create-lesson').style.display = 'flex';
    });

    document.getElementById('form-create-lesson').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await ApiClient.post('/lessons', {
          unit_id: document.getElementById('les-unit-select').value,
          title: document.getElementById('les-title').value.trim(),
          description: document.getElementById('les-desc').value.trim(),
          video_type: document.getElementById('les-video-type').value,
          video_url: document.getElementById('les-video-url').value.trim(),
          duration_minutes: parseInt(document.getElementById('les-duration').value, 10) || 15,
          is_free: document.getElementById('les-is-free').value === '1',
          content_markdown: document.getElementById('les-markdown').value.trim(),
          is_published: true
        });
        Toast.success('تمت إضافة الدرس بنجاح! 🚀');
        document.getElementById('modal-create-lesson').style.display = 'none';
        document.getElementById('form-create-lesson').reset();
        loadLessonsData();
      } catch (err) {
        Toast.error(err.message || 'فشل إضافة الدرس');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 6. Study Files Management ("الملفات الدراسية")
  // ---------------------------------------------------------------------------
  static async renderStudyFiles(container) {
    container.innerHTML = `
      <div class="admin-files-page">
        <div class="page-header mb-4" style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div class="page-badge">المكتبة والمذكرات</div>
            <h1 class="page-title">إدارة الملفات الدراسية وروابط Google Drive 📁</h1>
          </div>
          <button class="btn btn-primary" id="btn-add-file-link">➕ إضافة رابط مذكرة (Drive)</button>
        </div>

        <div class="card p-4 mb-4">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>عنوان الملف / المذكرة</th>
                  <th>النوع</th>
                  <th>الرابط / الملف</th>
                  <th>مستوى الوصول</th>
                  <th>تاريخ الإضافة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody id="admin-files-tbody">
                <tr><td colspan="6" class="text-center text-muted">جاري تحميل الملفات...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Add Drive Resource Modal -->
        <div id="modal-add-drive-file" class="modal-wrapper" style="display:none;">
          <div class="modal-content" style="max-width:550px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
              <h3>إضافة رابط Google Drive للملفات الدراسية</h3>
              <button class="btn btn-sm btn-secondary" onclick="document.getElementById('modal-add-drive-file').style.display='none'">✕</button>
            </div>
            <form id="form-add-drive-file">
              <div class="form-group">
                <label class="form-label">عنوان الملف أو المذكرة *</label>
                <input type="text" id="df-title" class="form-input" placeholder="مثال: مذكرة مراجعة نهائية في بايثون (PDF)" required>
              </div>
              <div class="form-group">
                <label class="form-label">رابط Google Drive المعتمد *</label>
                <input type="url" id="df-url" class="form-input" placeholder="https://drive.google.com/file/d/..." dir="ltr" required>
              </div>
              <div class="form-group">
                <label class="form-label">وصف الملف</label>
                <textarea id="df-desc" class="form-input" rows="2" placeholder="وصف محتويات الملف أو المذكرة"></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">مستوى الظهور</label>
                <select id="df-visibility" class="form-input">
                  <option value="PUBLIC">متاح لجميع الطلاب (Public)</option>
                  <option value="SUBSCRIBERS_ONLY">مخصص للمشتركين فقط (Subscribers)</option>
                </select>
              </div>
              <div style="display:flex;gap:1rem;margin-top:1.5rem;">
                <button type="submit" class="btn btn-primary" style="flex:1;">حفظ الرابط</button>
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-add-drive-file').style.display='none'">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    async function loadAdminFiles() {
      try {
        const res = await ApiClient.get('/study-files');
        const files = ApiClient.extractList(res, 'files');
        const tbody = document.getElementById('admin-files-tbody');

        if (!files || files.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">لا توجد ملفات مرفوعة.</td></tr>';
          return;
        }

        tbody.innerHTML = files.map(f => `
          <tr>
            <td><strong>${f.title}</strong></td>
            <td><span class="badge ${f.is_drive ? 'badge-info' : 'badge-secondary'}">${f.is_drive ? 'Google Drive' : 'ملف مباشر'}</span></td>
            <td>
              <a href="${f.external_url || f.file_url}" target="_blank" class="btn btn-sm btn-outline-cyan">معاينة الرابط 🔗</a>
            </td>
            <td><span class="badge ${f.visibility === 'PUBLIC' ? 'badge-success' : 'badge-warning'}">${f.visibility}</span></td>
            <td>${new Date(f.created_at).toLocaleDateString('ar-EG')}</td>
            <td>
              <button class="btn btn-sm btn-danger btn-del-file" data-id="${f.id}">حذف</button>
            </td>
          </tr>
        `).join('');

        tbody.querySelectorAll('.btn-del-file').forEach(btn => {
          btn.addEventListener('click', async () => {
            if (confirm('هل أنت متأكد من رغبتك في حذف هذا الملف؟')) {
              try {
                await ApiClient.delete(`/study-files/${btn.dataset.id}`);
                Toast.success('تم حذف الملف بنجاح');
                loadAdminFiles();
              } catch (err) {
                Toast.error(err.message || 'فشل حذف الملف');
              }
            }
          });
        });
      } catch (err) {
        console.error('Error loading admin files:', err);
      }
    }

    loadAdminFiles();

    document.getElementById('btn-add-file-link').addEventListener('click', () => {
      document.getElementById('modal-add-drive-file').style.display = 'flex';
    });

    document.getElementById('form-add-drive-file').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await ApiClient.post('/study-files', {
          title: document.getElementById('df-title').value.trim(),
          source_type: 'google_drive',
          external_url: document.getElementById('df-url').value.trim(),
          description: document.getElementById('df-desc').value.trim(),
          visibility: document.getElementById('df-visibility').value,
          is_published: true
        });
        Toast.success('تمت إضافة رابط الملف بنجاح! 🚀');
        document.getElementById('modal-add-drive-file').style.display = 'none';
        document.getElementById('form-add-drive-file').reset();
        loadAdminFiles();
      } catch (err) {
        Toast.error(err.message || 'فشل إضافة رابط الملف');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 7. Subscriptions & Plan Configuration
  // ---------------------------------------------------------------------------
  static async renderSubscriptions(container) {
    container.innerHTML = `
      <div class="admin-subscriptions-page">
        <div class="page-header mb-4" style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div class="page-badge">الاشتراكات والأسعار</div>
            <h1 class="page-title">إدارة باقات الاشتراك وتوليد الأكواد 🔑</h1>
          </div>
          <div style="display:flex;gap:0.5rem;">
            <button class="btn btn-primary" id="btn-open-create-plan">➕ إضافة باقة جديدة</button>
            <button class="btn btn-secondary" id="btn-open-gen-codes">⚡ توليد أكواد اشتراك</button>
          </div>
        </div>

        <!-- Section: Plans -->
        <div class="card p-4 mb-4">
          <h3 class="mb-3">باقات الاشتراك المعتمدة في المنصة</h3>
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>اسم الباقة</th>
                  <th>المدة</th>
                  <th>السعر</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody id="admin-plans-tbody">
                <tr><td colspan="5" class="text-center text-muted">جاري تحميل الباقات...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Section: Codes -->
        <div class="card p-4">
          <h3 class="mb-3">سجل أكواد التفعيل التي تم توليدها</h3>
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>الكود (Code)</th>
                  <th>المدة</th>
                  <th>الحالة</th>
                  <th>الدفعة</th>
                  <th>أنشئ بواسطة</th>
                  <th>تاريخ الإنشاء</th>
                </tr>
              </thead>
              <tbody id="admin-codes-tbody">
                <tr><td colspan="6" class="text-center text-muted">جاري تحميل الأكواد...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Generate Codes Modal -->
        <div id="modal-gen-codes" class="modal-wrapper" style="display:none;">
          <div class="modal-content" style="max-width:500px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
              <h3>توليد أكواد اشتراك جديدة</h3>
              <button class="btn btn-sm btn-secondary" onclick="document.getElementById('modal-gen-codes').style.display='none'">✕</button>
            </div>
            <form id="form-generate-codes">
              <div class="form-group">
                <label class="form-label">عدد الأكواد المطلوبة</label>
                <input type="number" id="gen-count" class="form-input" value="1" min="1" max="50" required>
              </div>
              <div class="form-group">
                <label class="form-label">مدة كود الاشتراك</label>
                <select id="gen-duration-type" class="form-input">
                  <option value="1_MONTH">شهر واحد (30 يوماً)</option>
                  <option value="3_MONTHS">فصل دراسي / 3 شهور (90 يوماً)</option>
                  <option value="6_MONTHS">نصف سنوي / 6 شهور (180 يوماً)</option>
                  <option value="12_MONTHS">اشتراك سنوي كامل (365 يوماً)</option>
                  <option value="LIFETIME">اشتراك مدى الحياة (VIP)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">اسم الدفعة أو المناسبة</label>
                <input type="text" id="gen-batch" class="form-input" placeholder="مثال: أوائل الثانوية 2026">
              </div>
              <div style="display:flex;gap:1rem;margin-top:1.5rem;">
                <button type="submit" class="btn btn-primary" style="flex:1;">توليد الأكواد الآن</button>
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-gen-codes').style.display='none'">إلغاء</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Add Plan Modal -->
        <div id="modal-create-plan" class="modal-wrapper" style="display:none;">
          <div class="modal-content" style="max-width:550px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
              <h3>إضافة باقة اشتراك جديدة</h3>
              <button class="btn btn-sm btn-secondary" onclick="document.getElementById('modal-create-plan').style.display='none'">✕</button>
            </div>
            <form id="form-create-plan">
              <div class="form-group">
                <label class="form-label">اسم الباقة *</label>
                <input type="text" id="pln-name" class="form-input" placeholder="مثال: باقة المراجعة المكثفة" required>
              </div>
              <div class="grid grid-2">
                <div class="form-group">
                  <label class="form-label">المدة بالأشهر *</label>
                  <input type="number" id="pln-months" class="form-input" value="1" min="1" required>
                </div>
                <div class="form-group">
                  <label class="form-label">السعر (ج.م) *</label>
                  <input type="number" id="pln-price" class="form-input" value="150" min="0" step="any" required>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">المميزات (ميزة في كل سطر)</label>
                <textarea id="pln-features" class="form-input" rows="4" placeholder="الوصول لجميع الدروس&#10;محرر الأكواد&#10;تحميل المذكرات"></textarea>
              </div>
              <div style="display:flex;gap:1rem;margin-top:1.5rem;">
                <button type="submit" class="btn btn-primary" style="flex:1;">حفظ الباقة</button>
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-create-plan').style.display='none'">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    async function loadSubsData() {
      try {
        const [plansRes, codesRes] = await Promise.all([
          ApiClient.get('/subscriptions/plans'),
          ApiClient.get('/subscriptions/codes')
        ]);
        const plans = ApiClient.extractList(plansRes, 'plans');
        const codes = ApiClient.extractList(codesRes, 'codes');

        // Plans Table
        const plansTbody = document.getElementById('admin-plans-tbody');
        if (plansTbody) {
          plansTbody.innerHTML = plans.map(p => `
            <tr>
              <td><strong>${p.name}</strong></td>
              <td>${p.duration_months} شهر</td>
              <td><strong style="color:var(--color-cyan-accent);">${p.price} ج.م</strong></td>
              <td><span class="badge badge-success">نشطة ومفعلة</span></td>
              <td>
                <button class="btn btn-sm btn-danger btn-del-plan" data-id="${p.id}">حذف</button>
              </td>
            </tr>
          `).join('');

          plansTbody.querySelectorAll('.btn-del-plan').forEach(btn => {
            btn.addEventListener('click', async () => {
              if (confirm('هل أنت متأكد من حذف هذه الباقة؟')) {
                try {
                  await ApiClient.delete(`/subscriptions/plans/${btn.dataset.id}`);
                  Toast.success('تم حذف الباقة بنجاح');
                  loadSubsData();
                } catch (err) {
                  Toast.error(err.message || 'فشل حذف الباقة');
                }
              }
            });
          });
        }

        // Codes Table
        const codesTbody = document.getElementById('admin-codes-tbody');
        if (codesTbody) {
          codesTbody.innerHTML = codes.map(c => `
            <tr>
              <td><code>${c.code}</code></td>
              <td>${c.duration_days} يوم (${c.duration_type})</td>
              <td>
                <span class="badge ${c.status === 'ACTIVE' ? 'badge-success' : 'badge-secondary'}">
                  ${c.status === 'ACTIVE' ? 'متاح للاستخدام' : 'تم تفعيله'}
                </span>
              </td>
              <td>${c.batch_name || '—'}</td>
              <td>${c.creator_name || 'الإدارة'}</td>
              <td>${new Date(c.created_at).toLocaleDateString('ar-EG')}</td>
            </tr>
          `).join('');
        }

      } catch (err) {
        console.error('Error loading subscriptions data:', err);
      }
    }

    loadSubsData();

    document.getElementById('btn-open-create-plan').addEventListener('click', () => {
      document.getElementById('modal-create-plan').style.display = 'flex';
    });
    document.getElementById('btn-open-gen-codes').addEventListener('click', () => {
      document.getElementById('modal-gen-codes').style.display = 'flex';
    });

    document.getElementById('form-create-plan').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const feats = document.getElementById('pln-features').value.split('\n').map(s => s.trim()).filter(Boolean);
        await ApiClient.post('/subscriptions/plans', {
          name: document.getElementById('pln-name').value.trim(),
          duration_months: parseInt(document.getElementById('pln-months').value, 10),
          price: parseFloat(document.getElementById('pln-price').value),
          features: feats,
          is_active: true
        });
        Toast.success('تم حفظ باقة الاشتراك بنجاح! 🚀');
        document.getElementById('modal-create-plan').style.display = 'none';
        document.getElementById('form-create-plan').reset();
        loadSubsData();
      } catch (err) {
        Toast.error(err.message || 'فشل حفظ الباقة');
      }
    });

    document.getElementById('form-generate-codes').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const count = parseInt(document.getElementById('gen-count').value, 10) || 1;
        const dur = document.getElementById('gen-duration-type').value;
        const batch = document.getElementById('gen-batch').value.trim();

        const res = await ApiClient.post('/subscriptions/codes/generate', {
          count: count,
          duration_type: dur,
          batch_name: batch
        });
        Toast.success(res.message || 'تم توليد الأكواد بنجاح! 🚀');
        document.getElementById('modal-gen-codes').style.display = 'none';
        document.getElementById('form-generate-codes').reset();
        loadSubsData();
      } catch (err) {
        Toast.error(err.message || 'فشل توليد الأكواد');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 8. Payment Requests Management
  // ---------------------------------------------------------------------------
  static async renderSubscriptionRequests(container) {
    container.innerHTML = `
      <div class="admin-requests-page">
        <div class="page-header mb-4">
          <div class="page-badge">التحويلات البنكية</div>
          <h1 class="page-title">مراجعة طلبات الاشتراكات وتأكيد الدفع 📥</h1>
          <p class="text-muted">راجع إشعارات تحويل فودافون كاش وإنستاباي واعتمد تفعيل الاشتراكات للطلاب.</p>
        </div>

        <div class="card p-4">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>الباقة</th>
                  <th>طريقة الدفع</th>
                  <th>رقم الهاتف المحول منه</th>
                  <th>المرجع</th>
                  <th>الملاحظات</th>
                  <th>الحالة</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody id="admin-requests-tbody">
                <tr><td colspan="8" class="text-center text-muted">جاري تحميل طلبات الدفع...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    async function loadRequests() {
      try {
        const res = await ApiClient.get('/subscriptions/requests');
        const reqs = ApiClient.extractList(res, 'requests');
        const tbody = document.getElementById('admin-requests-tbody');

        if (!reqs || reqs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">لا توجد طلبات اشتراك مسجلة حالياً.</td></tr>';
          return;
        }

        tbody.innerHTML = reqs.map(r => `
          <tr>
            <td>
              <strong>${r.student_name || 'طالب'}</strong>
              <div style="font-size:0.8rem;color:var(--color-text-muted);">${r.student_phone || r.student_email}</div>
            </td>
            <td><strong>${r.plan_name}</strong> (${r.plan_price} ج.م)</td>
            <td><span class="badge badge-info">${r.payment_method}</span></td>
            <td><code>${r.payment_number}</code></td>
            <td><code>${r.payment_reference || '—'}</code></td>
            <td>${r.notes || '—'}</td>
            <td>
              <span class="badge ${r.status === 'approved' ? 'badge-success' : r.status === 'rejected' ? 'badge-danger' : 'badge-warning'}">
                ${r.status === 'approved' ? 'تم التفعيل ✓' : r.status === 'rejected' ? 'مرفوض ✕' : 'قيد المراجعة ⏳'}
              </span>
            </td>
            <td>
              ${r.status === 'pending' ? `
                <div style="display:flex;gap:0.4rem;">
                  <button class="btn btn-sm btn-success btn-approve-req" data-id="${r.id}">اعتماد وتفعيل ✓</button>
                  <button class="btn btn-sm btn-danger btn-reject-req" data-id="${r.id}">رفض ✕</button>
                </div>
              ` : `
                <span class="text-muted" style="font-size:0.85rem;">مكتمل (${r.admin_notes || 'لا توجد ملاحظات'})</span>
              `}
            </td>
          </tr>
        `).join('');

        tbody.querySelectorAll('.btn-approve-req').forEach(btn => {
          btn.addEventListener('click', async () => {
            if (confirm('تأكيد اعتماد الدفع وتفعيل اشتراك الطالب فورياً؟')) {
              try {
                await ApiClient.post(`/subscriptions/requests/${btn.dataset.id}/review`, {
                  status: 'approved',
                  admin_notes: 'تم التأكد من صحة التحويل وتفعيل الحساب'
                });
                Toast.success('تم تفعيل اشتراك الطالب بنجاح! 🎓');
                loadRequests();
              } catch (err) {
                Toast.error(err.message || 'فشل اعتماد الطلب');
              }
            }
          });
        });

        tbody.querySelectorAll('.btn-reject-req').forEach(btn => {
          btn.addEventListener('click', async () => {
            const reason = prompt('سبب رفض الطلب (سيصل كإشعار للطالب):', 'لم يتم العثور على عملية التحويل');
            if (reason !== null) {
              try {
                await ApiClient.post(`/subscriptions/requests/${btn.dataset.id}/review`, {
                  status: 'rejected',
                  admin_notes: reason
                });
                Toast.warning('تم رفض الطلب بنجاح');
                loadRequests();
              } catch (err) {
                Toast.error(err.message || 'فشل رفض الطلب');
              }
            }
          });
        });

      } catch (err) {
        console.error('Error loading payment requests:', err);
      }
    }

    loadRequests();
  }

  // ---------------------------------------------------------------------------
  // 9. Payment Methods & Subscription Configuration ("طرق الدفع والاشتراك")
  // MUST BE SEPARATE FROM ACCOUNT SETTINGS PAGE!
  // ---------------------------------------------------------------------------
  static async renderPaymentSettings(container) {
    container.innerHTML = `
      <div class="admin-payment-settings-page" style="max-width:800px;margin:0 auto;">
        <div class="page-header mb-4">
          <div class="page-badge">الإعدادات المالية</div>
          <h1 class="page-title">طرق الدفع والاشتراك 💳</h1>
          <p class="text-muted">ضبط أرقام فودافون كاش ورابط إنستاباي ونصوص البانر الترويجي وحفظها بشكل دائم في قاعدة البيانات.</p>
        </div>

        <div class="card p-4">
          <form id="form-admin-payment-settings">
            <h3 class="mb-3">🔴 إعدادات فودافون كاش (Vodafone Cash)</h3>
            <div class="form-group">
              <label class="form-label">رقم محفظة فودافون كاش المعتمد لاستقبال التحويلات *</label>
              <input type="text" id="adm-voda-phone" class="form-input" placeholder="+20159159038" required>
              <small class="text-muted">الرقم الافتراضي المعتمد للمنصة: +20159159038</small>
            </div>

            <h3 class="mt-4 mb-3">⚡ إعدادات إنستاباي (InstaPay)</h3>
            <div class="grid grid-2">
              <div class="form-group">
                <label class="form-label">رقم هاتف إنستاباي *</label>
                <input type="text" id="adm-insta-phone" class="form-input" placeholder="+20159159038" required>
              </div>
              <div class="form-group">
                <label class="form-label">رابط الدفع المباشر لإنستاباي (InstaPay Link)</label>
                <input type="url" id="adm-insta-link" class="form-input" placeholder="https://ipn.eg/S/moazasem/instapay/27DsGj" dir="ltr">
              </div>
            </div>

            <h3 class="mt-4 mb-3">📢 العروض وبانر التنبيهات للطلاب</h3>
            <div class="form-group">
              <label class="form-label">نص إعلان وبانر الخصم المعروض للطلاب</label>
              <input type="text" id="adm-offer-banner" class="form-input" placeholder="عروض اشتراك الفصل الدراسي الجديد متاحة الآن! خصم 20% لفترة محدودة ⚡">
            </div>
            <div class="form-group">
              <label class="form-label">
                <input type="checkbox" id="adm-offers-vis" checked> إظهار بانر العروض للطلاب في الصفحة الرئيسية وصفحة الاشتراكات
              </label>
            </div>

            <div class="form-group mt-3">
              <label class="form-label">رقم التواصل وخدمة العملاء للتحويلات</label>
              <input type="text" id="adm-contact-phone" class="form-input" placeholder="+20159159038">
            </div>

            <button type="submit" class="btn btn-primary btn-lg glow-effect mt-4" id="btn-save-payment-settings">
              💾 حفظ التغييرات بشكل دائم في قاعدة البيانات
            </button>
          </form>
        </div>
      </div>
    `;

    // Load current payment settings from DB
    try {
      const pay = await ApiClient.get('/payment-settings');
      document.getElementById('adm-voda-phone').value = pay.vodafone_cash || '+20159159038';
      document.getElementById('adm-insta-phone').value = pay.instapay_phone || '+20159159038';
      document.getElementById('adm-insta-link').value = pay.instapay_link || 'https://ipn.eg/S/moazasem/instapay/27DsGj';
      document.getElementById('adm-contact-phone').value = pay.contact_phone || '+20159159038';
      document.getElementById('adm-offer-banner').value = pay.offer_banner_text || '';
      document.getElementById('adm-offers-vis').checked = pay.offers_visible !== false;
    } catch (err) {
      console.error('Error loading payment settings:', err);
    }

    // Save payment settings directly to persistent DB
    document.getElementById('form-admin-payment-settings').addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('btn-save-payment-settings');
      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري الحفظ في قاعدة البيانات...';

      const payload = {
        vodafone_cash: document.getElementById('adm-voda-phone').value.trim(),
        payment_phone: document.getElementById('adm-voda-phone').value.trim(),
        instapay_phone: document.getElementById('adm-insta-phone').value.trim(),
        instapay_link: document.getElementById('adm-insta-link').value.trim(),
        contact_phone: document.getElementById('adm-contact-phone').value.trim(),
        offer_banner_text: document.getElementById('adm-offer-banner').value.trim(),
        offers_visible: document.getElementById('adm-offers-vis').checked
      };

      try {
        const res = await ApiClient.put('/payment-settings', payload);
        Toast.success(res.message || 'تم حفظ بيانات طرق الدفع بنجاح في قاعدة البيانات 🚀');
      } catch (err) {
        Toast.error(err.message || 'فشل حفظ بيانات الدفع');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '💾 حفظ التغييرات بشكل دائم في قاعدة البيانات';
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 10. Announcements Management
  // Guaranteed Error-Free Loading
  // ---------------------------------------------------------------------------
  static async renderAnnouncements(container) {
    container.innerHTML = `
      <div class="admin-announcements-page">
        <div class="page-header mb-4" style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div class="page-badge">الإعلام المدرسي</div>
            <h1 class="page-title">نشر الإعلانات العامة والتنبيهات 📢</h1>
          </div>
          <button class="btn btn-primary" id="btn-open-create-ann">➕ نشر إعلان جديد</button>
        </div>

        <div class="card p-4 mb-4">
          <div id="announcements-cards-list" style="display:flex;flex-direction:column;gap:1rem;">
            <div class="text-center text-muted" style="padding:2rem;">جاري تحميل قائمة الإعلانات...</div>
          </div>
        </div>

        <!-- Create Announcement Modal -->
        <div id="modal-create-ann" class="modal-wrapper" style="display:none;">
          <div class="modal-content" style="max-width:550px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
              <h3>نشر إعلان عام جديد</h3>
              <button class="btn btn-sm btn-secondary" onclick="document.getElementById('modal-create-ann').style.display='none'">✕</button>
            </div>
            <form id="form-create-announcement">
              <div class="form-group">
                <label class="form-label">عنوان الإعلان *</label>
                <input type="text" id="ann-title" class="form-input" placeholder="مثال: موعد تسليم مشروع بايثون النهائي" required>
              </div>
              <div class="form-group">
                <label class="form-label">نص الإعلان *</label>
                <textarea id="ann-content" class="form-input" rows="4" placeholder="اكتب تفاصيل الإعلان هنا..." required></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">
                  <input type="checkbox" id="ann-urgent"> إعلان عاجل وهام ⚠️
                </label>
              </div>
              <div style="display:flex;gap:1rem;margin-top:1.5rem;">
                <button type="submit" class="btn btn-primary" style="flex:1;">نشر الإعلان فوراً</button>
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-create-ann').style.display='none'">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    async function loadAnnouncements() {
      const listEl = document.getElementById('announcements-cards-list');
      try {
        const res = await ApiClient.get('/announcements');
        const announcements = ApiClient.extractList(res, 'announcements');

        if (!announcements || announcements.length === 0) {
          listEl.innerHTML = '<div class="text-center text-muted" style="padding:2rem;">لا توجد إعلانات منشورة حالياً.</div>';
          return;
        }

        listEl.innerHTML = announcements.map(a => `
          <div class="announcement-item card p-3 ${a.is_urgent ? 'announcement-urgent' : ''}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <div>
                <div class="announcement-meta">
                  ${a.is_urgent ? '<span class="badge badge-danger">تنبيه عاجل ⚠️</span>' : '<span class="badge badge-primary">إعلان عام</span>'}
                  <span class="text-muted" style="font-size:0.8rem;margin-right:0.5rem;">${new Date(a.created_at).toLocaleDateString('ar-EG')}</span>
                </div>
                <h3 class="announcement-title mt-2">${a.title}</h3>
                <p class="announcement-content mt-1 text-muted">${a.content}</p>
              </div>
              <button class="btn btn-sm btn-danger btn-del-ann" data-id="${a.id}">حذف</button>
            </div>
          </div>
        `).join('');

        listEl.querySelectorAll('.btn-del-ann').forEach(btn => {
          btn.addEventListener('click', async () => {
            if (confirm('هل أنت متأكد من رغبتك في حذف هذا الإعلان؟')) {
              try {
                await ApiClient.delete(`/announcements/${btn.dataset.id}`);
                Toast.success('تم حذف الإعلان بنجاح');
                loadAnnouncements();
              } catch (err) {
                Toast.error(err.message || 'فشل حذف الإعلان');
              }
            }
          });
        });

      } catch (err) {
        console.error('Error loading announcements:', err);
        listEl.innerHTML = '<div class="text-center text-danger" style="padding:2rem;">فشل تحميل قائمة الإعلانات، يرجى المحاولة لاحقاً.</div>';
      }
    }

    loadAnnouncements();

    document.getElementById('btn-open-create-ann').addEventListener('click', () => {
      document.getElementById('modal-create-ann').style.display = 'flex';
    });

    document.getElementById('form-create-announcement').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await ApiClient.post('/announcements', {
          title: document.getElementById('ann-title').value.trim(),
          content: document.getElementById('ann-content').value.trim(),
          is_urgent: document.getElementById('ann-urgent').checked,
          is_published: true
        });
        Toast.success('تم نشر الإعلان بنجاح! 📢');
        document.getElementById('modal-create-ann').style.display = 'none';
        document.getElementById('form-create-announcement').reset();
        loadAnnouncements();
      } catch (err) {
        Toast.error(err.message || 'فشل نشر الإعلان');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 11. Administrator Account & Security Settings (Dedicated Page)
  // ---------------------------------------------------------------------------
  static async renderSettings(container) {
    const user = AuthService.getUser() || {};
    container.innerHTML = `
      <div class="admin-settings-page" style="max-width:700px;margin:0 auto;">
        <div class="page-header mb-4">
          <div class="page-badge">أمان المشرف</div>
          <h1 class="page-title">إعدادات الحساب والأمان للإدارة ⚙️</h1>
          <p class="text-muted">تحديث بيانات حساب المشرف وتغيير كلمة المرور الخاصة به.</p>
        </div>

        <div class="card p-4 mb-4">
          <h3 class="mb-3">البيانات الإدارية الشخصية</h3>
          <form id="form-admin-profile">
            <div class="form-group">
              <label class="form-label">الاسم بالكامل</label>
              <input type="text" id="adm-prof-name" class="form-input" value="${user.full_name || ''}" required>
            </div>
            <div class="form-group">
              <label class="form-label">اسم المستخدم (المشرف العام)</label>
              <input type="text" class="form-input" value="${user.username || ''}" disabled>
            </div>
            <div class="form-group">
              <label class="form-label">البريد الإلكتروني</label>
              <input type="email" id="adm-prof-email" class="form-input" value="${user.email || ''}" required>
            </div>
            <button type="submit" class="btn btn-primary">حفظ تعديلات المشرف</button>
          </form>
        </div>

        <!-- Admin Password Change -->
        <div class="card p-4">
          <h3 class="mb-2">تغيير كلمة مرور المشرف 🔒</h3>
          <p class="text-muted mb-3">حفظ فوري ودائم في قاعدة البيانات.</p>

          <form id="form-admin-password">
            <div class="form-group">
              <label class="form-label">كلمة المرور الحالية *</label>
              <input type="password" id="adm-pw-cur" class="form-input" placeholder="••••••••" required>
            </div>
            <div class="form-group">
              <label class="form-label">كلمة المرور الجديدة *</label>
              <input type="password" id="adm-pw-new" class="form-input" placeholder="6 أحرف على الأقل" minlength="6" required>
            </div>
            <div class="form-group">
              <label class="form-label">تأكيد كلمة المرور الجديدة *</label>
              <input type="password" id="adm-pw-conf" class="form-input" placeholder="••••••••" minlength="6" required>
            </div>

            <div id="adm-pw-feedback" class="alert mt-2" style="display:none;"></div>

            <button type="submit" class="btn btn-primary mt-3" id="btn-adm-pw-submit">
              تغيير كلمة مرور المشرف وحفظها 🔒
            </button>
          </form>
        </div>
      </div>
    `;

    // Admin Profile Listener
    document.getElementById('form-admin-profile').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await ApiClient.put('/users/profile', {
          full_name: document.getElementById('adm-prof-name').value.trim(),
          email: document.getElementById('adm-prof-email').value.trim()
        });
        Toast.success('تم تحديث بيانات المشرف بنجاح! 🚀');
        await AuthService.refreshProfile();
      } catch (err) {
        Toast.error(err.message || 'فشل تحديث البيانات');
      }
    });

    // Admin Password Change Listener
    document.getElementById('form-admin-password').addEventListener('submit', async (e) => {
      e.preventDefault();
      const cur = document.getElementById('adm-pw-cur').value;
      const nw = document.getElementById('adm-pw-new').value;
      const conf = document.getElementById('adm-pw-conf').value;
      const fb = document.getElementById('adm-pw-feedback');
      const submitBtn = document.getElementById('btn-adm-pw-submit');

      fb.style.display = 'none';

      if (nw !== conf) {
        fb.className = 'alert alert-danger';
        fb.textContent = 'كلمة المرور الجديدة وتأكيدها غير متطابقين!';
        fb.style.display = 'block';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري التغيير والحفظ...';

      try {
        const res = await ApiClient.post('/users/change-password', {
          current_password: cur,
          new_password: nw,
          confirm_password: conf
        });
        Toast.success(res.message || 'تم تغيير كلمة المرور بنجاح! 🔒');
        fb.className = 'alert alert-success';
        fb.textContent = res.message || 'تم تحديث كلمة المرور في قاعدة البيانات بنجاح!';
        fb.style.display = 'block';
        document.getElementById('form-admin-password').reset();
      } catch (err) {
        fb.className = 'alert alert-danger';
        fb.textContent = err.message || 'فشل تغيير كلمة المرور';
        fb.style.display = 'block';
        Toast.error(err.message || 'فشل تغيير كلمة المرور');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'تغيير كلمة مرور المشرف وحفظها 🔒';
      }
    });
  }
}
