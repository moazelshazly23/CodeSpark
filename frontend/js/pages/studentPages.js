/**
 * CodeSpark - Student Dashboard & Learning Portal Pages
 * Includes Video Lessons, Markdown Viewer, Interactive IDE, Auto-Graded Exams,
 * Study Files ("الملفات الدراسية"), Subscriptions, and Verified Password Change.
 */
import ApiClient from '../api/apiClient.js';
import AuthService from '../auth/authService.js';
import { Toast, Modal } from '../components/ui.js';

export class StudentPages {
  // ---------------------------------------------------------------------------
  // 1. Student Dashboard Overview
  // ---------------------------------------------------------------------------
  static async renderDashboard(container) {
    const user = AuthService.getUser() || {};
    container.innerHTML = `
      <div class="student-dashboard">
        <!-- Welcome Banner & Quick Gamification -->
        <div class="card welcome-card mb-4">
          <div class="welcome-content">
            <div class="welcome-text">
              <h1>أهلاً بك مجدداً، ${user.full_name || user.username} 👋</h1>
              <p class="text-muted">واصل رحلتك في تعلم البرمجة التأسيسية ومنهج بايثون للمرحلة الثانوية.</p>
            </div>
            <div class="stats-pills-row" id="dashboard-gamify-pills">
              <div class="badge-pill"><span class="pill-icon">⚡</span> <span id="dash-xp">...</span> نقطة خبرة (XP)</div>
              <div class="badge-pill"><span class="pill-icon">🔥</span> <span id="dash-streak">...</span> أيام متتالية</div>
            </div>
          </div>
        </div>

        <!-- Subscription Status Alert Banner -->
        <div id="dash-sub-banner" class="alert alert-info mb-4" style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <strong id="dash-sub-title">حالة الاشتراك: جاري التحقق...</strong>
            <div id="dash-sub-desc" style="font-size:0.85rem;margin-top:0.25rem;"></div>
          </div>
          <a href="#/student/subscription" class="btn btn-sm btn-primary" id="dash-sub-btn">⭐ ترقية وتفعيل الاشتراك</a>
        </div>

        <!-- Progress Metrics & Last Lesson -->
        <div class="grid grid-2 mb-4">
          <!-- Overall Progress Card -->
          <div class="card progress-card">
            <h3 class="card-title mb-2">📊 تقدمك في المنهج الدراسي</h3>
            <div class="progress-bar-container">
              <div class="progress-bar-fill" id="dash-progress-fill" style="width: 0%;"></div>
            </div>
            <div class="progress-labels mt-2">
              <span id="dash-progress-text">0% مكتمل</span>
              <span id="dash-progress-ratio">0 من 0 درس</span>
            </div>
          </div>

          <!-- Last Accessed Lesson Card -->
          <div class="card last-lesson-card">
            <h3 class="card-title mb-2">▶️ متابعة آخر درس</h3>
            <div id="dash-last-lesson-content">
              <p class="text-muted">لم تبدأ أي درس بعد. استعرض المنهج وابدأ الآن!</p>
              <a href="#/student/courses" class="btn btn-sm btn-secondary mt-2">استعراض الدروس</a>
            </div>
          </div>
        </div>

        <!-- Quick Access Navigation Grid -->
        <div class="grid grid-4 mb-4">
          <a href="#/student/courses" class="card action-card">
            <div class="action-icon">📚</div>
            <h4>المناهج والدروس</h4>
            <p>شروحات الفيديو والتمارين</p>
          </a>
          <a href="#/student/files" class="card action-card">
            <div class="action-icon">📁</div>
            <h4>الملفات الدراسية</h4>
            <p>المذكرات وروابط Drive</p>
          </a>
          <a href="#/student/playground" class="card action-card">
            <div class="action-icon">💻</div>
            <h4>محرر الأكواد</h4>
            <p>بيئة بايثون وويب التفاعلية</p>
          </a>
          <a href="#/student/exams" class="card action-card">
            <div class="action-icon">📝</div>
            <h4>الامتحانات والتقييم</h4>
            <p>اختبارات تفاعلية فورية</p>
          </a>
        </div>

        <!-- Announcements Section -->
        <div class="card mb-4">
          <h3 class="card-title mb-3">📢 آخر الإعلانات والتنبيهات المدرسية</h3>
          <div id="dash-announcements-list">
            <div class="text-center text-muted" style="padding:1.5rem;">جاري تحميل الإعلانات...</div>
          </div>
        </div>
      </div>
    `;

    // Fetch dashboard data in parallel
    try {
      const [progRes, subRes, annRes] = await Promise.all([
        ApiClient.get('/progress/summary').catch(() => ({})),
        ApiClient.get('/subscriptions/my-status').catch(() => ({})),
        ApiClient.get('/announcements').catch(() => ({ announcements: [] }))
      ]);

      // Update gamification stats
      const xpEl = document.getElementById('dash-xp');
      const strkEl = document.getElementById('dash-streak');
      if (xpEl) xpEl.textContent = progRes.xp || 50;
      if (strkEl) strkEl.textContent = progRes.streak_days || 1;

      // Update progress bar
      const fillEl = document.getElementById('dash-progress-fill');
      const textEl = document.getElementById('dash-progress-text');
      const ratioEl = document.getElementById('dash-progress-ratio');
      const pct = progRes.completion_percentage || 0;
      if (fillEl) fillEl.style.width = `${pct}%`;
      if (textEl) textEl.textContent = `${pct}% مكتمل`;
      if (ratioEl) ratioEl.textContent = `${progRes.completed_lessons || 0} من ${progRes.total_lessons || 0} درس`;

      // Update last lesson
      const lastLesEl = document.getElementById('dash-last-lesson-content');
      if (lastLesEl && progRes.last_accessed_lesson) {
        const ll = progRes.last_accessed_lesson;
        lastLesEl.innerHTML = `
          <h4>${ll.lesson_title}</h4>
          <p class="text-muted" style="font-size:0.85rem;">نسبة المشاهدة: ${ll.watch_percentage || 0}%</p>
          <a href="#/student/lessons/${ll.lesson_id}" class="btn btn-sm btn-primary mt-2">استكمال المشاهدة 🚀</a>
        `;
      }

      // Update subscription banner
      const subTitle = document.getElementById('dash-sub-title');
      const subDesc = document.getElementById('dash-sub-desc');
      const subBtn = document.getElementById('dash-sub-btn');
      if (subRes.is_subscribed) {
        if (subTitle) subTitle.innerHTML = `<span class="badge badge-success">حساب مشترك نشط 🎓</span> ${subRes.plan_name}`;
        if (subDesc) subDesc.textContent = subRes.expires_at ? `ينتهي الاشتراك في: ${new Date(subRes.expires_at).toLocaleDateString('ar-EG')}` : 'اشتراك مفتوح المدى';
        if (subBtn) subBtn.style.display = 'none';
      } else {
        if (subTitle) subTitle.innerHTML = `<span class="badge badge-warning">حساب مجاني تجريبي</span>`;
        if (subDesc) subDesc.textContent = 'قم بالترقية لفتح جميع الدروس ومذكرات الشرح وبنك الأسئلة الكامل.';
      }

      // Update announcements
      const annList = document.getElementById('dash-announcements-list');
      const announcements = ApiClient.extractList(annRes, 'announcements');
      if (annList) {
        if (!announcements || announcements.length === 0) {
          annList.innerHTML = '<div class="text-center text-muted" style="padding:1rem;">لا توجد إعلانات جديدة حالياً.</div>';
        } else {
          annList.innerHTML = announcements.slice(0, 3).map(a => `
            <div class="announcement-item ${a.is_urgent ? 'announcement-urgent' : ''}">
              <div class="announcement-meta">
                ${a.is_urgent ? '<span class="badge badge-danger">تنبيه عاجل ⚠️</span>' : ''}
                <span class="text-muted" style="font-size:0.8rem;">${new Date(a.created_at).toLocaleDateString('ar-EG')}</span>
              </div>
              <h4 class="announcement-title mt-1">${a.title}</h4>
              <p class="announcement-content mt-1">${a.content}</p>
            </div>
          `).join('');
        }
      }
    } catch (err) {
      console.error('Error populating dashboard:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Curriculum & Courses List
  // ---------------------------------------------------------------------------
  static async renderCourses(container) {
    container.innerHTML = `
      <div class="student-courses-page">
        <div class="page-header mb-4">
          <div class="page-badge">المنهج الأكاديمي</div>
          <h1 class="page-title">مناهج ودروس البرمجة للمرحلة الثانوية 📚</h1>
          <p class="text-muted">استعرض الوحدات التعليمية وشاهد الدروس التفاعلية وحل التدريبات المرفقة.</p>
        </div>

        <div id="courses-container">
          <div class="text-center text-muted" style="padding:3rem;">جاري تحميل المناهج والوحدات...</div>
        </div>
      </div>
    `;

    try {
      const res = await ApiClient.get('/courses');
      const courses = ApiClient.extractList(res, 'courses');
      const containerEl = document.getElementById('courses-container');

      if (!courses || courses.length === 0) {
        containerEl.innerHTML = '<div class="card text-center text-muted" style="padding:3rem;">لا توجد مناهج منشورة حالياً.</div>';
        return;
      }

      // Render courses and their units
      const htmlBlocks = [];
      for (const course of courses) {
        const courseDetail = await ApiClient.get(`/courses/${course.id}`);
        const units = courseDetail.units || [];

        htmlBlocks.push(`
          <div class="card course-block mb-4">
            <div class="course-header-row mb-3">
              <div>
                <span class="badge badge-primary">${course.academic_term || 'العام الدراسي'}</span>
                <h2 class="course-main-title mt-1">${course.title}</h2>
                <p class="text-muted">${course.description || ''}</p>
              </div>
            </div>

            <div class="units-accordion">
              ${units.map((u, uIdx) => `
                <div class="unit-box mb-3">
                  <div class="unit-title-bar">
                    <h3>${u.title}</h3>
                    <span class="text-muted" style="font-size:0.85rem;">${(u.lessons || []).length} دروس</span>
                  </div>
                  <p class="unit-desc text-muted">${u.description || ''}</p>
                  
                  <div class="lessons-list-grid mt-3">
                    ${(u.lessons || []).map(l => `
                      <a href="#/student/lessons/${l.id}" class="lesson-row-card ${l.is_free ? 'lesson-free' : ''}">
                        <div class="lesson-icon">${l.is_free ? '🟢' : '🔒'}</div>
                        <div class="lesson-info">
                          <div class="lesson-title-text">${l.title}</div>
                          <div class="lesson-subtext">
                            <span>⏱️ ${l.duration_minutes || 15} دقيقة</span>
                            ${l.is_free ? '<span class="badge badge-success ml-2">درس مجاني مفتوح</span>' : '<span class="badge badge-primary ml-2">للمشتركين فقط</span>'}
                          </div>
                        </div>
                        <div class="lesson-action">
                          <span class="btn btn-sm btn-outline-cyan">مشاهدة الدرس ↗</span>
                        </div>
                      </a>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `);
      }

      containerEl.innerHTML = htmlBlocks.join('');
    } catch (err) {
      console.error('Error loading student courses:', err);
      document.getElementById('courses-container').innerHTML = '<div class="card text-danger text-center">تعذر تحميل قائمة المناهج.</div>';
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Lesson View (Video, Markdown, Exercises, Study Files)
  // ---------------------------------------------------------------------------
  static async renderLessonView(container, lessonId) {
    container.innerHTML = `<div class="text-center text-muted" style="padding:4rem;"><div class="spinner"></div><p class="mt-2">جاري تحميل الدرس التفاعلي...</p></div>`;

    try {
      const lesson = await ApiClient.get(`/lessons/${lessonId}`);
      
      // Video Embed handling
      let videoMarkup = '';
      if (!lesson.can_access) {
        videoMarkup = `
          <div class="video-locked-overlay card text-center p-5">
            <div style="font-size:3rem;margin-bottom:1rem;">🔒</div>
            <h2>هذا الدرس مخصص للمشتركين فقط</h2>
            <p class="text-muted mb-4">اشترك الآن في منصة CodeSpark لتتمكن من مشاهدة الفيديو والمذكرات وحل التمارين.</p>
            <div style="display:flex;gap:1rem;justify-content:center;">
              <a href="#/student/subscription" class="btn btn-primary">⭐ باقات الاشتراك وتفعيل الحساب</a>
              <a href="#/student/courses" class="btn btn-secondary">العودة لقائمة الدروس</a>
            </div>
          </div>
        `;
      } else if (lesson.video_type === 'youtube' && lesson.video_url) {
        // Parse YouTube embed URL
        let embedUrl = lesson.video_url;
        if (lesson.video_url.includes('watch?v=')) {
          const vId = lesson.video_url.split('watch?v=')[1].split('&')[0];
          embedUrl = `https://www.youtube.com/embed/${vId}`;
        } else if (lesson.video_url.includes('youtu.be/')) {
          const vId = lesson.video_url.split('youtu.be/')[1].split('?')[0];
          embedUrl = `https://www.youtube.com/embed/${vId}`;
        }

        videoMarkup = `
          <div class="video-player-wrapper">
            <iframe 
              src="${embedUrl}" 
              title="${lesson.title}" 
              frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen>
            </iframe>
          </div>
        `;
      } else if (lesson.video_type === 'uploaded' && lesson.video_url) {
        videoMarkup = `
          <div class="video-player-wrapper">
            <video controls controlsList="nodownload" style="width:100%;height:100%;">
              <source src="${lesson.video_url}" type="video/mp4">
              متصفحك لا يدعم تشغيل الفيديو المباشر.
            </video>
          </div>
        `;
      } else {
        videoMarkup = `
          <div class="card p-4 text-center text-muted">
            <p>لا يوجد فيديو مرفق مع هذا الدرس، يمكنك قراءة الشرح النظري وحل التمرين التفاعلي أدناه.</p>
          </div>
        `;
      }

      container.innerHTML = `
        <div class="lesson-view-container">
          <!-- Lesson Header -->
          <div class="lesson-header-bar mb-3">
            <a href="#/student/courses" class="btn btn-sm btn-secondary">← العودة للمنهج</a>
            <div class="lesson-status-pill">
              ${lesson.is_free ? '<span class="badge badge-success">درس مجاني</span>' : '<span class="badge badge-primary">درس للمشتركين</span>'}
              ${lesson.progress?.is_completed ? '<span class="badge badge-info ml-2">✓ تم إكماله</span>' : ''}
            </div>
          </div>

          <h1 class="lesson-main-title mb-2">${lesson.title}</h1>
          <p class="text-muted mb-4">${lesson.description || ''}</p>

          <!-- Video Player Area -->
          <div class="mb-4">
            ${videoMarkup}
          </div>

          <!-- Mark Completed Button -->
          ${lesson.can_access ? `
            <div class="card mb-4 p-3" style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <strong>هل انتهيت من مشاهدة وفهم الدرس؟</strong>
                <div class="text-muted" style="font-size:0.85rem;">احصل على 20 نقطة خبرة (XP) عند تحديد هذا الدرس كمكتمل.</div>
              </div>
              <button id="btn-complete-lesson" class="btn ${lesson.progress?.is_completed ? 'btn-secondary' : 'btn-success'}">
                ${lesson.progress?.is_completed ? '✓ مكتمل بالفعل' : '🎉 تم استيعاب الدرس بالكامل'}
              </button>
            </div>
          ` : ''}

          <!-- Lesson Content Tabs -->
          <div class="card lesson-content-card mb-4">
            <div class="content-tabs-nav">
              <button class="tab-btn active" data-tab="explanation">📖 الشرح النظري والأمثلة</button>
              <button class="tab-btn" data-tab="exercises">💻 التمارين البرمجية (${(lesson.exercises || []).length})</button>
              <button class="tab-btn" data-tab="files">📁 مذكرات الشرح وملفات Drive (${(lesson.files || []).length})</button>
            </div>

            <!-- Tab 1: Markdown Explanation -->
            <div id="tab-explanation" class="tab-pane active p-4">
              <div class="markdown-body">
                <pre style="white-space:pre-wrap;font-family:inherit;line-height:1.8;">${lesson.content_markdown || 'لا يوجد محتوى نصي مكتوب لهذا الدرس.'}</pre>
              </div>
            </div>

            <!-- Tab 2: Exercises -->
            <div id="tab-exercises" class="tab-pane p-4" style="display:none;">
              ${(lesson.exercises && lesson.exercises.length > 0) ? `
                <div class="exercises-container">
                  ${lesson.exercises.map((ex, idx) => `
                    <div class="exercise-card card mb-3 p-3">
                      <h4>تمرين ${idx + 1}: ${ex.title}</h4>
                      <p class="text-muted">${ex.instructions_markdown || ''}</p>
                      
                      <div class="ide-mini-editor mt-2">
                        <textarea id="code-ex-${ex.id}" class="form-input code-textarea" rows="6" dir="ltr">${ex.starter_code || ''}</textarea>
                        <div class="mt-2" style="display:flex;gap:0.5rem;align-items:center;">
                          <button class="btn btn-primary btn-sm btn-submit-exercise" data-id="${ex.id}">▶️ تشغيل وتصحيح الكود</button>
                          <div id="feedback-ex-${ex.id}" class="exercise-feedback" style="display:none;"></div>
                        </div>
                        <div id="output-ex-${ex.id}" class="exercise-output-terminal mt-2" style="display:none;"></div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <p class="text-muted text-center p-3">لا توجد تمارين تفاعلية مسجلة لهذا الدرس حالياً.</p>
              `}
            </div>

            <!-- Tab 3: Study Files -->
            <div id="tab-files" class="tab-pane p-4" style="display:none;">
              ${(lesson.files && lesson.files.length > 0) ? `
                <div class="study-files-list">
                  ${lesson.files.map(f => `
                    <div class="study-file-row card mb-2 p-3">
                      <div class="file-icon">${f.is_drive ? '📂' : '📄'}</div>
                      <div class="file-details">
                        <h4>${f.title}</h4>
                        <p class="text-muted">${f.description || ''}</p>
                        ${f.drive_notice ? `<div class="alert alert-info mt-1" style="font-size:0.8rem;padding:0.4rem 0.8rem;">ℹ️ ${f.drive_notice}</div>` : ''}
                      </div>
                      <div class="file-actions">
                        ${f.can_open ? `
                          <a href="${f.external_url || f.file_url}" target="_blank" class="btn btn-sm btn-outline-cyan">
                            ${f.is_drive ? 'فتح في Google Drive 🔗' : 'تحميل الملف 📥'}
                          </a>
                        ` : `
                          <span class="badge badge-warning">🔒 متاح للمشتركين</span>
                        `}
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <p class="text-muted text-center p-3">لا توجد ملفات أو مذكرات مرفقة بهذا الدرس.</p>
              `}
            </div>
          </div>
        </div>
      `;

      // Setup Tabs Switching
      container.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          container.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
          btn.classList.add('active');
          const targetTab = document.getElementById(`tab-${btn.dataset.tab}`);
          if (targetTab) targetTab.style.display = 'block';
        });
      });

      // Complete Lesson Listener
      const compBtn = document.getElementById('btn-complete-lesson');
      if (compBtn) {
        compBtn.addEventListener('click', async () => {
          try {
            await ApiClient.post(`/lessons/${lessonId}/progress`, {
              lesson_id: lessonId,
              is_completed: true,
              watch_percentage: 100.0
            });
            Toast.success('تهانينا! تم احتساب الدرس كمكتمل وإضافة 20 نقطة خبرة 🚀');
            compBtn.textContent = '✓ مكتمل بالفعل';
            compBtn.classList.remove('btn-success');
            compBtn.classList.add('btn-secondary');
          } catch (e) {
            Toast.error('تعذر تسجيل اكتمال الدرس');
          }
        });
      }

      // Exercise Submission Listeners
      container.querySelectorAll('.btn-submit-exercise').forEach(btn => {
        btn.addEventListener('click', async () => {
          const exId = btn.dataset.id;
          const code = document.getElementById(`code-ex-${exId}`).value;
          const fbEl = document.getElementById(`feedback-ex-${exId}`);
          const outEl = document.getElementById(`output-ex-${exId}`);

          btn.disabled = true;
          btn.textContent = 'جاري التحقق...';

          try {
            const res = await ApiClient.post(`/exercises/${exId}/submit`, { submitted_code: code });
            fbEl.style.display = 'block';
            outEl.style.display = 'block';

            if (res.status === 'PASSED') {
              fbEl.className = 'exercise-feedback text-success';
              fbEl.innerHTML = `✓ إجابة صحيحة! اجتاز ${res.tests_passed} من ${res.tests_total} اختبار (+15 XP) 🎉`;
            } else {
              fbEl.className = 'exercise-feedback text-danger';
              fbEl.innerHTML = `✕ الإجابة بحاجة لمراجعة (${res.tests_passed}/${res.tests_total} اختبارات اجتزت)`;
            }
            outEl.textContent = res.output || '[لا توجد مخرجات]';
          } catch (err) {
            Toast.error(err.message || 'فشل تشغيل الكود');
          } finally {
            btn.disabled = false;
            btn.textContent = '▶️ تشغيل وتصحيح الكود';
          }
        });
      });

    } catch (err) {
      console.error('Error rendering lesson view:', err);
      container.innerHTML = `<div class="card text-danger text-center p-4">حدث خطأ أثناء تحميل بيانات الدرس: ${err.message}</div>`;
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Standalone Code Playground (Online IDE)
  // ---------------------------------------------------------------------------
  static renderPlayground(container) {
    container.innerHTML = `
      <div class="playground-page">
        <div class="page-header mb-3" style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div class="page-badge">بيئة التطبيق العملي</div>
            <h1 class="page-title">محرر الأكواد السحابي (CodeSpark IDE) 💻</h1>
          </div>
          <div style="display:flex;gap:0.5rem;">
            <select id="ide-language-select" class="form-input" style="width:auto;">
              <option value="python">Python 3 (بايثون)</option>
              <option value="javascript">JavaScript (جافاسكريبت)</option>
              <option value="html">HTML5 / CSS (تصميم الويب)</option>
            </select>
            <button id="ide-run-btn" class="btn btn-primary glow-effect">▶️ تشغيل الكود (Run)</button>
            <button id="ide-reset-btn" class="btn btn-secondary">🔄 استعادة القالب</button>
          </div>
        </div>

        <div class="playground-ide-layout">
          <!-- Code Editor Section -->
          <div class="playground-editor-section" style="flex: 1;">
            <div class="editor-top-bar" style="background:#090E1A;padding:0.5rem 1rem;border-bottom:1px solid var(--color-border);display:flex;justify-content:space-between;color:var(--color-text-muted);font-size:0.85rem;">
              <span>محرر الكود</span>
              <span id="ide-status-indicator">جاهز للتشغيل</span>
            </div>
            <textarea id="ide-code-editor" class="ide-code-textarea" dir="ltr" spellcheck="false"># اكتب كود بايثون هنا وجربه مباشرة
def welcome():
    student = "طالب كود سبارك"
    print(f"مرحباً بك {student} في بيئة بايثون التفاعلية! ⚡")
    print("CodeSpark Online IDE is ready.")

welcome()
</textarea>
          </div>

          <!-- Drag Divider -->
          <div class="playground-drag-divider">
            <div class="handle-bar"></div>
          </div>

          <!-- Console Terminal Section -->
          <div class="playground-terminal-section" style="height: 250px;">
            <div class="terminal-top-bar" style="background:#090E1A;padding:0.5rem 1rem;border-bottom:1px solid var(--color-border);display:flex;justify-content:space-between;color:var(--color-text-muted);font-size:0.85rem;">
              <span>شاشة المخرجات (Console Output)</span>
              <button id="ide-clear-terminal-btn" class="btn btn-sm btn-secondary" style="padding:2px 8px;font-size:0.75rem;">مسح الشاشة</button>
            </div>
            <pre id="ide-console-output" class="terminal-console-output" dir="ltr">[انقر على 'تشغيل الكود' لعرض المخرجات هنا...]</pre>
          </div>
        </div>
      </div>
    `;

    const codeEditor = document.getElementById('ide-code-editor');
    const consoleOutput = document.getElementById('ide-console-output');
    const runBtn = document.getElementById('ide-run-btn');
    const resetBtn = document.getElementById('ide-reset-btn');
    const clearBtn = document.getElementById('ide-clear-terminal-btn');
    const langSelect = document.getElementById('ide-language-select');
    const statusInd = document.getElementById('ide-status-indicator');

    const templates = {
      python: `# كود بايثون التأسيسي\nprint("Hello, CodeSpark!")\nfor i in range(1, 6):\n    print(f"Counting: {i}")\n`,
      javascript: `// كود جافاسكريبت\nconst message = "Hello from CodeSpark!";\nconsole.log(message);\nconsole.log("Calculated:", 5 * 20);\n`,
      html: `<!-- هيكل صفحة HTML5 -->\n<div style="font-family:sans-serif;text-align:center;padding:2rem;">\n  <h1 style="color:#0EA5E9;">منصة CodeSpark</h1>\n  <p>معاينة فورية لتصميم الويب في المتصفح</p>\n</div>\n`
    };

    langSelect.addEventListener('change', () => {
      const selected = langSelect.value;
      codeEditor.value = templates[selected] || '';
    });

    resetBtn.addEventListener('click', () => {
      codeEditor.value = templates[langSelect.value] || '';
      consoleOutput.textContent = '[تم استعادة القالب الأولي]';
    });

    clearBtn.addEventListener('click', () => {
      consoleOutput.textContent = '';
    });

    runBtn.addEventListener('click', async () => {
      const code = codeEditor.value;
      const lang = langSelect.value;

      runBtn.disabled = true;
      runBtn.textContent = 'جاري التنفيذ...';
      statusInd.textContent = 'جاري المعالجة...';

      try {
        const res = await ApiClient.post('/playground/run', { language: lang, code: code });
        if (res.success) {
          consoleOutput.textContent = res.output || '[انتهى التنفيذ بدون مخرجات]';
          consoleOutput.style.color = '#E0F2FE';
          statusInd.textContent = `اكتمل في ${res.execution_time_ms}ms ✓`;
        } else {
          consoleOutput.textContent = res.error || res.stderr || 'حدث خطأ أثناء التشغيل';
          consoleOutput.style.color = '#F87171';
          statusInd.textContent = 'فشل التشغيل ✕';
        }
      } catch (err) {
        consoleOutput.textContent = err.message || 'تعذر الاتصال بالخادم لتشغيل الكود';
        consoleOutput.style.color = '#F87171';
      } finally {
        runBtn.disabled = false;
        runBtn.textContent = '▶️ تشغيل الكود (Run)';
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 5. Tests & Periodic Exams
  // ---------------------------------------------------------------------------
  static async renderExams(container) {
    container.innerHTML = `
      <div class="student-exams-page">
        <div class="page-header mb-4">
          <div class="page-badge">التقييم المستمر</div>
          <h1 class="page-title">الامتحانات الدورية والتقييمات 📝</h1>
          <p class="text-muted">اختبارات إلكترونية تفاعلية تحاكي نظام امتحانات التابلت المدرسي مع تقييم ودرجات فورية.</p>
        </div>

        <div id="exams-list-container" class="grid grid-2 mb-4">
          <div class="text-center text-muted" style="grid-column:1/-1;padding:2rem;">جاري تحميل قائمة الامتحانات...</div>
        </div>

        <!-- Exam History Table -->
        <div class="card p-4">
          <h3 class="card-title mb-3">سجل محاولاتك السابقة 📋</h3>
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>الامتحان</th>
                  <th>الدرجة</th>
                  <th>النسبة المئوية</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody id="exam-attempts-tbody">
                <tr><td colspan="5" class="text-center text-muted">جاري تحميل سجل الاختبارات...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Exam Attempt Modal Shell -->
        <div id="exam-runner-modal" class="modal-wrapper" style="display:none;">
          <div class="modal-content exam-modal-box">
            <div id="exam-modal-body"></div>
          </div>
        </div>
      </div>
    `;

    try {
      const [examsRes, attemptsRes] = await Promise.all([
        ApiClient.get('/exams'),
        ApiClient.get('/exams/attempts/my').catch(() => ({ attempts: [] }))
      ]);

      const exams = ApiClient.extractList(examsRes, 'exams');
      const attempts = ApiClient.extractList(attemptsRes, 'attempts');

      // Populate Exams Cards
      const examsGrid = document.getElementById('exams-list-container');
      if (examsGrid) {
        if (!exams || exams.length === 0) {
          examsGrid.innerHTML = '<div class="card text-center text-muted" style="grid-column:1/-1;padding:2rem;">لا توجد امتحانات منشورة حالياً.</div>';
        } else {
          examsGrid.innerHTML = exams.map(e => `
            <div class="card exam-card p-4">
              <div class="exam-header-line">
                <span class="badge badge-info">${e.course_title || 'منهج الحاسب'}</span>
                <span class="text-muted">⏱️ ${e.duration_minutes} دقيقة</span>
              </div>
              <h3 class="mt-2">${e.title}</h3>
              <p class="text-muted mt-1">${e.description || ''}</p>
              <div class="exam-meta-footer mt-3" style="display:flex;justify-content:space-between;align-items:center;">
                <span>درجة النجاح: ${e.passing_score}%</span>
                <button class="btn btn-primary btn-start-exam" data-id="${e.id}">ابدأ الاختبار الآن ⚡</button>
              </div>
            </div>
          `).join('');
        }
      }

      // Populate Attempts Table
      const attemptsTbody = document.getElementById('exam-attempts-tbody');
      if (attemptsTbody) {
        if (!attempts || attempts.length === 0) {
          attemptsTbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">لم تقم بأداء أي اختبارات سابقة حتى الآن.</td></tr>';
        } else {
          attemptsTbody.innerHTML = attempts.map(a => `
            <tr>
              <td><strong>${a.exam_title || 'امتحان تقييمي'}</strong></td>
              <td>${a.score} / ${a.total_possible}</td>
              <td><strong>${a.percentage}%</strong></td>
              <td>
                <span class="badge ${a.is_passed ? 'badge-success' : 'badge-danger'}">
                  ${a.is_passed ? 'ناجح ✓' : 'بحاجة لإعادة'}
                </span>
              </td>
              <td>${new Date(a.completed_at || a.started_at).toLocaleDateString('ar-EG')}</td>
            </tr>
          `).join('');
        }
      }

      // Attach Start Exam Listeners
      document.querySelectorAll('.btn-start-exam').forEach(btn => {
        btn.addEventListener('click', () => StudentPages.launchExamRunner(btn.dataset.id));
      });

    } catch (err) {
      console.error('Error loading exams:', err);
    }
  }

  // Helper: Interactive Exam Runner Modal
  static async launchExamRunner(examId) {
    const modal = document.getElementById('exam-runner-modal');
    const modalBody = document.getElementById('exam-modal-body');
    modal.style.display = 'flex';
    modalBody.innerHTML = '<div class="text-center p-4"><div class="spinner"></div><p>جاري تحميل أسئلة الامتحان...</p></div>';

    try {
      const exam = await ApiClient.get(`/exams/${examId}`);
      const questions = exam.questions || [];

      if (questions.length === 0) {
        modalBody.innerHTML = `
          <div class="text-center p-4">
            <h3>لا توجد أسئلة مسجلة في هذا الامتحان بعد</h3>
            <button class="btn btn-secondary mt-3" onclick="document.getElementById('exam-runner-modal').style.display='none'">إغلاق</button>
          </div>
        `;
        return;
      }

      let userAnswers = {};

      modalBody.innerHTML = `
        <div class="exam-runner-header" style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--color-border);padding-bottom:1rem;margin-bottom:1.5rem;">
          <div>
            <h2>${exam.title}</h2>
            <span class="text-muted">عدد الأسئلة: ${questions.length} أسئلة</span>
          </div>
          <button class="btn btn-sm btn-secondary" id="close-exam-modal-btn">✕ إلغاء</button>
        </div>

        <form id="form-run-exam">
          <div class="questions-scroll-area">
            ${questions.map((q, idx) => `
              <div class="card question-item-card mb-3 p-3">
                <div class="question-num-pill mb-2">السؤال ${idx + 1} (${q.assigned_points || 5} درجات)</div>
                <h4 class="mb-3">${q.question_text}</h4>
                
                <div class="options-list">
                  ${(q.options || []).map(opt => `
                    <label class="option-label">
                      <input type="radio" name="question_${q.id}" value="${opt.id}" required>
                      <span>${opt.text}</span>
                    </label>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>

          <div class="exam-footer-actions mt-3" style="display:flex;justify-content:space-between;align-items:center;">
            <button type="submit" class="btn btn-success btn-lg glow-effect">اعتماد وتسليم الإجابات 🏁</button>
          </div>
        </form>
      `;

      document.getElementById('close-exam-modal-btn').addEventListener('click', () => {
        if (confirm('هل أنت متأكد من إلغاء الاختبار؟ لن يتم حفظ إجاباتك الحالية.')) {
          modal.style.display = 'none';
        }
      });

      document.getElementById('form-run-exam').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Gather answers
        const answers = {};
        questions.forEach(q => {
          const selected = document.querySelector(`input[name="question_${q.id}"]:checked`);
          if (selected) {
            answers[q.id] = selected.value;
          }
        });

        modalBody.innerHTML = '<div class="text-center p-5"><div class="spinner"></div><p>جاري تصحيح إجاباتك واحتساب النتيجة...</p></div>';

        try {
          const submitRes = await ApiClient.post(`/exams/${examId}/submit`, { answers });
          const attempt = submitRes.attempt;

          modalBody.innerHTML = `
            <div class="exam-result-card text-center p-4">
              <div style="font-size:3.5rem;margin-bottom:1rem;">${attempt.is_passed ? '🎉' : '📚'}</div>
              <h2>${attempt.is_passed ? 'تهانينا! لقد اجتزت الامتحان بنجاح' : 'انتهى الاختبار - بحاجة لإعادة المحاولة'}</h2>
              <div class="result-score-highlight mt-2" style="font-size:2.5rem;font-weight:900;color:var(--color-cyan-accent);">
                ${attempt.score} / ${attempt.total_possible}
              </div>
              <p class="mt-1" style="font-size:1.2rem;">النسبة المئوية: <strong>${attempt.percentage}%</strong></p>
              
              <div class="alert ${attempt.is_passed ? 'alert-success' : 'alert-warning'} mt-3">
                ${attempt.is_passed ? 'أحسنت صنعاً! تم تسجيل درجاتك وإضافة نقاط الخبرة إلى ملفك الشخصي 🚀' : 'لم تصل لدرجة النجاح المطلوبة. راجع الدرس وحاول مجدداً!'}
              </div>

              <button class="btn btn-primary mt-4" onclick="document.getElementById('exam-runner-modal').style.display='none';window.location.reload();">
                إغلاق والعودة للامتحانات
              </button>
            </div>
          `;
        } catch (err) {
          Toast.error(err.message || 'فشل تسليم الامتحان');
        }
      });

    } catch (err) {
      modalBody.innerHTML = `<div class="card text-danger text-center p-4">تعذر تحميل بيانات الامتحان: ${err.message}</div>`;
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Study Files Page ("الملفات الدراسية")
  // ---------------------------------------------------------------------------
  static async renderStudyFiles(container) {
    container.innerHTML = `
      <div class="student-files-page">
        <div class="page-header mb-4">
          <div class="page-badge">المكتبة الرقمية</div>
          <h1 class="page-title">الملفات الدراسية والمذكرات التعليمية 📁</h1>
          <p class="text-muted">مذكرات الشرح بصيغة PDF وروابط Google Drive المعتمدة لمقررات البرمجة الثانوية.</p>
        </div>

        <div id="study-files-list-container">
          <div class="text-center text-muted" style="padding:3rem;">جاري تحميل الملفات والمذكرات...</div>
        </div>
      </div>
    `;

    try {
      const res = await ApiClient.get('/study-files');
      const files = ApiClient.extractList(res, 'files');
      const listEl = document.getElementById('study-files-list-container');

      if (!files || files.length === 0) {
        listEl.innerHTML = '<div class="card text-center text-muted" style="padding:3rem;">لا توجد ملفات دراسية منشورة حالياً.</div>';
        return;
      }

      listEl.innerHTML = `
        <div class="grid grid-2">
          ${files.map(f => `
            <div class="card file-display-card p-4">
              <div class="file-card-top" style="display:flex;gap:1rem;align-items:flex-start;">
                <div class="file-icon-box" style="font-size:2rem;">${f.is_drive ? '📂' : '📄'}</div>
                <div style="flex:1;">
                  <h3 class="file-title mb-1">${f.title}</h3>
                  <p class="text-muted" style="font-size:0.9rem;">${f.description || ''}</p>
                  ${f.drive_notice ? `<div class="alert alert-info mt-2" style="font-size:0.8rem;padding:0.4rem 0.8rem;">ℹ️ ${f.drive_notice}</div>` : ''}
                </div>
              </div>

              <div class="file-card-bottom mt-3" style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--color-border);padding-top:0.75rem;">
                <span class="text-muted" style="font-size:0.8rem;">
                  ${f.is_drive ? 'Google Drive Link' : (f.file_size ? `${(f.file_size / (1024*1024)).toFixed(1)} MB` : 'ملف مرفوع')}
                </span>
                <div>
                  ${f.can_open ? `
                    <a href="${f.external_url || f.file_url}" target="_blank" class="btn btn-sm btn-primary">
                      ${f.is_drive ? 'فتح في Google Drive ↗' : 'تحميل المذكرة 📥'}
                    </a>
                  ` : `
                    <a href="#/student/subscription" class="btn btn-sm btn-outline-cyan">🔒 متاح للمشتركين</a>
                  `}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      console.error('Error loading study files:', err);
      document.getElementById('study-files-list-container').innerHTML = '<div class="card text-danger text-center">تعذر تحميل الملفات الدراسية.</div>';
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Subscription Plans & Activation
  // ---------------------------------------------------------------------------
  static async renderSubscriptionPage(container) {
    container.innerHTML = `
      <div class="student-subscription-page">
        <div class="page-header mb-4">
          <div class="page-badge">الاشتراكات والتفعيل</div>
          <h1 class="page-title">باقات الاشتراك وتفعيل الحساب ⭐</h1>
          <p class="text-muted">فعل حسابك عبر إدخال كود التفعيل أو تحويل رسوم الباقة وتأكيد الطلب.</p>
        </div>

        <!-- Current Status Card -->
        <div class="card p-4 mb-4" id="current-sub-status-card">
          <h3>حالة اشتراكك الحالي</h3>
          <div id="sub-status-loading" class="text-muted mt-2">جاري التحقق من الاشتراك...</div>
        </div>

        <!-- Section 1: Redeem Code Form -->
        <div class="card p-4 mb-4">
          <h3 class="mb-2">🔑 تفعيل كود الاشتراك المباشر</h3>
          <p class="text-muted mb-3">إذا حصلت على كود اشتراك من المشرف العام أو المساعد التعليمي، أدخله هنا للتفعيل الفوري.</p>
          
          <form id="form-redeem-code" style="display:flex;gap:1rem;max-width:500px;">
            <input type="text" id="input-redeem-code" class="form-input" placeholder="مثال: CS-SPARK-2026" dir="ltr" required>
            <button type="submit" class="btn btn-primary glow-effect" id="btn-redeem-submit">تفعيل الكود</button>
          </form>
          <div id="redeem-feedback" class="mt-2" style="display:none;"></div>
        </div>

        <!-- Section 2: Available Plans -->
        <div class="section-header mb-3">
          <h2>باقات الاشتراك المتاحة</h2>
          <p class="text-muted">اختر الباقة المناسبة وقم بالتحويل عبر إحدى الطرق المعتمدة أدناه</p>
        </div>
        <div id="sub-page-plans-grid" class="grid grid-3 mb-4">
          <div class="text-center text-muted" style="grid-column:1/-1;padding:2rem;">جاري تحميل الباقات...</div>
        </div>

        <!-- Section 3: Payment Details -->
        <div class="card p-4 mb-4">
          <h3 class="mb-3">📱 بيانات وطرق التحويل المعتمدة</h3>
          <div class="payment-methods-grid">
            <div class="payment-box">
              <div class="box-title">🔴 محفظة فودافون كاش (Vodafone Cash)</div>
              <div class="box-content">
                قم بالتحويل إلى رقم المحفظة:
                <div class="phone-highlight" id="pay-box-voda">+20159159038</div>
              </div>
            </div>
            <div class="payment-box">
              <div class="box-title">⚡ تطبيق إنستاباي (InstaPay)</div>
              <div class="box-content">
                التحويل لرقم الهاتف أو المعرف:
                <div class="phone-highlight" id="pay-box-insta">+20159159038</div>
                <a id="pay-box-insta-link" href="https://ipn.eg/S/moazasem/instapay/27DsGj" target="_blank" class="btn btn-sm btn-outline-cyan mt-2">فتح إنستاباي المباشر 🔗</a>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 4: Submit Payment Request Form -->
        <div class="card p-4 mb-4">
          <h3 class="mb-2">📥 تأكيد التحويل وطلب تفعيل الاشتراك</h3>
          <p class="text-muted mb-4">بعد إتمام التحويل، املأ البيانات التالية وسيقوم المشرف باعتماد طلبك وتفعيل الحساب فورياً.</p>

          <form id="form-submit-request">
            <div class="grid grid-2">
              <div class="form-group">
                <label class="form-label">اختر الباقة التي قمت بالتحويل لها *</label>
                <select id="req-plan-select" class="form-input" required>
                  <option value="">-- اختر باقة الاشتراك --</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">طريقة الدفع المستخدمة *</label>
                <select id="req-method-select" class="form-input" required>
                  <option value="فودافون كاش">فودافون كاش (Vodafone Cash)</option>
                  <option value="إنستاباي">تطبيق إنستاباي (InstaPay)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">رقم الهاتف الذي قمت بالتحويل منه *</label>
                <input type="text" id="req-phone-input" class="form-input" placeholder="010XXXXXXXX" required>
              </div>
              <div class="form-group">
                <label class="form-label">رقم العملية أو المرجع (Reference No)</label>
                <input type="text" id="req-ref-input" class="form-input" placeholder="الرقم المرجعي للإشعار إن وجد">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">ملاحظات إضافية</label>
              <textarea id="req-notes-input" class="form-input" rows="2" placeholder="أي تفاصيل أخرى بخصوص عملية التحويل"></textarea>
            </div>
            <button type="submit" class="btn btn-primary btn-lg" id="btn-submit-req">إرسال طلب التفعيل الآن 🚀</button>
          </form>
        </div>

        <!-- Section 5: Student Requests Table -->
        <div class="card p-4">
          <h3 class="card-title mb-3">سجل طلبات الاشتراكات السابقة</h3>
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>الباقة</th>
                  <th>طريقة الدفع</th>
                  <th>رقم التحويل</th>
                  <th>المرجع</th>
                  <th>الحالة</th>
                  <th>تاريخ الإرسال</th>
                </tr>
              </thead>
              <tbody id="student-requests-tbody">
                <tr><td colspan="6" class="text-center text-muted">جاري تحميل طلباتك السابقة...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Load dynamic data
    try {
      const [statusRes, plansRes, payRes, reqsRes] = await Promise.all([
        ApiClient.get('/subscriptions/my-status').catch(() => ({})),
        ApiClient.get('/subscriptions/plans'),
        ApiClient.get('/payment-settings').catch(() => ({})) || ApiClient.get('/subscriptions/payment-info').catch(() => ({})),
        ApiClient.get('/subscriptions/requests').catch(() => ({ requests: [] }))
      ]);

      // Status card
      const statusLoading = document.getElementById('sub-status-loading');
      if (statusLoading) {
        if (statusRes.is_subscribed) {
          statusLoading.innerHTML = `
            <div class="alert alert-success mt-2">
              <strong>اشتراكك نشط حالياً! (${statusRes.plan_name}) 🎓</strong>
              <div>تاريخ الانتهاء: ${statusRes.expires_at ? new Date(statusRes.expires_at).toLocaleDateString('ar-EG') : 'اشتراك مفتوح المدى'}</div>
            </div>
          `;
        } else {
          statusLoading.innerHTML = `
            <div class="alert alert-warning mt-2">
              <strong>أنت تستخدم حالياً الحساب المجاني</strong>
              <div>قم بتفعيل كود أو تقديم طلب اشتراك لفتح كافة مميزات المنصة.</div>
            </div>
          `;
        }
      }

      // Payment Box Data
      if (payRes) {
        const v = payRes.vodafone_cash || payRes.payment_phone || '+20159159038';
        const i = payRes.instapay_phone || '+20159159038';
        const l = payRes.instapay_link || 'https://ipn.eg/S/moazasem/instapay/27DsGj';
        document.getElementById('pay-box-voda').textContent = v;
        document.getElementById('pay-box-insta').textContent = i;
        document.getElementById('pay-box-insta-link').href = l;
      }

      // Plans grid & select dropdown
      const plans = ApiClient.extractList(plansRes, 'plans');
      const plansGrid = document.getElementById('sub-page-plans-grid');
      const planSelect = document.getElementById('req-plan-select');

      if (plansGrid && plans.length > 0) {
        plansGrid.innerHTML = plans.map(p => `
          <div class="card plan-card ${p.duration_months === 3 ? 'plan-featured' : ''}">
            ${p.duration_months === 3 ? '<div class="plan-badge">الأكثر طلباً ⭐</div>' : ''}
            <h3 class="plan-title">${p.name}</h3>
            <div class="plan-price">
              <span class="price-amount">${p.price}</span>
              <span class="price-currency">ج.م</span>
            </div>
            <div class="plan-duration">لمدة ${p.duration_months} شهر</div>
            <ul class="plan-features">
              ${(p.features || []).map(f => `<li>✓ ${f}</li>`).join('')}
            </ul>
          </div>
        `).join('');

        plans.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = `${p.name} - ${p.price} ج.م`;
          planSelect.appendChild(opt);
        });
      }

      // Requests Table
      const reqs = ApiClient.extractList(reqsRes, 'requests');
      const tbody = document.getElementById('student-requests-tbody');
      if (tbody) {
        if (!reqs || reqs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">لم تقم بإرسال أي طلبات اشتراك بعد.</td></tr>';
        } else {
          const statusMap = {
            pending: '<span class="badge badge-warning">قيد المراجعة ⏳</span>',
            approved: '<span class="badge badge-success">تم الاعتماد والتفعيل ✓</span>',
            rejected: '<span class="badge badge-danger">مرفوض ✕</span>'
          };
          tbody.innerHTML = reqs.map(r => `
            <tr>
              <td><strong>${r.plan_name || 'باقة'}</strong></td>
              <td>${r.payment_method}</td>
              <td>${r.payment_number}</td>
              <td><code>${r.payment_reference || '—'}</code></td>
              <td>${statusMap[r.status] || r.status}</td>
              <td>${new Date(r.created_at).toLocaleDateString('ar-EG')}</td>
            </tr>
          `).join('');
        }
      }

    } catch (err) {
      console.error('Error loading subscription page:', err);
    }

    // Code Redemption Handler
    document.getElementById('form-redeem-code')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const codeInput = document.getElementById('input-redeem-code');
      const code = codeInput.value.trim().toUpperCase();
      const fb = document.getElementById('redeem-feedback');
      const submitBtn = document.getElementById('btn-redeem-submit');

      fb.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري التفعيل...';

      try {
        const res = await ApiClient.post('/subscriptions/activate', { code });
        Toast.success(res.message || 'تم تفعيل كود الاشتراك بنجاح! 🚀');
        fb.style.display = 'block';
        fb.className = 'alert alert-success mt-2';
        fb.textContent = res.message || 'تم تفعيل الاشتراك بنجاح!';
        codeInput.value = '';
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        fb.style.display = 'block';
        fb.className = 'alert alert-danger mt-2';
        fb.textContent = err.message || 'كود الاشتراك غير صالح أو تم استخدامه';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'تفعيل الكود';
      }
    });

    // Payment Request Handler
    document.getElementById('form-submit-request')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const planId = document.getElementById('req-plan-select').value;
      const method = document.getElementById('req-method-select').value;
      const phone = document.getElementById('req-phone-input').value.trim();
      const ref = document.getElementById('req-ref-input').value.trim();
      const notes = document.getElementById('req-notes-input').value.trim();
      const submitBtn = document.getElementById('btn-submit-req');

      if (!planId) {
        Toast.error('يرجى اختيار الباقة');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري إرسال الطلب...';

      try {
        const res = await ApiClient.post('/subscriptions/requests', {
          plan_id: planId,
          payment_method: method,
          payment_number: phone,
          payment_reference: ref,
          notes: notes
        });
        Toast.success(res.message || 'تم إرسال الطلب بنجاح');
        document.getElementById('form-submit-request').reset();
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        Toast.error(err.message || 'فشل إرسال طلب الاشتراك');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'إرسال طلب التفعيل الآن 🚀';
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 8. Student Account & Security Settings (Verified Password Change)
  // ---------------------------------------------------------------------------
  static async renderSettings(container) {
    const user = AuthService.getUser() || {};
    container.innerHTML = `
      <div class="student-settings-page" style="max-width:700px;margin:0 auto;">
        <div class="page-header mb-4">
          <div class="page-badge">إعدادات الحساب</div>
          <h1 class="page-title">إعدادات الحساب والأمان ⚙️</h1>
          <p class="text-muted">قم بتعديل بياناتك الشخصية وتغيير كلمة المرور الخاصة بحسابك.</p>
        </div>

        <!-- Profile Update Card -->
        <div class="card p-4 mb-4">
          <h3 class="mb-3">البيانات الشخصية</h3>
          <form id="form-student-profile">
            <div class="form-group">
              <label class="form-label">الاسم بالكامل</label>
              <input type="text" id="std-prof-name" class="form-input" value="${user.full_name || ''}" required>
            </div>
            <div class="form-group">
              <label class="form-label">اسم المستخدم (غير قابل للتعديل)</label>
              <input type="text" class="form-input" value="${user.username || ''}" disabled>
            </div>
            <div class="form-group">
              <label class="form-label">البريد الإلكتروني</label>
              <input type="email" id="std-prof-email" class="form-input" value="${user.email || ''}" required>
            </div>
            <div class="form-group">
              <label class="form-label">رقم الهاتف</label>
              <input type="tel" id="std-prof-phone" class="form-input" value="${user.phone || ''}" placeholder="010XXXXXXXX">
            </div>
            <button type="submit" class="btn btn-primary" id="btn-save-profile">حفظ تعديلات البيانات</button>
          </form>
        </div>

        <!-- Verified Password Change Card -->
        <div class="card p-4">
          <h3 class="mb-2">تغيير كلمة المرور 🔒</h3>
          <p class="text-muted mb-3" style="font-size:0.9rem;">
            تأكد من اختيار كلمة مرور قوية لا تقل عن 6 خانات، وسيتم حفظها بشكل دائم ومباشر في قاعدة البيانات.
          </p>

          <form id="form-student-password">
            <div class="form-group">
              <label class="form-label" for="std-pw-cur">كلمة المرور الحالية *</label>
              <input type="password" id="std-pw-cur" class="form-input" placeholder="••••••••" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="std-pw-new">كلمة المرور الجديدة *</label>
              <input type="password" id="std-pw-new" class="form-input" placeholder="6 أحرف على الأقل" minlength="6" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="std-pw-conf">تأكيد كلمة المرور الجديدة *</label>
              <input type="password" id="std-pw-conf" class="form-input" placeholder="••••••••" minlength="6" required>
            </div>

            <div id="pw-change-feedback" class="alert mt-2" style="display:none;"></div>

            <button type="submit" class="btn btn-primary mt-3" id="btn-change-pw-submit">
              تغيير كلمة المرور وحفظها 🔒
            </button>
          </form>
        </div>
      </div>
    `;

    // Profile Update Listener
    document.getElementById('form-student-profile')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('std-prof-name').value.trim();
      const email = document.getElementById('std-prof-email').value.trim();
      const phone = document.getElementById('std-prof-phone').value.trim();
      const btn = document.getElementById('btn-save-profile');

      btn.disabled = true;
      btn.textContent = 'جاري الحفظ...';

      try {
        const res = await ApiClient.put('/users/profile', { full_name: name, email: email, phone: phone });
        Toast.success(res.message || 'تم تحديث البيانات بنجاح! 🚀');
        await AuthService.refreshProfile();
      } catch (err) {
        Toast.error(err.message || 'فشل تحديث البيانات');
      } finally {
        btn.disabled = false;
        btn.textContent = 'حفظ تعديلات البيانات';
      }
    });

    // Password Change Listener (Guaranteed Persistent Update)
    document.getElementById('form-student-password')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const cur = document.getElementById('std-pw-cur').value;
      const nw = document.getElementById('std-pw-new').value;
      const conf = document.getElementById('std-pw-conf').value;
      const fb = document.getElementById('pw-change-feedback');
      const submitBtn = document.getElementById('btn-change-pw-submit');

      fb.style.display = 'none';

      if (nw !== conf) {
        fb.className = 'alert alert-danger';
        fb.textContent = 'كلمة المرور الجديدة وتأكيدها غير متطابقين!';
        fb.style.display = 'block';
        return;
      }

      if (nw.length < 6) {
        fb.className = 'alert alert-danger';
        fb.textContent = 'يجب أن تتكون كلمة المرور الجديدة من 6 خانات على الأقل!';
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
        fb.textContent = res.message || 'تم تحديث وحفظ كلمة المرور بنجاح في قاعدة البيانات!';
        fb.style.display = 'block';
        document.getElementById('form-student-password').reset();
      } catch (err) {
        fb.className = 'alert alert-danger';
        fb.textContent = err.message || 'فشل تغيير كلمة المرور. تحقق من كلمة المرور الحالية';
        fb.style.display = 'block';
        Toast.error(err.message || 'فشل تغيير كلمة المرور');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'تغيير كلمة المرور وحفظها 🔒';
      }
    });
  }
}
