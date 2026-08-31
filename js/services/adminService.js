// Code Spark Centralized Admin Service Layer
// Direct HTTP Bridge between Admin UI and FastAPI Backend Endpoints
(function() {
  window.AdminService = {
    // 1. Dashboard & Analytics
    async getDashboardStats() {
      const res = await window.CodeSparkAPI.get("/admin/analytics");
      return res.analytics || {};
    },

    async getAnalytics() {
      const res = await window.CodeSparkAPI.get("/admin/analytics");
      return res.analytics || {};
    },

    // 2. Students Management
    async getStudents(filters = {}) {
      const res = await window.CodeSparkAPI.get("/admin/students", filters);
      return res.students || [];
    },

    async getStudentsFull(filters = {}) {
      return await window.CodeSparkAPI.get("/admin/students", filters);
    },

    async getStudent(id) {
      return await window.CodeSparkAPI.get("/admin/students/" + id);
    },

    async createStudent(data) {
      return await window.CodeSparkAPI.post("/admin/students", data);
    },

    async updateStudent(id, data) {
      return await window.CodeSparkAPI.put("/admin/students/" + id, data);
    },

    async toggleStudentStatus(id, status) {
      return await window.CodeSparkAPI.patch("/admin/students/" + id + "/status", { status });
    },

    async resetStudentPassword(id, password) {
      return await window.CodeSparkAPI.post("/admin/students/" + id + "/reset-password", { password });
    },

    async deleteStudent(id) {
      return await window.CodeSparkAPI.delete("/admin/students/" + id);
    },

    async softDeleteStudent(id, reason = "إلغاء الاشتراك") {
      return await window.CodeSparkAPI.delete("/admin/students/" + id);
    },

    // 2.1 Assistants Management
    async getAssistants(filters = {}) {
      const res = await window.CodeSparkAPI.get("/admin/assistants", filters);
      return res.assistants || [];
    },

    async getAssistant(id) {
      const res = await window.CodeSparkAPI.get("/admin/assistants/" + id);
      return res.assistant || res;
    },

    async createAssistant(data) {
      return await window.CodeSparkAPI.post("/admin/assistants", data);
    },

    async updateAssistant(id, data) {
      return await window.CodeSparkAPI.put("/admin/assistants/" + id, data);
    },

    async toggleAssistantStatus(id, status) {
      return await window.CodeSparkAPI.patch("/admin/assistants/" + id + "/status", { status });
    },

    async resetAssistantPassword(id, password) {
      return await window.CodeSparkAPI.post("/admin/assistants/" + id + "/reset-password", { password });
    },

    async deleteAssistant(id) {
      return await window.CodeSparkAPI.delete("/admin/assistants/" + id);
    },

    // 2.2 Activity Logs (Audit Log System)
    async getActivityLogs(filters = {}) {
      const res = await window.CodeSparkAPI.get("/admin/activity-logs", filters);
      return res.logs || [];
    },

    async getActivityLogsFull(filters = {}) {
      return await window.CodeSparkAPI.get("/admin/activity-logs", filters);
    },

    // 2.3 Subscriptions Codes Management
    async getSubscriptions(filters = {}) {
      return await window.CodeSparkAPI.get("/admin/subscriptions", filters);
    },

    async getSubscription(id) {
      return await window.CodeSparkAPI.get("/admin/subscriptions/" + id);
    },

    async generateSubscriptions(data) {
      return await window.CodeSparkAPI.post("/admin/subscriptions/generate", data);
    },

    async disableSubscription(id) {
      return await window.CodeSparkAPI.post("/admin/subscriptions/" + id + "/disable", {});
    },

    async enableSubscription(id) {
      return await window.CodeSparkAPI.post("/admin/subscriptions/" + id + "/enable", {});
    },

    async deleteSubscription(id) {
      return await window.CodeSparkAPI.delete("/admin/subscriptions/" + id);
    },

    // 3. Curriculum & Units Management
    async getUnits() {
      const res = await window.CodeSparkAPI.get("/admin/units");
      return res.units || [];
    },

    async getUnit(id) {
      const res = await window.CodeSparkAPI.get("/admin/units/" + id);
      return res.unit || res;
    },

    async createUnit(data) {
      return await window.CodeSparkAPI.post("/admin/units", data);
    },

    async updateUnit(id, data) {
      return await window.CodeSparkAPI.put("/admin/units/" + id, data);
    },

    async toggleUnitPublish(id, isPublished) {
      return await window.CodeSparkAPI.patch("/admin/units/" + id + "/publish", { is_published: isPublished });
    },

    async reorderUnits(orders) {
      return await window.CodeSparkAPI.patch("/admin/units/reorder", { orders });
    },

    async deleteUnit(id) {
      return await window.CodeSparkAPI.delete("/admin/units/" + id);
    },

    // 4. Lessons Management
    async getLessons(unitId = null) {
      const res = await window.CodeSparkAPI.get("/admin/lessons", unitId ? { unit_id: unitId } : null);
      return res.lessons || [];
    },

    async getLesson(id) {
      const res = await window.CodeSparkAPI.get("/admin/lessons/" + id);
      return res.lesson || res;
    },

    async createLesson(data) {
      return await window.CodeSparkAPI.post("/admin/lessons", data);
    },

    async updateLesson(id, data) {
      return await window.CodeSparkAPI.put("/admin/lessons/" + id, data);
    },

    async toggleLessonPublish(id, isPublished) {
      return await window.CodeSparkAPI.patch("/admin/lessons/" + id + "/publish", { is_published: isPublished });
    },

    async publishLesson(id) {
      return await window.CodeSparkAPI.post("/admin/lessons/" + id + "/publish", {});
    },

    async unpublishLesson(id) {
      return await window.CodeSparkAPI.post("/admin/lessons/" + id + "/unpublish", {});
    },

    async reorderLessons(orders) {
      return await window.CodeSparkAPI.patch("/admin/lessons/reorder", { orders });
    },

    async deleteLesson(id) {
      return await window.CodeSparkAPI.delete("/admin/lessons/" + id);
    },

    // 4.1 Flexible Video Upload & Storage Operations
    async uploadVideo(file, lessonId = null, oldStoragePath = null, onProgress = null) {
      const formData = new FormData();
      formData.append("file", file);
      if (lessonId) formData.append("lesson_id", lessonId);
      if (oldStoragePath) formData.append("old_storage_path", oldStoragePath);
      return await window.CodeSparkAPI.upload("/admin/videos/upload", formData, onProgress);
    },

    async deleteVideo(storagePath) {
      return await window.CodeSparkAPI.delete("/admin/videos", { storage_path: storagePath });
    },

    // 5. Question Bank Management
    async getQuestions(filters = {}) {
      const res = await window.CodeSparkAPI.get("/admin/questions", filters);
      return res.questions || [];
    },

    async getQuestion(id) {
      const res = await window.CodeSparkAPI.get("/admin/questions/" + id);
      return res.question || res;
    },

    async createQuestion(data) {
      return await window.CodeSparkAPI.post("/admin/questions", data);
    },

    async updateQuestion(id, data) {
      return await window.CodeSparkAPI.put("/admin/questions/" + id, data);
    },

    async toggleQuestionPublish(id, isPublished) {
      return await window.CodeSparkAPI.patch("/admin/questions/" + id + "/publish", { is_published: isPublished });
    },

    async deleteQuestion(id) {
      return await window.CodeSparkAPI.delete("/admin/questions/" + id);
    },

    // 5.1 Quizzes Management
    async getQuizzes(filters = {}) {
      const res = await window.CodeSparkAPI.get("/quizzes", filters);
      return res.quizzes || [];
    },

    async getQuiz(id) {
      const res = await window.CodeSparkAPI.get("/quizzes/" + id);
      return res.quiz || res;
    },

    async createQuiz(data) {
      return await window.CodeSparkAPI.post("/quizzes", data);
    },

    async updateQuiz(id, data) {
      return await window.CodeSparkAPI.put("/quizzes/" + id, data);
    },

    async toggleQuizPublish(id, isPublished) {
      return await window.CodeSparkAPI.patch("/quizzes/" + id + "/publish", { is_published: isPublished });
    },

    async deleteQuiz(id) {
      return await window.CodeSparkAPI.delete("/quizzes/" + id);
    },

    // 6. Exams Management & Builder
    async getExams(unitId = null) {
      const res = await window.CodeSparkAPI.get("/admin/exams", unitId ? { unit_id: unitId } : null);
      return res.exams || [];
    },

    async getExam(id) {
      const res = await window.CodeSparkAPI.get("/admin/exams/" + id);
      return res.exam || res;
    },

    async createExam(data) {
      return await window.CodeSparkAPI.post("/admin/exams", data);
    },

    async updateExam(id, data) {
      return await window.CodeSparkAPI.put("/admin/exams/" + id, data);
    },

    async toggleExamPublish(id, isPublished) {
      return await window.CodeSparkAPI.patch("/admin/exams/" + id + "/publish", { is_published: isPublished });
    },

    async deleteExam(id) {
      return await window.CodeSparkAPI.delete("/admin/exams/" + id);
    },

    // 7. Results & Submissions
    async getResults(filters = {}) {
      const res = await window.CodeSparkAPI.get("/admin/results", filters);
      return res.results || [];
    },

    // 8. Announcements
    async getAnnouncements() {
      const res = await window.CodeSparkAPI.get("/admin/announcements");
      return res.announcements || [];
    },

    async createAnnouncement(data) {
      return await window.CodeSparkAPI.post("/admin/announcements", data);
    },

    async updateAnnouncement(id, data) {
      return await window.CodeSparkAPI.put("/admin/announcements/" + id, data);
    },

    async toggleAnnouncementPublish(id, isPublished) {
      return await window.CodeSparkAPI.patch("/admin/announcements/" + id + "/publish", { is_published: isPublished });
    },

    async deleteAnnouncement(id) {
      return await window.CodeSparkAPI.delete("/admin/announcements/" + id);
    },

    // 9. Support Tickets
    async getSupportTickets(statusFilter = null) {
      const res = await window.CodeSparkAPI.get("/admin/support/tickets", statusFilter ? { status_filter: statusFilter } : null);
      return res.tickets || [];
    },

    async replyToTicket(id, replyText) {
      return await window.CodeSparkAPI.post("/admin/support/tickets/" + id + "/reply", { reply: replyText });
    },

    async changeTicketStatus(id, status) {
      return await window.CodeSparkAPI.put("/admin/support/tickets/" + id + "/status", { status });
    },

    // 10. Educational Resources (PDF) & Platform Settings
    async getResources(params = {}) {
      return await window.CodeSparkAPI.get('/admin/resources', params);
    },
    async createResource(data) {
      return await window.CodeSparkAPI.post('/admin/resources', data);
    },
    async updateResource(id, data) {
      return await window.CodeSparkAPI.put('/admin/resources/' + id, data);
    },
    async toggleResourceStatus(id, status) {
      return await window.CodeSparkAPI.patch('/admin/resources/' + id + '/status', { status });
    },
    async deleteResource(id) {
      return await window.CodeSparkAPI.delete('/admin/resources/' + id);
    },
    async validateResourceUrl(url) {
      return await window.CodeSparkAPI.post('/admin/resources/validate-url', { url });
    },
    async getSettings() {
      const res = await window.CodeSparkAPI.get("/admin/settings");
      return res.settings || {};
    },

    async updateSettings(data) {
      return await window.CodeSparkAPI.put("/admin/settings", data);
    },

    // 11. Code Generator API
    async generateCode(topic, level = "beginner", type = "exercise") {
      return await window.CodeSparkAPI.post("/code/generate", { topic, level, type });
    }
  };
})();
