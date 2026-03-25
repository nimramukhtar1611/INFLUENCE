// services/deliverableService.js
import api from './api';

class DeliverableService {
  /**
   * Submit deliverables for a deal
   * @param {string} dealId - Deal ID
   * @param {Array} deliverables - Array of { deliverableId, files, links, notes }
   * @returns {Promise<Object>}
   */
  async submitDeliverables(dealId, deliverables) {
    try {
      const response = await api.post(`/deals/${dealId}/deliverables`, { deliverables });
      return response.data;
    } catch (error) {
      console.error('Submit deliverables error:', error);
      throw error;
    }
  }

  /**
   * Approve a specific deliverable
   * @param {string} dealId - Deal ID
   * @param {string} deliverableId - Deliverable ID
   * @param {string} feedback - Optional feedback
   * @returns {Promise<Object>}
   */
  async approveDeliverable(dealId, deliverableId, feedback = '') {
    try {
      const response = await api.post(`/deals/${dealId}/deliverables/${deliverableId}/approve`, { feedback });
      return response.data;
    } catch (error) {
      console.error('Approve deliverable error:', error);
      throw error;
    }
  }

  /**
   * Request revision for a deliverable
   * @param {string} dealId - Deal ID
   * @param {string} deliverableId - Deliverable ID
   * @param {string} notes - Revision notes
   * @returns {Promise<Object>}
   */
  async requestRevision(dealId, deliverableId, notes) {
    try {
      const response = await api.post(`/deals/${dealId}/revision`, { deliverableId, notes });
      return response.data;
    } catch (error) {
      console.error('Request revision error:', error);
      throw error;
    }
  }

  /**
   * Get all deliverables for a deal
   * @param {string} dealId - Deal ID
   * @returns {Promise<Object>}
   */
  async getDealDeliverables(dealId) {
    try {
      const response = await api.get(`/deals/${dealId}/deliverables`);
      return response.data;
    } catch (error) {
      console.error('Get deal deliverables error:', error);
      throw error;
    }
  }

  /**
   * Get single deliverable details
   * @param {string} deliverableId - Deliverable ID
   * @returns {Promise<Object>}
   */
  async getDeliverable(deliverableId) {
    try {
      const response = await api.get(`/deliverables/${deliverableId}`); // if separate endpoint exists
      return response.data;
    } catch (error) {
      console.error('Get deliverable error:', error);
      throw error;
    }
  }

  /**
   * Update deliverable metrics (views, likes, etc.)
   * @param {string} deliverableId - Deliverable ID
   * @param {Object} metrics - { views, likes, comments, shares, clicks, conversions }
   * @returns {Promise<Object>}
   */
  async updateDeliverableMetrics(deliverableId, metrics) {
    try {
      const response = await api.put(`/deliverables/${deliverableId}/metrics`, { metrics });
      return response.data;
    } catch (error) {
      console.error('Update deliverable metrics error:', error);
      throw error;
    }
  }
}

export default new DeliverableService();