import api from './api';

class DisputeService {
  async getUserDisputes() {
    try {
      const response = await api.get('/disputes/user');
      return response.data;
    } catch (error) {
      console.error('Get user disputes error:', error);
      throw error;
    }
  }

  async createDispute(disputeData) {
    try {
      const response = await api.post('/disputes', disputeData);
      return response.data;
    } catch (error) {
      console.error('Create dispute error:', error);
      throw error;
    }
  }

  async getDispute(disputeId) {
    try {
      const response = await api.get(`/disputes/${disputeId}`);
      return response.data;
    } catch (error) {
      console.error('Get dispute error:', error);
      throw error;
    }
  }

  async addMessage(disputeId, messageData) {
    try {
      const response = await api.post(`/disputes/${disputeId}/messages`, messageData);
      return response.data;
    } catch (error) {
      console.error('Add message error:', error);
      throw error;
    }
  }
}

export default new DisputeService();