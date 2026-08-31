// Code Spark Exams & Evaluation Service
(function() {
  window.ExamService = {
    async getExams(unitId = null) {
      const res = await window.CodeSparkAPI.get('/exams', unitId ? { unit_id: unitId } : null);
      return res.exams || [];
    },

    async getExam(examId) {
      const res = await window.CodeSparkAPI.get(`/exams/${examId}`);
      return res;
    },

    async submitExam(examId, answers, timeSpentSeconds = 0) {
      return await window.CodeSparkAPI.post('/exams/submit', {
        exam_id: examId,
        answers,
        time_spent_seconds: timeSpentSeconds
      });
    },

    async getAttemptResult(attemptId) {
      const res = await window.CodeSparkAPI.get(`/exams/attempts/${attemptId}`);
      return res.result;
    },

    async getAdminAllResults(filters = {}) {
      const res = await window.CodeSparkAPI.get('/exams/admin/all-results', filters);
      return res.results || [];
    },

    async createExam(data) {
      return await window.CodeSparkAPI.post('/exams', data);
    },

    async updateExam(examId, data) {
      return await window.CodeSparkAPI.put(`/exams/${examId}`, data);
    },

    async deleteExam(examId) {
      return await window.CodeSparkAPI.delete(`/exams/${examId}`);
    }
  };
})();
