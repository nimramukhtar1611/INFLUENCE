// services/creatorService.js - COMPLETE PRODUCTION-READY VERSION
import api from './api';

class CreatorService {
  // ==================== PROFILE MANAGEMENT ====================

  /**
   * Get creator profile
   * @returns {Promise<Object>} { success, creator }
   */
  async getProfile() {
    try {
      const response = await api.get('/creators/profile/me');
      return response.data;
    } catch (error) {
      console.error('Get profile error:', error);
      return this._handleError(error, 'Failed to load profile');
    }
  }

  /**
   * Update creator profile
   * @param {Object} profileData - Profile fields to update
   * @returns {Promise<Object>} { success, creator }
   */
  async updateProfile(profileData) {
    try {
      const response = await api.put('/creators/profile', profileData);
      return response.data;
    } catch (error) {
      console.error('Update profile error:', error);
      return this._handleError(error, 'Failed to update profile');
    }
  }

  // ==================== SOCIAL MEDIA ====================

  /**
   * Verify social media account by handle
   * @param {string} platform - 'instagram', 'youtube', 'tiktok', 'twitter'
   * @param {string} handle - Username/handle
   * @returns {Promise<Object>}
   */
  async verifySocialMedia(platform, handle) {
    try {
      const response = await api.post('/creators/social/verify', { platform, handle });
      return response.data;
    } catch (error) {
      console.error('Verify social media error:', error);
      return this._handleError(error, 'Failed to verify account');
    }
  }

  /**
   * Sync all social media accounts (refresh stats)
   * @returns {Promise<Object>}
   */
  async syncSocialMedia() {
    try {
      const response = await api.post('/creators/social/sync');
      return response.data;
    } catch (error) {
      console.error('Sync social media error:', error);
      return this._handleError(error, 'Failed to sync accounts');
    }
  }

  // ==================== DASHBOARD ====================

  /**
   * Get creator dashboard data
   * @returns {Promise<Object>}
   */
  async getDashboard() {
    try {
      const response = await api.get('/creators/dashboard');
      return response.data;
    } catch (error) {
      console.error('Dashboard error:', error);
      return this._handleError(error, 'Failed to load dashboard');
    }
  }

  // ==================== ANALYTICS ====================

  /**
   * Get creator analytics
   * @param {string} period - '7d', '30d', '90d', '12m'
   * @returns {Promise<Object>}
   */
  async getAnalytics(period = '30d') {
    try {
      const response = await api.get('/creators/analytics', { params: { period } });
      return response.data;
    } catch (error) {
      console.error('Analytics error:', error);
      return this._handleError(error, 'Failed to load analytics');
    }
  }

  /**
   * Get Creator Growth OS suggestions
   * @param {Object} params - Optional query params (contentType, refreshToken)
   * @returns {Promise<Object>}
   */
  async getGrowthOS(params = {}) {
    try {
      const response = await api.get('/creators/growth-os', { params });
      return response.data;
    } catch (error) {
      console.error('Growth OS error:', error);
      return this._handleError(error, 'Failed to load growth suggestions');
    }
  }

  // ==================== EARNINGS ====================

  /**
   * Get earnings summary
   * @returns {Promise<Object>}
   */
  async getEarningsSummary() {
    try {
      const response = await api.get('/creators/earnings/summary');
      return response.data;
    } catch (error) {
      console.error('Earnings summary error:', error);
      return this._handleError(error, 'Failed to load earnings');
    }
  }

  /**
   * Get earnings history
   * @param {string} period - '7d', '30d', '90d', '12m'
   * @returns {Promise<Object>}
   */
  async getEarningsHistory(period = '30d') {
    try {
      const response = await api.get('/creators/earnings/history', { params: { period } });
      return response.data;
    } catch (error) {
      console.error('Earnings history error:', error);
      return this._handleError(error, 'Failed to load history');
    }
  }

