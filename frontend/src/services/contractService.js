import api from './api';

class ContractService {
  async getUserContracts(page = 1, limit = 10, status = '') {
    try {
      const params = { page, limit };
      if (status) params.status = status;
      const response = await api.get('/contracts/user', { params });
      return response.data;
    } catch (error) {
      console.error('Get user contracts error:', error);
      throw error;
    }
  }

  async getContract(contractId) {
    try {
      const response = await api.get(`/contracts/${contractId}`);
      return response.data;
    } catch (error) {
      console.error('Get contract error:', error);
      throw error;
    }
  }

  async getContractByDeal(dealId) {
    try {
      const response = await api.get(`/contracts/deal/${dealId}`);
      return response.data;
    } catch (error) {
      console.error('Get contract by deal error:', error);
      throw error;
    }
  }

  async signContract(contractId, signatureData) {
    try {
      const response = await api.post(`/contracts/${contractId}/sign`, signatureData);
      return response.data;
    } catch (error) {
      console.error('Sign contract error:', error);
      throw error;
    }
  }

  async downloadContract(contractId) {
    try {
      const response = await api.get(`/contracts/${contractId}/download`);
      return response.data;
    } catch (error) {
      console.error('Download contract error:', error);
      throw error;
    }
  }
}

export default new ContractService();