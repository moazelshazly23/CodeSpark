/**
 * Code Spark - Student Portal Views & Dynamic Controller Logic
 * 100% Data-Driven from REST APIs with Real Progression, Subscriptions, and Sandboxed Code Execution.
 */
import ApiClient, { debounce } from '../api/apiClient.js';
import { Toast, Modal } from '../components/ui.js';
import AuthService from '../auth/authService.js';

export class StudentPages {

  /* ===================================================================
     1. STUDENT DASHBOARD
  =================================================================== */
  static async renderDashboard(container) {
    const user = AuthService.getUser();
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
        <div>
          <h2 style="font-size:1.8rem;font-weight:900;color:var(--color-text-main);">مرحبًا بك، ${user?.full_name || 'طالبنا المتميز'} 👋</h2>
          <p style="color:var(--color-text-muted);font-size:0.95rem;">لوحة المتابعة الأكاديمية والتعلم الذاتي لمادة البرمجة</p>
        </div>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
          <a href="#/student/playground" class="btn btn-secondary btn-sm" style="display:flex;align-items:center;gap:0.4rem;">
            <span>💻</span> محرر الأكواد
          </a>
          <a href="#/student/courses" class="btn btn-primary btn-sm" style="display:flex;align-items:center;gap:0.4rem;">
            <span>📚</span> استكمال المنهج
          </a>
        </div>
      </div>

      <!-- Subscription Banner if not subscribed -->
      <div id="sub-status-alert" style="display:none;margin-bottom:1.5rem;"></div>

      <!-- Metrics Grid -->
      <div id="dashboard-metrics" class="dashboard-grid">
        <div class="card skeleton" style="height:110px;"></div>
        <div class="card skeleton" style="height:110px;"></div>
        <div class="card skeleton" style="height:110px;"></div>
        <div class="card skeleton" style="height:110px;"></div>
      </div>

      <!-- Main Columns -->
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:1.5rem;margin-top:1.5rem;" class="dashboard-columns">
        <div id="dashboard-left-col">
          <div class="card skeleton" style="height:260px;margin-bottom:1.5rem;"></div>
          <div class="card skeleton" style="height:260px;"></div>
        </div>
        <div id="dashboard-right-col">
          <div class="card skeleton" style="height:540px;"></div>
        </div>
      </div>
    `;

    try {
      const [prog, mySub, annList] = await Promise.all([
        ApiClient.get('/progress/summary').catch(() => ({})),
        ApiClient.get('/subscriptions/my-status').catch(() => ({})),
        ApiClient.get('/announcements').catch(() => ([]))
      ]);

      // Subscription Alert Banner
      const subAlert = document.getElementById('sub-status-alert');
      if (!mySub.is_subscribed) {
        subAlert.style.display = 'block';
        subAlert.innerHTML = `
          <div class="card" style="background:linear-gradient(135deg, rgba(14,165,233,0.12), rgba(0,229,255,0.06));border:1px solid var(--color-border-light);display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;padding:1.2rem;">
            <div style="display:flex;align-items:center;gap:0.8rem;">
              <div style="font-size:2rem;">🚀</div>
              <div>
                <h4 style="color:var(--color-primary);font-weight:800;margin-bottom:0.2rem;">أنت على الخطة المجانية حالياً</h4>
                <p style="color:var(--color-text-muted);font-size:0.88rem;">قم بتفعيل كود الاشتراك لفتح جميع وحدات المنهج المتقدمة والامتحانات والمذكرات بالكامل.</p>
              </div>
            </div>
            <button id="dash-open-sub-btn" class="btn btn-primary btn-sm" style="font-weight:700;">🔑 إدخال كود الاشتراك</button>
          </div>
        `;
        document.getElementById('dash-open-sub-btn')?.addEventListener('click', () => {
          document.getElementById('sub-modal').style.display = 'flex';
        });
      }

      // Render Metrics Cards
      const pct = prog.overall_percentage || 0;
      document.getElementById('dashboard-metrics').innerHTML = `
        <div class="card metric-card">
          <div class="metric-icon">📊</div>
          <div class="metric-data">
            <h3>${pct}%</h3>
            <p>نسبة الإنجاز الأكاديمي العام</p>
            <div class="progress-bar-container" style="margin-top:0.4rem;">
              <div class="progress-bar-fill" style="width:${pct}%;"></div>
            </div>
          </div>
        </div>

        <div class="card metric-card">
          <div class="metric-icon">📖</div>
          <div class="metric-data">
            <h3>${prog.completed_lessons || 0} / ${prog.total_lessons || 0}</h3>
            <p>الدروس المكتملة</p>
          </div>
        </div>

        <div class="card metric-card">
          <div class="metric-icon">⚡</div>
          <div class="metric-data">
            <h3 style="color:#F59E0B;">${prog.xp || 0} XP</h3>
            <p>نقاط الخبرة البرمجية</p>
          </div>
        </div>

        <div class="card metric-card">
          <div class="metric-icon">🔥</div>
          <div class="metric-data">
            <h3 style="color:var(--color-primary);">${prog.streak_days || 1} أيام</h3>
            <p>أيام الدراسة المتتالية</p>
          </div>
        </div>
      `;

      // Render Left Column: Continue Learning + Quick Exams
      const continueLes = prog.last_accessed_lesson;
      let leftHtml = `
        <div class="card" style="margin-bottom:1.5rem;">
          <h3 style="margin-bottom:1rem;font-weight:800;display:flex;align-items:center;gap:0.5rem;">
            <span>▶️</span> متابعة التعلم
          </h3>
          ${continueLes ? `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;background:var(--color-bg-secondary);padding:1rem;border-radius:var(--radius-md);">
              <div>
                <h4 style="color:var(--color-text-main);font-weight:700;margin-bottom:0.3rem;">${continueLes.lesson_title}</h4>
                <div style="font-size:0.85rem;color:var(--color-text-muted);">
                  تمت مشاهدة ${Math.round(continueLes.watch_percentage || 0)}% • آخر موضع: ${Math.round(continueLes.last_video_position_seconds || 0)} ثانية
                </div>
              </div>
              <a href="#/student/lesson/${continueLes.lesson_id}" class="btn btn-primary btn-sm">استكمال الدرس ⟵</a>
            </div>
          ` : `
            <div class="empty-state" style="padding:1.5rem;">
              <p>لم تبدأ أي درس بعد. ابدأ الآن بتصفح أول درس في أساسيات البرمجة!</p>
              <a href="#/student/courses" class="btn btn-primary btn-sm" style="margin-top:0.75rem;">تصفح المنهج</a>
            </div>
          `}
        </div>

        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
            <h3 style="font-weight:800;display:flex;align-items:center;gap:0.5rem;">
              <span>📝</span> الاختبارات والامتحانات القادمة
            </h3>
            <a href="#/student/exams" style="font-size:0.85rem;color:var(--color-primary);text-decoration:none;">عرض الكل ⟵</a>
          </div>
          <div id="dash-exams-list">
            <p style="color:var(--color-text-muted);font-size:0.9rem;">امتحان منتصف الفصل متاح حالياً للطلاب المشتركين.</p>
            <a href="#/student/exams" class="btn btn-secondary btn-sm" style="margin-top:0.5rem;">الذهاب لقسم الامتحانات</a>
          </div>
        </div>
      `;
      document.getElementById('dashboard-left-col').innerHTML = leftHtml;

      // Render Right Column: Announcements + Shortcuts
      let rightHtml = `
        <div class="card" style="height:100%;">
          <h3 style="margin-bottom:1.25rem;font-weight:800;display:flex;align-items:center;gap:0.5rem;">
            <span>📢</span> الإعلانات والتبليغات
          </h3>
          <div style="display:flex;flex-direction:column;gap:1rem;">
            ${annList.length > 0 ? annList.map(a => `
              <div style="padding:0.9rem;background:var(--color-bg-secondary);border-radius:var(--radius-md);border-right:3px solid var(--color-primary);">
                <div style="font-weight:700;font-size:0.95rem;color:var(--color-text-main);margin-bottom:0.3rem;">${a.title}</div>
                <div style="font-size:0.85rem;color:var(--color-text-muted);line-height:1.5;">${a.content}</div>
                <div style="font-size:0.75rem;color:var(--color-text-dim);margin-top:0.4rem;">${a.publish_date ? a.publish_date.substring(0,10) : ''}</div>
              </div>
            `).join('') : `
              <p style="color:var(--color-text-muted);font-size:0.9rem;">لا توجد إعلانات جديدة حالياً.</p>
            `}
          </div>

          <hr style="border:none;border-top:1px solid var(--color-border);margin:1.5rem 0;">

          <h4 style="font-weight:800;color:var(--color-text-main);margin-bottom:0.75rem;">روابط سريعة</h4>
          <div style="display:flex;flex-direction:column;gap:0.5rem;">
            <a href="#/student/playground" class="btn btn-secondary btn-sm" style="justify-content:flex-start;">💻 محرر الأكواد التفاعلي</a>
            <a href="#/student/resources" class="btn btn-secondary btn-sm" style="justify-content:flex-start;">📂 مكتبة المذكرات والملازم</a>
            <a href="#/student/support" class="btn btn-secondary btn-sm" style="justify-content:flex-start;">💬 فتح تذكرة دعم أكاديمي</a>
          </div>
        </div>
      `;
      document.getElementById('dashboard-right-col').innerHTML = rightHtml;

    } catch (err) {
      console.error(err);
      Toast.error('تعذر تحميل بعض بيانات لوحة التحكم');
    }
  }

  /* ===================================================================
     2. COURSES & CURRICULUM VIEW
  =================================================================== */
  static async renderCourses(container) {
    container.innerHTML = `
      <div style="margin-bottom:1.5rem;">
        <h2 style="font-size:1.8rem;font-weight:900;color:var(--color-text-main);">منهج مادة البرمجة الأكاديمي</h2>
        <p style="color:var(--color-text-muted);">الكورسات والوحدات التعليمية المعتمدة</p>
      </div>
      <div id="courses-list" style="display:grid;grid-template-columns:1fr;gap:1.5rem;">
        <div class="card skeleton" style="height:200px;"></div>
      </div>
    `;

    try {
      const res = await ApiClient.get('/courses');
      const courses = res.courses || [];
      const listEl = document.getElementById('courses-list');

      if (courses.length === 0) {
        listEl.innerHTML = '<div class="card empty-state"><p>لا توجد كورسات متاحة حالياً.</p></div>';
        return;
      }

      let html = '';
      for (const crs of courses) {
        // Fetch course details with units
        const fullCourse = await ApiClient.get(`/courses/${crs.id}`);
        html += `
          <div class="card" style="margin-bottom:1.5rem;">
            <div style="display:flex;gap:1.5rem;align-items:flex-start;flex-wrap:wrap;">
              <div style="width:80px;height:80px;border-radius:var(--radius-md);background:var(--color-bg-secondary);padding:0.5rem;flex-shrink:0;">
                <img src="${crs.thumbnail_url || '/assets/branding/app_icon.svg'}" alt="Course" style="width:100%;height:100%;object-fit:contain;">
              </div>
              <div style="flex:1;">
                <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;margin-bottom:0.4rem;">
                  <h3 style="font-size:1.4rem;font-weight:800;color:var(--color-text-main);">${crs.title}</h3>
                  <span class="badge ${crs.access_type === 'PUBLIC' ? 'badge-public' : 'badge-subscribers'}">
                    ${crs.access_type === 'PUBLIC' ? 'مجاني ومتاح للجميع' : 'مخصص للمشتركين 🔑'}
                  </span>
                </div>
                <p style="color:var(--color-text-muted);font-size:0.95rem;line-height:1.6;margin-bottom:1.25rem;">
                  ${crs.description || ''}
                </p>

                <!-- Units Accordion -->
                <div style="display:flex;flex-direction:column;gap:1rem;">
                  ${fullCourse.units ? fullCourse.units.map((u, uIdx) => `
                    <div style="background:var(--color-bg-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);overflow:hidden;">
                      <div style="padding:0.9rem 1.25rem;background:var(--color-bg-secondary);display:flex;justify-content:space-between;align-items:center;font-weight:700;color:var(--color-text-main);">
                        <div style="display:flex;align-items:center;gap:0.5rem;">
                          <span>📁</span>
                          <span>${u.title}</span>
                        </div>
                        <span class="badge ${u.access_type === 'PUBLIC' ? 'badge-public' : 'badge-subscribers'}" style="font-size:0.75rem;">
                          ${u.access_type === 'PUBLIC' ? 'عام' : 'مشتركين 🔑'}
                        </span>
                      </div>
                      <div style="padding:0.75rem 1.25rem;">
                        <p style="font-size:0.85rem;color:var(--color-text-muted);margin-bottom:0.75rem;">${u.description || ''}</p>
                        <div style="display:flex;flex-direction:column;gap:0.5rem;">
                          ${u.lessons ? u.lessons.map(les => `
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0.9rem;background:var(--color-bg-card);border-radius:var(--radius-sm);border:1px solid ${les.is_unlocked ? 'var(--color-border)' : 'rgba(239,68,68,0.2)'};">
                              <div style="display:flex;align-items:center;gap:0.6rem;">
                                <span style="font-size:1.1rem;">${les.is_unlocked ? '🎬' : '🔒'}</span>
                                <div>
                                  <div style="font-weight:600;font-size:0.92rem;color:${les.is_unlocked ? 'var(--color-text-main)' : 'var(--color-text-dim)'};">${les.title}</div>
                                  <div style="font-size:0.75rem;color:var(--color-text-muted);">
                                    ${les.progress?.is_completed ? '✅ مكتمل' : (les.progress?.watch_percentage > 0 ? `مشاهدة ${Math.round(les.progress.watch_percentage)}%` : 'لم يبدأ بعد')}
                                  </div>
                                </div>
                              </div>
                              <div>
                                ${les.is_unlocked ? `
                                  <a href="#/student/lesson/${les.id}" class="btn btn-primary btn-sm" style="font-size:0.8rem;padding:0.35rem 0.75rem;">مشاهدة الدرس</a>
                                ` : `
                                  <button class="btn btn-secondary btn-sm open-sub-modal-btn" style="font-size:0.8rem;padding:0.35rem 0.75rem;border-color:var(--color-primary);color:var(--color-primary);">تفعيل الاشتراك 🔑</button>
                                `}
                              </div>
                            </div>
                          `).join('') : '<p style="font-size:0.85rem;color:var(--color-text-muted);">لا توجد دروس في هذه الوحدة.</p>'}
                        </div>
                      </div>
                    </div>
                  `).join('') : ''}
                </div>
              </div>
            </div>
          </div>
        `;
      }
      listEl.innerHTML = html;

      // Bind all subscription modal triggers
      document.querySelectorAll('.open-sub-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.getElementById('sub-modal').style.display = 'flex';
        });
      });

    } catch (err) {
      console.error(err);
      Toast.error('حدث خطأ أثناء تحميل الكورسات');
    }
  }

  /* ===================================================================
     3. LESSON VIEW (Video Player, Description, Attachments, Exercises, Quiz)
  =================================================================== */
  static async renderLessonView(container, lessonId) {
    container.innerHTML = `
      <div style="margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;font-size:0.9rem;color:var(--color-text-muted);">
        <a href="#/student/courses" style="color:var(--color-primary);text-decoration:none;">المناهج والكورسات</a>
        <span>/</span>
        <span id="lesson-breadcrumb-title">جاري التحميل...</span>
      </div>

      <div id="lesson-container">
        <div class="card skeleton" style="height:420px;margin-bottom:1.5rem;"></div>
        <div class="card skeleton" style="height:200px;"></div>
      </div>
    `;

    try {
      const les = await ApiClient.get(`/lessons/${lessonId}`);
      document.getElementById('lesson-breadcrumb-title').textContent = les.title;

      const mainEl = document.getElementById('lesson-container');

      // Check if locked
      if (!les.is_unlocked) {
        mainEl.innerHTML = `
          <div class="card" style="text-align:center;padding:3rem 1.5rem;background:radial-gradient(ellipse at center, rgba(14,165,233,0.1) 0%, var(--color-bg-card) 70%);border:1px solid var(--color-border-light);">
            <div style="font-size:3.5rem;margin-bottom:1rem;">🔒</div>
            <h2 style="font-weight:900;color:var(--color-text-main);margin-bottom:0.5rem;">هذا الدرس مخصص للمشتركين فقط</h2>
            <p style="color:var(--color-text-muted);max-width:500px;margin:0 auto 1.5rem auto;line-height:1.6;">
              عذراً، يتطلب الوصول إلى محتوى هذا الدرس وجود اشتراك نشط على حسابك. قم بإدخال كود الاشتراك الخاص بك لفتح هذا الدرس وجميع محتويات المنهج فوراً.
            </p>
            <div style="display:flex;gap:1rem;justify-content:center;">
              <button id="lesson-locked-sub-btn" class="btn btn-primary" style="padding:0.75rem 1.5rem;font-weight:700;">🔑 إدخال كود الاشتراك</button>
              <a href="#/student/courses" class="btn btn-secondary" style="padding:0.75rem 1.25rem;">العودة للمنهج</a>
            </div>
          </div>
        `;
        document.getElementById('lesson-locked-sub-btn').addEventListener('click', () => {
          document.getElementById('sub-modal').style.display = 'flex';
        });
        return;
      }

      // Render Video Player
      let videoHtml = '';
      if (les.video_type === 'youtube' && les.video_id) {
        videoHtml = `
          <div class="video-container" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:var(--radius-md);background:#000;box-shadow:var(--shadow-lg);">
            <iframe 
              id="youtube-player-frame"
              src="https://www.youtube-nocookie.com/embed/${les.video_id}?enablejsapi=1&rel=0"
              style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen>
            </iframe>
          </div>
        `;
      } else if (les.video_type === 'uploaded' && les.video_url) {
        videoHtml = `
          <div style="border-radius:var(--radius-md);overflow:hidden;background:#000;box-shadow:var(--shadow-lg);">
            <video id="html5-lesson-player" controls style="width:100%;max-height:500px;display:block;">
              <source src="${les.video_url}" type="video/mp4">
              متصفحك لا يدعم تشغيل الفيديو المباشر.
            </video>
          </div>
        `;
      } else {
        videoHtml = `
          <div class="card empty-state" style="padding:2rem;">
            <p>لا يوجد فيديو مرفق مع هذا الدرس، يمكنك قراءة الشرح وحل التمارين أدناه.</p>
          </div>
        `;
      }

      mainEl.innerHTML = `
        <!-- Video Card -->
        <div class="card" style="padding:1rem;margin-bottom:1.5rem;">
          ${videoHtml}
          
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1.25rem;flex-wrap:wrap;gap:1rem;">
            <div>
              <h2 style="font-weight:900;font-size:1.5rem;color:var(--color-text-main);">${les.title}</h2>
              <div style="font-size:0.85rem;color:var(--color-text-muted);margin-top:0.25rem;">
                المدة المقدرة: ${Math.round(les.duration_seconds / 60)} دقيقة
              </div>
            </div>
            <div style="display:flex;gap:0.75rem;align-items:center;">
              <button id="bookmark-lesson-btn" class="btn btn-secondary btn-sm" title="حفظ الدرس">
                ${les.is_bookmarked ? '⭐ محفوظ' : '☆ حفظ'}
              </button>
              <button id="complete-lesson-btn" class="btn ${les.progress?.is_completed ? 'btn-success' : 'btn-primary'} btn-sm">
                ${les.progress?.is_completed ? '✅ تم إكمال الدرس' : 'تحديد كمكتمل'}
              </button>
            </div>
          </div>
        </div>

        <!-- Navigation Buttons: Previous / Next -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
          ${les.prev_lesson_id ? `
            <a href="#/student/lesson/${les.prev_lesson_id}" class="btn btn-secondary btn-sm">⟵ الدرس السابق</a>
          ` : '<div></div>'}
          
          ${les.next_lesson_id ? `
            <a href="#/student/lesson/${les.next_lesson_id}" class="btn btn-primary btn-sm">الدرس التالي ⟶</a>
          ` : '<div></div>'}
        </div>

        <!-- Lesson Tabs: Description, Exercises, Quiz, Resources -->
        <div class="card">
          <div style="display:flex;gap:1rem;border-bottom:1px solid var(--color-border);padding-bottom:0.75rem;margin-bottom:1.25rem;overflow-x:auto;">
            <button class="tab-btn active" data-tab="tab-content">📖 الشرح والملاحظات</button>
            <button class="tab-btn" data-tab="tab-exercises">💻 التمارين البرمجية (${les.exercises ? les.exercises.length : 0})</button>
            <button class="tab-btn" data-tab="tab-resources">📂 المذكرات والملفات (${les.resources ? les.resources.length : 0})</button>
            ${les.quiz ? `<button class="tab-btn" data-tab="tab-quiz">🎯 الاختبار القصير</button>` : ''}
          </div>

          <!-- Tab 1: Markdown Content -->
          <div id="tab-content" class="tab-pane active" style="line-height:1.8;color:var(--color-text-main);">
            <div style="font-size:1.05rem;margin-bottom:1rem;color:var(--color-text-muted);">${les.description || ''}</div>
            <div class="markdown-body" style="background:var(--color-bg-secondary);padding:1.5rem;border-radius:var(--radius-md);white-space:pre-wrap;font-family:var(--font-arabic);">${les.content_markdown || 'لا توجد ملاحظات إضافية.'}</div>
          </div>

          <!-- Tab 2: Exercises -->
          <div id="tab-exercises" class="tab-pane" style="display:none;">
            ${les.exercises && les.exercises.length > 0 ? les.exercises.map(ex => `
              <div style="background:var(--color-bg-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:1.25rem;margin-bottom:1rem;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
                  <h4 style="font-weight:800;color:var(--color-text-main);">${ex.title}</h4>
                  <span class="badge" style="background:var(--color-bg-secondary);color:var(--color-primary);">${ex.difficulty}</span>
                </div>
                <p style="color:var(--color-text-muted);font-size:0.9rem;margin-bottom:1rem;">${ex.description || ''}</p>
                <div style="display:flex;gap:0.75rem;">
                  <a href="#/student/exercises" class="btn btn-primary btn-sm">حل التمرين في المحرر ⟵</a>
                </div>
              </div>
            `).join('') : '<p style="color:var(--color-text-muted);">لا توجد تمارين مخصصة لهذا الدرس حالياً.</p>'}
          </div>

          <!-- Tab 3: Resources -->
          <div id="tab-resources" class="tab-pane" style="display:none;">
            ${les.resources && les.resources.length > 0 ? les.resources.map(r => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:0.9rem;background:var(--color-bg-secondary);border-radius:var(--radius-md);margin-bottom:0.75rem;">
                <div style="display:flex;align-items:center;gap:0.75rem;">
                  <span style="font-size:1.4rem;">📄</span>
                  <div>
                    <div style="font-weight:700;color:var(--color-text-main);">${r.title}</div>
                    <div style="font-size:0.8rem;color:var(--color-text-muted);">${r.resource_type === 'drive_link' ? 'رابط Google Drive' : 'ملف مرفوع'} • ${r.file_format?.toUpperCase()}</div>
                  </div>
                </div>
                <a href="${r.file_url}" target="_blank" class="btn btn-secondary btn-sm" download>تحميل المذكرة 📥</a>
              </div>
            `).join('') : '<p style="color:var(--color-text-muted);">لا توجد مذكرات مرفقة بهذا الدرس.</p>'}
          </div>

          <!-- Tab 4: Quiz -->
          ${les.quiz ? `
            <div id="tab-quiz" class="tab-pane" style="display:none;">
              <div style="background:var(--color-bg-secondary);padding:1.5rem;border-radius:var(--radius-md);text-align:center;">
                <h3 style="font-weight:800;color:var(--color-text-main);margin-bottom:0.5rem;">${les.quiz.title}</h3>
                <p style="color:var(--color-text-muted);font-size:0.9rem;margin-bottom:1.25rem;">درجة النجاح: ${les.quiz.passing_score}% • الوقت: ${les.quiz.time_limit_minutes} دقيقة</p>
                <a href="#/student/quizzes" class="btn btn-primary">بدء الاختبار القصير الآن 🎯</a>
              </div>
            </div>
          ` : ''}
        </div>
      `;

      // Tabs switcher logic
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
          btn.classList.add('active');
          const target = document.getElementById(btn.dataset.tab);
          if (target) target.style.display = 'block';
        });
      });

      // Complete button
      const completeBtn = document.getElementById('complete-lesson-btn');
      completeBtn.addEventListener('click', async () => {
        try {
          await ApiClient.put(`/lessons/${lessonId}/progress`, {
            last_video_position_seconds: les.duration_seconds || 0,
            watch_percentage: 100,
            is_completed: true
          });
          Toast.success('تهانينا! تم إكمال الدرس وحساب نقاط الخبرة 🎉');
          completeBtn.className = 'btn btn-success btn-sm';
          completeBtn.textContent = '✅ تم إكمال الدرس';
        } catch (e) {
          Toast.error(e.message);
        }
      });

      // Bookmark button
      const bmBtn = document.getElementById('bookmark-lesson-btn');
      bmBtn.addEventListener('click', async () => {
        try {
          await ApiClient.post('/bookmarks', { item_type: 'lesson', item_id: lessonId });
          Toast.success('تمت إضافة الدرس إلى محفوظاتك');
          bmBtn.textContent = '⭐ محفوظ';
        } catch (e) {
          Toast.error(e.message);
        }
      });

      // HTML5 video progress tracker
      const html5Video = document.getElementById('html5-lesson-player');
      if (html5Video) {
        if (les.progress?.last_video_position_seconds > 0) {
          html5Video.currentTime = les.progress.last_video_position_seconds;
        }
        html5Video.addEventListener('timeupdate', debounce(async () => {
          const pos = html5Video.currentTime;
          const dur = html5Video.duration || les.duration_seconds || 1;
          const pct = Math.min(100, (pos / dur) * 100);
          ApiClient.put(`/lessons/${lessonId}/progress`, {
            last_video_position_seconds: pos,
            watch_percentage: pct,
            is_completed: pct > 90
          }).catch(() => {});
        }, 5000));
      }

    } catch (err) {
      console.error(err);
      Toast.error('فشل تحميل تفاصيل الدرس');
    }
  }

  /* ===================================================================
     4. CODE PLAYGROUND (Python / JavaScript / HTML / CSS)
  =================================================================== */
  /* ===================================================================
     4. CODE PLAYGROUND & WEB DEVELOPMENT WORKSPACE (ENHANCED)
  =================================================================== */
  static async renderPlayground(container) {
    let currentMode = "python"; // python, javascript, web
    let currentActiveFile = "index.html";
    let currentProjectId = null;
    let lastErrorDetected = null;
    let isAiDrawerOpen = false;
    let savedEditorHeight = "52%";
    let savedTerminalHeight = "48%";

    // Web Workspace in-memory file structure
    let webFiles = {
      "index.html": `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>مشروعي الأول - Code Spark</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1>مرحباً بك في عالم تطوير الويب! 🚀</h1>
    <p>قم بتعديل HTML أو CSS أو JavaScript وشاهد النتيجة مباشرة في نافذة المعاينة.</p>
    <button id="click-btn" class="btn">اضغط هنا للتفاعل ✨</button>
    <div id="counter" class="counter-box">عدد النقرات: 0</div>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
      "style.css": `body {
  margin: 0;
  padding: 2rem;
  font-family: system-ui, -apple-system, sans-serif;
  background: #0B132B;
  color: #F8FAFC;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
}
.container {
  background: #0F172A;
  padding: 2.5rem;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  border: 1px solid #1E293B;
  text-align: center;
  max-width: 500px;
}
h1 { color: #38BDF8; margin-top: 0; }
.btn {
  background: linear-gradient(135deg, #0EA5E9, #0284C7);
  color: white;
  border: none;
  padding: 0.8rem 1.8rem;
  font-size: 1rem;
  font-weight: bold;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}
.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(14,165,233,0.4);
}
.counter-box {
  margin-top: 1.5rem;
  font-size: 1.2rem;
  font-weight: bold;
  color: #A5F3FC;
}`,
      "script.js": `let count = 0;
const btn = document.getElementById("click-btn");
const counter = document.getElementById("counter");

btn.addEventListener("click", () => {
  count++;
  counter.textContent = "عدد النقرات: " + count;
  btn.style.transform = "scale(0.95)";
  setTimeout(() => { btn.style.transform = "scale(1)"; }, 100);
});`
    };

    const standaloneStarters = {
      python: `# بيئة بايثون 3.11 التفاعلية (Code Spark IDE)
print("مرحباً بك في بيئة تشغيل بايثون!")`,
      javascript: `// بيئة جافا سكريبت التفاعلية (Node.js)
const students = ["عمر", "سارة", "أحمد", "مريم"];
students.forEach((name, idx) => {
  console.log(\`الطالب #\${idx + 1}: \${name} في منصة Code Spark\`);
});`
    };

    container.innerHTML = `
      <!-- Header Toolbar -->
      <div style="margin-bottom:0.75rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;">
        <div>
          <h2 style="font-size:1.6rem;font-weight:900;color:var(--color-text-main);display:flex;align-items:center;gap:0.5rem;margin-bottom:0.2rem;">
            <span>💻</span> محرر الأكواد التفاعلي (Code Playground)
          </h2>
          <p style="color:var(--color-text-muted);font-size:0.85rem;margin:0;">بيئة IDE سحابية متطورة لتشغيل بايثون 3.11، نود جي اس، ومشاريع الويب مع شاشة مخرجات كبيرة قابلة للتكبير وإعادة التحجيم</p>
        </div>

        <!-- Mode Selectors & Action Buttons -->
        <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
          <div style="display:inline-flex;background:var(--color-bg-surface);padding:3px;border-radius:var(--radius-md);border:1px solid var(--color-border);">
            <button class="playground-mode-btn active" data-mode="python">🐍 Python 3.11</button>
            <button class="playground-mode-btn" data-mode="javascript">⚡ Node.js</button>
            <button class="playground-mode-btn" data-mode="web">🌐 برمجة الويب (Web Dev)</button>
          </div>

          <div id="web-actions-bar" style="display:none;gap:0.5rem;">
            <button id="btn-save-project" class="btn btn-secondary btn-sm" title="حفظ المشروع في قاعدة البيانات">💾 حفظ المشروع</button>
            <button id="btn-load-projects" class="btn btn-secondary btn-sm" title="فتح المشاريع السابقة">📂 مشاريعي</button>
          </div>

          <button id="main-run-btn" class="btn btn-primary" style="font-weight:800;padding:0.5rem 1.4rem;display:flex;align-items:center;gap:0.5rem;font-size:0.95rem;box-shadow:0 0 15px rgba(14,165,233,0.3);">
            <span>▶</span> تشغيل الكود
          </button>
        </div>
      </div>

      <!-- Professional IDE Stacked Container (Editor Top, Terminal Bottom) -->
      <div id="playground-ide-container" class="playground-ide-layout">

        <!-- TOP PANE: Code Editor -->
        <div id="playground-editor-section" class="playground-editor-section" style="height:52%;">
          
          <!-- Web Workspace File Tabs -->
          <div id="web-file-tabs-bar" style="display:none;align-items:center;justify-content:space-between;border-bottom:1px solid var(--color-border);padding:0.35rem 0.75rem;background:#090E1A;">
            <div id="web-tabs-container" style="display:flex;gap:0.35rem;overflow-x:auto;"></div>
            <div style="display:flex;gap:0.3rem;">
              <button id="btn-new-file" class="btn btn-secondary btn-sm" style="padding:2px 8px;font-size:0.75rem;" title="إضافة ملف جديد">+ ملف</button>
              <button id="btn-del-file" class="btn btn-secondary btn-sm" style="padding:2px 8px;font-size:0.75rem;" title="حذف الملف الحالي">🗑️</button>
            </div>
          </div>

          <!-- Standalone Editor Header Toolbar -->
          <div id="standalone-editor-header" style="display:flex;justify-content:space-between;align-items:center;padding:0.4rem 0.75rem;border-bottom:1px solid #1E293B;background:#080D1A;">
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <span id="editor-file-title" style="font-weight:800;font-size:0.88rem;color:var(--color-primary);font-family:var(--font-mono);display:flex;align-items:center;gap:0.3rem;">
                <span>📄</span> main.py
              </span>
              <span id="editor-language-indicator" style="font-size:0.75rem;color:var(--color-cyan-accent);background:rgba(14,165,233,0.12);padding:1px 6px;border-radius:4px;font-family:var(--font-mono);">Python 3.11</span>
            </div>
            <div style="display:flex;gap:0.4rem;">
              <button id="editor-format-btn" class="btn btn-secondary btn-sm" style="font-size:0.75rem;padding:2px 8px;">تنظيف الكود</button>
              <button id="editor-clear-btn" class="btn btn-secondary btn-sm" style="font-size:0.75rem;padding:2px 8px;">مسح المحرر</button>
            </div>
          </div>

          <!-- Editor Textarea with Autocomplete -->
          <div style="position:relative;flex:1;display:flex;flex-direction:column;min-height:0;">
            <textarea id="main-code-editor" class="form-input" style="flex:1;width:100%;height:100%;font-family:var(--font-mono);font-size:0.98rem;line-height:1.65;direction:ltr;text-align:left;background:#030712;color:#38BDF8;border:none;outline:none;resize:none;padding:1rem;border-radius:0;" spellcheck="false"></textarea>
            <div id="autocomplete-popup" class="code-autocomplete-box"></div>
          </div>

          <!-- Editor Footer Status -->
          <div style="display:flex;justify-content:space-between;align-items:center;padding:0.25rem 0.75rem;border-top:1px solid #1E293B;font-size:0.75rem;color:var(--color-text-dim);background:#050B17;">
            <span>الأسطر: <span id="stat-lines-count">1</span> | الأحرف: <span id="stat-chars-count">0</span></span>
            <span style="font-family:var(--font-mono);color:#64748B;">UTF-8 | LF</span>
          </div>

        </div>

        <!-- DRAGGABLE HORIZONTAL SPLITTER -->
        <div id="playground-drag-divider" class="playground-drag-divider" title="اسحب لأعلى أو لأسفل لتكبير أو تصغير مساحة المخرجات">
          <div class="handle-bar"></div>
        </div>

        <!-- BOTTOM PANE: Substantial Terminal Console & Output -->
        <div id="playground-terminal-section" class="playground-terminal-section" style="height:48%;">

          <!-- Terminal Top Control Header -->
          <div style="display:flex;justify-content:space-between;align-items:center;padding:0.4rem 0.75rem;background:#060C1B;border-bottom:1px solid #1E293B;flex-wrap:wrap;gap:0.4rem;">
            <div style="display:flex;align-items:center;gap:0.6rem;">
              <div style="font-weight:900;font-size:0.88rem;color:var(--color-text-main);display:flex;align-items:center;gap:0.4rem;">
                <span style="color:#F59E0B;">⚡</span> شاشة المخرجات (Terminal Console)
              </div>
              <div id="run-status-text" style="font-size:0.75rem;color:var(--color-text-dim);font-weight:600;">جاهز للتشغيل</div>
            </div>
            
            <div style="display:flex;align-items:center;gap:0.4rem;">
              <button id="btn-toggle-ai" class="btn btn-secondary btn-sm" style="font-size:0.75rem;padding:2px 8px;" title="فتح مساعد البرمجة الذكي">
                🤖 المساعد الذكي
              </button>
              <button id="btn-clear-terminal" class="btn btn-secondary btn-sm" style="font-size:0.75rem;padding:2px 8px;" title="مسح المخرجات">
                🗑️ مسح المخرجات
              </button>
              <button id="btn-maximize-terminal" class="btn btn-secondary btn-sm" style="font-size:0.75rem;padding:2px 10px;font-weight:700;" title="تكبير أو استعادة نافذة المخرجات">
                ⛶ تكبير الشاشة
              </button>
            </div>
          </div>

          <!-- Standalone Terminal Console Output (Python / Node) -->
          <div id="standalone-output-view" style="flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden;position:relative;">
            <pre id="standalone-terminal-output" class="terminal-console-output">اضغط على [▶ تشغيل الكود] لعرض المخرجات هنا...</pre>
          </div>

          <!-- Web Development Live Preview & Console (Web Mode Only) -->
          <div id="web-preview-view" style="display:none;flex:1;min-height:0;overflow:hidden;">
            <div style="display:flex;height:100%;gap:0;">
              <!-- Live Sandbox Frame -->
              <div style="flex:1.4;display:flex;flex-direction:column;border-right:1px solid #1E293B;">
                <div style="display:flex;justify-content:space-between;align-items:center;padding:0.3rem 0.6rem;background:#080E1C;border-bottom:1px solid #1E293B;">
                  <span style="font-size:0.78rem;font-weight:700;color:var(--color-cyan-accent);">👁️ المعاينة المباشرة (Sandbox)</span>
                  <button id="btn-reload-preview" class="btn btn-secondary btn-sm" style="font-size:0.72rem;padding:1px 6px;">إعادة تحميل 🔄</button>
                </div>
                <iframe id="web-live-iframe" sandbox="allow-scripts" style="flex:1;width:100%;height:100%;border:none;background:#FFF;"></iframe>
              </div>
              <!-- Web Console -->
              <div style="flex:1;display:flex;flex-direction:column;">
                <div style="display:flex;justify-content:space-between;align-items:center;padding:0.3rem 0.6rem;background:#080E1C;border-bottom:1px solid #1E293B;">
                  <span style="font-size:0.78rem;font-weight:700;color:var(--color-text-muted);">🖥️ Console Logs</span>
                  <button id="btn-clear-web-console" class="btn btn-secondary btn-sm" style="font-size:0.72rem;padding:1px 6px;">مسح</button>
                </div>
                <div id="web-console-logs" style="flex:1;overflow-y:auto;font-family:var(--font-mono);font-size:0.82rem;background:#030712;padding:0.5rem;display:flex;flex-direction:column;gap:0.2rem;direction:ltr;text-align:left;">
                  <div style="color:#64748B;">[Console ready]</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Collapsible AI Assistant Panel (Drawer) -->
          <div id="ai-assistant-container" style="display:none;background:#060D1F;border-top:1px solid #1E293B;padding:0.65rem 0.85rem;max-height:220px;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;">
              <div style="font-weight:800;font-size:0.85rem;color:var(--color-primary);display:flex;align-items:center;gap:0.4rem;">
                <span>🤖</span> مساعد البرمجة التعليمي الذكي
              </div>
              <button id="btn-quick-fix-error" class="btn btn-danger btn-sm" style="display:none;padding:1px 8px;font-size:0.75rem;font-weight:700;">
                🛠️ إصلاح الخطأ
              </button>
            </div>
            <div style="display:flex;gap:0.35rem;flex-wrap:wrap;margin-bottom:0.4rem;">
              <button class="btn btn-secondary btn-sm ai-action-btn" data-act="hint" style="font-size:0.72rem;padding:2px 7px;">💡 تلميح</button>
              <button class="btn btn-secondary btn-sm ai-action-btn" data-act="explain" style="font-size:0.72rem;padding:2px 7px;">📖 شرح الكود</button>
              <button class="btn btn-secondary btn-sm ai-action-btn" data-act="detect_error" style="font-size:0.72rem;padding:2px 7px;">🔍 فحص الأخطاء</button>
              <button class="btn btn-secondary btn-sm ai-action-btn" data-act="complete" style="font-size:0.72rem;padding:2px 7px;">⚡ إكمال الكود</button>
              <button class="btn btn-secondary btn-sm ai-action-btn" data-act="improve" style="font-size:0.72rem;padding:2px 7px;">🚀 تحسينات</button>
            </div>
            <div id="ai-assistant-response" style="max-height:100px;overflow-y:auto;background:#02050D;padding:0.5rem;border-radius:4px;font-size:0.82rem;line-height:1.5;color:var(--color-text-main);white-space:pre-wrap;border:1px solid #1E293B;">اختر أي إجراء لمساعدتك في فهم الكود خطوة بخطوة...</div>
            <button id="btn-apply-ai-code" class="btn btn-primary btn-sm" style="display:none;width:100%;margin-top:0.35rem;font-weight:700;padding:0.3rem;">تطبيق الكود المقترح على المحرر ✨</button>
          </div>

        </div>

      </div>
    `;

    // DOM Elements
    const ideContainer = document.getElementById("playground-ide-container");
    const editorSection = document.getElementById("playground-editor-section");
    const dragDivider = document.getElementById("playground-drag-divider");
    const terminalSection = document.getElementById("playground-terminal-section");
    const btnMaximize = document.getElementById("btn-maximize-terminal");
    const btnClearTerminal = document.getElementById("btn-clear-terminal");
    const btnToggleAi = document.getElementById("btn-toggle-ai");
    const aiContainer = document.getElementById("ai-assistant-container");

    const editor = document.getElementById("main-code-editor");
    const terminal = document.getElementById("standalone-terminal-output");
    const runBtn = document.getElementById("main-run-btn");
    const runStatusText = document.getElementById("run-status-text");
    const popup = document.getElementById("autocomplete-popup");
    const linesCount = document.getElementById("stat-lines-count");
    const charsCount = document.getElementById("stat-chars-count");
    const langIndicator = document.getElementById("editor-language-indicator");
    const fileTitle = document.getElementById("editor-file-title");

    const standaloneOutView = document.getElementById("standalone-output-view");
    const webPrevView = document.getElementById("web-preview-view");
    const webTabsBar = document.getElementById("web-file-tabs-bar");
    const webActionsBar = document.getElementById("web-actions-bar");
    const standaloneHeader = document.getElementById("standalone-editor-header");
    const webTabsContainer = document.getElementById("web-tabs-container");
    const webIframe = document.getElementById("web-live-iframe");
    const webConsole = document.getElementById("web-console-logs");

    const aiResponse = document.getElementById("ai-assistant-response");
    const btnApplyAi = document.getElementById("btn-apply-ai-code");
    const btnQuickFix = document.getElementById("btn-quick-fix-error");

    let suggestedAiCode = null;

    // -------------------------------------------------------------
    // Draggable Splitter Implementation
    // -------------------------------------------------------------
    let isDragging = false;

    dragDivider.addEventListener("mousedown", (e) => {
      if (ideContainer.classList.contains("maximized")) return;
      isDragging = true;
      dragDivider.classList.add("dragging");
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging || ideContainer.classList.contains("maximized")) return;
      const rect = ideContainer.getBoundingClientRect();
      const newEditorH = e.clientY - rect.top;
      const divH = 12;
      const minH = 120;
      const maxH = rect.height - minH - divH;
      const clamped = Math.max(minH, Math.min(maxH, newEditorH));
      
      savedEditorHeight = `${clamped}px`;
      savedTerminalHeight = `${rect.height - clamped - divH}px`;
      editorSection.style.height = savedEditorHeight;
      terminalSection.style.height = savedTerminalHeight;
      editorSection.style.flex = "none";
      terminalSection.style.flex = "none";
    });

    window.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        dragDivider.classList.remove("dragging");
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    });

    // Touch events for mobile / tablets
    dragDivider.addEventListener("touchstart", (e) => {
      if (ideContainer.classList.contains("maximized")) return;
      isDragging = true;
      dragDivider.classList.add("dragging");
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
      if (!isDragging || ideContainer.classList.contains("maximized") || !e.touches[0]) return;
      const touch = e.touches[0];
      const rect = ideContainer.getBoundingClientRect();
      const newEditorH = touch.clientY - rect.top;
      const divH = 12;
      const minH = 120;
      const maxH = rect.height - minH - divH;
      const clamped = Math.max(minH, Math.min(maxH, newEditorH));

      savedEditorHeight = `${clamped}px`;
      savedTerminalHeight = `${rect.height - clamped - divH}px`;
      editorSection.style.height = savedEditorHeight;
      terminalSection.style.height = savedTerminalHeight;
      editorSection.style.flex = "none";
      terminalSection.style.flex = "none";
    }, { passive: true });

    window.addEventListener("touchend", () => {
      if (isDragging) {
        isDragging = false;
        dragDivider.classList.remove("dragging");
      }
    });

    // Maximize / Restore Controls
    btnMaximize?.addEventListener("click", () => {
      const isMax = ideContainer.classList.contains("maximized");
      if (!isMax) {
        savedEditorHeight = editorSection.style.height || "52%";
        savedTerminalHeight = terminalSection.style.height || "48%";
        ideContainer.classList.add("maximized");
        btnMaximize.innerHTML = "🗗 استعادة الحجم";
        btnMaximize.classList.remove("btn-secondary");
        btnMaximize.classList.add("btn-primary");
      } else {
        ideContainer.classList.remove("maximized");
        editorSection.style.height = savedEditorHeight;
        terminalSection.style.height = savedTerminalHeight;
        btnMaximize.innerHTML = "⛶ تكبير الشاشة";
        btnMaximize.classList.remove("btn-primary");
        btnMaximize.classList.add("btn-secondary");
      }
    });

    // Clear Terminal Output
    btnClearTerminal?.addEventListener("click", () => {
      terminal.textContent = "تم مسح شاشة المخرجات.";
      terminal.style.color = "var(--color-text-dim)";
      runStatusText.textContent = "جاهز";
    });

    // Toggle AI Assistant Drawer
    btnToggleAi?.addEventListener("click", () => {
      isAiDrawerOpen = !isAiDrawerOpen;
      if (aiContainer) {
        aiContainer.style.display = isAiDrawerOpen ? "block" : "none";
      }
      btnToggleAi.classList.toggle("btn-primary", isAiDrawerOpen);
      btnToggleAi.classList.toggle("btn-secondary", !isAiDrawerOpen);
    });

    // Switch Modes (Python vs Node vs Web)
    function setMode(mode) {
      currentMode = mode;
      document.querySelectorAll(".playground-mode-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.mode === mode);
      });

      if (mode === "web") {
        webTabsBar.style.display = "flex";
        webActionsBar.style.display = "flex";
        standaloneHeader.style.display = "none";
        standaloneOutView.style.display = "none";
        webPrevView.style.display = "block";
        runBtn.innerHTML = "<span>🔄</span> تحديث المعاينة";
        langIndicator.textContent = "HTML / CSS / JS";
        renderWebTabs();
        loadWebFile(currentActiveFile);
        updateLivePreview();
      } else {
        webTabsBar.style.display = "none";
        webActionsBar.style.display = "none";
        standaloneHeader.style.display = "flex";
        standaloneOutView.style.display = "flex";
        webPrevView.style.display = "none";
        runBtn.innerHTML = "<span>▶</span> تشغيل الكود";

        if (mode === "python") {
          fileTitle.innerHTML = "<span>🐍</span> main.py";
          langIndicator.textContent = "Python 3.11";
          editor.value = standaloneStarters.python;
        } else if (mode === "javascript") {
          fileTitle.innerHTML = "<span>⚡</span> script.js";
          langIndicator.textContent = "Node.js v18";
          editor.value = standaloneStarters.javascript;
        }
        updateEditorStats();
      }
    }

    document.querySelectorAll(".playground-mode-btn").forEach(btn => {
      btn.addEventListener("click", () => setMode(btn.dataset.mode));
    });

    // -------------------------------------------------------------
    // Web Mode Workspace Tabs & Management
    // -------------------------------------------------------------
    function renderWebTabs() {
      webTabsContainer.innerHTML = "";
      Object.keys(webFiles).forEach(fileName => {
        const tab = document.createElement("button");
        tab.className = `btn btn-sm ${fileName === currentActiveFile ? "btn-primary" : "btn-secondary"}`;
        tab.style.padding = "2px 10px";
        tab.style.fontSize = "0.8rem";
        tab.textContent = fileName;
        tab.addEventListener("click", () => {
          webFiles[currentActiveFile] = editor.value;
          currentActiveFile = fileName;
          renderWebTabs();
          loadWebFile(fileName);
        });
        webTabsContainer.appendChild(tab);
      });
    }

    function loadWebFile(fileName) {
      editor.value = webFiles[fileName] || "";
      updateEditorStats();
    }

    // New File
    document.getElementById("btn-new-file")?.addEventListener("click", () => {
      const name = prompt("أدخل اسم الملف الجديد مع الامتداد (مثال: about.html أو utils.js):");
      if (name && name.trim()) {
        const cleanName = name.trim();
        if (webFiles[cleanName]) {
          Toast.error("الملف موجود بالفعل بهذا الاسم");
          return;
        }
        webFiles[cleanName] = `/* ${cleanName} */\n`;
        currentActiveFile = cleanName;
        renderWebTabs();
        loadWebFile(cleanName);
      }
    });

    // Delete File
    document.getElementById("btn-del-file")?.addEventListener("click", () => {
      if (Object.keys(webFiles).length <= 1) {
        Toast.error("لا يمكن حذف آخر ملف في المشروع");
        return;
      }
      if (confirm(`هل أنت متأكد من رغبتك في حذف الملف (${currentActiveFile})؟`)) {
        delete webFiles[currentActiveFile];
        currentActiveFile = Object.keys(webFiles)[0];
        renderWebTabs();
        loadWebFile(currentActiveFile);
        updateLivePreview();
      }
    });

    // -------------------------------------------------------------
    // Live Preview Engine (HTML + CSS + JS in isolated iframe sandbox)
    // -------------------------------------------------------------
    function updateLivePreview() {
      if (currentMode !== "web") return;
      webFiles[currentActiveFile] = editor.value;

      const html = webFiles["index.html"] || "";
      const css = webFiles["style.css"] || "";
      const js = webFiles["script.js"] || "";

      const consoleCaptureScript = `
        <script>
          (function() {
            function sendLog(type, args) {
              try {
                window.parent.postMessage({
                  source: "codespark_sandbox",
                  type: type,
                  message: Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
                }, "*");
              } catch(e) {}
            }
            const _log = console.log;
            const _err = console.error;
            const _warn = console.warn;
            console.log = function() { sendLog('log', arguments); _log.apply(console, arguments); };
            console.error = function() { sendLog('error', arguments); _err.apply(console, arguments); };
            console.warn = function() { sendLog('warn', arguments); _warn.apply(console, arguments); };
          })();
        </script>
      `;

      let combinedDoc = html;
      if (css && !combinedDoc.includes("<style>")) {
        combinedDoc = combinedDoc.replace("</head>", `<style>${css}</style></head>`);
      }
      combinedDoc = combinedDoc.replace("<head>", `<head>${consoleCaptureScript}`);
      if (js && !combinedDoc.includes('<script src="script.js">')) {
        combinedDoc = combinedDoc.replace("</body>", `<script>${js}</script></body>`);
      } else if (js) {
        combinedDoc = combinedDoc.replace('<script src="script.js"></script>', `<script>${js}</script>`);
      }

      webIframe.srcdoc = combinedDoc;
    }

    // Capture console messages from sandbox iframe
    window.addEventListener("message", (event) => {
      if (event.data && event.data.source === "codespark_sandbox") {
        const item = document.createElement("div");
        if (event.data.type === "error") {
          item.style.color = "#EF4444";
          item.textContent = `❌ [Error] ${event.data.message}`;
        } else if (event.data.type === "warn") {
          item.style.color = "#F59E0B";
          item.textContent = `⚠️ [Warn] ${event.data.message}`;
        } else {
          item.style.color = "#38BDF8";
          item.textContent = `💬 ${event.data.message}`;
        }
        webConsole.appendChild(item);
        webConsole.scrollTop = webConsole.scrollHeight;
      }
    });

    document.getElementById("btn-clear-web-console")?.addEventListener("click", () => {
      webConsole.innerHTML = '<div style="color:#64748B;">[سجل المخرجات فارغ]</div>';
    });

    document.getElementById("btn-reload-preview")?.addEventListener("click", updateLivePreview);

    // -------------------------------------------------------------
    // Save & Load Web Projects via Backend API (/api/playground/projects)
    // -------------------------------------------------------------
    document.getElementById("btn-save-project")?.addEventListener("click", async () => {
      webFiles[currentActiveFile] = editor.value;
      const title = prompt("أدخل اسماً لحفظ مشروع الويب الخاص بك:", currentProjectId ? "مشروعي المحدث" : "مشروعي التفاعلي");
      if (!title) return;

      try {
        if (currentProjectId) {
          await ApiClient.put(`/playground/projects/${currentProjectId}`, {
            title: title.trim(),
            files: webFiles
          });
          Toast.success("تم تحديث المشروع بنجاح في حسابك! 💾");
        } else {
          const res = await ApiClient.post("/playground/projects", {
            title: title.trim(),
            files: webFiles
          });
          currentProjectId = res.project_id;
          Toast.success("تم حفظ المشروع الجديد بنجاح في حسابك! 🚀");
        }
      } catch (err) {
        Toast.error("فشل حفظ المشروع: " + err.message);
      }
    });

    document.getElementById("btn-load-projects")?.addEventListener("click", async () => {
      try {
        const projects = await ApiClient.get("/playground/projects");
        if (!projects || projects.length === 0) {
          Toast.info("لا توجد مشاريع ويب محفوظة سابقة لديك");
          return;
        }

        const projectListHtml = projects.map(p => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem;border-bottom:1px solid var(--color-border);gap:0.5rem;">
            <div>
              <strong style="color:var(--color-text-main);font-size:0.95rem;">${p.title}</strong>
              <div style="font-size:0.75rem;color:var(--color-text-dim);">آخر تعديل: ${p.updated_at.substring(0, 10)}</div>
            </div>
            <div style="display:flex;gap:0.3rem;">
              <button class="btn btn-primary btn-sm btn-open-p" data-pid="${p.id}">فتح 📂</button>
              <button class="btn btn-danger btn-sm btn-del-p" data-pid="${p.id}">🗑️</button>
            </div>
          </div>
        `).join("");

        Modal.show({
          title: "📂 مشاريع الويب المحفوظة لديك",
          content: `<div style="max-height:350px;overflow-y:auto;">${projectListHtml}</div>`,
          onRender: (modalEl) => {
            modalEl.querySelectorAll(".btn-open-p").forEach(btn => {
              btn.addEventListener("click", async () => {
                const pData = await ApiClient.get(`/playground/projects/${btn.dataset.pid}`);
                currentProjectId = pData.id;
                webFiles = pData.files || {};
                currentActiveFile = Object.keys(webFiles)[0] || "index.html";
                renderWebTabs();
                loadWebFile(currentActiveFile);
                updateLivePreview();
                Modal.close();
                Toast.success(`تم تحميل مشروع: ${pData.title}`);
              });
            });

            modalEl.querySelectorAll(".btn-del-p").forEach(btn => {
              btn.addEventListener("click", async () => {
                if (confirm("هل أنت متأكد من حذف هذا المشروع نهائياً؟")) {
                  await ApiClient.delete(`/playground/projects/${btn.dataset.pid}`);
                  Toast.success("تم حذف المشروع");
                  Modal.close();
                }
              });
            });
          }
        });
      } catch (err) {
        Toast.error("تعذر جلب المشاريع: " + err.message);
      }
    });

    // -------------------------------------------------------------
    // RUN CODE EXECUTION ENGINE (Python & Node & Web)
    // -------------------------------------------------------------
    runBtn.addEventListener("click", async () => {
      if (currentMode === "web") {
        updateLivePreview();
        Toast.success("تم تحديث المعاينة المباشرة بنجاح ✨");
        return;
      }

      runBtn.disabled = true;
      runBtn.innerHTML = "<span>⏳</span> جاري التشغيل...";
      runStatusText.textContent = "جاري المعالجة...";

      let code = editor.value;

      try {
        const res = await ApiClient.post("/playground/run", {
          language: currentMode,
          code: code
        });

        if (res.success) {
          terminal.textContent = res.output || "(تم التنفيذ بنجاح دون مخرجات نصية)";
          terminal.style.color = "#38BDF8";
          runStatusText.textContent = "تم التنفيذ بنجاح ✅";
          terminal.scrollTop = terminal.scrollHeight;
        } else {
          terminal.textContent = res.error || res.output || "حدث خطأ أثناء التنفيذ";
          terminal.style.color = "#EF4444";
          runStatusText.textContent = "تم رصد خطأ ❌";
          lastErrorDetected = res.error || res.output;
          terminal.scrollTop = terminal.scrollHeight;
          if (btnQuickFix) btnQuickFix.style.display = "inline-flex";
        }
      } catch (err) {
        terminal.textContent = err.message || "فشل الاتصال بالخادم";
        terminal.style.color = "#EF4444";
        runStatusText.textContent = "فشل الاتصال";
        terminal.scrollTop = terminal.scrollHeight;
      } finally {
        runBtn.disabled = false;
        runBtn.innerHTML = "<span>▶</span> تشغيل الكود";
      }
    });

    // -------------------------------------------------------------
    // Real Code Completion / IntelliSense Engine
    // -------------------------------------------------------------
    const completions = {
      html: [
        { label: "<div>", insert: "<div>\n  \n</div>", type: "tag" },
        { label: "<p>", insert: "<p></p>", type: "tag" },
        { label: "<button>", insert: "<button class=\"btn\"></button>", type: "tag" },
        { label: "<input>", insert: "<input type=\"text\" placeholder=\"\">", type: "tag" },
        { label: "<span>", insert: "<span></span>", type: "tag" },
        { label: "<h1>", insert: "<h1></h1>", type: "tag" },
        { label: "<ul>", insert: "<ul>\n  <li></li>\n</ul>", type: "tag" },
        { label: "class=\"\"", insert: "class=\"\"", type: "attr" },
        { label: "id=\"\"", insert: "id=\"\"", type: "attr" },
        { label: "style=\"\"", insert: "style=\"\"", type: "attr" }
      ],
      css: [
        { label: "display: flex;", insert: "display: flex;\njustify-content: center;\nalign-items: center;", type: "prop" },
        { label: "display: grid;", insert: "display: grid;\ngrid-template-columns: 1fr 1fr;\ngap: 1rem;", type: "prop" },
        { label: "color: #...", insert: "color: #38BDF8;", type: "prop" },
        { label: "background: ...", insert: "background: #0F172A;", type: "prop" },
        { label: "border-radius: ...", insert: "border-radius: 8px;", type: "prop" },
        { label: "padding: ...", insert: "padding: 1rem;", type: "prop" },
        { label: "margin: ...", insert: "margin: 0 auto;", type: "prop" },
        { label: "font-size: ...", insert: "font-size: 1rem;", type: "prop" }
      ],
      javascript: [
        { label: "document.getElementById", insert: "document.getElementById(\"\")", type: "dom" },
        { label: "document.querySelector", insert: "document.querySelector(\"\")", type: "dom" },
        { label: "addEventListener", insert: "addEventListener(\"click\", (e) => {\n  \n});", type: "event" },
        { label: "console.log()", insert: "console.log()", type: "fn" },
        { label: "fetch()", insert: "fetch(url).then(res => res.json()).then(data => console.log(data));", type: "net" },
        { label: "setTimeout()", insert: "setTimeout(() => {\n  \n}, 1000);", type: "async" }
      ],
      python: [
        { label: "print()", insert: "print()", type: "fn" },
        { label: "def function():", insert: "def my_function(param):\n    return param", type: "keyword" },
        { label: "if __name__ == '__main__':", insert: "if __name__ == '__main__':\n    pass", type: "keyword" },
        { label: "for item in list:", insert: "for item in items:\n    print(item)", type: "loop" },
        { label: "try ... except", insert: "try:\n    \nexcept Exception as e:\n    print(e)", type: "block" },
        { label: "class MyClass:", insert: "class MyClass:\n    def __init__(self):\n        pass", type: "class" }
      ]
    };

    function getActiveLanguageSuggestions() {
      if (currentMode === "python") return completions.python;
      if (currentMode === "javascript") return completions.javascript;
      if (currentMode === "web") {
        if (currentActiveFile.endsWith(".html")) return completions.html;
        if (currentActiveFile.endsWith(".css")) return completions.css;
        if (currentActiveFile.endsWith(".js")) return completions.javascript;
      }
      return [];
    }

    editor.addEventListener("input", (e) => {
      updateEditorStats();
      if (currentMode === "web") webFiles[currentActiveFile] = editor.value;

      const val = editor.value;
      const cursorPos = editor.selectionStart;
      const textBefore = val.substring(0, cursorPos);
      const match = textBefore.match(/[a-zA-Z0-9_<]{2,}$/);

      if (match) {
        const query = match[0].toLowerCase();
        const pool = getActiveLanguageSuggestions();
        const matches = pool.filter(item => item.label.toLowerCase().includes(query));

        if (matches.length > 0) {
          renderAutocompletePopup(matches, cursorPos - match[0].length, cursorPos);
        } else {
          hideAutocomplete();
        }
      } else {
        hideAutocomplete();
      }
    });

    function renderAutocompletePopup(items, replaceStart, replaceEnd) {
      popup.innerHTML = "";
      items.forEach((item, idx) => {
        const div = document.createElement("div");
        div.className = `autocomplete-item ${idx === 0 ? "active" : ""}`;
        div.innerHTML = `
          <span>${item.label}</span>
          <span style="font-size:0.65rem;color:var(--color-text-dim);background:var(--color-bg-deep);padding:1px 4px;border-radius:3px;">${item.type}</span>
        `;
        div.addEventListener("click", () => {
          applySuggestion(item.insert, replaceStart, replaceEnd);
        });
        popup.appendChild(div);
      });
      popup.style.display = "block";
    }

    function hideAutocomplete() {
      popup.style.display = "none";
    }

    function applySuggestion(text, start, end) {
      const val = editor.value;
      editor.value = val.substring(0, start) + text + val.substring(end);
      hideAutocomplete();
      editor.focus();
      const newCursor = start + text.length;
      editor.setSelectionRange(newCursor, newCursor);
      updateEditorStats();
      if (currentMode === "web") webFiles[currentActiveFile] = editor.value;
    }

    // Keyboard navigation in autocomplete
    editor.addEventListener("keydown", (e) => {
      if (popup.style.display === "block") {
        const items = popup.querySelectorAll(".autocomplete-item");
        let activeIdx = Array.from(items).findIndex(it => it.classList.contains("active"));

        if (e.key === "ArrowDown") {
          e.preventDefault();
          items[activeIdx].classList.remove("active");
          const next = (activeIdx + 1) % items.length;
          items[next].classList.add("active");
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          items[activeIdx].classList.remove("active");
          const prev = (activeIdx - 1 + items.length) % items.length;
          items[prev].classList.add("active");
        } else if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          if (items[activeIdx]) items[activeIdx].click();
        } else if (e.key === "Escape") {
          hideAutocomplete();
        }
      }
    });

    // Editor statistics
    function updateEditorStats() {
      const val = editor.value;
      linesCount.textContent = val ? val.split("\n").length : 1;
      charsCount.textContent = val.length;
    }

    // -------------------------------------------------------------
    // AI Assistant Integration
    // -------------------------------------------------------------
    async function triggerAiAssistant(action, customError = null) {
      if (aiContainer) aiContainer.style.display = "block";
      isAiDrawerOpen = true;
      btnToggleAi.classList.add("btn-primary");
      btnToggleAi.classList.remove("btn-secondary");

      aiResponse.textContent = "🤖 جاري تحليل الكود وصياغة التوجيه الأكاديمي...";
      btnApplyAi.style.display = "none";

      const codeToAnalyze = editor.value;

      try {
        const res = await ApiClient.post("/playground/ai-assist", {
          action: action,
          code: codeToAnalyze,
          language: currentMode,
          error_message: customError
        });

        let outText = `**${res.title || "مساعد الكود الذكي"}**\n\n${res.explanation || ""}`;
        if (res.hint) outText += `\n\n💡 **تلميح:** ${res.hint}`;

        aiResponse.textContent = outText;

        if (res.suggested_code) {
          suggestedAiCode = res.suggested_code;
          btnApplyAi.style.display = "block";
        }
      } catch (err) {
        aiResponse.textContent = "عذراً، تعذر الاتصال بمساعد الذكاء الاصطناعي حالياً.";
      }
    }

    document.querySelectorAll(".ai-action-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        triggerAiAssistant(btn.dataset.act);
      });
    });

    btnQuickFix?.addEventListener("click", () => {
      triggerAiAssistant("fix", lastErrorDetected);
    });

    btnApplyAi?.addEventListener("click", () => {
      if (suggestedAiCode) {
        editor.value = suggestedAiCode;
        if (currentMode === "web") webFiles[currentActiveFile] = suggestedAiCode;
        Toast.success("تم تطبيق تعديل الذكاء الاصطناعي على المحرر بنجاح ✨");
        btnApplyAi.style.display = "none";
        updateEditorStats();
      }
    });

    // Formatting & Clean helper
    document.getElementById("editor-clear-btn")?.addEventListener("click", () => {
      editor.value = "";
      updateEditorStats();
      editor.focus();
    });

    document.getElementById("editor-format-btn")?.addEventListener("click", () => {
      const val = editor.value;
      const lines = val.split("\n").map(l => l.trimEnd());
      editor.value = lines.join("\n");
      Toast.success("تم تنظيف وتنسيق الأسطر");
    });

    // Initial state
    setMode("python");
  }

  static async renderExams(container) {
    container.innerHTML = `
      <div style="margin-bottom:1.5rem;">
        <h2 style="font-size:1.8rem;font-weight:900;color:var(--color-text-main);">الامتحانات والاختبارات الدورية 🎯</h2>
        <p style="color:var(--color-text-muted);">قياس المستوى الأكاديمي والتقييم الدوري</p>
      </div>
      <div id="exams-list-container" style="display:grid;grid-template-columns:1fr;gap:1.25rem;">
        <div class="card skeleton" style="height:150px;"></div>
      </div>
    `;

    try {
      const exams = await ApiClient.get('/exams');
      const listEl = document.getElementById('exams-list-container');

      if (!exams || exams.length === 0) {
        listEl.innerHTML = '<div class="card empty-state"><p>لا توجد امتحانات منشورة حالياً.</p></div>';
        return;
      }

      listEl.innerHTML = exams.map(ex => `
        <div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:1.5rem;flex-wrap:wrap;">
          <div>
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.4rem;">
              <h3 style="font-weight:800;font-size:1.3rem;color:var(--color-text-main);">${ex.title}</h3>
              <span class="badge ${ex.access_type === 'PUBLIC' ? 'badge-public' : 'badge-subscribers'}">
                ${ex.access_type === 'PUBLIC' ? 'عام' : 'مخصص للمشتركين 🔑'}
              </span>
            </div>
            <p style="color:var(--color-text-muted);font-size:0.9rem;margin-bottom:0.75rem;">${ex.description || ''}</p>
            <div style="display:flex;gap:1.5rem;font-size:0.85rem;color:var(--color-text-dim);">
              <span>⏱️ المدة: ${ex.duration_minutes} دقيقة</span>
              <span>🎯 درجة النجاح: ${ex.passing_score}%</span>
              <span>🔄 المحاولات المتاحة: ${ex.max_attempts}</span>
            </div>
          </div>
          <div>
            <button class="btn btn-primary start-exam-btn" data-exam-id="${ex.id}" style="padding:0.6rem 1.25rem;font-weight:700;">
              بدء الامتحان ✍️
            </button>
          </div>
        </div>
      `).join('');

      document.querySelectorAll('.start-exam-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const exId = btn.dataset.examId;
          btn.disabled = true;
          btn.textContent = 'جاري فتح ورقة الامتحان...';
          try {
            const attempt = await ApiClient.post(`/exams/${exId}/start`);
            StudentPages.renderExamTaking(container, exId, attempt);
          } catch (err) {
            Toast.error(err.message);
            btn.disabled = false;
            btn.textContent = 'بدء الامتحان ✍️';
          }
        });
      });

    } catch (err) {
      console.error(err);
      Toast.error('تعذر تحميل قائمة الامتحانات');
    }
  }

  static async renderExamTaking(container, examId, attemptData) {
    try {
      const exam = await ApiClient.get(`/exams/${examId}`);
      const questions = exam.questions || [];

      container.innerHTML = `
        <div style="position:sticky;top:70px;z-index:10;background:var(--color-bg-card);border:1px solid var(--color-border-light);border-radius:var(--radius-md);padding:1rem 1.5rem;margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;box-shadow:var(--shadow-md);">
          <div>
            <h3 style="font-weight:800;color:var(--color-text-main);">${exam.title}</h3>
            <span style="font-size:0.85rem;color:var(--color-text-muted);">المحاولة رقم ${attemptData.attempt_number}</span>
          </div>
          <div style="display:flex;align-items:center;gap:1.5rem;">
            <div style="text-align:center;">
              <div style="font-size:0.75rem;color:var(--color-text-muted);">الوقت المتبقي</div>
              <div id="exam-countdown-timer" style="font-family:var(--font-mono);font-size:1.4rem;font-weight:900;color:var(--color-primary);">00:00</div>
            </div>
            <button id="finish-exam-btn" class="btn btn-danger" style="font-weight:800;padding:0.6rem 1.25rem;">تسليم الامتحان 🏁</button>
          </div>
        </div>

        <form id="exam-submission-form">
          <div style="display:flex;flex-direction:column;gap:1.5rem;">
            ${questions.map((q, idx) => {
              const opts = q.options_json ? JSON.parse(q.options_json) : [];
              return `
                <div class="card" style="border:1px solid var(--color-border);">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
                    <span class="badge" style="background:var(--color-bg-secondary);color:var(--color-primary);font-weight:700;">سؤال ${idx + 1} من ${questions.length}</span>
                    <span style="font-size:0.85rem;color:var(--color-text-muted);">${q.points} درجات</span>
                  </div>
                  <h4 style="font-size:1.15rem;font-weight:700;color:var(--color-text-main);margin-bottom:1.25rem;line-height:1.6;">${q.question_text}</h4>
                  
                  <div style="display:flex;flex-direction:column;gap:0.75rem;">
                    ${opts.map(opt => `
                      <label style="display:flex;align-items:center;gap:0.75rem;padding:0.85rem 1.25rem;background:var(--color-bg-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);cursor:pointer;">
                        <input type="radio" name="question_${q.id}" value="${opt.id}" style="accent-color:var(--color-primary);width:18px;height:18px;">
                        <span style="color:var(--color-text-main);font-size:1rem;">${opt.text}</span>
                      </label>
                    `).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </form>
      `;

      // Timer countdown
      const expTime = new Date(attemptData.expires_at).getTime();
      const timerEl = document.getElementById('exam-countdown-timer');

      const timerInterval = setInterval(() => {
        const now = new Date().getTime();
        const diff = expTime - now;

        if (diff <= 0) {
          clearInterval(timerInterval);
          timerEl.textContent = '00:00';
          Toast.warning('انتهى وقت الامتحان! جاري التسليم التلقائي...');
          submitExamNow();
          return;
        }

        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }, 1000);

      // Collect answers
      function getAnswers() {
        const answers = {};
        questions.forEach(q => {
          const selected = document.querySelector(`input[name="question_${q.id}"]:checked`);
          if (selected) answers[q.id] = selected.value;
        });
        return answers;
      }

      // Autosave answers every 15 seconds
      const autosaveInterval = setInterval(() => {
        const ans = getAnswers();
        if (Object.keys(ans).length > 0) {
          ApiClient.put(`/exams/attempts/${attemptData.id}/autosave`, { answers: ans }).catch(() => {});
        }
      }, 15000);

      // Submit function
      async function submitExamNow() {
        clearInterval(timerInterval);
        clearInterval(autosaveInterval);
        const ans = getAnswers();
        try {
          const res = await ApiClient.post(`/exams/attempts/${attemptData.id}/submit`, { answers: ans });
          Toast.success(`تم تسليم الامتحان! درجتك: ${res.score} من ${res.total_possible} (${res.percentage}%)`);
          window.location.hash = '#/student/exams';
        } catch (e) {
          Toast.error(e.message);
        }
      }

      document.getElementById('finish-exam-btn').addEventListener('click', () => {
        Modal.confirm({
          title: 'تأكيد تسليم الامتحان',
          message: 'هل أنت متأكد من رغبتك في تسليم إجابات الامتحان الآن؟ لن يمكنك تعديلها بعد ذلك.',
          confirmText: 'نعم، تسليم الامتحان',
          onConfirm: submitExamNow
        });
      });

    } catch (err) {
      console.error(err);
      Toast.error('تعذر بدء جلسة الامتحان');
    }
  }

  /* ===================================================================
     6. SUPPORT TICKETS
  =================================================================== */
  static async renderSupport(container) {
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
        <div>
          <h2 style="font-size:1.8rem;font-weight:900;color:var(--color-text-main);">تذاكر الدعم الفني والأكاديمي 💬</h2>
          <p style="color:var(--color-text-muted);">تواصل مباشرة مع طاقم المعلمين والمساعدين للإجابة على استفساراتك</p>
        </div>
        <button id="open-new-ticket-btn" class="btn btn-primary btn-sm" style="font-weight:700;">+ فتح تذكرة جديدة</button>
      </div>

      <div id="tickets-list" style="display:flex;flex-direction:column;gap:1rem;">
        <div class="card skeleton" style="height:100px;"></div>
      </div>
    `;

    try {
      const tickets = await ApiClient.get('/support/tickets');
      const listEl = document.getElementById('tickets-list');

      if (!tickets || tickets.length === 0) {
        listEl.innerHTML = '<div class="card empty-state"><p>لم تقم بإنشاء أي تذاكر دعم بعد.</p></div>';
      } else {
        listEl.innerHTML = tickets.map(t => `
          <div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;">
            <div>
              <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.3rem;">
                <h4 style="font-weight:700;color:var(--color-text-main);">${t.subject}</h4>
                <span class="badge" style="background:var(--color-bg-secondary);color:var(--color-primary);font-size:0.75rem;">${t.status}</span>
                <span class="badge" style="background:rgba(245,158,11,0.15);color:#F59E0B;font-size:0.75rem;">${t.priority}</span>
              </div>
              <div style="font-size:0.8rem;color:var(--color-text-muted);">تاريخ الإنشاء: ${t.created_at ? t.created_at.substring(0,10) : ''}</div>
            </div>
            <button class="btn btn-secondary btn-sm view-ticket-detail-btn" data-tkt-id="${t.id}">عرض المحادثة ⟵</button>
          </div>
        `).join('');

        document.querySelectorAll('.view-ticket-detail-btn').forEach(b => {
          b.addEventListener('click', () => StudentPages.renderTicketChat(container, b.dataset.tktId));
        });
      }

      document.getElementById('open-new-ticket-btn').addEventListener('click', () => {
        Modal.open({
          title: 'فتح تذكرة دعم أكاديمي جديدة',
          contentHtml: `
            <form id="new-tkt-modal-form">
              <div class="form-group">
                <label class="form-label">عنوان الاستفسار</label>
                <input type="text" id="m-tkt-subj" class="form-input" required placeholder="مثال: صعوبة في فهم حلقة while">
              </div>
              <div class="form-group">
                <label class="form-label">الأولوية</label>
                <select id="m-tkt-prio" class="form-input">
                  <option value="LOW">منخفضة</option>
                  <option value="MEDIUM" selected>متوسطة</option>
                  <option value="HIGH">عالية</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">نص الرسالة بالتفصيل</label>
                <textarea id="m-tkt-msg" class="form-input" rows="4" required placeholder="اكتب سؤالك هنا بوضوح..."></textarea>
              </div>
              <button type="submit" class="btn btn-primary" style="width:100%;font-weight:700;">إرسال التذكرة</button>
            </form>
          `
        });

        document.getElementById('new-tkt-modal-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          try {
            await ApiClient.post('/support/tickets', {
              subject: document.getElementById('m-tkt-subj').value,
              priority: document.getElementById('m-tkt-prio').value,
              message: document.getElementById('m-tkt-msg').value,
              category: 'academic'
            });
            Modal.close();
            Toast.success('تم إرسال تذكرة الدعم بنجاح');
            StudentPages.renderSupport(container);
          } catch (err) {
            Toast.error(err.message);
          }
        });
      });

    } catch (err) {
      console.error(err);
      Toast.error('فشل تحميل تذاكر الدعم');
    }
  }

  static async renderTicketChat(container, ticketId) {
    try {
      const ticket = await ApiClient.get(`/support/tickets/${ticketId}`);
      container.innerHTML = `
        <div style="margin-bottom:1.5rem;display:flex;align-items:center;gap:1rem;">
          <button id="back-to-tickets-btn" class="btn btn-secondary btn-sm">⟵ العودة للتذاكر</button>
          <h3 style="font-weight:800;color:var(--color-text-main);">${ticket.subject}</h3>
        </div>

        <div class="card" style="display:flex;flex-direction:column;height:calc(100vh - 280px);padding:1rem;">
          <div id="chat-messages-container" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:1rem;padding:1rem;">
            ${ticket.messages ? ticket.messages.map(m => `
              <div style="align-self:${m.is_staff_reply ? 'flex-start' : 'flex-end'};max-width:75%;background:${m.is_staff_reply ? 'var(--color-bg-secondary)' : 'var(--color-primary-light)'};border:1px solid ${m.is_staff_reply ? 'var(--color-border)' : 'var(--color-primary)'};padding:0.9rem 1.25rem;border-radius:var(--radius-md);">
                <div style="font-size:0.75rem;font-weight:700;color:${m.is_staff_reply ? 'var(--color-cyan-accent)' : 'var(--color-primary)'};margin-bottom:0.3rem;">
                  ${m.sender_name || (m.is_staff_reply ? 'الدعم الأكاديمي' : 'أنت')}
                </div>
                <div style="color:var(--color-text-main);font-size:0.95rem;line-height:1.5;">${m.message}</div>
                <div style="font-size:0.7rem;color:var(--color-text-dim);text-align:left;margin-top:0.3rem;">${m.created_at?.substring(11,16) || ''}</div>
              </div>
            `).join('') : ''}
          </div>

          <form id="send-reply-form" style="display:flex;gap:0.75rem;padding-top:1rem;border-top:1px solid var(--color-border);">
            <input type="text" id="reply-input-text" class="form-input" required placeholder="اكتب ردك هنا..." style="flex:1;">
            <button type="submit" class="btn btn-primary" style="font-weight:700;padding:0.6rem 1.25rem;">إرسال الرد</button>
          </form>
        </div>
      `;

      document.getElementById('back-to-tickets-btn').addEventListener('click', () => StudentPages.renderSupport(container));

      const chatBox = document.getElementById('chat-messages-container');
      chatBox.scrollTop = chatBox.scrollHeight;

      document.getElementById('send-reply-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = document.getElementById('reply-input-text').value.trim();
        if (!text) return;
        try {
          await ApiClient.post(`/support/tickets/${ticketId}/messages`, { message: text });
          StudentPages.renderTicketChat(container, ticketId);
        } catch (err) {
          Toast.error(err.message);
        }
      });

    } catch (err) {
      console.error(err);
      Toast.error('فشل تحميل المحادثة');
    }
  }

  /* ===================================================================
     7. PROFILE & SUBSCRIPTION MANAGEMENT
  =================================================================== */
  static async renderProfile(container) {
    const user = AuthService.getUser();
    container.innerHTML = `
      <div style="margin-bottom:1.5rem;">
        <h2 style="font-size:1.8rem;font-weight:900;color:var(--color-text-main);">الملف الشخصي والاشتراك 👤</h2>
        <p style="color:var(--color-text-muted);">إدارة الحساب وحالة الاشتراك الأكاديمي</p>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;" class="profile-grid">
        
        <!-- Account Info -->
        <div class="card">
          <h3 style="font-weight:800;color:var(--color-text-main);margin-bottom:1.25rem;">بيانات الحساب</h3>
          <div style="display:flex;flex-direction:column;gap:1rem;">
            <div>
              <label style="font-size:0.8rem;color:var(--color-text-muted);">الاسم بالكامل</label>
              <div style="font-weight:700;color:var(--color-text-main);font-size:1.05rem;">${user.full_name}</div>
            </div>
            <div>
              <label style="font-size:0.8rem;color:var(--color-text-muted);">اسم المستخدم</label>
              <div style="font-weight:700;color:var(--color-text-main);font-family:var(--font-mono);">${user.username}</div>
            </div>
            <div>
              <label style="font-size:0.8rem;color:var(--color-text-muted);">البريد الإلكتروني</label>
              <div style="font-weight:700;color:var(--color-text-main);">${user.email}</div>
            </div>
            <div>
              <label style="font-size:0.8rem;color:var(--color-text-muted);">الدور في المنصة</label>
              <div style="font-weight:700;color:var(--color-primary);">${user.role === 'admin' ? 'مشرف عام' : (user.role === 'assistant' ? 'مساعد تعليمي' : 'طالب')}</div>
            </div>
          </div>
        </div>

        <!-- Subscription Card -->
        <div class="card" id="profile-sub-card">
          <h3 style="font-weight:800;color:var(--color-text-main);margin-bottom:1.25rem;">حالة الاشتراك الأكاديمي</h3>
          <div id="sub-card-details">
            <div class="skeleton" style="height:120px;"></div>
          </div>
        </div>

      </div>
    `;

    try {
      const subRes = await ApiClient.get('/subscriptions/my-status');
      const subCard = document.getElementById('sub-card-details');

      if (subRes.is_subscribed && subRes.subscription) {
        const s = subRes.subscription;
        subCard.innerHTML = `
          <div style="background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);padding:1.25rem;border-radius:var(--radius-md);margin-bottom:1.25rem;">
            <div style="display:flex;align-items:center;gap:0.6rem;color:#10B981;font-weight:800;font-size:1.15rem;margin-bottom:0.4rem;">
              <span>✅</span> اشتراك نشط ومفعل
            </div>
            <p style="font-size:0.88rem;color:var(--color-text-muted);margin-bottom:0.75rem;">جميع الكورسات والامتحانات والمذكرات متاحة لك بدون قيود.</p>
            <div style="font-size:0.85rem;color:var(--color-text-main);">
              تاريخ الانتهاء: <strong>${s.is_lifetime ? 'مدى الحياة ♾️' : (s.expires_at ? s.expires_at.substring(0, 10) : 'غير محدد')}</strong>
            </div>
          </div>
          <button id="renew-sub-btn" class="btn btn-secondary btn-sm">تفعيل كود إضافي أو تمديد الاشتراك</button>
        `;
      } else {
        subCard.innerHTML = `
          <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);padding:1.25rem;border-radius:var(--radius-md);margin-bottom:1.25rem;">
            <div style="display:flex;align-items:center;gap:0.6rem;color:#EF4444;font-weight:800;font-size:1.15rem;margin-bottom:0.4rem;">
              <span>🔒</span> غير مشترك حالياً
            </div>
            <p style="font-size:0.88rem;color:var(--color-text-muted);margin-bottom:1rem;">يمكنك فقط الوصول إلى المحتوى المجاني المحدد من قبل الإدارة.</p>
            <button id="activate-now-btn" class="btn btn-primary" style="font-weight:700;">🔑 إدخال كود الاشتراك الآن</button>
          </div>
        `;
      }

      document.getElementById('activate-now-btn')?.addEventListener('click', () => {
        document.getElementById('sub-modal').style.display = 'flex';
      });
      document.getElementById('renew-sub-btn')?.addEventListener('click', () => {
        document.getElementById('sub-modal').style.display = 'flex';
      });

    } catch (err) {
      console.error(err);
    }
  }


  /* ===================================================================
     8. SUBSCRIPTION & ACTIVATION PAGE (STUDENT)
  =================================================================== */
  static async renderSubscriptionPage(container) {
    container.innerHTML = `
      <div style="margin-bottom:1.5rem;">
        <h2 style="font-size:1.8rem;font-weight:900;color:var(--color-text-main);display:flex;align-items:center;gap:0.5rem;">
          <span>💳</span> الاشتراك وتفعيل الحساب الأكاديمي
        </h2>
        <p style="color:var(--color-text-muted);">طرق السداد المعتمدة وتفعيل الوصول الشامل للمناهج والامتحانات</p>
      </div>

      <!-- Current Subscription Status Card -->
      <div id="sub-page-status-card" class="card" style="margin-bottom:1.5rem;">
        <div class="skeleton" style="height:80px;"></div>
      </div>

      <!-- Official Payment & Transfer Methods Card -->
      <div class="card" style="margin-bottom:1.5rem;border-right:4px solid var(--color-cyan-accent);">
        <h3 style="font-size:1.25rem;font-weight:800;color:var(--color-text-main);margin-bottom:0.75rem;display:flex;align-items:center;gap:0.5rem;">
          <span>⚡</span> بيانات الدفع والتحويل الرسمية المعتمدة
        </h3>
        <p style="color:var(--color-text-muted);font-size:0.95rem;line-height:1.6;margin-bottom:1.25rem;">
          يمكنك تفعيل الاشتراك الفصلي أو السنوي عن طريق التحويل المباشر عبر تطبيق <strong>InstaPay</strong> أو المحافظ الإلكترونية، ثم تقديم طلب التفعيل أدناه ليتم اعتماده فوراً.
        </p>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:1rem;">
          <!-- InstaPay Transfer Card -->
          <div style="background:var(--color-bg-surface);padding:1rem;border-radius:var(--radius-md);border:1px solid var(--color-border);">
            <div style="font-size:0.8rem;color:var(--color-text-muted);margin-bottom:0.3rem;">رقم التحويل عبر InstaPay / المحافظ:</div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;">
              <span id="official-instapay-num" style="font-family:var(--font-mono);font-size:1.2rem;font-weight:800;color:var(--color-cyan-accent);">+201552696208</span>
              <button id="copy-instapay-btn" class="btn btn-secondary btn-sm" style="font-size:0.75rem;padding:0.25rem 0.6rem;">نسخ</button>
            </div>
          </div>

          <!-- InstaPay Direct Link Card -->
          <div style="background:var(--color-bg-surface);padding:1rem;border-radius:var(--radius-md);border:1px solid var(--color-border);">
            <div style="font-size:0.8rem;color:var(--color-text-muted);margin-bottom:0.3rem;">الرابط المباشر لتطبيق InstaPay:</div>
            <a id="official-instapay-link" href="https://ipn.eg/S/moazasem/instapay/27DsGj" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="display:inline-flex;width:100%;justify-content:center;font-weight:700;margin-top:0.2rem;">
              تحويل عبر InstaPay مباشرة 🚀
            </a>
          </div>

          <!-- Official Contact / WhatsApp Card -->
          <div style="background:var(--color-bg-surface);padding:1rem;border-radius:var(--radius-md);border:1px solid var(--color-border);">
            <div style="font-size:0.8rem;color:var(--color-text-muted);margin-bottom:0.3rem;">رقم التواصل وتأكيد التفعيل (واتساب / هاتف):</div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;">
              <span id="official-contact-num" style="font-family:var(--font-mono);font-size:1.1rem;font-weight:800;color:#10B981;">+201559159038</span>
              <a href="https://wa.me/201559159038" target="_blank" class="btn btn-secondary btn-sm" style="font-size:0.75rem;padding:0.25rem 0.6rem;color:#10B981;">واتساب 💬</a>
            </div>
          </div>
        </div>
      </div>

      <!-- Submit Request Form & Activation Code Dual Grid -->
      <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:1.5rem;" class="sub-dual-grid">
        
        <!-- Activation Request Form -->
        <div class="card">
          <h3 style="font-size:1.2rem;font-weight:800;color:var(--color-text-main);margin-bottom:1rem;display:flex;align-items:center;gap:0.4rem;">
            <span>📝</span> تقديم طلب تفعيل الاشتراك بعد التحويل
          </h3>
          <form id="form-submit-sub-req">
            <div class="form-group">
              <label class="form-label">رقم الهاتف المحول منه (أو رقم محفظتك)</label>
              <input type="text" id="sub-req-phone" class="form-input" required placeholder="01552696208">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div class="form-group">
                <label class="form-label">الباقة المطلوبة</label>
                <select id="sub-req-pkg" class="form-input">
                  <option value="اشتراك فصلي (3 أشهر)">اشتراك فصلي (3 أشهر)</option>
                  <option value="اشتراك سنوي شامل (12 شهر)">اشتراك سنوي شامل (12 شهر)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">المبلغ المحول (ج.م)</label>
                <input type="number" id="sub-req-amt" class="form-input" placeholder="مثال: 250" min="0">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">رقم العملية أو اسم الحساب المحول منه (Reference)</label>
              <input type="text" id="sub-req-ref" class="form-input" required placeholder="مثال: رقم الحوالة في انستاباي أو اسم صاحب الحساب">
            </div>
            <div class="form-group">
              <label class="form-label">تاريخ التحويل</label>
              <input type="date" id="sub-req-date" class="form-input" value="${new Date().toISOString().substring(0, 10)}">
            </div>
            <div class="form-group">
              <label class="form-label">ملاحظات إضافية (اختياري)</label>
              <textarea id="sub-req-notes" class="form-input" rows="2" placeholder="أي تفاصيل ترغب في إضافتها للإدارة..."></textarea>
            </div>
            <button type="submit" id="btn-sub-req-submit" class="btn btn-primary" style="width:100%;font-weight:700;padding:0.75rem;">
              إرسال طلب التفعيل للإدارة 🚀
            </button>
          </form>
        </div>

        <!-- Quick Code Activation Box -->
        <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;">
          <div>
            <h3 style="font-size:1.15rem;font-weight:800;color:var(--color-text-main);margin-bottom:0.75rem;display:flex;align-items:center;gap:0.4rem;">
              <span>🔑</span> هل تمتلك كود اشتراك مطبوع؟
            </h3>
            <p style="color:var(--color-text-muted);font-size:0.88rem;line-height:1.6;margin-bottom:1rem;">
              إذا حصلت على كود تفعيل مسبق الدفع (مثل <code>CS-SPARK-2026</code>)، يمكنك إدخاله هنا وتفعيل حسابك بشكل فوري ولحظي دون انتظار مراجعة التحويل.
            </p>
            <div class="form-group">
              <input type="text" id="quick-input-code" class="form-input" placeholder="CS-XXXX-XXXX" style="text-transform:uppercase;font-family:var(--font-mono);font-size:1.05rem;letter-spacing:1px;text-align:center;">
            </div>
            <button id="btn-quick-activate" class="btn btn-secondary" style="width:100%;font-weight:700;">
              تفعيل بالكود فوراً ✨
            </button>
          </div>

          <div style="margin-top:1.5rem;padding:1rem;background:var(--color-bg-surface);border-radius:var(--radius-md);border:1px solid var(--color-border);font-size:0.82rem;color:var(--color-text-dim);">
            🛡️ <strong>ضمان الخدمة:</strong> تتم مراجعة الطلبات واعتمادها خلال دقائق من الإدارة. في حال واجهتك أي مشكلة، تواصل مباشرة مع الدعم الفني على الواتساب.
          </div>
        </div>

      </div>

      <!-- Pending Requests List -->
      <div id="sub-requests-history" style="margin-top:1.5rem;"></div>
    `;

    // Fetch and bind status
    async function refreshSubStatus() {
      try {
        const [stat, myReqs] = await Promise.all([
          ApiClient.get('/subscriptions/my-status'),
          ApiClient.get('/subscriptions/requests/my').catch(() => [])
        ]);

        const statCard = document.getElementById('sub-page-status-card');
        if (stat.is_subscribed) {
          statCard.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
              <div>
                <span class="badge badge-public" style="font-size:0.9rem;padding:0.4rem 0.8rem;">حساب مشترك نشط ✅</span>
                <h3 style="font-weight:800;color:var(--color-text-main);margin-top:0.4rem;">اشتراكك مفعل وساري المفعول</h3>
                <p style="color:var(--color-text-muted);font-size:0.85rem;margin:0;">تاريخ الانتهاء: ${stat.subscription?.expires_at ? stat.subscription.expires_at.substring(0, 10) : 'مدى الحياة'}</p>
              </div>
              <a href="#/student/courses" class="btn btn-primary btn-sm">استعراض المناهج والدروس 📚</a>
            </div>
          `;
        } else {
          statCard.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
              <div>
                <span class="badge badge-subscribers" style="font-size:0.9rem;padding:0.4rem 0.8rem;">خطة تجريبية مجانية</span>
                <h3 style="font-weight:800;color:var(--color-text-main);margin-top:0.4rem;">قم بالاشتراك لفتح كافة الدروس والامتحانات والمذكرات</h3>
                <p style="color:var(--color-text-muted);font-size:0.85rem;margin:0;">سدد الرسوم عبر InstaPay وقدّم طلبك أدناه لتفعيل حسابك فوراً.</p>
              </div>
            </div>
          `;
        }

        // History
        const histDiv = document.getElementById('sub-requests-history');
        if (myReqs && myReqs.length > 0) {
          histDiv.innerHTML = `
            <div class="card">
              <h3 style="font-weight:800;font-size:1.1rem;color:var(--color-text-main);margin-bottom:0.75rem;">سجل طلبات التفعيل السابقة:</h3>
              <div class="table-container">
                <table class="table" style="width:100%;">
                  <thead>
                    <tr>
                      <th>الباقة</th>
                      <th>رقم المرجع</th>
                      <th>تاريخ الإرسال</th>
                      <th>الحالة</th>
                      <th>ملاحظات الإدارة</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${myReqs.map(r => `
                      <tr>
                        <td><strong>${r.package_name}</strong></td>
                        <td style="font-family:var(--font-mono);">${r.payment_reference}</td>
                        <td>${r.created_at ? r.created_at.substring(0, 10) : ''}</td>
                        <td>
                          <span class="badge ${r.status === 'APPROVED' ? 'badge-public' : (r.status === 'PENDING' ? 'badge-subscribers' : 'badge-danger')}">
                            ${r.status === 'APPROVED' ? 'معتمد ومفعل ✅' : (r.status === 'PENDING' ? 'قيد المراجعة ⏳' : 'مرفوض ❌')}
                          </span>
                        </td>
                        <td style="font-size:0.85rem;color:var(--color-text-muted);">${r.rejection_reason || '—'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }
      } catch (err) {
        console.error(err);
      }
    }

    await refreshSubStatus();

    // Copy InstaPay number
    document.getElementById('copy-instapay-btn')?.addEventListener('click', () => {
      const num = document.getElementById('official-instapay-num').textContent.trim();
      navigator.clipboard.writeText(num);
      Toast.success(`تم نسخ رقم التحويل: ${num}`);
    });

    // Submit Request
    document.getElementById('form-submit-sub-req')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('btn-sub-req-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري إرسال الطلب...';

      try {
        const payload = {
          phone: document.getElementById('sub-req-phone').value.trim(),
          package_name: document.getElementById('sub-req-pkg').value,
          amount: parseFloat(document.getElementById('sub-req-amt').value) || 0.0,
          payment_reference: document.getElementById('sub-req-ref').value.trim(),
          transfer_date: document.getElementById('sub-req-date').value,
          admin_notes: document.getElementById('sub-req-notes').value.trim()
        };

        const res = await ApiClient.post('/subscriptions/requests', payload);
        Toast.success(res.message || 'تم إرسال طلب التفعيل بنجاح! سيتم اعتماده قريباً');
        document.getElementById('form-submit-sub-req').reset();
        await refreshSubStatus();
      } catch (err) {
        Toast.error(err.message || 'تعذر إرسال الطلب');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'إرسال طلب التفعيل للإدارة 🚀';
      }
    });

    // Quick Code Activate
    document.getElementById('btn-quick-activate')?.addEventListener('click', async () => {
      const code = document.getElementById('quick-input-code').value.trim().toUpperCase();
      if (!code) {
        Toast.warning('يرجى كتابة كود الاشتراك أولاً');
        return;
      }
      try {
        const res = await ApiClient.post('/subscriptions/activate', { code });
        Toast.success(res.message || 'تم تفعيل الاشتراك بنجاح! 🎉');
        await refreshSubStatus();
        window.dispatchEvent(new Event('hashchange'));
      } catch (err) {
        Toast.error(err.message || 'كود غير صالح');
      }
    });
  }

  /* ===================================================================
     9. ACCOUNT SETTINGS (STUDENT / ASSISTANT / ADMIN)
  =================================================================== */
  static async renderSettings(container) {
    container.innerHTML = `
      <div style="margin-bottom:1.5rem;">
        <h2 style="font-size:1.8rem;font-weight:900;color:var(--color-text-main);display:flex;align-items:center;gap:0.5rem;">
          <span>⚙️</span> إعدادات الحساب والأمان
        </h2>
        <p style="color:var(--color-text-muted);">إدارة البيانات الشخصية وتغيير كلمة المرور وتأمين حسابك</p>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;" class="settings-grid">
        
        <!-- Profile Info Card -->
        <div class="card">
          <h3 style="font-size:1.2rem;font-weight:800;color:var(--color-text-main);margin-bottom:1rem;display:flex;align-items:center;gap:0.4rem;">
            <span>👤</span> تعديل البيانات الشخصية
          </h3>
          <form id="form-settings-profile">
            <div class="form-group">
              <label class="form-label">الاسم بالكامل</label>
              <input type="text" id="set-fullname" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label">اسم المستخدم (غير قابل للتعديل)</label>
              <input type="text" id="set-username" class="form-input" disabled style="opacity:0.7;cursor:not-allowed;">
            </div>
            <div class="form-group">
              <label class="form-label">البريد الإلكتروني</label>
              <input type="email" id="set-email" class="form-input" required>
            </div>
            <div class="form-group">
              <label class="form-label">رقم الهاتف</label>
              <input type="text" id="set-phone" class="form-input" placeholder="+201000000000">
            </div>
            <button type="submit" id="btn-save-profile" class="btn btn-primary" style="width:100%;font-weight:700;">
              حفظ التعديلات الشخصية ✨
            </button>
          </form>
        </div>

        <!-- Change Password Card -->
        <div class="card">
          <h3 style="font-size:1.2rem;font-weight:800;color:var(--color-text-main);margin-bottom:1rem;display:flex;align-items:center;gap:0.4rem;">
            <span>🔒</span> تغيير كلمة المرور
          </h3>
          <form id="form-settings-password">
            <div class="form-group">
              <label class="form-label">كلمة المرور الحالية</label>
              <input type="password" id="set-old-pass" class="form-input" required placeholder="••••••••">
            </div>
            <div class="form-group">
              <label class="form-label">كلمة المرور الجديدة</label>
              <input type="password" id="set-new-pass" class="form-input" required minlength="6" placeholder="••••••••">
            </div>
            <div class="form-group">
              <label class="form-label">تأكيد كلمة المرور الجديدة</label>
              <input type="password" id="set-conf-pass" class="form-input" required minlength="6" placeholder="••••••••">
            </div>
            <div style="font-size:0.8rem;color:var(--color-text-muted);margin-bottom:1rem;">
              يجب أن تحتوي كلمة المرور على 6 خانات على الأقل لضمان أمان حسابك الأكاديمي.
            </div>
            <button type="submit" id="btn-save-password" class="btn btn-secondary" style="width:100%;font-weight:700;">
              تحديث كلمة المرور 🔐
            </button>
          </form>
        </div>

      </div>
    `;

    try {
      const me = await ApiClient.get('/users/me');
      document.getElementById('set-fullname').value = me.full_name || '';
      document.getElementById('set-username').value = me.username || '';
      document.getElementById('set-email').value = me.email || '';
      document.getElementById('set-phone').value = me.phone || '';
    } catch (err) {
      console.error(err);
    }

    // Update Profile
    document.getElementById('form-settings-profile')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-save-profile');
      btn.disabled = true;
      btn.textContent = 'جاري الحفظ...';

      try {
        const payload = {
          full_name: document.getElementById('set-fullname').value.trim(),
          email: document.getElementById('set-email').value.trim(),
          phone: document.getElementById('set-phone').value.trim()
        };
        const res = await ApiClient.put('/users/profile', payload);
        Toast.success(res.message || 'تم تحديث البيانات بنجاح');
        // Update cached user in AuthService
        const u = AuthService.getUser();
        if (u) {
          u.full_name = payload.full_name;
          u.email = payload.email;
          localStorage.setItem('codespark_user', JSON.stringify(u));
        }
      } catch (err) {
        Toast.error(err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'حفظ التعديلات الشخصية ✨';
      }
    });

    // Change Password
    document.getElementById('form-settings-password')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const oldP = document.getElementById('set-old-pass').value;
      const newP = document.getElementById('set-new-pass').value;
      const confP = document.getElementById('set-conf-pass').value;

      if (newP !== confP) {
        Toast.error('كلمة المرور الجديدة وتأكيدها غير متطابقين');
        return;
      }

      const btn = document.getElementById('btn-save-password');
      btn.disabled = true;
      btn.textContent = 'جاري التحديث...';

      try {
        const res = await ApiClient.post('/users/change-password', {
          current_password: oldP,
          new_password: newP,
          confirm_password: confP
        });
        Toast.success(res.message || 'تم تغيير كلمة المرور بنجاح');
        document.getElementById('form-settings-password').reset();
      } catch (err) {
        Toast.error(err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'تحديث كلمة المرور 🔐';
      }
    });
  }


  /* ===================================================================
     9. STUDENT STUDY FILES (الملفات والمذكرات الدراسية للطلاب)
  =================================================================== */
  static async renderStudyFiles(container) {
    container.innerHTML = `
      <div style="margin-bottom:1.5rem;">
        <h2 style="font-size:1.8rem;font-weight:900;color:var(--color-text-main);margin-bottom:0.25rem;">الملفات والمذكرات الدراسية 📁</h2>
        <p style="color:var(--color-text-muted);">تحميل مذكرات الشرح، ملخصات الدروس، شرائح العرض وملفات الأكواد ومستندات Google Drive</p>
      </div>

      <!-- Filters & Search -->
      <div class="card" style="margin-bottom:1.5rem;display:flex;gap:1rem;flex-wrap:wrap;padding:1rem;">
        <input type="text" id="stud-file-search" class="form-input" placeholder="بحث في عنوان المذكرة أو الموضوع..." style="flex:1;min-width:200px;">
        <select id="stud-file-course" class="form-input" style="width:auto;min-width:180px;">
          <option value="">جميع المناهج والكورسات</option>
        </select>
      </div>

      <!-- Files Cards Grid -->
      <div id="stud-files-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(300px, 1fr));gap:1.25rem;">
        <div class="card skeleton" style="height:180px;"></div>
        <div class="card skeleton" style="height:180px;"></div>
        <div class="card skeleton" style="height:180px;"></div>
      </div>
    `;

    let allFiles = [];

    function formatBytes(bytes) {
      if (!bytes || bytes === 0) return '';
      const k = 1024;
      const sizes = ['بايت', 'ك.ب', 'م.ب', 'ج.ب'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function getFileIcon(fileName, sourceType) {
      if (sourceType === 'google_drive') return '🌐';
      const ext = (fileName || '').split('.').pop().toLowerCase();
      if (ext === 'pdf') return '📄';
      if (['doc', 'docx'].includes(ext)) return '📝';
      if (['ppt', 'pptx'].includes(ext)) return '📊';
      if (['xls', 'xlsx'].includes(ext)) return '📈';
      if (ext === 'zip') return '🗜️';
      if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return '🖼️';
      if (ext === 'py') return '🐍';
      return '📁';
    }

    async function loadFiles() {
      try {
        const [filesRes, coursesRes] = await Promise.all([
          ApiClient.get('/study-files'),
          ApiClient.get('/courses').catch(() => ({ courses: [] }))
        ]);

        allFiles = filesRes.files || [];
        const courses = coursesRes.courses || [];

        const sel = document.getElementById('stud-file-course');
        if (sel && sel.options.length <= 1) {
          courses.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.title;
            sel.appendChild(opt);
          });
        }

        renderFiltered();
      } catch (err) {
        console.error(err);
        Toast.error('فشل تحميل الملفات الدراسية');
      }
    }

    function renderFiltered() {
      const searchVal = document.getElementById('stud-file-search')?.value.toLowerCase().trim() || '';
      const courseVal = document.getElementById('stud-file-course')?.value || '';

      let filtered = allFiles;
      if (searchVal) {
        filtered = filtered.filter(f =>
          (f.title && f.title.toLowerCase().includes(searchVal)) ||
          (f.description && f.description.toLowerCase().includes(searchVal)) ||
          (f.file_name && f.file_name.toLowerCase().includes(searchVal))
        );
      }
      if (courseVal) {
        filtered = filtered.filter(f => f.course_id === courseVal);
      }

      const grid = document.getElementById('stud-files-grid');
      if (!grid) return;

      if (filtered.length === 0) {
        grid.innerHTML = `
          <div class="card empty-state" style="grid-column: 1 / -1;padding:3rem 1.5rem;text-align:center;">
            <div style="font-size:3rem;margin-bottom:0.75rem;">📁</div>
            <h3 style="color:var(--color-text-main);margin-bottom:0.5rem;font-weight:800;">لا توجد ملفات دراسية حالياً</h3>
            <p style="color:var(--color-text-muted);">لم يتم إضافة أي مذكرات أو ملفات دراسية مطابقة لبحثك بعد.</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = filtered.map(f => {
        const icon = getFileIcon(f.file_name, f.source_type);
        const sz = formatBytes(f.file_size);
        const isDrive = f.source_type === 'google_drive';

        return `
          <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;padding:1.25rem;border:1px solid var(--color-border-light);box-shadow:var(--shadow-md);">
            <div>
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.75rem;margin-bottom:0.75rem;">
                <span style="font-size:2.2rem;line-height:1;">${icon}</span>
                <span class="badge ${f.visibility === 'PUBLIC' ? 'badge-public' : 'badge-subscribers'}" style="font-size:0.75rem;">
                  ${f.visibility === 'PUBLIC' ? 'عام' : 'مشتركين 🔑'}
                </span>
              </div>
              <h3 style="font-size:1.1rem;font-weight:800;color:var(--color-text-main);margin-bottom:0.4rem;line-height:1.4;">${f.title}</h3>
              ${f.description ? `<p style="font-size:0.85rem;color:var(--color-text-muted);line-height:1.5;margin-bottom:0.75rem;">${f.description}</p>` : ''}
              
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;margin-bottom:1rem;font-size:0.8rem;color:var(--color-text-dim);">
                ${f.course_title ? `<span style="background:var(--color-bg-secondary);padding:2px 8px;border-radius:4px;color:var(--color-primary);font-weight:600;">📚 ${f.course_title}</span>` : ''}
                ${isDrive ? '<span style="color:var(--color-cyan-accent);">Google Drive 🌐</span>' : (sz ? `<span>${sz}</span>` : '')}
              </div>
            </div>

            <div style="border-top:1px solid var(--color-border);padding-top:0.85rem;margin-top:0.5rem;">
              ${f.is_unlocked ? (
                isDrive ? `
                  <a href="${f.download_url || f.external_url}" target="_blank" class="btn btn-primary" style="width:100%;font-weight:700;display:flex;justify-content:center;align-items:center;gap:0.4rem;text-decoration:none;">
                    <span>🌐</span> فتح في Google Drive
                  </a>
                ` : `
                  <a href="${f.download_url}" target="_blank" class="btn btn-primary" style="width:100%;font-weight:700;display:flex;justify-content:center;align-items:center;gap:0.4rem;text-decoration:none;">
                    <span>📥</span> تحميل المذكرة الدراسية
                  </a>
                `
              ) : `
                <button class="btn btn-secondary btn-unlock-sub-prompt" style="width:100%;font-weight:700;background:rgba(239, 68, 68, 0.1);border-color:rgba(239, 68, 68, 0.3);color:#F87171;display:flex;justify-content:center;align-items:center;gap:0.4rem;">
                  <span>🔒</span> خاص بالمشتركين (تفعيل الاشتراك)
                </button>
              `}
            </div>
          </div>
        `;
      }).join('');

      // Bind prompt to activate subscription
      document.querySelectorAll('.btn-unlock-sub-prompt').forEach(btn => {
        btn.addEventListener('click', () => {
          const subModal = document.getElementById('sub-modal');
          if (subModal) subModal.style.display = 'flex';
          else window.location.hash = '#/student/subscription';
        });
      });
    }

    document.getElementById('stud-file-search')?.addEventListener('input', debounce(renderFiltered, 300));
    document.getElementById('stud-file-course')?.addEventListener('change', renderFiltered);

    await loadFiles();
  }
}
