// Code Spark Authentication & Role-Based Access Control
(function() {
  const RESET_FLOW_KEY = 'codespark_reset_flow_state';

  window.CodeSparkAuth = {
    getCurrentUser() {
      return window.CodeSparkAPI.getStoredUser();
    },

    async fetchCurrentUser() {
      return await window.AuthService.getCurrentUser();
    },

    setCurrentUser(user, remember = true) {
      window.CodeSparkAPI.setStoredUser(user, remember);
    },

    async login(identifier, password, remember = true) {
      try {
        const res = await window.AuthService.login(identifier, password, remember);
        return res;
      } catch (err) {
        return { success: false, message: err.message || 'فشل تسجيل الدخول' };
      }
    },

    async quickDemoLogin(role = 'student') {
      try {
        const res = await window.AuthService.demoLogin(role);
        return res;
      } catch (err) {
        return { success: false, message: err.message || 'فشل تسجيل الدخول التجريبي' };
      }
    },

    async register(userData) {
      try {
        const res = await window.AuthService.register(userData);
        return res;
      } catch (err) {
        return { success: false, message: err.message || 'فشل إنشاء الحساب' };
      }
    },

    // Reset Password State Management (Session-scoped)
    getResetState() {
      try {
        const raw = sessionStorage.getItem(RESET_FLOW_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },

    setResetState(data) {
      try {
        const current = this.getResetState() || {};
        const updated = { ...current, ...data, updatedAt: Date.now() };
        sessionStorage.setItem(RESET_FLOW_KEY, JSON.stringify(updated));
      } catch (e) {}
    },

    clearResetState() {
      try {
        sessionStorage.removeItem(RESET_FLOW_KEY);
      } catch (e) {}
    },

    async forgotPassword(email) {
      try {
        const res = await window.AuthService.forgotPassword(email);
        if (res.success) {
          this.setResetState({ email: email, sentAt: Date.now() });
        }
        return res;
      } catch (err) {
        return { success: false, message: err.message || 'فشل إرسال رمز التحقق' };
      }
    },

    async verifyOtp(email, otp) {
      try {
        const res = await window.AuthService.verifyOtp(email, otp);
        if (res.success && res.reset_token) {
          this.setResetState({ email: email, resetToken: res.reset_token, verifiedAt: Date.now() });
        }
        return res;
      } catch (err) {
        return { success: false, message: err.message || 'فشل التحقق من الرمز' };
      }
    },

    async resendOtp(email) {
      try {
        const res = await window.AuthService.resendOtp(email);
        if (res.success) {
          this.setResetState({ email: email, sentAt: Date.now() });
        }
        return res;
      } catch (err) {
        return { success: false, message: err.message || 'فشل إعادة إرسال الرمز' };
      }
    },

    async resetPassword(resetToken, newPassword, confirmPassword) {
      try {
        const res = await window.AuthService.resetPassword(resetToken, newPassword, confirmPassword);
        if (res.success) {
          this.clearResetState();
        }
        return res;
      } catch (err) {
        return { success: false, message: err.message || 'فشل تغيير كلمة المرور' };
      }
    },

    async logout() {
      await window.AuthService.logout();
      this.clearResetState();
      window.location.hash = '#login';
      if (window.UI && window.UI.showToast) {
        window.UI.showToast('تم تسجيل الخروج بنجاح', 'info');
      }
    },

    isAuthenticated() {
      return !!(window.CodeSparkAPI.getToken() && window.CodeSparkAPI.getStoredUser());
    },

    isSuperAdmin() {
      const user = this.getCurrentUser();
      if (!user || !user.role) return false;
      const r = user.role.toUpperCase();
      return r === 'SUPER_ADMIN' || r === 'ADMIN';
    },

    isAssistant() {
      const user = this.getCurrentUser();
      if (!user || !user.role) return false;
      const r = user.role.toUpperCase();
      return r === 'ASSISTANT';
    },

    isStaff() {
      return this.isSuperAdmin() || this.isAssistant();
    },

    isAdmin() {
      return this.isSuperAdmin();
    },

    isStudent() {
      const user = this.getCurrentUser();
      if (!user || !user.role) return false;
      const r = user.role.toUpperCase();
      return r === 'STUDENT' || r === 'DEMO';
    }
  };
})();
