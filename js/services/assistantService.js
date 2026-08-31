// Code Spark Teaching Assistant Service Layer
// Bridges Assistant Dashboard UI with API Endpoints
(function() {
  window.AssistantService = {
    // 1. Dashboard Metrics
    async getDashboardStats() {
      const res = await window.CodeSparkAPI.get("/admin/analytics");
      return res.analytics || {};
    },

    // 2. Code Generation & Execution
    async generateCode(topic, level = "beginner", type = "exercise") {
      return await window.CodeSparkAPI.post("/code/generate", { topic, level, type });
    },

    async runCode(code, inputs = []) {
      return await window.CodeExecutor.run(code, inputs);
    },

    // 3. Student Academic Inquiries / Support Questions
    async getStudentQuestions(statusFilter = null) {
      const res = await window.CodeSparkAPI.get("/admin/support/tickets", statusFilter ? { status_filter: statusFilter } : null);
      return res.tickets || [];
    },

    async replyToStudentQuestion(id, replyText) {
      return await window.CodeSparkAPI.post("/admin/support/tickets/" + id + "/reply", { reply: replyText });
    },

    async updateQuestionStatus(id, status) {
      return await window.CodeSparkAPI.put("/admin/support/tickets/" + id + "/status", { status });
    },

    // 4. Exams Management
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

    async deleteExam(id) {
      return await window.CodeSparkAPI.delete("/admin/exams/" + id);
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

    async deleteQuestion(id) {
      return await window.CodeSparkAPI.delete("/admin/questions/" + id);
    },

    // 6. Students Directory & Progress Tracking
    async getStudents(filters = {}) {
      const res = await window.CodeSparkAPI.get("/admin/students", filters);
      return res.students || [];
    },

    async getStudent(id) {
      return await window.CodeSparkAPI.get("/admin/students/" + id);
    },

    // 7. Grades, Exam Results & Analytics
    async getGrades(filters = {}) {
      const res = await window.CodeSparkAPI.get("/admin/results", filters);
      return res.results || [];
    }
  };
})();
