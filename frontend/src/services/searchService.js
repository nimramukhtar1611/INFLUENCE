// services/searchService.js - COMPLETE FIXED VERSION
import api from './api';

class SearchService {
  
  // ==================== SEARCH CREATORS ====================
  async searchCreators(filters = {}, page = 1, limit = 20) {
    try {
      console.log('Searching creators with filters:', filters);
      
      const params = {
        page,
        limit,
        ...filters
      };

      const response = await api.get('/search/creators', { params });
      
      return {
        success: true,
        creators: response.creators || [],
        total: response.total || 0,
        totalPages: response.totalPages || 1,
        currentPage: response.currentPage || page
      };
    } catch (error) {
      console.error('Search creators error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to search creators',
        creators: [],
        total: 0,
        totalPages: 1,
        currentPage: page
      };
    }
  }

  // ==================== SEARCH CAMPAIGNS ====================
  async searchCampaigns(filters = {}, page = 1, limit = 20) {
    try {
      console.log('Searching campaigns with filters:', filters);
      
      const params = {
        page,
        limit,
        ...filters
      };

      const response = await api.get('/search/campaigns', { params });
      
      return {
        success: true,
        campaigns: response.campaigns || [],
        total: response.total || 0,
        totalPages: response.totalPages || 1,
        currentPage: response.currentPage || page
      };
    } catch (error) {
      console.error('Search campaigns error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to search campaigns',
        campaigns: [],
        total: 0,
        totalPages: 1,
        currentPage: page
      };
    }
  }

  // ==================== GET SUGGESTIONS ====================
  async getSuggestions(query) {
    try {
      if (!query || query.length < 2) {
        return {
          success: true,
          suggestions: []
        };
      }

      console.log('Getting suggestions for:', query);
      const response = await api.get('/search/suggestions', {
        params: { q: query }
      });
      
      return {
        success: true,
        suggestions: response.suggestions || []
      };
    } catch (error) {
      console.error('Get suggestions error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to get suggestions',
        suggestions: []
      };
    }
  }

  // ==================== GET RECOMMENDATIONS ====================
  async getRecommendations(limit = 10) {
    try {
      console.log('Getting recommendations...');
      const response = await api.get('/search/recommendations', {
        params: { limit }
      });
      
      return {
        success: true,
        recommendations: response.recommendations || []
      };
    } catch (error) {
      console.error('Get recommendations error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to get recommendations',
        recommendations: []
      };
    }
  }

  // ==================== GET TRENDING SEARCHES ====================
  async getTrendingSearches(limit = 10) {
    try {
      console.log('Getting trending searches...');
      const response = await api.get('/search/trending', {
        params: { limit }
      });
      
      return {
        success: true,
        trending: response.trending || []
      };
    } catch (error) {
      console.error('Get trending searches error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to get trending searches',
        trending: []
      };
    }
  }

  // ==================== SAVE SEARCH ====================
  async saveSearch(name, filters) {
    try {
      if (!name) {
        throw new Error('Search name is required');
      }
      if (!filters || Object.keys(filters).length === 0) {
        throw new Error('Search filters are required');
      }

      console.log('Saving search:', name, filters);
      const response = await api.post('/search/save', {
        name,
        filters
      });
      
      return {
        success: true,
        search: response.search,
        message: response.message || 'Search saved successfully'
      };
    } catch (error) {
      console.error('Save search error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to save search'
      };
    }
  }

  // ==================== GET SAVED SEARCHES ====================
  async getSavedSearches() {
    try {
      console.log('Getting saved searches...');
      const response = await api.get('/search/saved');
      
      return {
        success: true,
        searches: response.searches || []
      };
    } catch (error) {
      console.error('Get saved searches error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to get saved searches',
        searches: []
      };
    }
  }

