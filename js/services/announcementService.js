// Code Spark Announcements Service
(function() {
  window.AnnouncementService = {
    async getAnnouncements() {
      const res = await window.CodeSparkAPI.get('/announcements');
      return res.announcements || [];
    },

    async createAnnouncement(data) {
      return await window.CodeSparkAPI.post('/announcements', data);
    },

    async updateAnnouncement(annId, data) {
      return await window.CodeSparkAPI.put(`/announcements/${annId}`, data);
    },

    async deleteAnnouncement(annId) {
      return await window.CodeSparkAPI.delete(`/announcements/${annId}`);
    }
  };
})();
