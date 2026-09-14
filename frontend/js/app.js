/**
 * Code Spark - Master Single Page Application Initializer
 * Wires routing, auth listeners, dynamic navigation, and subscription modals.
 */
import { Router } from './router/router.js';
import AuthService from './auth/authService.js';
import { Toast, Modal } from './components/ui.js';
import { StudentPages } from './pages/studentPages.js';
import { AdminPages } from './pages/adminPages.js';
import ApiClient from './api/apiClient.js';

// -----------------------------------------------------------------------------
// 1. Register SPA Routes
// -----------------------------------------------------------------------------

// Student Routes
Router.register('/student/dashboard', (c) => StudentPages.renderDashboard(c));
Router.register('/dashboard', (c) => StudentPages.renderDashboard(c));

Router.register('/student/courses', (c) => StudentPages.renderCourses(c));
Router.register('/courses', (c) => StudentPages.renderCourses(c));

Router.register('/student/lesson/:id', (c, params) => StudentPages.renderLessonView(c, params.id));
Router.register('/lessons/:id', (c, params) => StudentPages.renderLessonView(c, params.id));

Router.register('/student/playground', (c) => StudentPages.renderPlayground(c));
Router.register('/playground', (c) => StudentPages.renderPlayground(c));

Router.register('/student/exercises', (c) => StudentPages.renderPlayground(c));
Router.register('/exercises', (c) => StudentPages.renderPlayground(c));

Router.register('/student/exams', (c) => StudentPages.renderExams(c));
Router.register('/exams', (c) => StudentPages.renderExams(c));

Router.register('/student/support', (c) => StudentPages.renderSupport(c));
Router.register('/support', (c) => StudentPages.renderSupport(c));

Router.register('/student/profile', (c) => StudentPages.renderProfile(c));
Router.register('/profile', (c) => StudentPages.renderProfile(c));

Router.register('/student/notifications', (c) => StudentPages.renderDashboard(c));
Router.register('/student/progress', (c) => StudentPages.renderDashboard(c));
Router.register('/student/resources', (c) => StudentPages.renderCourses(c));
Router.register('/student/bookmarks', (c) => StudentPages.renderDashboard(c));

// Admin & Assistant Routes (Protected)
Router.register('/admin', (c) => AdminPages.renderDashboard(c), ['admin', 'assistant']);
Router.register('/admin/dashboard', (c) => AdminPages.renderDashboard(c), ['admin', 'assistant']);
Router.register('/admin/courses', (c) => AdminPages.renderCourses(c), ['admin', 'assistant']);
Router.register('/admin/lessons', (c) => AdminPages.renderLessons(c), ['admin', 'assistant']);
Router.register('/admin/questions', (c) => AdminPages.renderQuestionBank(c), ['admin', 'assistant']);
Router.register('/admin/exams', (c) => AdminPages.renderExams(c), ['admin', 'assistant']);
Router.register('/admin/announcements', (c) => AdminPages.renderAnnouncements(c), ['admin', 'assistant']);
Router.register('/admin/students', (c) => AdminPages.renderStudents(c), ['admin', 'assistant']);
Router.register('/admin/assistants', (c) => AdminPages.renderAssistants(c), ['admin']);
Router.register('/admin/subscriptions', (c) => AdminPages.renderSubscriptions(c), ['admin', 'assistant']);

