/**
 * CodeSpark - Master Single Page Application Initializer
 * Wires public pages, student portal, admin dashboard, authentication, and dynamic navigation.
 */
import { Router } from './router/router.js';
import AuthService from './auth/authService.js';
import { Toast, Modal } from './components/ui.js';
import { PublicPages } from './pages/publicPages.js';
import { StudentPages } from './pages/studentPages.js';
import { AdminPages } from './pages/adminPages.js';
import ApiClient from './api/apiClient.js';

// -----------------------------------------------------------------------------
// 1. Register Public Routes
// -----------------------------------------------------------------------------
Router.register('/', (c) => PublicPages.renderLanding(c));
Router.register('/about', (c) => PublicPages.renderAbout(c));
Router.register('/curriculum', (c) => PublicPages.renderCurriculum(c));
Router.register('/pricing', (c) => PublicPages.renderPricing(c));
Router.register('/plans', (c) => PublicPages.renderPricing(c));
Router.register('/contact', (c) => PublicPages.renderContact(c));
Router.register('/support', (c) => PublicPages.renderContact(c));
Router.register('/forgot-password', (c) => PublicPages.renderForgotPassword(c));

// -----------------------------------------------------------------------------
// 2. Register Student Routes
// -----------------------------------------------------------------------------
Router.register('/student/dashboard', (c) => StudentPages.renderDashboard(c), ['student', 'admin', 'assistant']);
Router.register('/dashboard', (c) => StudentPages.renderDashboard(c), ['student', 'admin', 'assistant']);
Router.register('/student/courses', (c) => StudentPages.renderCourses(c), ['student', 'admin', 'assistant']);
Router.register('/courses', (c) => StudentPages.renderCourses(c), ['student', 'admin', 'assistant']);
Router.register('/student/lessons/:id', (c, params) => StudentPages.renderLessonView(c, params.id), ['student', 'admin', 'assistant']);
Router.register('/student/files', (c) => StudentPages.renderStudyFiles(c), ['student', 'admin', 'assistant']);
Router.register('/files', (c) => StudentPages.renderStudyFiles(c), ['student', 'admin', 'assistant']);
Router.register('/student/playground', (c) => StudentPages.renderPlayground(c), ['student', 'admin', 'assistant']);
Router.register('/playground', (c) => StudentPages.renderPlayground(c), ['student', 'admin', 'assistant']);
Router.register('/student/exams', (c) => StudentPages.renderExams(c), ['student', 'admin', 'assistant']);
Router.register('/exams', (c) => StudentPages.renderExams(c), ['student', 'admin', 'assistant']);
Router.register('/student/subscription', (c) => StudentPages.renderSubscriptionPage(c), ['student', 'admin', 'assistant']);
Router.register('/subscription', (c) => StudentPages.renderSubscriptionPage(c), ['student', 'admin', 'assistant']);
Router.register('/student/settings', (c) => StudentPages.renderSettings(c), ['student', 'admin', 'assistant']);

// -----------------------------------------------------------------------------
// 3. Register Administrator & Assistant Protected Routes
// -----------------------------------------------------------------------------
Router.register('/admin', (c) => AdminPages.renderDashboard(c), ['admin', 'assistant']);
Router.register('/admin/dashboard', (c) => AdminPages.renderDashboard(c), ['admin', 'assistant']);
Router.register('/admin/students', (c) => AdminPages.renderStudents(c), ['admin', 'assistant']);
Router.register('/admin/assistants', (c) => AdminPages.renderAssistants(c), ['admin']);
Router.register('/admin/courses', (c) => AdminPages.renderCourses(c), ['admin', 'assistant']);
Router.register('/admin/lessons', (c) => AdminPages.renderLessons(c), ['admin', 'assistant']);
Router.register('/admin/files', (c) => AdminPages.renderStudyFiles(c), ['admin', 'assistant']);
Router.register('/admin/subscriptions', (c) => AdminPages.renderSubscriptions(c), ['admin', 'assistant']);
Router.register('/admin/subscription-requests', (c) => AdminPages.renderSubscriptionRequests(c), ['admin', 'assistant']);
Router.register('/admin/payment-settings', (c) => AdminPages.renderPaymentSettings(c), ['admin']);
Router.register('/admin/announcements', (c) => AdminPages.renderAnnouncements(c), ['admin', 'assistant']);
Router.register('/admin/settings', (c) => AdminPages.renderSettings(c), ['admin', 'assistant']);

