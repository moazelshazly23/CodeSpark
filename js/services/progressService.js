// Code Spark Progress Tracking Service
(function() {
  window.ProgressService = {
    async getStudentProgress() {
      const res = await window.CodeSparkAPI.get('/progress/student');
      return res.progress || {};
    },

    async updateLessonProgress(lessonId, progress = 100, completed = true, lastPosition = 0) {
      return await window.CodeSparkAPI.post('/progress/lesson', {
        lesson_id: lessonId,
        progress,
        completed,
        last_position: lastPosition
      });
    },

    async updateVideoProgress(lessonId, lastPosition, progress = null) {
      return await window.CodeSparkAPI.post('/progress/video', {
        lesson_id: lessonId,
        last_position: lastPosition,
        progress
      });
    }
  };
})();