  // ==================== UPDATE SAVED SEARCH ====================
  async updateSavedSearch(searchId, updates) {
    try {
      if (!searchId) {
        throw new Error('Search ID is required');
      }

      console.log('Updating saved search:', searchId, updates);
      const response = await api.put(`/search/saved/${searchId}`, updates);
      
      return {
        success: true,
        search: response.search,
        message: response.message || 'Search updated successfully'
      };
    } catch (error) {
      console.error('Update saved search error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to update saved search'
      };
    }
  }

  // ==================== DELETE SAVED SEARCH ====================
  async deleteSavedSearch(searchId) {
    try {
      if (!searchId) {
        throw new Error('Search ID is required');
      }

      console.log('Deleting saved search:', searchId);
      const response = await api.delete(`/search/saved/${searchId}`);
      
      return {
        success: true,
        message: response.message || 'Search deleted successfully'
      };
    } catch (error) {
      console.error('Delete saved search error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to delete saved search'
      };
    }
  }

  // ==================== GET SEARCH HISTORY ====================
  async getSearchHistory(limit = 20) {
    try {
      console.log('Getting search history...');
      const response = await api.get('/search/history', {
        params: { limit }
      });
      
      return {
        success: true,
        history: response.history || []
      };
    } catch (error) {
      console.error('Get search history error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to get search history',
        history: []
      };
    }
  }

  // ==================== CLEAR SEARCH HISTORY ====================
  async clearSearchHistory() {
    try {
      console.log('Clearing search history...');
      const response = await api.delete('/search/history');
      
      return {
        success: true,
        message: response.message || 'Search history cleared'
      };
    } catch (error) {
      console.error('Clear search history error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to clear search history'
      };
    }
  }

  // ==================== GET SEARCH ANALYTICS ====================
  async getSearchAnalytics(period = '30d') {
    try {
      console.log('Getting search analytics...');
      const response = await api.get('/search/analytics', {
        params: { period }
      });
      
      return {
        success: true,
        analytics: response.analytics || {}
      };
    } catch (error) {
      console.error('Get search analytics error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to get search analytics',
        analytics: {}
      };
    }
  }

  // ==================== ADVANCED FILTERS ====================
  buildCreatorFilters(filters) {
    const queryParams = {};

    // Text search
    if (filters.q) queryParams.q = filters.q;

    // Niche filters
    if (filters.niche) queryParams.niche = filters.niche;
    if (filters.niches?.length) queryParams.niches = filters.niches.join(',');

    // Follower filters
    if (filters.minFollowers) queryParams.minFollowers = filters.minFollowers;
    if (filters.maxFollowers) queryParams.maxFollowers = filters.maxFollowers;
    if (filters.followerRange) {
      const [min, max] = filters.followerRange.split('-');
      queryParams.minFollowers = min;
      queryParams.maxFollowers = max;
    }

    // Engagement filters
    if (filters.minEngagement) queryParams.minEngagement = filters.minEngagement;
    if (filters.maxEngagement) queryParams.maxEngagement = filters.maxEngagement;
    if (filters.engagementRange) {
      const [min, max] = filters.engagementRange.split('-');
      queryParams.minEngagement = min;
      queryParams.maxEngagement = max;
    }

    // Platform filters
    if (filters.platform) queryParams.platform = filters.platform;
    if (filters.platforms?.length) queryParams.platforms = filters.platforms.join(',');

    // Location filters
    if (filters.location) queryParams.location = filters.location;
    if (filters.country) queryParams.country = filters.country;
    if (filters.city) queryParams.city = filters.city;

    // Verification filters
    if (filters.verified !== undefined) queryParams.verified = filters.verified;
    if (filters.available !== undefined) queryParams.available = filters.available;

    // Rating filters
    if (filters.minRating) queryParams.minRating = filters.minRating;
    if (filters.maxRating) queryParams.maxRating = filters.maxRating;

    // Deal filters
    if (filters.completedDeals) queryParams.completedDeals = filters.completedDeals;
    if (filters.totalEarnings) queryParams.totalEarnings = filters.totalEarnings;

    // Sorting
    if (filters.sortBy) {
      queryParams.sort = filters.sortBy;
      if (filters.sortOrder) {
        queryParams.sort = filters.sortOrder === 'desc' 
          ? `-${filters.sortBy}` 
          : filters.sortBy;
      }
    }

    return queryParams;
  }