  // ==================== AVAILABLE CAMPAIGNS ====================

  /**
   * Get available campaigns for creator
   * @param {Object} filters - Category, minBudget, maxBudget, platform
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

  /**
   * Apply to a campaign
   * @param {string} campaignId - Campaign ID
   * @param {Object} applicationData - { proposal, rate, portfolio }
   * @returns {Promise<Object>}
   */
  async applyToCampaign(campaignId, applicationData) {
    try {
      const response = await api.post(`/campaigns/${campaignId}/apply`, applicationData);
      return response.data;
    } catch (error) {
      console.error('Apply to campaign error:', error);
      return this._handleError(error, 'Failed to submit application');
    }
  }

  // ==================== PORTFOLIO (FULL CRUD) ====================

  /**
   * Get all portfolio items
   * @returns {Promise<Object>}
   */
  async getPortfolio() {
    try {
      const response = await api.get('/creators/portfolio');
      return response.data;
    } catch (error) {
      console.error('Get portfolio error:', error);
      return this._handleError(error, 'Failed to load portfolio');
    }
  }

  /**
   * Add portfolio item
   * @param {Object} itemData - { title, description, mediaUrl, platform, brand, campaign, performance }
   * @returns {Promise<Object>}
   */
  async addPortfolioItem(itemData) {
    try {
      const response = await api.post('/creators/portfolio', itemData);
      return response.data;
    } catch (error) {
      console.error('Add portfolio item error:', error);
      return this._handleError(error, 'Failed to add portfolio item');
    }
  }

  /**
   * Update portfolio item
   * @param {string} itemId - Portfolio item ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>}
   */
  async updatePortfolioItem(itemId, updates) {
    try {
      const response = await api.put(`/creators/portfolio/${itemId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Update portfolio item error:', error);
      return this._handleError(error, 'Failed to update portfolio item');
    }
  }

  /**
   * Delete portfolio item
   * @param {string} itemId - Portfolio item ID
   * @returns {Promise<Object>}
   */
  async deletePortfolioItem(itemId) {
    try {
      const response = await api.delete(`/creators/portfolio/${itemId}`);
      return response.data;
    } catch (error) {
      console.error('Delete portfolio item error:', error);
      return this._handleError(error, 'Failed to delete portfolio item');
    }
  }

  // ==================== SETTINGS ====================

  /**
   * Update notification settings
   * @param {Object} settings - Notification preferences
   * @returns {Promise<Object>}
   */
  async updateNotificationSettings(settings) {
    try {
      const response = await api.put('/creators/notifications', { notifications: settings });
      return response.data;
    } catch (error) {
      console.error('Update notification settings error:', error);
      return this._handleError(error, 'Failed to update settings');
    }
  }

  /**
   * Update privacy settings
   * @param {Object} privacy - Privacy preferences
   * @returns {Promise<Object>}
   */
  async updatePrivacySettings(privacy) {
    try {
      const response = await api.put('/creators/privacy', { privacy });
      return response.data;
    } catch (error) {
      console.error('Update privacy settings error:', error);
      return this._handleError(error, 'Failed to update privacy');
    }
  }

  /**
   * Update rate card
   * @param {Object} rateCard - Rate card data
   * @returns {Promise<Object>}
   */
  async updateRateCard(rateCard) {
    try {
      const response = await api.put('/creators/rate-card', { rateCard });
      return response.data;
    } catch (error) {
      console.error('Update rate card error:', error);
      return this._handleError(error, 'Failed to update rate card');
    }
  }

  /**
   * Update availability status
   * @param {Object} availability - { status, maxActiveDeals, nextAvailable }
   * @returns {Promise<Object>}
   */
  async updateAvailability(availability) {
    try {
      const response = await api.put('/creators/availability', { availability });
      return response.data;
    } catch (error) {
      console.error('Update availability error:', error);
      return this._handleError(error, 'Failed to update availability');
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

export default new CreatorService();