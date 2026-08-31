// Code Spark Centralized Production API Client
(function() {
    const getApiBase = () => {
    if (typeof window !== 'undefined') {
      if (window.__CODESPARK_CONFIG__ && window.__CODESPARK_CONFIG__.API_URL) {
        return window.__CODESPARK_CONFIG__.API_URL.replace(/\/$/, '');
      }
      if (window.CODESPARK_API_URL) {
        return window.CODESPARK_API_URL.replace(/\/$/, '');
      }
      try {
        const stored = localStorage.getItem('codespark_api_url');
        if (stored) return stored.replace(/\/$/, '');
      } catch (e) {}
      if (window.location && window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:')) {
        return window.location.origin + '/api';
      }
    }
    return 'http://localhost:8000/api';
  };
  const TOKEN_KEY = 'codespark_auth_token';
  const USER_KEY = 'codespark_auth_user';

  // Offline detection & Event Dispatcher
  window.addEventListener('online', () => {
    if (window.UI && window.UI.showToast) {
      window.UI.showToast('تمت استعادة الاتصال بالإنترنت بنجاح 🟢', 'success');
    }
  });

  window.addEventListener('offline', () => {
    if (window.UI && window.UI.showToast) {
      window.UI.showToast('يبدو أن الاتصال بالإنترنت انقطع. تحقق من اتصالك 🔴', 'warning');
    }
  });

  window.CodeSparkAPI = {
    getToken() {
      return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
    },

    setToken(token, remember = true) {
      if (!token) {
        localStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
        return;
      }
      if (remember) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        sessionStorage.setItem(TOKEN_KEY, token);
      }
    },

    getStoredUser() {
      try {
        const u = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
        return u ? JSON.parse(u) : null;
      } catch (e) {
        return null;
      }
    },

    setStoredUser(user, remember = true) {
      if (!user) {
        localStorage.removeItem(USER_KEY);
        sessionStorage.removeItem(USER_KEY);
        return;
      }
      if (remember) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        sessionStorage.setItem(USER_KEY, JSON.stringify(user));
      }
    },

    clearAuth() {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(USER_KEY);
    },

    async request(endpoint, options = {}) {
      const url = endpoint.startsWith('http') ? endpoint : `${getApiBase()}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
      const headers = {
        'Accept': 'application/json',
        ...(options.headers || {})
      };

      if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      const token = this.getToken();
      if (token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const timeoutMs = options.timeout || 15000;
      const controller = new AbortController();
      let timedOut = false;
      const timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);

      const config = {
        method: options.method || 'GET',
        headers,
        signal: options.signal || controller.signal,
        ...options
      };

      if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
        config.body = JSON.stringify(options.body);
      }

      try {
        const res = await fetch(url, config);
        clearTimeout(timeoutId);

        let data;
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await res.json();
        } else {
          data = { message: await res.text() };
        }

        if (res.status === 401) {
          // Token expired or invalid credentials
          this.clearAuth();
          const isAuthRoute = endpoint.includes('/auth/login') || endpoint.includes('/auth/demo-login');
          if (!isAuthRoute && window.location.hash && !['#login', '#register', '#landing', '#forgot-password'].includes(window.location.hash.split('/')[0])) {
            window.location.hash = '#login';
            if (window.UI && window.UI.showToast) {
              window.UI.showToast('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجددًا', 'warning');
            }
          }
          const errMsg = data.detail || data.message || 'بيانات الدخول غير صحيحة أو انتهت صلاحية الجلسة';
          throw new Error(errMsg);
        }

        if (!res.ok) {
          const errMsg = data.detail || data.message || 'حدث خطأ أثناء معالجة الطلب';
          throw new Error(errMsg);
        }

        return data;
      } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError' || timedOut) {
          throw new Error('انتهت مهلة انتظار الخادم (15 ثانية). يرجى التحقق من اتصالك بالإنترنت والمحاولة مجددًا.');
        }
        if (!navigator.onLine) {
          throw new Error('يبدو أن الاتصال بالإنترنت انقطع. يرجى التحقق من الشبكة وإعادة المحاولة.');
        }
        if (err.name === 'TypeError' && (err.message === 'Failed to fetch' || err.message.includes('fetch') || err.message.includes('NetworkError'))) {
          throw new Error('تعذر الاتصال بخادم المنصة (Backend Server). يرجى التأكد من تشغيل السيرفر (python backend/run_server.py) وفتح الرابط http://localhost:8000');
        }
        throw err;
      }
    },

    get(endpoint, params = null, options = {}) {
      let queryStr = '';
      if (params) {
        const search = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined && v !== null && v !== '') {
            search.append(k, v);
          }
        }
        const qs = search.toString();
        if (qs) queryStr = `?${qs}`;
      }
      return this.request(`${endpoint}${queryStr}`, { method: 'GET', ...options });
    },

    post(endpoint, body, options = {}) {
      return this.request(endpoint, { method: 'POST', body, ...options });
    },

    put(endpoint, body, options = {}) {
      return this.request(endpoint, { method: 'PUT', body, ...options });
    },

    patch(endpoint, body, options = {}) {
      return this.request(endpoint, { method: "PATCH", body, ...options });
    },

    delete(endpoint, params = null, options = {}) {
      let queryStr = '';
      if (params) {
        const search = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined && v !== null && v !== '') {
            search.append(k, v);
          }
        }
        const qs = search.toString();
        if (qs) queryStr = `?${qs}`;
      }
      return this.request(`${endpoint}${queryStr}`, { method: 'DELETE', ...options });
    },

    upload(endpoint, formData, onProgress = null, options = {}) {
      const url = endpoint.startsWith('http') ? endpoint : `${getApiBase()}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.timeout = options.timeout || 60000;
        
        const token = this.getToken();
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        
        if (xhr.upload && onProgress) {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100);
              onProgress(percent, e.loaded, e.total);
            }
          });
        }
        
        xhr.onload = () => {
          let data;
          try {
            data = JSON.parse(xhr.responseText);
          } catch (e) {
            data = { message: xhr.responseText };
          }
          
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            const errMsg = data.detail || data.message || `فشل رفع الملف (${xhr.status})`;
            reject(new Error(errMsg));
          }
        };
        
        xhr.onerror = () => {
          reject(new Error('تعذر الاتصال بالخادم أثناء رفع الملف.'));
        };

        xhr.ontimeout = () => {
          reject(new Error('انتهت مهلة رفع الملف. يرجى المحاولة مجددًا.'));
        };
        
        xhr.send(formData);
      });
    }
  };
})();
