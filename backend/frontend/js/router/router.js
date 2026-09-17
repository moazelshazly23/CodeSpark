/**
 * Code Spark - Client-Side Single Page Application Router
 * Handles hash-based routing, role protection, and view lifecycle management.
 */
import AuthService from '../auth/authService.js';
import { Toast } from '../components/ui.js';

export class Router {
  static routes = {};
  static currentCleanup = null;

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
    const path = hash.replace(/^#/, '') || '/';
    const mainContent = document.getElementById('content-container') || document.getElementById('main-content');
    const appShell = document.getElementById('app-shell');
    const authShell = document.getElementById('auth-shell');

    const isPublic = path === '/login' || path === '/register';
    const isAuthed = AuthService.isAuthenticated();

    if (isAuthed) {
      if (authShell) authShell.style.display = 'none';
      if (appShell) appShell.style.display = 'flex';
      if (isPublic || path === '/') {
        const user = AuthService.getUser();
        window.location.hash = (user?.role === 'admin' || user?.role === 'assistant') ? '#/admin/dashboard' : '#/student/dashboard';
        return;
      }
    } else {
      if (appShell) appShell.style.display = 'none';
      if (authShell) authShell.style.display = 'flex';
      if (!isPublic && path !== '/') {
        window.location.hash = '#/login';
        return;
      }
    }

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

    if (!matchedRoute) {
      if (mainContent) {
        mainContent.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">⚠️</div>
            <h2>404 - الصفحة غير موجودة</h2>
            <p>الصفحة التي تحاول الوصول إليها غير متاحة.</p>
            <a href="#/" class="btn btn-primary">العودة للرئيسية</a>
          </div>
        `;
      }
      return;
    }

    if (matchedRoute.requiredRoles) {
      if (!AuthService.hasRole(matchedRoute.requiredRoles)) {
        Toast.error('ليس لديك الصلاحية لدخول هذه الصفحة');
        window.location.hash = '#/dashboard';
        return;
      }
    }

    document.querySelectorAll('.nav-item').forEach(item => {
      const itemHash = item.getAttribute('href');
      if (itemHash && hash.startsWith(itemHash)) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    if (this.currentCleanup) {
      try {
        this.currentCleanup();
      } catch (_) {}
      this.currentCleanup = null;
    }

    if (mainContent) {
      mainContent.innerHTML = '<div class="page-loading"><div class="spinner"></div><p>جاري تحميل المحتوى...</p></div>';
      window.scrollTo({ top: 0, behavior: 'instant' });
      try {
        const cleanup = await matchedRoute.handler(mainContent, params);
        if (typeof cleanup === 'function') {
          this.currentCleanup = cleanup;
        }
      } catch (err) {
        console.error('Route handler error:', err);
        mainContent.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">❌</div>
            <h2>حدث خطأ أثناء تحميل الصفحة</h2>
            <p>${err.message || 'تعذر استرجاع البيانات'}</p>
            <button class="btn btn-secondary" onclick="window.location.reload()">إعادة المحاولة</button>
          </div>
        `;
      }
    }
  }
}
