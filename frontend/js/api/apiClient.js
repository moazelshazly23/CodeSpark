/**
 * CodeSpark - Centralized API Client
 * Robust, token-aware Fetch API wrapper with timeout, json formatting, and error handling.
 */
const API_BASE = '/api';

export class ApiClient {
  static getToken() {
    const token = localStorage.getItem('codespark_token');
    if (!token || token === 'undefined' || token === 'null' || typeof token !== 'string' || token.trim() === '') {
      return null;
    }
    return token.trim();
  }

  static setToken(token) {
    if (!token || token === 'undefined' || token === 'null' || typeof token !== 'string' || token.trim() === '') {
      this.clearToken();
      return;
    }
    localStorage.setItem('codespark_token', token.trim());
  }

  static clearToken() {
    localStorage.removeItem('codespark_token');
    localStorage.removeItem('codespark_user');
  }

  static extractList(res, key = null) {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (key && Array.isArray(res[key])) return res[key];
    const candidateKeys = [
      'announcements', 'courses', 'lessons', 'files', 'exams', 'questions',
      'codes', 'plans', 'requests', 'students', 'assistants', 'tickets',
      'items', 'data', 'results', 'logs'
    ];
    for (const k of candidateKeys) {
      if (Array.isArray(res[k])) return res[k];
    }
    return [];
  }

  static async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const headers = options.headers || {};
    const token = this.getToken();

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const config = { ...options, headers };

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        this.clearToken();
        window.dispatchEvent(new CustomEvent('codespark:auth-expired'));
        throw new Error('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجددًا');
      }

      if (!response.ok) {
        let errDetail = 'حدث خطأ في الخادم';
        try {
          const errJson = await response.json();
          errDetail = errJson.detail || errJson.message || errDetail;
        } catch (_) {}
        throw new Error(errDetail);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      return await response.text();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error.message);
      throw error;
    }
  }

  static get(endpoint, params = {}) {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, v);
      }
    }
    const qs = query.toString();
    return this.request(qs ? `${endpoint}?${qs}` : endpoint, { method: 'GET' });
  }

  static post(endpoint, data = {}) {
    const isFormData = data instanceof FormData;
    return this.request(endpoint, {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data)
    });
  }

  static upload(endpoint, formData) {
    return this.request(endpoint, {
      method: 'POST',
      body: formData
    });
  }

  static put(endpoint, data = {}) {
    const isFormData = data instanceof FormData;
    return this.request(endpoint, {
      method: 'PUT',
      body: isFormData ? data : JSON.stringify(data)
    });
  }

  static delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export default ApiClient;
