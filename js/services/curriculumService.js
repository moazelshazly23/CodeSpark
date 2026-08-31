// Code Spark Curriculum & Lessons Service
(function() {
  window.CurriculumService = {
    async getUnits() {
      const res = await window.CodeSparkAPI.get('/units');
      return res.units || [];
    },

    async getUnit(unitId) {
      const res = await window.CodeSparkAPI.get(`/units/${unitId}`);
      return res;
    },

    async createUnit(unitData) {
      return await window.CodeSparkAPI.post('/units', unitData);
    },

    async updateUnit(unitId, unitData) {
      return await window.CodeSparkAPI.put(`/units/${unitId}`, unitData);
    },

    async deleteUnit(unitId) {
      return await window.CodeSparkAPI.delete(`/units/${unitId}`);
    },

    async getLessons(unitId = null) {
      const res = await window.CodeSparkAPI.get('/lessons', unitId ? { unit_id: unitId } : null);
      return res.lessons || [];
    },

    async getLesson(lessonId) {
      const res = await window.CodeSparkAPI.get(`/lessons/${lessonId}`);
      return res;
    },

    async createLesson(lessonData) {
      return await window.CodeSparkAPI.post('/lessons', lessonData);
    },

    async updateLesson(lessonId, lessonData) {
      return await window.CodeSparkAPI.put(`/lessons/${lessonId}`, lessonData);
    },

    async deleteLesson(lessonId) {
      return await window.CodeSparkAPI.delete(`/lessons/${lessonId}`);
    }
  };
})();