  buildCampaignFilters(filters) {
    const queryParams = {};

    // Text search
    if (filters.q) queryParams.q = filters.q;

    // Category filters
    if (filters.category) queryParams.category = filters.category;
    if (filters.categories?.length) queryParams.categories = filters.categories.join(',');

    // Budget filters
    if (filters.minBudget) queryParams.minBudget = filters.minBudget;
    if (filters.maxBudget) queryParams.maxBudget = filters.maxBudget;
    if (filters.budgetRange) {
      const [min, max] = filters.budgetRange.split('-');
      queryParams.minBudget = min;
      queryParams.maxBudget = max;
    }

    // Platform filters
    if (filters.platform) queryParams.platform = filters.platform;
    if (filters.platforms?.length) queryParams.platforms = filters.platforms.join(',');

    // Status filter
    if (filters.status) queryParams.status = filters.status;

    // Date filters
    if (filters.startDate) queryParams.startDate = filters.startDate;
    if (filters.endDate) queryParams.endDate = filters.endDate;
    if (filters.dateRange) queryParams.dateRange = filters.dateRange;

    // Sorting
    if (filters.sortBy) {
      queryParams.sort = filters.sortOrder === 'desc'
        ? `-${filters.sortBy}`
        : filters.sortBy;
    }

    return queryParams;
  }

  // ==================== FILTER PRESETS ====================
  getFilterPresets() {
    return {
      creator: {
        followerRanges: [
          { value: '1-5k', label: '1K - 5K' },
          { value: '5-10k', label: '5K - 10K' },
          { value: '10-25k', label: '10K - 25K' },
          { value: '25-50k', label: '25K - 50K' },
          { value: '50-100k', label: '50K - 100K' },
          { value: '100k+', label: '100K+' }
        ],
        engagementRanges: [
          { value: '1-2', label: '1% - 2%' },
          { value: '2-3', label: '2% - 3%' },
          { value: '3-4', label: '3% - 4%' },
          { value: '4-5', label: '4% - 5%' },
          { value: '5+', label: '5%+' }
        ],
        platforms: [
          { value: 'instagram', label: 'Instagram', icon: '📸' },
          { value: 'youtube', label: 'YouTube', icon: '🎥' },
          { value: 'tiktok', label: 'TikTok', icon: '🎵' },
          { value: 'twitter', label: 'Twitter', icon: '🐦' }
        ],
        sortOptions: [
          { value: 'followers', label: 'Followers' },
          { value: 'engagement', label: 'Engagement Rate' },
          { value: 'rating', label: 'Rating' },
          { value: 'completedDeals', label: 'Completed Deals' },
          { value: 'createdAt', label: 'Date Joined' }
        ]
      },
      campaign: {
        budgetRanges: [
          { value: '0-100', label: 'Under $100' },
          { value: '100-500', label: '$100 - $500' },
          { value: '500-1000', label: '$500 - $1000' },
          { value: '1000-5000', label: '$1000 - $5000' },
          { value: '5000+', label: '$5000+' }
        ],
        dateRanges: [
          { value: 'today', label: 'Today' },
          { value: '7d', label: 'Last 7 Days' },
          { value: '30d', label: 'Last 30 Days' },
          { value: '90d', label: 'Last 90 Days' }
        ],
        sortOptions: [
          { value: 'budget', label: 'Budget' },
          { value: 'createdAt', label: 'Date Created' },
          { value: 'deadline', label: 'Deadline' }
        ]
      }
    };
  }
}

export default new SearchService();