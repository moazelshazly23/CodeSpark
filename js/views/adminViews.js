// Code Spark Admin Dashboard & Content Management Suite
// Fully Connected to FastAPI Backend & Database via AdminService
(function() {
  window.AdminViews = {

    // Helper to extract YouTube video ID in real-time
    extractYouTubeId(url) {
      if (!url) return null;
      const clean = url.trim();
      const patterns = [
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?m\.youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
      ];
      for (const p of patterns) {
        const match = clean.match(p);
        if (match) return match[1];
      }
      return null;
    },

    // ==========================================
    // 1. ADMIN DASHBOARD OVERVIEW
    // ==========================================
    async renderDashboard(admin) {
      let stats = {};
      try {
        stats = await window.AdminService.getDashboardStats();
      } catch (err) {
        console.warn('Error loading dashboard stats:', err);
        stats = {
          totalStudents: 0,
          activeStudents: 0,
          unitsCount: 0,
          lessonsCount: 0,
          questionsCount: 0,
          examsCount: 0,
          avgScore: 0,
          completionRate: 0,
          recentActivity: []
        };
      }

      const totalStudents = stats.totalStudents || 0;
      const activeStudents = stats.activeStudents || 0;
      const unitsCount = stats.unitsCount || 0;
      const lessonsCount = stats.lessonsCount || 0;
      const questionsCount = stats.questionsCount || 0;
      const examsCount = stats.examsCount || 0;
      const avgScore = stats.avgScore || 0;
      const recentActivity = stats.recentActivity || [];

      return `
        <div class="content-body">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; flex-wrap:wrap; gap:1rem;">
            <div>
              <div class="badge badge-primary" style="margin-bottom:0.35rem;">🛡️ لوحة التحكم الأكاديمية</div>
              <h1 style="font-size:1.875rem; font-weight:800; margin:0;">لوحة تحكم المشرف العام</h1>
              <p style="color:var(--text-muted); font-size:0.9375rem;">متابعة أداء الطلاب وإدارة محتوى المنهج والأسئلة والاختبارات المدرسية.</p>
            </div>
            <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
              <a href="#admin-students" class="btn btn-secondary btn-sm">${Icons.users()} شؤون الطلاب</a>
              <a href="#admin-curriculum" class="btn btn-primary btn-sm">${Icons.book()} تعديل المنهج والدروس</a>
            </div>
          </div>

          <!-- KPI Metrics Row -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1.25rem; margin-bottom:2rem;">
            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-cyan">${Icons.users()}</div>
              <div>
                <div class="stat-value">${totalStudents}</div>
                <div class="stat-label">إجمالي الطلاب (${activeStudents} نشط)</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-blue">${Icons.book()}</div>
              <div>
                <div class="stat-value">${unitsCount} وحدات</div>
                <div class="stat-label">${lessonsCount} درسًا في المنهج</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-purple">${Icons.helpCircle()}</div>
              <div>
                <div class="stat-value">${questionsCount} أسئلة</div>
                <div class="stat-label">${examsCount} نماذج اختبارات</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-green">${Icons.award()}</div>
              <div>
                <div class="stat-value">${avgScore}%</div>
                <div class="stat-label">متوسط درجات الطلاب</div>
              </div>
            </div>
          </div>

          <!-- Admin Main Grid: Activity Chart + Recent Student Submissions -->
          <div style="display:grid; grid-template-columns: 1.3fr 0.9fr; gap:1.5rem; margin-bottom:2rem;" class="dashboard-main-grid">
            <div class="card">
              <div class="card-header">
                <div>
                  <div class="card-title">${Icons.trendingUp()} نشاط الطلاب وتفاعلهم الأسبوعي</div>
                  <div class="card-subtitle">معدل تسليم التقييمات وحل تدريبات بايثون</div>
                </div>
                <span class="badge badge-cyan">تحديث حي</span>
              </div>
              <div style="position:relative; width:100%; height:220px;">
                <canvas id="admin-activity-chart" style="width:100%; height:100%;"></canvas>
              </div>
            </div>

            <div class="card">
              <div class="card-header">
                <div class="card-title">${Icons.bell()} آخر الاختبارات المسلّمة</div>
                <a href="#admin-results" style="font-size:0.8125rem; color:var(--cyan); font-weight:700;">عرض الكل</a>
              </div>

              <div style="display:flex; flex-direction:column; gap:0.875rem;" id="recent-activity-container">
                ${recentActivity.length === 0 ? `
                  <div style="text-align:center; padding:2rem 1rem; color:var(--text-muted); font-size:0.875rem;">
                    لا توجد محاولات اختبارات مسجلة حتى الآن.
                  </div>
                ` : recentActivity.map(act => `
                  <div style="display:flex; align-items:center; justify-content:space-between; padding:0.75rem 1rem; background:var(--bg-surface-elevated); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                      <div class="user-avatar" style="width:36px; height:36px; font-size:0.875rem;">${act.student_avatar || 'ط'}</div>
                      <div>
                        <div style="font-weight:700; font-size:0.875rem; color:var(--text-main);">${act.student_name}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted);">${act.exam_title || 'اختبار تقييمي'} • ${act.student_grade || 'ثانوي'}</div>
                      </div>
                    </div>
                    <div style="text-align:left;">
                      <div class="badge ${act.percentage >= 60 ? 'badge-success' : 'badge-danger'}" style="font-family:var(--font-sans); font-weight:700;">
                        ${act.percentage}%
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Quick Navigation Actions Cards -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:1.25rem;">
            <a href="#admin-students" class="card card-hover" style="display:block; text-decoration:none;">
              <div style="font-size:1.5rem; margin-bottom:0.5rem;">👨🎓</div>
              <h3 style="font-size:1rem; font-weight:700; color:var(--text-main); margin-bottom:0.25rem;">شؤون الطلاب</h3>
              <p style="font-size:0.8125rem; color:var(--text-muted); margin:0;">إضافة طالب، تعديل، تفعيل/تعطيل، وإعادة تعيين كلمات المرور.</p>
            </a>

            <a href="#admin-curriculum" class="card card-hover" style="display:block; text-decoration:none;">
              <div style="font-size:1.5rem; margin-bottom:0.5rem;">📚</div>
              <h3 style="font-size:1rem; font-weight:700; color:var(--text-main); margin-bottom:0.25rem;">المنهج والدروس</h3>
              <p style="font-size:0.8125rem; color:var(--text-muted); margin:0;">إدارة الوحدات، رفع شروح الدروس، الأكواد التوضيحية وتدريبات بايثون.</p>
            </a>

            <a href="#admin-questions" class="card card-hover" style="display:block; text-decoration:none;">
              <div style="font-size:1.5rem; margin-bottom:0.5rem;">❓</div>
              <h3 style="font-size:1rem; font-weight:700; color:var(--text-main); margin-bottom:0.25rem;">بنك الأسئلة</h3>
              <p style="font-size:0.8125rem; color:var(--text-muted); margin:0;">أسئلة الاختيار من متعدد، صح وخطأ، تتبع مخرجات الكود، والشرح النموذجي.</p>
            </a>

            <a href="#admin-exams" class="card card-hover" style="display:block; text-decoration:none;">
              <div style="font-size:1.5rem; margin-bottom:0.5rem;">📝</div>
              <h3 style="font-size:1rem; font-weight:700; color:var(--text-main); margin-bottom:0.25rem;">إدارة الاختبارات</h3>
              <p style="font-size:0.8125rem; color:var(--text-muted); margin:0;">منشئ الاختبارات المدرسية الشاملة، تحديد وقت الامتحان ودرجة النجاح.</p>
            </a>

            <a href="#admin-results" class="card card-hover" style="display:block; text-decoration:none;">
              <div style="font-size:1.5rem; margin-bottom:0.5rem;">📊</div>
              <h3 style="font-size:1rem; font-weight:700; color:var(--text-main); margin-bottom:0.25rem;">نتائج وتقييمات الطلاب</h3>
              <p style="font-size:0.8125rem; color:var(--text-muted); margin:0;">رصد درجات الاختبارات، استعراض إجابات الطلاب، وتحليل نقاط الضعف.</p>
            </a>

            <a href="#admin-announcements" class="card card-hover" style="display:block; text-decoration:none;">
              <div style="font-size:1.5rem; margin-bottom:0.5rem;">📢</div>
              <h3 style="font-size:1rem; font-weight:700; color:var(--text-main); margin-bottom:0.25rem;">الإعلانات والتنبيهات</h3>
              <p style="font-size:0.8125rem; color:var(--text-muted); margin:0;">بث التنبيهات وإشعارات مواعيد المراجعات لجميع الصفوف الدراسية.</p>
            </a>
          </div>
        </div>
      `;
    },

    initDashboardEvents() {
      setTimeout(() => {
        if (window.SparkCharts && window.SparkCharts.renderWeeklyBarChart) {
          SparkCharts.renderWeeklyBarChart('admin-activity-chart', [16, 24, 38, 30, 45, 52, 41]);
        }
      }, 50);
    },

    // ==========================================
    // 2. STUDENTS MANAGEMENT
    // ==========================================
    async renderStudents() {
      let students = [];
      try {
        students = await window.AdminService.getStudents();
      } catch (err) {
        console.warn('Error loading students:', err);
        students = [];
      }

      return `
        <div class="content-body">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; flex-wrap:wrap; gap:1rem;">
            <div>
              <div class="badge badge-primary" style="margin-bottom:0.35rem;">👨🎓 شؤون الطلاب</div>
              <h1 style="font-size:1.875rem; font-weight:800; margin:0;">إدارة طلاب مادة البرمجة</h1>
              <p style="color:var(--text-muted); font-size:0.9375rem;">قائمة الطلاب المسجلين بالمنصة، متابعة نسبة الإنجاز والدرجات.</p>
            </div>
            <button id="add-student-btn" class="btn btn-primary">
              ${Icons.plus()} إضافة طالب جديد
            </button>
          </div>

          <!-- Filter / Search Bar -->
          <div class="card" style="margin-bottom:1.5rem; padding:1rem 1.25rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem;">
            <div style="display:flex; align-items:center; gap:0.75rem; flex:1; min-width:260px;">
              <span style="color:var(--text-muted);">${Icons.search()}</span>
              <input type="text" id="search-student-input" class="form-input" placeholder="ابحث باسم الطالب أو رقم الهاتف أو البريد..." style="border:none; background:transparent;">
            </div>

            <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
              <select id="filter-grade-select" class="form-select" style="width:auto;">
                <option value="">جميع الصفوف الدراسية</option>
                <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
              </select>

              <select id="filter-status-select" class="form-select" style="width:auto;">
                <option value="">جميع الحالات</option>
                <option value="active">نشط فقط</option>
                <option value="disabled">معطل فقط</option>
              </select>
            </div>
          </div>

          <!-- Students Table -->
          <div class="table-container card" style="padding:0; overflow:hidden;">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>الصف الدراسي</th>
                  <th>رقم الهاتف</th>
                  <th>هاتف ولي الأمر</th>
                  <th>الدروس المكتملة</th>
                  <th>متوسط الدرجات</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody id="students-table-body">
                ${this.renderStudentsTableRows(students)}
              </tbody>
            </table>
          </div>

          <!-- Add/Edit Student Modal -->
          <div class="modal-overlay" id="student-modal">
            <div class="modal-card">
              <div class="modal-header">
                <h3 id="student-modal-title" style="font-size:1.125rem; font-weight:800; margin:0;">إضافة طالب جديد</h3>
                <button class="btn btn-ghost btn-icon-sm close-modal-btn">${Icons.x()}</button>
              </div>
              <div class="modal-body">
                <form id="admin-student-form">
                  <input type="hidden" id="admin-student-id">
                  
                  <div class="form-group">
                    <label class="form-label" for="admin-st-name">اسم الطالب ثلاثي *</label>
                    <input type="text" id="admin-st-name" class="form-input" placeholder="مثال: أحمد محمد علي" required>
                  </div>

                  <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;" class="form-grid">
                    <div class="form-group">
                      <label class="form-label" for="admin-st-phone">رقم هاتف الطالب *</label>
                      <input type="tel" id="admin-st-phone" class="form-input" required placeholder="010XXXXXXXX">
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="admin-st-parent">رقم ولي الأمر</label>
                      <input type="tel" id="admin-st-parent" class="form-input" placeholder="011XXXXXXXX">
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="admin-st-grade">الصف الدراسي</label>
                    <select id="admin-st-grade" class="form-select">
                      <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                      <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                      <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                    </select>
                  </div>

                  <div class="form-group" id="admin-st-pass-group">
                    <label class="form-label" for="admin-st-pass">كلمة المرور</label>
                    <input type="password" id="admin-st-pass" class="form-input" placeholder="••••••••">
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary close-modal-btn">إلغاء</button>
                <button id="save-student-admin-btn" class="btn btn-primary">حفظ الطالب ⚡</button>
              </div>
            </div>
          </div>

          <!-- Student Details & Progress Modal -->
          <div class="modal-overlay" id="student-detail-modal">
            <div class="modal-card" style="max-width:750px;">
              <div class="modal-header">
                <h3 id="student-detail-modal-title" style="font-size:1.125rem; font-weight:800; margin:0;">تفاصيل تقدم الطالب</h3>
                <button class="btn btn-ghost btn-icon-sm close-modal-btn">${Icons.x()}</button>
              </div>
              <div class="modal-body" id="student-detail-modal-body">
                <div style="text-align:center; padding:2rem; color:var(--text-muted);">جاري تحميل بيانات الطالب...</div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary close-modal-btn">إغلاق</button>
              </div>
            </div>
          </div>

          <!-- Reset Password Modal -->
          <div class="modal-overlay" id="reset-password-modal">
            <div class="modal-card">
              <div class="modal-header">
                <h3 style="font-size:1.125rem; font-weight:800; margin:0;">إعادة تعيين كلمة المرور</h3>
                <button class="btn btn-ghost btn-icon-sm close-modal-btn">${Icons.x()}</button>
              </div>
              <div class="modal-body">
                <form id="reset-pw-form">
                  <input type="hidden" id="reset-pw-student-id">
                  <p style="font-size:0.875rem; color:var(--text-muted); margin-bottom:1rem;" id="reset-pw-student-name-text">
                    تعيين كلمة مرور جديدة للطالب:
                  </p>
                  <div class="form-group">
                    <label class="form-label" for="new-student-password">كلمة المرور الجديدة</label>
                    <input type="password" id="new-student-password" class="form-input" placeholder="كلمة المرور الجديدة (6 أحرف على الأقل)" required>
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary close-modal-btn">إلغاء</button>
                <button id="submit-reset-pw-btn" class="btn btn-primary">تأكيد التغيير</button>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    renderStudentsTableRows(students) {
      if (!students || students.length === 0) {
        return `
          <tr>
            <td colspan="8" style="text-align:center; padding:3rem 1rem; color:var(--text-muted);">
              <div style="font-size:2rem; margin-bottom:0.5rem;">👨🎓</div>
              <strong>لا يوجد طلاب يطابقون شروط البحث</strong>
              <div style="font-size:0.8125rem; margin-top:0.25rem;">يمكنك إضافة طالب جديد أو تعديل معايير التصفية.</div>
            </td>
          </tr>
        `;
      }

      return students.map(s => {
        const isActive = s.isActive !== undefined ? s.isActive : (s.status === 'active');
        return `
          <tr data-grade="${s.grade || ''}" data-status="${isActive ? 'active' : 'disabled'}" data-search="${(s.name || '')} ${(s.phone || '')} ${(s.email || '')}">
            <td>
              <div style="display:flex; align-items:center; gap:0.75rem;">
                <div class="user-avatar" style="width:36px; height:36px; font-size:0.875rem;">${s.avatar || 'ط'}</div>
                <div>
                  <div style="font-weight:700; color:var(--text-main);">${s.name}</div>
                  <div style="font-size:0.75rem; color:var(--text-muted);">${s.email || ''}</div>
                </div>
              </div>
            </td>
            <td>
              <div><span class="badge badge-neutral">${s.grade || 'الصف الأول الثانوي'}</span></div>
            </td>
            <td class="number-font">${s.phone}</td>
            <td class="number-font">${s.parent_phone || s.parentPhone || '—'}</td>
            <td>
              <span class="badge badge-cyan">${s.completedLessonsCount || 0} درس (${s.progress || 0}%)</span>
            </td>
            <td>
              <span class="badge ${s.avgScore >= 60 ? 'badge-success' : 'badge-neutral'}" style="font-family:var(--font-sans); font-weight:700;">
                ${s.avgScore || 0}%
              </span>
            </td>
            <td>
              <span class="badge ${isActive ? 'badge-success' : 'badge-danger'}">
                ${isActive ? 'نشط' : 'معطل'}
              </span>
            </td>
            <td>
              <div style="display:flex; gap:0.35rem; align-items:center;">
                <button class="btn btn-secondary btn-icon-sm view-student-btn" data-id="${s.id}" title="عرض تقرير الطالب">
                  ${Icons.eye()}
                </button>
                <button class="btn btn-outline btn-icon-sm edit-student-btn" data-id="${s.id}" title="تعديل البيانات">
                  ${Icons.edit()}
                </button>
                <button class="btn btn-ghost btn-icon-sm reset-pw-btn" data-id="${s.id}" data-name="${s.name}" title="إعادة تعيين كلمة المرور">
                  ${Icons.lock()}
                </button>
                <button class="btn ${isActive ? 'btn-ghost' : 'btn-secondary'} btn-icon-sm toggle-status-btn" data-id="${s.id}" data-status="${isActive ? 'active' : 'disabled'}" title="${isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}">
                  ${isActive ? Icons.unlock() : Icons.lock()}
                </button>
                <button class="btn btn-danger btn-icon-sm delete-student-btn" data-id="${s.id}" title="حذف">
                  ${Icons.trash()}
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    initStudentsEvents() {
      // Add Student Button
      document.getElementById('add-student-btn')?.addEventListener('click', () => {
        document.getElementById('student-modal-title').textContent = 'إضافة طالب جديد';
        document.getElementById('admin-student-id').value = '';
        document.getElementById('admin-student-form').reset();
        document.getElementById('admin-st-pass-group').style.display = 'block';
        UI.openModal('student-modal');
      });

      // Save Student Form
      document.getElementById('save-student-admin-btn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const id = document.getElementById('admin-student-id').value;
        const name = document.getElementById('admin-st-name').value.trim();
        const phone = document.getElementById('admin-st-phone').value.trim();
        const parentPhone = document.getElementById('admin-st-parent').value.trim();
        const grade = document.getElementById('admin-st-grade').value;
        const password = document.getElementById('admin-st-pass').value;

        if (!name || !phone) {
          UI.showToast('يرجى ملء اسم الطالب ورقم الهاتف', 'error');
          return;
        }

        try {
          if (!id) {
            const res = await window.AdminService.createStudent({
              name,
              phone,
              parent_phone: parentPhone,
              grade,
              password: password || '123456'
            });
            UI.closeModal('student-modal');
            UI.showToast(res.message || 'تمت إضافة الطالب بنجاح ⚡', 'success');
          } else {
            const res = await window.AdminService.updateStudent(id, {
              name,
              phone,
              parent_phone: parentPhone,
              grade
            });
            UI.closeModal('student-modal');
            UI.showToast(res.message || 'تم تحديث بيانات الطالب بنجاح', 'success');
          }

          const updatedStudents = await window.AdminService.getStudents();
          document.getElementById('students-table-body').innerHTML = window.AdminViews.renderStudentsTableRows(updatedStudents);
          window.AdminViews.bindStudentRowActions();
        } catch (err) {
          UI.showToast(err.message || 'حدث خطأ أثناء حفظ بيانات الطالب', 'error');
        }
      });

      // Search & Filters
      const searchInput = document.getElementById('search-student-input');
      const gradeSelect = document.getElementById('filter-grade-select');
      const statusSelect = document.getElementById('filter-status-select');

      let debounceTimer = null;
      const performSearch = async () => {
        const query = searchInput?.value.trim() || '';
        const grade = gradeSelect?.value || '';
        const status = statusSelect?.value || '';

        try {
          const results = await window.AdminService.getStudents({
            search: query || undefined,
            grade: grade || undefined,
            status_filter: status || undefined
          });
          document.getElementById('students-table-body').innerHTML = window.AdminViews.renderStudentsTableRows(results);
          window.AdminViews.bindStudentRowActions();
        } catch (err) {
          console.error('Filter search failed:', err);
        }
      };

      searchInput?.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(performSearch, 300);
      });

      gradeSelect?.addEventListener('change', performSearch);
      statusSelect?.addEventListener('change', performSearch);

      // Reset Password Submit
      document.getElementById('submit-reset-pw-btn')?.addEventListener('click', async () => {
        const studentId = document.getElementById('reset-pw-student-id').value;
        const newPw = document.getElementById('new-student-password').value;

        if (!newPw || newPw.length < 6) {
          UI.showToast('كلمة المرور يجب ألا تقل عن 6 أحرف', 'error');
          return;
        }

        try {
          const res = await window.AdminService.resetStudentPassword(studentId, newPw);
          UI.closeModal('reset-password-modal');
          UI.showToast(res.message || 'تمت إعادة تعيين كلمة المرور بنجاح', 'success');
        } catch (err) {
          UI.showToast(err.message || 'فشلت إعادة تعيين كلمة المرور', 'error');
        }
      });

      this.bindStudentRowActions();

      document.querySelectorAll('.close-modal-btn').forEach(b => {
        b.addEventListener('click', () => {
          UI.closeModal('student-modal');
          UI.closeModal('student-detail-modal');
          UI.closeModal('reset-password-modal');
        });
      });
    },

    bindStudentRowActions() {
      // 1. View Student Details
      document.querySelectorAll('.view-student-btn').forEach(b => {
        b.addEventListener('click', async (e) => {
          const sId = e.currentTarget.getAttribute('data-id');
          UI.openModal('student-detail-modal');
          const body = document.getElementById('student-detail-modal-body');
          body.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-muted);">جاري تحميل سجل الطالب...</div>';

          try {
            const data = await window.AdminService.getStudent(sId);
            const st = data.student;
            const lessons = data.lessonProgress || [];
            const exams = data.examAttempts || [];

            body.innerHTML = `
              <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1.5rem; padding-bottom:1rem; border-bottom:1px solid var(--border-subtle);">
                <div class="user-avatar" style="width:50px; height:50px; font-size:1.25rem;">${st.avatar || 'ط'}</div>
                <div>
                  <h3 style="margin:0; font-size:1.125rem; font-weight:800;">${st.name}</h3>
                  <div style="font-size:0.8125rem; color:var(--text-muted);">${st.grade || 'الصف الأول الثانوي'} • هاتف: ${st.phone}</div>
                </div>
              </div>

              <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:1rem; margin-bottom:1.5rem;">
                <div style="background:var(--bg-surface-elevated); padding:0.75rem; border-radius:var(--radius-md); text-align:center;">
                  <div style="font-size:1.25rem; font-weight:800; color:var(--cyan);">${lessons.filter(l => l.completed).length}</div>
                  <div style="font-size:0.75rem; color:var(--text-muted);">الدروس المكتملة</div>
                </div>
                <div style="background:var(--bg-surface-elevated); padding:0.75rem; border-radius:var(--radius-md); text-align:center;">
                  <div style="font-size:1.25rem; font-weight:800; color:var(--primary-blue);">${exams.length}</div>
                  <div style="font-size:0.75rem; color:var(--text-muted);">الاختبارات المسلّمة</div>
                </div>
                <div style="background:var(--bg-surface-elevated); padding:0.75rem; border-radius:var(--radius-md); text-align:center;">
                  <div style="font-size:1.25rem; font-weight:800; color:var(--success);">${st.xp || 100} XP</div>
                  <div style="font-size:0.75rem; color:var(--text-muted);">نقاط التفاعل</div>
                </div>
              </div>

              <h4 style="font-size:0.9375rem; font-weight:700; margin-bottom:0.75rem; color:var(--text-main);">سجل محاولات الاختبارات:</h4>
              <div style="max-height:180px; overflow-y:auto; margin-bottom:1.5rem;">
                ${exams.length === 0 ? '<div style="color:var(--text-muted); font-size:0.8125rem;">لم يقم الطالب بتسليم أي اختبار بعد.</div>' : exams.map(ea => `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem 0.75rem; background:var(--bg-surface-elevated); border-radius:var(--radius-sm); margin-bottom:0.5rem; font-size:0.8125rem;">
                    <div><strong>${ea.exam_title || 'اختبار'}</strong> <span style="color:var(--text-muted); font-size:0.75rem;">(${ea.completed_at ? ea.completed_at.slice(0, 10) : ''})</span></div>
                    <span class="badge ${ea.percentage >= 60 ? 'badge-success' : 'badge-danger'}">${ea.percentage}% (${ea.correct_count}/${ea.total_count})</span>
                  </div>
                `).join('')}
              </div>

              <h4 style="font-size:0.9375rem; font-weight:700; margin-bottom:0.75rem; color:var(--text-main);">الدروس التي تم إنجازها:</h4>
              <div style="max-height:150px; overflow-y:auto;">
                ${lessons.length === 0 ? '<div style="color:var(--text-muted); font-size:0.8125rem;">لم يبدأ الطالب دراسة أي درس بعد.</div>' : lessons.map(lp => `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.75rem; background:var(--bg-surface-elevated); border-radius:var(--radius-sm); margin-bottom:0.35rem; font-size:0.8125rem;">
                    <div>${lp.unit_title} — ${lp.lesson_title}</div>
                    <span class="badge badge-cyan">${lp.completed ? '✓ مكتمل' : `${lp.progress}%`}</span>
                  </div>
                `).join('')}
              </div>
            `;
          } catch (err) {
            body.innerHTML = `<div style="color:var(--danger); padding:1rem;">تعذر جلب تفاصيل الطالب: ${err.message}</div>`;
          }
        });
      });

      // 2. Edit Student
      document.querySelectorAll('.edit-student-btn').forEach(b => {
        b.addEventListener('click', async (e) => {
          const sId = e.currentTarget.getAttribute('data-id');
          try {
            const data = await window.AdminService.getStudent(sId);
            const st = data.student;
            document.getElementById('student-modal-title').textContent = 'تعديل بيانات الطالب';
            document.getElementById('admin-student-id').value = st.id;
            document.getElementById('admin-st-name').value = st.name;
            document.getElementById('admin-st-phone').value = st.phone;
            document.getElementById('admin-st-parent').value = st.parent_phone || st.parentPhone || '';
            document.getElementById('admin-st-grade').value = st.grade || 'الصف الأول الثانوي';
            // section field removed
            document.getElementById('admin-st-pass-group').style.display = 'none';
            UI.openModal('student-modal');
          } catch (err) {
            UI.showToast('تعذر تحميل بيانات الطالب للتعديل', 'error');
          }
        });
      });

      // 3. Reset Password
      document.querySelectorAll('.reset-pw-btn').forEach(b => {
        b.addEventListener('click', (e) => {
          const sId = e.currentTarget.getAttribute('data-id');
          const sName = e.currentTarget.getAttribute('data-name');
          document.getElementById('reset-pw-student-id').value = sId;
          document.getElementById('reset-pw-student-name-text').textContent = `تعيين كلمة مرور جديدة للطالب: ${sName}`;
          document.getElementById('new-student-password').value = '';
          UI.openModal('reset-password-modal');
        });
      });

      // 4. Toggle Status
      document.querySelectorAll('.toggle-status-btn').forEach(b => {
        b.addEventListener('click', async (e) => {
          const sId = e.currentTarget.getAttribute('data-id');
          const currentStatus = e.currentTarget.getAttribute('data-status');
          const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
          try {
            const res = await window.AdminService.toggleStudentStatus(sId, newStatus);
            UI.showToast(res.message || 'تم تحديث حالة الطالب', 'info');
            const updatedStudents = await window.AdminService.getStudents();
            document.getElementById('students-table-body').innerHTML = window.AdminViews.renderStudentsTableRows(updatedStudents);
            window.AdminViews.bindStudentRowActions();
          } catch (err) {
            UI.showToast(err.message || 'فشل تحديث حالة الطالب', 'error');
          }
        });
      });

      // 5. Delete Student
      document.querySelectorAll('.delete-student-btn').forEach(b => {
        b.addEventListener('click', async (e) => {
          const sId = e.currentTarget.getAttribute('data-id');
          if (confirm('هل أنت متأكد من حذف حساب هذا الطالب بالكامل من المنصة؟ لا يمكن التراجع عن هذا الإجراء.')) {
            try {
              const res = await window.AdminService.deleteStudent(sId);
              UI.showToast(res.message || 'تم حذف حساب الطالب بنجاح', 'info');
              const updatedStudents = await window.AdminService.getStudents();
              document.getElementById('students-table-body').innerHTML = window.AdminViews.renderStudentsTableRows(updatedStudents);
              window.AdminViews.bindStudentRowActions();
            } catch (err) {
              UI.showToast(err.message || 'فشل حذف حساب الطالب', 'error');
            }
          }
        });
      });
    },

    // ==========================================
    // 3. CURRICULUM & UNITS & LESSONS
    // ==========================================
    async renderCurriculum() {
      let units = [];
      let lessons = [];
      try {
        [units, lessons] = await Promise.all([
          window.AdminService.getUnits(),
          window.AdminService.getLessons()
        ]);
      } catch (err) {
        console.warn('Error loading curriculum:', err);
      }

      return `
        <div class="content-body">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; flex-wrap:wrap; gap:1rem;">
            <div>
              <div class="badge badge-primary" style="margin-bottom:0.35rem;">📚 إدارة المحتوى الدراسي</div>
              <h1 style="font-size:1.875rem; font-weight:800; margin:0;">الوحدات والدروس المنهجية</h1>
              <p style="color:var(--text-muted); font-size:0.9375rem;">إدارة هيكل المنهج الدراسي، شروح الدروس، الأكواد البرمجية وتدريبات بايثون التفاعلية.</p>
            </div>
            <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
              <button id="add-unit-btn" class="btn btn-primary">
                ${Icons.plus()} إضافة وحدة جديدة
              </button>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:1.5rem;" id="curriculum-units-container">
            ${units.length === 0 ? `
              <div class="empty-state card">
                <div class="empty-icon">📚</div>
                <h3 class="empty-title">لا توجد وحدات دراسية منشأة</h3>
                <p class="empty-desc">قم بإضافة الوحدة الأولى لبدء بناء المنهج الدراسي.</p>
                <button id="empty-add-unit-btn" class="btn btn-primary">${Icons.plus()} إضافة وحدة الآن</button>
              </div>
            ` : units.map(unit => {
              const uLessons = lessons.filter(l => l.unit_id === unit.id || l.unitId === unit.id);
              const isPub = unit.isPublished !== undefined ? unit.isPublished : (unit.is_published || unit.published);
              return `
                <div class="card" style="border-color:var(--border-card);">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.25rem; flex-wrap:wrap; gap:1rem;">
                    <div>
                      <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
                        <span class="badge badge-cyan">الوحدة ${unit.number}</span>
                        <span class="badge ${isPub ? 'badge-success' : 'badge-neutral'}">
                          ${isPub ? 'منشورة للطلاب' : 'مسودة غير معلنة'}
                        </span>
                      </div>
                      <h3 style="font-size:1.25rem; font-weight:800; color:var(--text-main); margin-bottom:0.25rem;">${unit.title}</h3>
                      <p style="font-size:0.875rem; color:var(--text-muted); margin:0;">${unit.description || ''}</p>
                    </div>

                    <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                      <button class="btn btn-secondary btn-sm add-lesson-btn" data-unitid="${unit.id}">
                        ${Icons.plus()} إضافة درس
                      </button>
                      <button class="btn btn-outline btn-icon-sm edit-unit-btn" data-id="${unit.id}" title="تعديل بيانات الوحدة">
                        ${Icons.edit()}
                      </button>
                      <button class="btn btn-ghost btn-icon-sm toggle-unit-pub-btn" data-id="${unit.id}" data-pub="${isPub ? '1' : '0'}" title="${isPub ? 'إلغاء النشر' : 'نشر للطلاب'}">
                        ${isPub ? Icons.eye() : Icons.eyeOff()}
                      </button>
                      <button class="btn btn-danger btn-icon-sm delete-unit-btn" data-id="${unit.id}" title="حذف الوحدة">
                        ${Icons.trash()}
                      </button>
                    </div>
                  </div>

                  <!-- Unit Lessons Table -->
                  <div class="table-container" style="background:var(--bg-surface-elevated); border-radius:var(--radius-md);">
                    <table class="custom-table">
                      <thead>
                        <tr>
                          <th style="width:60px;">#</th>
                          <th>عنوان الدرس</th>
                          <th>النوع والمدة</th>
                          <th>التدريب العملي</th>
                          <th>الحالة</th>
                          <th>الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${uLessons.length === 0 ? `
                          <tr>
                            <td colspan="6" style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.875rem;">
                              لا توجد دروس في هذه الوحدة بعد. اضغط على "+ إضافة درس" لإضافة محتوى.
                            </td>
                          </tr>
                        ` : uLessons.map((l, lIdx) => {
                          const lPub = l.isPublished !== undefined ? l.isPublished : (l.is_published || l.published);
                          return `
                            <tr>
                              <td class="number-font">${l.number || (lIdx + 1)}</td>
                              <td>
                                <strong style="color:var(--text-main); font-size:0.9375rem;">${l.title}</strong>
                                <div style="font-size:0.75rem; color:var(--text-muted);">${(l.description || '').slice(0, 60)}${(l.description || '').length > 60 ? '...' : ''}</div>
                              </td>
                              <td>
                                <span class="badge badge-neutral">${l.type === 'video' ? 'فيديو وشرح' : (l.type === 'practice' ? 'مختبر عملي' : 'تدريبات')}</span>
                                <span style="font-size:0.75rem; color:var(--text-muted); margin-right:0.35rem;">${l.duration}</span>
                              </td>
                              <td>
                                ${l.exercise || l.exercise_title ? '<span class="badge badge-cyan">⚡ يوجد تدريب بايثون</span>' : '<span style="color:var(--text-subtle); font-size:0.8125rem;">—</span>'}
                              </td>
                              <td>
                                <span class="badge ${lPub ? 'badge-success' : 'badge-neutral'}">
                                  ${lPub ? 'منشور' : 'مسودة'}
                                </span>
                              </td>
                              <td>
                                <div style="display:flex; gap:0.35rem;">
                                  <button class="btn btn-secondary btn-icon-sm edit-lesson-btn" data-id="${l.id}" title="تعديل الدرس">
                                    ${Icons.edit()}
                                  </button>
                                  <button class="btn btn-ghost btn-icon-sm toggle-lesson-pub-btn" data-id="${l.id}" data-pub="${lPub ? '1' : '0'}" title="${lPub ? 'إلغاء النشر' : 'نشر'}">
                                    ${lPub ? Icons.eye() : Icons.eyeOff()}
                                  </button>
                                  <button class="btn btn-danger btn-icon-sm delete-lesson-btn" data-id="${l.id}" title="حذف الدرس">
                                    ${Icons.trash()}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          `;
                        }).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Unit Modal -->
          <div class="modal-overlay" id="unit-modal">
            <div class="modal-card">
              <div class="modal-header">
                <h3 id="unit-modal-title" style="font-size:1.125rem; font-weight:800; margin:0;">إضافة وحدة دراسية</h3>
                <button class="btn btn-ghost btn-icon-sm close-modal-btn">${Icons.x()}</button>
              </div>
              <div class="modal-body">
                <form id="unit-form">
                  <input type="hidden" id="unit-modal-id">
                  <div class="form-group">
                    <label class="form-label" for="unit-modal-num">رقم الوحدة</label>
                    <input type="number" id="unit-modal-num" class="form-input" required min="1" value="1">
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="unit-modal-title-input">اسم الوحدة *</label>
                    <input type="text" id="unit-modal-title-input" class="form-input" placeholder="الوحدة الأولى — أساسيات البرمجة ولغة بايثون" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="unit-modal-desc">وصف الوحدة والمخرجات التعليمية</label>
                    <textarea id="unit-modal-desc" class="form-textarea" rows="3" placeholder="مقدمة عن المفاهيم الأساسية والأهداف الدراسية للوحدة..."></textarea>
                  </div>
                  <div class="form-group">
                    <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; font-size:0.875rem; color:var(--text-main);">
                      <input type="checkbox" id="unit-modal-pub" checked>
                      نشر الوحدة للطلاب فوراً
                    </label>
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary close-modal-btn">إلغاء</button>
                <button id="save-unit-submit-btn" class="btn btn-primary">حفظ الوحدة 📚</button>
              </div>
            </div>
          </div>

          <!-- Lesson Modal -->
          <div class="modal-overlay" id="lesson-modal">
            <div class="modal-card" style="max-width:850px;">
              <div class="modal-header">
                <h3 id="lesson-modal-title" style="font-size:1.125rem; font-weight:800; margin:0;">إضافة درس جديد</h3>
                <button class="btn btn-ghost btn-icon-sm close-modal-btn">${Icons.x()}</button>
              </div>
              <div class="modal-body">
                <form id="lesson-form">
                  <input type="hidden" id="lesson-modal-id">
                  <input type="hidden" id="lesson-modal-unitid">

                  <div class="form-group">
                    <label class="form-label" for="lesson-title-input">عنوان الدرس *</label>
                    <input type="text" id="lesson-title-input" class="form-input" placeholder="الدرس الأول — مقدمة في بيئة بايثون والمتغيرات" required>
                  </div>

                  <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;" class="form-grid">
                    <div class="form-group">
                      <label class="form-label" for="lesson-duration-input">المدة المقدرة</label>
                      <input type="text" id="lesson-duration-input" class="form-input" placeholder="25 دقيقة" value="25 دقيقة" required>
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="lesson-type-input">نوع المحتوى</label>
                      <select id="lesson-type-input" class="form-select">
                        <option value="video">فيديو وشرح تفاعلي</option>
                        <option value="practice">تطبيق ومختبر بايثون</option>
                        <option value="quiz">مراجعة وتدريبات</option>
                      </select>
                    </div>
                  </div>

                  <!-- ============================================== -->
                  <!-- Video Source Selector & Configuration Panel -->
                  <!-- ============================================== -->
                  <div style="background:var(--bg-surface-elevated); padding:1.25rem; border-radius:var(--radius-lg); margin-bottom:1.25rem; border:1px solid var(--border-glow);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
                      <label class="form-label" style="margin:0; font-weight:800; color:var(--text-main);">📹 مصدر فيديو الدرس (Video Source)</label>
                      <span style="font-size:0.75rem; color:var(--cyan);">نظام الفيديو المرن (YouTube + Direct Upload)</span>
                    </div>

                    <!-- Toggle Tabs: YouTube vs Direct Upload vs No Video -->
                    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:0.5rem; margin-bottom:1rem;" class="video-tabs-bar">
                      <button type="button" id="tab-vsource-youtube" class="btn btn-primary btn-sm" style="width:100%;">
                        📺 رابط YouTube
                      </button>
                      <button type="button" id="tab-vsource-upload" class="btn btn-outline btn-sm" style="width:100%;">
                        📁 رفع فيديو مباشر (MP4)
                      </button>
                      <button type="button" id="tab-vsource-none" class="btn btn-outline btn-sm" style="width:100%;">
                        🚫 بدون فيديو
                      </button>
                    </div>

                    <!-- Hidden Fields for Video Metadata -->
                    <input type="hidden" id="lesson-video-source" value="youtube">
                    <input type="hidden" id="lesson-video-provider" value="youtube">
                    <input type="hidden" id="lesson-video-id" value="">
                    <input type="hidden" id="lesson-storage-path" value="">
                    <input type="hidden" id="lesson-file-size" value="">
                    <input type="hidden" id="lesson-mime-type" value="">
                    <input type="hidden" id="lesson-thumbnail-url" value="">

                    <!-- Panel 1: YouTube Option -->
                    <div id="panel-vsource-youtube">
                      <div class="form-group" style="margin-bottom:0.5rem;">
                        <label class="form-label" for="lesson-video-url">رابط فيديو YouTube (Watch / Embed / Shorts / youtu.be)</label>
                        <input type="text" id="lesson-video-url" class="form-input" placeholder="https://www.youtube.com/watch?v=kqtD5dpn9C8">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.35rem;">
                          <span id="yt-validation-badge" style="font-size:0.75rem; color:var(--text-subtle);">يدعم روابط watch, youtu.be, shorts</span>
                          <span style="font-size:0.75rem; color:var(--cyan);">المصدر المفضل للفيديوهات الكبيرة ⚡</span>
                        </div>
                      </div>

                      <div class="callout-box callout-note" style="padding:0.75rem 1rem; margin-top:0.5rem; font-size:0.8125rem; line-height:1.6;">
                        <span class="callout-icon">💡</span>
                        <div><strong>إرشاد الاستضافة المجانية:</strong> يفضل استخدام فيديو YouTube غير مدرج (Unlisted) لتشغيله داخل المنصة. (ملاحظة: Unlisted ليس خاصاً Private، حيث يستطيع من يمتلك رابط الفيديو مشاهدته دون أن يظهر في نتائج البحث العامة).</div>
                      </div>

                      <div id="yt-preview-box" style="display:none; margin-top:0.75rem; border-radius:var(--radius-md); overflow:hidden; border:1px solid var(--border-glow); background:#000; position:relative; padding-top:56.25%;">
                        <iframe id="yt-preview-frame" src="" title="معاينة فيديو يوتيوب" style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" allowfullscreen></iframe>
                      </div>
                    </div>

                    <!-- Panel 2: Direct Video Upload Option -->
                    <div id="panel-vsource-upload" style="display:none;">
                      <div class="callout-box callout-info" style="padding:0.75rem 1rem; margin-bottom:0.75rem; font-size:0.8125rem; line-height:1.6;">
                        <span class="callout-icon">📁</span>
                        <div><strong>التخزين المباشر (Object Storage):</strong> الحد الأقصى لحجم الفيديو: <strong>50 ميجابايت</strong>. الصيغ المدعومة: <strong>MP4, WebM</strong>.</div>
                      </div>

                      <div id="upload-dropzone" class="upload-dropzone">
                        <div style="font-size:2.25rem; margin-bottom:0.5rem;">📹</div>
                        <div style="font-weight:700; font-size:0.9375rem; color:var(--text-main); margin-bottom:0.25rem;">اسحب وأفلت ملف الفيديو هنا، أو اضغط للاختيار</div>
                        <div style="font-size:0.75rem; color:var(--text-subtle); margin-bottom:1rem;">ملفات فيديو MP4 أو WebM (بحد أقصى 50MB)</div>
                        <input type="file" id="lesson-video-file-input" accept="video/mp4,video/webm,video/quicktime" style="display:none;">
                        <button type="button" id="trigger-file-select-btn" class="btn btn-secondary btn-sm">
                          📁 اختيار ملف فيديو من جهازك
                        </button>
                      </div>

                      <!-- Upload Progress Card -->
                      <div id="upload-progress-card" style="display:none; background:var(--bg-card); border:1px solid var(--border-glow); border-radius:var(--radius-md); padding:1rem; margin-top:0.75rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem; font-size:0.8125rem;">
                          <span id="upload-progress-fname" style="font-weight:700; color:var(--text-main); max-width:65%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">video.mp4</span>
                          <span id="upload-progress-pct" style="color:var(--cyan); font-weight:800;">0%</span>
                        </div>
                        <div style="height:6px; background:var(--bg-surface); border-radius:3px; overflow:hidden; margin-bottom:0.5rem;">
                          <div id="upload-progress-fill" style="height:100%; width:0%; background:var(--gradient-primary); transition:width 0.15s ease;"></div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem;">
                          <span id="upload-progress-status" style="color:var(--text-muted);">جاري الرفع إلى وحدة التخزين...</span>
                          <span id="upload-progress-size" style="color:var(--text-subtle);">0 MB / 0 MB</span>
                        </div>
                      </div>

                      <!-- Uploaded Video Preview & Controls -->
                      <div id="uploaded-video-preview" style="display:none; margin-top:0.75rem;">
                        <div style="border-radius:var(--radius-md); overflow:hidden; border:1px solid var(--border-glow); background:#000; margin-bottom:0.75rem;">
                          <video id="admin-html5-preview" controls playsinline style="width:100%; max-height:260px; display:block;"></video>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
                          <div id="uploaded-file-meta" style="font-size:0.8125rem; color:var(--success); display:flex; align-items:center; gap:0.35rem;">
                            <span>✅ تم رفع ملف الفيديو بنجاح</span>
                          </div>
                          <div style="display:flex; gap:0.5rem;">
                            <button type="button" id="replace-upload-btn" class="btn btn-secondary btn-sm">استبدال الفيديو</button>
                            <button type="button" id="delete-upload-btn" class="btn btn-danger btn-sm">حذف الفيديو</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Panel 3: No Video Option -->
                    <div id="panel-vsource-none" style="display:none;">
                      <div style="background:var(--bg-card); padding:1rem; border-radius:var(--radius-md); text-align:center; color:var(--text-muted); font-size:0.875rem;">
                        📖 هذا الدرس لا يحتوي على فيديو، وسيعتمد مباشرة على الشرح النظري ومحرر بايثون التفاعلي.
                      </div>
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="lesson-desc-input">وصف موجز للدرس</label>
                    <input type="text" id="lesson-desc-input" class="form-input" placeholder="شرح مبسط للمفاهيم الأساسية..." required>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="lesson-content-html">المحتوى التعليمي والشرح (HTML Content)</label>
                    <textarea id="lesson-content-html" class="form-textarea" rows="4" placeholder="<p>شرح تفصيلي للدرس والمفاهيم المقررة...</p>"></textarea>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="lesson-code-example">كود بايثون التوضيحي (Code Example)</label>
                    <textarea id="lesson-code-example" class="form-textarea code-font ltr" rows="3" placeholder="# مثال توضيحي بلغة بايثون&#10;name = 'Code Spark'&#10;print(f'مرحباً بك في {name}')"></textarea>
                  </div>

                  <div style="background:var(--bg-surface-elevated); padding:1rem; border-radius:var(--radius-md); margin-top:1rem; border:1px solid var(--border-subtle);">
                    <div style="font-weight:700; font-size:0.9375rem; color:var(--cyan); margin-bottom:0.75rem;">⚡ إعدادات التدريب العملي المرفق بالدرس:</div>
                    <div class="form-group">
                      <label class="form-label" for="lesson-ex-title">عنوان التدريب</label>
                      <input type="text" id="lesson-ex-title" class="form-input" placeholder="تدريب عملي: برنامج حساب مساحة المستطيل">
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="lesson-ex-desc">نص ومطلوب التدريب</label>
                      <textarea id="lesson-ex-desc" class="form-textarea" rows="2" placeholder="اكتب برنامجاً بلغة بايثون يستقبل الطول والعرض ثم يطبع المساحة..."></textarea>
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="lesson-ex-starter">كود البداية للطالب (Starter Code)</label>
                      <textarea id="lesson-ex-starter" class="form-textarea code-font ltr" rows="2" placeholder="# اكتب الكود هنا"></textarea>
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="lesson-ex-solution">الكود النموذجي للحل (Solution Code)</label>
                      <textarea id="lesson-ex-solution" class="form-textarea code-font ltr" rows="2" placeholder="length = float(input())&#10;width = float(input())&#10;print(length * width)"></textarea>
                    </div>
                  </div>

                  <div class="form-group" style="margin-top:1rem;">
                    <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; font-size:0.875rem; color:var(--text-main);">
                      <input type="checkbox" id="lesson-modal-pub" checked>
                      نشر الدرس للطلاب فوراً
                    </label>
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary close-modal-btn">إلغاء</button>
                <button id="save-lesson-submit-btn" class="btn btn-primary">حفظ الدرس 📖</button>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    initCurriculumEvents() {
      // Add Unit Button
      document.getElementById('add-unit-btn')?.addEventListener('click', () => {
        document.getElementById('unit-modal-title').textContent = 'إضافة وحدة دراسية جديدة';
        document.getElementById('unit-modal-id').value = '';
        document.getElementById('unit-form').reset();
        document.getElementById('unit-modal-pub').checked = true;
        UI.openModal('unit-modal');
      });

      document.getElementById('empty-add-unit-btn')?.addEventListener('click', () => {
        document.getElementById('add-unit-btn')?.click();
      });

      // Save Unit Form
      document.getElementById('save-unit-submit-btn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const id = document.getElementById('unit-modal-id').value;
        const num = parseInt(document.getElementById('unit-modal-num').value, 10) || 1;
        const title = document.getElementById('unit-modal-title-input').value.trim();
        const desc = document.getElementById('unit-modal-desc').value.trim();
        const isPub = document.getElementById('unit-modal-pub').checked;

        if (!title) {
          UI.showToast('يرجى إدخال عنوان الوحدة', 'error');
          return;
        }

        try {
          if (!id) {
            const res = await window.AdminService.createUnit({
              number: num,
              title,
              description: desc,
              icon: 'code',
              status: 'in-progress',
              published: isPub,
              is_published: isPub
            });
            UI.closeModal('unit-modal');
            UI.showToast(res.message || 'تمت إضافة الوحدة بنجاح 📚', 'success');
          } else {
            const res = await window.AdminService.updateUnit(id, {
              number: num,
              title,
              description: desc,
              published: isPub,
              is_published: isPub
            });
            UI.closeModal('unit-modal');
            UI.showToast(res.message || 'تم تحديث الوحدة بنجاح', 'success');
          }

          window.location.hash = '#admin-curriculum';
          window.location.reload();
        } catch (err) {
          UI.showToast(err.message || 'حدث خطأ أثناء حفظ الوحدة', 'error');
        }
      });

      // Edit Unit
      document.querySelectorAll('.edit-unit-btn').forEach(b => {
        b.addEventListener('click', async (e) => {
          const uId = e.currentTarget.getAttribute('data-id');
          try {
            const unit = await window.AdminService.getUnit(uId);
            document.getElementById('unit-modal-title').textContent = 'تعديل بيانات الوحدة';
            document.getElementById('unit-modal-id').value = unit.id;
            document.getElementById('unit-modal-num').value = unit.number;
            document.getElementById('unit-modal-title-input').value = unit.title;
            document.getElementById('unit-modal-desc').value = unit.description || '';
            document.getElementById('unit-modal-pub').checked = !!(unit.isPublished !== undefined ? unit.isPublished : unit.is_published);
            UI.openModal('unit-modal');
          } catch (err) {
            UI.showToast('تعذر تحميل بيانات الوحدة', 'error');
          }
        });
      });

      // Toggle Unit Publish
      document.querySelectorAll('.toggle-unit-pub-btn').forEach(b => {
        b.addEventListener('click', async (e) => {
          const uId = e.currentTarget.getAttribute('data-id');
          const currentPub = e.currentTarget.getAttribute('data-pub') === '1';
          try {
            const res = await window.AdminService.toggleUnitPublish(uId, !currentPub);
            UI.showToast(res.message || 'تم تحديث حالة نشر الوحدة', 'info');
            window.location.reload();
          } catch (err) {
            UI.showToast(err.message || 'فشل تحديث حالة النشر', 'error');
          }
        });
      });

      // Delete Unit
      document.querySelectorAll('.delete-unit-btn').forEach(b => {
        b.addEventListener('click', async (e) => {
          const uId = e.currentTarget.getAttribute('data-id');
          if (confirm('هل أنت متأكد من حذف هذه الوحدة وجميع الدروس والأسئلة التابعة لها؟')) {
            try {
              const res = await window.AdminService.deleteUnit(uId);
              UI.showToast(res.message || 'تم حذف الوحدة بنجاح', 'info');
              window.location.reload();
            } catch (err) {
              UI.showToast(err.message || 'فشل حذف الوحدة', 'error');
            }
          }
        });
      });

      // ==========================================
      // VIDEO SOURCE TABS & UPLOAD CONTROLS
      // ==========================================
      const tabYt = document.getElementById('tab-vsource-youtube');
      const tabUpload = document.getElementById('tab-vsource-upload');
      const tabNone = document.getElementById('tab-vsource-none');

      const panelYt = document.getElementById('panel-vsource-youtube');
      const panelUpload = document.getElementById('panel-vsource-upload');
      const panelNone = document.getElementById('panel-vsource-none');

      const inputSource = document.getElementById('lesson-video-source');
      const inputProvider = document.getElementById('lesson-video-provider');
      const inputVideoUrl = document.getElementById('lesson-video-url');
      const inputVideoId = document.getElementById('lesson-video-id');
      const inputStoragePath = document.getElementById('lesson-storage-path');
      const inputFileSize = document.getElementById('lesson-file-size');
      const inputMimeType = document.getElementById('lesson-mime-type');
      const inputThumbUrl = document.getElementById('lesson-thumbnail-url');

      const ytPreviewBox = document.getElementById('yt-preview-box');
      const ytPreviewFrame = document.getElementById('yt-preview-frame');
      const ytValidationBadge = document.getElementById('yt-validation-badge');

      const dropzone = document.getElementById('upload-dropzone');
      const fileInput = document.getElementById('lesson-video-file-input');
      const triggerSelectBtn = document.getElementById('trigger-file-select-btn');
      const progressCard = document.getElementById('upload-progress-card');
      const progressFname = document.getElementById('upload-progress-fname');
      const progressPct = document.getElementById('upload-progress-pct');
      const progressFill = document.getElementById('upload-progress-fill');
      const progressStatus = document.getElementById('upload-progress-status');
      const progressSize = document.getElementById('upload-progress-size');

      const uploadPreviewCard = document.getElementById('uploaded-video-preview');
      const adminHtml5Preview = document.getElementById('admin-html5-preview');
      const uploadedFileMeta = document.getElementById('uploaded-file-meta');
      const replaceUploadBtn = document.getElementById('replace-upload-btn');
      const deleteUploadBtn = document.getElementById('delete-upload-btn');

      const switchVideoTab = (mode) => {
        if (inputSource) inputSource.value = mode;
        
        // Tab buttons styling
        if (tabYt) tabYt.className = mode === 'youtube' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
        if (tabUpload) tabUpload.className = mode === 'upload' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
        if (tabNone) tabNone.className = mode === 'none' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';

        // Panels visibility
        if (panelYt) panelYt.style.display = mode === 'youtube' ? 'block' : 'none';
        if (panelUpload) panelUpload.style.display = mode === 'upload' ? 'block' : 'none';
        if (panelNone) panelNone.style.display = mode === 'none' ? 'block' : 'none';

        if (mode === 'youtube' && inputProvider) inputProvider.value = 'youtube';
        if (mode === 'upload' && inputProvider) inputProvider.value = 'local';
        if (mode === 'none' && inputProvider) inputProvider.value = '';
      };

      tabYt?.addEventListener('click', () => switchVideoTab('youtube'));
      tabUpload?.addEventListener('click', () => switchVideoTab('upload'));
      tabNone?.addEventListener('click', () => switchVideoTab('none'));

      // YouTube Real-time validation & preview
      const updateYouTubePreview = () => {
        const url = inputVideoUrl?.value.trim();
        const vId = window.AdminViews.extractYouTubeId(url);

        if (vId) {
          if (inputVideoId) inputVideoId.value = vId;
          if (inputThumbUrl) inputThumbUrl.value = `https://img.youtube.com/vi/${vId}/hqdefault.jpg`;
          if (ytValidationBadge) {
            ytValidationBadge.innerHTML = `<span style="color:var(--success);">✓ تم التعرف على الفيديو بنجاح (ID: ${vId})</span>`;
          }
          if (ytPreviewFrame) {
            ytPreviewFrame.src = `https://www.youtube-nocookie.com/embed/${vId}?rel=0`;
          }
          if (ytPreviewBox) ytPreviewBox.style.display = 'block';
        } else if (url) {
          if (inputVideoId) inputVideoId.value = '';
          if (ytValidationBadge) {
            ytValidationBadge.innerHTML = `<span style="color:var(--danger);">⚠️ رابط غير صالح، يرجى التأكد من رابط يوتيوب</span>`;
          }
          if (ytPreviewBox) ytPreviewBox.style.display = 'none';
          if (ytPreviewFrame) ytPreviewFrame.src = '';
        } else {
          if (inputVideoId) inputVideoId.value = '';
          if (ytValidationBadge) {
            ytValidationBadge.innerHTML = `يدعم روابط watch, youtu.be, shorts`;
          }
          if (ytPreviewBox) ytPreviewBox.style.display = 'none';
          if (ytPreviewFrame) ytPreviewFrame.src = '';
        }
      };

      inputVideoUrl?.addEventListener('input', updateYouTubePreview);
      inputVideoUrl?.addEventListener('change', updateYouTubePreview);

      // Direct Video Upload Handler
      const handleFileUpload = async (file) => {
        if (!file) return;

        // 1. Client-side format & size validation
        const maxBytes = 50 * 1024 * 1024; // 50MB Free-tier limit
        const allowedExts = ['.mp4', '.webm', '.mov'];
        const fileName = file.name.toLowerCase();
        const ext = fileName.substring(fileName.lastIndexOf('.'));

        if (!allowedExts.includes(ext) && !file.type.startsWith('video/')) {
          UI.showToast('صيغة الملف غير مدعومة. يرجى اختيار ملف MP4 أو WebM', 'error');
          return;
        }

        if (file.size > maxBytes) {
          const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
          UI.showToast(`حجم الملف (${sizeMb} MB) يتجاوز الحد الأقصى للباقة المجانية (50 MB)`, 'error');
          return;
        }

        // 2. Display progress UI
        if (progressCard) progressCard.style.display = 'block';
        if (dropzone) dropzone.style.display = 'none';
        if (uploadPreviewCard) uploadPreviewCard.style.display = 'none';

        if (progressFname) progressFname.textContent = file.name;
        if (progressPct) progressPct.textContent = '0%';
        if (progressFill) progressFill.style.width = '0%';
        if (progressStatus) progressStatus.textContent = 'جاري رفع الفيديو...';
        if (progressSize) progressSize.textContent = `0 MB / ${(file.size / (1024 * 1024)).toFixed(1)} MB`;

        const lessonId = document.getElementById('lesson-modal-id')?.value || null;
        const oldPath = inputStoragePath?.value || null;

        try {
          const res = await window.AdminService.uploadVideo(file, lessonId, oldPath, (pct, loaded, total) => {
            if (progressPct) progressPct.textContent = `${pct}%`;
            if (progressFill) progressFill.style.width = `${pct}%`;
            if (progressSize) {
              const loadedMb = (loaded / (1024 * 1024)).toFixed(1);
              const totalMb = (total / (1024 * 1024)).toFixed(1);
              progressSize.textContent = `${loadedMb} MB / ${totalMb} MB`;
            }
          });

          if (res.success && res.video) {
            const v = res.video;
            if (inputSource) inputSource.value = 'upload';
            if (inputProvider) inputProvider.value = v.video_provider || 'local';
            if (inputVideoUrl) inputVideoUrl.value = v.video_url || '';
            if (inputVideoId) inputVideoId.value = v.video_id || '';
            if (inputStoragePath) inputStoragePath.value = v.storage_path || '';
            if (inputFileSize) inputFileSize.value = v.file_size || file.size;
            if (inputMimeType) inputMimeType.value = v.mime_type || file.type || 'video/mp4';

            if (progressStatus) progressStatus.textContent = 'اكتمل الرفع بنجاح! ✅';
            setTimeout(() => {
              if (progressCard) progressCard.style.display = 'none';
              if (uploadPreviewCard) uploadPreviewCard.style.display = 'block';
              if (adminHtml5Preview) {
                adminHtml5Preview.src = v.video_url;
                adminHtml5Preview.load();
              }
              if (uploadedFileMeta) {
                const mb = (v.file_size / (1024 * 1024)).toFixed(1);
                uploadedFileMeta.innerHTML = `<span>✅ ${v.filename || file.name} (${mb} MB)</span>`;
              }
            }, 600);

            UI.showToast('تم رفع ملف الفيديو بنجاح 📹', 'success');
          }
        } catch (err) {
          if (progressCard) progressCard.style.display = 'none';
          if (dropzone) dropzone.style.display = 'block';
          UI.showToast(err.message || 'فشل رفع الفيديو. يرجى المحاولة مرة أخرى.', 'error');
        }
      };

      triggerSelectBtn?.addEventListener('click', () => fileInput?.click());
      dropzone?.addEventListener('click', (e) => {
        if (e.target !== triggerSelectBtn) fileInput?.click();
      });

      fileInput?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) handleFileUpload(file);
      });

      dropzone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone?.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
      });

      dropzone?.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const file = e.dataTransfer?.files?.[0];
        if (file) handleFileUpload(file);
      });

      replaceUploadBtn?.addEventListener('click', () => fileInput?.click());

      deleteUploadBtn?.addEventListener('click', async () => {
        const path = inputStoragePath?.value;
        if (path) {
          try {
            await window.AdminService.deleteVideo(path);
          } catch (e) {
            console.warn('Error deleting video on backend:', e);
          }
        }
        if (inputStoragePath) inputStoragePath.value = '';
        if (inputVideoUrl) inputVideoUrl.value = '';
        if (inputVideoId) inputVideoId.value = '';
        if (inputFileSize) inputFileSize.value = '';
        if (inputMimeType) inputMimeType.value = '';
        if (adminHtml5Preview) {
          adminHtml5Preview.pause();
          adminHtml5Preview.removeAttribute('src');
          adminHtml5Preview.load();
        }
        if (uploadPreviewCard) uploadPreviewCard.style.display = 'none';
        if (dropzone) dropzone.style.display = 'block';
        UI.showToast('تم إزالة الفيديو من الدرس', 'info');
      });

      // Add Lesson Button
      document.querySelectorAll('.add-lesson-btn').forEach(b => {
        b.addEventListener('click', (e) => {
          const unitId = e.currentTarget.getAttribute('data-unitid');
          document.getElementById('lesson-modal-title').textContent = 'إضافة درس جديد للوحدة';
          document.getElementById('lesson-modal-id').value = '';
          document.getElementById('lesson-modal-unitid').value = unitId;
          document.getElementById('lesson-form').reset();
          
          // Reset Video State
          switchVideoTab('youtube');
          if (inputStoragePath) inputStoragePath.value = '';
          if (inputVideoId) inputVideoId.value = '';
          if (inputFileSize) inputFileSize.value = '';
          if (inputMimeType) inputMimeType.value = '';
          if (inputThumbUrl) inputThumbUrl.value = '';
          if (ytPreviewBox) ytPreviewBox.style.display = 'none';
          if (ytPreviewFrame) ytPreviewFrame.src = '';
          if (uploadPreviewCard) uploadPreviewCard.style.display = 'none';
          if (dropzone) dropzone.style.display = 'block';
          if (progressCard) progressCard.style.display = 'none';

          document.getElementById('lesson-modal-pub').checked = true;
          UI.openModal('lesson-modal');
        });
      });

      // Save Lesson Form
      document.getElementById('save-lesson-submit-btn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const id = document.getElementById('lesson-modal-id').value;
        const unitId = document.getElementById('lesson-modal-unitid').value;
        const title = document.getElementById('lesson-title-input').value.trim();
        const duration = document.getElementById('lesson-duration-input').value.trim();
        const type = document.getElementById('lesson-type-input').value;
        const desc = document.getElementById('lesson-desc-input').value.trim();
        const contentHtml = document.getElementById('lesson-content-html').value.trim();
        const codeExample = document.getElementById('lesson-code-example').value.trim();
        const exTitle = document.getElementById('lesson-ex-title').value.trim();
        const exDesc = document.getElementById('lesson-ex-desc').value.trim();
        const exStarter = document.getElementById('lesson-ex-starter').value.trim();
        const exSolution = document.getElementById('lesson-ex-solution').value.trim();
        const isPub = document.getElementById('lesson-modal-pub').checked;

        const vSource = inputSource?.value || 'youtube';
        const vProvider = inputProvider?.value || (vSource === 'youtube' ? 'youtube' : 'local');
        const vUrl = inputVideoUrl?.value.trim() || '';
        const vId = inputVideoId?.value.trim() || null;
        const vStoragePath = inputStoragePath?.value.trim() || null;
        const vFileSize = inputFileSize?.value ? parseInt(inputFileSize.value, 10) : null;
        const vMimeType = inputMimeType?.value || null;
        const vThumb = inputThumbUrl?.value || null;

        if (!title) {
          UI.showToast('يرجى إدخال عنوان الدرس', 'error');
          return;
        }

        const payload = {
          unit_id: unitId,
          title,
          duration: duration || '20 دقيقة',
          type,
          video_source: vSource === 'none' ? null : vSource,
          video_provider: vSource === 'none' ? null : vProvider,
          video_id: vSource === 'youtube' ? vId : null,
          video_url: vSource === 'none' ? '' : vUrl,
          storage_path: vSource === 'upload' ? vStoragePath : null,
          file_size: vFileSize,
          mime_type: vMimeType,
          thumbnail_url: vThumb,
          description: desc,
          content: contentHtml || `<p>${desc}</p>`,
          content_html: contentHtml || `<p>${desc}</p>`,
          code_example: codeExample,
          exercise_title: exTitle,
          exercise_description: exDesc,
          exercise_starter_code: exStarter,
          exercise_solution_code: exSolution,
          published: isPub,
          is_published: isPub
        };

        try {
          if (!id) {
            const res = await window.AdminService.createLesson(payload);
            UI.closeModal('lesson-modal');
            UI.showToast(res.message || 'تم إنشاء الدرس بنجاح 📖', 'success');
          } else {
            const res = await window.AdminService.updateLesson(id, payload);
            UI.closeModal('lesson-modal');
            UI.showToast(res.message || 'تم تحديث الدرس بنجاح', 'success');
          }
          window.location.reload();
        } catch (err) {
          UI.showToast(err.message || 'حدث خطأ أثناء حفظ الدرس', 'error');
        }
      });

      // Edit Lesson
      document.querySelectorAll('.edit-lesson-btn').forEach(b => {
        b.addEventListener('click', async (e) => {
          const lId = e.currentTarget.getAttribute('data-id');
          try {
            const l = await window.AdminService.getLesson(lId);
            document.getElementById('lesson-modal-title').textContent = 'تعديل بيانات الدرس';
            document.getElementById('lesson-modal-id').value = l.id;
            document.getElementById('lesson-modal-unitid').value = l.unit_id || l.unitId;
            document.getElementById('lesson-title-input').value = l.title;
            document.getElementById('lesson-duration-input').value = l.duration || '20 دقيقة';
            document.getElementById('lesson-type-input').value = l.type || 'video';
            document.getElementById('lesson-desc-input').value = l.description || '';
            document.getElementById('lesson-content-html').value = l.content_html || l.content || '';
            document.getElementById('lesson-code-example').value = l.code_example || l.codeExample || '';
            
            // Populate Video Source & Data
            const source = l.video_source || l.videoSource || (l.video_url && (l.video_url.includes('youtube') || l.video_url.includes('youtu.be')) ? 'youtube' : (l.storage_path ? 'upload' : (l.video_url ? 'upload' : 'none')));
            const vUrl = l.video_url || l.videoUrl || '';
            const vStorage = l.storage_path || l.storagePath || '';
            const vId = l.video_id || l.videoId || '';
            const vSize = l.file_size || l.fileSize || '';
            const vMime = l.mime_type || l.mimeType || 'video/mp4';

            if (inputStoragePath) inputStoragePath.value = vStorage;
            if (inputVideoId) inputVideoId.value = vId;
            if (inputFileSize) inputFileSize.value = vSize;
            if (inputMimeType) inputMimeType.value = vMime;

            if (source === 'upload' && (vStorage || vUrl)) {
              switchVideoTab('upload');
              if (inputVideoUrl) inputVideoUrl.value = vUrl;
              if (dropzone) dropzone.style.display = 'none';
              if (uploadPreviewCard) uploadPreviewCard.style.display = 'block';
              if (adminHtml5Preview) {
                adminHtml5Preview.src = vUrl;
                adminHtml5Preview.load();
              }
              if (uploadedFileMeta) {
                const mb = vSize ? (vSize / (1024 * 1024)).toFixed(1) : '';
                uploadedFileMeta.innerHTML = `<span>✅ ملف فيديو محفوظ ${mb ? '(' + mb + ' MB)' : ''}</span>`;
              }
            } else if (source === 'youtube' || vUrl) {
              switchVideoTab('youtube');
              if (inputVideoUrl) inputVideoUrl.value = vUrl;
              updateYouTubePreview();
            } else {
              switchVideoTab('none');
            }

            const ex = l.exercise || {};
            document.getElementById('lesson-ex-title').value = l.exercise_title || ex.title || '';
            document.getElementById('lesson-ex-desc').value = l.exercise_description || ex.description || '';
            document.getElementById('lesson-ex-starter').value = l.exercise_starter_code || ex.starterCode || '';
            document.getElementById('lesson-ex-solution').value = l.exercise_solution_code || ex.solutionCode || '';
            document.getElementById('lesson-modal-pub').checked = !!(l.isPublished !== undefined ? l.isPublished : l.is_published);

            UI.openModal('lesson-modal');
          } catch (err) {
            UI.showToast('تعذر تحميل بيانات الدرس للتعديل', 'error');
          }
        });
      });

      // Toggle Lesson Publish
      document.querySelectorAll('.toggle-lesson-pub-btn').forEach(b => {
        b.addEventListener('click', async (e) => {
          const lId = e.currentTarget.getAttribute('data-id');
          const currentPub = e.currentTarget.getAttribute('data-pub') === '1';
          try {
            const res = await window.AdminService.toggleLessonPublish(lId, !currentPub);
            UI.showToast(res.message || 'تم تحديث حالة نشر الدرس', 'info');
            window.location.reload();
          } catch (err) {
            UI.showToast(err.message || 'فشل تحديث حالة نشر الدرس', 'error');
          }
        });
      });

      // Delete Lesson
      document.querySelectorAll('.delete-lesson-btn').forEach(b => {
        b.addEventListener('click', async (e) => {
          const lId = e.currentTarget.getAttribute('data-id');
          if (confirm('هل أنت متأكد من حذف هذا الدرس؟')) {
            try {
              const res = await window.AdminService.deleteLesson(lId);
              UI.showToast(res.message || 'تم حذف الدرس بنجاح', 'info');
              window.location.reload();
            } catch (err) {
              UI.showToast(err.message || 'فشل حذف الدرس', 'error');
            }
          }
        });
      });

      document.querySelectorAll('.close-modal-btn').forEach(b => {
        b.addEventListener('click', () => {
          UI.closeModal('unit-modal');
          UI.closeModal('lesson-modal');
        });
      });
    },

    // ==========================================
    // 4. QUESTIONS BANK MANAGEMENT
    // ==========================================
    async renderQuestions() {
      let questions = [];
      let units = [];
      try {
        [questions, units] = await Promise.all([
          window.AdminService.getQuestions(),
          window.AdminService.getUnits()
        ]);
      } catch (err) {
        console.warn('Error loading questions:', err);
      }

      return `
        <div class="content-body">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; flex-wrap:wrap; gap:1rem;">
            <div>
              <div class="badge badge-purple" style="margin-bottom:0.35rem;">❓ بنك الأسئلة والتقييم</div>
              <h1 style="font-size:1.875rem; font-weight:800; margin:0;">بنك أسئلة مادة البرمجة</h1>
              <p style="color:var(--text-muted); font-size:0.9375rem;">إدارة الأسئلة، تحديد الإجابات الصحيحة وشرح الحلول النموذجية المقررة.</p>
            </div>

            <button id="add-question-btn" class="btn btn-primary">
              ${Icons.plus()} إضافة سؤال جديد
            </button>
          </div>

          <!-- Filters Bar -->
          <div class="card" style="margin-bottom:1.5rem; padding:1rem 1.25rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem;">
            <div style="display:flex; align-items:center; gap:0.75rem; flex:1; min-width:250px;">
              <span style="color:var(--text-muted);">${Icons.search()}</span>
              <input type="text" id="search-q-input" class="form-input" placeholder="ابحث في نص السؤال أو الشرح..." style="border:none; background:transparent;">
            </div>

            <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
              <select id="filter-q-unit" class="form-select" style="width:auto;">
                <option value="">جميع الوحدات</option>
                ${units.map(u => `<option value="${u.id}">${u.title}</option>`).join('')}
              </select>

              <select id="filter-q-type" class="form-select" style="width:auto;">
                <option value="">جميع الأنواع</option>
                <option value="mcq">اختيار من متعدد (MCQ)</option>
                <option value="true_false">صح وخطأ (T/F)</option>
                <option value="code_output">تتبع مخرجات الكود</option>
                <option value="code_completion">إكمال الكود</option>
              </select>

              <select id="filter-q-diff" class="form-select" style="width:auto;">
                <option value="">جميع مستويات الصعوبة</option>
                <option value="easy">سهل</option>
                <option value="medium">متوسط</option>
                <option value="hard">صعب</option>
              </select>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:1.25rem;" id="questions-list-container">
            ${this.renderQuestionsList(questions)}
          </div>

          <!-- Add/Edit Question Modal -->
          <div class="modal-overlay" id="question-modal">
            <div class="modal-card" style="max-width:700px;">
              <div class="modal-header">
                <h3 id="question-modal-title" style="font-size:1.125rem; font-weight:800; margin:0;">إضافة سؤال جديد</h3>
                <button class="btn btn-ghost btn-icon-sm close-modal-btn">${Icons.x()}</button>
              </div>
              <div class="modal-body">
                <form id="question-form">
                  <input type="hidden" id="question-modal-id">

                  <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;" class="form-grid">
                    <div class="form-group">
                      <label class="form-label" for="q-unit-select">الوحدة التابع لها *</label>
                      <select id="q-unit-select" class="form-select" required>
                        ${units.map(u => `<option value="${u.id}">${u.title}</option>`).join('')}
                      </select>
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="q-type-select">نوع السؤال</label>
                      <select id="q-type-select" class="form-select">
                        <option value="mcq">اختيار من متعدد</option>
                        <option value="true_false">صح وخطأ</option>
                        <option value="code_output">تتبع مخرجات بايثون</option>
                        <option value="code_completion">إكمال الكود</option>
                      </select>
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="q-text">نص السؤال *</label>
                    <textarea id="q-text" class="form-textarea" rows="3" placeholder="اكتب نص السؤال هنا..." required></textarea>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="q-code-snippet">كود بايثون المرفق مع السؤال (اختياري)</label>
                    <textarea id="q-code-snippet" class="form-textarea code-font ltr" rows="3" placeholder="# كود بايثون المرتبط بالسؤال"></textarea>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="q-options">الخيارات (افصل بين الخيارات بسطر جديد) *</label>
                    <textarea id="q-options" class="form-textarea" rows="4" placeholder="الخيار الأول&#10;الخيار الثاني&#10;الخيار الثالث&#10;الخيار الرابع" required></textarea>
                  </div>

                  <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:1rem;" class="form-grid">
                    <div class="form-group">
                      <label class="form-label" for="q-correct">رقم الخيار الصحيح (1, 2, 3...) *</label>
                      <input type="number" id="q-correct" class="form-input" min="1" max="6" value="1" required>
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="q-score">درجة السؤال</label>
                      <input type="number" id="q-score" class="form-input" min="1" max="20" value="10" required>
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="q-diff-select">مستوى الصعوبة</label>
                      <select id="q-diff-select" class="form-select">
                        <option value="easy">سهل</option>
                        <option value="medium" selected>متوسط</option>
                        <option value="hard">صعب</option>
                      </select>
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="q-explanation">الشرح والتعليل النموذجي</label>
                    <textarea id="q-explanation" class="form-textarea" rows="2" placeholder="توضيح سبب صحة الإجابة للطالب بعد الاختبار..."></textarea>
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary close-modal-btn">إلغاء</button>
                <button id="save-q-btn" class="btn btn-primary">حفظ السؤال ⚡</button>
              </div>
            </div>
          </div>

        </div>
      `;
    },

    renderQuestionsList(questions) {
      if (!questions || questions.length === 0) {
        return `
          <div class="empty-state card">
            <div class="empty-icon">❓</div>
            <h3 class="empty-title">لا توجد أسئلة تطابق معايير البحث</h3>
            <p class="empty-desc">يمكنك إضافة سؤال جديد إلى بنك الأسئلة أو تغيير معايير التصفية.</p>
          </div>
        `;
      }

      return questions.map((q, idx) => {
        const typeLabel = q.type === 'mcq' ? 'اختيار من متعدد' : (q.type === 'true_false' || q.type === 'tf' ? 'صح وخطأ' : (q.type === 'code_output' ? 'تتبع كود' : 'إكمال كود'));
        const diffLabel = q.difficulty === 'easy' ? 'سهل' : (q.difficulty === 'hard' ? 'صعب' : 'متوسط');
        const correctIdx = typeof q.correctAnswer === 'number' ? q.correctAnswer : (parseInt(q.correct_answer, 10) || 0);

        return `
          <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
              <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                <span class="badge badge-primary">سؤال ${idx + 1}</span>
                <span class="badge badge-neutral">${typeLabel}</span>
                <span class="badge badge-cyan">${diffLabel}</span>
                <span class="badge badge-warning" style="font-family:var(--font-sans);">${q.score || 10} درجات</span>
                ${q.unit_title ? `<span class="badge badge-purple">${q.unit_title}</span>` : ''}
              </div>
              <div style="display:flex; gap:0.35rem;">
                <button class="btn btn-secondary btn-icon-sm edit-q-btn" data-id="${q.id}" title="تعديل السؤال">
                  ${Icons.edit()}
                </button>
                <button class="btn btn-danger btn-icon-sm delete-q-btn" data-id="${q.id}" title="حذف">
                  ${Icons.trash()}
                </button>
              </div>
            </div>

            <h4 style="font-size:1rem; font-weight:700; color:var(--text-main); margin-bottom:0.75rem; line-height:1.6; white-space:pre-line;">${q.question || q.question_text}</h4>
            
            ${q.code_snippet || q.codeSnippet ? `
              <pre class="code-block ltr" style="margin-bottom:0.75rem; padding:0.75rem; border-radius:var(--radius-sm); font-size:0.875rem;"><code>${q.code_snippet || q.codeSnippet}</code></pre>
            ` : ''}

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:0.5rem; margin-bottom:0.75rem;">
              ${(q.options || []).map((opt, oIdx) => `
                <div style="padding:0.5rem 0.75rem; border-radius:var(--radius-sm); font-size:0.8125rem; background:var(--bg-surface-elevated); ${oIdx === correctIdx ? 'border:1px solid var(--success); color:#FFFFFF;' : 'color:var(--text-muted);'}">
                  ${oIdx === correctIdx ? '✓ ' : ''}${opt}
                </div>
              `).join('')}
            </div>

            ${q.explanation ? `
              <div style="font-size:0.8125rem; color:var(--text-muted); background:var(--bg-surface-elevated); padding:0.5rem 0.75rem; border-radius:var(--radius-sm);">
                <strong style="color:var(--cyan);">الشرح النموذجي:</strong> ${q.explanation}
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    },

    initQuestionsEvents() {
      // Add Question Button
      document.getElementById('add-question-btn')?.addEventListener('click', () => {
        document.getElementById('question-modal-title').textContent = 'إضافة سؤال جديد';
        document.getElementById('question-modal-id').value = '';
        document.getElementById('question-form').reset();
        UI.openModal('question-modal');
      });

      // Save Question
      document.getElementById('save-q-btn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const id = document.getElementById('question-modal-id').value;
        const unitId = document.getElementById('q-unit-select').value;
        const qType = document.getElementById('q-type-select').value;
        const qText = document.getElementById('q-text').value.trim();
        const codeSnippet = document.getElementById('q-code-snippet').value.trim();
        const optionsRaw = document.getElementById('q-options').value.trim();
        const correct = parseInt(document.getElementById('q-correct').value, 10) - 1;
        const score = parseInt(document.getElementById('q-score').value, 10) || 10;
        const diff = document.getElementById('q-diff-select').value;
        const exp = document.getElementById('q-explanation').value.trim();

        if (!qText || !optionsRaw) {
          UI.showToast('يرجى كتابة نص السؤال والخيارات', 'error');
          return;
        }

        const opts = optionsRaw.split('\n').map(o => o.trim()).filter(Boolean);
        if (opts.length < 2) {
          UI.showToast('يجب إدخال خيارين على الأقل', 'error');
          return;
        }

        const payload = {
          unit_id: unitId,
          type: qType,
          question: qText,
          code_snippet: codeSnippet,
          options: opts,
          correct_answer: String(correct),
          score: score,
          difficulty: diff,
          explanation: exp
        };

        try {
          if (!id) {
            const res = await window.AdminService.createQuestion(payload);
            UI.closeModal('question-modal');
            UI.showToast(res.message || 'تمت إضافة السؤال إلى بنك الأسئلة ⚡', 'success');
          } else {
            const res = await window.AdminService.updateQuestion(id, payload);
            UI.closeModal('question-modal');
            UI.showToast(res.message || 'تم تحديث السؤال بنجاح', 'success');
          }

          const updated = await window.AdminService.getQuestions();
          document.getElementById('questions-list-container').innerHTML = window.AdminViews.renderQuestionsList(updated);
          window.AdminViews.bindQuestionActions();
        } catch (err) {
          UI.showToast(err.message || 'حدث خطأ أثناء حفظ السؤال', 'error');
        }
      });

      // Filter Questions
      const searchInput = document.getElementById('search-q-input');
      const unitSelect = document.getElementById('filter-q-unit');
      const typeSelect = document.getElementById('filter-q-type');
      const diffSelect = document.getElementById('filter-q-diff');

      let debounceTimer = null;
      const applyFilter = async () => {
        const q = searchInput?.value.trim();
        const u = unitSelect?.value;
        const t = typeSelect?.value;
        const d = diffSelect?.value;

        try {
          const results = await window.AdminService.getQuestions({
            search: q || undefined,
            unit_id: u || undefined,
            q_type: t || undefined,
            difficulty: d || undefined
          });
          document.getElementById('questions-list-container').innerHTML = window.AdminViews.renderQuestionsList(results);
          window.AdminViews.bindQuestionActions();
        } catch (err) {
          console.error('Failed to filter questions:', err);
        }
      };

      searchInput?.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(applyFilter, 300);
      });
      unitSelect?.addEventListener('change', applyFilter);
      typeSelect?.addEventListener('change', applyFilter);
      diffSelect?.addEventListener('change', applyFilter);

      this.bindQuestionActions();

      document.querySelectorAll('.close-modal-btn').forEach(b => {
        b.addEventListener('click', () => UI.closeModal('question-modal'));
      });
    },

    bindQuestionActions() {
      // Edit Question
      document.querySelectorAll('.edit-q-btn').forEach(b => {
        b.addEventListener('click', async (e) => {
          const qId = e.currentTarget.getAttribute('data-id');
          try {
            const q = await window.AdminService.getQuestion(qId);
            document.getElementById('question-modal-title').textContent = 'تعديل السؤال';
            document.getElementById('question-modal-id').value = q.id;
            document.getElementById('q-unit-select').value = q.unit_id || q.unitId || '';
            document.getElementById('q-type-select').value = q.type || 'mcq';
            document.getElementById('q-text').value = q.question || q.question_text || '';
            document.getElementById('q-code-snippet').value = q.code_snippet || q.codeSnippet || '';
            document.getElementById('q-options').value = (q.options || []).join('\n');
            const corr = typeof q.correctAnswer === 'number' ? q.correctAnswer : (parseInt(q.correct_answer, 10) || 0);
            document.getElementById('q-correct').value = corr + 1;
            document.getElementById('q-score').value = q.score || 10;
            document.getElementById('q-diff-select').value = q.difficulty || 'medium';
            document.getElementById('q-explanation').value = q.explanation || '';
            UI.openModal('question-modal');
          } catch (err) {
            UI.showToast('تعذر تحميل بيانات السؤال', 'error');
          }
        });
      });

      // Delete Question
      document.querySelectorAll('.delete-q-btn').forEach(b => {
        b.addEventListener('click', async (e) => {
          const qId = e.currentTarget.getAttribute('data-id');
          if (confirm('هل أنت متأكد من حذف هذا السؤال من بنك الأسئلة؟')) {
            try {
              const res = await window.AdminService.deleteQuestion(qId);
              UI.showToast(res.message || 'تم حذف السؤال بنجاح', 'info');
              const updated = await window.AdminService.getQuestions();
              document.getElementById('questions-list-container').innerHTML = window.AdminViews.renderQuestionsList(updated);
              window.AdminViews.bindQuestionActions();
            } catch (err) {
              UI.showToast(err.message || 'فشل حذف السؤال', 'error');
            }
          }
        });
      });
    },

    // ==========================================
    // 5. EXAMS MANAGEMENT & EXAM BUILDER
    // ==========================================
    async renderExams() {
      let exams = [];
      let units = [];
      let allQuestions = [];
      try {
        [exams, units, allQuestions] = await Promise.all([
          window.AdminService.getExams(),
          window.AdminService.getUnits(),
          window.AdminService.getQuestions()
        ]);
      } catch (err) {
        console.warn('Error loading exams:', err);
      }

      return `
        <div class="content-body">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; flex-wrap:wrap; gap:1rem;">
            <div>
              <div class="badge badge-cyan" style="margin-bottom:0.35rem;">📝 التقييمات والاختبارات</div>
              <h1 style="font-size:1.875rem; font-weight:800; margin:0;">إدارة الاختبارات والامتحانات</h1>
              <p style="color:var(--text-muted); font-size:0.9375rem;">بناء اختبارات الوحدات والاختبارات المدرسية الشاملة وتحديد معايير النجاح.</p>
            </div>

            <button id="create-exam-btn" class="btn btn-primary">
              ${Icons.plus()} إنشاء اختبار جديد
            </button>
          </div>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:1.5rem;" id="exams-list-container">
            ${exams.length === 0 ? `
              <div class="empty-state card" style="grid-column: 1 / -1;">
                <div class="empty-icon">📝</div>
                <h3 class="empty-title">لا توجد اختبارات منشأة حالياً</h3>
                <p class="empty-desc">اضغط على زر "إنشاء اختبار جديد" لتجميع أسئلة من بنك الأسئلة ونشر أول اختبار.</p>
              </div>
            ` : exams.map(exam => {
              const isPub = exam.isPublished !== undefined ? exam.isPublished : (exam.is_published || exam.published);
              return `
                <div class="card card-hover" style="display:flex; flex-direction:column; justify-content:space-between;">
                  <div>
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem;">
                      <span class="badge ${isPub ? 'badge-success' : 'badge-neutral'}">
                        ${isPub ? 'منشور للطلاب' : 'مسودة'}
                      </span>
                      <div style="display:flex; gap:0.35rem;">
                        <button class="btn btn-secondary btn-icon-sm edit-exam-btn" data-id="${exam.id}" title="تعديل الاختبار">
                          ${Icons.edit()}
                        </button>
                        <button class="btn btn-ghost btn-icon-sm toggle-exam-pub-btn" data-id="${exam.id}" data-pub="${isPub ? '1' : '0'}" title="${isPub ? 'إلغاء النشر' : 'نشر للطلاب'}">
                          ${isPub ? Icons.eye() : Icons.eyeOff()}
                        </button>
                        <button class="btn btn-danger btn-icon-sm delete-exam-btn" data-id="${exam.id}" title="حذف">
                          ${Icons.trash()}
                        </button>
                      </div>
                    </div>

                    <h3 style="font-size:1.125rem; font-weight:800; color:var(--text-main); margin-bottom:0.35rem;">${exam.title}</h3>
                    <div style="font-size:0.8125rem; color:var(--cyan); margin-bottom:0.75rem;">${exam.unit_title || 'اختبار شامل على المنهج'}</div>
                    <p style="font-size:0.875rem; color:var(--text-muted); line-height:1.5; margin-bottom:1rem;">${exam.description || 'اختبار تقييمي لقياس استيعاب المفاهيم البرمجية.'}</p>
                  </div>

                  <div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.5rem; background:var(--bg-surface-elevated); padding:0.75rem; border-radius:var(--radius-md); font-size:0.8125rem; margin-bottom:1rem;">
                      <div>⏱️ المدة: <strong>${exam.duration_minutes || exam.duration || 30} دقيقة</strong></div>
                      <div>❓ الأسئلة: <strong>${exam.totalQuestions || exam.total_questions || 10} سؤال</strong></div>
                      <div>🎯 درجة النجاح: <strong>${exam.passing_score || 60}%</strong></div>
                      <div>🔄 المحاولات: <strong>${exam.attempts_allowed || 3}</strong></div>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <div style="font-size:0.75rem; color:var(--text-muted);">
                        المسلّم: <strong>${exam.attemptsCount || 0} طالب</strong>
                      </div>
                      <a href="#admin-results" class="btn btn-outline btn-sm">عرض النتائج</a>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Exam Builder Modal -->
          <div class="modal-overlay" id="exam-builder-modal">
            <div class="modal-card" style="max-width:800px;">
              <div class="modal-header">
                <h3 id="exam-builder-modal-title" style="font-size:1.125rem; font-weight:800; margin:0;">منشئ الاختبارات (Exam Builder)</h3>
                <button class="btn btn-ghost btn-icon-sm close-modal-btn">${Icons.x()}</button>
              </div>
              <div class="modal-body">
                <form id="exam-builder-form">
                  <input type="hidden" id="exam-builder-id">

                  <div style="display:grid; grid-template-columns: 1.2fr 0.8fr; gap:1rem;" class="form-grid">
                    <div class="form-group">
                      <label class="form-label" for="exam-title-input">عنوان الاختبار *</label>
                      <input type="text" id="exam-title-input" class="form-input" placeholder="اختبار الوحدة الأولى — المتغيرات والعمليات" required>
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="exam-unit-input">الوحدة التابع لها</label>
                      <select id="exam-unit-input" class="form-select">
                        <option value="">اختبار شامل (جميع الوحدات)</option>
                        ${units.map(u => `<option value="${u.id}">${u.title}</option>`).join('')}
                      </select>
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="exam-desc-input">وصف الاختبار والتعليمات للطلاب</label>
                    <textarea id="exam-desc-input" class="form-textarea" rows="2" placeholder="أجب عن الأسئلة التالية بعناية، لديك وقت محدد للإجابة..."></textarea>
                  </div>

                  <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:0.75rem;" class="form-grid">
                    <div class="form-group">
                      <label class="form-label" for="exam-duration-input">المدة (بالدقائق)</label>
                      <input type="number" id="exam-duration-input" class="form-input" value="30" min="5" max="180" required>
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="exam-passing-input">درجة النجاح (%)</label>
                      <input type="number" id="exam-passing-input" class="form-input" value="60" min="1" max="100" required>
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="exam-attempts-input">عدد المحاولات</label>
                      <input type="number" id="exam-attempts-input" class="form-input" value="3" min="1" max="10" required>
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="exam-random-toggle">ترتيب عشوائي</label>
                      <select id="exam-random-toggle" class="form-select">
                        <option value="1">نعم (عشوائي)</option>
                        <option value="0" selected>ترتيب ثابت</option>
                      </select>
                    </div>
                  </div>

                  <!-- Select Questions from Bank -->
                  <div style="background:var(--bg-surface-elevated); padding:1rem; border-radius:var(--radius-md); margin-top:1rem; border:1px solid var(--border-subtle);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                      <div style="font-weight:700; font-size:0.9375rem; color:var(--cyan);">اختيار الأسئلة من بنك الأسئلة:</div>
                      <div id="selected-questions-counter" class="badge badge-primary">0 أسئلة محددة</div>
                    </div>
                    <div style="max-height:220px; overflow-y:auto; display:flex; flex-direction:column; gap:0.5rem;" id="exam-questions-selector-list">
                      ${allQuestions.length === 0 ? '<div style="color:var(--text-muted); font-size:0.8125rem;">لا توجد أسئلة متاحة في البنك. أضف أسئلة أولاً من تبويب بنك الأسئلة.</div>' : allQuestions.map(q => `
                        <label style="display:flex; align-items:flex-start; gap:0.75rem; padding:0.6rem 0.75rem; background:var(--bg-surface); border-radius:var(--radius-sm); cursor:pointer; font-size:0.8125rem; border:1px solid var(--border-subtle);">
                          <input type="checkbox" class="exam-q-checkbox" value="${q.id}" style="margin-top:0.25rem;">
                          <div style="flex:1;">
                            <div style="font-weight:700; color:var(--text-main);">${q.question || q.question_text}</div>
                            <div style="color:var(--text-muted); font-size:0.75rem;">${q.unit_title || 'عام'} • ${q.difficulty} • ${q.score || 10} درجات</div>
                          </div>
                        </label>
                      `).join('')}
                    </div>
                  </div>

                  <div class="form-group" style="margin-top:1rem;">
                    <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; font-size:0.875rem; color:var(--text-main);">
                      <input type="checkbox" id="exam-modal-pub" checked>
                      نشر الاختبار للطلاب فوراً
                    </label>
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary close-modal-btn">إلغاء</button>
                <button id="save-exam-submit-btn" class="btn btn-primary">حفظ ونشر الاختبار 📝</button>
              </div>
            </div>
          </div>

        </div>
      `;
    },

    initExamsEvents() {
      // Counter update on checkbox change
      const updateCounter = () => {
        const checked = document.querySelectorAll('.exam-q-checkbox:checked').length;
        const el = document.getElementById('selected-questions-counter');
        if (el) el.textContent = `${checked} أسئلة محددة`;
      };
      document.querySelectorAll('.exam-q-checkbox').forEach(cb => cb.addEventListener('change', updateCounter));

      // Open Create Exam
      document.getElementById('create-exam-btn')?.addEventListener('click', () => {
        document.getElementById('exam-builder-modal-title').textContent = 'إنشاء اختبار جديد';
        document.getElementById('exam-builder-id').value = '';
        document.getElementById('exam-builder-form').reset();
        document.querySelectorAll('.exam-q-checkbox').forEach(cb => cb.checked = false);
        document.getElementById('exam-modal-pub').checked = true;
        updateCounter();
        UI.openModal('exam-builder-modal');
      });

      // Save Exam
      document.getElementById('save-exam-submit-btn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const id = document.getElementById('exam-builder-id').value;
        const title = document.getElementById('exam-title-input').value.trim();
        const unitId = document.getElementById('exam-unit-input').value || null;
        const desc = document.getElementById('exam-desc-input').value.trim();
        const duration = parseInt(document.getElementById('exam-duration-input').value, 10) || 30;
        const passingScore = parseInt(document.getElementById('exam-passing-input').value, 10) || 60;
        const attempts = parseInt(document.getElementById('exam-attempts-input').value, 10) || 3;
        const randomize = document.getElementById('exam-random-toggle').value === '1';
        const isPub = document.getElementById('exam-modal-pub').checked;

        const selectedQIds = Array.from(document.querySelectorAll('.exam-q-checkbox:checked')).map(cb => cb.value);

        if (!title) {
          UI.showToast('يرجى إدخال عنوان الاختبار', 'error');
          return;
        }

        const payload = {
          unit_id: unitId,
          title,
          description: desc,
          duration_minutes: duration,
          passing_score: passingScore,
          attempts_allowed: attempts,
          randomize_questions: randomize,
          question_ids: selectedQIds,
          total_questions: selectedQIds.length || 10,
          published: isPub,
          is_published: isPub
        };

        try {
          if (!id) {
            const res = await window.AdminService.createExam(payload);
            UI.closeModal('exam-builder-modal');
            UI.showToast(res.message || 'تم إنشاء الاختبار بنجاح 📝', 'success');
          } else {
            const res = await window.AdminService.updateExam(id, payload);
            UI.closeModal('exam-builder-modal');
            UI.showToast(res.message || 'تم تحديث الاختبار بنجاح', 'success');
          }
          window.location.reload();
        } catch (err) {
          UI.showToast(err.message || 'حدث خطأ أثناء حفظ الاختبار', 'error');
        }
      });

      // Edit Exam
      document.querySelectorAll('.edit-exam-btn').forEach(b => {
        b.addEventListener('click', async (e) => {
          const eId = e.currentTarget.getAttribute('data-id');
          try {
            const data = await window.AdminService.getExam(eId);
            const exam = data.exam || data;
            document.getElementById('exam-builder-modal-title').textContent = 'تعديل الاختبار';
            document.getElementById('exam-builder-id').value = exam.id;
            document.getElementById('exam-title-input').value = exam.title;
            document.getElementById('exam-unit-input').value = exam.unit_id || exam.unitId || '';
            document.getElementById('exam-desc-input').value = exam.description || '';
            document.getElementById('exam-duration-input').value = exam.duration_minutes || exam.duration || 30;
            document.getElementById('exam-passing-input').value = exam.passing_score || 60;
            document.getElementById('exam-attempts-input').value = exam.attempts_allowed || 3;
            document.getElementById('exam-random-toggle').value = (exam.randomize_questions || exam.randomizeQuestions) ? '1' : '0';
            document.getElementById('exam-modal-pub').checked = !!(exam.isPublished !== undefined ? exam.isPublished : exam.is_published);

            const qIds = exam.questionIds || (data.questions ? data.questions.map(q => q.id) : []);
            document.querySelectorAll('.exam-q-checkbox').forEach(cb => {
              cb.checked = qIds.includes(cb.value);
            });
            updateCounter();
            UI.openModal('exam-builder-modal');
          } catch (err) {
            UI.showToast('تعذر تحميل بيانات الاختبار للتعديل', 'error');
          }
        });
      });

      // Toggle Exam Publish
      document.querySelectorAll('.toggle-exam-pub-btn').forEach(b => {
        b.addEventListener('click', async (e) => {
          const eId = e.currentTarget.getAttribute('data-id');
          const currentPub = e.currentTarget.getAttribute('data-pub') === '1';
          try {
            const res = await window.AdminService.toggleExamPublish(eId, !currentPub);
            UI.showToast(res.message || 'تم تحديث حالة نشر الاختبار', 'info');
            window.location.reload();
          } catch (err) {
            UI.showToast(err.message || 'فشل تحديث حالة نشر الاختبار', 'error');
          }
        });
      });

      // Delete Exam
      document.querySelectorAll('.delete-exam-btn').forEach(b => {
        b.addEventListener('click', async (e) => {
          const eId = e.currentTarget.getAttribute('data-id');
          if (confirm('هل أنت متأكد من حذف هذا الاختبار؟')) {
            try {
              const res = await window.AdminService.deleteExam(eId);
              UI.showToast(res.message || 'تم حذف الاختبار بنجاح', 'info');
              window.location.reload();
            } catch (err) {
              UI.showToast(err.message || 'فشل حذف الاختبار', 'error');
            }
          }
        });
      });

      document.querySelectorAll('.close-modal-btn').forEach(b => {
        b.addEventListener('click', () => UI.closeModal('exam-builder-modal'));
      });
    },

    // ==========================================
    // 6. RESULTS & SUBMISSIONS
    // ==========================================
    async renderResults() {
      let results = [];
      let exams = [];
      try {
        [results, exams] = await Promise.all([
          window.AdminService.getResults(),
          window.AdminService.getExams()
        ]);
      } catch (err) {
        console.warn('Error loading results:', err);
      }

      return `
        <div class="content-body">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; flex-wrap:wrap; gap:1rem;">
            <div>
              <div class="badge badge-success" style="margin-bottom:0.35rem;">📊 نتائج وتقييمات الطلاب</div>
              <h1 style="font-size:1.875rem; font-weight:800; margin:0;">سجل نتائج الاختبارات المدرسية</h1>
              <p style="color:var(--text-muted); font-size:0.9375rem;">استعراض تسليمات الطلاب، مراجعة الإجابات، والدرجات المرصودة من السيرفر.</p>
            </div>
          </div>

          <!-- Filters -->
          <div class="card" style="margin-bottom:1.5rem; padding:1rem 1.25rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem;">
            <div style="display:flex; align-items:center; gap:0.75rem; flex:1; min-width:250px;">
              <span style="color:var(--text-muted);">${Icons.search()}</span>
              <input type="text" id="search-result-input" class="form-input" placeholder="ابحث باسم الطالب أو الاختبار أو رقم الهاتف..." style="border:none; background:transparent;">
            </div>

            <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
              <select id="filter-result-exam" class="form-select" style="width:auto;">
                <option value="">جميع الاختبارات</option>
                ${exams.map(e => `<option value="${e.id}">${e.title}</option>`).join('')}
              </select>

              <select id="filter-result-grade" class="form-select" style="width:auto;">
                <option value="">جميع الصفوف</option>
                <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
              </select>

              <select id="filter-result-status" class="form-select" style="width:auto;">
                <option value="">جميع النتائج</option>
                <option value="passed">ناجح (Passed)</option>
                <option value="failed">راسب (Failed)</option>
              </select>
            </div>
          </div>

          <!-- Results Table -->
          <div class="table-container card" style="padding:0; overflow:hidden;">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>الصف الدراسي</th>
                  <th>اسم الاختبار</th>
                  <th>الدرجة المرصودة</th>
                  <th>الإجابات الصحيحة</th>
                  <th>وقت الحل</th>
                  <th>تاريخ التسليم</th>
                  <th>النتيجة</th>
                </tr>
              </thead>
              <tbody id="results-table-body">
                ${this.renderResultsTableRows(results)}
              </tbody>
            </table>
          </div>
        </div>
      `;
    },

    renderResultsTableRows(results) {
      if (!results || results.length === 0) {
        return `
          <tr>
            <td colspan="8" style="text-align:center; padding:3rem 1rem; color:var(--text-muted);">
              <div style="font-size:2rem; margin-bottom:0.5rem;">📊</div>
              <strong>لا توجد نتائج اختبارات مطابقة</strong>
              <div style="font-size:0.8125rem; margin-top:0.25rem;">عندما يقوم الطلاب بحل وتسليم الاختبارات، ستظهر نتائجهم تلقائياً هنا.</div>
            </td>
          </tr>
        `;
      }

      return results.map(r => {
        const isPassed = !!r.passed;
        const mins = Math.floor((r.time_spent_seconds || 0) / 60);
        const secs = (r.time_spent_seconds || 0) % 60;
        const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        const dateStr = r.completed_at ? r.completed_at.slice(0, 16).replace('T', ' ') : '—';

        return `
          <tr data-search="${(r.student_name || '')} ${(r.exam_title || '')} ${(r.student_phone || '')}">
            <td>
              <div style="display:flex; align-items:center; gap:0.75rem;">
                <div class="user-avatar" style="width:36px; height:36px; font-size:0.875rem;">${r.student_avatar || 'ط'}</div>
                <div>
                  <div style="font-weight:700; color:var(--text-main);">${r.student_name}</div>
                  <div style="font-size:0.75rem; color:var(--text-muted);">${r.student_phone || ''}</div>
                </div>
              </div>
            </td>
            <td><span class="badge badge-neutral">${r.student_grade || 'ثانوي'}</span></td>
            <td><strong>${r.exam_title}</strong></td>
            <td>
              <span class="badge ${isPassed ? 'badge-success' : 'badge-danger'}" style="font-family:var(--font-sans); font-size:0.9375rem; font-weight:800;">
                ${r.percentage}%
              </span>
              <span style="font-size:0.75rem; color:var(--text-muted); margin-right:0.25rem;">(${r.score}/${r.total_score || 100})</span>
            </td>
            <td class="number-font">${r.correct_count} / ${r.total_count}</td>
            <td class="number-font">${timeStr}</td>
            <td style="font-size:0.8125rem; color:var(--text-muted);">${dateStr}</td>
            <td>
              <span class="badge ${isPassed ? 'badge-success' : 'badge-danger'}">
                ${isPassed ? '✓ ناجح' : '✗ راسب'}
              </span>
            </td>
          </tr>
        `;
      }).join('');
    },

    initResultsEvents() {
      const searchInput = document.getElementById('search-result-input');
      const examSelect = document.getElementById('filter-result-exam');
      const gradeSelect = document.getElementById('filter-result-grade');
      const statusSelect = document.getElementById('filter-result-status');

      let debounceTimer = null;
      const applyFilter = async () => {
        const q = searchInput?.value.trim();
        const e = examSelect?.value;
        const g = gradeSelect?.value;
        const s = statusSelect?.value;

        try {
          const filtered = await window.AdminService.getResults({
            search: q || undefined,
            exam_id: e || undefined,
            grade: g || undefined,
            passed_filter: s || undefined
          });
          document.getElementById('results-table-body').innerHTML = window.AdminViews.renderResultsTableRows(filtered);
        } catch (err) {
          console.error('Failed to filter results:', err);
        }
      };

      searchInput?.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(applyFilter, 300);
      });
      examSelect?.addEventListener('change', applyFilter);
      gradeSelect?.addEventListener('change', applyFilter);
      statusSelect?.addEventListener('change', applyFilter);
    },

    // ==========================================
    // 7. ANNOUNCEMENTS MANAGEMENT
    // ==========================================
    async renderAnnouncements() {
      let announcements = [];
      try {
        announcements = await window.AdminService.getAnnouncements();
      } catch (err) {
        console.warn('Error loading announcements:', err);
      }

      return `
        <div class="content-body">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; flex-wrap:wrap; gap:1rem;">
            <div>
              <div class="badge badge-cyan" style="margin-bottom:0.35rem;">📢 بث التنبيهات</div>
              <h1 style="font-size:1.875rem; font-weight:800; margin:0;">إدارة إعلانات وتنبيهات الطلاب</h1>
              <p style="color:var(--text-muted); font-size:0.9375rem;">نشر إعلانات المراجعات النهائية، مواعيد الاختبارات، وتنبيهات الفصول الدراسية.</p>
            </div>

            <button id="add-ann-btn" class="btn btn-primary">
              ${Icons.plus()} نشر إعلان جديد
            </button>
          </div>

          <div style="display:flex; flex-direction:column; gap:1.25rem;" id="announcements-list-container">
            ${announcements.length === 0 ? `
              <div class="empty-state card">
                <div class="empty-icon">📢</div>
                <h3 class="empty-title">لا توجد إعلانات منشورة</h3>
                <p class="empty-desc">اضغط على زر "نشر إعلان جديد" لبث أول تنبيه لطلاب المرحلة الثانوية.</p>
              </div>
            ` : announcements.map(a => {
              const isPub = a.isPublished !== undefined ? a.isPublished : (a.is_published || a.published);
              return `
                <div class="card">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem;">
                    <div>
                      <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.35rem;">
                        <span class="badge ${a.badge === 'هام' ? 'badge-danger' : 'badge-primary'}">${a.badge || 'جديد'}</span>
                        <span class="badge ${isPub ? 'badge-success' : 'badge-neutral'}">${isPub ? 'منشور' : 'مسودة'}</span>
                        <span style="font-size:0.75rem; color:var(--text-muted);">${(a.date_str || a.created_at || '').slice(0, 10)}</span>
                      </div>
                      <h3 style="font-size:1.125rem; font-weight:800; color:var(--text-main); margin:0;">${a.title}</h3>
                    </div>
                    <div style="display:flex; gap:0.35rem;">
                      <button class="btn btn-ghost btn-icon-sm toggle-ann-pub-btn" data-id="${a.id}" data-pub="${isPub ? '1' : '0'}" title="${isPub ? 'إلغاء النشر' : 'نشر'}">
                        ${isPub ? Icons.eye() : Icons.eyeOff()}
                      </button>
                      <button class="btn btn-danger btn-icon-sm delete-ann-btn" data-id="${a.id}" title="حذف">
                        ${Icons.trash()}
                      </button>
                    </div>
                  </div>
                  <p style="color:var(--text-muted); font-size:0.9375rem; line-height:1.6; margin:0;">${a.content}</p>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Add Ann Modal -->
          <div class="modal-overlay" id="ann-modal">
            <div class="modal-card">
              <div class="modal-header">
                <h3 style="font-size:1.125rem; font-weight:800; margin:0;">نشر إعلان جديد للطلاب</h3>
                <button class="btn btn-ghost btn-icon-sm close-modal-btn">${Icons.x()}</button>
              </div>
              <div class="modal-body">
                <form id="ann-form">
                  <div class="form-group">
                    <label class="form-label" for="ann-title">عنوان الإعلان *</label>
                    <input type="text" id="ann-title" class="form-input" placeholder="تنبيه هام: موعد المراجعة الشاملة لمادة البرمجة" required>
                  </div>
                  <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;" class="form-grid">
                    <div class="form-group">
                      <label class="form-label" for="ann-badge">نوع الشارة (Badge)</label>
                      <select id="ann-badge" class="form-select">
                        <option value="جديد">جديد</option>
                        <option value="تنبيه هام">تنبيه هام</option>
                        <option value="مراجعة">مراجعة</option>
                        <option value="امتحان">امتحان</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="ann-grade">الصف المستهدف</label>
                      <select id="ann-grade" class="form-select">
                        <option value="الكل">جميع الطلاب</option>
                        <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                        <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                        <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                      </select>
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="ann-content">نص الإعلان *</label>
                    <textarea id="ann-content" class="form-textarea" rows="4" placeholder="اكتب تفاصيل الإعلان والتوجيهات للطلاب..." required></textarea>
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary close-modal-btn">إلغاء</button>
                <button id="save-ann-btn" class="btn btn-primary">نشر الإعلان الآن 📢</button>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    initAnnouncementsEvents() {
      document.getElementById('add-ann-btn')?.addEventListener('click', () => {
        document.getElementById('ann-form').reset();
        UI.openModal('ann-modal');
      });

      document.getElementById('save-ann-btn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const title = document.getElementById('ann-title').value.trim();
        const badge = document.getElementById('ann-badge').value;
        const content = document.getElementById('ann-content').value.trim();

        if (!title || !content) {
          UI.showToast('يرجى ملء جميع بيانات الإعلان', 'error');
          return;
        }

        try {
          const res = await window.AdminService.createAnnouncement({
            title,
            badge,
            content,
            published: true,
            is_published: true
          });
          UI.closeModal('ann-modal');
          UI.showToast(res.message || 'تم نشر الإعلان بنجاح 📢', 'success');
          window.location.reload();
        } catch (err) {
          UI.showToast(err.message || 'فشل نشر الإعلان', 'error');
        }
      });

      // Toggle Publish
      document.querySelectorAll('.toggle-ann-pub-btn').forEach(b => {
        b.addEventListener('click', async (e) => {
          const aId = e.currentTarget.getAttribute('data-id');
          const currentPub = e.currentTarget.getAttribute('data-pub') === '1';
          try {
            const res = await window.AdminService.toggleAnnouncementPublish(aId, !currentPub);
            UI.showToast(res.message || 'تم تحديث حالة الإعلان', 'info');
            window.location.reload();
          } catch (err) {
            UI.showToast(err.message || 'فشل تحديث حالة الإعلان', 'error');
          }
        });
      });

      // Delete
      document.querySelectorAll('.delete-ann-btn').forEach(b => {
        b.addEventListener('click', async (e) => {
          const aId = e.currentTarget.getAttribute('data-id');
          if (confirm('هل أنت متأكد من حذف هذا الإعلان؟')) {
            try {
              const res = await window.AdminService.deleteAnnouncement(aId);
              UI.showToast(res.message || 'تم حذف الإعلان بنجاح', 'info');
              window.location.reload();
            } catch (err) {
              UI.showToast(err.message || 'فشل حذف الإعلان', 'error');
            }
          }
        });
      });

      document.querySelectorAll('.close-modal-btn').forEach(b => {
        b.addEventListener('click', () => UI.closeModal('ann-modal'));
      });
    },

    // ==========================================
    // 8. ACADEMIC SUPPORT HELPDESK
    // ==========================================
    async renderSupport() {
      let tickets = [];
      try {
        tickets = await window.AdminService.getSupportTickets();
      } catch (err) {
        console.warn('Error loading support tickets:', err);
      }

      return `
        <div class="content-body">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; flex-wrap:wrap; gap:1rem;">
            <div>
              <div class="badge badge-purple" style="margin-bottom:0.35rem;">💬 الدعم الأكاديمي</div>
              <h1 style="font-size:1.875rem; font-weight:800; margin:0;">استفسارات وأسئلة الطلاب</h1>
              <p style="color:var(--text-muted); font-size:0.9375rem;">الرد على أسئلة واستفسارات طلاب المرحلة الثانوية حول مفاهيم مادة البرمجة.</p>
            </div>
          </div>

          <!-- Tickets List -->
          <div style="display:flex; flex-direction:column; gap:1.25rem;" id="support-tickets-container">
            ${tickets.length === 0 ? `
              <div class="empty-state card">
                <div class="empty-icon">💬</div>
                <h3 class="empty-title">لا توجد استفسارات حالياً</h3>
                <p class="empty-desc">عندما يرسل الطلاب أسئلة أكاديمية من واجهتهم، ستظهر هنا للإجابة عليها.</p>
              </div>
            ` : tickets.map(t => {
              const isAnswered = t.status === 'answered';
              return `
                <div class="card" style="border-left:4px solid ${isAnswered ? 'var(--success)' : 'var(--warning)'};">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
                    <div>
                      <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
                        <span class="badge ${isAnswered ? 'badge-success' : 'badge-warning'}">
                          ${isAnswered ? 'تم الرد' : 'بانتظار الرد'}
                        </span>
                        <span style="font-size:0.8125rem; color:var(--text-muted);">
                          الطالب: <strong>${t.student_name || t.studentName || 'طالب'}</strong> (${t.student_phone || ''})
                        </span>
                      </div>
                      <h3 style="font-size:1.125rem; font-weight:800; color:var(--text-main); margin:0;">${t.subject}</h3>
                    </div>
                    <button class="btn btn-primary btn-sm reply-ticket-btn" data-id="${t.id}" data-subject="${t.subject}" data-msg="${t.message}" data-student="${t.student_name || t.studentName || 'طالب'}">
                      ${Icons.edit()} الرد على الطالب
                    </button>
                  </div>

                  <div style="background:var(--bg-surface-elevated); padding:0.875rem 1rem; border-radius:var(--radius-md); font-size:0.9375rem; color:var(--text-main); margin-bottom:0.75rem; line-height:1.6;">
                    ${t.message}
                  </div>

                  ${t.reply ? `
                    <div style="background:rgba(37, 99, 235, 0.08); border:1px solid rgba(37, 99, 235, 0.2); padding:0.875rem 1rem; border-radius:var(--radius-md); font-size:0.875rem;">
                      <div style="font-weight:700; color:var(--cyan); margin-bottom:0.25rem;">رد المعلم / المشرف:</div>
                      <div style="color:var(--text-main); line-height:1.5;">${t.reply}</div>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>

          <!-- Reply Modal -->
          <div class="modal-overlay" id="reply-ticket-modal">
            <div class="modal-card" style="max-width:650px;">
              <div class="modal-header">
                <h3 style="font-size:1.125rem; font-weight:800; margin:0;">الرد على استفسار الطالب</h3>
                <button class="btn btn-ghost btn-icon-sm close-modal-btn">${Icons.x()}</button>
              </div>
              <div class="modal-body">
                <form id="reply-ticket-form">
                  <input type="hidden" id="reply-ticket-id">
                  
                  <div style="margin-bottom:1rem; padding:0.75rem; background:var(--bg-surface-elevated); border-radius:var(--radius-sm); font-size:0.875rem;">
                    <div style="color:var(--text-muted);" id="reply-modal-student-name">الطالب: </div>
                    <div style="font-weight:700; color:var(--text-main); margin-top:0.25rem;" id="reply-modal-subject">الموضوع: </div>
                    <p style="color:var(--text-muted); margin:0.5rem 0 0 0; font-size:0.8125rem;" id="reply-modal-msg"></p>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="reply-text-input">نص الإجابة والتوضيح النموذجي *</label>
                    <textarea id="reply-text-input" class="form-textarea" rows="5" placeholder="اكتب الشرح والتوضيح للطالب هنا..." required></textarea>
                  </div>
                </form>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary close-modal-btn">إلغاء</button>
                <button id="send-reply-btn" class="btn btn-primary">إرسال الرد للطالب ⚡</button>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    initSupportEvents() {
      document.querySelectorAll('.reply-ticket-btn').forEach(b => {
        b.addEventListener('click', (e) => {
          const tId = e.currentTarget.getAttribute('data-id');
          const subj = e.currentTarget.getAttribute('data-subject');
          const msg = e.currentTarget.getAttribute('data-msg');
          const st = e.currentTarget.getAttribute('data-student');

          document.getElementById('reply-ticket-id').value = tId;
          document.getElementById('reply-modal-student-name').textContent = `الطالب: ${st}`;
          document.getElementById('reply-modal-subject').textContent = `الموضوع: ${subj}`;
          document.getElementById('reply-modal-msg').textContent = msg;
          document.getElementById('reply-text-input').value = '';
          UI.openModal('reply-ticket-modal');
        });
      });

      document.getElementById('send-reply-btn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const tId = document.getElementById('reply-ticket-id').value;
        const reply = document.getElementById('reply-text-input').value.trim();

        if (!reply) {
          UI.showToast('يرجى كتابة نص الرد', 'error');
          return;
        }

        try {
          const res = await window.AdminService.replyToTicket(tId, reply);
          UI.closeModal('reply-ticket-modal');
          UI.showToast(res.message || 'تم إرسال الرد للطالب بنجاح', 'success');
          window.location.reload();
        } catch (err) {
          UI.showToast(err.message || 'فشل إرسال الرد', 'error');
        }
      });

      document.querySelectorAll('.close-modal-btn').forEach(b => {
        b.addEventListener('click', () => UI.closeModal('reply-ticket-modal'));
      });
    },

    // ==========================================
    // 9. PLATFORM & SUPER ADMIN SETTINGS
    // ==========================================
    async renderSettings(admin) {
      let settings = {};
      try {
        settings = await window.AdminService.getSettings();
      } catch (err) {
        console.warn('Error loading platform settings:', err);
      }

      const isSuperAdmin = window.CodeSparkAuth && window.CodeSparkAuth.isSuperAdmin();

      return `
        <div class="content-body" style="max-width:900px;">
          <div style="margin-bottom:2rem;">
            <div class="badge badge-primary" style="margin-bottom:0.35rem;">⚙️ الإعدادات المركزية</div>
            <h1 style="font-size:1.875rem; font-weight:800; margin:0;">إعدادات المنصة وأمان الحساب</h1>
            <p style="color:var(--text-muted); font-size:0.9375rem;">تخصيص المعايير العامة للمنصة، العام الدراسي، وتحديث بيانات المشرف العام.</p>
          </div>

          <!-- 1. Super Admin Credentials Management (Secure Self-Update) -->
          ${isSuperAdmin ? `
          <div class="card" style="margin-bottom:2rem; border-color:var(--border-glow);">
            <div class="card-header" style="border-bottom:1px solid var(--border-subtle); padding-bottom:1rem;">
              <div class="card-title" style="font-size:1.15rem; font-weight:800; color:var(--cyan); display:flex; align-items:center; gap:0.5rem;">
                ${Icons.shield()} إدارة بيانات حساب المشرف العام (Super Admin)
              </div>
              <p style="font-size:0.8125rem; color:var(--text-muted); margin-top:0.25rem;">
                يمكنك تغيير بريدك الإلكتروني وكلمة المرور بأمان مع التحقق الفوري المشفر.
              </p>
            </div>

            <div style="padding:1.5rem 0 0;">
              <!-- Change Email Form -->
              <div style="background:rgba(15,23,42,0.6); padding:1.5rem; border-radius:var(--radius-lg); border:1px solid var(--border-card); margin-bottom:1.5rem;">
                <h4 style="font-size:1rem; font-weight:800; color:var(--text-main); margin-bottom:1rem;">
                  📧 تغيير البريد الإلكتروني للمشرف
                </h4>
                <form id="super-admin-email-form">
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;" class="form-grid">
                    <div class="form-group">
                      <label class="form-label" for="sa-current-email">البريد الإلكتروني الحالي</label>
                      <input type="email" id="sa-current-email" class="form-input" value="${admin.email || ''}" placeholder="admin@example.com" required>
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="sa-new-email">البريد الإلكتروني الجديد</label>
                      <input type="email" id="sa-new-email" class="form-input" placeholder="new-admin@example.com" required>
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="sa-confirm-new-email">تأكيد البريد الإلكتروني الجديد</label>
                      <input type="email" id="sa-confirm-new-email" class="form-input" placeholder="تأكيد البريد الجديد" required>
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="sa-email-password">كلمة المرور الحالية للتأكيد</label>
                      <input type="password" id="sa-email-password" class="form-input" placeholder="••••••••" required>
                    </div>
                  </div>
                  <button type="submit" id="sa-save-email-btn" class="btn btn-secondary" style="margin-top:0.75rem;">
                    حفظ وتحديث البريد ✉️
                  </button>
                </form>
              </div>

              <!-- Change Password Form -->
              <div style="background:rgba(15,23,42,0.6); padding:1.5rem; border-radius:var(--radius-lg); border:1px solid var(--border-card);">
                <h4 style="font-size:1rem; font-weight:800; color:var(--text-main); margin-bottom:1rem;">
                  🔒 تغيير كلمة مرور المشرف العام
                </h4>
                <form id="super-admin-password-form">
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;" class="form-grid">
                    <div class="form-group" style="grid-column:span 2;">
                      <label class="form-label" for="sa-current-password">كلمة المرور الحالية</label>
                      <input type="password" id="sa-current-password" class="form-input" placeholder="••••••••" required>
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="sa-new-password">كلمة المرور الجديدة (6 أحرف على الأقل)</label>
                      <input type="password" id="sa-new-password" class="form-input" placeholder="••••••••" required minlength="6">
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="sa-confirm-new-password">تأكيد كلمة المرور الجديدة</label>
                      <input type="password" id="sa-confirm-new-password" class="form-input" placeholder="••••••••" required minlength="6">
                    </div>
                  </div>
                  <button type="submit" id="sa-save-password-btn" class="btn btn-primary btn-glow" style="margin-top:0.75rem;">
                    تغيير وتحديث كلمة المرور 🔐
                  </button>
                </form>
              </div>
            </div>
          </div>
          ` : ''}

          <!-- 3. General Academic Configuration -->
          <div class="card" style="margin-bottom:2rem;">
            <div class="card-header">
              <div class="card-title">${Icons.settings()} التكوين الأكاديمي العام</div>
            </div>

            <form id="admin-settings-form">
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;" class="form-grid">
                <div class="form-group">
                  <label class="form-label" for="conf-platform-name">اسم المنصة</label>
                  <input type="text" id="conf-platform-name" class="form-input" value="${settings.platform_name || 'Code Spark'}" required>
                </div>
                <div class="form-group">
                  <label class="form-label" for="conf-academic-year">العام الدراسي</label>
                  <input type="text" id="conf-academic-year" class="form-input" value="${settings.academic_year || '2025/2026'}" required>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="conf-curriculum-subject">عنوان المادة الدراسية</label>
                <input type="text" id="conf-curriculum-subject" class="form-input" value="${settings.curriculum_subject || 'مادة البرمجة — المرحلة الثانوية'}" required>
              </div>

              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;" class="form-grid">
                <div class="form-group">
                  <label class="form-label" for="conf-passing-score">درجة النجاح الافتراضية للاختبارات (%)</label>
                  <input type="number" id="conf-passing-score" class="form-input" value="${settings.default_passing_score || 60}" min="1" max="100">
                </div>
                <div class="form-group">
                  <label class="form-label" for="conf-max-attempts">الحد الأقصى لمحاولات الامتحان</label>
                  <input type="number" id="conf-max-attempts" class="form-input" value="${settings.max_exam_attempts || 3}" min="1" max="10">
                </div>
              </div>

              <button type="submit" id="save-platform-settings-btn" class="btn btn-primary" style="margin-top:0.5rem;">
                حفظ الإعدادات الأكاديمية ⚡
              </button>
            </form>
          </div>

          <!-- Fast Student Preview Link -->
          <div class="card" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
            <div>
              <div style="font-weight:700;">معاينة واجهة الطالب التفاعلية</div>
              <div style="font-size:0.8125rem; color:var(--text-muted);">يمكنك الدخول ومعاينة الدروس ومحرر الأكواد والامتحانات مباشرة كطالب.</div>
            </div>
            <a href="#dashboard" class="btn btn-outline btn-sm">معاينة كطالب ←</a>
          </div>
        </div>
      `;
    },

    initSettingsEvents(admin) {
      // 1. General Settings
      document.getElementById('admin-settings-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pName = document.getElementById('conf-platform-name')?.value.trim();
        const aYear = document.getElementById('conf-academic-year')?.value.trim();
        const cSubj = document.getElementById('conf-curriculum-subject')?.value.trim();
        const pScore = document.getElementById('conf-passing-score')?.value;
        const maxAtt = document.getElementById('conf-max-attempts')?.value;

        try {
          const res = await window.AdminService.updateSettings({
            platform_name: pName,
            academic_year: aYear,
            curriculum_subject: cSubj,
            default_passing_score: pScore,
            max_exam_attempts: maxAtt
          });
          if (window.UI && window.UI.showToast) window.UI.showToast(res.message || 'تم حفظ إعدادات النظام بنجاح', 'success');
        } catch (err) {
          if (window.UI && window.UI.showToast) window.UI.showToast(err.message || 'فشل حفظ الإعدادات', 'error');
        }
      });

      // 2. Super Admin Change Email
      document.getElementById('super-admin-email-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currEmail = document.getElementById('sa-current-email')?.value.trim();
        const newEmail = document.getElementById('sa-new-email')?.value.trim();
        const confirmEmail = document.getElementById('sa-confirm-new-email')?.value.trim();
        const currPass = document.getElementById('sa-email-password')?.value || '';
        const btn = document.getElementById('sa-save-email-btn');

        if (newEmail !== confirmEmail) {
          if (window.UI && window.UI.showToast) window.UI.showToast('البريد الجديد وتأكيد البريد غير متطابقين', 'error');
          return;
        }

        try {
          if (btn) { btn.disabled = true; btn.innerText = 'جاري التحديث... ⏳'; }
          const res = await window.AuthService.superAdminChangeEmail(currEmail, newEmail, confirmEmail, currPass);
          if (btn) { btn.disabled = false; btn.innerText = 'حفظ وتحديث البريد ✉️'; }
          if (res.success) {
            if (window.UI && window.UI.showToast) window.UI.showToast(res.message || 'تم تحديث البريد الإلكتروني بنجاح 🎉', 'success');
            const passField = document.getElementById('sa-email-password');
            if (passField) passField.value = '';
          } else {
            if (window.UI && window.UI.showToast) window.UI.showToast(res.detail || res.message || 'فشل تحديث البريد', 'error');
          }
        } catch (err) {
          if (btn) { btn.disabled = false; btn.innerText = 'حفظ وتحديث البريد ✉️'; }
          if (window.UI && window.UI.showToast) window.UI.showToast(err.message || 'حدث خطأ أثناء تحديث البريد', 'error');
        }
      });

      // 3. Super Admin Change Password
      document.getElementById('super-admin-password-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currPass = document.getElementById('sa-current-password')?.value || '';
        const newPass = document.getElementById('sa-new-password')?.value || '';
        const confirmPass = document.getElementById('sa-confirm-new-password')?.value || '';
        const btn = document.getElementById('sa-save-password-btn');

        if (newPass !== confirmPass) {
          if (window.UI && window.UI.showToast) window.UI.showToast('كلمة المرور الجديدة وتأكيدها غير متطابقتين', 'error');
          return;
        }

        try {
          if (btn) { btn.disabled = true; btn.innerText = 'جاري التحديث... ⏳'; }
          const res = await window.AuthService.superAdminChangePassword(currPass, newPass, confirmPass);
          if (btn) { btn.disabled = false; btn.innerText = 'تغيير وتحديث كلمة المرور 🔐'; }
          if (res.success) {
            if (window.UI && window.UI.showToast) window.UI.showToast(res.message || 'تم تغيير كلمة المرور بنجاح 🎉', 'success');
            const p1 = document.getElementById('sa-current-password');
            const p2 = document.getElementById('sa-new-password');
            const p3 = document.getElementById('sa-confirm-new-password');
            if (p1) p1.value = '';
            if (p2) p2.value = '';
            if (p3) p3.value = '';
          } else {
            if (window.UI && window.UI.showToast) window.UI.showToast(res.detail || res.message || 'فشل تغيير كلمة المرور', 'error');
          }
        } catch (err) {
          if (btn) { btn.disabled = false; btn.innerText = 'تغيير وتحديث كلمة المرور 🔐'; }
          if (window.UI && window.UI.showToast) window.UI.showToast(err.message || 'حدث خطأ أثناء تغيير كلمة المرور', 'error');
        }
      });
    },

    // ==========================================
    // 10. Subscriptions Management View
    // ==========================================
    async renderSubscriptions() {
      let data = { summary: { total: 0, available: 0, used: 0, expired: 0, disabled: 0 }, codes: [], pagination: { page: 1, page_size: 20, total_count: 0, total_pages: 1 } };

      try {
        data = await window.AdminService.getSubscriptions({ page: 1, limit: 20 });
      } catch (err) {
        console.warn("Error loading subscriptions:", err);
      }

      const summary = data.summary || { total: 0, available: 0, used: 0, expired: 0, disabled: 0 };
      const codes = data.codes || [];
      const pagination = data.pagination || { page: 1, page_size: 20, total_count: 0, total_pages: 1 };

      return `
        <div class="content-body">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
            <div>
              <div class="badge badge-cyan" style="margin-bottom:0.35rem;">🔑 المركز الموحد للاشتراكات</div>
              <h1 style="font-size:1.875rem; font-weight:800; margin:0;">أكواد تفعيل الاشتراكات</h1>
              <p style="color:var(--text-muted); font-size:0.9375rem;">توليد وتتبع وإدارة أكواد تفعيل اشتراكات الطلاب المعتمدة وتعيين الصلاحيات.</p>
            </div>
            <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
              <button id="generate-single-code-btn" class="btn btn-secondary">
                ${Icons.plus()} توليد كود مفرد
              </button>
              <button id="generate-bulk-codes-btn" class="btn btn-primary">
                ${Icons.sparkles ? Icons.sparkles() : "⚡"} توليد حزمة أكواد
              </button>
            </div>
          </div>

          <!-- Quick Summary Stats Grid -->
          <div class="stats-grid" style="grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); margin-bottom:2rem;">
            <div class="card stat-card">
              <div class="stat-icon" style="background:rgba(6, 182, 212, 0.1); color:var(--cyan);">🔑</div>
              <div class="stat-value" id="sub-stat-total">${summary.total}</div>
              <div class="stat-label">إجمالي الأكواد</div>
            </div>
            <div class="card stat-card">
              <div class="stat-icon" style="background:rgba(16, 185, 129, 0.1); color:var(--success);">🟢</div>
              <div class="stat-value" id="sub-stat-available" style="color:var(--success);">${summary.available}</div>
              <div class="stat-label">أكواد متاحة للتفعيل</div>
            </div>
            <div class="card stat-card">
              <div class="stat-icon" style="background:rgba(59, 130, 246, 0.1); color:#3b82f6;">👥</div>
              <div class="stat-value" id="sub-stat-used" style="color:#3b82f6;">${summary.used}</div>
              <div class="stat-label">أكواد مستخدمة</div>
            </div>
            <div class="card stat-card">
              <div class="stat-icon" style="background:rgba(245, 158, 11, 0.1); color:var(--warning);">⏳</div>
              <div class="stat-value" id="sub-stat-expired" style="color:var(--warning);">${summary.expired}</div>
              <div class="stat-label">أكواد منتهية</div>
            </div>
            <div class="card stat-card">
              <div class="stat-icon" style="background:rgba(239, 68, 68, 0.1); color:var(--danger);">🚫</div>
              <div class="stat-value" id="sub-stat-disabled" style="color:var(--danger);">${summary.disabled}</div>
              <div class="stat-label">أكواد معطلة</div>
            </div>
          </div>

          <!-- Subscription Codes Filter Card -->
          <div class="card" style="margin-bottom:1.5rem; padding:1.25rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
              <div style="display:flex; align-items:center; gap:1rem; flex:1; min-width:280px;">
                <input type="text" id="sub-search-input" class="form-input" placeholder="بحث بالبادئة، الكود المقنع، اسم الطالب، الهاتف..." style="flex:1;">
              </div>
              <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
                <select id="sub-filter-status" class="form-select" style="width:auto;">
                  <option value="all">جميع الحالات</option>
                  <option value="active">متاح للتفعيل 🟢</option>
                  <option value="used">مستخدم ومفعل 👥</option>
                  <option value="expired">منتهي الصلاحية ⏳</option>
                  <option value="disabled">معطل 🚫</option>
                </select>
                <select id="sub-filter-type" class="form-select" style="width:auto;">
                  <option value="all">جميع أنواع الخطط</option>
                  <option value="1_month">شهر واحد (30 يوم)</option>
                  <option value="3_months">3 أشهر (فصل دراسي)</option>
                  <option value="6_months">6 أشهر (نصف عام)</option>
                  <option value="1_year">سنة دراسية كاملة</option>
                  <option value="custom">مخصص</option>
                  <option value="lifetime">مدى الحياة ♾️</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Subscription Codes Table -->
          <div class="table-container card" style="padding:0; overflow:hidden; margin-bottom:1.5rem;">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>كود الاشتراك (المقنع)</th>
                  <th>الحالة</th>
                  <th>النوع والمدة</th>
                  <th>الطالب المستخدم</th>
                  <th>تاريخ التفعيل</th>
                  <th>تاريخ الانتهاء</th>
                  <th>تاريخ الإنشاء</th>
                  <th style="text-align:center;">إجراءات</th>
                </tr>
              </thead>
              <tbody id="subs-table-body">
                ${this.renderSubscriptionsTableRows(codes)}
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          <div id="subs-pagination-container" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
            <div style="font-size:0.875rem; color:var(--text-muted);">
              عرض <span id="subs-page-current">${pagination.page}</span> من <span id="subs-page-total">${pagination.total_pages}</span> صفحات (إجمالي ${pagination.total_count} كود)
            </div>
            <div style="display:flex; gap:0.5rem;">
              <button id="subs-prev-page-btn" class="btn btn-outline btn-sm" ${pagination.page <= 1 ? "disabled" : ""}>
                ${Icons.chevronRight()} السابق
              </button>
              <button id="subs-next-page-btn" class="btn btn-outline btn-sm" ${pagination.page >= pagination.total_pages ? "disabled" : ""}>
                التالي ${Icons.chevronLeft()}
              </button>
            </div>
          </div>

          <!-- Modal 1: Generate Subscription Codes Modal -->
          <div id="generate-sub-modal" class="modal-backdrop" style="display:none;">
            <div class="modal-dialog" style="max-width:550px;">
              <div class="modal-header">
                <h3 class="modal-title" id="generate-modal-title">توليد أكواد اشتراك جديدة</h3>
                <button type="button" class="modal-close" id="close-generate-modal-btn">✕</button>
              </div>
              <form id="generate-sub-form">
                <div class="modal-body" style="display:flex; flex-direction:column; gap:1.25rem;">
                  <div class="form-group">
                    <label class="form-label" for="gen-sub-type">نوع مدة الاشتراك</label>
                    <select id="gen-sub-type" class="form-select" required>
                      <option value="1_month" selected>شهر واحد (30 يومًا)</option>
                      <option value="3_months">3 أشهر (فصل دراسي - 90 يومًا)</option>
                      <option value="6_months">6 أشهر (180 يومًا)</option>
                      <option value="1_year">سنة كاملة (365 يومًا)</option>
                      <option value="custom">مدة مخصصة بالأيام</option>
                      <option value="lifetime">اشتراك مدى الحياة (بدون تاريخ انتهاء)</option>
                    </select>
                  </div>

                  <div class="form-group" id="gen-custom-days-group" style="display:none;">
                    <label class="form-label" for="gen-custom-days">عدد الأيام المخصصة</label>
                    <input type="number" id="gen-custom-days" class="form-input" min="1" max="1000" placeholder="مثال: 45">
                  </div>

                  <div class="form-group" id="gen-count-group" style="display:none;">
                    <label class="form-label" for="gen-code-count">عدد الأكواد المطلوب توليدها دفعة واحدة</label>
                    <input type="number" id="gen-code-count" class="form-input" min="1" max="100" value="10">
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">الحد الأقصى للتوليد دفعة واحدة هو 100 كود.</div>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="gen-max-uses">الحد الأقصى لاستخدام الكود (عدد الطلاب)</label>
                    <input type="number" id="gen-max-uses" class="form-input" min="1" max="100" value="1" required>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">الافتراضي هو 1 (كود مخصص لطالب واحد فقط).</div>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="gen-sub-notes">ملاحظات داخلية / المجموعة المستهدفة (اختياري)</label>
                    <textarea id="gen-sub-notes" class="form-input" rows="2" placeholder="مثال: أكواد خاصة بمجموعة سنتر الأمل أو متفوقي الشهر"></textarea>
                  </div>
                </div>
                <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:0.75rem;">
                  <button type="button" class="btn btn-secondary" id="cancel-generate-modal-btn">إلغاء</button>
                  <button type="submit" class="btn btn-primary" id="submit-generate-btn">
                    ${Icons.sparkles ? Icons.sparkles() : "⚡"} توليد الأكواد الآن
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Modal 2: Display Generated Plain Codes Modal -->
          <div id="display-generated-modal" class="modal-backdrop" style="display:none;">
            <div class="modal-dialog" style="max-width:650px;">
              <div class="modal-header">
                <h3 class="modal-title">🎉 تم توليد الأكواد بنجاح</h3>
                <button type="button" class="modal-close" id="close-display-modal-btn">✕</button>
              </div>
              <div class="modal-body" style="display:flex; flex-direction:column; gap:1.25rem;">
                <div style="background:rgba(245, 158, 11, 0.1); border:1px solid var(--border-warning); color:var(--warning); padding:0.875rem; border-radius:var(--radius-md); font-size:0.875rem; line-height:1.6;">
                  ⚠️ <strong>تنبيه هام وأمني:</strong> هذه هي المرة الوحيدة التي ستظهر فيها الأكواد الصريحة كاملة. تم تشفير الأكواد في قاعدة البيانات ولن يمكن استرجاعها مجددًا. يرجى نسخها وحفظها الآن.
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-weight:700;" id="generated-codes-count-label">الأكواد الصالحة:</span>
                  <button type="button" id="copy-all-codes-btn" class="btn btn-secondary btn-sm">
                    📋 نسخ جميع الأكواد
                  </button>
                </div>
                <div id="generated-codes-list" style="max-height:280px; overflow-y:auto; display:flex; flex-direction:column; gap:0.5rem; background:var(--bg-base); padding:0.75rem; border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-primary" id="done-display-modal-btn" style="width:100%;">
                  تم الحفظ والنسخ بنجاح
                </button>
              </div>
            </div>
          </div>

          <!-- Modal 3: View Subscription Code Detail Modal -->
          <div id="view-code-modal" class="modal-backdrop" style="display:none;">
            <div class="modal-dialog" style="max-width:550px;">
              <div class="modal-header">
                <h3 class="modal-title">تفاصيل كود الاشتراك</h3>
                <button type="button" class="modal-close" id="close-view-modal-btn">✕</button>
              </div>
              <div class="modal-body" id="view-code-modal-content" style="display:flex; flex-direction:column; gap:1rem;">
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" id="done-view-modal-btn">إغلاق</button>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    renderSubscriptionsTableRows(codes) {
      if (!codes || codes.length === 0) {
        return `
          <tr>
            <td colspan="8" style="text-align:center; padding:3rem 1rem; color:var(--text-muted);">
              <div style="font-size:2rem; margin-bottom:0.5rem;">🔑</div>
              <div>لا توجد أكواد اشتراك مطابقة لمعايير البحث</div>
            </td>
          </tr>
        `;
      }

      return codes.map(c => {
        let statusBadge = '<span class="badge badge-cyan">متاح للتفعيل</span>';
        if (c.status === 'used') {
          statusBadge = '<span class="badge badge-success">مستخدم ومفعل</span>';
        } else if (c.status === 'expired') {
          statusBadge = '<span class="badge badge-warning">منتهي الصلاحية</span>';
        } else if (c.status === 'disabled') {
          statusBadge = '<span class="badge badge-danger">معطل</span>';
        }

        let durText = c.type_label || (c.duration_days === -1 ? 'مدى الحياة' : `${c.duration_days} يوم`);
        if (c.duration_days === -1) durText = 'مدى الحياة ♾️';

        const usedByText = c.assigned_user_name ? `
          <div style="font-weight:700; color:var(--text-main); font-size:0.875rem;">${c.assigned_user_name}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${c.assigned_user_phone || ''}</div>
        ` : '<span style="color:var(--text-subtle);">-</span>';

        const actDate = c.activated_at ? new Date(c.activated_at).toLocaleDateString('ar-EG', { year:'numeric', month:'short', day:'numeric' }) : '-';
        const expDate = c.duration_days === -1 ? 'مدى الحياة' : (c.expires_at ? new Date(c.expires_at).toLocaleDateString('ar-EG', { year:'numeric', month:'short', day:'numeric' }) : '-');
        const createdDate = c.created_at ? new Date(c.created_at).toLocaleDateString('ar-EG', { year:'numeric', month:'short', day:'numeric' }) : '-';

        const isUsed = (c.uses_count > 0) || (c.status === 'used') || !!c.assigned_user_id;
        const isDisabled = c.status === 'disabled' || !!c.disabled_at;

        return `
          <tr id="sub-row-${c.id}">
            <td>
              <code style="background:var(--bg-base); border:1px solid var(--border-subtle); padding:0.25rem 0.6rem; border-radius:var(--radius-sm); font-size:0.875rem; font-weight:700; color:var(--cyan); letter-spacing:0.05em;">
                ${c.masked_code || c.code_prefix}
              </code>
            </td>
            <td>${statusBadge}</td>
            <td><span class="badge badge-neutral">${durText}</span></td>
            <td>${usedByText}</td>
            <td style="font-size:0.8125rem; color:var(--text-muted);">${actDate}</td>
            <td style="font-size:0.8125rem; color:var(--text-muted);">${expDate}</td>
            <td style="font-size:0.8125rem; color:var(--text-muted);">${createdDate}</td>
            <td style="text-align:center;">
              <div style="display:flex; justify-content:center; gap:0.4rem;">
                <button class="btn btn-ghost btn-icon-sm view-sub-btn" data-id="${c.id}" title="عرض التفاصيل">
                  👁️
                </button>
                ${isDisabled ? `
                  <button class="btn btn-ghost btn-icon-sm enable-sub-btn" data-id="${c.id}" title="إعادة التفعيل" style="color:var(--success);">
                    ✓
                  </button>
                ` : `
                  <button class="btn btn-ghost btn-icon-sm disable-sub-btn" data-id="${c.id}" title="تعطيل الكود" style="color:var(--warning);">
                    🚫
                  </button>
                `}
                <button class="btn btn-ghost btn-icon-sm delete-sub-btn" data-id="${c.id}" title="${isUsed ? 'لا يمكن حذف كود مستخدم' : 'حذف الكود'}" ${isUsed ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : 'style="color:var(--danger);"'}>
                  ${Icons.trash ? Icons.trash('w-4 h-4') : '🗑️'}
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    initSubscriptionsEvents() {
      let currentPage = 1;
      let lastGeneratedCodes = [];

      const searchInput = document.getElementById('sub-search-input');
      const statusFilter = document.getElementById('sub-filter-status');
      const typeFilter = document.getElementById('sub-filter-type');
      const tableBody = document.getElementById('subs-table-body');
      const prevBtn = document.getElementById('subs-prev-page-btn');
      const nextBtn = document.getElementById('subs-next-page-btn');
      const pageCurrentEl = document.getElementById('subs-page-current');
      const pageTotalEl = document.getElementById('subs-page-total');

      const reloadTable = async (page = 1) => {
        currentPage = page;
        const search = searchInput ? searchInput.value.trim() : '';
        const st = statusFilter ? statusFilter.value : 'all';
        const tp = typeFilter ? typeFilter.value : 'all';

        try {
          const res = await window.AdminService.getSubscriptions({
            page: currentPage,
            limit: 20,
            search: search || undefined,
            status: st !== 'all' ? st : undefined,
            type: tp !== 'all' ? tp : undefined
          });

          if (res.summary) {
            const elTotal = document.getElementById('sub-stat-total');
            const elAvail = document.getElementById('sub-stat-available');
            const elUsed = document.getElementById('sub-stat-used');
            const elExp = document.getElementById('sub-stat-expired');
            const elDis = document.getElementById('sub-stat-disabled');
            if (elTotal) elTotal.textContent = res.summary.total;
            if (elAvail) elAvail.textContent = res.summary.available;
            if (elUsed) elUsed.textContent = res.summary.used;
            if (elExp) elExp.textContent = res.summary.expired;
            if (elDis) elDis.textContent = res.summary.disabled;
          }

          if (tableBody) {
            tableBody.innerHTML = window.AdminViews.renderSubscriptionsTableRows(res.codes || []);
          }

          const pag = res.pagination || { page: 1, total_pages: 1, total_count: 0 };
          if (pageCurrentEl) pageCurrentEl.textContent = pag.page;
          if (pageTotalEl) pageTotalEl.textContent = pag.total_pages;
          if (prevBtn) prevBtn.disabled = pag.page <= 1;
          if (nextBtn) nextBtn.disabled = pag.page >= pag.total_pages;

          attachRowEvents();
        } catch (err) {
          console.warn('Error refreshing subscriptions table:', err);
          if (window.UI && window.UI.showToast) {
            window.UI.showToast('فشل تحميل قائمة الاشتراكات: ' + err.message, 'error');
          }
        }
      };

      const attachRowEvents = () => {
        // View Details
        document.querySelectorAll('.view-sub-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            try {
              const res = await window.AdminService.getSubscription(id);
              if (res.success && res.code) {
                const c = res.code;
                const modal = document.getElementById('view-code-modal');
                const content = document.getElementById('view-code-modal-content');
                if (content && modal) {
                  let statusBadge = '<span class="badge badge-cyan">متاح للتفعيل</span>';
                  if (c.status === 'used') statusBadge = '<span class="badge badge-success">مستخدم ومفعل</span>';
                  else if (c.status === 'expired') statusBadge = '<span class="badge badge-warning">منتهي الصلاحية</span>';
                  else if (c.status === 'disabled') statusBadge = '<span class="badge badge-danger">معطل</span>';

                  content.innerHTML = `
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem; background:var(--bg-base); padding:1rem; border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
                      <div><span style="color:var(--text-muted); font-size:0.8125rem;">الكود:</span><br><code style="color:var(--cyan); font-weight:bold;">${c.masked_code || c.code_prefix}</code></div>
                      <div><span style="color:var(--text-muted); font-size:0.8125rem;">الحالة:</span><br>${statusBadge}</div>
                      <div><span style="color:var(--text-muted); font-size:0.8125rem;">نوع الخطة:</span><br><strong>${c.type_label || c.subscription_type}</strong></div>
                      <div><span style="color:var(--text-muted); font-size:0.8125rem;">المدة بالأيام:</span><br><strong>${c.duration_days === -1 ? 'مدى الحياة' : c.duration_days + ' يوم'}</strong></div>
                      <div><span style="color:var(--text-muted); font-size:0.8125rem;">الاستخدام:</span><br><strong>${c.uses_count} من ${c.max_uses}</strong></div>
                      <div><span style="color:var(--text-muted); font-size:0.8125rem;">تاريخ الإنشاء:</span><br><strong>${c.created_at ? new Date(c.created_at).toLocaleString('ar-EG') : '-'}</strong></div>
                      <div><span style="color:var(--text-muted); font-size:0.8125rem;">تاريخ التفعيل:</span><br><strong>${c.activated_at ? new Date(c.activated_at).toLocaleString('ar-EG') : '-'}</strong></div>
                      <div><span style="color:var(--text-muted); font-size:0.8125rem;">تاريخ الانتهاء:</span><br><strong>${c.duration_days === -1 ? 'مدى الحياة' : (c.expires_at ? new Date(c.expires_at).toLocaleString('ar-EG') : '-')}</strong></div>
                    </div>

                    ${c.assigned_user_name ? `
                      <div style="background:rgba(6, 182, 212, 0.08); border:1px solid var(--border-cyan); border-radius:var(--radius-md); padding:1rem;">
                        <div style="font-weight:700; color:var(--text-main); margin-bottom:0.5rem;">👨🎓 بيانات الطالب المرتبط:</div>
                        <div style="font-size:0.875rem;"><strong>الاسم:</strong> ${c.assigned_user_name}</div>
                        <div style="font-size:0.875rem;"><strong>الهاتف:</strong> ${c.assigned_user_phone || '-'}</div>
                        <div style="font-size:0.875rem;"><strong>البريد:</strong> ${c.assigned_user_email || '-'}</div>
                        <div style="font-size:0.875rem;"><strong>الصف:</strong> ${c.assigned_user_grade || '-'}</div>
                      </div>
                    ` : '<div style="font-size:0.875rem; color:var(--text-muted);">لم يتم ربط أو تفعيل هذا الكود من أي طالب بعد.</div>'}

                    ${c.notes ? `<div style="font-size:0.875rem;"><strong>ملاحظات:</strong> ${c.notes}</div>` : ''}
                  `;
                  modal.style.display = 'flex';
                }
              }
            } catch (err) {
              if (window.UI && window.UI.showToast) UI.showToast('فشل جلب تفاصيل الكود: ' + err.message, 'error');
            }
          });
        });

        // Disable Code
        document.querySelectorAll('.disable-sub-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            if (!confirm('هل أنت متأكد من رغبتك في تعطيل هذا الكود؟ لن يتمكن أي طالب من استخدامه للتسجيل.')) return;
            try {
              const res = await window.AdminService.disableSubscription(id);
              if (window.UI && window.UI.showToast) UI.showToast(res.message || 'تم تعطيل الكود بنجاح', 'success');
              reloadTable(currentPage);
            } catch (err) {
              if (window.UI && window.UI.showToast) UI.showToast(err.message || 'فشل تعطيل الكود', 'error');
            }
          });
        });

        // Enable Code
        document.querySelectorAll('.enable-sub-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            try {
              const res = await window.AdminService.enableSubscription(id);
              if (window.UI && window.UI.showToast) UI.showToast(res.message || 'تم تفعيل الكود بنجاح', 'success');
              reloadTable(currentPage);
            } catch (err) {
              if (window.UI && window.UI.showToast) UI.showToast(err.message || 'فشل تفعيل الكود', 'error');
            }
          });
        });

        // Delete Code
        document.querySelectorAll('.delete-sub-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            if (btn.disabled) return;
            if (!confirm('هل أنت متأكد من حذف كود الاشتراك غير المستخدم نهائيًا؟')) return;
            try {
              const res = await window.AdminService.deleteSubscription(id);
              if (window.UI && window.UI.showToast) UI.showToast(res.message || 'تم حذف الكود بنجاح', 'success');
              reloadTable(currentPage);
            } catch (err) {
              if (window.UI && window.UI.showToast) UI.showToast(err.message || 'فشل حذف الكود', 'error');
            }
          });
        });
      };

      // Search & Filters Listeners
      let searchDebounce;
      searchInput?.addEventListener('input', () => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => reloadTable(1), 350);
      });
      statusFilter?.addEventListener('change', () => reloadTable(1));
      typeFilter?.addEventListener('change', () => reloadTable(1));

      // Pagination
      prevBtn?.addEventListener('click', () => {
        if (currentPage > 1) reloadTable(currentPage - 1);
      });
      nextBtn?.addEventListener('click', () => {
        reloadTable(currentPage + 1);
      });

      // Modals Handling
      const genModal = document.getElementById('generate-sub-modal');
      const displayModal = document.getElementById('display-generated-modal');
      const viewModal = document.getElementById('view-code-modal');

      const genTypeSelect = document.getElementById('gen-sub-type');
      const customDaysGroup = document.getElementById('gen-custom-days-group');
      const customDaysInput = document.getElementById('gen-custom-days');
      const countGroup = document.getElementById('gen-count-group');
      const countInput = document.getElementById('gen-code-count');

      genTypeSelect?.addEventListener('change', () => {
        if (genTypeSelect.value === 'custom') {
          if (customDaysGroup) customDaysGroup.style.display = 'block';
          if (customDaysInput) customDaysInput.required = true;
        } else {
          if (customDaysGroup) customDaysGroup.style.display = 'none';
          if (customDaysInput) customDaysInput.required = false;
        }
      });

      // Open Single Code Modal
      document.getElementById('generate-single-code-btn')?.addEventListener('click', () => {
        if (countInput) countInput.value = 1;
        if (countGroup) countGroup.style.display = 'none';
        const titleEl = document.getElementById('generate-modal-title');
        if (titleEl) titleEl.textContent = 'توليد كود اشتراك مفرد';
        if (genModal) genModal.style.display = 'flex';
      });

      // Open Bulk Codes Modal
      document.getElementById('generate-bulk-codes-btn')?.addEventListener('click', () => {
        if (countInput) countInput.value = 10;
        if (countGroup) countGroup.style.display = 'block';
        const titleEl = document.getElementById('generate-modal-title');
        if (titleEl) titleEl.textContent = 'توليد حزمة أكواد اشتراك متعددة';
        if (genModal) genModal.style.display = 'flex';
      });

      // Close Generate Modal
      const closeGenModal = () => { if (genModal) genModal.style.display = 'none'; };
      document.getElementById('close-generate-modal-btn')?.addEventListener('click', closeGenModal);
      document.getElementById('cancel-generate-modal-btn')?.addEventListener('click', closeGenModal);

      // Close Display Modal
      const closeDispModal = () => { if (displayModal) displayModal.style.display = 'none'; reloadTable(1); };
      document.getElementById('close-display-modal-btn')?.addEventListener('click', closeDispModal);
      document.getElementById('done-display-modal-btn')?.addEventListener('click', closeDispModal);

      // Close View Modal
      const closeVModal = () => { if (viewModal) viewModal.style.display = 'none'; };
      document.getElementById('close-view-modal-btn')?.addEventListener('click', closeVModal);
      document.getElementById('done-view-modal-btn')?.addEventListener('click', closeVModal);

      // Submit Generate Form
      document.getElementById('generate-sub-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const subType = genTypeSelect ? genTypeSelect.value : '1_month';
        const customDays = customDaysInput ? parseInt(customDaysInput.value, 10) : null;
        const count = countInput ? parseInt(countInput.value, 10) : 1;
        const maxUses = parseInt(document.getElementById('gen-max-uses')?.value || 1, 10);
        const notes = document.getElementById('gen-sub-notes')?.value || '';

        const submitBtn = document.getElementById('submit-generate-btn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = 'جاري توليد وتشفير الأكواد... ⏳';
        }

        try {
          const res = await window.AdminService.generateSubscriptions({
            type: subType,
            duration_days: subType === 'custom' ? customDays : undefined,
            count: count,
            max_uses: maxUses,
            notes: notes
          });

          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '⚡ توليد الأكواد الآن';
          }

          if (res.success && res.generated_codes) {
            closeGenModal();
            lastGeneratedCodes = res.generated_codes;

            // Render display modal
            const listEl = document.getElementById('generated-codes-list');
            const countLabel = document.getElementById('generated-codes-count-label');
            if (countLabel) countLabel.textContent = `الأكواد الصالحة (${res.generated_codes.length} كود):`;

            if (listEl) {
              listEl.innerHTML = res.generated_codes.map((gc, idx) => `
                <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-surface); padding:0.6rem 0.85rem; border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
                  <div style="display:flex; align-items:center; gap:0.5rem;">
                    <span style="color:var(--text-subtle); font-size:0.75rem;">#${idx + 1}</span>
                    <code style="font-size:1.05rem; font-weight:800; color:var(--cyan); letter-spacing:0.08em;">${gc.code}</code>
                    <span class="badge badge-neutral" style="font-size:0.7rem;">${gc.type_label}</span>
                  </div>
                  <button type="button" class="btn btn-outline btn-sm copy-single-code-btn" data-code="${gc.code}">
                    نسخ 📋
                  </button>
                </div>
              `).join('');

              // Attach copy single listeners
              listEl.querySelectorAll('.copy-single-code-btn').forEach(cbtn => {
                cbtn.addEventListener('click', () => {
                  const codeVal = cbtn.getAttribute('data-code');
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(codeVal);
                    cbtn.innerHTML = 'تم النسخ ✓';
                    cbtn.className = 'btn btn-success btn-sm';
                    setTimeout(() => {
                      cbtn.innerHTML = 'نسخ 📋';
                      cbtn.className = 'btn btn-outline btn-sm copy-single-code-btn';
                    }, 2000);
                  }
                });
              });
            }

            if (displayModal) displayModal.style.display = 'flex';
            if (window.UI && window.UI.celebrateConfetti) UI.celebrateConfetti();
          }
        } catch (err) {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '⚡ توليد الأكواد الآن';
          }
          if (window.UI && window.UI.showToast) UI.showToast(err.message || 'فشل توليد الأكواد', 'error');
        }
      });

      // Copy All Codes
      document.getElementById('copy-all-codes-btn')?.addEventListener('click', () => {
        if (!lastGeneratedCodes || lastGeneratedCodes.length === 0) return;
        const allText = lastGeneratedCodes.map(c => `${c.code} (${c.type_label})`).join("\n");
        if (navigator.clipboard) {
          navigator.clipboard.writeText(allText);
          const copyAllBtn = document.getElementById('copy-all-codes-btn');
          if (copyAllBtn) {
            copyAllBtn.innerHTML = 'تم نسخ جميع الأكواد ✓';
            copyAllBtn.className = 'btn btn-success btn-sm';
            setTimeout(() => {
              copyAllBtn.innerHTML = '📋 نسخ جميع الأكواد';
              copyAllBtn.className = 'btn btn-secondary btn-sm';
            }, 2500);
          }
        }
      });

      // Initial table row events
      attachRowEvents();
    },

    // ==========================================
    // 11. ASSISTANTS MANAGEMENT (Super Admin)
    // ==========================================
    async renderAssistants() {
      let assistants = [];
      try {
        assistants = await window.AdminService.getAssistants();
      } catch (err) {
        console.warn('Error loading assistants:', err);
        assistants = [];
      }

      const activeCount = assistants.filter(a => a.status === 'ACTIVE' || a.status === 'active' || a.is_active === 1).length;
      const inactiveCount = assistants.length - activeCount;

      return `
        <div class="content-body">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; flex-wrap:wrap; gap:1rem;">
            <div>
              <div class="badge badge-purple" style="margin-bottom:0.35rem;">🛡️ الإدارة العليا - Super Admin</div>
              <h1 style="font-size:1.875rem; font-weight:800; margin:0;">إدارة حسابات المساعدين (Assistants)</h1>
              <p style="color:var(--text-muted); font-size:0.9375rem;">إنشاء وتعيين المساعدين وإدارة صلاحياتهم الأكاديمية لمتابعة الطلاب وإعداد الاختبارات.</p>
            </div>
            <button class="btn btn-primary" id="add-assistant-btn">
              ${Icons.plus()} إضافة مساعد جديد
            </button>
          </div>

          <!-- Assistant Stats Cards -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:1.25rem; margin-bottom:2rem;">
            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-purple">${Icons.users()}</div>
              <div>
                <div class="stat-value" id="total-assistants-count">${assistants.length}</div>
                <div class="stat-label">إجمالي المساعدين</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-green">${Icons.check()}</div>
              <div>
                <div class="stat-value" id="active-assistants-count">${activeCount}</div>
                <div class="stat-label">الحسابات النشطة</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-amber">${Icons.shield ? Icons.shield() : Icons.settings()}</div>
              <div>
                <div class="stat-value" id="inactive-assistants-count">${inactiveCount}</div>
                <div class="stat-label">الحسابات المعطلة</div>
              </div>
            </div>
          </div>

          <!-- Filter & Search Bar -->
          <div class="card card-glass" style="padding:1.25rem; margin-bottom:1.5rem;">
            <div style="display:flex; gap:1rem; flex-wrap:wrap; align-items:center;">
              <div style="flex:1; min-width:240px; position:relative;">
                <input type="text" id="assistant-search-input" class="form-input" placeholder="ابحث بالاسم، البريد الإلكتروني، أو الهاتف..." style="padding-right:2.5rem;">
                <span style="position:absolute; right:0.75rem; top:50%; transform:translateY(-50%); color:var(--text-muted);">${Icons.search()}</span>
              </div>
              <select id="assistant-status-filter" class="form-select" style="width:auto;">
                <option value="">جميع الحالات</option>
                <option value="active">الحسابات النشطة فقط</option>
                <option value="inactive">الحسابات المعطلة فقط</option>
              </select>
            </div>
          </div>

          <!-- Assistants Table -->
          <div class="card card-glass" style="padding:0; overflow:hidden;">
            <div class="table-responsive">
              <table class="table" style="margin:0;">
                <thead>
                  <tr>
                    <th>المساعد</th>
                    <th>البريد الإلكتروني</th>
                    <th>رقم الهاتف</th>
                    <th>الدور (Role)</th>
                    <th>الحالة</th>
                    <th>تاريخ الإنشاء</th>
                    <th style="text-align:left;">الإجراءات</th>
                  </tr>
                </thead>
                <tbody id="assistants-table-body">
                  ${this.renderAssistantsTableRows(assistants)}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Add Assistant Modal -->
          <div id="add-assistant-modal" class="modal-overlay">
            <div class="modal-card" style="max-width:520px; padding:2rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                <h3 style="font-size:1.25rem; font-weight:800;">إضافة مساعد تعليمي جديد</h3>
                <button class="btn btn-ghost btn-icon-sm close-modal-btn">${Icons.x()}</button>
              </div>
              <form id="add-assistant-form">
                <div class="form-group" style="margin-bottom:1rem;">
                  <label class="form-label">اسم المساعد <span style="color:var(--danger);">*</span></label>
                  <input type="text" id="new-assistant-name" class="form-input" placeholder="مثال: أ. إبراهيم فوزي" required>
                </div>
                <div class="form-group" style="margin-bottom:1rem;">
                  <label class="form-label">البريد الإلكتروني <span style="color:var(--danger);">*</span></label>
                  <input type="email" id="new-assistant-email" class="form-input" placeholder="assistant@codespark.edu.eg" required>
                </div>
                <div class="form-group" style="margin-bottom:1rem;">
                  <label class="form-label">رقم الهاتف (اختياري)</label>
                  <input type="text" id="new-assistant-phone" class="form-input" placeholder="01012345678">
                </div>
                <div class="form-group" style="margin-bottom:1rem;">
                  <label class="form-label" for="new-assistant-status">حالة الحساب</label>
                  <select id="new-assistant-status" class="form-select">
                    <option value="ACTIVE">🟢 نشط ومفعل</option>
                    <option value="INACTIVE">🔴 معطل مؤقتًا</option>
                  </select>
                </div>
                <div class="form-group" style="margin-bottom:1.5rem;">
                  <label class="form-label">كلمة المرور <span style="color:var(--danger);">*</span></label>
                  <input type="password" id="new-assistant-password" class="form-input" placeholder="أدخل كلمة مرور قوية (6 أحرف فأكثر)" required minlength="6">
                </div>
                <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
                  <button type="button" class="btn btn-secondary close-modal-btn">إلغاء</button>
                  <button type="submit" class="btn btn-primary" id="save-assistant-btn">حفظ وإنشاء الحساب ⚡</button>
                </div>
              </form>
            </div>
          </div>

          <!-- Edit Assistant Modal -->
          <div id="edit-assistant-modal" class="modal-overlay">
            <div class="modal-card" style="max-width:520px; padding:2rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                <h3 style="font-size:1.25rem; font-weight:800;">تعديل بيانات المساعد</h3>
                <button class="btn btn-ghost btn-icon-sm close-modal-btn">${Icons.x()}</button>
              </div>
              <form id="edit-assistant-form">
                <input type="hidden" id="edit-assistant-id">
                <div class="form-group" style="margin-bottom:1rem;">
                  <label class="form-label">اسم المساعد</label>
                  <input type="text" id="edit-assistant-name" class="form-input" required>
                </div>
                <div class="form-group" style="margin-bottom:1rem;">
                  <label class="form-label">البريد الإلكتروني</label>
                  <input type="email" id="edit-assistant-email" class="form-input" required>
                </div>
                <div class="form-group" style="margin-bottom:1.5rem;">
                  <label class="form-label">رقم الهاتف</label>
                  <input type="text" id="edit-assistant-phone" class="form-input">
                </div>
                <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
                  <button type="button" class="btn btn-secondary close-modal-btn">إلغاء</button>
                  <button type="submit" class="btn btn-primary">حفظ التعديلات</button>
                </div>
              </form>
            </div>
          </div>

          <!-- Reset Password Modal -->
          <div id="reset-assistant-pw-modal" class="modal-overlay">
            <div class="modal-card" style="max-width:460px; padding:2rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                <h3 style="font-size:1.25rem; font-weight:800;">إعادة تعيين كلمة المرور</h3>
                <button class="btn btn-ghost btn-icon-sm close-modal-btn">${Icons.x()}</button>
              </div>
              <form id="reset-assistant-pw-form">
                <input type="hidden" id="reset-assistant-id">
                <div class="form-group" style="margin-bottom:1.5rem;">
                  <label class="form-label">كلمة المرور الجديدة</label>
                  <input type="password" id="reset-assistant-new-pw" class="form-input" placeholder="أدخل كلمة المرور الجديدة" required>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
                  <button type="button" class="btn btn-secondary close-modal-btn">إلغاء</button>
                  <button type="submit" class="btn btn-primary">تغيير كلمة المرور</button>
                </div>
              </form>
            </div>
          </div>

        </div>
      `;
    },

    renderAssistantsTableRows(assistants) {
      if (!assistants || assistants.length === 0) {
        return `
          <tr>
            <td colspan="7" style="text-align:center; padding:3rem; color:var(--text-muted);">
              <div style="font-size:2rem; margin-bottom:0.5rem;">👥</div>
              <div style="font-weight:700; font-size:1rem; color:var(--text-main);">لا يوجد مساعدين مسجلين حاليًا</div>
              <div style="font-size:0.875rem;">اضغط على زر 'إضافة مساعد جديد' لإنشاء حساب مساعد.</div>
            </td>
          </tr>
        `;
      }

      return assistants.map(ast => {
        const isActive = ast.status === 'ACTIVE' || ast.status === 'active' || ast.is_active === 1;
        const createdDate = ast.created_at ? new Date(ast.created_at).toLocaleDateString('ar-EG', { year:'numeric', month:'short', day:'numeric' }) : '-';
        return `
          <tr data-assistant-id="${ast.id}">
            <td>
              <div style="display:flex; align-items:center; gap:0.75rem;">
                <div class="user-avatar" style="background:var(--purple); width:36px; height:36px; font-size:0.8125rem;">
                  ${ast.avatar || 'مس'}
                </div>
                <div>
                  <div style="font-weight:700; font-size:0.9375rem; color:var(--text-main);">${ast.name}</div>
                  <div style="font-size:0.75rem; color:var(--text-muted);">ID: ${ast.id}</div>
                </div>
              </div>
            </td>
            <td><code style="color:var(--cyan); font-size:0.875rem;">${ast.email}</code></td>
            <td>${ast.phone || '<span style="color:var(--text-subtle);">-</span>'}</td>
            <td>
              <span class="badge badge-purple" style="font-size:0.75rem; font-weight:700;">مساعد تعليمي</span>
            </td>
            <td>
              <span class="badge ${isActive ? 'badge-success' : 'badge-danger'}" style="font-size:0.75rem;">
                ${isActive ? 'نشط' : 'معطل'}
              </span>
            </td>
            <td style="font-size:0.8125rem; color:var(--text-muted);">${createdDate}</td>
            <td>
              <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
                <button class="btn btn-ghost btn-icon-sm edit-ast-btn" data-id="${ast.id}" title="تعديل البيانات">
                  ${Icons.edit()}
                </button>
                <button class="btn btn-ghost btn-icon-sm reset-pw-ast-btn" data-id="${ast.id}" title="إعادة تعيين كلمة المرور">
                  ${Icons.key ? Icons.key() : '🔑'}
                </button>
                <button class="btn btn-ghost btn-icon-sm toggle-status-ast-btn" data-id="${ast.id}" data-active="${isActive}" title="${isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}" style="color:${isActive ? 'var(--amber)' : 'var(--success)'};">
                  ${isActive ? (Icons.lock ? Icons.lock() : '🔒') : (Icons.unlock ? Icons.unlock() : '🔓')}
                </button>
                <button class="btn btn-ghost btn-icon-sm delete-ast-btn" data-id="${ast.id}" data-name="${ast.name}" title="حذف الحساب" style="color:var(--danger);">
                  ${Icons.trash()}
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    initAssistantsEvents() {
      // Close Modals handler
      document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (window.UI && window.UI.closeModal) {
            UI.closeModal('add-assistant-modal');
            UI.closeModal('edit-assistant-modal');
            UI.closeModal('reset-assistant-pw-modal');
          } else {
            const m1 = document.getElementById('add-assistant-modal');
            const m2 = document.getElementById('edit-assistant-modal');
            const m3 = document.getElementById('reset-assistant-pw-modal');
            if (m1) m1.style.display = 'none';
            if (m2) m2.style.display = 'none';
            if (m3) m3.style.display = 'none';
          }
        });
      });

      // Open Add Modal
      document.getElementById('add-assistant-btn')?.addEventListener('click', () => {
        document.getElementById('add-assistant-form')?.reset();
        if (window.UI && window.UI.openModal) {
          UI.openModal('add-assistant-modal');
        } else {
          const m = document.getElementById('add-assistant-modal');
          if (m) m.style.display = 'flex';
        }
      });

      // Add Assistant Form Submit
      document.getElementById('add-assistant-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-assistant-name')?.value.trim();
        const email = document.getElementById('new-assistant-email')?.value.trim();
        const phone = document.getElementById('new-assistant-phone')?.value.trim();
        const password = document.getElementById('new-assistant-password')?.value;
        const status = document.getElementById('new-assistant-status')?.value || 'ACTIVE';

        if (!name || !email || !password) {
          if (window.UI && window.UI.showToast) UI.showToast('الاسم والبريد الإلكتروني وكلمة المرور حقول مطلوبة', 'error');
          return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          if (window.UI && window.UI.showToast) UI.showToast('صيغة البريد الإلكتروني غير صحيحة', 'error');
          return;
        }

        if (password.length < 6) {
          if (window.UI && window.UI.showToast) UI.showToast('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل', 'error');
          return;
        }

        const saveBtn = document.getElementById('save-assistant-btn');
        if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = 'جاري الإنشاء... ⏳'; }

        try {
          const res = await window.AdminService.createAssistant({ name, email, phone, password, status });
          if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = 'حفظ وإنشاء الحساب ⚡'; }
          if (res.success) {
            if (window.UI && window.UI.closeModal) {
              UI.closeModal('add-assistant-modal');
            } else {
              const m = document.getElementById('add-assistant-modal');
              if (m) m.style.display = 'none';
            }
            document.getElementById('add-assistant-form')?.reset();
            if (window.UI && window.UI.showToast) UI.showToast(res.message || 'تم إنشاء حساب المساعد بنجاح 🎉', 'success');
            const updated = await window.AdminService.getAssistants();
            document.getElementById('assistants-table-body').innerHTML = window.AdminViews.renderAssistantsTableRows(updated);
            
            // Update stats counters
            const activeCount = updated.filter(a => a.status === 'ACTIVE' || a.status === 'active' || a.is_active === 1).length;
            const inactiveCount = updated.length - activeCount;
            const totalEl = document.getElementById('total-assistants-count');
            const activeEl = document.getElementById('active-assistants-count');
            const inactEl = document.getElementById('inactive-assistants-count');
            if (totalEl) totalEl.textContent = updated.length;
            if (activeEl) activeEl.textContent = activeCount;
            if (inactEl) inactEl.textContent = inactiveCount;

            window.AdminViews.bindAssistantRowEvents();
          } else {
            if (window.UI && window.UI.showToast) UI.showToast(res.message || 'فشل إنشاء الحساب', 'error');
          }
        } catch (err) {
          if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = 'حفظ وإنشاء الحساب ⚡'; }
          if (window.UI && window.UI.showToast) UI.showToast(err.message || 'حدث خطأ', 'error');
        }
      });

      // Edit Assistant Form Submit
      document.getElementById('edit-assistant-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-assistant-id')?.value;
        const name = document.getElementById('edit-assistant-name')?.value.trim();
        const email = document.getElementById('edit-assistant-email')?.value.trim();
        const phone = document.getElementById('edit-assistant-phone')?.value.trim();

        try {
          const res = await window.AdminService.updateAssistant(id, { name, email, phone });
          if (res.success) {
            if (window.UI && window.UI.closeModal) {
              UI.closeModal('edit-assistant-modal');
            } else {
              const m = document.getElementById('edit-assistant-modal');
              if (m) m.style.display = 'none';
            }
            if (window.UI && window.UI.showToast) UI.showToast('تم تحديث بيانات المساعد بنجاح', 'success');
            const updated = await window.AdminService.getAssistants();
            document.getElementById('assistants-table-body').innerHTML = window.AdminViews.renderAssistantsTableRows(updated);
            window.AdminViews.bindAssistantRowEvents();
          }
        } catch (err) {
          if (window.UI && window.UI.showToast) UI.showToast(err.message || 'فشل تحديث البيانات', 'error');
        }
      });

      // Reset Assistant Password Submit
      document.getElementById('reset-assistant-pw-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('reset-assistant-id')?.value;
        const password = document.getElementById('reset-assistant-new-pw')?.value;
        try {
          const res = await window.AdminService.resetAssistantPassword(id, password);
          if (res.success) {
            if (window.UI && window.UI.closeModal) {
              UI.closeModal('reset-assistant-pw-modal');
            } else {
              const m = document.getElementById('reset-assistant-pw-modal');
              if (m) m.style.display = 'none';
            }
            if (window.UI && window.UI.showToast) UI.showToast('تمت إعادة تعيين كلمة المرور بنجاح', 'success');
          }
        } catch (err) {
          if (window.UI && window.UI.showToast) UI.showToast(err.message || 'فشل تعيين كلمة المرور', 'error');
        }
      });

      // Filter & Search
      const searchInput = document.getElementById('assistant-search-input');
      const statusFilter = document.getElementById('assistant-status-filter');
      const filterFn = async () => {
        const query = searchInput ? searchInput.value.trim() : '';
        const status = statusFilter ? statusFilter.value : '';
        try {
          const assistants = await window.AdminService.getAssistants({ search: query, status_filter: status });
          document.getElementById('assistants-table-body').innerHTML = window.AdminViews.renderAssistantsTableRows(assistants);
          window.AdminViews.bindAssistantRowEvents();
        } catch (err) {}
      };

      searchInput?.addEventListener('input', () => {
        clearTimeout(this._astSearchTimer);
        this._astSearchTimer = setTimeout(filterFn, 300);
      });
      statusFilter?.addEventListener('change', filterFn);

      this.bindAssistantRowEvents();
    },

    bindAssistantRowEvents() {
      // Edit button click
      document.querySelectorAll('.edit-ast-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const astId = btn.getAttribute('data-id');
          try {
            const res = await window.AdminService.getAssistant(astId);
            const ast = res.assistant || res;
            document.getElementById('edit-assistant-id').value = ast.id;
            document.getElementById('edit-assistant-name').value = ast.name || '';
            document.getElementById('edit-assistant-email').value = ast.email || '';
            document.getElementById('edit-assistant-phone').value = ast.phone || '';
            if (window.UI && window.UI.openModal) {
              UI.openModal('edit-assistant-modal');
            } else {
              const m = document.getElementById('edit-assistant-modal');
              if (m) m.style.display = 'flex';
            }
          } catch (err) {
            if (window.UI && window.UI.showToast) UI.showToast('تعذر جلب بيانات المساعد', 'error');
          }
        });
      });

      // Reset password button click
      document.querySelectorAll('.reset-pw-ast-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const astId = btn.getAttribute('data-id');
          document.getElementById('reset-assistant-id').value = astId;
          document.getElementById('reset-assistant-new-pw').value = '';
          if (window.UI && window.UI.openModal) {
            UI.openModal('reset-assistant-pw-modal');
          } else {
            const m = document.getElementById('reset-assistant-pw-modal');
            if (m) m.style.display = 'flex';
          }
        });
      });

      // Toggle status button click
      document.querySelectorAll('.toggle-status-ast-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const astId = btn.getAttribute('data-id');
          const isAct = btn.getAttribute('data-active') === 'true';
          const newStatus = isAct ? 'INACTIVE' : 'ACTIVE';
          try {
            const res = await window.AdminService.toggleAssistantStatus(astId, newStatus);
            if (res.success) {
              if (window.UI && window.UI.showToast) UI.showToast(res.message || 'تم تعديل الحالة', 'success');
              const updated = await window.AdminService.getAssistants();
              document.getElementById('assistants-table-body').innerHTML = window.AdminViews.renderAssistantsTableRows(updated);
              
              // Update stats
              const activeCount = updated.filter(a => a.status === 'ACTIVE' || a.status === 'active' || a.is_active === 1).length;
              const inactiveCount = updated.length - activeCount;
              const totalEl = document.getElementById('total-assistants-count');
              const activeEl = document.getElementById('active-assistants-count');
              const inactEl = document.getElementById('inactive-assistants-count');
              if (totalEl) totalEl.textContent = updated.length;
              if (activeEl) activeEl.textContent = activeCount;
              if (inactEl) inactEl.textContent = inactiveCount;

              window.AdminViews.bindAssistantRowEvents();
            }
          } catch (err) {
            if (window.UI && window.UI.showToast) UI.showToast(err.message || 'فشل تغيير الحالة', 'error');
          }
        });
      });

      // Delete button click
      document.querySelectorAll('.delete-ast-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const astId = btn.getAttribute('data-id');
          const astName = btn.getAttribute('data-name');
          if (confirm(`هل أنت متأكد من رغبتك في حذف حساب المساعد (${astName})؟`)) {
            try {
              const res = await window.AdminService.deleteAssistant(astId);
              if (res.success) {
                if (window.UI && window.UI.showToast) UI.showToast('تم حذف الحساب بنجاح', 'success');
                const updated = await window.AdminService.getAssistants();
                document.getElementById('assistants-table-body').innerHTML = window.AdminViews.renderAssistantsTableRows(updated);
                
                // Update stats
                const activeCount = updated.filter(a => a.status === 'ACTIVE' || a.status === 'active' || a.is_active === 1).length;
                const inactiveCount = updated.length - activeCount;
                const totalEl = document.getElementById('total-assistants-count');
                const activeEl = document.getElementById('active-assistants-count');
                const inactEl = document.getElementById('inactive-assistants-count');
                if (totalEl) totalEl.textContent = updated.length;
                if (activeEl) activeEl.textContent = activeCount;
                if (inactEl) inactEl.textContent = inactiveCount;

                window.AdminViews.bindAssistantRowEvents();
              }
            } catch (err) {
              if (window.UI && window.UI.showToast) UI.showToast(err.message || 'فشل حذف الحساب', 'error');
            }
          }
        });
      });
    },

    // ==========================================
    // 12. ACTIVITY LOG VIEWS (Super Admin)
    // ==========================================
    async renderActivityLogs() {
      let logs = [];
      try {
        logs = await window.AdminService.getActivityLogs({ limit: 100 });
      } catch (err) {
        console.warn('Error loading activity logs:', err);
        logs = [];
      }

      return `
        <div class="content-body">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; flex-wrap:wrap; gap:1rem;">
            <div>
              <div class="badge badge-cyan" style="margin-bottom:0.35rem;">📜 سجل النظام والتدقيق</div>
              <h1 style="font-size:1.875rem; font-weight:800; margin:0;">سجل نشاطات وعمليات المنصة</h1>
              <p style="color:var(--text-muted); font-size:0.9375rem;">متابعة جميع العمليات الإدارية والأكاديمية التي ينفذها المشرف العام والمساعدون في الوقت الفعلي.</p>
            </div>
          </div>

          <!-- Filters -->
          <div class="card card-glass" style="padding:1.25rem; margin-bottom:1.5rem;">
            <div style="display:flex; gap:1rem; flex-wrap:wrap; align-items:center;">
              <div style="flex:1; min-width:240px; position:relative;">
                <input type="text" id="log-search-input" class="form-input" placeholder="ابحث في السجل باسم المنفذ، الإجراء، أو الهدف..." style="padding-right:2.5rem;">
                <span style="position:absolute; right:0.75rem; top:50%; transform:translateY(-50%); color:var(--text-muted);">${Icons.search()}</span>
              </div>
              <select id="log-action-filter" class="form-select" style="width:auto;">
                <option value="">جميع العمليات</option>
                <option value="CREATE_ASSISTANT">إنشاء مساعد</option>
                <option value="DELETE_ASSISTANT">حذف مساعد</option>
                <option value="DISABLE_STUDENT">تعطيل طالب</option>
                <option value="SOFT_DELETE_STUDENT">حذف طالب (إلغاء اشتراك)</option>
                <option value="PUBLISH_LESSON">نشر درس</option>
                <option value="CREATE_EXAM">إنشاء امتحان</option>
                <option value="CREATE_QUESTION">إضافة سؤال</option>
                <option value="REPLY_SUPPORT_TICKET">رد على سؤال طالب</option>
                <option value="GENERATE_CODE">توليد كود</option>
              </select>
            </div>
          </div>

          <!-- Table -->
          <div class="card card-glass" style="padding:0; overflow:hidden;">
            <div class="table-responsive">
              <table class="table" style="margin:0;">
                <thead>
                  <tr>
                    <th>المستخدم المنفذ</th>
                    <th>الرتبة (Role)</th>
                    <th>نوع العملية</th>
                    <th>الهدف / العنصر</th>
                    <th>التفاصيل</th>
                    <th>التاريخ والوقت</th>
                  </tr>
                </thead>
                <tbody id="activity-logs-table-body">
                  ${this.renderActivityLogsRows(logs)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    },

    renderActivityLogsRows(logs) {
      if (!logs || logs.length === 0) {
        return `
          <tr>
            <td colspan="6" style="text-align:center; padding:3rem; color:var(--text-muted);">
              <div style="font-size:2rem; margin-bottom:0.5rem;">📜</div>
              <div style="font-weight:700; font-size:1rem; color:var(--text-main);">لا توجد نشاطات مسجلة حتى الآن</div>
            </td>
          </tr>
        `;
      }

      const actionLabels = {
        'CREATE_ASSISTANT': { text: 'إنشاء مساعد', badge: 'badge-purple' },
        'UPDATE_ASSISTANT': { text: 'تعديل مساعد', badge: 'badge-purple' },
        'DELETE_ASSISTANT': { text: 'حذف مساعد', badge: 'badge-danger' },
        'STATUS_CHANGE_ASSISTANT': { text: 'تغيير حالة مساعد', badge: 'badge-amber' },
        'RESET_PASSWORD_ASSISTANT': { text: 'إعادة تعيين كلمة مرور', badge: 'badge-amber' },
        'CREATE_STUDENT': { text: 'إضافة طالب', badge: 'badge-cyan' },
        'DISABLE_STUDENT': { text: 'تعطيل طالب', badge: 'badge-amber' },
        'ENABLE_STUDENT': { text: 'تفعيل طالب', badge: 'badge-success' },
        'SOFT_DELETE_STUDENT': { text: 'حذف طالب (إلغاء اشتراك)', badge: 'badge-danger' },
        'CREATE_LESSON': { text: 'إنشاء درس', badge: 'badge-primary' },
        'UPDATE_LESSON': { text: 'تعديل درس', badge: 'badge-primary' },
        'PUBLISH_LESSON': { text: 'نشر درس 🚀', badge: 'badge-success' },
        'UNPUBLISH_LESSON': { text: 'إلغاء نشر درس', badge: 'badge-danger' },
        'DELETE_LESSON': { text: 'حذف درس', badge: 'badge-danger' },
        'CREATE_EXAM': { text: 'إنشاء امتحان', badge: 'badge-warning' },
        'UPDATE_EXAM': { text: 'تعديل امتحان', badge: 'badge-warning' },
        'DELETE_EXAM': { text: 'حذف امتحان', badge: 'badge-danger' },
        'CREATE_QUESTION': { text: 'إضافة سؤال', badge: 'badge-blue' },
        'UPDATE_QUESTION': { text: 'تعديل سؤال', badge: 'badge-blue' },
        'DELETE_QUESTION': { text: 'حذف سؤال', badge: 'badge-danger' },
        'REPLY_SUPPORT_TICKET': { text: 'إجابة سؤال طالب', badge: 'badge-green' },
        'GENERATE_CODE': { text: 'توليد كود بايثون ⚡', badge: 'badge-cyan' },
        'USER_LOGIN': { text: 'تسجيل دخول', badge: 'badge-secondary' }
      };

      return logs.map(l => {
        const actionInfo = actionLabels[l.action] || { text: l.action, badge: 'badge-secondary' };
        const role = (l.user_role || '').toUpperCase();
        const roleBadge = role === 'SUPER_ADMIN' || role === 'ADMIN' ? 'badge-danger' : (role === 'ASSISTANT' ? 'badge-purple' : 'badge-cyan');
        const roleText = role === 'SUPER_ADMIN' || role === 'ADMIN' ? 'مشرف عام' : (role === 'ASSISTANT' ? 'مساعد' : 'طالب');
        const timeStr = l.created_at ? new Date(l.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : '-';

        return `
          <tr>
            <td>
              <div style="font-weight:700; color:var(--text-main); font-size:0.875rem;">${l.user_name || 'النظام'}</div>
            </td>
            <td><span class="badge ${roleBadge}" style="font-size:0.7rem;">${roleText}</span></td>
            <td><span class="badge ${actionInfo.badge}" style="font-size:0.75rem;">${actionInfo.text}</span></td>
            <td>
              <div style="font-weight:600; font-size:0.875rem;">${l.target_name || l.target_id || '-'}</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">${l.target_type || ''}</div>
            </td>
            <td style="font-size:0.8125rem; color:var(--text-muted); max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              ${l.details || '-'}
            </td>
            <td style="font-size:0.8125rem; color:var(--text-muted);">${timeStr}</td>
          </tr>
        `;
      }).join('');
    },

    initActivityLogsEvents() {
      const searchInput = document.getElementById('log-search-input');
      const actionFilter = document.getElementById('log-action-filter');

      const filterFn = async () => {
        const search = searchInput ? searchInput.value.trim() : '';
        const action = actionFilter ? actionFilter.value : '';
        try {
          const logs = await window.AdminService.getActivityLogs({ search, action, limit: 100 });
          document.getElementById('activity-logs-table-body').innerHTML = window.AdminViews.renderActivityLogsRows(logs);
        } catch (e) {}
      };

      searchInput?.addEventListener('input', filterFn);
      actionFilter?.addEventListener('change', filterFn);
    },


    // ==========================================
    // 12. EDUCATIONAL RESOURCES & PDF MANAGEMENT
    // ==========================================
    async renderResources(admin) {
      let resources = [];
      let units = [];
      let lessons = [];
      let total = 0;
      try {
        const res = await window.ResourceService.getAdminResources();
        resources = res.resources || [];
        units = res.units || [];
        lessons = res.lessons || [];
        total = res.total || resources.length;
      } catch (err) {
        console.warn('Error loading educational resources:', err);
      }

      const activeCount = resources.filter(r => r.status === 'active' || r.is_active == 1).length;
      const inactiveCount = resources.length - activeCount;
      const totalViews = resources.reduce((acc, r) => acc + (r.views_count || 0), 0);

      return `
        <div class="content-body" style="max-width:1250px;">
          <!-- Top Heading -->
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:2rem;">
            <div>
              <div class="badge badge-cyan" style="margin-bottom:0.35rem; font-weight:800;">📚 المحتوى والمذكرات المرفوعة</div>
              <h1 style="font-size:1.875rem; font-weight:900; margin:0; color:var(--text-main);">إدارة الملفات والمذكرات التعليمية (PDF)</h1>
              <p style="color:var(--text-muted); font-size:0.9375rem; margin-top:0.25rem;">
                إضافة وإدارة مذكرات الشرح وملخصات بايثون عبر روابط Google Drive مع إمكانية ربطها بالوحدات والدروس.
              </p>
            </div>
            <div>
              <button id="open-add-resource-modal-btn" class="btn btn-primary btn-glow" style="display:inline-flex; align-items:center; gap:0.5rem; padding:0.75rem 1.25rem; font-weight:800;">
                <span>+</span> إضافة ملف تعليمي جديد
              </button>
            </div>
          </div>

          <!-- Stats Grid -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1.25rem; margin-bottom:2rem;">
            <div class="card card-glass" style="padding:1.25rem; text-align:center;">
              <div style="font-size:0.8125rem; color:var(--text-muted); font-weight:700;">إجمالي الملفات</div>
              <div style="font-size:1.75rem; font-weight:900; color:var(--cyan); font-family:var(--font-heading); margin-top:0.25rem;">${total}</div>
            </div>
            <div class="card card-glass" style="padding:1.25rem; text-align:center;">
              <div style="font-size:0.8125rem; color:var(--text-muted); font-weight:700;">الملفات النشطة للطلاب</div>
              <div style="font-size:1.75rem; font-weight:900; color:var(--success); font-family:var(--font-heading); margin-top:0.25rem;">${activeCount}</div>
            </div>
            <div class="card card-glass" style="padding:1.25rem; text-align:center;">
              <div style="font-size:0.8125rem; color:var(--text-muted); font-weight:700;">الملفات المعطلة</div>
              <div style="font-size:1.75rem; font-weight:900; color:var(--warning); font-family:var(--font-heading); margin-top:0.25rem;">${inactiveCount}</div>
            </div>
            <div class="card card-glass" style="padding:1.25rem; text-align:center;">
              <div style="font-size:0.8125rem; color:var(--text-muted); font-weight:700;">إجمالي المشاهدات</div>
              <div style="font-size:1.75rem; font-weight:900; color:var(--gold); font-family:var(--font-heading); margin-top:0.25rem;">${totalViews}</div>
            </div>
          </div>

          <!-- Filter & Search Controls -->
          <div class="card" style="padding:1.25rem; margin-bottom:1.5rem;">
            <div style="display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:1rem;" class="form-grid">
              <div>
                <input type="text" id="admin-resource-search" class="form-input" placeholder="🔍 ابحث باسم الملف أو الوصف..." style="font-size:0.875rem;">
              </div>
              <div>
                <select id="admin-resource-unit-filter" class="form-select" style="font-size:0.875rem;">
                  <option value="all">📂 جميع الوحدات</option>
                  ${units.map(u => `<option value="${u.id}">${u.title}</option>`).join('')}
                </select>
              </div>
              <div>
                <select id="admin-resource-category-filter" class="form-select" style="font-size:0.875rem;">
                  <option value="all">📑 جميع التصنيفات</option>
                  <option value="مذكرات شرح">مذكرات شرح</option>
                  <option value="ملخصات وتفاصيل">ملخصات وتفاصيل</option>
                  <option value="تدريبات وامتحانات">تدريبات وامتحانات</option>
                  <option value="نماذج إجابة">نماذج إجابة</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>
              <div>
                <select id="admin-resource-status-filter" class="form-select" style="font-size:0.875rem;">
                  <option value="all">🔘 جميع الحالات</option>
                  <option value="active">🟢 نشط (ظاهر للطلاب)</option>
                  <option value="inactive">🔴 معطل (مخفي)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Resources Table Card -->
          <div class="card" style="padding:0; overflow:hidden;">
            <div class="table-responsive">
              <table class="table" style="margin:0;">
                <thead>
                  <tr>
                    <th>الملف التعليمي</th>
                    <th>التصنيف والوحدة</th>
                    <th>رابط الملف (Google Drive)</th>
                    <th>الحالة</th>
                    <th>المشاهدات</th>
                    <th>أضيف بواسطة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody id="admin-resources-table-body">
                  ${window.AdminViews.renderResourceRows(resources)}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Add / Edit Resource Modal -->
          <div id="resource-modal" class="modal-backdrop" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(8px); z-index:9999; align-items:center; justify-content:center; padding:1rem;">
            <div style="background:var(--bg-surface); border:1px solid var(--border-cyan); border-radius:var(--radius-xl); max-width:680px; width:100%; max-height:90vh; overflow-y:auto; padding:2rem; box-shadow:0 0 35px rgba(6,182,212,0.25);" class="modal-dialog">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; border-bottom:1px solid var(--border-subtle); padding-bottom:1rem;">
                <h3 id="resource-modal-title" style="font-size:1.25rem; font-weight:800; color:var(--text-main); margin:0;">
                  📚 إضافة ملف تعليمي جديد
                </h3>
                <button type="button" id="close-resource-modal-btn" class="btn btn-ghost btn-sm" style="font-size:1.25rem; line-height:1;">✕</button>
              </div>

              <!-- Google Drive Guidance Notice -->
              <div style="background:rgba(6,182,212,0.08); border:1px solid rgba(6,182,212,0.3); border-radius:var(--radius-md); padding:1rem; margin-bottom:1.5rem; font-size:0.8125rem; color:var(--text-muted); line-height:1.6;">
                <strong style="color:var(--cyan);">💡 إرشادات مهمة لروابط Google Drive:</strong>
                <p style="margin:0.25rem 0 0;">
                  تأكد من فتح ملف PDF على Google Drive واختيار <strong>مشاركة (Share)</strong> ثم ضبط الوصول العام إلى: <strong>أي شخص لديه الرابط (Anyone with the link)</strong> بدور <strong>مشاهد (Viewer)</strong> لضمان ظهور الملف للطلاب دون طلب إذن.
                </p>
              </div>

              <form id="resource-form">
                <input type="hidden" id="res-edit-id" value="">

                <div class="form-group">
                  <label class="form-label" for="res-title">اسم وعنوان الملف التعليمي <span style="color:var(--danger);">*</span></label>
                  <input type="text" id="res-title" class="form-input" placeholder="مثال: مذكرة شرح الوحدة الأولى — أساسيات بايثون" required>
                </div>

                <div class="form-group">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <label class="form-label" for="res-url">رابط الملف (Google Drive URL) <span style="color:var(--danger);">*</span></label>
                    <button type="button" id="validate-drive-url-btn" class="btn btn-ghost btn-sm" style="font-size:0.75rem; color:var(--cyan);">
                      🔍 فحص الرابط
                    </button>
                  </div>
                  <input type="url" id="res-url" class="form-input" placeholder="https://drive.google.com/file/d/..." required dir="ltr">
                  <div id="drive-url-feedback" style="display:none; font-size:0.75rem; margin-top:0.4rem;"></div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="res-desc">وصف موجز للملف <span class="optional">(اختياري)</span></label>
                  <textarea id="res-desc" class="form-input" rows="2" placeholder="ملاحظات أو نقاط رئيسية يحتويها هذا الملف..."></textarea>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;" class="form-grid">
                  <div class="form-group">
                    <label class="form-label" for="res-category">التصنيف</label>
                    <select id="res-category" class="form-select">
                      <option value="مذكرات شرح">مذكرات شرح</option>
                      <option value="ملخصات وتفاصيل">ملخصات وتفاصيل</option>
                      <option value="تدريبات وامتحانات">تدريبات وامتحانات</option>
                      <option value="نماذج إجابة">نماذج إجابة</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="res-unit">الوحدة الدراسية المرتبطة</label>
                    <select id="res-unit" class="form-select">
                      <option value="">-- غير محدد (عام) --</option>
                      ${units.map(u => `<option value="${u.id}">${u.title}</option>`).join('')}
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="res-lesson">الدرس المرتبط <span class="optional">(اختياري)</span></label>
                    <select id="res-lesson" class="form-select">
                      <option value="">-- غير مرتبط بدرس محدد --</option>
                      ${lessons.map(l => `<option value="${l.id}">${l.title}</option>`).join('')}
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="res-status">حالة الملف</label>
                    <select id="res-status" class="form-select">
                      <option value="active">🟢 نشط (يظهر للطلاب)</option>
                      <option value="inactive">🔴 معطل (مخفي)</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="res-order">ترتيب الظهور</label>
                    <input type="number" id="res-order" class="form-input" value="1" min="0">
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="res-size">حجم الملف التقديري <span class="optional">(اختياري)</span></label>
                    <input type="text" id="res-size" class="form-input" placeholder="مثال: 3.5 MB">
                  </div>
                </div>

                <div style="display:flex; justify-content:flex-end; gap:0.75rem; margin-top:2rem; border-top:1px solid var(--border-subtle); padding-top:1.25rem;">
                  <button type="button" id="cancel-resource-btn" class="btn btn-secondary">إلغاء</button>
                  <button type="submit" id="save-resource-btn" class="btn btn-primary btn-glow">حفظ الملف التعليمي 💾</button>
                </div>
              </form>
            </div>
          </div>

        </div>
      `;
    },

    renderResourceRows(resources) {
      if (!resources || resources.length === 0) {
        return `
          <tr>
            <td colspan="7" style="text-align:center; padding:3rem; color:var(--text-muted);">
              لا توجد ملفات تعليمية مسجلة حاليًا. اضغط على "+ إضافة ملف تعليمي جديد" للبدء.
            </td>
          </tr>
        `;
      }

      return resources.map(r => {
        const isActive = r.status === 'active' || r.is_active == 1;
        const statusBadge = isActive
          ? '<span class="badge badge-success" style="font-size:0.75rem;">🟢 نشط</span>'
          : '<span class="badge badge-danger" style="font-size:0.75rem;">🔴 معطل</span>';

        const categoryBadge = r.category === 'مذكرات شرح' ? 'badge-cyan' : ((r.category === 'ملخصات وتفاصيل' || r.category === 'ملخصات وقوانين') ? 'badge-gold' : 'badge-primary');
        const unitName = r.unit_title || 'عام';
        const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString('ar-EG') : '-';

        return `
          <tr data-id="${r.id}">
            <td>
              <div style="display:flex; align-items:center; gap:0.6rem;">
                <span style="font-size:1.25rem; color:#EF4444;">📄</span>
                <div>
                  <div style="font-weight:700; color:var(--text-main); font-size:0.9375rem;">${r.title}</div>
                  ${r.description ? `<div style="font-size:0.75rem; color:var(--text-muted); max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${r.description}</div>` : ''}
                </div>
              </div>
            </td>
            <td>
              <span class="badge ${categoryBadge}" style="font-size:0.75rem; margin-bottom:0.2rem; display:inline-block;">${r.category || 'مذكرة'}</span>
              <div style="font-size:0.75rem; color:var(--text-muted);">${unitName}</div>
            </td>
            <td>
              <a href="${r.file_url}" target="_blank" rel="noopener noreferrer" style="color:var(--cyan); font-size:0.8125rem; text-decoration:none; display:inline-flex; align-items:center; gap:0.25rem; font-family:var(--font-mono);" dir="ltr">
                Google Drive ↗
              </a>
            </td>
            <td>${statusBadge}</td>
            <td style="font-size:0.8125rem; color:var(--text-muted); font-family:var(--font-mono);">${r.views_count || 0}</td>
            <td style="font-size:0.8125rem; color:var(--text-muted);">${r.created_by_name || 'الإدارة'} <div style="font-size:0.7rem; color:var(--text-subtle);">${dateStr}</div></td>
            <td>
              <div style="display:flex; gap:0.35rem; align-items:center;">
                <button type="button" class="btn btn-ghost btn-sm edit-resource-btn" data-id="${r.id}" title="تعديل">
                  ✏️
                </button>
                <button type="button" class="btn btn-ghost btn-sm toggle-resource-btn" data-id="${r.id}" data-status="${isActive ? 'inactive' : 'active'}" title="${isActive ? 'تعطيل' : 'تفعيل'}">
                  ${isActive ? '⏸️' : '▶️'}
                </button>
                <button type="button" class="btn btn-ghost btn-sm delete-resource-btn" data-id="${r.id}" data-title="${encodeURIComponent(r.title)}" title="حذف" style="color:var(--danger);">
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    initResourcesEvents() {
      const modal = document.getElementById('resource-modal');
      const openBtn = document.getElementById('open-add-resource-modal-btn');
      const closeBtn = document.getElementById('close-resource-modal-btn');
      const cancelBtn = document.getElementById('cancel-resource-btn');
      const form = document.getElementById('resource-form');
      const modalTitle = document.getElementById('resource-modal-title');
      const searchInput = document.getElementById('admin-resource-search');
      const unitFilter = document.getElementById('admin-resource-unit-filter');
      const catFilter = document.getElementById('admin-resource-category-filter');
      const statusFilter = document.getElementById('admin-resource-status-filter');
      const validateBtn = document.getElementById('validate-drive-url-btn');
      const urlInput = document.getElementById('res-url');
      const feedback = document.getElementById('drive-url-feedback');

      const filterFn = async () => {
        const search = searchInput ? searchInput.value.trim() : '';
        const unit_id = unitFilter ? unitFilter.value : 'all';
        const category = catFilter ? catFilter.value : 'all';
        const status_filter = statusFilter ? statusFilter.value : 'all';

        try {
          const res = await window.ResourceService.getAdminResources({ search, unit_id, category, status_filter });
          const tbody = document.getElementById('admin-resources-table-body');
          if (tbody) {
            tbody.innerHTML = window.AdminViews.renderResourceRows(res.resources || []);
            attachRowEvents();
          }
        } catch (e) {}
      };

      searchInput?.addEventListener('input', filterFn);
      unitFilter?.addEventListener('change', filterFn);
      catFilter?.addEventListener('change', filterFn);
      statusFilter?.addEventListener('change', filterFn);

      const openModal = () => {
        if (form) form.reset();
        document.getElementById('res-edit-id').value = '';
        if (modalTitle) modalTitle.textContent = '📚 إضافة ملف تعليمي جديد';
        if (feedback) feedback.style.display = 'none';
        if (modal) modal.style.display = 'flex';
      };

      const closeModal = () => {
        if (modal) modal.style.display = 'none';
      };

      openBtn?.addEventListener('click', openModal);
      closeBtn?.addEventListener('click', closeModal);
      cancelBtn?.addEventListener('click', closeModal);
      modal?.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });

      // Google Drive URL validator
      validateBtn?.addEventListener('click', async () => {
        const url = urlInput ? urlInput.value.trim() : '';
        if (!url) {
          if (window.UI && window.UI.showToast) window.UI.showToast('أدخل الرابط أولاً لفحصه', 'warning');
          return;
        }
        try {
          const res = await window.ResourceService.validateUrl(url);
          if (res.success && res.info && feedback) {
            feedback.style.display = 'block';
            if (res.info.is_google_drive) {
              feedback.innerHTML = `<span style="color:var(--success);">✓ تم التعرف على رابط Google Drive بنجاح (ID: ${res.info.file_id || 'مكتشف'})</span>`;
            } else {
              feedback.innerHTML = `<span style="color:var(--cyan);">✓ رابط ملف مباشر صالح</span>`;
            }
          }
        } catch (e) {
          if (feedback) {
            feedback.style.display = 'block';
            feedback.innerHTML = `<span style="color:var(--danger);">⚠️ تعذر التحقق من الرابط</span>`;
          }
        }
      });

      // Form Save Submit
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('res-edit-id')?.value;
        const title = document.getElementById('res-title')?.value.trim();
        const file_url = document.getElementById('res-url')?.value.trim();
        const description = document.getElementById('res-desc')?.value.trim();
        const category = document.getElementById('res-category')?.value;
        const unit_id = document.getElementById('res-unit')?.value || null;
        const lesson_id = document.getElementById('res-lesson')?.value || null;
        const status = document.getElementById('res-status')?.value || 'active';
        const display_order = parseInt(document.getElementById('res-order')?.value || '1', 10);
        const file_size_label = document.getElementById('res-size')?.value.trim() || null;
        const saveBtn = document.getElementById('save-resource-btn');

        if (!title || !file_url) {
          if (window.UI && window.UI.showToast) window.UI.showToast('الاسم والرابط حقول مطلوبة', 'error');
          return;
        }

        const payload = {
          title, file_url, description, category,
          unit_id, lesson_id, status, display_order, file_size_label
        };

        try {
          if (saveBtn) { saveBtn.disabled = true; saveBtn.innerText = 'جاري الحفظ... ⏳'; }
          
          let res;
          if (editId) {
            res = await window.ResourceService.updateResource(editId, payload);
          } else {
            res = await window.ResourceService.createResource(payload);
          }

          if (saveBtn) { saveBtn.disabled = false; saveBtn.innerText = 'حفظ الملف التعليمي 💾'; }

          if (res.success) {
            if (window.UI && window.UI.showToast) window.UI.showToast(res.message || 'تم حفظ الملف بنجاح 🎉', 'success');
            closeModal();
            filterFn();
          } else {
            if (window.UI && window.UI.showToast) window.UI.showToast(res.detail || res.message || 'فشل حفظ الملف', 'error');
          }
        } catch (err) {
          if (saveBtn) { saveBtn.disabled = false; saveBtn.innerText = 'حفظ الملف التعليمي 💾'; }
          if (window.UI && window.UI.showToast) window.UI.showToast(err.message || 'حدث خطأ أثناء الحفظ', 'error');
        }
      });

      const attachRowEvents = () => {
        // Edit button
        document.querySelectorAll('.edit-resource-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            try {
              const res = await window.ResourceService.getAdminResourceDetail(id);
              if (res.success && res.resource) {
                const r = res.resource;
                document.getElementById('res-edit-id').value = r.id;
                document.getElementById('res-title').value = r.title || '';
                document.getElementById('res-url').value = r.file_url || '';
                document.getElementById('res-desc').value = r.description || '';
                document.getElementById('res-category').value = r.category || 'مذكرات شرح';
                document.getElementById('res-unit').value = r.unit_id || '';
                document.getElementById('res-lesson').value = r.lesson_id || '';
                document.getElementById('res-status').value = r.status || 'active';
                document.getElementById('res-order').value = r.display_order || 1;
                document.getElementById('res-size').value = r.file_size_label || '';
                if (modalTitle) modalTitle.textContent = '✏️ تعديل الملف التعليمي';
                if (modal) modal.style.display = 'flex';
              }
            } catch (e) {
              if (window.UI && window.UI.showToast) window.UI.showToast('تعذر جلب تفاصيل الملف', 'error');
            }
          });
        });

        // Toggle Status button
        document.querySelectorAll('.toggle-resource-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            const targetStatus = btn.getAttribute('data-status');
            try {
              const res = await window.ResourceService.toggleResourceStatus(id, targetStatus);
              if (res.success) {
                if (window.UI && window.UI.showToast) window.UI.showToast(res.message || 'تم تحديث الحالة', 'success');
                filterFn();
              }
            } catch (e) {
              if (window.UI && window.UI.showToast) window.UI.showToast('فشل تحديث الحالة', 'error');
            }
          });
        });

        // Delete button with confirmation
        document.querySelectorAll('.delete-resource-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            const title = decodeURIComponent(btn.getAttribute('data-title') || 'الملف التعليمي');
            
            const confirmed = window.confirm(`هل أنت متأكد من رغبتك في حذف الملف التعليمي: "${title}"؟
لن يتم حذف أي بيانات للطلاب.`);
            if (!confirmed) return;

            try {
              const res = await window.ResourceService.deleteResource(id);
              if (res.success) {
                if (window.UI && window.UI.showToast) window.UI.showToast(res.message || 'تم حذف الملف بنجاح', 'success');
                filterFn();
              }
            } catch (e) {
              if (window.UI && window.UI.showToast) window.UI.showToast('فشل حذف الملف التعليمي', 'error');
            }
          });
        });
      };

      attachRowEvents();
    }
  };
})();
