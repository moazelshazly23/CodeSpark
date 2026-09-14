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
  padding: 2rem;
  border-radius: 16px;
  border: 1px solid #1E293B;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  text-align: center;
  max-width: 480px;
}
h1 {
  color: #00D2FF;
  font-size: 1.6rem;
  margin-bottom: 0.5rem;
}
p {
  color: #94A3B8;
  font-size: 0.95rem;
  line-height: 1.6;
}
.btn {
  background: linear-gradient(135deg, #2563EB, #00D2FF);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 1rem;
  transition: transform 0.2s ease;
}
.btn:hover {
  transform: scale(1.05);
}
.counter-box {
  margin-top: 1.25rem;
  font-weight: bold;
  color: #F59E0B;
  font-size: 1.1rem;
}`,
      "script.js": `// تفاعل مباشر مع عناصر الصفحة
let count = 0;
const btn = document.getElementById("click-btn");
const counter = document.getElementById("counter");

if (btn && counter) {
  btn.addEventListener("click", () => {
    count++;
    counter.textContent = "عدد النقرات: " + count;
    console.log("تم النقر على الزر! القيمة الحالية:", count);
  });
}
console.log("تم تحميل السكربت بنجاح في نافذة المعاينة ✅");`
    };

    let standaloneCode = {
      python: `# بيئة بايثون 3.11 التفاعلية والمعزولة
def calculate_spark(n):
    total = sum(i * 2 for i in range(1, n + 1))
    return f"Code Spark Factorial Sum: {total}"

print(calculate_spark(10))
print("مرحباً بك في بيئة تشغيل بايثون!")`,
      javascript: `// بيئة جافا سكريبت التفاعلية (Node.js)
const students = ["عمر", "سارة", "أحمد", "مريم"];
students.forEach((name, idx) => {
  console.log(\`الطالب #\${idx + 1}: \${name} في منصة Code Spark\`);
});`
    };

    container.innerHTML = `
      <!-- Header Toolbar -->
      <div style="margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;">
        <div>
          <h2 style="font-size:1.7rem;font-weight:900;color:var(--color-text-main);display:flex;align-items:center;gap:0.5rem;">
            <span>💻</span> محرر الأكواد التفاعلي (Code Playground)
          </h2>
          <p style="color:var(--color-text-muted);font-size:0.88rem;">بيئة برمجية متطورة لتشغيل بايثون، جافا سكريبت، ومشاريع الويب المتكاملة مع المساعد الذكي</p>
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

          <button id="main-run-btn" class="btn btn-primary" style="font-weight:800;padding:0.45rem 1.1rem;display:flex;align-items:center;gap:0.4rem;">
            <span>▶</span> تشغيل الكود
          </button>
        </div>
      </div>

      <!-- Main Playground Layout Grid -->
      <div id="playground-main-grid" style="display:grid;grid-template-columns:1.2fr 1fr;gap:1rem;height:calc(100vh - 210px);min-height:540px;" class="playground-layout">

        <!-- LEFT PANE: Editor & File Tabs -->
        <div class="card" style="display:flex;flex-direction:column;padding:0.75rem;height:100%;position:relative;">
          
          <!-- Web Workspace File Tabs -->
          <div id="web-file-tabs-bar" style="display:none;align-items:center;justify-content:space-between;border-bottom:1px solid var(--color-border);padding-bottom:0.4rem;margin-bottom:0.5rem;">
            <div id="web-tabs-container" style="display:flex;gap:0.35rem;overflow-x:auto;">
              <!-- Injected dynamically -->
            </div>
            <div style="display:flex;gap:0.3rem;">
              <button id="btn-new-file" class="btn btn-secondary btn-sm" style="padding:2px 8px;font-size:0.75rem;" title="إضافة ملف جديد">+ ملف</button>
              <button id="btn-del-file" class="btn btn-secondary btn-sm" style="padding:2px 8px;font-size:0.75rem;" title="حذف الملف الحالي">🗑️</button>
            </div>
          </div>

          <!-- Standalone Mode Bar -->
          <div id="standalone-editor-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
            <span id="editor-file-title" style="font-weight:700;font-size:0.85rem;color:var(--color-primary);font-family:var(--font-mono);">main.py</span>
            <div style="display:flex;gap:0.4rem;">
              <button id="editor-format-btn" class="btn btn-secondary btn-sm" style="font-size:0.75rem;padding:2px 8px;">تنظيف الكود</button>
              <button id="editor-clear-btn" class="btn btn-secondary btn-sm" style="font-size:0.75rem;padding:2px 8px;">مسح</button>
            </div>
          </div>

          <!-- Code Editor Textarea with IntelliSense Autocomplete -->
          <div style="position:relative;flex:1;display:flex;flex-direction:column;">
            <textarea id="main-code-editor" class="form-input" style="flex:1;font-family:var(--font-mono);font-size:0.95rem;line-height:1.6;direction:ltr;text-align:left;background:#030712;color:#38BDF8;border:1px solid var(--color-border);resize:none;padding:1rem;border-radius:var(--radius-sm);" spellcheck="false"></textarea>
            
            <!-- Autocomplete / IntelliSense Popup -->
            <div id="autocomplete-popup" class="code-autocomplete-box"></div>
          </div>

          <!-- Editor Footer Status -->
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.5rem;font-size:0.75rem;color:var(--color-text-dim);">
            <span>الأسطر: <span id="stat-lines-count">1</span> | الأحرف: <span id="stat-chars-count">0</span></span>
            <span id="editor-language-indicator" style="color:var(--color-cyan-accent);font-family:var(--font-mono);">Python 3.11</span>
          </div>

        </div>

        <!-- RIGHT PANE: Dual Mode (Terminal Output & Assistant / Web Live Preview & Console) -->
        <div style="display:flex;flex-direction:column;gap:0.75rem;height:100%;">

          <!-- STANDALONE OUTPUT VIEW (Python / Node) -->
          <div id="standalone-output-view" class="card" style="flex:1;display:flex;flex-direction:column;padding:0.75rem;background:#02050D;border:1px solid var(--color-border-light);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
              <div style="font-weight:700;font-size:0.85rem;color:var(--color-text-main);display:flex;align-items:center;gap:0.4rem;">
                <span>⚡</span> شاشة المخرجات (Terminal Console)
              </div>
              <div id="run-status-text" style="font-size:0.75rem;color:var(--color-text-dim);">جاهز للتشغيل</div>
            </div>
            <pre id="standalone-terminal-output" style="flex:1;font-family:var(--font-mono);font-size:0.9rem;line-height:1.5;direction:ltr;text-align:left;margin:0;padding:0.75rem;background:#030712;color:#E0F2FE;border-radius:var(--radius-sm);overflow:auto;white-space:pre-wrap;border:1px solid rgba(14,165,233,0.15);">اضغط على [تشغيل الكود] لعرض المخرجات هنا...</pre>
          </div>

          <!-- WEB DEVELOPMENT PREVIEW VIEW (Iframe & Web Console) -->
          <div id="web-preview-view" style="display:none;flex:1;flex-direction:column;gap:0.5rem;height:100%;">
            <!-- Live Preview Frame Container -->
            <div class="card" style="flex:1.4;display:flex;flex-direction:column;padding:0.5rem;background:#090E1A;border:1px solid var(--color-border-light);">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;padding:0 0.25rem;">
                <span style="font-size:0.8rem;font-weight:700;color:var(--color-cyan-accent);">👁️ المعاينة المباشرة (Live Preview Sandbox)</span>
                <div style="display:flex;gap:0.3rem;">
                  <button id="btn-reload-preview" class="btn btn-secondary btn-sm" style="font-size:0.75rem;padding:2px 7px;">إعادة تحميل 🔄</button>
                </div>
              </div>
              <iframe id="web-live-iframe" sandbox="allow-scripts" style="flex:1;width:100%;height:100%;border:1px solid #1E293B;border-radius:6px;background:#FFF;"></iframe>
            </div>

            <!-- Web JavaScript Console -->
            <div class="card" style="flex:1;display:flex;flex-direction:column;padding:0.5rem;background:#02050D;border:1px solid var(--color-border);">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.3rem;">
                <span style="font-size:0.75rem;font-weight:700;color:var(--color-text-muted);">🖥️ سجل مخرجات الويب (Web Console)</span>
                <button id="btn-clear-web-console" class="btn btn-secondary btn-sm" style="font-size:0.7rem;padding:1px 6px;">مسح</button>
              </div>
              <div id="web-console-logs" style="flex:1;overflow-y:auto;font-family:var(--font-mono);font-size:0.8rem;background:#030712;padding:0.5rem;border-radius:4px;display:flex;flex-direction:column;gap:0.25rem;direction:ltr;text-align:left;">
                <div style="color:#64748B;">[جاهز لاستقبال مخرجات JavaScript]</div>
              </div>
            </div>
          </div>

          <!-- AI CODING ASSISTANT DRAWER / PANEL -->
          <div class="card" style="padding:0.75rem;border:1px solid var(--color-border-light);background:radial-gradient(ellipse at top, rgba(14,165,233,0.08), var(--color-bg-card));">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
              <div style="font-weight:800;font-size:0.88rem;color:var(--color-primary);display:flex;align-items:center;gap:0.4rem;">
                <span>🤖</span> مساعد البرمجة التعليمي الذكي (AI Code Assistant)
              </div>
              <button id="btn-quick-fix-error" class="btn btn-danger btn-sm" style="display:none;padding:2px 8px;font-size:0.75rem;font-weight:700;">
                🛠️ مساعدة في إصلاح الخطأ
              </button>
            </div>

            <!-- Quick Action Pills -->
            <div style="display:flex;gap:0.35rem;flex-wrap:wrap;margin-bottom:0.5rem;">
              <button class="btn btn-secondary btn-sm ai-action-btn" data-act="hint" style="font-size:0.75rem;padding:2px 8px;">💡 تلميح (Hint)</button>
              <button class="btn btn-secondary btn-sm ai-action-btn" data-act="explain" style="font-size:0.75rem;padding:2px 8px;">📖 اشرح الكود</button>
              <button class="btn btn-secondary btn-sm ai-action-btn" data-act="detect_error" style="font-size:0.75rem;padding:2px 8px;">🔍 فحص الأخطاء</button>
              <button class="btn btn-secondary btn-sm ai-action-btn" data-act="complete" style="font-size:0.75rem;padding:2px 8px;">⚡ أكمل الكود</button>
              <button class="btn btn-secondary btn-sm ai-action-btn" data-act="improve" style="font-size:0.75rem;padding:2px 8px;">🚀 تحسينات</button>
            </div>

            <!-- AI Response Box -->
            <div id="ai-assistant-response" style="max-height:150px;overflow-y:auto;background:var(--color-bg-deep);padding:0.6rem;border-radius:var(--radius-sm);font-size:0.82rem;line-height:1.5;color:var(--color-text-main);white-space:pre-wrap;border:1px solid var(--color-border);">اختر أي إجراء لمساعدتك في فهم الكود خطوة بخطوة...</div>
            <button id="btn-apply-ai-code" class="btn btn-primary btn-sm" style="display:none;width:100%;margin-top:0.4rem;font-weight:700;padding:0.35rem;">تطبيق الكود المقترح على المحرر ✨</button>
          </div>

        </div>

      </div>
    `;

    // DOM Elements
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
    // Switch Modes (Python vs Node vs Web)
    // -------------------------------------------------------------
    function setMode(mode) {
      currentMode = mode;
      document.querySelectorAll(".playground-mode-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.mode === mode);
      });

      if (mode === "web") {
        standaloneOutView.style.display = "none";
        standaloneHeader.style.display = "none";
        webPrevView.style.display = "flex";
        webTabsBar.style.display = "flex";
        webActionsBar.style.display = "flex";
        runBtn.innerHTML = "<span>▶</span> تشغيل ومعاينة الويب";
        renderWebTabs();
        loadWebFile(currentActiveFile);
      } else {
        standaloneOutView.style.display = "flex";
        standaloneHeader.style.display = "flex";
        webPrevView.style.display = "none";
        webTabsBar.style.display = "none";
        webActionsBar.style.display = "none";
        runBtn.innerHTML = "<span>▶</span> تشغيل الكود";
        editor.value = standaloneCode[mode] || "";
        fileTitle.textContent = mode === "python" ? "main.py" : "index.js";
        langIndicator.textContent = mode === "python" ? "Python 3.11" : "Node.js (v20)";
        updateEditorStats();
      }
    }

    document.querySelectorAll(".playground-mode-btn").forEach(btn => {
      btn.addEventListener("click", () => setMode(btn.dataset.mode));
    });

    // -------------------------------------------------------------
    // Web Development Workspace: Files & Tabs
    // -------------------------------------------------------------
    function renderWebTabs() {
      webTabsContainer.innerHTML = Object.keys(webFiles).map(fn => `
        <div class="file-tab ${fn === currentActiveFile ? 'active' : ''}" data-file="${fn}">
          <span>${fn.endsWith('.html') ? '🌐' : (fn.endsWith('.css') ? '🎨' : '📜')}</span>
          <span>${fn}</span>
        </div>
      `).join("");

      webTabsContainer.querySelectorAll(".file-tab").forEach(tab => {
        tab.addEventListener("click", () => {
          // Save current file content before switching
          webFiles[currentActiveFile] = editor.value;
          loadWebFile(tab.dataset.file);
        });
      });
    }

    function loadWebFile(fileName) {
      currentActiveFile = fileName;
      editor.value = webFiles[fileName] || "";
      fileTitle.textContent = fileName;
      langIndicator.textContent = fileName.endsWith(".html") ? "HTML5" : (fileName.endsWith(".css") ? "CSS3" : "JavaScript");
      renderWebTabs();
      updateEditorStats();
    }

    // New file
    document.getElementById("btn-new-file")?.addEventListener("click", () => {
      const name = prompt("أدخل اسم الملف الجديد (مثال: about.html أو animation.css):");
      if (name && name.trim()) {
        const cleanName = name.trim();
        if (!webFiles[cleanName]) {
          webFiles[cleanName] = `/* ${cleanName} */\n`;
          loadWebFile(cleanName);
          Toast.success(`تم إنشاء الملف: ${cleanName}`);
        }
      }
    });

    // Delete file
    document.getElementById("btn-del-file")?.addEventListener("click", () => {
      if (["index.html", "style.css", "script.js"].includes(currentActiveFile)) {
        Toast.warning("لا يمكن حذف الملفات الأساسية للمشروع.");
        return;
      }
      Modal.confirm({
        title: "حذف الملف",
        message: `هل أنت متأكد من رغبتك في حذف ${currentActiveFile}؟`,
        onConfirm: () => {
          delete webFiles[currentActiveFile];
          loadWebFile("index.html");
          Toast.success("تم حذف الملف");
        }
      });
    });

    // -------------------------------------------------------------
    // Sandboxed Web Live Preview & Console Receiver
    // -------------------------------------------------------------
    function renderWebPreview() {
      webFiles[currentActiveFile] = editor.value;
      const html = webFiles["index.html"] || "";
      const css = webFiles["style.css"] || "";
      const js = webFiles["script.js"] || "";

      // Safe client-side console logger injected into iframe
      const consoleScript = `<script>
        (function() {
          const _send = (type, args) => {
            try {
              window.parent.postMessage({
                source: 'codespark_preview_console',
                type: type,
                payload: Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
              }, '*');
            } catch(e) {}
          };
          console.log = function(...args) { _send('log', args); };
          console.error = function(...args) { _send('error', args); };
          console.warn = function(...args) { _send('warn', args); };
          window.onerror = function(msg, url, line) {
            _send('error', ['خطأ برمجى: ' + msg + ' (السطر ' + line + ')']);
            return false;
          };
        })();
      <\/script>`;

      // Combine into composite HTML document
      let fullDoc = html;
      if (!fullDoc.includes("<style>") && css) {
        fullDoc = fullDoc.replace("</head>", `<style>${css}</style></head>`);
      }
      fullDoc = fullDoc.replace("</body>", `${consoleScript}<script>${js}<\/script></body>`);

      webIframe.srcdoc = fullDoc;
    }

    document.getElementById("btn-reload-preview")?.addEventListener("click", renderWebPreview);
    document.getElementById("btn-clear-web-console")?.addEventListener("click", () => {
      webConsole.innerHTML = '<div style="color:#64748B;">[تم مسح سجل المخرجات]</div>';
    });

    // Listen for sandboxed iframe console messages
    window.addEventListener("message", (e) => {
      if (e.data && e.data.source === "codespark_preview_console") {
        const item = document.createElement("div");
        const color = e.data.type === "error" ? "#EF4444" : (e.data.type === "warn" ? "#F59E0B" : "#38BDF8");
        item.style.color = color;
        item.textContent = `[${new Date().toLocaleTimeString()}] ${e.data.payload}`;
        webConsole.appendChild(item);
        webConsole.scrollTop = webConsole.scrollHeight;

        if (e.data.type === "error") {
          lastErrorDetected = e.data.payload;
          btnQuickFix.style.display = "inline-flex";
        }
      }
    });

    // -------------------------------------------------------------
    // Save & Load Web Projects via Backend API (/api/playground/projects)
    // -------------------------------------------------------------
    document.getElementById("btn-save-project")?.addEventListener("click", async () => {
      webFiles[currentActiveFile] = editor.value;
      const title = prompt("أدخل اسم المشروع لحفظه:", "مشروع ويب - " + new Date().toLocaleDateString("ar-EG"));
      if (!title || !title.trim()) return;

      try {
        if (currentProjectId) {
          await ApiClient.put(`/playground/projects/${currentProjectId}`, {
            title: title.trim(),
            files: webFiles
          });
          Toast.success("تم تحديث وحفظ المشروع في قاعدة البيانات بنجاح 💾");
        } else {
          const res = await ApiClient.post("/playground/projects", {
            title: title.trim(),
            files: webFiles
          });
          currentProjectId = res.project_id;
          Toast.success("تم حفظ المشروع الجديد في قاعدة البيانات بنجاح 💾");
        }
      } catch (err) {
        Toast.error("تعذر حفظ المشروع: " + err.message);
      }
    });

    document.getElementById("btn-load-projects")?.addEventListener("click", async () => {
      try {
        const projects = await ApiClient.get("/playground/projects");
        if (!projects || projects.length === 0) {
          Toast.info("لا توجد مشاريع محفوظة لديك حتى الآن.");
          return;
        }

        Modal.open({
          title: "مشاريعك المحفوظة في قاعدة البيانات",
          contentHtml: `
            <div style="display:flex;flex-direction:column;gap:0.75rem;max-height:300px;overflow-y:auto;">
              ${projects.map(p => `
                <div style="padding:0.75rem 1rem;background:var(--color-bg-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);display:flex;justify-content:space-between;align-items:center;">
                  <div>
                    <strong style="color:var(--color-text-main);">${p.title}</strong>
                    <div style="font-size:0.75rem;color:var(--color-text-muted);">آخر تعديل: ${p.updated_at ? p.updated_at.substring(0, 16).replace('T', ' ') : ''}</div>
                  </div>
                  <div style="display:flex;gap:0.4rem;">
                    <button class="btn btn-primary btn-sm m-open-proj-btn" data-pid="${p.id}">فتح 📂</button>
                    <button class="btn btn-danger btn-sm m-del-proj-btn" data-pid="${p.id}">حذف</button>
                  </div>
                </div>
              `).join('')}
            </div>
          `
        });

        document.querySelectorAll(".m-open-proj-btn").forEach(btn => {
          btn.addEventListener("click", async () => {
            const pData = await ApiClient.get(`/playground/projects/${btn.dataset.pid}`);
            webFiles = pData.files || webFiles;
            currentProjectId = pData.id;
            Modal.close();
            setMode("web");
            loadWebFile("index.html");
            renderWebPreview();
            Toast.success(`تم تحميل المشروع: ${pData.title}`);
          });
        });

        document.querySelectorAll(".m-del-proj-btn").forEach(btn => {
          btn.addEventListener("click", async () => {
            await ApiClient.delete(`/playground/projects/${btn.dataset.pid}`);
            Toast.success("تم حذف المشروع");
            Modal.close();
          });
        });
      } catch (err) {
        Toast.error("فشل استرجاع المشاريع: " + err.message);
      }
    });

    // -------------------------------------------------------------
    // Code Execution (Subprocess Runner & Web Render)
    // -------------------------------------------------------------
    runBtn.addEventListener("click", async () => {
      if (currentMode === "web") {
        renderWebPreview();
        Toast.success("تم تشغيل ومعاينة كود الويب بنجاح 🌐");
        return;
      }

      const code = editor.value;
      runBtn.disabled = true;
      runBtn.innerHTML = "<span>⏳</span> جاري المعالجة...";
      runStatusText.textContent = "جاري التنفيذ في الصندوق المعزول...";
      terminal.textContent = "Running code in sandbox...";
      terminal.style.color = "#E0F2FE";
      btnQuickFix.style.display = "none";

      try {
        const res = await ApiClient.post("/playground/run", {
          language: currentMode,
          code: code
        });

        if (res.success) {
          terminal.textContent = res.output || "(تم التنفيذ بنجاح دون مخرجات نصية)";
          terminal.style.color = "#38BDF8";
          runStatusText.textContent = "تم التنفيذ بنجاح ✅";
        } else {
          terminal.textContent = res.error || "حدث خطأ أثناء التنفيذ";
          terminal.style.color = "#EF4444";
          runStatusText.textContent = "تم رصد خطأ ❌";
          lastErrorDetected = res.error;
          btnQuickFix.style.display = "inline-flex";
        }
      } catch (err) {
        terminal.textContent = err.message;
        terminal.style.color = "#EF4444";
        runStatusText.textContent = "فشل الخادم";
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
        { label: "def function():", insert: "def function_name():\n    return None", type: "keyword" },
        { label: "for i in range():", insert: "for i in range(10):\n    print(i)", type: "loop" },
        { label: "if __name__ == '__main__':", insert: "if __name__ == '__main__':\n    main()", type: "block" },
        { label: "print()", insert: "print()", type: "fn" },
        { label: "len()", insert: "len()", type: "fn" },
        { label: "range()", insert: "range()", type: "fn" },
        { label: "sum()", insert: "sum()", type: "fn" }
      ]
    };

    editor.addEventListener("input", (e) => {
      updateEditorStats();
      const pos = editor.selectionStart;
      const textBefore = editor.value.substring(0, pos);
      const match = textBefore.match(/([a-zA-Z<:]{2,})$/);

      if (match) {
        const query = match[1].toLowerCase();
        let targetLang = currentMode;
        if (currentMode === "web") {
          targetLang = currentActiveFile.endsWith(".html") ? "html" : (currentActiveFile.endsWith(".css") ? "css" : "javascript");
        }
        const pool = completions[targetLang] || completions.python;
        const matched = pool.filter(c => c.label.toLowerCase().includes(query));

        if (matched.length > 0) {
          popup.innerHTML = matched.map((m, i) => `
            <div class="code-autocomplete-item ${i === 0 ? 'selected' : ''}" data-idx="${i}">
              <span>${m.label}</span>
              <span class="code-autocomplete-badge">${m.type}</span>
            </div>
          `).join("");
          popup.style.display = "block";
          popup.style.top = "45px";
          popup.style.left = "40px";

          popup.querySelectorAll(".code-autocomplete-item").forEach(item => {
            item.addEventListener("click", () => {
              applyCompletion(matched[parseInt(item.dataset.idx)], match[1].length);
            });
          });
          return;
        }
      }
      popup.style.display = "none";
    });

    function applyCompletion(compObj, replaceLen) {
      const pos = editor.selectionStart;
      const before = editor.value.substring(0, pos - replaceLen);
      const after = editor.value.substring(pos);
      editor.value = before + compObj.insert + after;
      editor.selectionStart = editor.selectionEnd = before.length + compObj.insert.length;
      popup.style.display = "none";
      editor.focus();
      updateEditorStats();
    }

    editor.addEventListener("keydown", (e) => {
      if (popup.style.display === "block") {
        if (e.key === "Escape") {
          popup.style.display = "none";
        } else if (e.key === "Tab" || e.key === "Enter") {
          const selected = popup.querySelector(".code-autocomplete-item.selected");
          if (selected) {
            e.preventDefault();
            selected.click();
          }
        }
      }
    });

    function updateEditorStats() {
      const val = editor.value;
      linesCount.textContent = val.split("\n").length;
      charsCount.textContent = val.length;
    }

    // -------------------------------------------------------------
    // AI Coding Assistant Interactions
    // -------------------------------------------------------------
    async function triggerAiAssistant(action, customError = null) {
      aiResponse.innerHTML = "<span>🤖 جاري تحليل الكود وصياغة التوجيه الذكي...</span>";
      btnApplyAi.style.display = "none";

      try {
        let activeLang = currentMode;
        if (currentMode === "web") {
          activeLang = currentActiveFile.endsWith(".html") ? "html" : (currentActiveFile.endsWith(".css") ? "css" : "javascript");
        }

        const res = await ApiClient.post("/playground/ai-assist", {
          action: action,
          code: editor.value,
          language: activeLang,
          error_message: customError || lastErrorDetected
        });

        let outHtml = `<strong>${res.title || 'تحليل الكود'}</strong>\n`;
        if (res.explanation) outHtml += `${res.explanation}\n\n`;
        if (res.suggestion) outHtml += `• المقترح: ${res.suggestion}\n`;
        if (res.hint) outHtml += `• 💡 تلميح: ${res.hint}\n`;

        aiResponse.textContent = outHtml;

        if (res.suggested_code) {
          suggestedAiCode = res.suggested_code;
          btnApplyAi.style.display = "block";
        }
      } catch (err) {
        aiResponse.textContent = "تعذر الاتصال بمساعد البرمجة: " + err.message;
      }
    }

    document.querySelectorAll(".ai-action-btn").forEach(btn => {
      btn.addEventListener("click", () => triggerAiAssistant(btn.dataset.act));
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

    // Initial state
    setMode("python");
  }

  /* ===================================================================
     5. EXAMS & TIMED EXAM TAKER
  =================================================================== */
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

}
