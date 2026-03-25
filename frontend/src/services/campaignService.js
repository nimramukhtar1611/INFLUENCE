// services/campaignService.js - COMPLETE PRODUCTION-READY VERSION
import api from './api';

class CampaignService {
  // ==================== CREATE CAMPAIGN ====================

  /**
   * Create a new campaign
   * @param {Object} campaignData - Campaign details
   * @returns {Promise<Object>}
   */
  async createCampaign(campaignData) {
    try {
      const response = await api.post('/campaigns', campaignData);
      return response.data;
    } catch (error) {
      console.error('Create campaign error:', error);
      return this._handleError(error, 'Failed to create campaign');
    }
  }

  // ==================== GET BRAND CAMPAIGNS ====================

  /**
   * Get campaigns for the authenticated brand
   * @param {string} status - Filter by status ('all', 'active', 'draft', etc.)
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>}
   */
  async getBrandCampaigns(status = 'all', page = 1, limit = 10) {
    try {
      const params = { page, limit };
      if (status !== 'all') params.status = status;
      const response = await api.get('/campaigns/brand', { params });
      return response.data;
    } catch (error) {
      console.error('Get brand campaigns error:', error);
      return this._handleError(error, 'Failed to load campaigns');
    }
  }

  // ==================== GET AVAILABLE CAMPAIGNS (FOR CREATORS) ====================

  /**
   * Get available campaigns for creators
   * @param {Object} filters - Category, minBudget, maxBudget, platform, niche
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>}
   */
  async getAvailableCampaigns(filters = {}, page = 1, limit = 10) {
    try {
      const params = { page, limit, ...filters };
      const response = await api.get('/campaigns/available', { params });
      return response.data;
    } catch (error) {
      console.error('Get available campaigns error:', error);
      return this._handleError(error, 'Failed to load campaigns');
    }
  }

  // ==================== GET SINGLE CAMPAIGN ====================

  /**
   * Get campaign by ID
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>}
   */
  async getCampaign(campaignId) {
    try {
      const response = await api.get(`/campaigns/${campaignId}`);
      return response.data;
    } catch (error) {
      console.error('Get campaign error:', error);
      return this._handleError(error, 'Failed to load campaign');
    }
  }

  // ==================== UPDATE CAMPAIGN ====================

  /**
   * Update campaign
   * @param {string} campaignId - Campaign ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>}
   */
  async updateCampaign(campaignId, updates) {
    try {
      const response = await api.put(`/campaigns/${campaignId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Update campaign error:', error);
      return this._handleError(error, 'Failed to update campaign');
    }
  }

  // ==================== DELETE CAMPAIGN ====================

  /**
   * Delete campaign
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>}
   */
  async deleteCampaign(campaignId) {
    try {
      const response = await api.delete(`/campaigns/${campaignId}`);
      return response.data;
    } catch (error) {
      console.error('Delete campaign error:', error);
      return this._handleError(error, 'Failed to delete campaign');
    }
  }

  // ==================== CAMPAIGN ACTIONS ====================

  /**
   * Publish campaign (change status to active)
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>}
   */
  async publishCampaign(campaignId) {
    try {
      const response = await api.post(`/campaigns/${campaignId}/publish`);
      return response.data;
    } catch (error) {
      console.error('Publish campaign error:', error);
      return this._handleError(error, 'Failed to publish campaign');
    }
  }

  /**
   * Pause campaign
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>}
   */
  async pauseCampaign(campaignId) {
    try {
      const response = await api.post(`/campaigns/${campaignId}/pause`);
      return response.data;
    } catch (error) {
      console.error('Pause campaign error:', error);
      return this._handleError(error, 'Failed to pause campaign');
    }
  }

  /**
   * Complete campaign (mark as completed)
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>}
   */
  async completeCampaign(campaignId) {
    try {
      const response = await api.post(`/campaigns/${campaignId}/complete`);
      return response.data;
    } catch (error) {
      console.error('Complete campaign error:', error);
      return this._handleError(error, 'Failed to complete campaign');
    }
  }

  /**
   * Archive campaign
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>}
   */
  async archiveCampaign(campaignId) {
    try {
      const response = await api.post(`/campaigns/${campaignId}/archive`);
      return response.data;
    } catch (error) {
      console.error('Archive campaign error:', error);
      return this._handleError(error, 'Failed to archive campaign');
    }
  }

  /**
   * Duplicate campaign
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>}
   */
  async duplicateCampaign(campaignId) {
    try {
      const response = await api.post(`/campaigns/${campaignId}/duplicate`);
      return response.data;
    } catch (error) {
      console.error('Duplicate campaign error:', error);
      return this._handleError(error, 'Failed to duplicate campaign');
    }
  }

  // ==================== CREATOR INVITATIONS & APPLICATIONS ====================

  /**
   * Invite a creator to a campaign
   * @param {string} campaignId - Campaign ID
   * @param {string} creatorId - Creator ID
   * @param {string} message - Optional message
   * @returns {Promise<Object>}
   */
  async inviteCreator(campaignId, creatorId, message = '') {
    try {
      const response = await api.post(`/campaigns/${campaignId}/invite`, { creatorId, message });
      return response.data;
    } catch (error) {
      console.error('Invite creator error:', error);
      return this._handleError(error, 'Failed to invite creator');
    }
  }

  /**
   * Review a creator's application
   * @param {string} campaignId - Campaign ID
   * @param {string} applicationId - Application ID
   * @param {string} status - 'accepted' or 'rejected'
   * @param {string} feedback - Optional feedback
   * @returns {Promise<Object>}
   */
  async reviewApplication(campaignId, applicationId, status, feedback = '') {
    try {
      const response = await api.put(`/campaigns/${campaignId}/applications/${applicationId}`, {
        status,
        feedback,
      });
      return response.data;
    } catch (error) {
      console.error('Review application error:', error);
      return this._handleError(error, 'Failed to review application');
    }
  }

  // ==================== ANALYTICS ====================

  /**
   * Get campaign analytics
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>}
   */
  async getCampaignAnalytics(campaignId) {
    try {
      const response = await api.get(`/campaigns/${campaignId}/analytics`);
      return response.data;
    } catch (error) {
      console.error('Get campaign analytics error:', error);
      return this._handleError(error, 'Failed to load analytics');
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

export default new CampaignService();