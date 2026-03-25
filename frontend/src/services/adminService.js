import api from './api';

class AdminService {
  // Get dashboard data
  async getDashboard() {
    try {
      const response = await api.get('/admin/dashboard');
      return response.data;
    } catch (error) {
      console.error('Dashboard error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get platform analytics
  async getAnalytics(params = {}) {
    try {
      const response = await api.get('/admin/analytics', { params });
      return response.data;
    } catch (error) {
      console.error('Analytics error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get all users with filters
  async getUsers(params = {}) {
    try {
      const response = await api.get('/admin/users', { params });
      return response.data;
    } catch (error) {
      console.error('Get users error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get single user
  async getUser(userId) {
    try {
      const response = await api.get(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Get user error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Update user
  async updateUser(userId, userData) {
    try {
      const response = await api.put(`/admin/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      console.error('Update user error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Delete user
  async deleteUser(userId) {
    try {
      const response = await api.delete(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Delete user error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Verify user
  async verifyUser(userId) {
    try {
      const response = await api.post(`/admin/users/${userId}/verify`);
      return response.data;
    } catch (error) {
      console.error('Verify user error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Suspend user
  async suspendUser(userId, reason, duration) {
    try {
      const response = await api.post(`/admin/users/${userId}/suspend`, { reason, duration });
      return response.data;
    } catch (error) {
      console.error('Suspend user error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Activate user
  async activateUser(userId) {
    try {
      const response = await api.post(`/admin/users/${userId}/activate`);
      return response.data;
    } catch (error) {
      console.error('Activate user error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get all brands
  async getBrands(params = {}) {
    try {
      const response = await api.get('/admin/brands', { params });
      return response.data;
    } catch (error) {
      console.error('Get brands error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get all creators
  async getCreators(params = {}) {
    try {
      const response = await api.get('/admin/creators', { params });
      return response.data;
    } catch (error) {
      console.error('Get creators error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get all campaigns
  async getCampaigns(params = {}) {
    try {
      const response = await api.get('/admin/campaigns', { params });
      return response.data;
    } catch (error) {
      console.error('Get campaigns error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get campaign details
  async getCampaign(campaignId) {
    try {
      const response = await api.get(`/admin/campaigns/${campaignId}`);
      return response.data;
    } catch (error) {
      console.error('Get campaign error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Update campaign status
  async updateCampaignStatus(campaignId, status) {
    try {
      const response = await api.put(`/admin/campaigns/${campaignId}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Update campaign status error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get all deals
  async getDeals(params = {}) {
    try {
      const response = await api.get('/admin/deals', { params });
      return response.data;
    } catch (error) {
      console.error('Get deals error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get deal details
  async getDeal(dealId) {
    try {
      const response = await api.get(`/admin/deals/${dealId}`);
      return response.data;
    } catch (error) {
      console.error('Get deal error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get all payments
  async getPayments(params = {}) {
    try {
      const response = await api.get('/admin/payments', { params });
      return response.data;
    } catch (error) {
      console.error('Get payments error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get payment details
  async getPayment(paymentId) {
    try {
      const response = await api.get(`/admin/payments/${paymentId}`);
      return response.data;
    } catch (error) {
      console.error('Get payment error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Refund payment
  async refundPayment(paymentId, reason) {
    try {
      const response = await api.post(`/admin/payments/${paymentId}/refund`, { reason });
      return response.data;
    } catch (error) {
      console.error('Refund payment error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get all disputes
  async getDisputes(params = {}) {
    try {
      const response = await api.get('/admin/disputes', { params });
      return response.data;
    } catch (error) {
      console.error('Get disputes error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get dispute details
  async getDispute(disputeId) {
    try {
      const response = await api.get(`/admin/disputes/${disputeId}`);
      return response.data;
    } catch (error) {
      console.error('Get dispute error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Update dispute
  async updateDispute(disputeId, disputeData) {
    try {
      const response = await api.put(`/admin/disputes/${disputeId}`, disputeData);
      return response.data;
    } catch (error) {
      console.error('Update dispute error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Resolve dispute
  async resolveDispute(disputeId, resolution) {
    try {
      const response = await api.post(`/admin/disputes/${disputeId}/resolve`, { resolution });
      return response.data;
    } catch (error) {
      console.error('Resolve dispute error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get moderation queue
  async getModerationQueue(params = {}) {
    try {
      const response = await api.get('/admin/moderation', { params });
      return response.data;
    } catch (error) {
      console.error('Get moderation queue error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Approve item
  async approveItem(type, id, notes) {
    try {
      const response = await api.post(`/admin/moderation/${type}/${id}/approve`, { notes });
      return response.data;
    } catch (error) {
      console.error('Approve item error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Reject item
  async rejectItem(type, id, reason) {
    try {
      const response = await api.post(`/admin/moderation/${type}/${id}/reject`, { reason });
      return response.data;
    } catch (error) {
      console.error('Reject item error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get platform settings
  async getSettings() {
    try {
      const response = await api.get('/admin/settings');
      return response.data;
    } catch (error) {
      console.error('Get settings error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Update platform settings
  async updateSettings(settingsData) {
    try {
      const response = await api.put('/admin/settings', settingsData);
      return response.data;
    } catch (error) {
      console.error('Update settings error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get fee structure
  async getFees() {
    try {
      const response = await api.get('/admin/fees');
      return response.data;
    } catch (error) {
      console.error('Get fees error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Update fee structure
  async updateFees(feeData) {
    try {
      const response = await api.put('/admin/fees', feeData);
      return response.data;
    } catch (error) {
      console.error('Update fees error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get reports
  async getReports(params = {}) {
    try {
      const response = await api.get('/admin/reports', { params });
      return response.data;
    } catch (error) {
      console.error('Get reports error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Generate report
  async generateReport(reportType, dateRange, format = 'pdf') {
    try {
      const response = await api.post('/admin/reports/generate', { reportType, dateRange, format });
      return response.data;
    } catch (error) {
      console.error('Generate report error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Download report
  async downloadReport(reportId, format = 'pdf') {
    try {
      const response = await api.get(`/admin/reports/${reportId}/download`, {
        params: { format },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Download report error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get system health
  async getSystemHealth() {
    try {
      const response = await api.get('/admin/system/health');
      return response.data;
    } catch (error) {
      console.error('Get system health error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get system logs
  async getLogs(params = {}) {
    try {
      const response = await api.get('/admin/system/logs', { params });
      return response.data;
    } catch (error) {
      console.error('Get logs error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Clear cache
  async clearCache() {
    try {
      const response = await api.post('/admin/system/clear-cache');
      return response.data;
    } catch (error) {
      console.error('Clear cache error:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get audit logs
  async getAuditLogs(params = {}) {
    try {
      const response = await api.get('/admin/audit-logs', { params });
      return response.data;
    } catch (error) {
      console.error('Get audit logs error:', error);
      throw error.response?.data || error.message;
    }
  }
}

export default new AdminService();