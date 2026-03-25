// services/brandService.js - COMPLETE PRODUCTION-READY VERSION
import api from './api';

class BrandService {
  // ==================== PROFILE MANAGEMENT ====================

  /**
   * Get brand profile
   * @returns {Promise<Object>} { success, brand }
   */
  async getProfile() {
    try {
      const response = await api.get('/brands/profile');
      return response.data;
    } catch (error) {
      console.error('Get profile error:', error);
      return this._handleError(error, 'Failed to load profile');
    }
  }

  /**
   * Update brand profile
   * @param {Object} profileData - Profile fields to update
   * @returns {Promise<Object>} { success, brand }
   */
  async updateProfile(profileData) {
    try {
      const response = await api.put('/brands/profile', profileData);
      return response.data;
    } catch (error) {
      console.error('Update profile error:', error);
      return this._handleError(error, 'Failed to update profile');
    }
  }

  // ==================== DASHBOARD ====================

  /**
   * Get brand dashboard data
   * @returns {Promise<Object>}
   */
  async getDashboard() {
    try {
      const response = await api.get('/brands/dashboard');
      return response.data;
    } catch (error) {
      console.error('Dashboard error:', error);
      return this._handleError(error, 'Failed to load dashboard');
    }
  }

  // ==================== ANALYTICS ====================

  /**
   * Get brand analytics
   * @param {string} period - '7d', '30d', '90d', '12m'
   * @returns {Promise<Object>}
   */
  async getAnalytics(period = '30d') {
    try {
      const response = await api.get('/brands/analytics', { params: { period } });
      return response.data;
    } catch (error) {
      console.error('Analytics error:', error);
      return this._handleError(error, 'Failed to load analytics');
    }
  }

  // ==================== CREATOR SEARCH ====================

  /**
   * Search creators
   * @param {Object} filters - Search filters (q, niche, minFollowers, etc.)
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>}
   */
  async searchCreators(filters = {}, page = 1, limit = 10) {
    try {
      const params = { page, limit, ...filters };
      const response = await api.get('/brands/creators/search', { params });
      return response.data;
    } catch (error) {
      console.error('Search creators error:', error);
      return this._handleError(error, 'Search failed');
    }
  }

  /**
   * Get creator details by ID
   * @param {string} creatorId - Creator ID
   * @returns {Promise<Object>}
   */
  async getCreatorDetails(creatorId) {
    try {
      const response = await api.get(`/brands/creators/${creatorId}`);
      return response.data;
    } catch (error) {
      console.error('Get creator details error:', error);
      return this._handleError(error, 'Failed to load creator details');
    }
  }

  // ==================== TEAM MANAGEMENT ====================

  /**
   * Get team members
   * @returns {Promise<Object>}
   */
  async getTeamMembers() {
    try {
      const response = await api.get('/brands/team');
      return response.data;
    } catch (error) {
      console.error('Get team members error:', error);
      return this._handleError(error, 'Failed to load team');
    }
  }

  /**
   * Add team member (invite)
   * @param {string} email - Email address
   * @param {string} role - Role (viewer/member/manager/admin)
   * @param {Array} permissions - Array of permission strings
   * @returns {Promise<Object>}
   */
  async addTeamMember(email, role, permissions = []) {
    try {
      const response = await api.post('/brands/team', { email, role, permissions });
      return response.data;
    } catch (error) {
      console.error('Add team member error:', error);
      return this._handleError(error, 'Failed to add team member');
    }
  }

  /**
   * Update team member role
   * @param {string} memberId - Team member ID
   * @param {string} role - New role
   * @returns {Promise<Object>}
   */
  async updateTeamMemberRole(memberId, role) {
    try {
      const response = await api.put(`/brands/team/${memberId}/role`, { role });
      return response.data;
    } catch (error) {
      console.error('Update role error:', error);
      return this._handleError(error, 'Failed to update role');
    }
  }

  /**
   * Update team member permissions
   * @param {string} memberId - Team member ID
   * @param {Array} permissions - Array of permission strings
   * @returns {Promise<Object>}
   */
  async updateTeamMemberPermissions(memberId, permissions) {
    try {
      const response = await api.put(`/brands/team/${memberId}/permissions`, { permissions });
      return response.data;
    } catch (error) {
      console.error('Update permissions error:', error);
      return this._handleError(error, 'Failed to update permissions');
    }
  }

