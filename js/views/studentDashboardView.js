// Code Spark Modern Futuristic Student Dashboard View
(function() {
  window.StudentDashboardView = {
    render(user) {
      user = user || {};
      const progress = (window.CodeSparkDB && window.CodeSparkDB.getStudentProgress(user.id)) || {
        completedLessons: [],
        examAttempts: [],
        overallProgress: 72,
        streak: 5,
        xp: 840,
        learningHours: 14.5,
        avgScore: 86
      };
      const units = (window.CodeSparkDB && window.CodeSparkDB.getUnits()) || [];
      const lessons = (window.CodeSparkDB && window.CodeSparkDB.getLessons()) || [];
      const announcements = (window.CodeSparkDB && window.CodeSparkDB.getAnnouncements()) || [];

      const defaultUnit = {
        id: 'unit_1',
        title: 'الوحدة الأولى: أساسيات لغة بايثون',
        status: 'in_progress',
        number: 1
      };
      const defaultLesson = {
        id: 'lesson_1_1',
        unitId: 'unit_1',
        title: 'مقدمة إلى لغة البرمجة بايثون',
        description: 'التعرف على بيئة العمل وتثبيت بايثون وأول كود برمجي',
        duration: '15 دقيقة'
      };

      const inProgressUnit = units.find(u => u.status === 'in_progress') || units[0] || defaultUnit;
      const inProgressLesson = (inProgressUnit && lessons.find(l => (l.unitId === inProgressUnit.id || l.unit_id === inProgressUnit.id))) || lessons[0] || defaultLesson;

      const userName = (user.name || 'طالب').split(' ')[0];
      const fullName = user.name || 'طالب جديد';
      const completedLessonsCount = user.completedLessonsCount !== undefined ? user.completedLessonsCount : ((progress.completedLessons && progress.completedLessons.length) ? progress.completedLessons.length : 18);
      const examsCount = user.examsCount !== undefined ? user.examsCount : ((progress.examAttempts && progress.examAttempts.length) ? progress.examAttempts.length : 7);
      const overallProgress = progress.overallProgress !== undefined ? progress.overallProgress : 72;
      const avgScore = user.avgScore !== undefined ? user.avgScore : (progress.avgScore !== undefined ? progress.avgScore : 86);
      const xp = user.xp !== undefined ? user.xp : (progress.xp !== undefined ? progress.xp : 840);
      const streak = user.streak !== undefined ? user.streak : (progress.streak !== undefined ? progress.streak : 5);
      const badgesCount = 4;

      const unitTitleShort = (inProgressUnit && inProgressUnit.title) ? inProgressUnit.title.split(':')[0] : 'الوحدة الأولى';

      // Subscription Status Processing
      const subStatus = user.subscription_status || 'active';
      const isLifetime = user.is_lifetime || user.subscription_duration_days === -1 || (!user.subscription_expires_at && subStatus === 'active');
      const isExpired = subStatus === 'expired' || user.days_remaining === 0;
      const daysRemaining = user.days_remaining !== undefined ? user.days_remaining : (isLifetime ? -1 : 30);
      
      const subStartDate = user.subscription_start ? new Date(user.subscription_start).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : 'تاريخ التسجيل';
      const subExpDate = isLifetime ? 'اشتراك مدى الحياة' : (user.subscription_expires_at ? new Date(user.subscription_expires_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : 'غير محدد');

      let subBadgeHtml = '<span class="badge badge-success" style="display:flex; align-items:center; gap:0.25rem;">🟢 اشتراك نشط</span>';
      let subDaysHtml = isLifetime ? '<strong style="color:var(--cyan); font-weight:800;">اشتراك مدى الحياة ♾️</strong>' : (isExpired ? '<strong style="color:var(--danger); font-weight:800;">انتهت الصلاحية</strong>' : `<strong style="color:var(--text-main); font-weight:800;">متبقي ${daysRemaining} يومًا</strong>`);

      if (isLifetime) {
        subBadgeHtml = '<span class="badge badge-cyan" style="display:flex; align-items:center; gap:0.25rem;">♾️ اشتراك مدى الحياة</span>';
      } else if (isExpired) {
        subBadgeHtml = '<span class="badge badge-danger" style="display:flex; align-items:center; gap:0.25rem;">🔴 منتهي الصلاحية</span>';
      }

      // Recommended Courses/Tracks Definition
      const recommendedCourses = [
        {
          id: 'course_py_core',
          title: 'أساسيات لغة بايثون والتفكير المنطقي',
          level: 'المستوى المبتدئ',
          lessonsCount: 6,
          enrolled: true,
          progress: 100,
          icon: 'code',
          tag: 'موصى به لك',
          badgeClass: 'badge-success',
          unitLink: '#unit/unit_1'
        },
        {
          id: 'course_data_struct',
          title: 'هياكل البيانات والقوائم التفاعلية في بايثون',
          level: 'المستوى المتوسط',
          lessonsCount: 6,
          enrolled: true,
          progress: 25,
          icon: 'terminal',
          tag: 'قيد التقدم',
          badgeClass: 'badge-cyan',
          unitLink: '#unit/unit_2'
        },
        {
          id: 'course_algo_logic',
          title: 'الخوارزميات وحل المشكلات التنافسية',
          level: 'المستوى المتقدم',
          lessonsCount: 6,
          enrolled: false,
          progress: 0,
          icon: 'zap',
          tag: 'مسار مميز',
          badgeClass: 'badge-primary',
          unitLink: '#unit/unit_3'
        },
        {
          id: 'course_exams_prep',
          title: 'المراجعة الشاملة ونماذج الاختبارات الوزارية',
          level: 'مراجعة نهائية',
          lessonsCount: 4,
          enrolled: false,
          progress: 0,
          icon: 'checkSquare',
          tag: 'امتحانات سابقة',
          badgeClass: 'badge-warning',
          unitLink: '#unit/unit_4'
        }
      ];

      return `
        <div class="content-body">
          
          ${isExpired ? `
            <!-- Expired Subscription Notice Banner -->
            <div style="background:rgba(239, 68, 68, 0.14); border:1px solid var(--danger); border-radius:var(--radius-lg); padding:1.25rem 1.5rem; margin-bottom:1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; box-shadow:0 0 25px rgba(239,68,68,0.2);">
              <div style="display:flex; align-items:center; gap:1rem;">
                <span style="font-size:2rem; filter:drop-shadow(0 0 8px rgba(239,68,68,0.6));">⚠️</span>
                <div>
                  <div style="font-weight:800; color:var(--text-main); font-size:1.0625rem; margin-bottom:0.25rem;">انتهى اشتراكك، يرجى تجديد الاشتراك.</div>
                  <div style="font-size:0.875rem; color:var(--text-muted);">انتهت فترة الصلاحية لحسابك، لن تتمكن من الوصول للدروس والتدريبات حتى يتم التجديد.</div>
                </div>
              </div>
              <a href="#support" class="btn btn-danger btn-sm" style="font-weight:700;">تجديد الاشتراك الآن 💬</a>
            </div>
          ` : ''}

          <!-- 1. HERO / WELCOME SECTION -->
          <div class="card card-glass" style="margin-bottom:2rem; padding:2rem; border-color:var(--border-glow); position:relative; overflow:hidden; box-shadow:var(--shadow-lg), 0 0 35px rgba(6,182,212,0.15);">
            <div style="position:absolute; top:-60px; left:-60px; width:220px; height:220px; background:radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 70%); filter:blur(30px); pointer-events:none;"></div>
            <div style="position:absolute; bottom:-40px; right:20%; width:160px; height:160px; background:radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%); filter:blur(25px); pointer-events:none;"></div>

            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1.5rem; position:relative; z-index:2;">
              <div>
                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.6rem; flex-wrap:wrap;">
                  <span class="badge badge-primary">${user.grade || 'الصف الأول الثانوي'}</span>
                  <span class="badge badge-cyan" style="display:flex; align-items:center; gap:0.25rem;">
                    ${Icons.flame()} ${streak} أيام متتالية
                  </span>
                  <span class="badge badge-warning" style="display:flex; align-items:center; gap:0.25rem;">
                    ⚡ ${xp} نقطة XP
                  </span>
                  <span class="badge badge-neutral" style="font-size:0.75rem;">
                    ${isLifetime ? '♾️ اشتراك مدى الحياة' : (isExpired ? '🔴 منتهي' : '🟢 حساب مفعل')}
                  </span>
                </div>
                
                <h1 style="font-size: clamp(1.6rem, 3vw, 2.25rem); font-weight:900; margin-bottom:0.5rem; letter-spacing:-0.02em;">
                  مرحبًا بك، <span class="sparkle-text">${fullName}</span> 👋
                </h1>
                
                <p style="color:var(--text-muted); font-size:1.05rem; max-width:650px; line-height:1.6; margin-bottom:1.5rem;">
                  مستعد لمواصلة رحلتك في عالم البرمجة؟ استعد لاكتساب مهارات تقنية حقيقية وإتقان لغة بايثون خطوة بخطوة.
                </p>

                <!-- Current Course Learning Progress Strip -->
                <div style="background:rgba(7, 11, 20, 0.65); border:1px solid var(--border-card); border-radius:var(--radius-lg); padding:1.15rem 1.5rem; max-width:560px; margin-bottom:1.25rem;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                    <div style="font-weight:700; font-size:0.9375rem; color:var(--text-main); display:flex; align-items:center; gap:0.5rem;">
                      <span class="spark-dot"></span> أكمل تعلم Python: <span style="color:var(--cyan);">${inProgressUnit.title.split(':')[0]}</span>
                    </div>
                    <span class="number-font" style="font-weight:800; color:var(--cyan); font-size:1.1rem;">${overallProgress}%</span>
                  </div>
                  <div class="progress-container progress-container-lg">
                    <div class="progress-bar-fill animated-progress-fill" data-progress="${overallProgress}" style="width: 0%;"></div>
                  </div>
                </div>

                <div style="display:flex; gap:0.85rem; flex-wrap:wrap;">
                  <a href="#lesson/${inProgressLesson.id}" class="btn btn-primary btn-lg" style="box-shadow:0 0 20px rgba(6,182,212,0.4);">
                    ${Icons.play()} متابعة التعلم
                  </a>
                  <a href="#practice" class="btn btn-secondary btn-lg">
                    ${Icons.code()} محرر بايثون التفاعلي
                  </a>
                  <a href="#curriculum" class="btn btn-outline btn-lg">
                    ${Icons.book()} خطة المنهج
                  </a>
                  <a href="#resources" class="btn btn-outline btn-lg">
                    ${Icons.fileText ? Icons.fileText() : '📄'} الملفات التعليمية
                  </a>
                </div>
              </div>

              <!-- Quick Student Stat Badge Box -->
              <div style="display:flex; flex-direction:column; gap:0.75rem; min-width:200px;" class="hide-on-mobile">
                <div style="background:rgba(14, 22, 38, 0.8); border:1px solid var(--border-card); border-radius:var(--radius-md); padding:1rem; text-align:center;">
                  <div style="font-size:0.75rem; color:var(--text-subtle); font-weight:700; text-transform:uppercase;">الدرس الحالي النشط</div>
                  <div style="font-weight:800; font-size:0.9375rem; color:var(--cyan-light); margin-top:0.25rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;">${inProgressLesson.title}</div>
                </div>
                <div style="background:rgba(14, 22, 38, 0.8); border:1px solid var(--border-card); border-radius:var(--radius-md); padding:1rem; text-align:center;">
                  <div style="font-size:0.75rem; color:var(--text-subtle); font-weight:700; text-transform:uppercase;">مستوى الاستيعاب</div>
                  <div style="font-weight:800; font-size:1.25rem; color:var(--success); margin-top:0.25rem;">${avgScore}% ممتاز 🌟</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. SUBSCRIPTION STATUS CARD -->
          <div class="card card-glass" style="margin-bottom:2rem; padding:1.25rem 1.5rem; border-color:${isExpired ? 'var(--danger)' : 'var(--border-glow)'}; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1.25rem;">
            <div style="display:flex; align-items:center; gap:1rem;">
              <div class="stat-icon-wrapper ${isExpired ? 'stat-icon-danger' : (isLifetime ? 'stat-icon-cyan' : 'stat-icon-blue')}" style="width:48px; height:48px; font-size:1.35rem;">
                ${Icons.key ? Icons.key() : '🔑'}
              </div>
              <div>
                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
                  <span style="font-weight:800; font-size:1.05rem; color:var(--text-main);">حالة الاشتراك الأكاديمي:</span>
                  ${subBadgeHtml}
                </div>
                <div style="font-size:0.875rem; color:var(--text-muted); display:flex; gap:1.25rem; flex-wrap:wrap;">
                  <span>📅 تاريخ البدء: <strong style="color:var(--text-main);">${subStartDate}</strong></span>
                  <span>⏳ تاريخ الانتهاء: <strong style="color:var(--text-main);">${subExpDate}</strong></span>
                  <span>⏱️ المدة المتبقية: ${subDaysHtml}</span>
                </div>
              </div>
            </div>
            ${isExpired ? `
              <a href="#support" class="btn btn-primary btn-sm">طلب تجديد الكود ⚡</a>
            ` : `
              <span class="badge badge-neutral" style="font-size:0.8125rem;">${user.subscription_plan_label || (isLifetime ? 'اشتراك مدى الحياة' : 'اشتراك مفعل')}</span>
            `}
          </div>

          <!-- 3. 5 FUTURISTIC STATISTICS CARDS -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1.25rem; margin-bottom:2rem;">
            
            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-cyan">
                ${Icons.book()}
              </div>
              <div>
                <div class="stat-value counter-value" data-target="${completedLessonsCount}">${completedLessonsCount}</div>
                <div class="stat-label">الدروس المكتملة</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-green">
                ${Icons.award()}
              </div>
              <div>
                <div class="stat-value"><span class="counter-value" data-target="${avgScore}">${avgScore}</span>%</div>
                <div class="stat-label">متوسط الدرجات</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-warning">
                ${Icons.zap()}
              </div>
              <div>
                <div class="stat-value counter-value" data-target="${xp}">${xp}</div>
                <div class="stat-label">نقاط الخبرة XP</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-purple">
                ${Icons.award()}
              </div>
              <div>
                <div class="stat-value"><span class="counter-value" data-target="${badgesCount}">${badgesCount}</span> أوسمة</div>
                <div class="stat-label">الشارات المكتسبة</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-blue">
                ${Icons.trendingUp()}
              </div>
              <div>
                <div class="stat-value"><span class="counter-value" data-target="${overallProgress}">${overallProgress}</span>%</div>
                <div class="stat-label">نسبة الإنجاز الكلي</div>
              </div>
            </div>

          </div>

          <!-- 4. MAIN SPLIT: CONTINUE LEARNING SPOTLIGHT + WEEKLY ACTIVITY CHART -->
          <div style="display:grid; grid-template-columns: 1.3fr 0.9fr; gap:1.5rem; margin-bottom:2.5rem;" class="dashboard-main-grid">
            
            <!-- In-Depth Spotlight Card -->
            <div class="card card-glass" style="border-color:var(--border-glow); display:flex; flex-direction:column; justify-content:space-between; position:relative; overflow:hidden;">
              <div style="position:absolute; top:-40px; left:-40px; width:180px; height:180px; background:radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%); filter:blur(20px);"></div>

              <div>
                <div class="card-header" style="margin-bottom:1rem;">
                  <div class="card-title">
                    <span class="spark-dot"></span> تابع من حيث توقفت
                  </div>
                  <span class="badge badge-cyan">الدرس القادم</span>
                </div>

                <div style="background:rgba(7,11,20,0.7); border:1px solid var(--border-card); border-radius:var(--radius-lg); padding:1.35rem; margin-bottom:1.25rem;">
                  <div style="font-size:0.8125rem; color:var(--cyan); font-weight:800; margin-bottom:0.35rem;">
                    ${inProgressUnit.title}
                  </div>
                  <h3 style="font-size:1.3rem; font-weight:900; margin-bottom:0.5rem; color:var(--text-main);">
                    ${inProgressLesson.title}
                  </h3>
                  <p style="font-size:0.875rem; color:var(--text-muted); line-height:1.6; margin-bottom:1.15rem;">
                    ${inProgressLesson.description}
                  </p>

                  <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8125rem; color:var(--text-muted); margin-bottom:0.5rem;">
                    <span>تقدم الوحدة الحالية</span>
                    <span class="number-font" style="font-weight:700; color:var(--cyan);">25%</span>
                  </div>
                  <div class="progress-container progress-container-lg">
                    <div class="progress-bar-fill animated-progress-fill" data-progress="25" style="width: 0%;"></div>
                  </div>
                </div>
              </div>

              <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem; padding-top:0.5rem;">
                <div style="display:flex; align-items:center; gap:0.5rem; font-size:0.875rem; color:var(--text-muted);">
                  ${Icons.clock()} زمن الدرس المقدر: ${inProgressLesson.duration || '15 دقيقة'}
                </div>
                <a href="#lesson/${inProgressLesson.id}" class="btn btn-primary">
                  متابعة الدرس ${Icons.arrowLeft()}
                </a>
              </div>
            </div>

            <!-- Weekly Study Activity Chart Card -->
            <div class="card card-glass">
              <div class="card-header">
                <div>
                  <div class="card-title">
                    ${Icons.trendingUp()} ساعات المذاكرة والنشاط
                  </div>
                  <div class="card-subtitle">إجمالي النشاط: 14.5 ساعة هذا الأسبوع</div>
                </div>
                <span class="badge badge-neutral">آخر 7 أيام</span>
              </div>

              <div style="position:relative; width:100%; height:210px;">
                <canvas id="weekly-study-chart" style="width:100%; height:100%;"></canvas>
              </div>
            </div>

          </div>

          <!-- 5. RECENT LESSONS SECTION (الدروس الأخيرة) -->
          <div style="margin-bottom:2.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
              <div>
                <h2 style="font-size:1.375rem; font-weight:800; color:var(--text-main); margin-bottom:0.25rem; display:flex; align-items:center; gap:0.5rem;">
                  ${Icons.playCircle()} الدروس الأخيرة
                </h2>
                <p style="font-size:0.875rem; color:var(--text-muted); margin:0;">تابع مذاكرة الدروس والتطبيقات البرمجية الحالية</p>
              </div>
              <a href="#curriculum" style="font-size:0.875rem; color:var(--cyan); font-weight:700; display:flex; align-items:center; gap:0.25rem;">
                عرض كافة الدروس ${Icons.arrowLeft()}
              </a>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:1.25rem;">
              ${lessons.slice(0, 4).map((l, idx) => {
                const isCompleted = progress.completedLessons && progress.completedLessons.includes(l.id);
                const isInProg = l.id === inProgressLesson.id;
                
                let statusBadge = '<span class="badge badge-neutral">🔒 لم يبدأ</span>';
                let progressWidth = 0;
                let btnLabel = 'بدء الدرس';
                let btnClass = 'btn-outline';

                if (isCompleted) {
                  statusBadge = '<span class="badge badge-success">✓ مكتمل</span>';
                  progressWidth = 100;
                  btnLabel = 'مراجعة الدرس';
                  btnClass = 'btn-secondary';
                } else if (isInProg) {
                  statusBadge = '<span class="badge badge-cyan">⏳ قيد التقدم</span>';
                  progressWidth = 50;
                  btnLabel = 'متابعة الدرس';
                  btnClass = 'btn-primary';
                }

                return `
                  <div class="card card-hover" style="display:flex; flex-direction:column; justify-content:space-between; border-color:${isInProg ? 'var(--border-cyan)' : 'var(--border-subtle)'};">
                    <div>
                      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                        <span class="badge badge-primary" style="font-size:0.7rem;">درس ${idx + 1}</span>
                        ${statusBadge}
                      </div>

                      <h3 style="font-size:1.0625rem; font-weight:700; color:var(--text-main); margin-bottom:0.4rem; line-height:1.4;">
                        <a href="#lesson/${l.id}">${l.title}</a>
                      </h3>
                      
                      <div style="font-size:0.8125rem; color:var(--text-muted); margin-bottom:1rem; line-height:1.5;">
                        ${(l.description || '').substring(0, 75)}...
                      </div>
                    </div>

                    <div>
                      <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-subtle); margin-bottom:0.4rem;">
                        <span>${Icons.clock()} ${l.duration || '15 دقيقة'}</span>
                        <span class="number-font">${progressWidth}%</span>
                      </div>
                      <div class="progress-container" style="margin-bottom:1rem;">
                        <div class="progress-bar-fill animated-progress-fill" data-progress="${progressWidth}" style="width: 0%;"></div>
                      </div>
                      <a href="#lesson/${l.id}" class="btn ${btnClass} btn-sm" style="width:100%;">
                        ${btnLabel} ${Icons.arrowLeft()}
                      </a>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- 6. COURSE PROGRESS SECTION (التقدم في الكورسات) -->
          <div style="margin-bottom:2.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
              <div>
                <h2 style="font-size:1.375rem; font-weight:800; color:var(--text-main); margin-bottom:0.25rem; display:flex; align-items:center; gap:0.5rem;">
                  ${Icons.book()} التقدم في الكورسات ووحدات المنهج
                </h2>
                <p style="font-size:0.875rem; color:var(--text-muted); margin:0;">تفصيل نسبة إنجازك في كل وحدة دراسية ومسار</p>
              </div>
              <a href="#curriculum" style="font-size:0.875rem; color:var(--cyan); font-weight:700;">
                خريطة المنهج كاملة
              </a>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:1.25rem;">
              ${units.map((u, i) => {
                const uLessons = lessons.filter(l => (l.unitId === u.id || l.unit_id === u.id));
                const doneCount = uLessons.filter(l => progress.completedLessons && progress.completedLessons.includes(l.id)).length;
                const unitPct = uLessons.length ? Math.round((doneCount / uLessons.length) * 100) : (i === 0 ? 100 : (i === 1 ? 25 : 0));
                
                let uBadge = '<span class="badge badge-success">✓ مكتمل</span>';
                if (unitPct < 100 && unitPct > 0) {
                  uBadge = '<span class="badge badge-cyan">⏳ قيد المذاكرة</span>';
                } else if (unitPct === 0) {
                  uBadge = '<span class="badge badge-neutral">🔒 مغلق</span>';
                }

                return `
                  <div class="card card-hover" style="border-color:${unitPct > 0 ? 'var(--border-card)' : 'var(--border-subtle)'};">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem;">
                      <div class="stat-icon-wrapper ${unitPct === 100 ? 'stat-icon-green' : (unitPct > 0 ? 'stat-icon-cyan' : 'stat-icon-blue')}" style="width:44px; height:44px; font-size:1.25rem;">
                        ${Icons[u.icon] ? Icons[u.icon]() : Icons.book()}
                      </div>
                      ${uBadge}
                    </div>

                    <div style="font-size:0.75rem; font-weight:700; color:var(--text-subtle); margin-bottom:0.25rem;">الوحدة ${u.number || i + 1}</div>
                    <h3 style="font-size:1.125rem; font-weight:800; color:var(--text-main); margin-bottom:0.5rem;">
                      <a href="#unit/${u.id}">${u.title.replace(/^الوحدة.*?:/, '')}</a>
                    </h3>
                    
                    <div style="display:flex; justify-content:space-between; font-size:0.8125rem; color:var(--text-muted); margin-bottom:0.5rem;">
                      <span>${uLessons.length || 6} دروس</span>
                      <span class="number-font" style="font-weight:700; color:var(--cyan);">${unitPct}%</span>
                    </div>
                    <div class="progress-container" style="margin-bottom:1.25rem;">
                      <div class="progress-bar-fill animated-progress-fill" data-progress="${unitPct}" style="width: 0%;"></div>
                    </div>

                    <a href="#unit/${u.id}" class="btn btn-secondary btn-sm" style="width:100%;">
                      عرض تفاصيل الوحدة ${Icons.arrowLeft()}
                    </a>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- 7. RECOMMENDED COURSES SECTION (الكورسات الموصى بها) -->
          <div style="margin-bottom:2.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
              <div>
                <h2 style="font-size:1.375rem; font-weight:800; color:var(--text-main); margin-bottom:0.25rem; display:flex; align-items:center; gap:0.5rem;">
                  ${Icons.sparkles ? Icons.sparkles() : '✨'} الكورسات والمسارات الموصى بها
                </h2>
                <p style="font-size:0.875rem; color:var(--text-muted); margin:0;">مسارات مخصصة لتطوير مستواك البرمجي بناءً على تقدمك الحالي</p>
              </div>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:1.25rem;">
              ${recommendedCourses.map(rc => `
                <div class="card card-hover" style="display:flex; flex-direction:column; justify-content:space-between; background:var(--gradient-card);">
                  <div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.85rem;">
                      <span class="badge ${rc.badgeClass}">${rc.tag}</span>
                      <span style="font-size:0.75rem; color:var(--text-subtle);">${rc.level}</span>
                    </div>

                    <h3 style="font-size:1.1rem; font-weight:800; color:var(--text-main); margin-bottom:0.5rem; line-height:1.4;">
                      ${rc.title}
                    </h3>
                    
                    <div style="display:flex; align-items:center; gap:1rem; font-size:0.8125rem; color:var(--text-muted); margin-bottom:1rem;">
                      <span>📚 ${rc.lessonsCount} دروس عملية</span>
                      <span>⭐ 4.9 تقييم</span>
                    </div>
                  </div>

                  <div>
                    ${rc.progress > 0 ? `
                      <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted); margin-bottom:0.35rem;">
                        <span>نسبة الإنجاز</span>
                        <span class="number-font" style="color:var(--cyan); font-weight:700;">${rc.progress}%</span>
                      </div>
                      <div class="progress-container" style="margin-bottom:1rem;">
                        <div class="progress-bar-fill animated-progress-fill" data-progress="${rc.progress}" style="width: 0%;"></div>
                      </div>
                    ` : ''}

                    <a href="${rc.unitLink}" class="btn ${rc.progress > 0 ? 'btn-primary' : 'btn-outline'} btn-sm" style="width:100%;">
                      ${rc.progress > 0 ? 'متابعة الكورس' : 'ابدأ التعلم الآن 🚀'}
                    </a>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- 8. BOTTOM GRID: DAILY CHALLENGE & ANNOUNCEMENTS -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem;" class="dashboard-secondary-grid">
            
            <!-- Daily Code Challenge -->
            <div class="card card-glass" style="background:linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(6,182,212,0.12) 100%); border-color:var(--border-cyan); display:flex; flex-direction:column; justify-content:space-between;">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem;">
                  <span class="badge badge-cyan">⚡ تحدي اليوم السريع</span>
                  <span style="font-size:0.8125rem; color:var(--warning); font-weight:800;">+30 XP</span>
                </div>
                <h3 style="font-size:1.125rem; font-weight:800; margin-bottom:0.5rem; color:var(--text-main);">طباعة الأعداد الزوجية في بايثون</h3>
                <p style="font-size:0.875rem; color:var(--text-muted); line-height:1.6; margin-bottom:1.25rem;">
                  اكتب حلقة تكرار <code>for</code> تطبع الأعداد الزوجية من 2 إلى 10 باستخدام دالة <code>range(2, 11, 2)</code>.
                </p>
              </div>
              <a href="#practice" class="btn btn-outline btn-sm" style="align-self:flex-start;">
                افتح المحرر وجرب الحل 💻
              </a>
            </div>

            <!-- Platform Announcements -->
            <div class="card card-glass">
              <div class="card-header" style="margin-bottom:0.75rem;">
                <div class="card-title" style="font-size:1rem;">${Icons.bell()} إعلانات وتحديثات المنصة</div>
                <a href="#notifications" style="font-size:0.8125rem; color:var(--cyan); font-weight:700;">عرض الكل</a>
              </div>
              ${announcements.slice(0, 2).map(a => `
                <div style="padding:0.75rem 0; border-bottom:1px solid var(--border-subtle);">
                  <div style="font-weight:700; font-size:0.875rem; color:var(--text-main); margin-bottom:0.25rem;">${a.title}</div>
                  <div style="font-size:0.8125rem; color:var(--text-muted); line-height:1.5;">${a.content}</div>
                </div>
              `).join('')}
            </div>

          </div>

        </div>
      `;
    },

    initEvents() {
      // 1. Render weekly study activity bar chart
      setTimeout(() => {
        if (window.SparkCharts && window.SparkCharts.renderWeeklyBarChart) {
          SparkCharts.renderWeeklyBarChart('weekly-study-chart', [2.0, 1.5, 3.5, 1.0, 2.5, 2.5, 1.5]);
        }
      }, 50);

      // 2. Animate Progress Bars from 0 to real target value
      setTimeout(() => {
        const progressBars = document.querySelectorAll('.animated-progress-fill');
        progressBars.forEach(bar => {
          const target = bar.getAttribute('data-progress') || '0';
          bar.style.width = target + '%';
        });
      }, 80);

      // 3. Smooth counter animation
      setTimeout(() => {
        const counters = document.querySelectorAll('.counter-value');
        counters.forEach(counter => {
          const target = parseInt(counter.getAttribute('data-target') || counter.textContent, 10);
          if (isNaN(target) || target <= 0) return;
          
          let current = 0;
          const step = Math.max(1, Math.floor(target / 20));
          const interval = setInterval(() => {
            current += step;
            if (current >= target) {
              counter.textContent = target;
              clearInterval(interval);
            } else {
              counter.textContent = current;
            }
          }, 25);
        });
      }, 100);
    }
  };
})();
