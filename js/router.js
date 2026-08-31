// Code Spark Client-Side Router & Navigation Controller - Futuristic UI/UX Edition
(function() {
  window.CodeSparkRouter = {
    currentRoute: '',
    
    init() {
      window.addEventListener('hashchange', () => this.handleRoute());
      this.initGlobalShortcuts();
      this.handleRoute();
    },

    initGlobalShortcuts() {
      if (typeof window === 'undefined' || typeof document === 'undefined') return;
      document.addEventListener('keydown', (e) => {
        // Ctrl+K or Cmd+K or Slash (when not in input/textarea) to open Search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          this.openSearchModal();
        } else if (e.key === '/' && document.activeElement && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          e.preventDefault();
          this.openSearchModal();
        } else if (e.key === 'Escape') {
          this.closeSearchModal();
        }
      });
    },

    getRoute() {
      const hash = window.location.hash || '#landing';
      const parts = hash.split('/');
      return {
        path: parts[0],
        param: parts[1] || null
      };
    },

    navigate(route) {
      window.location.hash = route;
    },

    async handleRoute() {
      const { path, param } = this.getRoute();
      this.currentRoute = path;
      const user = window.CodeSparkAuth ? window.CodeSparkAuth.getCurrentUser() : null;

      const appRoot = document.getElementById('app');
      if (!appRoot) return;

      // Update Body Mode Class & Viewport Scroll
      const isPublicRoute = (
        path === '#landing' || path === '' || path === '#' ||
        path === '#login' || path === '#register' ||
        path === '#forgot-password' || path === '#verify-otp' ||
        path === '#reset-password' || path === '#reset-password-success'
      );

      if (typeof document !== 'undefined' && document.body && document.body.classList) {
        document.body.classList.remove('admin-mode', 'assistant-mode', 'student-mode', 'public-mode');
        if (path.startsWith('#admin')) {
          document.body.classList.add('admin-mode');
        } else if (path.startsWith('#assistant')) {
          document.body.classList.add('assistant-mode', 'admin-mode');
        } else if (isPublicRoute) {
          document.body.classList.add('public-mode');
        } else {
          document.body.classList.add('student-mode');
        }
      }
      if (typeof window !== 'undefined' && window.scrollTo) {
        window.scrollTo(0, 0);
      }

      // Synchronize dynamic background engine with active route mode
      if (typeof window !== 'undefined' && window.CodeSparkBackground && window.CodeSparkBackground.updateState) {
        window.CodeSparkBackground.updateState();
      }

      // 1. Public Routes
      if (path === '#landing' || path === '' || path === '#') {
        appRoot.innerHTML = window.LandingView ? window.LandingView.render() : '';
        return;
      }
      if (path === '#resources' && !user) {
        let resData = [];
        let resCats = [];
        try {
          const fetched = await window.ResourceService.getResources();
          resData = fetched.resources || [];
          resCats = fetched.categories || [];
        } catch (e) {}
        appRoot.innerHTML = window.ResourcesView ? window.ResourcesView.render(resData, resCats, 'all', 'all', '') : '';
        if (window.ResourcesView && window.ResourcesView.initEvents) {
          window.ResourcesView.initEvents();
        }
        return;
      }
      if (path === '#login') {
        if (user) {
          const uRole = (user.role || '').toUpperCase();
          if (uRole === 'SUPER_ADMIN' || uRole === 'ADMIN') {
            this.navigate('#admin-dashboard');
          } else if (uRole === 'ASSISTANT') {
            this.navigate('#assistant-dashboard');
          } else {
            this.navigate('#dashboard');
          }
          return;
        }
        appRoot.innerHTML = window.AuthViews ? window.AuthViews.renderLogin() : '';
        if (window.AuthViews && window.AuthViews.initLoginEvents) {
          window.AuthViews.initLoginEvents();
        }
        return;
      }
      if (path === '#register') {
        if (user) {
          this.navigate('#dashboard');
          return;
        }
        appRoot.innerHTML = window.AuthViews ? window.AuthViews.renderRegister() : '';
        if (window.AuthViews && window.AuthViews.initRegisterEvents) {
          window.AuthViews.initRegisterEvents();
        }
        return;
      }
      if (path === '#forgot-password') {
        appRoot.innerHTML = window.AuthViews ? window.AuthViews.renderForgotPassword() : '';
        if (window.AuthViews && window.AuthViews.initForgotEvents) {
          window.AuthViews.initForgotEvents();
        }
        return;
      }
      if (path === '#verify-otp') {
        const resetState = window.CodeSparkAuth ? window.CodeSparkAuth.getResetState() : null;
        const email = (resetState && resetState.email) ? resetState.email : '';
        appRoot.innerHTML = window.AuthViews ? window.AuthViews.renderVerifyOtp(email) : '';
        if (window.AuthViews && window.AuthViews.initVerifyOtpEvents) {
          window.AuthViews.initVerifyOtpEvents(email);
        }
        return;
      }
      if (path === '#reset-password') {
        const resetState = window.CodeSparkAuth ? window.CodeSparkAuth.getResetState() : null;
        const resetToken = (resetState && resetState.resetToken) ? resetState.resetToken : '';
        appRoot.innerHTML = window.AuthViews ? window.AuthViews.renderResetPassword(resetToken) : '';
        if (window.AuthViews && window.AuthViews.initResetPasswordEvents) {
          window.AuthViews.initResetPasswordEvents(resetToken);
        }
        return;
      }
      if (path === '#reset-password-success') {
        appRoot.innerHTML = window.AuthViews ? window.AuthViews.renderResetPasswordSuccess() : '';
        if (window.AuthViews && window.AuthViews.initResetSuccessEvents) {
          window.AuthViews.initResetSuccessEvents();
        }
        return;
      }

      // 2. Auth Guard
      if (!user) {
        if (window.UI && window.UI.showToast) {
          window.UI.showToast('يرجى تسجيل الدخول للوصول إلى محتوى المنصة', 'warning');
        }
        this.navigate('#login');
        return;
      }

      // 3. Super Admin Routes Guard
      const userRole = (user.role || '').toUpperCase();
      const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
      const isAssistant = userRole === 'ASSISTANT';

      if (path.startsWith('#admin')) {
        if (!isSuperAdmin) {
          if (window.UI && window.UI.showToast) {
            window.UI.showToast(isAssistant ? 'عذرًا، لوحة التحكم الرئيسية مخصصة للمشرف العام فقط' : 'عذرًا، هذه الصفحة مخصصة للمشرفين فقط', 'error');
          }
          this.navigate(isAssistant ? '#assistant-dashboard' : '#dashboard');
          return;
        }
        await this.renderAdminLayout(path, param, user, appRoot);
        return;
      }

      // 4. Assistant Routes Guard & Layout
      if (path.startsWith('#assistant')) {
        if (!isSuperAdmin && !isAssistant) {
          if (window.UI && window.UI.showToast) {
            window.UI.showToast('عذرًا، هذه الصفحة مخصصة للمساعدين والإدارة فقط', 'error');
          }
          this.navigate('#dashboard');
          return;
        }
        await this.renderAssistantLayout(path, param, user, appRoot);
        return;
      }

      // 5. Student Application Layout (Immediate rendering + background sync)
      await this.renderStudentLayout(path, param, user, appRoot);
    },

    async renderStudentLayout(path, param, user, container) {
      const notifs = window.CodeSparkDB ? window.CodeSparkDB.getNotifications(user.id) : [];
      const unreadCount = notifs.filter(n => !n.read).length;
      const soundEnabled = window.SoundManager ? window.SoundManager.isEnabled() : true;

      let mainViewHtml = '';
      let initCallback = () => {};

      switch (path) {
        case '#dashboard':
          mainViewHtml = window.StudentDashboardView ? window.StudentDashboardView.render(user) : '';
          initCallback = () => window.StudentDashboardView && window.StudentDashboardView.initEvents && window.StudentDashboardView.initEvents();
          break;
        case '#curriculum':
          mainViewHtml = window.CurriculumView ? window.CurriculumView.render(user) : '';
          break;
        case '#unit':
          mainViewHtml = window.UnitDetailsView ? window.UnitDetailsView.render(param, user) : '';
          break;
        case '#lesson':
          mainViewHtml = window.LessonView ? window.LessonView.render(param, user) : '';
          initCallback = () => window.LessonView && window.LessonView.initEvents && window.LessonView.initEvents(param, user);
          break;
        case '#practice':
          mainViewHtml = window.PracticeView ? window.PracticeView.render(user) : '';
          initCallback = () => window.PracticeView && window.PracticeView.initEvents && window.PracticeView.initEvents();
          break;
        case '#exercises':
          mainViewHtml = window.ExercisesView ? window.ExercisesView.render(user) : '';
          break;
        case '#exam':
          mainViewHtml = window.ExamView ? window.ExamView.render(param, user) : '';
          initCallback = () => window.ExamView && window.ExamView.initEvents && window.ExamView.initEvents(param, user);
          break;
        case '#exam-result':
          mainViewHtml = window.ExamResultView ? window.ExamResultView.render(param, user) : '';
          initCallback = () => window.ExamResultView && window.ExamResultView.initEvents && window.ExamResultView.initEvents();
          break;
        case '#progress':
          mainViewHtml = window.ProgressView ? window.ProgressView.render(user) : '';
          initCallback = () => window.ProgressView && window.ProgressView.initEvents && window.ProgressView.initEvents(user);
          break;
        case '#profile':
          mainViewHtml = window.ProfileView ? window.ProfileView.render(user) : '';
          initCallback = () => window.ProfileView && window.ProfileView.initEvents && window.ProfileView.initEvents(user);
          break;
        case '#notifications':
          mainViewHtml = window.NotificationsView ? window.NotificationsView.render(user) : '';
          initCallback = () => window.NotificationsView && window.NotificationsView.initEvents && window.NotificationsView.initEvents(user);
          break;
        case '#settings':
          mainViewHtml = window.SettingsView ? window.SettingsView.render(user) : '';
          initCallback = () => window.SettingsView && window.SettingsView.initEvents && window.SettingsView.initEvents();
          break;
        case '#support':
          mainViewHtml = window.SupportView ? window.SupportView.render(user) : '';
          initCallback = () => window.SupportView && window.SupportView.initEvents && window.SupportView.initEvents(user);
          break;
        case '#support':
          mainViewHtml = window.SupportView ? window.SupportView.render(user) : '';
          initCallback = () => window.SupportView && window.SupportView.initEvents && window.SupportView.initEvents(user);
          break;
        case '#resources':
          let resData = [];
          let resCats = [];
          try {
            const fetched = await window.ResourceService.getResources();
            resData = fetched.resources || [];
            resCats = fetched.categories || [];
          } catch (e) {}
          mainViewHtml = window.ResourcesView ? window.ResourcesView.render(resData, resCats, 'all', 'all', '') : '';
          initCallback = () => window.ResourcesView && window.ResourcesView.initEvents && window.ResourcesView.initEvents();
          break;
        case '#bookmarks':
          mainViewHtml = window.BookmarksView ? await window.BookmarksView.render(user) : '';
          initCallback = () => window.BookmarksView && window.BookmarksView.initEvents && window.BookmarksView.initEvents();
          break;
        default:
          mainViewHtml = window.StudentDashboardView ? window.StudentDashboardView.render(user) : '';
          initCallback = () => window.StudentDashboardView && window.StudentDashboardView.initEvents && window.StudentDashboardView.initEvents();
      }

      // Subscription Access Guard: Block paid educational content if subscription expired
      const isExpired = user && user.role !== 'admin' && (user.subscription_status === 'expired' || user.days_remaining === 0);
      const isPaidRoute = ['#lesson', '#exam', '#practice', '#exercises'].includes(path);
      if (isExpired && isPaidRoute) {
        mainViewHtml = `
          <div class="content-body" style="display:flex; align-items:center; justify-content:center; min-height:60vh; padding:2rem 1rem;">
            <div class="card card-glass" style="max-width:540px; width:100%; text-align:center; padding:3rem 2rem; border-color:var(--danger); box-shadow:var(--shadow-lg), 0 0 30px rgba(239,68,68,0.25);">
              <div style="font-size:3.5rem; margin-bottom:1rem; filter:drop-shadow(0 0 10px rgba(239,68,68,0.5));">⏳</div>
              <div class="badge badge-danger" style="margin-bottom:0.75rem; font-size:0.875rem;">انتهت فترة الاشتراك</div>
              <h2 style="font-size:1.5rem; font-weight:800; color:var(--text-main); margin-bottom:0.75rem;">انتهى اشتراكك، يرجى تجديد الاشتراك.</h2>
              <p style="color:var(--text-muted); font-size:0.9375rem; line-height:1.7; margin-bottom:1.75rem;">
                انتهت فترة صلاحية حسابك الأكاديمي على منصة Code Spark. يرجى تجديد الاشتراك للاستمرار في مشاهدة الدروس وحل التدريبات والاختبارات.
              </p>
              <div style="display:flex; justify-content:center; gap:0.75rem; flex-wrap:wrap;">
                <a href="#support" class="btn btn-primary">${Icons.helpCircle()} تواصل مع الدعم الفني للتجديد</a>
                <a href="#dashboard" class="btn btn-secondary">العودة للوحة التحكم</a>
              </div>
            </div>
          </div>
        `;
        initCallback = () => {};
      }

      container.innerHTML = `
        <div class="app-container">
          <div class="sidebar-backdrop" id="sidebar-backdrop"></div>

          <!-- Student Sidebar (Fixed, Organized & Fully Functional) -->
          <aside class="app-sidebar" id="app-sidebar">
            <div class="sidebar-header">
              <a href="#dashboard" style="display:flex; align-items:center; gap:0.5rem;">
                <img src="assets/logos/logo-dark.svg" alt="Code Spark" style="height:32px;">
              </a>
              <button class="btn btn-ghost btn-icon-sm hide-on-desktop" id="close-sidebar-btn">${Icons.x()}</button>
            </div>

            <nav class="sidebar-nav">
              <div class="sidebar-section-title">التعلّم والبرمجة</div>
              
              <!-- 1. 🏠 الرئيسية -->
              <a href="#dashboard" class="nav-link ${path === '#dashboard' ? 'active' : ''}">
                <span class="nav-icon">${Icons.home()}</span> الرئيسية
              </a>

              <!-- 2. 📚 الكورسات -->
              <a href="#curriculum" class="nav-link ${path === '#curriculum' || path === '#unit' ? 'active' : ''}">
                <span class="nav-icon">${Icons.book()}</span> الكورسات والوحدات
              </a>

              <!-- 3. 🧭 المسارات -->
              <a href="#curriculum" class="nav-link">
                <span class="nav-icon">${Icons.compass ? Icons.compass() : Icons.sparkles()}</span> المسارات التعليمية
              </a>

              <!-- 4. 💻 التمارين -->
              <a href="#exercises" class="nav-link ${path === '#exercises' ? 'active' : ''}">
                <span class="nav-icon">${Icons.terminal()}</span> التمارين والتدريبات
              </a>

              <!-- 5. 📝 محرر بايثون التفاعلي -->
              <a href="#practice" class="nav-link ${path === '#practice' ? 'active' : ''}">
                <span class="nav-icon">${Icons.code()}</span> محرر بايثون
              </a>

              <!-- 5b. 📚 الملفات التعليمية PDF -->
              <a href="#resources" class="nav-link ${path === '#resources' ? 'active' : ''}">
                <span class="nav-icon">${Icons.fileText ? Icons.fileText() : '📄'}</span> الملفات التعليمية 📄
              </a>

              <div class="sidebar-section-title">التقييم والمجتمع</div>

              <!-- 6. 📝 الاختبارات و 7. 🎓 الامتحانات -->
              <a href="#progress" class="nav-link ${path === '#progress' || path === '#exam' || path === '#exam-result' ? 'active' : ''}">
                <span class="nav-icon">${Icons.award()}</span> الامتحانات والشارات
              </a>

              <!-- 8. 👥 المجتمع والتنبيهات -->
              <a href="#notifications" class="nav-link ${path === '#notifications' ? 'active' : ''}">
                <span class="nav-icon">${Icons.bell()}</span> المجتمع والتنبيهات
                ${unreadCount > 0 ? `<span class="badge badge-cyan" style="font-size:0.7rem; padding:0.15rem 0.45rem;">${unreadCount}</span>` : ''}
              </a>

              <!-- ⭐ المفضلة والمحفوظات -->
              <a href="#bookmarks" class="nav-link ${path === '#bookmarks' ? 'active' : ''}">
                <span class="nav-icon">⭐</span> المفضلة والمحفوظات
              </a>


              <div class="sidebar-section-title">الحساب والمساعدة</div>

              <!-- 9. ❓ الدعم -->
              <a href="#support" class="nav-link ${path === '#support' ? 'active' : ''}">
                <span class="nav-icon">${Icons.helpCircle()}</span> الدعم الأكاديمي
              </a>

              <!-- 10. ⚙️ الإعدادات -->
              <a href="#settings" class="nav-link ${path === '#settings' ? 'active' : ''}">
                <span class="nav-icon">${Icons.settings()}</span> الإعدادات
              </a>

              <!-- 👤 الملف الشخصي -->
              <a href="#profile" class="nav-link ${path === '#profile' ? 'active' : ''}">
                <span class="nav-icon">${Icons.user()}</span> الملف الشخصي
              </a>
            </nav>

            <div class="sidebar-footer">
              <div class="user-mini-profile">
                <div class="user-avatar">${user.avatar || 'ط'}</div>
                <div class="user-meta">
                  <div class="user-name">${user.name}</div>
                  <div class="user-role">${user.grade || 'الصف الأول الثانوي'}</div>
                </div>
                <button id="sidebar-logout-btn" class="btn btn-ghost btn-icon-sm" title="تسجيل الخروج" style="color:var(--text-subtle);">
                  ${Icons.logOut()}
                </button>
              </div>
            </div>
          </aside>

          <!-- Main Content Area -->
          <div class="main-content">
            <!-- Modern Futuristic Topbar with Live Search & Controls -->
            <header class="dashboard-topbar">
              <div style="display:flex; align-items:center; gap:1rem; flex:1;">
                <button class="btn btn-ghost btn-icon" id="open-sidebar-btn" title="القائمة">
                  ${Icons.menu()}
                </button>

                <!-- Live Search Trigger Bar -->
                <div id="search-trigger-box" class="search-trigger-box" title="بحث سريع (Ctrl + K)">
                  ${Icons.search('text-cyan')}
                  <span style="font-size:0.875rem; color:var(--text-muted); flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">ابحث عن درس، وحدة، أو كود بايثون...</span>
                  <span class="hide-on-mobile" style="font-size:0.75rem; background:rgba(255,255,255,0.08); border:1px solid var(--border-subtle); padding:0.15rem 0.45rem; border-radius:4px; font-family:monospace; color:var(--text-subtle);">Ctrl K</span>
                </div>
              </div>

              <!-- Topbar Right Actions -->
              <div style="display:flex; align-items:center; gap:0.75rem;">
                
                <!-- UI Click Sound Toggle Button -->
                <button id="topbar-sound-btn" class="btn btn-ghost btn-icon-sm sound-toggle-btn" title="${soundEnabled ? 'صوت النقر مفعّل (اضغط للكتم)' : 'صوت النقر مكتوم (اضغط للتشغيل)'}">
                  <span style="font-size:1.15rem;">${soundEnabled ? '🔊' : '🔇'}</span>
                </button>

                <!-- Streak Flame Badge -->
                <div class="badge badge-cyan hide-on-mobile" style="display:flex; align-items:center; gap:0.35rem; font-weight:700; padding:0.35rem 0.75rem;">
                  ${Icons.flame()} ${user.streak || 5} أيام
                </div>

                <!-- Notifications Bell -->
                <a href="#notifications" class="btn btn-ghost btn-icon" style="position:relative;" title="الإشعارات">
                  ${Icons.bell()}
                  ${unreadCount > 0 ? `<span style="position:absolute; top:8px; left:8px; width:8px; height:8px; border-radius:50%; background:var(--cyan); box-shadow:0 0 8px var(--cyan);"></span>` : ''}
                </a>

                <!-- User Avatar Quick Link -->
                <a href="#profile" style="display:flex; align-items:center; gap:0.5rem; text-decoration:none;" title="الملف الشخصي (${user.name})">
                  <div class="user-avatar" style="width:38px; height:38px; font-size:0.875rem;">${user.avatar || 'ط'}</div>
                </a>
              </div>
            </header>

            <!-- Dynamic View Body -->
            <main>
              ${mainViewHtml}
            </main>
          </div>

          <!-- Mobile Bottom Navigation -->
          <nav class="mobile-bottom-nav">
            <a href="#dashboard" class="bottom-nav-item ${path === '#dashboard' ? 'active' : ''}">
              ${Icons.home()}
              <span>الرئيسية</span>
            </a>
            <a href="#curriculum" class="bottom-nav-item ${path === '#curriculum' || path === '#unit' ? 'active' : ''}">
              ${Icons.book()}
              <span>المنهج</span>
            </a>
            <a href="#practice" class="bottom-nav-item ${path === '#practice' ? 'active' : ''}">
              ${Icons.code()}
              <span>المحرر</span>
            </a>
            <a href="#progress" class="bottom-nav-item ${path === '#progress' ? 'active' : ''}">
              ${Icons.trendingUp()}
              <span>الإنجاز</span>
            </a>
            <a href="#profile" class="bottom-nav-item ${path === '#profile' ? 'active' : ''}">
              ${Icons.user()}
              <span>حسابي</span>
            </a>
          </nav>

          <!-- Live Global Search Modal Overlay -->
          <div id="global-search-modal" class="modal-overlay">
            <div class="search-modal-container">
              <div class="search-modal-header">
                ${Icons.search('text-cyan')}
                <input type="text" id="global-search-input" class="search-modal-input" placeholder="ابحث في الدروس، الوحدات، التدريبات وأكواد بايثون..." autocomplete="off">
                <button id="close-search-btn" class="btn btn-ghost btn-icon-sm" title="إغلاق">${Icons.x()}</button>
              </div>
              <div id="global-search-results" class="search-results-list">
                <div style="padding:1.5rem; text-align:center; color:var(--text-muted); font-size:0.875rem;">
                  اكتب أي كلمة للبحث في محتوى المنهج، الدروس والتمارين...
                </div>
              </div>
            </div>
          </div>

        </div>
      `;

      this.initCommonEvents();
      this.initSearchEvents();
      initCallback();

      // Trigger non-blocking background sync without holding page rendering
      if (window.CodeSparkDB && window.CodeSparkDB.syncAll) {
        window.CodeSparkDB.syncAll().then(() => {
          this.refreshCurrentViewIfNeeded(path, param, user);
        }).catch(err => {
          console.warn('Background sync warning:', err);
        });
      }
    },

    openSearchModal() {
      const modal = document.getElementById('global-search-modal');
      const input = document.getElementById('global-search-input');
      if (modal) {
        modal.classList.add('active');
        setTimeout(() => {
          if (input) input.focus();
        }, 50);
      }
    },

    closeSearchModal() {
      const modal = document.getElementById('global-search-modal');
      if (modal) modal.classList.remove('active');
    },

    initSearchEvents() {
      const trigger = document.getElementById('search-trigger-box');
      const modal = document.getElementById('global-search-modal');
      const closeBtn = document.getElementById('close-search-btn');
      const input = document.getElementById('global-search-input');
      const resultsContainer = document.getElementById('global-search-results');

      trigger?.addEventListener('click', () => this.openSearchModal());
      closeBtn?.addEventListener('click', () => this.closeSearchModal());
      modal?.addEventListener('click', (e) => {
        if (e.target === modal) this.closeSearchModal();
      });

      if (input && resultsContainer) {
        input.addEventListener('input', (e) => {
          const query = e.target.value.trim().toLowerCase();
          if (!query) {
            resultsContainer.innerHTML = `
              <div style="padding:1.5rem; text-align:center; color:var(--text-muted); font-size:0.875rem;">
                اكتب أي كلمة للبحث في محتوى المنهج، الدروس والتمارين...
              </div>
            `;
            return;
          }

          const units = (window.CodeSparkDB && window.CodeSparkDB.getUnits()) || [];
          const lessons = (window.CodeSparkDB && window.CodeSparkDB.getLessons()) || [];
          const exercises = lessons.filter(l => l.exercise);

          const matches = [];

          // 1. Lessons match
          lessons.forEach(l => {
            if ((l.title && l.title.toLowerCase().includes(query)) || (l.description && l.description.toLowerCase().includes(query))) {
              matches.push({
                type: 'درس',
                badge: 'badge-primary',
                title: l.title,
                sub: l.description,
                link: `#lesson/${l.id}`
              });
            }
          });

          // 2. Units match
          units.forEach(u => {
            if ((u.title && u.title.toLowerCase().includes(query)) || (u.description && u.description.toLowerCase().includes(query))) {
              matches.push({
                type: 'وحدة',
                badge: 'badge-cyan',
                title: u.title,
                sub: u.description,
                link: `#unit/${u.id}`
              });
            }
          });

          // 3. Exercises match
          exercises.forEach(e => {
            if (e.exercise && ((e.exercise.title && e.exercise.title.toLowerCase().includes(query)) || (e.exercise.instruction && e.exercise.instruction.toLowerCase().includes(query)))) {
              matches.push({
                type: 'تدريب',
                badge: 'badge-purple',
                title: e.exercise.title,
                sub: e.exercise.instruction,
                link: `#lesson/${e.id}`
              });
            }
          });

          // 4. Python Keywords match
          const pyKeywords = [
            { k: 'print', title: 'دالة الطباعة print()', sub: 'عرض النصوص والمتغيرات في شاشة المخرجات', link: '#practice' },
            { k: 'input', title: 'دالة الإدخال input()', sub: 'استقبال البيانات من المستخدم أثناء التشغيل', link: '#practice' },
            { k: 'if', title: 'الجمل الشرطية if/elif/else', sub: 'اتخاذ القرارات والتحقق من الشروط', link: '#practice' },
            { k: 'for', title: 'حلقات التكرار for loop', sub: 'تكرار الأوامر باستخدام range والقوائم', link: '#practice' },
            { k: 'range', title: 'دالة نطاق الأعداد range()', sub: 'توليد متتاليات عددية للحلقات التكرارية', link: '#practice' },
            { k: 'list', title: 'القوائم في بايثون Lists', sub: 'تخزين مجموعة من العناصر في متغير واحد', link: '#practice' }
          ];

          pyKeywords.forEach(pk => {
            if (pk.k.includes(query) || pk.title.toLowerCase().includes(query) || pk.sub.toLowerCase().includes(query)) {
              matches.push({
                type: 'بايثون',
                badge: 'badge-warning',
                title: pk.title,
                sub: pk.sub,
                link: pk.link
              });
            }
          });

          if (matches.length === 0) {
            resultsContainer.innerHTML = `
              <div style="padding:2rem; text-align:center; color:var(--text-muted);">
                <div style="font-size:1.5rem; margin-bottom:0.5rem;">🔍</div>
                <div style="font-weight:700; color:var(--text-main); margin-bottom:0.25rem;">لا توجد نتائج مطابقة لبحثك</div>
                <div style="font-size:0.8125rem;">جرب البحث بكلمات أخرى مثل "بايثون"، "شروط"، "الوحدة الأولى"...</div>
              </div>
            `;
            return;
          }

          resultsContainer.innerHTML = matches.slice(0, 8).map(m => `
            <a href="${m.link}" class="search-result-item" onclick="window.CodeSparkRouter.closeSearchModal()">
              <div>
                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
                  <span class="badge ${m.badge}" style="font-size:0.7rem;">${m.type}</span>
                  <span style="font-weight:700; font-size:0.9375rem; color:var(--text-main);">${m.title}</span>
                </div>
                <div style="font-size:0.8125rem; color:var(--text-muted); line-height:1.4;">${(m.sub || '').substring(0, 90)}...</div>
              </div>
              <span style="color:var(--cyan); font-size:0.875rem; font-weight:700;">الانتقال →</span>
            </a>
          `).join('');
        });
      }
    },

    refreshCurrentViewIfNeeded(path, param, user) {
      if (this.currentRoute !== path) return;
      const mainContainer = document.querySelector('.app-container .main-content main');
      if (!mainContainer) return;

      // Update fresh notification counts
      const notifs = window.CodeSparkDB ? window.CodeSparkDB.getNotifications(user.id) : [];
      const unreadCount = notifs.filter(n => !n.read).length;
      document.querySelectorAll('.nav-link[href="#notifications"] .badge-cyan').forEach(b => {
        if (unreadCount > 0) {
          b.textContent = unreadCount;
          b.style.display = 'inline-block';
        } else {
          b.style.display = 'none';
        }
      });

      // Update fresh dashboard, curriculum, or progress overview seamlessly
      if (path === '#dashboard' && window.StudentDashboardView) {
        const freshUser = window.CodeSparkAuth ? window.CodeSparkAuth.getCurrentUser() : user;
        mainContainer.innerHTML = window.StudentDashboardView.render(freshUser || user);
        if (window.StudentDashboardView.initEvents) {
          window.StudentDashboardView.initEvents();
        }
      } else if (path === '#curriculum' && window.CurriculumView) {
        const freshUser = window.CodeSparkAuth ? window.CodeSparkAuth.getCurrentUser() : user;
        mainContainer.innerHTML = window.CurriculumView.render(freshUser || user);
      } else if (path === '#progress' && window.ProgressView) {
        const freshUser = window.CodeSparkAuth ? window.CodeSparkAuth.getCurrentUser() : user;
        mainContainer.innerHTML = window.ProgressView.render(freshUser || user);
        if (window.ProgressView.initEvents) {
          window.ProgressView.initEvents(freshUser || user);
        }
      }
    },

    async renderAdminLayout(path, param, user, container) {
      let adminHtml = '';
      let initCallback = () => {};

      switch (path) {
        case '#admin-dashboard':
          adminHtml = window.AdminViews && window.AdminViews.renderDashboard ? await window.AdminViews.renderDashboard(user) : '';
          initCallback = () => window.AdminViews && window.AdminViews.initDashboardEvents && window.AdminViews.initDashboardEvents();
          break;
        case '#admin-students':
          adminHtml = window.AdminViews && window.AdminViews.renderStudents ? await window.AdminViews.renderStudents() : '';
          initCallback = () => window.AdminViews && window.AdminViews.initStudentsEvents && window.AdminViews.initStudentsEvents();
          break;
        case '#admin-assistants':
          adminHtml = window.AdminViews && window.AdminViews.renderAssistants ? await window.AdminViews.renderAssistants() : '';
          initCallback = () => window.AdminViews && window.AdminViews.initAssistantsEvents && window.AdminViews.initAssistantsEvents();
          break;
        case '#admin-activity-log':
          adminHtml = window.AdminViews && window.AdminViews.renderActivityLogs ? await window.AdminViews.renderActivityLogs() : '';
          initCallback = () => window.AdminViews && window.AdminViews.initActivityLogsEvents && window.AdminViews.initActivityLogsEvents();
          break;
        case '#admin-subscriptions':
          adminHtml = window.AdminViews && window.AdminViews.renderSubscriptions ? await window.AdminViews.renderSubscriptions() : '';
          initCallback = () => window.AdminViews && window.AdminViews.initSubscriptionsEvents && window.AdminViews.initSubscriptionsEvents();
          break;
        case '#admin-resources':
          adminHtml = window.AdminViews && window.AdminViews.renderResources ? await window.AdminViews.renderResources(user) : '';
          initCallback = () => window.AdminViews && window.AdminViews.initResourcesEvents && window.AdminViews.initResourcesEvents();
          break;
        case '#admin-curriculum':
          adminHtml = window.AdminViews && window.AdminViews.renderCurriculum ? await window.AdminViews.renderCurriculum() : '';
          initCallback = () => window.AdminViews && window.AdminViews.initCurriculumEvents && window.AdminViews.initCurriculumEvents();
          break;
        case '#admin-questions':
          adminHtml = window.AdminViews && window.AdminViews.renderQuestions ? await window.AdminViews.renderQuestions() : '';
          initCallback = () => window.AdminViews && window.AdminViews.initQuestionsEvents && window.AdminViews.initQuestionsEvents();
          break;
        case '#admin-exams':
          adminHtml = window.AdminViews && window.AdminViews.renderExams ? await window.AdminViews.renderExams() : '';
          initCallback = () => window.AdminViews && window.AdminViews.initExamsEvents && window.AdminViews.initExamsEvents();
          break;
        case '#admin-results':
          adminHtml = window.AdminViews && window.AdminViews.renderResults ? await window.AdminViews.renderResults() : '';
          initCallback = () => window.AdminViews && window.AdminViews.initResultsEvents && window.AdminViews.initResultsEvents();
          break;
        case '#admin-announcements':
          adminHtml = window.AdminViews && window.AdminViews.renderAnnouncements ? await window.AdminViews.renderAnnouncements() : '';
          initCallback = () => window.AdminViews && window.AdminViews.initAnnouncementsEvents && window.AdminViews.initAnnouncementsEvents();
          break;
        case '#admin-support':
          adminHtml = window.AdminViews && window.AdminViews.renderSupport ? await window.AdminViews.renderSupport() : '';
          initCallback = () => window.AdminViews && window.AdminViews.initSupportEvents && window.AdminViews.initSupportEvents();
          break;
        case '#admin-settings':
          adminHtml = window.AdminViews && window.AdminViews.renderSettings ? await window.AdminViews.renderSettings(user) : '';
          initCallback = () => window.AdminViews && window.AdminViews.initSettingsEvents && window.AdminViews.initSettingsEvents(user);
          break;
        default:
          adminHtml = window.AdminViews && window.AdminViews.renderDashboard ? await window.AdminViews.renderDashboard(user) : '';
          initCallback = () => window.AdminViews && window.AdminViews.initDashboardEvents && window.AdminViews.initDashboardEvents();
      }

      container.innerHTML = `
        <div class="app-container">
          <div class="sidebar-backdrop" id="sidebar-backdrop"></div>

          <!-- Admin Sidebar -->
          <aside class="app-sidebar" id="app-sidebar">
            <div class="sidebar-header">
              <a href="#admin-dashboard" style="display:flex; align-items:center; gap:0.5rem;">
                <img src="assets/logos/logo-dark.svg" alt="Code Spark Admin" style="height:32px;">
              </a>
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <span class="badge badge-danger" style="font-size:0.65rem;">ADMIN</span>
                <button class="btn btn-ghost btn-icon-sm hide-on-desktop" id="close-sidebar-btn">${Icons.x()}</button>
              </div>
            </div>

            <nav class="sidebar-nav">
              <div class="sidebar-section-title">لوحة التحكم الأكاديمية</div>
              <a href="#admin-dashboard" class="nav-link ${path === '#admin-dashboard' ? 'active' : ''}">
                <span class="nav-icon">${Icons.home()}</span> الإحصائيات العامة
              </a>
              <a href="#admin-students" class="nav-link ${path === '#admin-students' ? 'active' : ''}">
                <span class="nav-icon">${Icons.users()}</span> شؤون الطلاب
              </a>
              <a href="#admin-assistants" class="nav-link ${path === '#admin-assistants' ? 'active' : ''}">
                <span class="nav-icon">${Icons.users ? Icons.users() : '👥'}</span> إدارة المساعدين
              </a>
              <a href="#admin-activity-log" class="nav-link ${path === '#admin-activity-log' ? 'active' : ''}">
                <span class="nav-icon">${Icons.activity ? Icons.activity() : '📜'}</span> سجل النشاطات
              </a>
              <a href="#admin-subscriptions" class="nav-link ${path === '#admin-subscriptions' ? 'active' : ''}">
                <span class="nav-icon">${Icons.key ? Icons.key() : '🔑'}</span> إدارة الاشتراكات
              </a>
              <a href="#admin-resources" class="nav-link ${path === '#admin-resources' ? 'active' : ''}">
                <span class="nav-icon">${Icons.fileText ? Icons.fileText() : '📄'}</span> الملفات التعليمية (PDF)
              </a>
              <a href="#admin-curriculum" class="nav-link ${path === '#admin-curriculum' ? 'active' : ''}">
                <span class="nav-icon">${Icons.book()}</span> المنهج والدروس
              </a>
              <a href="#admin-questions" class="nav-link ${path === '#admin-questions' ? 'active' : ''}">
                <span class="nav-icon">${Icons.helpCircle()}</span> بنك الأسئلة
              </a>
              <a href="#admin-exams" class="nav-link ${path === '#admin-exams' ? 'active' : ''}">
                <span class="nav-icon">${Icons.award()}</span> إدارة الاختبارات
              </a>
              <a href="#admin-results" class="nav-link ${path === '#admin-results' ? 'active' : ''}">
                <span class="nav-icon">${Icons.trendingUp()}</span> نتائج وتقييمات الطلاب
              </a>
              <a href="#admin-announcements" class="nav-link ${path === '#admin-announcements' ? 'active' : ''}">
                <span class="nav-icon">${Icons.bell()}</span> الإعلانات والتنبيهات
              </a>
              <a href="#admin-support" class="nav-link ${path === '#admin-support' ? 'active' : ''}">
                <span class="nav-icon">${Icons.helpCircle()}</span> الدعم الأكاديمي
              </a>
              <a href="#admin-settings" class="nav-link ${path === '#admin-settings' ? 'active' : ''}">
                <span class="nav-icon">${Icons.settings()}</span> إعدادات المنصة
              </a>

              <div class="sidebar-section-title">المعاينة كطالب</div>
              <a href="#dashboard" class="nav-link">
                <span class="nav-icon">${Icons.playCircle()}</span> واجهة الطالب
              </a>
            </nav>

            <div class="sidebar-footer">
              <div class="user-mini-profile">
                <div class="user-avatar" style="background:var(--danger);">${user.avatar || 'مش'}</div>
                <div class="user-meta">
                  <div class="user-name">${user.name}</div>
                  <div class="user-role" style="color:var(--danger);">المشرف العام</div>
                </div>
                <button id="sidebar-logout-btn" class="btn btn-ghost btn-icon-sm" title="تسجيل الخروج">
                  ${Icons.logOut()}
                </button>
              </div>
            </div>
          </aside>

          <!-- Main Content Area -->
          <div class="main-content">
            <header class="dashboard-topbar">
              <div style="display:flex; align-items:center; gap:1rem;">
                <button class="btn btn-ghost btn-icon" id="open-sidebar-btn">
                  ${Icons.menu()}
                </button>
                <div style="font-size:0.875rem; font-weight:700; color:var(--text-main);">
                  🛡️ لوحة إدارة منصة <span style="color:var(--cyan);">Code Spark</span>
                </div>
              </div>

              <div style="display:flex; align-items:center; gap:0.75rem;">
                <a href="#dashboard" class="btn btn-outline btn-sm">عرض المنصة كطالب</a>
              </div>
            </header>

            <main>
              ${adminHtml}
            </main>
          </div>
        </div>
      `;

      this.initCommonEvents();
      initCallback();

      // Trigger background sync for admin as well
      if (window.CodeSparkDB && window.CodeSparkDB.syncAll) {
        window.CodeSparkDB.syncAll().catch(err => {
          console.warn('Admin background sync warning:', err);
        });
      }
    },


    async renderAssistantLayout(path, param, user, container) {
      let astHtml = '';
      let initCallback = () => {};

      switch (path) {
        case '#assistant-resources':
          astHtml = window.AdminViews && window.AdminViews.renderResources ? await window.AdminViews.renderResources(user) : '';
          initCallback = () => window.AdminViews && window.AdminViews.initResourcesEvents && window.AdminViews.initResourcesEvents();
          break;
        case '#assistant-dashboard':
          astHtml = window.AssistantViews ? await window.AssistantViews.renderDashboard(user) : '';
          initCallback = () => window.AssistantViews && window.AssistantViews.initEvents && window.AssistantViews.initEvents(path, param, user);
          break;
        case '#assistant-code':
          astHtml = window.AssistantViews ? await window.AssistantViews.renderCodeGenerator(user) : '';
          initCallback = () => window.AssistantViews && window.AssistantViews.initEvents && window.AssistantViews.initEvents(path, param, user);
          break;
        case '#assistant-questions':
          astHtml = window.AssistantViews ? await window.AssistantViews.renderStudentQuestions(user) : '';
          initCallback = () => window.AssistantViews && window.AssistantViews.initEvents && window.AssistantViews.initEvents(path, param, user);
          break;
        case '#assistant-exams':
          astHtml = window.AssistantViews ? await window.AssistantViews.renderExams(user) : '';
          initCallback = () => window.AssistantViews && window.AssistantViews.initEvents && window.AssistantViews.initEvents(path, param, user);
          break;
        case '#assistant-bank':
          astHtml = window.AssistantViews ? await window.AssistantViews.renderQuestionBank(user) : '';
          initCallback = () => window.AssistantViews && window.AssistantViews.initEvents && window.AssistantViews.initEvents(path, param, user);
          break;
        case '#assistant-students':
          astHtml = window.AssistantViews ? await window.AssistantViews.renderStudents(user) : '';
          initCallback = () => window.AssistantViews && window.AssistantViews.initEvents && window.AssistantViews.initEvents(path, param, user);
          break;
        case '#assistant-grades':
          astHtml = window.AssistantViews ? await window.AssistantViews.renderGrades(user) : '';
          initCallback = () => window.AssistantViews && window.AssistantViews.initEvents && window.AssistantViews.initEvents(path, param, user);
          break;
        default:
          astHtml = window.AssistantViews ? await window.AssistantViews.renderDashboard(user) : '';
          initCallback = () => window.AssistantViews && window.AssistantViews.initEvents && window.AssistantViews.initEvents('#assistant-dashboard', param, user);
      }

      container.innerHTML = `
        <div class="app-container">
          <div class="sidebar-backdrop" id="sidebar-backdrop"></div>

          <!-- Assistant Sidebar -->
          <aside class="app-sidebar" id="app-sidebar">
            <div class="sidebar-header">
              <a href="#assistant-dashboard" style="display:flex; align-items:center; gap:0.5rem;">
                <img src="assets/logos/logo-dark.svg" alt="Code Spark Assistant" style="height:32px;">
              </a>
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <span class="badge badge-purple" style="font-size:0.65rem;">ASSISTANT</span>
                <button class="btn btn-ghost btn-icon-sm hide-on-desktop" id="close-sidebar-btn">${Icons.x()}</button>
              </div>
            </div>

            <nav class="sidebar-nav">
              <div class="sidebar-section-title">لوحة المساعد الأكاديمي</div>
              <a href="#assistant-dashboard" class="nav-link ${path === '#assistant-dashboard' || path === '#assistant' ? 'active' : ''}">
                <span class="nav-icon">${Icons.home()}</span> الرئيسية الإحصائية
              </a>
              <a href="#assistant-resources" class="nav-link ${path === '#assistant-resources' || path === '#admin-resources' ? 'active' : ''}">
                <span class="nav-icon">${Icons.fileText ? Icons.fileText() : '📄'}</span> إدارة الملفات (PDF)
              </a>
              <a href="#assistant-code" class="nav-link ${path === '#assistant-code' ? 'active' : ''}">
                <span class="nav-icon">${Icons.terminal ? Icons.terminal() : '⚡'}</span> توليد واختبار الأكواد
              </a>
              <a href="#assistant-questions" class="nav-link ${path === '#assistant-questions' ? 'active' : ''}">
                <span class="nav-icon">${Icons.helpCircle()}</span> استفسارات الطلاب
              </a>
              <a href="#assistant-exams" class="nav-link ${path === '#assistant-exams' ? 'active' : ''}">
                <span class="nav-icon">${Icons.award()}</span> إدارة الامتحانات
              </a>
              <a href="#assistant-bank" class="nav-link ${path === '#assistant-bank' ? 'active' : ''}">
                <span class="nav-icon">${Icons.book()}</span> بنك الأسئلة
              </a>
              <a href="#assistant-students" class="nav-link ${path === '#assistant-students' ? 'active' : ''}">
                <span class="nav-icon">${Icons.users()}</span> شؤون الطلاب والتقدم
              </a>
              <a href="#assistant-grades" class="nav-link ${path === '#assistant-grades' ? 'active' : ''}">
                <span class="nav-icon">${Icons.trendingUp()}</span> نتائج وتقييمات الطلاب
              </a>

              <div class="sidebar-section-title">المعاينة كطالب</div>
              <a href="#dashboard" class="nav-link">
                <span class="nav-icon">${Icons.playCircle()}</span> واجهة الطالب
              </a>
            </nav>

            <div class="sidebar-footer">
              <div class="user-mini-profile">
                <div class="user-avatar" style="background:var(--purple);">${user.avatar || 'مس'}</div>
                <div class="user-meta">
                  <div class="user-name">${user.name}</div>
                  <div class="user-role" style="color:var(--purple);">مساعد تعليمي</div>
                </div>
                <button id="sidebar-logout-btn" class="btn btn-ghost btn-icon-sm" title="تسجيل الخروج">
                  ${Icons.logOut()}
                </button>
              </div>
            </div>
          </aside>

          <!-- Main Content Area -->
          <div class="main-content">
            <header class="dashboard-topbar">
              <div style="display:flex; align-items:center; gap:1rem;">
                <button class="btn btn-ghost btn-icon" id="open-sidebar-btn">
                  ${Icons.menu()}
                </button>
                <div style="font-size:0.875rem; font-weight:700; color:var(--text-main);">
                  👨🏫 مساحة عمل <span style="color:var(--purple);">المساعد الأكاديمي</span>
                </div>
              </div>

              <div style="display:flex; align-items:center; gap:0.75rem;">
                <a href="#dashboard" class="btn btn-outline btn-sm">عرض المنصة كطالب</a>
              </div>
            </header>

            <main>
              ${astHtml}
            </main>
          </div>
        </div>
      `;

      this.initCommonEvents();
      initCallback();
    },

    initCommonEvents() {
      const sidebar = document.getElementById('app-sidebar');
      const backdrop = document.getElementById('sidebar-backdrop');
      const openBtn = document.getElementById('open-sidebar-btn');
      const closeBtn = document.getElementById('close-sidebar-btn');

      const toggleSidebar = (open) => {
        if (sidebar) sidebar.classList.toggle('open', open);
        if (backdrop) backdrop.classList.toggle('show', open);
      };

      openBtn?.addEventListener('click', () => toggleSidebar(true));
      closeBtn?.addEventListener('click', () => toggleSidebar(false));
      backdrop?.addEventListener('click', () => toggleSidebar(false));

      document.querySelectorAll('#sidebar-logout-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (window.CodeSparkAuth && window.CodeSparkAuth.logout) {
            await window.CodeSparkAuth.logout();
          }
        });
      });

      // Sound Toggle Button Handler
      document.querySelectorAll('.sound-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (window.SoundManager) {
            const newState = window.SoundManager.toggle();
            if (window.UI && window.UI.showToast) {
              window.UI.showToast(newState ? 'تم تفعيل صوت النقر 🔊' : 'تم كتم صوت النقر 🔇', 'info', 2000);
            }
          }
        });
      });
    }
  };
})();
