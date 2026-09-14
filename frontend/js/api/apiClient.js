/**
 * Code Spark - Centralized Unified API Client
 * Fast, reliable, token-aware REST client with abort & debounce capabilities.
 */

const API_BASE = '/api';

class ApiClient {
  static getToken() {
    const token = localStorage.getItem('codespark_token');
    if (!token || token === 'undefined' || token === 'null') return null;
    return token;
  }

  static setToken(token) {
    if (!token || token === 'undefined' || token === 'null') {
      console.error('Refusing to store invalid auth token:', token);
      return;
    }
    localStorage.setItem('codespark_token', token);
  }

  static clearToken() {
    localStorage.removeItem('codespark_token');
    localStorage.removeItem('codespark_user');
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

    const config = {
      ...options,
      headers
    };

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

  static post(endpoint, data) {
    const isFormData = data instanceof FormData;
    return this.request(endpoint, {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data)
    });
  }

  static put(endpoint, data) {
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

// Debounce helper for search inputs
export function debounce(func, delay = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

export default ApiClient;
