// Code Spark Quizzes & Mini-Assessments Service Layer
(function() {
  window.QuizService = {
    async getQuizzes(filters = {}) {
      const res = await window.CodeSparkAPI.get('/quizzes', filters);
      return res.quizzes || [];
    },

    async getQuiz(quizId) {
      const res = await window.CodeSparkAPI.get(`/quizzes/${quizId}`);
      return res.quiz || res;
    },

    async getQuizForLesson(lessonId) {
      const res = await window.CodeSparkAPI.get(`/quizzes/lesson/${lessonId}`);
      return res.quiz || res;
    },

    async submitQuiz(quizId, answers, lessonId = null) {
      return await window.CodeSparkAPI.post('/quizzes/submit', {
        quiz_id: quizId,
        lesson_id: lessonId,
        answers: answers
      });
    },

    async getAttemptResult(attemptId) {
      const res = await window.CodeSparkAPI.get(`/quizzes/attempts/${attemptId}`);
      return res.result || res;
    },

    async createQuiz(data) {
      return await window.CodeSparkAPI.post('/quizzes', data);
    },

    async updateQuiz(quizId, data) {
      return await window.CodeSparkAPI.put(`/quizzes/${quizId}`, data);
    },

    async deleteQuiz(quizId) {
      return await window.CodeSparkAPI.delete(`/quizzes/${quizId}`);
    },

    async togglePublish(quizId) {
      return await window.CodeSparkAPI.patch(`/quizzes/${quizId}/publish`, {});
    }
  };
})();