  /**
   * Remove team member
   * @param {string} memberId - Team member ID
   * @returns {Promise<Object>}
   */
  async removeTeamMember(memberId) {
    try {
      const response = await api.delete(`/brands/team/${memberId}`);
      return response.data;
    } catch (error) {
      console.error('Remove team member error:', error);
      return this._handleError(error, 'Failed to remove team member');
    }
  }

  // ==================== TEAM INVITATIONS ====================

  /**
   * Get pending invitations
   * @returns {Promise<Object>}
   */
  async getInvitations() {
    try {
      const response = await api.get('/brands/team/invitations');
      return response.data;
    } catch (error) {
      console.error('Get invitations error:', error);
      return this._handleError(error, 'Failed to load invitations');
    }
  }

  /**
   * Send invitation (alias for addTeamMember)
   * @param {string} email
   * @param {string} role
   * @param {Array} permissions
   * @returns {Promise<Object>}
   */
  async sendInvitation(email, role, permissions) {
    return this.addTeamMember(email, role, permissions);
  }

  /**
   * Resend invitation
   * @param {string} invitationId - Invitation ID
   * @returns {Promise<Object>}
   */
  async resendInvitation(invitationId) {
    try {
      const response = await api.post(`/brands/team/invitations/${invitationId}/resend`);
      return response.data;
    } catch (error) {
      console.error('Resend invitation error:', error);
      return this._handleError(error, 'Failed to resend invitation');
    }
  }

  /**
   * Cancel invitation
   * @param {string} invitationId - Invitation ID
   * @returns {Promise<Object>}
   */
  async cancelInvitation(invitationId) {
    try {
      const response = await api.delete(`/brands/team/invitations/${invitationId}`);
      return response.data;
    } catch (error) {
      console.error('Cancel invitation error:', error);
      return this._handleError(error, 'Failed to cancel invitation');
    }
  }

  // ==================== PAYMENT METHODS ====================

  /**
   * Get payment methods
   * @returns {Promise<Object>}
   */
  async getPaymentMethods() {
    try {
      const response = await api.get('/brands/payment-methods');
      return response.data;
    } catch (error) {
      console.error('Get payment methods error:', error);
      return this._handleError(error, 'Failed to load payment methods');
    }
  }

  /**
   * Add payment method
   * @param {Object} methodData - Payment method details
   * @returns {Promise<Object>}
   */
  async addPaymentMethod(methodData) {
    try {
      const response = await api.post('/brands/payment-methods', methodData);
      return response.data;
    } catch (error) {
      console.error('Add payment method error:', error);
      return this._handleError(error, 'Failed to add payment method');
    }
  }

  /**
   * Set default payment method
   * @param {string} methodId - Payment method ID
   * @returns {Promise<Object>}
   */
  async setDefaultPaymentMethod(methodId) {
    try {
      const response = await api.put(`/brands/payment-methods/${methodId}/default`);
      return response.data;
    } catch (error) {
      console.error('Set default method error:', error);
      return this._handleError(error, 'Failed to set default method');
    }
  }

  /**
   * Delete payment method
   * @param {string} methodId - Payment method ID
   * @returns {Promise<Object>}
   */
  async deletePaymentMethod(methodId) {
    try {
      const response = await api.delete(`/brands/payment-methods/${methodId}`);
      return response.data;
    } catch (error) {
      console.error('Delete payment method error:', error);
      return this._handleError(error, 'Failed to delete payment method');
    }
  }

  // ==================== INVOICES ====================

  /**
   * Get invoices
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>}
   */
  async getInvoices(page = 1, limit = 10) {
    try {
      const response = await api.get('/brands/invoices', { params: { page, limit } });
      return response.data;
    } catch (error) {
      console.error('Get invoices error:', error);
      return this._handleError(error, 'Failed to load invoices');
    }
  }

  // ==================== TAX INFORMATION ====================

  /**
   * Get tax information
   * @returns {Promise<Object>}
   */
  async getTaxInfo() {
    try {
      const response = await api.get('/brands/tax-info');
      return response.data;
    } catch (error) {
      console.error('Get tax info error:', error);
      return this._handleError(error, 'Failed to load tax info');
    }
  }

  /**
   * Update tax information
   * @param {Object} taxData - Tax details
   * @returns {Promise<Object>}
   */
  async updateTaxInfo(taxData) {
    try {
      const response = await api.put('/brands/tax-info', taxData);
      return response.data;
    } catch (error) {
      console.error('Update tax info error:', error);
      return this._handleError(error, 'Failed to update tax info');
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

export default new BrandService();