// -----------------------------------------------------------------------------
// 2. Dynamic Navigation UI Builder (Role & Permissions Aware)
// -----------------------------------------------------------------------------
function updateNavigationUI() {
  const user = AuthService.getUser();
  if (!user) return;

  // Header and user display
  const nameEl = document.getElementById('user-display-name');
  const roleEl = document.getElementById('user-role-badge');
  const avatarEl = document.getElementById('user-avatar-badge');

  if (nameEl) nameEl.textContent = user.full_name || user.username;
  if (roleEl) {
    const roleMap = { admin: 'مشرف عام 👑', assistant: 'مساعد تعليمي 🛡️', student: 'طالب 🎓' };
    roleEl.textContent = roleMap[user.role] || user.role;
  }
  if (avatarEl) {
    avatarEl.textContent = (user.full_name || user.username).substring(0, 1).toUpperCase();
  }

  // Header widgets
  const gamifyPill = document.getElementById('student-gamification-pill');
  const subBanner = document.getElementById('subscription-quick-banner');

  if (user.role === 'student') {
    if (gamifyPill) gamifyPill.style.display = 'flex';
    // Load student stats & subscription status
    ApiClient.get('/progress/summary').then(res => {
      const xpEl = document.getElementById('stat-xp');
      const strkEl = document.getElementById('stat-streak');
      if (xpEl) xpEl.textContent = res.xp || 50;
      if (strkEl) strkEl.textContent = res.streak_days || 1;
    }).catch(() => {});

    ApiClient.get('/subscriptions/my-status').then(res => {
      if (subBanner) {
        subBanner.style.display = res.is_subscribed ? 'none' : 'block';
      }
    }).catch(() => {});
  } else {
    if (gamifyPill) gamifyPill.style.display = 'none';
    if (subBanner) subBanner.style.display = 'none';
  }

  // Sidebar Items
  const navEl = document.getElementById('sidebar-nav');
  if (!navEl) return;

  if (user.role === 'admin') {
    navEl.innerHTML = `
      <div class="nav-section-label">لوحة الإدارة الشاملة</div>
      <a href="#/admin/dashboard" class="nav-item">📊 لوحة الإحصائيات</a>
      <a href="#/admin/subscriptions" class="nav-item">🔑 أكواد الاشتراكات</a>
      <a href="#/admin/students" class="nav-item">👥 إدارة الطلاب</a>
      <a href="#/admin/assistants" class="nav-item">🛡️ المساعدين والصلاحيات</a>
      
      <div class="nav-section-label">إدارة المحتوى الأكاديمي</div>
      <a href="#/admin/courses" class="nav-item">📚 المناهج والكورسات</a>
      <a href="#/admin/lessons" class="nav-item">🎬 إدارة الدروس والفيديوهات</a>
      <a href="#/admin/questions" class="nav-item">📝 بنك الأسئلة المركزي</a>
      <a href="#/admin/exams" class="nav-item">🎯 الامتحانات والتصحيح</a>
      <a href="#/admin/announcements" class="nav-item">📢 نشر الإعلانات العامة</a>
      
      <div class="nav-section-label">أدوات إضافية</div>
      <a href="#/student/playground" class="nav-item">💻 محرر الأكواد</a>
      <a href="#/student/support" class="nav-item">💬 تذاكر الدعم الفني</a>
    `;
  } else if (user.role === 'assistant') {
    const perms = user.permissions || [];
    let items = '<div class="nav-section-label">لوحة المساعد التعليمي</div>';
    items += '<a href="#/admin/dashboard" class="nav-item">📊 نظرة عامة</a>';
    if (perms.includes('students.read')) items += '<a href="#/admin/students" class="nav-item">👥 قائمة الطلاب</a>';
    if (perms.includes('subscriptions.view')) items += '<a href="#/admin/subscriptions" class="nav-item">🔑 أكواد الاشتراكات</a>';
    items += '<div class="nav-section-label">إدارة المحتوى والأنشطة</div>';
    items += '<a href="#/admin/courses" class="nav-item">📚 المناهج والكورسات</a>';
    items += '<a href="#/admin/lessons" class="nav-item">🎬 إدارة الدروس والفيديوهات</a>';
    items += '<a href="#/admin/questions" class="nav-item">📝 بنك الأسئلة</a>';
    items += '<a href="#/admin/exams" class="nav-item">🎯 الامتحانات والتصحيح</a>';
    items += '<a href="#/admin/announcements" class="nav-item">📢 نشر الإعلانات</a>';
    if (perms.includes('support.manage')) items += '<a href="#/student/support" class="nav-item">💬 تذاكر الدعم</a>';
    items += '<a href="#/student/playground" class="nav-item">💻 محرر الأكواد</a>';
    navEl.innerHTML = items;
  } else {
    // Student
    navEl.innerHTML = `
      <div class="nav-section-label">التعلم الأكاديمي</div>
      <a href="#/student/dashboard" class="nav-item">🏠 لوحة المتابعة</a>
      <a href="#/student/courses" class="nav-item">📚 المناهج والدروس</a>
      <a href="#/student/playground" class="nav-item">💻 محرر الأكواد التفاعلي</a>
      <a href="#/student/exams" class="nav-item">🎯 الامتحانات الدورية</a>
      
      <div class="nav-section-label">الحساب والدعم</div>
      <a href="#/student/support" class="nav-item">💬 تذاكر الدعم الفني</a>
      <a href="#/student/profile" class="nav-item">👤 الملف الشخصي والاشتراك</a>
    `;
  }
}

