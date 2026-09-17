/**
 * CodeSpark - Unified Client-Side Hash Router
 * Handles seamless public vs authenticated views, role checking, dynamic topbar & sidebar.
 */
import AuthService from '../auth/authService.js';
import { Toast } from '../components/ui.js';
import { PublicPages } from '../pages/publicPages.js';
import { StudentPages } from '../pages/studentPages.js';
import { AdminPages } from '../pages/adminPages.js';

export class Router {
  static routes = {};

  static register(pattern, handler, requiredRoles = null) {
    this.routes[pattern] = { handler, requiredRoles };
  }

  static init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('codespark:auth-expired', () => {
      window.location.hash = '#/login';
    });
    this.handleRoute();
  }

  static async handleRoute() {
    const hash = window.location.hash || '#/';
    const rawPath = hash.replace(/^#/, '') || '/';
    const path = rawPath.split('?')[0];

    const publicShell = document.getElementById('public-shell');
    const authShell = document.getElementById('auth-shell');
    const appShell = document.getElementById('app-shell');
    const appContent = document.getElementById('content-container');
    const publicContent = document.getElementById('public-content-container');

    const isAuthed = AuthService.isAuthenticated();
    const user = AuthService.getUser();

    // Check if path is public or auth-related
    const publicPaths = ['/', '/about', '/curriculum', '/pricing', '/plans', '/contact', '/support', '/forgot-password'];
    const isAuthForm = (path === '/login' || path === '/register');

    if (isAuthed) {
      // If user is already logged in and navigates to public root or login/register, redirect to dashboard
      if (isAuthForm || path === '/') {
        window.location.hash = (user.role === 'admin' || user.role === 'assistant') ? '#/admin/dashboard' : '#/student/dashboard';
        return;
      }
      if (publicShell) publicShell.style.display = 'none';
      if (authShell) authShell.style.display = 'none';
      if (appShell) appShell.style.display = 'flex';
    } else {
      if (isAuthForm) {
        if (publicShell) publicShell.style.display = 'none';
        if (appShell) appShell.style.display = 'none';
        if (authShell) authShell.style.display = 'flex';
        
        const loginCard = document.getElementById('login-card');
        const registerCard = document.getElementById('register-card');
        if (path === '/register') {
          if (loginCard) loginCard.style.display = 'none';
          if (registerCard) registerCard.style.display = 'block';
        } else {
          if (registerCard) registerCard.style.display = 'none';
          if (loginCard) loginCard.style.display = 'block';
        }
        return;
      } else if (publicPaths.includes(path)) {
        if (appShell) appShell.style.display = 'none';
        if (authShell) authShell.style.display = 'none';
        if (publicShell) publicShell.style.display = 'block';
      } else {
        // Unauthenticated access to protected path -> redirect to login
        window.location.hash = '#/login';
        return;
      }
    }

    // Match route pattern
    let matchedRoute = null;
    let params = {};

    for (const [pattern, config] of Object.entries(this.routes)) {
      const paramNames = [];
      const regexPath = pattern.replace(/:([a-zA-Z0-9_]+)/g, (_, key) => {
        paramNames.push(key);
        return '([^/]+)';
      });
      const match = path.match(new RegExp(`^${regexPath}$`));
      if (match) {
        matchedRoute = config;
        paramNames.forEach((name, idx) => {
          params[name] = match[idx + 1];
        });
        break;
      }
    }

    const targetContainer = isAuthed ? appContent : publicContent;
    if (!targetContainer) return;

    if (!matchedRoute) {
      targetContainer.innerHTML = `
        <div class="card text-center p-5">
          <div style="font-size:3rem;margin-bottom:1rem;">⚠️</div>
          <h2>404 - الصفحة غير موجودة</h2>
          <p class="text-muted mb-3">الصفحة التي تحاول الوصول إليها غير متاحة أو تم تغيير مسارها.</p>
          <a href="#/" class="btn btn-primary">العودة للرئيسية</a>
        </div>
      `;
      return;
    }

    // Role check
    if (matchedRoute.requiredRoles) {
      if (!AuthService.hasRole(matchedRoute.requiredRoles)) {
        Toast.error('ليس لديك الصلاحية لدخول هذه الصفحة الإدارية');
        window.location.hash = (user?.role === 'admin' || user?.role === 'assistant') ? '#/admin/dashboard' : '#/student/dashboard';
        return;
      }
    }

    // Update active nav links
    document.querySelectorAll('.nav-item').forEach(item => {
      const itemHash = item.getAttribute('href');
      if (itemHash && hash.startsWith(itemHash)) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    targetContainer.innerHTML = '<div class="page-loading text-center p-5"><div class="spinner"></div><p class="mt-2 text-muted">جاري تحميل المحتوى...</p></div>';
    window.scrollTo({ top: 0, behavior: 'instant' });

    try {
      await matchedRoute.handler(targetContainer, params);
    } catch (err) {
      console.error('Route error:', err);
      targetContainer.innerHTML = `
        <div class="card text-danger text-center p-5">
          <h2>حدث خطأ أثناء تحميل الصفحة</h2>
          <p class="mt-2 text-muted">${err.message || 'تعذر استرجاع البيانات المطلوبة'}</p>
          <button class="btn btn-secondary mt-3" onclick="window.location.reload()">إعادة المحاولة</button>
        </div>
      `;
    }
  }
}
