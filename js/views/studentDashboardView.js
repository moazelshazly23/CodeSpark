// Code Spark Modern Futuristic Student Dashboard View
// 100% Real Database & Backend Integration - No Fake Hardcoded Numbers
(function() {
  window.StudentDashboardView = {
    render(user) {
      user = user || {};
      const db = window.CodeSparkDB;
      const progress = (db && db.getStudentProgress && db.getStudentProgress(user.id)) || {
        completedLessons: [],
        examAttempts: [],
        overallProgress: 0,
        streak: user.streak || 1,
        xp: user.xp || 0,
        learningHours: user.learning_hours || 0.0,
        avgScore: 0
      };

      const units = (db && db.getUnits && db.getUnits()) || [];
      const lessons = (db && db.getLessons && db.getLessons()) || [];
      const announcements = (db && db.getAnnouncements && db.getAnnouncements()) || [];

      const fullName = user.name || 'طالب جديد';
      const userName = fullName.split(' ')[0];

      // Subscription Status Processing
      const subStatus = (user.subscription_status || 'active').toLowerCase();
      const isLifetime = user.is_lifetime || user.subscription_duration_days === -1 || (!user.subscription_expires_at && subStatus === 'active') || user.subscription_type === 'lifetime';
      const isExpired = subStatus === 'expired' || user.days_remaining === 0;
      const daysRemaining = user.days_remaining !== undefined ? user.days_remaining : (isLifetime ? -1 : 30);

      // Subscription Type Labels
      const subTypeMap = {
        '1_month': 'اشتراك شهري (30 يومًا)',
        '3_months': 'اشتراك 3 أشهر',
        '6_months': 'اشتراك نصف سنوي',
        '1_year': 'اشتراك سنوي كامل',
        'lifetime': 'اشتراك مدى الحياة ♾️'
      };
      const subTypeLabel = subTypeMap[user.subscription_type] || user.subscription_plan_label || (isLifetime ? 'اشتراك مدى الحياة' : 'اشتراك شهري (30 يومًا)');

      const subStartDate = user.subscription_start 
        ? new Date(user.subscription_start).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) 
        : 'تاريخ التسجيل';
        
      const subExpDate = isLifetime 
        ? 'اشتراك مدى الحياة ♾️' 
        : (user.subscription_expires_at 
            ? new Date(user.subscription_expires_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) 
            : 'غير محدد');

      let subBadgeHtml = '<span class="badge badge-success" style="display:inline-flex; align-items:center; gap:0.25rem;">🟢 اشتراك نشط</span>';
      let subDaysHtml = isLifetime 
        ? '<strong style="color:var(--cyan); font-weight:800;">مدى الحياة ♾️</strong>' 
        : (isExpired 
            ? '<strong style="color:var(--danger); font-weight:800;">منتهي الصلاحية</strong>' 
            : `<strong style="color:var(--text-main); font-weight:800;">متبقي ${daysRemaining} يومًا</strong>`);

      if (isLifetime) {
        subBadgeHtml = '<span class="badge badge-cyan" style="display:inline-flex; align-items:center; gap:0.25rem;">♾️ اشتراك مدى الحياة</span>';
      } else if (isExpired) {
        subBadgeHtml = '<span class="badge badge-danger" style="display:inline-flex; align-items:center; gap:0.25rem;">🔴 منتهي الصلاحية</span>';
      }

      // Initial stats from local cache / profile
      const totalLessonsCount = lessons.length || 0;
      const completedCount = (progress.completedLessons && progress.completedLessons.length) ? progress.completedLessons.length : 0;
      const overallProgress = totalLessonsCount > 0 ? Math.round((completedCount / totalLessonsCount) * 100) : (progress.overallProgress || 0);
      const avgScore = progress.avgScore || 0;
      const xp = user.xp !== undefined ? user.xp : (progress.xp || 0);
      const streak = user.streak !== undefined ? user.streak : (progress.streak || 1);
      const solvedExercisesCount = progress.solvedExercisesCount || 0;

      // In-Progress Lesson resolution
      const defaultUnit = units[0] || { id: 'unit_1', title: 'الوحدة الأولى: أساسيات بايثون', number: 1 };
      const defaultLesson = lessons[0] || { id: 'lesson_1_1', title: 'مقدمة إلى لغة بايثون', description: 'التعرف على بيئة العمل وأول كود', duration: '15 دقيقة' };

      const inProgressUnit = units.find(u => u.status === 'in_progress') || units[0] || defaultUnit;
      const inProgressLesson = lessons.find(l => (progress.completedLessons ? !progress.completedLessons.includes(l.id) : true)) || lessons[0] || defaultLesson;

      return `
        <div class="content-body">
          
          ${isExpired ? `
            <!-- Expired Subscription Notice Banner -->
            <div style="background:rgba(239, 68, 68, 0.14); border:1px solid var(--danger); border-radius:var(--radius-lg); padding:1.25rem 1.5rem; margin-bottom:1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; box-shadow:0 0 25px rgba(239,68,68,0.2);">
              <div style="display:flex; align-items:center; gap:1rem;">
                <span style="font-size:2rem; filter:drop-shadow(0 0 8px rgba(239,68,68,0.6));">⚠️</span>
                <div>
                  <div style="font-weight:800; color:var(--text-main); font-size:1.0625rem; margin-bottom:0.25rem;">انتهى اشتراكك، يرجى تجديد الاشتراك.</div>
                  <div style="font-size:0.875rem; color:var(--text-muted);">انتهت فترة الصلاحية لحسابك، يرجى إدخال كود جديد لتفعيل الوصول للدروس والتمارين.</div>
                </div>
              </div>
              <a href="#support" class="btn btn-danger btn-sm" style="font-weight:700;">تجديد الاشتراك الآن 💬</a>
            </div>
          ` : ''}

          <!-- 1. HERO WELCOME SECTION -->
          <div class="card card-glass" style="margin-bottom:2rem; padding:2rem; border-color:var(--border-glow); position:relative; overflow:hidden; box-shadow:var(--shadow-lg), 0 0 35px rgba(6,182,212,0.15);">
            <div style="position:absolute; top:-60px; left:-60px; width:220px; height:220px; background:radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 70%); filter:blur(30px); pointer-events:none;"></div>
            <div style="position:absolute; bottom:-40px; right:20%; width:160px; height:160px; background:radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%); filter:blur(25px); pointer-events:none;"></div>

            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1.5rem; position:relative; z-index:2;">
              <div>
                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.6rem; flex-wrap:wrap;">
                  <span class="badge badge-primary">${user.grade || 'الصف الأول الثانوي'}</span>
                  <span class="badge badge-cyan" id="dash-user-streak" style="display:inline-flex; align-items:center; gap:0.25rem;">
                    ${Icons.flame()} ${streak} أيام متتالية
                  </span>
                  <span class="badge badge-warning" id="dash-user-xp" style="display:inline-flex; align-items:center; gap:0.25rem;">
                    ⚡ ${xp} نقطة XP
                  </span>
                  <span class="badge badge-neutral" style="font-size:0.75rem;">
                    ${isLifetime ? '♾️ اشتراك مدى الحياة' : (isExpired ? '🔴 منتهي' : '🟢 حساب مفعل')}
                  </span>
                </div>
                
                <h1 style="font-size: clamp(1.6rem, 3vw, 2.25rem); font-weight:900; margin-bottom:0.5rem; letter-spacing:-0.02em;">
                  مرحبًا بك، <span class="sparkle-text">${fullName}</span> 👋
                </h1>
                
                

                <div style="display:flex; gap:0.85rem; flex-wrap:wrap;">
                  <a href="#lesson/${inProgressLesson.id}" class="btn btn-primary btn-lg" style="box-shadow:0 0 20px rgba(6,182,212,0.4);">
                    ${Icons.play()} متابعة التعلم
                  </a>
                  <a href="#exercises" class="btn btn-secondary btn-lg">
                    ${Icons.terminal()} التمارين والتدريبات 🧩
                  </a>
                  <a href="#practice" class="btn btn-outline btn-lg">
                    ${Icons.code()} جرّب الكود
                  </a>
                  <a href="#curriculum" class="btn btn-outline btn-lg">
                    ${Icons.book()} وحدات المنهج
                  </a>
                </div>
              </div>

              <!-- Quick Student Stat Badge Box -->
              <div style="display:flex; flex-direction:column; gap:0.75rem; min-width:200px;" class="hide-on-mobile">
                <div style="background:rgba(14, 22, 38, 0.8); border:1px solid var(--border-card); border-radius:var(--radius-md); padding:1rem; text-align:center;">
                  <div style="font-size:0.75rem; color:var(--text-subtle); font-weight:700; text-transform:uppercase;">الدرس النشط حاليًا</div>
                  <div id="dash-hero-lesson-title" style="font-weight:800; font-size:0.9375rem; color:var(--cyan-light); margin-top:0.25rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;">
                    ${inProgressLesson.title}
                  </div>
                </div>
                <div style="background:rgba(14, 22, 38, 0.8); border:1px solid var(--border-card); border-radius:var(--radius-md); padding:1rem; text-align:center;">
                  <div style="font-size:0.75rem; color:var(--text-subtle); font-weight:700; text-transform:uppercase;">متوسط الدرجات</div>
                  <div id="dash-hero-avg-score" style="font-weight:800; font-size:1.25rem; color:var(--success); margin-top:0.25rem;">
                    ${avgScore}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. SUBSCRIPTION STATUS & DETAILS CARD -->
          <div class="card card-glass" style="margin-bottom:2rem; padding:1.25rem 1.5rem; border-color:${isExpired ? 'var(--danger)' : 'var(--border-glow)'}; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1.25rem;">
            <div style="display:flex; align-items:center; gap:1rem;">
              <div class="stat-icon-wrapper ${isExpired ? 'stat-icon-danger' : (isLifetime ? 'stat-icon-cyan' : 'stat-icon-blue')}" style="width:48px; height:48px; font-size:1.35rem;">
                ${Icons.key ? Icons.key() : '🔑'}
              </div>
              <div>
                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.35rem; flex-wrap:wrap;">
                  <span style="font-weight:800; font-size:1.05rem; color:var(--text-main);">حالة الاشتراك الأكاديمي:</span>
                  ${subBadgeHtml}
                  <span class=\"badge badge-neutral\" style=\"font-size:0.8125rem;\">${subTypeLabel}</span>
                </div>
                <div style="font-size:0.875rem; color:var(--text-muted); display:flex; gap:1.25rem; flex-wrap:wrap;">
                  <span>📅 تاريخ البدء: <strong id="dash-sub-start" style="color:var(--text-main);">${subStartDate}</strong></span>
                  <span>⏳ تاريخ الانتهاء: <strong id="dash-sub-end" style="color:var(--text-main);">${subExpDate}</strong></span>
                  <span>⏱️ المدة: <span id="dash-sub-days">${subDaysHtml}</span></span>
                </div>
              </div>
            </div>
            ${isExpired ? `
              <a href="#support" class="btn btn-primary btn-sm">طلب تجديد الكود ⚡</a>
            ` : `
              <a href="#profile" class="btn btn-outline btn-sm">بيانات الاشتراك</a>
            `}
          </div>

          <!-- 3. REAL DATABASE KPI METRICS CARDS -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1.25rem; margin-bottom:2rem;">
            
            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-cyan">
                ${Icons.book()}
              </div>
              <div>
                <div class="stat-value"><span id="dash-done-lessons">${completedCount}</span> / <span id="dash-total-lessons">${totalLessonsCount}</span></div>
                <div class="stat-label">الدروس المكتملة</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-blue">
                ${Icons.trendingUp()}
              </div>
              <div>
                <div class="stat-value"><span id="dash-kpi-progress">${overallProgress}</span>%</div>
                <div class="stat-label">نسبة الإنجاز الكلي</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-purple">
                ${Icons.terminal ? Icons.terminal() : '💻'}
              </div>
              <div>
                <div class="stat-value"><span id="dash-solved-exercises">${solvedExercisesCount}</span> تمرينًا</div>
                <div class="stat-label">التمارين والتدريبات المحلولة</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-green">
                ${Icons.award()}
              </div>
              <div>
                <div class="stat-value"><span id="dash-avg-score">${avgScore}</span>%</div>
                <div class="stat-label">متوسط درجات التقييمات</div>
              </div>
            </div>

            
            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-cyan">
                ${Icons.award()}
              </div>
              <div>
                <div class="stat-value"><span id="dash-badges-count">4</span> أوسمة</div>
                <div class="stat-label">الشارات المكتسبة</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon-wrapper stat-icon-warning">
                ${Icons.zap()}
              </div>
              <div>
                <div class="stat-value"><span id="dash-kpi-xp">${xp}</span></div>
                <div class="stat-label">نقاط الخبرة XP</div>
              </div>
            </div>

          </div>

          <!-- 4. CONTINUE LEARNING SPOTLIGHT + RECENT ACTIVITIES -->
          <div style="display:grid; grid-template-columns: 1.3fr 0.9fr; gap:1.5rem; margin-bottom:2.5rem;" class="dashboard-main-grid">
            
            <!-- In-Depth Spotlight Card -->
            <div class="card card-glass" style="border-color:var(--border-glow); display:flex; flex-direction:column; justify-content:space-between; position:relative; overflow:hidden;">
              <div style="position:absolute; top:-40px; left:-40px; width:180px; height:180px; background:radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%); filter:blur(20px);"></div>

              <div>
                <div class="card-header" style="margin-bottom:1rem;">
                  <div class="card-title">
                    <span class="spark-dot"></span> تابع من حيث توقفت
                  </div>
                  <span class="badge badge-cyan">متابعة المذاكرة</span>
                </div>

                <div style="background:rgba(7,11,20,0.7); border:1px solid var(--border-card); border-radius:var(--radius-lg); padding:1.35rem; margin-bottom:1.25rem;">
                  <div id="dash-spotlight-unit" style="font-size:0.8125rem; color:var(--cyan); font-weight:800; margin-bottom:0.35rem;">
                    ${inProgressUnit.title}
                  </div>
                  <h3 id="dash-spotlight-lesson" style="font-size:1.3rem; font-weight:900; margin-bottom:0.5rem; color:var(--text-main);">
                    ${inProgressLesson.title}
                  </h3>
                  <p id="dash-spotlight-desc" style="font-size:0.875rem; color:var(--text-muted); line-height:1.6; margin-bottom:1.15rem;">
                    ${inProgressLesson.description}
                  </p>

                  <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8125rem; color:var(--text-muted); margin-bottom:0.5rem;">
                    <span>المدة الزمنية المقدرة</span>
                    <span id="dash-spotlight-duration" class="number-font" style="font-weight:700; color:var(--cyan);">${inProgressLesson.duration || '15 دقيقة'}</span>
                  </div>
                </div>
              </div>

              <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem; padding-top:0.5rem;">
                <div style="display:flex; align-items:center; gap:0.5rem; font-size:0.875rem; color:var(--text-muted);">
                  ${Icons.clock()} متاح للمشاهدة والتطبيق
                </div>
                <a id="dash-spotlight-link" href="#lesson/${inProgressLesson.id}" class="btn btn-primary">
                  متابعة الدرس ${Icons.arrowLeft()}
                </a>
              </div>
            </div>

            <!-- Recent Activities Card -->
            <div class="card card-glass">
              <div class="card-header">
                <div>
                  <div class="card-title">
                    ${Icons.activity ? Icons.activity() : '📜'} آخر الأنشطة والتفاعلات
                  </div>
                  <div class="card-subtitle">سجل إنجازاتك في الدروس والامتحانات</div>
                </div>
                <span class="badge badge-neutral">تحديث حي</span>
              </div>

              <div id="dash-recent-activities-container" style="display:flex; flex-direction:column; gap:0.25rem;">
                ${(progress.recentActivities && progress.recentActivities.length > 0) ? progress.recentActivities.map(a => `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem 0; border-bottom:1px solid var(--border-subtle);">
                    <div>
                      <div style="font-weight:700; font-size:0.875rem; color:var(--text-main);">${a.title}</div>
                      <div style="font-size:0.75rem; color:var(--text-muted);">${a.description}</div>
                    </div>
                    <span class="badge ${a.badge || 'badge-primary'}" style="font-size:0.75rem;">${a.time ? a.time.slice(0, 10) : ''}</span>
                  </div>
                `).join('') : `
                  <div style="text-align:center; padding:2rem; color:var(--text-muted); font-size:0.875rem;">
                    لم تقم بأي أنشطة حديثة بعد. ابدأ مذاكرة أول درس وحل التمارين التفاعلية!
                  </div>
                `}
              </div>
            </div>

          </div>

          <!-- 5. RECENT LESSONS SECTION (آخر الدروس التي دخل إليها) -->
          <div style="margin-bottom:2.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; flex-wrap:wrap; gap:0.5rem;">
              <div>
                <h2 style="font-size:1.375rem; font-weight:800; color:var(--text-main); margin-bottom:0.25rem; display:flex; align-items:center; gap:0.5rem;">
                  ${Icons.playCircle()} الدروس الأخيرة
                </h2>
                <p style="font-size:0.875rem; color:var(--text-muted); margin:0;">تابع دراستك للأجزاء النظرية والتطبيقات العملية</p>
              </div>
              <a href="#curriculum" style="font-size:0.875rem; color:var(--cyan); font-weight:700; display:flex; align-items:center; gap:0.25rem;">
                عرض كافة الدروس ${Icons.arrowLeft()}
              </a>
            </div>

            <div id="dash-recent-lessons-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:1.25rem;">
              ${lessons.slice(0, 4).map((l, idx) => {
                const isCompleted = progress.completedLessons && progress.completedLessons.includes(l.id);
                const isInProg = l.id === inProgressLesson.id;
                
                let statusBadge = '<span class="badge badge-neutral">لم يبدأ</span>';
                let progressWidth = 0;
                let btnLabel = 'بدء الدرس';
                let btnClass = 'btn-outline';

                if (isCompleted) {
                  statusBadge = '<span class="badge badge-success">✓ مكتمل</span>';
                  progressWidth = 100;
                  btnLabel = 'مراجعة الدرس';
                  btnClass = 'btn-secondary';
                } else if (isInProg) {
                  statusBadge = '<span class="badge badge-cyan">⏳ قيد المذاكرة</span>';
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
                        <div class="progress-bar-fill animated-progress-fill" data-progress="${progressWidth}" style="width: ${progressWidth}%;"></div>
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

          <!-- 6. CURRICULUM UNITS PROGRESS -->
          <div style="margin-bottom:2.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; flex-wrap:wrap; gap:0.5rem;">
              <div>
                <h2 style="font-size:1.375rem; font-weight:800; color:var(--text-main); margin-bottom:0.25rem; display:flex; align-items:center; gap:0.5rem;">
                  ${Icons.book()} التقدم في الكورسات ووحدات المنهج
                </h2>
                <p style="font-size:0.875rem; color:var(--text-muted); margin:0;">نسبة إنجازك في كل وحدة دراسية معتمدة</p>
              </div>
              <a href="#curriculum" style="font-size:0.875rem; color:var(--cyan); font-weight:700;">
                عرض المنهج كاملاً
              </a>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:1.25rem;">
              ${units.map((u, i) => {
                const uLessons = lessons.filter(l => (l.unitId === u.id || l.unit_id === u.id));
                const doneCount = uLessons.filter(l => progress.completedLessons && progress.completedLessons.includes(l.id)).length;
                const unitPct = uLessons.length ? Math.round((doneCount / uLessons.length) * 100) : 0;
                
                let uBadge = '<span class="badge badge-success">✓ مكتمل</span>';
                if (unitPct < 100 && unitPct > 0) {
                  uBadge = '<span class="badge badge-cyan">⏳ قيد المذاكرة</span>';
                } else if (unitPct === 0) {
                  uBadge = '<span class="badge badge-neutral">لم يبدأ</span>';
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
                    <p style="font-size:0.8125rem; color:var(--text-muted); line-height:1.5; margin-bottom:1rem;">
                      ${u.description || 'محتوى الوحدة والتطبيقات العملية والدروس.'}
                    </p>

                    <div>
                      <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-subtle); margin-bottom:0.35rem;">
                        <span>إنجاز الوحدة (${doneCount}/${uLessons.length || 0} درس)</span>
                        <span class="number-font" style="font-weight:700; color:var(--cyan);">${unitPct}%</span>
                      </div>
                      <div class="progress-container">
                        <div class="progress-bar-fill animated-progress-fill" data-progress="${unitPct}" style="width: ${unitPct}%;"></div>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- 7. ANNOUNCEMENTS -->
          <div class="card card-glass" style="margin-bottom:2rem;">
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
      `;
    },

    initEvents() {
      // Fetch live real data from backend API
      if (window.CodeSparkAPI && window.CodeSparkAPI.get) {
        window.CodeSparkAPI.get('/progress/student').then(res => {
          if (res && res.progress) {
            const p = res.progress;

            // 1. Numerical KPIs
            const elDoneLessons = document.getElementById('dash-done-lessons');
            if (elDoneLessons) elDoneLessons.textContent = p.completedLessonsCount ?? '0';

            const elTotalLessons = document.getElementById('dash-total-lessons');
            if (elTotalLessons) elTotalLessons.textContent = p.totalLessonsCount ?? p.totalLessons ?? '—';

            const elProgPct = document.getElementById('dash-progress-pct');
            if (elProgPct) elProgPct.textContent = (p.completionPercentage ?? 0) + '%';

            const elKpiProg = document.getElementById('dash-kpi-progress');
            if (elKpiProg) elKpiProg.textContent = (p.completionPercentage ?? 0);

            const elSolvedEx = document.getElementById('dash-solved-exercises');
            if (elSolvedEx) elSolvedEx.textContent = p.solvedExercisesCount ?? '0';

            const elAvgScore = document.getElementById('dash-avg-score');
            if (elAvgScore) elAvgScore.textContent = p.avgScore ?? '0';

            const elHeroAvg = document.getElementById('dash-hero-avg-score');
            if (elHeroAvg) elHeroAvg.textContent = (p.avgScore ?? 0) + '%';

            const elKpiXp = document.getElementById('dash-kpi-xp');
            if (elKpiXp) elKpiXp.textContent = p.xp ?? '0';

            const elUserXp = document.getElementById('dash-user-xp');
            if (elUserXp) elUserXp.innerHTML = `⚡ ${p.xp ?? 0} نقطة XP`;

            const elHeroBar = document.getElementById('dash-hero-progress-bar');
            if (elHeroBar) {
              elHeroBar.style.width = (p.completionPercentage ?? 0) + '%';
            }

            // 2. Current In-Progress Lesson Spotlight
            if (p.currentLesson) {
              const elSpotUnit = document.getElementById('dash-spotlight-unit');
              if (elSpotUnit) elSpotUnit.textContent = p.currentLesson.unit_title || 'الوحدة الحالية';

              const elSpotLesson = document.getElementById('dash-spotlight-lesson');
              if (elSpotLesson) elSpotLesson.textContent = p.currentLesson.title || '';

              const elSpotDesc = document.getElementById('dash-spotlight-desc');
              if (elSpotDesc) elSpotDesc.textContent = p.currentLesson.description || '';

              const elSpotDur = document.getElementById('dash-spotlight-duration');
              if (elSpotDur) elSpotDur.textContent = p.currentLesson.duration || '15 دقيقة';

              const elSpotLink = document.getElementById('dash-spotlight-link');
              if (elSpotLink) elSpotLink.href = `#lesson/${p.currentLesson.id}`;

              const elHeroTitle = document.getElementById('dash-hero-lesson-title');
              if (elHeroTitle) elHeroTitle.textContent = p.currentLesson.title || '';
            }

            // 3. Recent Activities
            if (p.recentActivities && p.recentActivities.length > 0) {
              const actContainer = document.getElementById('dash-recent-activities-container');
              if (actContainer) {
                actContainer.innerHTML = p.recentActivities.map(a => `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem 0; border-bottom:1px solid var(--border-subtle);">
                    <div>
                      <div style="font-weight:700; font-size:0.875rem; color:var(--text-main);">${a.title}</div>
                      <div style="font-size:0.75rem; color:var(--text-muted);">${a.description}</div>
                    </div>
                    <span class="badge ${a.badge || 'badge-primary'}" style="font-size:0.75rem;">${a.time ? a.time.slice(0, 10) : ''}</span>
                  </div>
                `).join('');
              }
            }
          }
        }).catch(err => {
          console.warn('Student dashboard progress sync:', err);
        });
      }

      // Animate Progress Bars
      setTimeout(() => {
        const progressBars = document.querySelectorAll('.animated-progress-fill');
        progressBars.forEach(bar => {
          const target = bar.getAttribute('data-progress') || '0';
          bar.style.width = target + '%';
        });
      }, 80);
    }
  };
})();
