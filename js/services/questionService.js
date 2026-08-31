// Code Spark Question Bank Service
(function() {
  window.QuestionService = {
    async getQuestions(filter = {}) {
      const res = await window.CodeSparkAPI.get('/questions', filter);
      return res.questions || [];
    },

    async getQuestion(questionId) {
      const res = await window.CodeSparkAPI.get(`/questions/${questionId}`);
      return res.question;
    },

    async createQuestion(data) {
      return await window.CodeSparkAPI.post('/questions', data);
    },

    async updateQuestion(questionId, data) {
      return await window.CodeSparkAPI.put(`/questions/${questionId}`, data);
    },

    async deleteQuestion(questionId) {
      return await window.CodeSparkAPI.delete(`/questions/${questionId}`);
    }
  };
})();
