// Code Spark Academic Support Tickets Service
(function() {
  window.SupportService = {
    async getTickets() {
      const res = await window.CodeSparkAPI.get('/support/tickets');
      return res.tickets || [];
    },

    async createTicket(subject, message) {
      return await window.CodeSparkAPI.post('/support/tickets', { subject, message });
    },

    async replyTicket(ticketId, reply) {
      return await window.CodeSparkAPI.post(`/support/tickets/${ticketId}/reply`, { reply });
    },

    async changeStatus(ticketId, status) {
      return await window.CodeSparkAPI.put(`/support/tickets/${ticketId}/status`, { status });
    }
  };
})();
