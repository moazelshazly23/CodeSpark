/**
 * Code Spark - Student Portal Pages Controller
 * Dynamic dashboard, interactive curriculum, video player, coding playground,
 * dynamic subscriptions, study files, exams, and profile settings.
 */
import ApiClient from '../api/apiClient.js';
import { Toast, Modal } from '../components/ui.js';
import AuthService from '../auth/authService.js';

export class StudentPages {

  // =========================================================================
  // 1. STUDENT DASHBOARD
  // =========================================================================
  static async renderDashboard(container) {
    const user = AuthService.getUser() || {};

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">مرحبًا بك، ${user.full_name || user.username} 👋</h1>
          <p class="page-subtitle">لوحة المتابعة الأكاديمية والتعلم الذاتي لمادة البرمجة</p>
        </div>
        <div style="display:flex;gap:0.75rem;">
          <a href="#/student/courses" class="btn btn-primary">📚 استكمال المنهج</a>
          <a href="#/student/playground" class="btn btn-secondary">💻 محرر الأكواد</a>
        </div>
      </div>

      <!-- Subscription Alert Banner (if free) -->
      <div id="sub-status-alert" style="display:none;margin-bottom:1.5rem;"></div>

      <!-- Student Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(14,165,233,0.15);color:var(--color-primary);">⚡</div>
          <div>
            <div class="stat-val" id="std-stat-xp">50</div>
            <div class="stat-label">نقاط الخبرة (XP)</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(245,158,11,0.15);color:var(--color-warning);">🔥</div>
          <div>
            <div class="stat-val" id="std-stat-streak">1</div>
            <div class="stat-label">أيام الحماس المتتالية</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(16,185,129,0.15);color:var(--color-success);">✅</div>
          <div>
            <div class="stat-val" id="std-stat-lessons">0</div>
            <div class="stat-label">الدروس المكتملة</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(139,92,246,0.15);color:#8B5CF6;">⭐</div>
          <div>
            <div class="stat-val" id="std-stat-sub">مجاني</div>
            <div class="stat-label">حالة الاشتراك</div>
          </div>
        </div>
      </div>

      <!-- Main Columns: Announcements & Courses -->
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:1.5rem;margin-top:2rem;">
        <!-- Left: Announcements & Notices -->
        <div>
          <div class="card" style="margin-bottom:1.5rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
              <h3 style="font-size:1.15rem;font-weight:700;margin:0;display:flex;align-items:center;gap:0.5rem;">
                <span>📢</span> التنبيهات والإعلانات العامة
              </h3>
            </div>
            <div id="student-announcements-container" style="display:flex;flex-direction:column;gap:1rem;">
              <div style="text-align:center;padding:1.5rem;color:var(--color-text-muted);">جاري تحميل الإعلانات...</div>
            </div>
          </div>

          <div class="card">
            <h3 style="font-size:1.15rem;font-weight:700;margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;">
              <span>📚</span> المناهج الدراسية المقررة
            </h3>
            <div id="student-courses-quick-list" style="display:flex;flex-direction:column;gap:0.75rem;">
              <div style="text-align:center;padding:1.5rem;color:var(--color-text-muted);">جاري تحميل المناهج...</div>
            </div>
          </div>
        </div>

        <!-- Right: Quick Shortcuts & Resources -->
        <div>
          <div class="card" style="margin-bottom:1.5rem;">
            <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;">
              <span>🚀</span> روابط سريعة
            </h3>
            <div style="display:flex;flex-direction:column;gap:0.75rem;">
              <a href="#/student/courses" class="btn btn-secondary" style="justify-content:flex-start;">📖 تصفح الدروس والمناهج</a>
              <a href="#/student/files" class="btn btn-secondary" style="justify-content:flex-start;">📁 المذكرات وملفات الشرح</a>
              <a href="#/student/playground" class="btn btn-secondary" style="justify-content:flex-start;">💻 محرر بايثون التفاعلي</a>
              <a href="#/student/exams" class="btn btn-secondary" style="justify-content:flex-start;">📝 الامتحانات الدورية</a>
              <a href="#/student/subscription" class="btn btn-secondary" style="justify-content:flex-start;">⭐ باقات الاشتراك وتفعيل الكود</a>
            </div>
          </div>

          <div class="card">
            <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:0.75rem;display:flex;align-items:center;gap:0.5rem;">
              <span>💡</span> نصيحة المذاكرة
            </h3>
            <p style="color:var(--color-text-muted);font-size:0.9rem;line-height:1.6;margin:0;">
              البرمجة مهارة عملية تتطور بالممارسة اليومية. جرب تطبيق الأكواد البرمجية بنفسك في <strong>محرر الأكواد</strong> بعد كل درس فيديو.
            </p>
          </div>
        </div>
      </div>
    `;

    try {
      const [prog, mySub, annRes, crsRes] = await Promise.all([
        ApiClient.get('/progress/summary').catch(() => ({ xp: 50, streak_days: 1, completed_lessons: 0 })),
        ApiClient.get('/subscriptions/my-status').catch(() => ({ is_subscribed: false })),
        ApiClient.get('/announcements').catch(() => ({ announcements: [] })),
        ApiClient.get('/courses').catch(() => ({ courses: [] }))
      ]);

      // Update KPIs
      if (document.getElementById('std-stat-xp')) document.getElementById('std-stat-xp').textContent = prog.xp || 50;
      if (document.getElementById('std-stat-streak')) document.getElementById('std-stat-streak').textContent = prog.streak_days || 1;
      if (document.getElementById('std-stat-lessons')) document.getElementById('std-stat-lessons').textContent = prog.completed_lessons || 0;
      if (document.getElementById('std-stat-sub')) {
        document.getElementById('std-stat-sub').textContent = mySub.is_subscribed ? 'مشترك ⭐' : 'مجاني';
        if (mySub.is_subscribed) document.getElementById('std-stat-sub').style.color = 'var(--color-success)';
      }

      // Subscription Alert Banner
      const subAlert = document.getElementById('sub-status-alert');
      if (subAlert && !mySub.is_subscribed) {
        subAlert.style.display = 'block';
        subAlert.innerHTML = `
          <div style="background:linear-gradient(135deg,rgba(14,165,233,0.15),rgba(99,102,241,0.15));border:1px solid var(--color-primary);border-radius:0.75rem;padding:1.25rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
            <div>
              <h4 style="margin:0 0 0.25rem 0;color:var(--color-text);font-size:1.05rem;">أنت تتصفح الباقة المجانية حاليًا ⭐</h4>
              <p style="margin:0;color:var(--color-text-muted);font-size:0.9rem;">قم بترقية حسابك للوصول إلى كافة الدروس المغلقة، بنك الأسئلة الشامل، والامتحانات الدورية.</p>
            </div>
            <a href="#/student/subscription" class="btn btn-primary">عرض باقات الاشتراك والترقية 🚀</a>
          </div>
        `;
      }

      // Render Announcements Safely
      const announcements = ApiClient.extractList(annRes, 'announcements');
      const annContainer = document.getElementById('student-announcements-container');
      if (annContainer) {
        if (!announcements || announcements.length === 0) {
          annContainer.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--color-text-muted);">لا توجد إعلانات عامة منشورة حاليًا.</div>';
        } else {
          annContainer.innerHTML = announcements.map(a => `
            <div style="background:var(--color-surface-hover);border-right:4px solid ${a.is_urgent ? 'var(--color-danger)' : 'var(--color-primary)'};border-radius:0.5rem;padding:1rem;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;">
                <strong style="color:var(--color-text);font-size:1rem;">${a.title}</strong>
                <span class="badge ${a.is_urgent ? 'badge-danger' : 'badge-primary'}">${a.is_urgent ? 'عاجل ⚠️' : 'إعلان 📢'}</span>
              </div>
              <p style="color:var(--color-text-muted);font-size:0.9rem;line-height:1.6;margin:0 0 0.5rem 0;white-space:pre-wrap;">${a.content}</p>
              <div style="font-size:0.75rem;color:var(--color-text-dim);">📅 ${a.created_at ? a.created_at.substring(0, 10) : ''}</div>
            </div>
          `).join('');
        }
      }

      // Render Quick Courses
      const courses = ApiClient.extractList(crsRes, 'courses');
      const crsContainer = document.getElementById('student-courses-quick-list');
      if (crsContainer) {
        if (!courses || courses.length === 0) {
          crsContainer.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--color-text-muted);">لا توجد مناهج مضافة حاليًا.</div>';
        } else {
          crsContainer.innerHTML = courses.map(c => `
            <div style="background:var(--color-surface-hover);border:1px solid var(--color-border);border-radius:0.5rem;padding:1rem;display:flex;justify-content:space-between;align-items:center;">
              <div>
                <strong style="color:var(--color-text);font-size:0.95rem;">${c.title}</strong>
                <div style="font-size:0.8rem;color:var(--color-text-muted);margin-top:0.25rem;">
                  ${c.access_type === 'PUBLIC' ? 'متاح مجانًا ✅' : 'للمشتركين فقط ⭐'}
                </div>
              </div>
              <a href="#/student/courses" class="btn btn-secondary btn-sm">عرض المنهج 📚</a>
            </div>
          `).join('');
        }
      }
    } catch (err) {
      console.error('Error in student dashboard:', err);
    }
  }

  // =========================================================================
  // 2. COURSES & LESSON CATALOG
  // =========================================================================
  static async renderCourses(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">المناهج والدروس التعليمية 📚</h1>
          <p class="page-subtitle">تصفح الوحدات الدراسية وشروحات الفيديو والتطبيقات العملية</p>
        </div>
      </div>

      <div id="courses-catalog-container" style="display:flex;flex-direction:column;gap:2rem;">
        <div style="text-align:center;padding:3rem;color:var(--color-text-muted);">جاري تحميل المناهج والوحدات...</div>
      </div>
    `;

    try {
      const [crsRes, untRes, lesRes, subStatus] = await Promise.all([
        ApiClient.get('/courses').catch(() => ({ courses: [] })),
        ApiClient.get('/units').catch(() => ({ units: [] })),
        ApiClient.get('/lessons').catch(() => ({ lessons: [] })),
        ApiClient.get('/subscriptions/my-status').catch(() => ({ is_subscribed: false }))
      ]);

      const courses = ApiClient.extractList(crsRes, 'courses');
      const units = ApiClient.extractList(untRes, 'units');
      const lessons = ApiClient.extractList(lesRes, 'lessons');
      const isSubscribed = subStatus?.is_subscribed || false;

      const mainContainer = document.getElementById('courses-catalog-container');
      if (!courses || courses.length === 0) {
        mainContainer.innerHTML = '<div class="card" style="text-align:center;padding:3rem;color:var(--color-text-muted);">لا توجد كورسات أو مناهج دراسية متاحة حاليًا.</div>';
        return;
      }

      mainContainer.innerHTML = courses.map(course => {
        const courseUnits = units.filter(u => u.course_id === course.id);

        return `
          <div class="card" style="border:1px solid var(--color-border);overflow:hidden;padding:0;">
            <div style="background:var(--color-surface-hover);padding:1.5rem;border-bottom:1px solid var(--color-border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
              <div>
                <h2 style="font-size:1.3rem;font-weight:700;color:var(--color-text);margin:0 0 0.4rem 0;">${course.title}</h2>
                <p style="color:var(--color-text-muted);font-size:0.9rem;margin:0;">${course.description || ''}</p>
              </div>
              <div>
                <span class="badge ${course.access_type === 'PUBLIC' ? 'badge-success' : 'badge-primary'}">
                  ${course.access_type === 'PUBLIC' ? 'محتوى عام' : 'محتوى مشتركين ⭐'}
                </span>
              </div>
            </div>

            <div style="padding:1.5rem;">
              ${courseUnits.length === 0 ? `
                <div style="text-align:center;padding:1.5rem;color:var(--color-text-muted);">لا توجد وحدات تعليمية بعد في هذا المنهج.</div>
              ` : courseUnits.map(unit => {
                const unitLessons = lessons.filter(l => l.unit_id === unit.id);

                return `
                  <div style="margin-bottom:1.5rem;background:var(--color-bg);border:1px solid var(--color-border);border-radius:0.5rem;overflow:hidden;">
                    <div style="padding:1rem 1.25rem;background:var(--color-surface);font-weight:700;color:var(--color-primary);border-bottom:1px solid var(--color-border);">
                      📂 ${unit.title}
                    </div>
                    <div style="display:flex;flex-direction:column;">
                      ${unitLessons.length === 0 ? `
                        <div style="padding:1rem;color:var(--color-text-muted);font-size:0.85rem;text-align:center;">لا توجد دروس في هذه الوحدة.</div>
                      ` : unitLessons.map(les => {
                        const canAccess = les.is_free || course.access_type === 'PUBLIC' || isSubscribed;

                        return `
                          <div style="padding:0.85rem 1.25rem;border-bottom:1px solid var(--color-border);display:flex;justify-content:space-between;align-items:center;gap:1rem;">
                            <div style="display:flex;align-items:center;gap:0.75rem;">
                              <span style="font-size:1.1rem;">${canAccess ? '▶️' : '🔒'}</span>
                              <div>
                                <div style="font-weight:600;color:var(--color-text);font-size:0.95rem;">${les.title}</div>
                                <div style="font-size:0.8rem;color:var(--color-text-muted);">
                                  ⏱️ ${les.duration_minutes || Math.round((les.duration_seconds||0)/60) || 15} دقيقة
                                  ${les.is_free ? '• <span style="color:var(--color-success);">مجاني</span>' : ''}
                                </div>
                              </div>
                            </div>
                            <div>
                              ${canAccess ? `
                                <a href="#/student/lesson/${les.id}" class="btn btn-primary btn-sm">مشاهدة الدرس 🎬</a>
                              ` : `
                                <a href="#/student/subscription" class="btn btn-secondary btn-sm" style="color:var(--color-warning);border-color:var(--color-warning);">ترقية الحساب 🔒</a>
                              `}
                            </div>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error(err);
      Toast.error('فشل تحميل قائمة المناهج');
    }
  }

  // =========================================================================
  // 3. LESSON VIEW & VIDEO PLAYER
  // =========================================================================
  static async renderLessonView(container, lessonId) {
    container.innerHTML = `
      <div style="text-align:center;padding:4rem;color:var(--color-text-muted);">
        جاري تحميل الدرس والفيديو...
      </div>
    `;

    try {
      const res = await ApiClient.get(`/lessons/${lessonId}`);
      const lesson = res.lesson || res;

      let videoEmbedHtml = '';
      if (lesson.video_type === 'youtube' && lesson.video_url) {
        let ytId = '';
        const match = lesson.video_url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
        if (match) ytId = match[1];
        if (ytId) {
          videoEmbedHtml = `
            <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:0.75rem;background:#000;">
              <iframe src="https://www.youtube.com/embed/${ytId}?rel=0" frameborder="0" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>
            </div>
          `;
        } else {
          videoEmbedHtml = `
            <div style="text-align:center;padding:3rem;background:#000;border-radius:0.75rem;">
              <a href="${lesson.video_url}" target="_blank" class="btn btn-primary">فتح الفيديو على YouTube ↗️</a>
            </div>
          `;
        }
      } else {
        videoEmbedHtml = `
          <video controls style="width:100%;max-height:480px;border-radius:0.75rem;background:#000;">
            <source src="${lesson.video_url}" type="video/mp4">
            متصفحك لا يدعم مشغل الفيديو المباشر.
          </video>
        `;
      }

      container.innerHTML = `
        <div style="margin-bottom:1.5rem;">
          <a href="#/student/courses" style="color:var(--color-text-muted);text-decoration:none;font-size:0.9rem;">← العودة لقائمة الدروس والمناهج</a>
          <h1 style="font-size:1.6rem;font-weight:700;color:var(--color-text);margin:0.5rem 0 0.25rem 0;">${lesson.title}</h1>
          <div style="color:var(--color-text-muted);font-size:0.85rem;">
            ⏱️ المدة: ${lesson.duration_minutes || Math.round((lesson.duration_seconds||0)/60) || '—'} دقيقة
          </div>
        </div>

        <div style="margin-bottom:2rem;">
          ${videoEmbedHtml}
        </div>

        <div class="card" style="margin-bottom:2rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:1rem;">
            <h3 style="font-size:1.2rem;font-weight:700;margin:0;">📝 الشرح والملخص البرمجي للدرس</h3>
            <button id="btn-complete-lesson" class="btn btn-success">✅ وضع علامة: اكتمل الدرس</button>
          </div>
          <div style="color:var(--color-text);line-height:1.8;white-space:pre-wrap;font-size:1rem;">${lesson.content_markdown || 'لا يوجد شرح مكتوب لهذا الدرس.'}</div>
        </div>
      `;

      document.getElementById('btn-complete-lesson').addEventListener('click', async () => {
        try {
          await ApiClient.post(`/lessons/${lessonId}/progress`, {
            watch_time_seconds: (lesson.duration_minutes || 15) * 60,
            is_completed: true
          });
          Toast.success('أحسنت! تم تسجيل إكمال الدرس وإضافة نقاط الخبرة 🎉');
        } catch (err) {
          Toast.error(err.message || 'فشل حفظ التقدم');
        }
      });
    } catch (err) {
      container.innerHTML = `
        <div class="card" style="text-align:center;padding:3rem;">
          <h3 style="color:var(--color-danger);">تعذر تحميل الدرس 🔒</h3>
          <p style="color:var(--color-text-muted);">${err.message || 'قد يتطلب هذا الدرس اشتراكًا نشطًا'}</p>
          <a href="#/student/subscription" class="btn btn-primary" style="margin-top:1rem;">عرض باقات الاشتراك ⭐</a>
        </div>
      `;
    }
  }

  // =========================================================================
  // 4. STUDY FILES & GOOGLE DRIVE VIEWER
  // =========================================================================
  static async renderStudyFiles(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">الملفات والمذكرات الدراسية 📁</h1>
          <p class="page-subtitle">تحميل ملخصات الشرح، مذكرات الأسئلة، وملفات التمارين وروابط Google Drive</p>
        </div>
      </div>

      <div class="card">
        <div id="student-files-list" style="display:flex;flex-direction:column;gap:1rem;">
          <div style="text-align:center;padding:2rem;color:var(--color-text-muted);">جاري تحميل المذكرات والملفات...</div>
        </div>
      </div>
    `;

    try {
      const res = await ApiClient.get('/files');
      const files = ApiClient.extractList(res, 'files');
      const listEl = document.getElementById('student-files-list');

      if (!files || files.length === 0) {
        listEl.innerHTML = '<div style="text-align:center;padding:2.5rem;color:var(--color-text-muted);">لا توجد ملفات دراسية متاحة حاليًا.</div>';
        return;
      }

      listEl.innerHTML = files.map(f => {
        const isDrive = f.source_type === 'google_drive' || (f.external_url && f.external_url.includes('drive.google.com'));

        return `
          <div style="background:var(--color-surface-hover);border:1px solid var(--color-border);border-radius:0.75rem;padding:1.25rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:1rem;">
              <span style="font-size:2rem;">${isDrive ? '☁️' : '📄'}</span>
              <div>
                <h4 style="margin:0 0 0.25rem 0;color:var(--color-text);font-size:1.05rem;">${f.title}</h4>
                <p style="margin:0;color:var(--color-text-muted);font-size:0.85rem;">${f.description || 'ملف دراسي معتمد'}</p>
              </div>
            </div>
            <div>
              ${f.external_url ? `
                <a href="${f.external_url}" target="_blank" class="btn btn-primary btn-sm" style="text-decoration:none;">
                  ${isDrive ? 'فتح في Google Drive ↗️' : 'تحميل المذكرة 📥'}
                </a>
              ` : `
                <span class="badge badge-secondary">ملف مرفق</span>
              `}
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error(err);
      Toast.error('فشل تحميل قائمة المذكرات الدراسية');
    }
  }

  // =========================================================================
  // 5. INTERACTIVE CODE PLAYGROUND
  // =========================================================================
  static async renderPlayground(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">محرر الأكواد التفاعلي 💻</h1>
          <p class="page-subtitle">بيئة برمجية سحابية معزولة لكتابة وتشغيل وتجربة أكواد بايثون الحقيقية</p>
        </div>
        <button id="btn-run-code" class="btn btn-primary">▶️ تشغيل الكود الآن</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;">
        <!-- Code Editor Pane -->
        <div class="card" style="display:flex;flex-direction:column;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
            <span style="font-weight:700;color:var(--color-primary);">🐍 محرر Python 3</span>
            <select id="code-snippet-picker" class="form-control" style="width:auto;font-size:0.85rem;padding:0.25rem 0.5rem;">
              <option value="welcome">نموذج: ترحيب وحساب</option>
              <option value="loop">نموذج: حلقة تكرار (Loop)</option>
              <option value="function">نموذج: الدوال (Functions)</option>
              <option value="list">نموذج: القوائم (Lists)</option>
            </select>
          </div>
          <textarea id="playground-code" class="form-control" rows="16" style="font-family:monospace;font-size:0.95rem;background:#050811;color:#38BDF8;border-color:rgba(14,165,233,0.3);line-height:1.6;" spellcheck="false"># كود سبارك - مرحبًا بك في محرر الأكواد!
def greet_student(name):
    return f"أهلاً بك يا {name} في عالم البرمجة!"

print(greet_student("مطور المستقبل"))

scores = [95, 88, 100, 92]
average = sum(scores) / len(scores)
print("متوسط الدرجات:", average)
</textarea>
        </div>

        <!-- Terminal Output Pane -->
        <div class="card" style="display:flex;flex-direction:column;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
            <span style="font-weight:700;color:var(--color-success);">🖥️ المخرجات (Console Output)</span>
            <button id="btn-clear-console" class="btn btn-secondary btn-sm">مسح الشاشة</button>
          </div>
          <div id="playground-output" style="flex:1;min-height:360px;background:#050811;border:1px solid rgba(255,255,255,0.1);border-radius:0.5rem;padding:1rem;font-family:monospace;font-size:0.95rem;color:#F8FAFC;white-space:pre-wrap;overflow-y:auto;">
اضغط على "▶️ تشغيل الكود الآن" لرؤية مخرجات البرنامج...
          </div>
        </div>
      </div>
    `;

    const snippets = {
      welcome: `# حساب مجموع الأرقام\na = 25\nb = 40\nprint("الناتج =", a + b)`,
      loop: `# حلقات التكرار\nfor i in range(1, 6):\n    print(f"الخطوة رقم: {i}")`,
      function: `# تعريف دالة مخصصة\ndef is_even(num):\n    return num % 2 == 0\n\nprint("هل 10 زوجي؟", is_even(10))\nprint("هل 7 زوجي؟", is_even(7))`,
      list: `# التعامل مع القوائم\nfruits = ["تفاح", "موز", "برتقال"]\nfruits.append("عنب")\nprint("قائمة الفواكه:", fruits)`
    };

    document.getElementById('code-snippet-picker').addEventListener('change', (e) => {
      const snip = snippets[e.target.value];
      if (snip) document.getElementById('playground-code').value = snip;
    });

    document.getElementById('btn-clear-console').addEventListener('click', () => {
      document.getElementById('playground-output').textContent = 'الشاشة جاهزة...';
    });

    document.getElementById('btn-run-code').addEventListener('click', async () => {
      const code = document.getElementById('playground-code').value;
      const outputEl = document.getElementById('playground-output');
      const runBtn = document.getElementById('btn-run-code');

      runBtn.disabled = true;
      runBtn.textContent = 'جاري التنفيذ...';
      outputEl.textContent = 'جاري تنفيذ الكود في بيئة الخادم المعزولة...\n';

      try {
        const res = await ApiClient.post('/playground/run', {
          language: 'python',
          code: code
        });

        if (res.success) {
          outputEl.style.color = '#38BDF8';
          outputEl.textContent = res.output || '(تم التنفيذ بنجاح دون طباعة مخرجات)';
        } else {
          outputEl.style.color = '#EF4444';
          outputEl.textContent = res.error || res.output || 'حدث خطأ في تنفيذ الكود';
        }
      } catch (err) {
        outputEl.style.color = '#EF4444';
        outputEl.textContent = `خطأ في الاتصال بالخادم: ${err.message}`;
      } finally {
        runBtn.disabled = false;
        runBtn.textContent = '▶️ تشغيل الكود الآن';
      }
    });
  }

  // =========================================================================
  // 6. DYNAMIC SUBSCRIPTION PLANS & PAYMENT WORKFLOW
  // =========================================================================
  static async renderSubscriptionPage(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">باقات الاشتراك وتفعيل الحساب ⭐</h1>
          <p class="page-subtitle">اختر الباقة المناسبة وقم بالتحويل عبر فودافون كاش أو إنستاباي لتفعيل حسابك فورًا</p>
        </div>
      </div>

      <!-- Promotional Offers Banner -->
      <div id="sub-page-offer-banner" style="display:none;margin-bottom:2rem;"></div>

      <!-- Payment Instructions Card -->
      <div class="card" style="margin-bottom:2rem;background:linear-gradient(135deg,rgba(14,165,233,0.08),rgba(99,102,241,0.08));border:1px solid rgba(14,165,233,0.3);">
        <h3 style="font-size:1.2rem;font-weight:700;margin-bottom:1rem;color:var(--color-text);display:flex;align-items:center;gap:0.5rem;">
          <span>📱</span> طرق التحويل المعتمدة
        </h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5rem;">
          <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:0.75rem;padding:1.25rem;">
            <div style="font-weight:700;color:var(--color-primary);margin-bottom:0.5rem;font-size:1.05rem;">🔴 فودافون كاش (Vodafone Cash)</div>
            <div style="font-size:1.2rem;font-weight:700;color:var(--color-text);margin-bottom:0.5rem;" id="disp-voda-phone">+20159159038</div>
            <p style="color:var(--color-text-muted);font-size:0.85rem;margin:0;">قم بالتحويل إلى الرقم أعلاه من أي محفظة إلكترونية ثم احتفظ برقم العملية لإرفاقه بالأسفل.</p>
          </div>

          <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:0.75rem;padding:1.25rem;">
            <div style="font-weight:700;color:var(--color-success);margin-bottom:0.5rem;font-size:1.05rem;">🟣 إنستاباي (InstaPay)</div>
            <div style="font-size:1.2rem;font-weight:700;color:var(--color-text);margin-bottom:0.5rem;" id="disp-insta-phone">+20159159038</div>
            <div id="disp-insta-link-container"></div>
            <p style="color:var(--color-text-muted);font-size:0.85rem;margin:0.5rem 0 0 0;">يمكنك التحويل الفوري من أي حساب بنكي أو تطبيق إنستاباي مباشرة.</p>
          </div>
        </div>
      </div>

      <!-- Dynamic Plans Grid -->
      <div style="margin-bottom:2.5rem;">
        <h2 style="font-size:1.3rem;font-weight:700;margin-bottom:1.25rem;color:var(--color-text);">باقات الاشتراكات الأكاديمية المتاحة</h2>
        <div id="sub-plans-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5rem;">
          <div style="text-align:center;padding:2rem;color:var(--color-text-muted);grid-column:1/-1;">جاري تحميل باقات الاشتراك...</div>
        </div>
      </div>

      <!-- Have a subscription code? -->
      <div class="card" style="text-align:center;padding:2rem;">
        <h3 style="font-size:1.2rem;font-weight:700;margin-bottom:0.5rem;">هل لديك كود تفعيل مسبق الدفع؟ 🔑</h3>
        <p style="color:var(--color-text-muted);font-size:0.9rem;margin-bottom:1rem;">إذا استلمت كود اشتراك من الإدارة أو من المساعد التعليمي، يمكنك تفعيله فورًا هنا.</p>
        <button id="btn-open-code-modal" class="btn btn-secondary">إدخال كود التفعيل الآن</button>
      </div>
    `;

    // Load Payment Info & Plans
    try {
      const [payInfo, plansRes] = await Promise.all([
        ApiClient.get('/subscriptions/payment-info').catch(() => ({})),
        ApiClient.get('/subscriptions/plans?active_only=true').catch(() => ({ plans: [] }))
      ]);

      const vPhone = payInfo.vodafone_cash || payInfo.payment_phone || '+20159159038';
      const iPhone = payInfo.instapay_phone || '+20159159038';
      const iLink = payInfo.instapay_link;

      if (document.getElementById('disp-voda-phone')) document.getElementById('disp-voda-phone').textContent = vPhone;
      if (document.getElementById('disp-insta-phone')) document.getElementById('disp-insta-phone').textContent = iPhone;
      if (iLink && document.getElementById('disp-insta-link-container')) {
        document.getElementById('disp-insta-link-container').innerHTML = `
          <a href="${iLink}" target="_blank" class="btn btn-secondary btn-sm" style="font-size:0.8rem;text-decoration:none;margin-top:0.25rem;">فتح رابط الدفع في InstaPay ↗️</a>
        `;
      }

      // Offer banner
      if (payInfo.offers_visible && payInfo.offer_banner_text) {
        const bannerEl = document.getElementById('sub-page-offer-banner');
        if (bannerEl) {
          bannerEl.style.display = 'block';
          bannerEl.innerHTML = `
            <div style="background:linear-gradient(135deg,rgba(245,158,11,0.15),rgba(239,68,68,0.15));border:1px solid var(--color-warning);border-radius:0.75rem;padding:1rem 1.5rem;display:flex;align-items:center;gap:1rem;">
              <span style="font-size:1.5rem;">🔥</span>
              <div style="font-weight:600;color:var(--color-text);">${payInfo.offer_banner_text}</div>
            </div>
          `;
        }
      }

      // Render Plans
      const plans = ApiClient.extractList(plansRes, 'plans');
      const gridEl = document.getElementById('sub-plans-grid');
      if (gridEl) {
        if (!plans || plans.length === 0) {
          gridEl.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--color-text-muted);grid-column:1/-1;">لا توجد باقات متاحة حاليًا. يرجى التواصل مع الإدارة.</div>';
        } else {
          gridEl.innerHTML = plans.map(p => `
            <div class="card" style="border:1px solid var(--color-border);display:flex;flex-direction:column;justify-content:space-between;transition:transform 0.2s,border-color 0.2s;">
              <div>
                <h3 style="font-size:1.25rem;font-weight:700;margin:0 0 0.5rem 0;color:var(--color-text);">${p.name}</h3>
                <div style="display:flex;align-items:baseline;gap:0.25rem;margin-bottom:1rem;">
                  <span style="font-size:2rem;font-weight:800;color:var(--color-primary);">${p.price}</span>
                  <span style="color:var(--color-text-muted);font-size:0.9rem;">جنيه مصري</span>
                </div>
                <div style="background:var(--color-surface-hover);padding:0.5rem 0.75rem;border-radius:0.5rem;font-size:0.85rem;color:var(--color-text-muted);margin-bottom:1.25rem;">
                  ⏱️ الصلاحية: <strong>${p.duration_months} ${p.duration_months === 1 ? 'شهر' : 'أشهر'}</strong>
                </div>
                <ul style="padding-right:1.25rem;margin:0 0 1.5rem 0;color:var(--color-text-muted);font-size:0.9rem;line-height:1.7;">
                  <li>وصول كامل لكافة الدروس والمناهج</li>
                  <li>فتح بنك الأسئلة المركزي والامتحانات</li>
                  <li>محرر الأكواد التفاعلي السحابي</li>
                  <li>دعم فني وتواصل دراسي مستمر</li>
                </ul>
              </div>
              <button class="btn btn-primary subscribe-plan-btn" data-id="${p.id}" data-name="${p.name}" data-price="${p.price}" data-months="${p.duration_months}" style="width:100%;">
                اشترك الآن وأرسل الإيصال 🚀
              </button>
            </div>
          `).join('');

          gridEl.querySelectorAll('.subscribe-plan-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              openPaymentReceiptModal({
                id: btn.dataset.id,
                name: btn.dataset.name,
                price: btn.dataset.price,
                duration_months: btn.dataset.months
              });
            });
          });
        }
      }
    } catch (err) {
      console.error(err);
      Toast.error('فشل تحميل باقات الاشتراك');
    }

    // Modal to Submit Payment Request
    function openPaymentReceiptModal(plan) {
      Modal.open({
        title: `إرسال إيصال الاشتراك: ${plan.name}`,
        contentHtml: `
          <form id="form-submit-sub-req">
            <div style="background:var(--color-surface-hover);border:1px solid var(--color-border);border-radius:0.5rem;padding:1rem;margin-bottom:1rem;">
              <div style="display:flex;justify-content:space-between;margin-bottom:0.25rem;">
                <span style="color:var(--color-text-muted);">الباقة المختارة:</span>
                <strong>${plan.name}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;">
                <span style="color:var(--color-text-muted);">المبلغ المطلوب تحويله:</span>
                <strong style="color:var(--color-primary);font-size:1.1rem;">${plan.price} ج.م</strong>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">طريقة التحويل التي استخدمتها *</label>
              <select id="m-req-method" class="form-control" required>
                <option value="Vodafone Cash">فودافون كاش (Vodafone Cash)</option>
                <option value="InstaPay">إنستاباي (InstaPay)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">رقم الهاتف أو الحساب المحول منه *</label>
              <input type="text" id="m-req-phone" class="form-control" required placeholder="010XXXXXXXX">
            </div>

            <div class="form-group">
              <label class="form-label">رقم العملية / المرجع المالي للتحويل *</label>
              <input type="text" id="m-req-ref" class="form-control" required placeholder="مثال: رقم التحويل في الرسالة النصية أو InstaPay Ref">
            </div>

            <div class="modal-actions" style="margin-top:1.5rem;">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('app-modal').style.display='none'">إلغاء</button>
              <button type="submit" class="btn btn-primary">تأكيد وإرسال الإيصال للإدارة 📩</button>
            </div>
          </form>
        `
      });

      document.getElementById('form-submit-sub-req').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          plan_id: plan.id,
          package_name: plan.name,
          duration_months: parseInt(plan.duration_months) || 1,
          amount: parseFloat(plan.price) || 0.0,
          payment_method: document.getElementById('m-req-method').value,
          payment_number: document.getElementById('m-req-phone').value.trim(),
          payment_reference: document.getElementById('m-req-ref').value.trim(),
          phone: document.getElementById('m-req-phone').value.trim()
        };

        try {
          await ApiClient.post('/subscriptions/requests', payload);
          Toast.success('تم إرسال طلب الاشتراك بنجاح! سيتم مراجعته وتفعيل حسابك فورًا 🎉');
          Modal.close();
        } catch (err) {
          Toast.error(err.message || 'فشل إرسال طلب الاشتراك');
        }
      });
    }

    // Bind Code Modal Button
    document.getElementById('btn-open-code-modal')?.addEventListener('click', () => {
      document.getElementById('activate-sub-btn')?.click();
    });
  }

  // =========================================================================
  // 7. EXAMS
  // =========================================================================
  static async renderExams(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">الامتحانات والاختبارات الدورية 📝</h1>
          <p class="page-subtitle">قياس فهمك الأكاديمي والتحصيل البرمجي مع التصحيح الآمن الفوري</p>
        </div>
      </div>

      <div class="card">
        <div id="student-exams-list" style="display:flex;flex-direction:column;gap:1rem;">
          <div style="text-align:center;padding:2rem;color:var(--color-text-muted);">جاري تحميل الامتحانات المتاحة...</div>
        </div>
      </div>
    `;

    try {
      const res = await ApiClient.get('/exams');
      const exams = ApiClient.extractList(res, 'exams');
      const listEl = document.getElementById('student-exams-list');

      if (!exams || exams.length === 0) {
        listEl.innerHTML = '<div style="text-align:center;padding:2.5rem;color:var(--color-text-muted);">لا توجد امتحانات دورية مجدولة حاليًا.</div>';
        return;
      }

      listEl.innerHTML = exams.map(ex => `
        <div style="background:var(--color-surface-hover);border:1px solid var(--color-border);border-radius:0.75rem;padding:1.25rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;">
          <div>
            <h4 style="margin:0 0 0.25rem 0;color:var(--color-text);font-size:1.1rem;">${ex.title}</h4>
            <div style="color:var(--color-text-muted);font-size:0.85rem;">
              ⏱️ المدة: ${ex.duration_minutes} دقيقة • درجة النجاح: ${ex.passing_score}% • المحاولات: ${ex.max_attempts}
            </div>
          </div>
          <div>
            <button class="btn btn-primary start-exam-btn" data-id="${ex.id}">بدء الاختبار الآن 📝</button>
          </div>
        </div>
      `).join('');

      listEl.querySelectorAll('.start-exam-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          Toast.info('جاري إعداد جلسة الاختبار...');
        });
      });
    } catch (err) {
      console.error(err);
      Toast.error('فشل تحميل الامتحانات');
    }
  }

  // =========================================================================
  // 8. SUPPORT TICKETS
  // =========================================================================
  static async renderSupport(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">الدعم الفني والأكاديمي 💬</h1>
          <p class="page-subtitle">تواصل مباشرة مع المشرف والمساعدين التعليميين لأي استفسار أو مشكلة</p>
        </div>
      </div>

      <div class="card" style="max-width:650px;">
        <form id="form-support-ticket">
          <div class="form-group">
            <label class="form-label">موضوع الاستفسار *</label>
            <input type="text" id="supp-subject" class="form-control" required placeholder="مثال: استفسار حول حل تمرين الدوال">
          </div>
          <div class="form-group">
            <label class="form-label">تفاصيل الرسالة أو المشكلة *</label>
            <textarea id="supp-message" class="form-control" rows="5" required placeholder="اكتب تفاصيل استفسارك وسيقوم الفريق بالرد عليك سريعًا..."></textarea>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;margin-top:1rem;">إرسال التذكرة الآن 🚀</button>
        </form>
      </div>
    `;

    document.getElementById('form-support-ticket').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await ApiClient.post('/support/tickets', {
          subject: document.getElementById('supp-subject').value.trim(),
          message: document.getElementById('supp-message').value.trim()
        });
        Toast.success('تم إرسال تذكرة الدعم بنجاح! سيتم التواصل معك قريبًا 🎉');
        document.getElementById('form-support-ticket').reset();
      } catch (err) {
        Toast.error(err.message || 'فشل إرسال التذكرة');
      }
    });
  }

  // =========================================================================
  // 9. STUDENT PROFILE
  // =========================================================================
  static async renderProfile(container) {
    await this.renderSettings(container);
  }

  // =========================================================================
  // 10. STUDENT ACCOUNT & SECURITY SETTINGS
  // =========================================================================
  static async renderSettings(container) {
    const user = AuthService.getUser() || {};

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">إعدادات الحساب والأمان ⚙️</h1>
          <p class="page-subtitle">تعديل بياناتك الشخصية وتغيير كلمة المرور وتأمين حسابك</p>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:2rem;">
        <!-- Profile Update -->
        <div class="card">
          <h3 style="font-size:1.15rem;font-weight:700;margin-bottom:1rem;">👤 البيانات الشخصية</h3>
          <form id="form-std-profile">
            <div class="form-group">
              <label class="form-label">الاسم الكامل *</label>
              <input type="text" id="std-fullname" class="form-control" required value="${user.full_name || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">اسم المستخدم (ثابت)</label>
              <input type="text" class="form-control" value="${user.username || ''}" disabled style="opacity:0.7;">
            </div>
            <div class="form-group">
              <label class="form-label">البريد الإلكتروني *</label>
              <input type="email" id="std-email" class="form-control" required value="${user.email || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">رقم الهاتف</label>
              <input type="text" id="std-phone" class="form-control" value="${user.phone || ''}" placeholder="010...">
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;margin-top:1rem;">حفظ التعديلات</button>
          </form>
        </div>

        <!-- Password Change -->
        <div class="card">
          <h3 style="font-size:1.15rem;font-weight:700;margin-bottom:1rem;">🔒 تغيير كلمة المرور</h3>
          <form id="form-std-pw">
            <div class="form-group">
              <label class="form-label">كلمة المرور الحالية *</label>
              <input type="password" id="std-pw-cur" class="form-control" required placeholder="••••••••">
            </div>
            <div class="form-group">
              <label class="form-label">كلمة المرور الجديدة * (6 خانات على الأقل)</label>
              <input type="password" id="std-pw-new" class="form-control" required minlength="6" placeholder="••••••••">
            </div>
            <div class="form-group">
              <label class="form-label">تأكيد كلمة المرور الجديدة *</label>
              <input type="password" id="std-pw-conf" class="form-control" required minlength="6" placeholder="••••••••">
            </div>
            <div id="std-pw-feedback" style="display:none;color:var(--color-danger);font-size:0.85rem;margin-bottom:1rem;"></div>
            <button type="submit" class="btn btn-primary" style="width:100%;margin-top:0.5rem;">تحديث كلمة المرور الآن</button>
          </form>
        </div>
      </div>
    `;

    document.getElementById('form-std-profile').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const res = await ApiClient.put('/users/profile', {
          full_name: document.getElementById('std-fullname').value.trim(),
          email: document.getElementById('std-email').value.trim(),
          phone: document.getElementById('std-phone').value.trim() || null
        });
        if (res.user) {
          const updatedUser = { ...user, ...res.user };
          localStorage.setItem('codespark_user', JSON.stringify(updatedUser));
          const nameEl = document.getElementById('user-display-name');
          if (nameEl) nameEl.textContent = updatedUser.full_name || updatedUser.username;
        }
        Toast.success('تم تحديث البيانات بنجاح! 🚀');
      } catch (err) {
        Toast.error(err.message || 'فشل تحديث البيانات');
      }
    });

    document.getElementById('form-std-pw').addEventListener('submit', async (e) => {
      e.preventDefault();
      const cur = document.getElementById('std-pw-cur').value;
      const nw = document.getElementById('std-pw-new').value;
      const conf = document.getElementById('std-pw-conf').value;
      const fb = document.getElementById('std-pw-feedback');

      fb.style.display = 'none';
      if (nw !== conf) {
        fb.textContent = 'كلمة المرور الجديدة وتأكيدها غير متطابقين';
        fb.style.display = 'block';
        return;
      }

      try {
        const res = await ApiClient.post('/users/change-password', {
          current_password: cur,
          new_password: nw,
          confirm_password: conf
        });
        Toast.success(res.message || 'تم تغيير كلمة المرور بنجاح! 🔒');
        document.getElementById('form-std-pw').reset();
      } catch (err) {
        fb.textContent = err.message || 'فشل تغيير كلمة المرور';
        fb.style.display = 'block';
        Toast.error(err.message || 'فشل تغيير كلمة المرور');
      }
    });
  }
}