// -----------------------------------------------------------------------------
// 4. Navigation UI Builder (Role-Aware)
// -----------------------------------------------------------------------------
function updateNavigationUI() {
  const user = AuthService.getUser();
  if (!user) return;

  const nameEl = document.getElementById('user-display-name');
  const roleEl = document.getElementById('user-role-badge');
  const avatarEl = document.getElementById('user-avatar-badge');

  if (nameEl) nameEl.textContent = user.full_name || user.username;
  if (roleEl) {
    const roleMap = { admin: 'مشرف عام 👑', assistant: 'مساعد تعليمي 🧑‍🏫', student: 'طالب 🎓' };
    roleEl.textContent = roleMap[user.role] || user.role;
  }
  if (avatarEl) {
    avatarEl.textContent = (user.full_name || user.username).substring(0, 1).toUpperCase();
  }

  const navEl = document.getElementById('sidebar-nav');
  if (!navEl) return;

  if (user.role === 'admin') {
    navEl.innerHTML = `
      <div class="nav-section-title">لوحة الإدارة الشاملة</div>
      <a href="#/admin/dashboard" class="nav-item">📊 لوحة الإحصائيات</a>
      <a href="#/admin/subscription-requests" class="nav-item">📥 طلبات الاشتراكات</a>
      <a href="#/admin/subscriptions" class="nav-item">🔑 باقات وأكواد الاشتراكات</a>
      <a href="#/admin/payment-settings" class="nav-item">💳 طرق الدفع والاشتراك</a>
      <a href="#/admin/students" class="nav-item">👥 إدارة حسابات الطلاب</a>
      <a href="#/admin/assistants" class="nav-item">🧑‍🏫 المساعدين والصلاحيات</a>

      <div class="nav-section-title">إدارة المحتوى الأكاديمي</div>
      <a href="#/admin/courses" class="nav-item">🎓 المناهج والوحدات</a>
      <a href="#/admin/lessons" class="nav-item">📚 إدارة الدروس والفيديوهات</a>
      <a href="#/admin/files" class="nav-item">📁 الملفات الدراسية (Drive)</a>
      <a href="#/admin/announcements" class="nav-item">📢 نشر الإعلانات والتنبيهات</a>

      <div class="nav-section-title">أدوات إضافية</div>
      <a href="#/student/playground" class="nav-item">💻 محرر الأكواد السحابي</a>
      <a href="#/admin/settings" class="nav-item">⚙️ إعدادات الحساب والأمان</a>
    `;
  } else if (user.role === 'assistant') {
    navEl.innerHTML = `
      <div class="nav-section-title">لوحة المساعد التعليمي</div>
      <a href="#/admin/dashboard" class="nav-item">📊 نظرة عامة</a>
      <a href="#/admin/subscription-requests" class="nav-item">📥 طلبات الاشتراكات</a>
      <a href="#/admin/subscriptions" class="nav-item">🔑 توليد الأكواد الشهرية</a>
      <a href="#/admin/lessons" class="nav-item">📚 إدارة الدروس والفيديوهات</a>
      <a href="#/admin/files" class="nav-item">📁 الملفات والمذكرات الدراسية</a>
      <a href="#/admin/students" class="nav-item">👥 قائمة الطلاب</a>
      <a href="#/student/playground" class="nav-item">💻 محرر الأكواد</a>
      <a href="#/admin/settings" class="nav-item">⚙️ إعدادات الحساب والأمان</a>
    `;
  } else {
    navEl.innerHTML = `
      <div class="nav-section-title">المحتوى الأكاديمي</div>
      <a href="#/student/dashboard" class="nav-item">📊 لوحة المتابعة</a>
      <a href="#/student/courses" class="nav-item">📚 المناهج والدروس</a>
      <a href="#/student/files" class="nav-item">📁 الملفات الدراسية والمذكرات</a>
      <a href="#/student/playground" class="nav-item">💻 محرر الأكواد التفاعلي</a>
      <a href="#/student/exams" class="nav-item">📝 الامتحانات الدورية والتقييم</a>

      <div class="nav-section-title">الاشتراك والحساب</div>
      <a href="#/student/subscription" class="nav-item">⭐ باقات الاشتراك وتفعيل الكود</a>
      <a href="#/student/settings" class="nav-item">⚙️ إعدادات الحساب والأمان</a>
    `;
  }
}

// -----------------------------------------------------------------------------
// 5. Auth Forms Handling
// -----------------------------------------------------------------------------
function setupAuthForms() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

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
        Toast.success(`مرحبًا بك، ${user.full_name || user.username} ⚡`);
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
        const user = await AuthService.register({
          full_name: fullName,
          username: username,
          email: email,
          phone: phone,
          password: password
        });
        Toast.success('تم إنشاء حساب الطالب وتسجيل الدخول بنجاح! 🎉');
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
// 6. Application Bootstrap
// -----------------------------------------------------------------------------
function bootstrapApp() {
  setupAuthForms();

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

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    AuthService.logout();
  });

  if (AuthService.isAuthenticated()) {
    updateNavigationUI();
  }

  Router.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapApp);
} else {
  bootstrapApp();
}
