// Code Spark Student Operations & Student Affairs Service
(function() {
  window.StudentService = {
    // 1. Student Affairs & Administration
    async getStudents(filters = {}) {
      const res = await window.CodeSparkAPI.get('/admin/students', filters);
      return res.students || [];
    },

    async getStudentDetail(studentId) {
      return await window.CodeSparkAPI.get(`/admin/students/${studentId}`);
    },

    async createStudent(data) {
      return await window.CodeSparkAPI.post('/admin/students', data);
    },

    async updateStudent(studentId, data) {
      return await window.CodeSparkAPI.put(`/admin/students/${studentId}`, data);
    },

    async toggleStudentStatus(studentId, status) {
      return await window.CodeSparkAPI.patch(`/admin/students/${studentId}/status`, { status });
    },

    async resetStudentPassword(studentId, password) {
      return await window.CodeSparkAPI.post(`/admin/students/${studentId}/reset-password`, { password });
    },

    async deleteStudent(studentId) {
      return await window.CodeSparkAPI.delete(`/admin/students/${studentId}`);
    },

    async getAnalytics() {
      const res = await window.CodeSparkAPI.get('/admin/analytics');
      return res.analytics || {};
    },

    // 2. Favorites & Bookmarks
    async getBookmarks() {
      const res = await window.CodeSparkAPI.get('/student/bookmarks');
      return res.bookmarks || [];
    },

    async addBookmark(itemType, itemId, title, metadata = {}) {
      return await window.CodeSparkAPI.post('/student/bookmarks', {
        item_type: itemType,
        item_id: itemId,
        title: title,
        metadata: metadata
      });
    },

    async removeBookmark(itemType, itemId) {
      return await window.CodeSparkAPI.delete(`/student/bookmarks/${itemType}/${itemId}`);
    },

    // 3. In-Lesson Personal Notes
    async getNote(lessonId) {
      const res = await window.CodeSparkAPI.get(`/student/notes/${lessonId}`);
      return res.note || null;
    },

    async saveNote(lessonId, noteText) {
      return await window.CodeSparkAPI.post('/student/notes', {
        lesson_id: lessonId,
        note_text: noteText
      });
    },

    // 4. Cloud Code Drafts & Autosave
    async getCodeDraft(lessonId) {
      const res = await window.CodeSparkAPI.get(`/student/code-drafts/${lessonId}`);
      return res.draft || null;
    },

    async saveCodeDraft(lessonId, code, codeType = 'playground') {
      return await window.CodeSparkAPI.post('/student/code-drafts', {
        lesson_id: lessonId,
        code: code,
        code_type: codeType
      });
    },

    // 5. Global Search
    async search(query) {
      const res = await window.CodeSparkAPI.get('/student/search', { q: query });
      return res.results || { units: [], lessons: [], questions: [] };
    },

    // 6. Educational Resources & Achievements
    async getResources(params = {}) {
      return await window.CodeSparkAPI.get('/resources', params);
    },
    async getLessonResources(lessonId) {
      return await window.CodeSparkAPI.get('/resources/lesson/' + lessonId);
    },
    async getAchievements() {
      const res = await window.CodeSparkAPI.get('/student/achievements');
      return res.achievements || [];
    }
  };
})();
