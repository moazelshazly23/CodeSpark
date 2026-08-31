// Code Spark Educational Resources & PDF Service
(function() {
  window.ResourceService = {
    async getResources(params = {}) {
      return await window.CodeSparkAPI.get('/resources', params);
    },

    async getResourceCategories() {
      return await window.CodeSparkAPI.get('/resources/categories');
    },

    async getLessonResources(lessonId) {
      return await window.CodeSparkAPI.get(`/resources/lesson/${lessonId}`);
    },

    async getResourceDetail(id) {
      return await window.CodeSparkAPI.get(`/resources/${id}`);
    },

    async recordView(id) {
      try {
        return await window.CodeSparkAPI.post(`/resources/${id}/view`, {});
      } catch (e) {
        return { success: false };
      }
    },

    async recordDownload(id) {
      try {
        return await window.CodeSparkAPI.post(`/resources/${id}/download`, {});
      } catch (e) {
        return { success: false };
      }
    },

    // Admin & Staff Operations
    async getAdminResources(params = {}) {
      return await window.CodeSparkAPI.get('/admin/resources', params);
    },

    async getAdminResourceDetail(id) {
      return await window.CodeSparkAPI.get(`/admin/resources/${id}`);
    },

    async createResource(data) {
      return await window.CodeSparkAPI.post('/admin/resources', data);
    },

    async updateResource(id, data) {
      return await window.CodeSparkAPI.put(`/admin/resources/${id}`, data);
    },

    async toggleResourceStatus(id, status) {
      return await window.CodeSparkAPI.patch(`/admin/resources/${id}/status`, { status });
    },

    async deleteResource(id) {
      return await window.CodeSparkAPI.delete(`/admin/resources/${id}`);
    },

    async validateUrl(url) {
      return await window.CodeSparkAPI.post('/admin/resources/validate-url', { url });
    }
  };
})();