// -----------------------------------------------------------------------------
// 3. Auth Forms Handling (Login & Register without Code)
// -----------------------------------------------------------------------------
function setupAuthForms() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const showRegisterLink = document.getElementById('show-register-link');
  const showLoginLink = document.getElementById('show-login-link');
  const loginCard = document.getElementById('login-card');
  const registerCard = document.getElementById('register-card');

  if (showRegisterLink && showLoginLink) {
    showRegisterLink.addEventListener('click', (e) => {
      e.preventDefault();
      loginCard.style.display = 'none';
      registerCard.style.display = 'block';
    });
    showLoginLink.addEventListener('click', (e) => {
      e.preventDefault();
      registerCard.style.display = 'none';
      loginCard.style.display = 'block';
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const userIdent = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري التحقق...';

      try {
        const user = await AuthService.login(userIdent, password);
        Toast.success(`مرحبًا بك، ${user.full_name}`);
        updateNavigationUI();
        window.location.hash = (user.role === 'admin' || user.role === 'assistant') ? '#/admin/dashboard' : '#/student/dashboard';
      } catch (err) {
        Toast.error(err.message || 'بيانات الدخول غير صحيحة');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'تسجيل الدخول';
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fullName = document.getElementById('reg-fullname').value.trim();
      const username = document.getElementById('reg-username').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const phone = document.getElementById('reg-phone').value.trim() || null;
      const password = document.getElementById('reg-password').value;
      const submitBtn = registerForm.querySelector('button[type="submit"]');

      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري إنشاء الحساب...';

      try {
        await ApiClient.post('/auth/register', {
          full_name: fullName,
          username: username,
          email: email,
          phone: phone,
          password: password
        });

        const user = await AuthService.login(username, password);
        Toast.success('تم إنشاء الحساب وتسجيل الدخول بنجاح! 🎉');
        updateNavigationUI();
        window.location.hash = '#/student/dashboard';
      } catch (err) {
        Toast.error(err.message || 'تعذر إنشاء الحساب');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'إنشاء الحساب الآن';
      }
    });
  }
}

// -----------------------------------------------------------------------------
// 4. Subscription Code Redemption Modal
// -----------------------------------------------------------------------------
function setupSubscriptionModal() {
  const modal = document.getElementById('sub-modal');
  const openBtn = document.getElementById('activate-sub-btn');
  const closeBtn = document.getElementById('close-sub-modal');
  const cancelBtn = document.getElementById('cancel-sub-btn');
  const codeForm = document.getElementById('activate-code-form');
  const codeInput = document.getElementById('input-sub-code');
  const feedback = document.getElementById('code-validate-feedback');

  const openModal = () => {
    if (modal) {
      modal.style.display = 'flex';
      codeInput.value = '';
      if (feedback) feedback.style.display = 'none';
      codeInput.focus();
    }
  };

  const closeModal = () => {
    if (modal) modal.style.display = 'none';
  };

  openBtn?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  if (codeForm) {
    codeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = codeInput.value.trim().toUpperCase();
      if (!code) return;

      const subBtn = document.getElementById('submit-activate-btn');
      subBtn.disabled = true;
      subBtn.textContent = 'جاري التحقق والتفعيل...';

      try {
        const res = await ApiClient.post('/subscriptions/activate', { code });
        Toast.success(res.message || 'تم تفعيل الاشتراك بنجاح! 🎉');
        closeModal();
        updateNavigationUI();
        // Reload current route
        window.dispatchEvent(new Event('hashchange'));
      } catch (err) {
        if (feedback) {
          feedback.style.display = 'block';
          feedback.style.color = '#EF4444';
          feedback.textContent = err.message || 'كود الاشتراك غير صحيح';
        }
      } finally {
        subBtn.disabled = false;
        subBtn.textContent = 'تفعيل الاشتراك الآن';
      }
    });
  }
}

// -----------------------------------------------------------------------------
// 5. App Bootstrap
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  setupAuthForms();
  setupSubscriptionModal();

  // Mobile menu toggle
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  if (mobileBtn && sidebar) {
    mobileBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (backdrop) backdrop.classList.toggle('active');
    });
  }
  if (backdrop && sidebar) {
    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('open');
      backdrop.classList.remove('active');
    });
  }

  // Logout button
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    AuthService.logout();
  });

  // Initialize Router and update UI
  if (AuthService.isAuthenticated()) {
    updateNavigationUI();
  }
  Router.init();
});
