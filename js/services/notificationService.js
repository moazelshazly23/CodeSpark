// Code Spark Notifications Service
(function() {
  window.NotificationService = {
    async getNotifications() {
      const res = await window.CodeSparkAPI.get('/notifications');
      return res.notifications || [];
    },

    async markAsRead(notifId) {
      return await window.CodeSparkAPI.post(`/notifications/${notifId}/read`, {});
    },

    async markAllAsRead() {
      return await window.CodeSparkAPI.post('/notifications/read-all', {});
    }
  };
})();
