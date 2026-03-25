// services/dealService.js - COMPLETE PRODUCTION-READY VERSION
import api from './api';

class DealService {
  // ==================== CREATE DEAL ====================

  /**
   * Create a new deal offer
   * @param {Object} dealData - { campaignId, creatorId, budget, deadline, deliverables, terms, paymentTerms }
   * @returns {Promise<Object>}
   */
  async createDeal(dealData) {
    try {
      const response = await api.post('/deals', dealData);
      return response.data;
    } catch (error) {
      console.error('Create deal error:', error);
      return this._handleError(error, 'Failed to create deal');
    }
  }

  // ==================== CREATE PERFORMANCE DEAL ====================

  /**
   * Create a performance-based deal (CPE/CPA/CPM/Revenue Share/Hybrid)
   * @param {Object} dealData - { campaignId, creatorId, paymentType, performanceMetrics, deliverables, deadline, message }
   * @returns {Promise<Object>}
   */
  async createPerformanceDeal(dealData) {
    try {
      const response = await api.post('/deals/performance', dealData);
      return response.data;
    } catch (error) {
      console.error('Create performance deal error:', error);
      return this._handleError(error, 'Failed to create performance deal');
    }
  }

  // ==================== UPDATE DEAL ====================

  /**
   * Update deal terms (budget, deadline, deliverables, requirements)
   * @param {string} dealId - Deal ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>}
   */
  async updateDeal(dealId, updateData) {
    try {
      const response = await api.put(`/deals/${dealId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Update deal error:', error);
      return this._handleError(error, 'Failed to update deal');
    }
  }

  // ==================== GET DEALS (BRAND) ====================

  /**
   * Get deals for the authenticated brand
   * @param {string} status - Filter by status ('all', 'pending', 'accepted', etc.)
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>}
   */
  async getBrandDeals(status = 'all', page = 1, limit = 10) {
    try {
      const params = { page, limit };
      if (status !== 'all') params.status = status;
      const response = await api.get('/deals/brand', { params });
      return response.data;
    } catch (error) {
      console.error('Get brand deals error:', error);
      return this._handleError(error, 'Failed to load deals');
    }
  }

  // ==================== GET DEALS (CREATOR) ====================

  /**
   * Get deals for the authenticated creator
   * @param {string} status - Filter by status ('all', 'pending', 'accepted', etc.)
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>}
   */
  async getCreatorDeals(status = 'all', page = 1, limit = 10) {
    try {
      const params = { page, limit };
      if (status !== 'all') params.status = status;
      const response = await api.get('/deals/creator', { params });
      return response.data;
    } catch (error) {
      console.error('Get creator deals error:', error);
      return this._handleError(error, 'Failed to load deals');
    }
  }

  // ==================== GET SINGLE DEAL ====================

  /**
   * Get deal by ID
   * @param {string} dealId - Deal ID
   * @returns {Promise<Object>}
   */
  async getDeal(dealId) {
    try {
      const response = await api.get(`/deals/${dealId}`);
      return response.data;
    } catch (error) {
      console.error('Get deal error:', error);
      return this._handleError(error, 'Failed to load deal');
    }
  }

  // ==================== UPDATE DEAL STATUS ====================

  /**
   * Update deal status
   * @param {string} dealId - Deal ID
   * @param {string} status - New status (accepted, declined, in-progress, completed, cancelled)
   * @param {string} reason - Optional reason (for rejection/cancellation)
   * @returns {Promise<Object>}
   */
  async updateDealStatus(dealId, status, reason = '') {
    try {
      const response = await api.put(`/deals/${dealId}/status`, { status, reason });
      return response.data;
    } catch (error) {
      console.error('Update deal status error:', error);
      return this._handleError(error, 'Failed to update deal status');
    }
  }

  // ==================== ACCEPT DEAL ====================

  /**
   * Accept a deal (creator)
   * @param {string} dealId - Deal ID
   * @returns {Promise<Object>}
   */
  async acceptDeal(dealId) {
    try {
      const response = await api.post(`/deals/${dealId}/accept`);
      return response.data;
    } catch (error) {
      console.error('Accept deal error:', error);
      return this._handleError(error, 'Failed to accept deal');
    }
  }

  // ==================== REJECT DEAL ====================

  /**
   * Reject a deal (creator)
   * @param {string} dealId - Deal ID
   * @param {string} reason - Optional rejection reason
   * @returns {Promise<Object>}
   */
  async rejectDeal(dealId, reason = '') {
    try {
      const response = await api.post(`/deals/${dealId}/reject`, { reason });
      return response.data;
    } catch (error) {
      console.error('Reject deal error:', error);
      return this._handleError(error, 'Failed to reject deal');
    }
  }

  // ==================== MARK DEAL AS IN PROGRESS ====================

  /**
   * Mark deal as in progress (creator starts work)
   * @param {string} dealId - Deal ID
   * @returns {Promise<Object>}
   */
  async markInProgress(dealId) {
    try {
      const response = await api.post(`/deals/${dealId}/mark-in-progress`);
      return response.data;
    } catch (error) {
      console.error('Mark in progress error:', error);
      return this._handleError(error, 'Failed to mark in progress');
    }
  }

  // ==================== COMPLETE DEAL ====================

  /**
   * Complete a deal (brand after approval)
   * @param {string} dealId - Deal ID
   * @returns {Promise<Object>}
   */
  async completeDeal(dealId) {
    try {
      const response = await api.post(`/deals/${dealId}/complete`);
      return response.data;
    } catch (error) {
      console.error('Complete deal error:', error);
      return this._handleError(error, 'Failed to complete deal');
    }
  }

  // ==================== CANCEL DEAL ====================

  /**
   * Cancel a deal (either party)
   * @param {string} dealId - Deal ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>}
   */
  async cancelDeal(dealId, reason = '') {
    try {
      const response = await api.post(`/deals/${dealId}/cancel`, { reason });
      return response.data;
    } catch (error) {
      console.error('Cancel deal error:', error);
      return this._handleError(error, 'Failed to cancel deal');
    }
  }

  // ==================== REQUEST REVISION ====================

  /**
   * Request revision for a deliverable (brand)
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
      return this._handleError(error, 'Failed to request revision');
    }
  }

  // ==================== COUNTER OFFER ====================

  /**
   * Send a counter offer (creator or brand)
   * @param {string} dealId - Deal ID
   * @param {Object} counterData - { budget, deadline, message }
   * @returns {Promise<Object>}
   */
  async counterOffer(dealId, counterData) {
    try {
      const response = await api.post(`/deals/${dealId}/counter`, counterData);
      return response.data;
    } catch (error) {
      console.error('Counter offer error:', error);
      return this._handleError(error, 'Failed to send counter offer');
    }
  }

  // ==================== SUBMIT DELIVERABLES ====================

  /**
   * Submit deliverables (creator)
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
      return this._handleError(error, 'Failed to submit deliverables');
    }
  }

  // ==================== APPROVE DELIVERABLE ====================

  /**
   * Approve a deliverable (brand)
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
      return this._handleError(error, 'Failed to approve deliverable');
    }
  }

  // ==================== RATE DEAL ====================

  /**
   * Rate a completed deal (either party)
   * @param {string} dealId - Deal ID
   * @param {Object} ratingData - { score, review, criteria }
   * @returns {Promise<Object>}
   */
  async rateDeal(dealId, ratingData) {
    try {
      const response = await api.post(`/deals/${dealId}/rate`, ratingData);
      return response.data;
    } catch (error) {
      console.error('Rate deal error:', error);
      return this._handleError(error, 'Failed to rate deal');
    }
  }

  // ==================== MESSAGES ====================

  /**
   * Get messages for a deal
   * @param {string} dealId - Deal ID
   * @returns {Promise<Object>}
   */
  async getDealMessages(dealId) {
    try {
      const response = await api.get(`/deals/${dealId}/messages`);
      return response.data;
    } catch (error) {
      console.error('Get deal messages error:', error);
      return this._handleError(error, 'Failed to load messages');
    }
  }

  /**
   * Send a message on a deal
   * @param {string} dealId - Deal ID
   * @param {string} content - Message content
   * @param {Array} attachments - Optional attachments
   * @returns {Promise<Object>}
   */
  async sendMessage(dealId, content, attachments = []) {
    try {
      const response = await api.post(`/deals/${dealId}/messages`, { content, attachments });
      return response.data;
    } catch (error) {
      console.error('Send message error:', error);
      return this._handleError(error, 'Failed to send message');
    }
  }

  // ==================== PERFORMANCE METRICS ====================

  /**
   * Update performance metrics for a deal (CPE/CPA/CPM tracking)
   * @param {string} dealId - Deal ID
   * @param {Object} metrics - Performance metrics
   * @returns {Promise<Object>}
   */
  async updatePerformanceMetrics(dealId, metrics) {
    try {
      const response = await api.put(`/deals/${dealId}/performance-metrics`, { metrics });
      return response.data;
    } catch (error) {
      console.error('Update performance metrics error:', error);
      return this._handleError(error, 'Failed to update metrics');
    }
  }

  /**
   * Get performance summary for a deal
   * @param {string} dealId - Deal ID
   * @returns {Promise<Object>}
   */
  async getPerformanceSummary(dealId) {
    try {
      const response = await api.get(`/deals/${dealId}/performance-summary`);
      return response.data;
    } catch (error) {
      console.error('Get performance summary error:', error);
      return this._handleError(error, 'Failed to load performance summary');
    }
  }

  // ==================== DEAL STATS ====================

  /**
   * Get deal statistics for authenticated user
   * @returns {Promise<Object>}
   */
  async getDealStats() {
    try {
      const response = await api.get('/deals/stats');
      return response.data;
    } catch (error) {
      console.error('Get deal stats error:', error);
      return this._handleError(error, 'Failed to load stats');
    }
  }

  // ==================== UPLOAD ATTACHMENTS ====================

  /**
   * Upload attachments (files) for a deal (convenience method)
   * @param {FormData} formData - Form data with files
   * @returns {Promise<Object>}
   */
  async uploadAttachments(formData) {
    try {
      const response = await api.post('/upload/multiple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      console.error('Upload attachments error:', error);
      return this._handleError(error, 'Failed to upload files');
    }
  }

  // ==================== HELPER ====================

  /**
   * Standard error handler
   * @private
   */
  _handleError(error, defaultMessage) {
    if (error.response?.data) {
      return {
        success: false,
        error: error.response.data.error || error.response.data.message || defaultMessage,
        ...error.response.data,
      };
    }
    return {
      success: false,
      error: error.message || defaultMessage,
    };
  }
}

export default new DealService();