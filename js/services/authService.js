// Code Spark Authentication Service
(function() {
  window.AuthService = {
    async login(identifier, password, remember = true) {
      const res = await window.CodeSparkAPI.post('/auth/login', { identifier, password, remember });
      if (res.success && res.token) {
        window.CodeSparkAPI.setToken(res.token, remember);
        window.CodeSparkAPI.setStoredUser(res.user, remember);
      }
      return res;
    },

    async demoLogin(role = 'student') {
      const res = await window.CodeSparkAPI.post(`/auth/demo-login?role=${role}`);
      if (res.success && res.token) {
        window.CodeSparkAPI.setToken(res.token, true);
        window.CodeSparkAPI.setStoredUser(res.user, true);
      }
      return res;
    },

    async verifySubscriptionCode(code) {
      return await window.CodeSparkAPI.post("/auth/verify-subscription-code", { code });
    },

    async register(userData) {
      const res = await window.CodeSparkAPI.post('/auth/register', {
        name: userData.name,
        phone: userData.phone,
        parent_phone: userData.parentPhone || userData.parent_phone,
        password: userData.password,
        confirm_password: userData.confirmPassword || userData.confirm_password,
        email: userData.email,
        grade: userData.grade,
        subscription_code: userData.subscriptionCode || userData.subscription_code
      });
      if (res.success && res.token) {
        window.CodeSparkAPI.setToken(res.token, true);
        window.CodeSparkAPI.setStoredUser(res.user, true);
      }
      return res;
    },

    async getCurrentUser() {
      const stored = window.CodeSparkAPI.getStoredUser();
      const token = window.CodeSparkAPI.getToken();
      if (!token) return null;
      try {
        const res = await window.CodeSparkAPI.get('/auth/me');
        if (res.success && res.user) {
          window.CodeSparkAPI.setStoredUser(res.user);
          return res.user;
        }
      } catch (e) {
        return stored;
      }
      return stored;
    },

    async updateProfile(profileData) {
      const res = await window.CodeSparkAPI.post('/auth/update-profile', profileData);
      if (res.success && res.user) {
        window.CodeSparkAPI.setStoredUser(res.user);
      }
      return res;
    },

    async changePassword(old_password, new_password) {
      return await window.CodeSparkAPI.post('/auth/change-password', { old_password, new_password });
    },

    async superAdminChangeEmail(current_email, new_email, confirm_new_email, current_password) {
      const res = await window.CodeSparkAPI.post('/auth/super-admin/change-email', {
        current_email,
        new_email,
        confirm_new_email,
        current_password
      });
      if (res.success && res.token) {
        window.CodeSparkAPI.setToken(res.token, true);
        if (res.user) {
          window.CodeSparkAPI.setStoredUser(res.user, true);
        }
      }
      return res;
    },

    async superAdminChangePassword(current_password, new_password, confirm_new_password) {
      const res = await window.CodeSparkAPI.post('/auth/super-admin/change-password', {
        current_password,
        new_password,
        confirm_new_password
      });
      if (res.success && res.token) {
        window.CodeSparkAPI.setToken(res.token, true);
      }
      return res;
    },

    async forgotPassword(email) {
      const payload = typeof email === 'object' ? email : { email: email, phone_or_email: email };
      return await window.CodeSparkAPI.post('/auth/forgot-password', payload);
    },

    async verifyOtp(email, otp) {
      return await window.CodeSparkAPI.post('/auth/verify-otp', {
        email: email,
        phone_or_email: email,
        otp: otp
      });
    },

    async resendOtp(email) {
      const payload = typeof email === 'object' ? email : { email: email, phone_or_email: email };
      return await window.CodeSparkAPI.post('/auth/resend-otp', payload);
    },

    async resetPassword(resetTokenOrIdent, new_password, confirm_password = null) {
      const payload = {
        reset_token: resetTokenOrIdent,
        token_or_phone: resetTokenOrIdent,
        new_password: new_password,
        confirm_password: confirm_password || new_password
      };
      return await window.CodeSparkAPI.post('/auth/reset-password', payload);
    },

    async logout() {
      try {
        await window.CodeSparkAPI.post('/auth/logout', {});
      } catch (e) {}
      window.CodeSparkAPI.clearAuth();
    }
  };
})();
