/**
 * Code Spark - Authentication & Role-Based Session Service
 */
import ApiClient from '../api/apiClient.js';

class AuthService {
  static currentUser = null;

  static init() {
    const savedUser = localStorage.getItem('codespark_user');
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch (e) {
        this.currentUser = null;
      }
    }
  }

  static isAuthenticated() {
    const token = ApiClient.getToken();
    const hasValidToken = !!token && token !== 'undefined' && token !== 'null';
    return hasValidToken && !!this.currentUser;
  }

  static getUser() {
    return this.currentUser;
  }

  static hasRole(roles) {
    if (!this.currentUser) return false;
    if (this.currentUser.role === 'admin') return true;
    if (Array.isArray(roles)) return roles.includes(this.currentUser.role);
    return this.currentUser.role === roles;
  }

  static async login(usernameOrEmail, password) {
    const res = await ApiClient.post('/auth/login', {
      username_or_email: usernameOrEmail,
      password: password
    });

    if (!res.access_token || res.access_token === 'undefined') {
      throw new Error('لم يتم استلام رمز الدخول من الخادم');
    }

    ApiClient.setToken(res.access_token);
    this.currentUser = {
      id: res.user_id,
      username: res.username,
      full_name: res.full_name,
      role: res.role,
      permissions: res.permissions || []
    };
    localStorage.setItem('codespark_user', JSON.stringify(this.currentUser));
    return this.currentUser;
  }

  // NOTE: /auth/register only returns {success, message, user_id} — it does NOT
  // issue a token. This method only creates the account; callers must follow up
  // with AuthService.login(username, password) to actually authenticate.
  // (This matches how the live register form in app.js already behaves.)
  static async register(data) {
    const res = await ApiClient.post('/auth/register', data);
    return res;
  }

  static logout() {
    ApiClient.clearToken();
    this.currentUser = null;
    window.location.hash = '#/login';
    window.location.reload();
  }

  static async refreshProfile() {
    try {
      const user = await ApiClient.get('/auth/me');
      this.currentUser = {
        ...this.currentUser,
        ...user
      };
      localStorage.setItem('codespark_user', JSON.stringify(this.currentUser));
      return this.currentUser;
    } catch (e) {
      return this.currentUser;
    }
  }
}

AuthService.init();
export default AuthService;
