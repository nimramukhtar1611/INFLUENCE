import React, { createContext, useState, useContext, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const SearchContext = createContext();

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

export const SearchProvider = ({ children }) => {
  const { user } = useAuth();
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    niche: [],
    followers: 'any',
    engagement: 'any',
    platform: [],
    location: '',
    priceRange: { min: '', max: '' },
    verified: false,
    available: false,
  });
  const [savedSearches, setSavedSearches] = useState([]);

  // ==================== SEARCH CREATORS ====================
  const searchCreators = useCallback(async (searchParams = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/search/creators', {
        params: { ...filters, ...searchParams },
      });

      if (response.data?.success) {
        setSearchResults(response.data.creators || []);
        return { success: true, creators: response.data.creators, pagination: response.data.pagination };
      } else {
        const msg = response.data?.error || 'Search failed';
        setError(msg);
        toast.error(msg);
        return { success: false, error: msg };
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Search failed';
      setError(msg);
      toast.error(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // ==================== SEARCH CAMPAIGNS ====================
  const searchCampaigns = useCallback(async (searchParams = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/search/campaigns', { params: searchParams });

      if (response.data?.success) {
        return { success: true, campaigns: response.data.campaigns, pagination: response.data.pagination };
      } else {
        const msg = response.data?.error || 'Search failed';
        setError(msg);
        toast.error(msg);
        return { success: false, error: msg };
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Search failed';
      setError(msg);
      toast.error(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== GET SUGGESTIONS ====================
  const getSuggestions = useCallback(async (query) => {
    try {
      const response = await api.get('/search/suggestions', { params: { q: query } });
      if (response.data?.success) {
        return { success: true, suggestions: response.data.suggestions };
      }
      return { success: false, error: response.data?.error || 'Failed to get suggestions' };
    } catch (err) {
      console.error('Failed to get suggestions:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // ==================== SAVE SEARCH ====================
  const saveSearch = useCallback(async (name, searchParams) => {
    try {
      const response = await api.post('/search/save', { name, filters: searchParams });

      if (response.data?.success) {
        setSavedSearches(prev => [...prev, response.data.savedSearch]);
        toast.success('Search saved');
        return { success: true, savedSearch: response.data.savedSearch };
      } else {
        const msg = response.data?.error || 'Failed to save search';
        toast.error(msg);
        return { success: false, error: msg };
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save search';
      toast.error(msg);
      return { success: false, error: msg };
    }
  }, []);

  // ==================== GET SAVED SEARCHES ====================
  const getSavedSearches = useCallback(async () => {
    try {
      const response = await api.get('/search/saved');
      if (response.data?.success) {
        setSavedSearches(response.data.searches || []);
        return { success: true, searches: response.data.searches };
      }
      return { success: false, error: response.data?.error || 'Failed to get saved searches' };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to get saved searches';
      toast.error(msg);
      return { success: false, error: msg };
    }
  }, []);

  // ==================== DELETE SAVED SEARCH ====================
  const deleteSavedSearch = useCallback(async (searchId) => {
    try {
      const response = await api.delete(`/search/saved/${searchId}`);

      if (response.data?.success) {
        setSavedSearches(prev => prev.filter(s => s._id !== searchId));
        toast.success('Search deleted');
        return { success: true };
      } else {
        const msg = response.data?.error || 'Failed to delete search';
        toast.error(msg);
        return { success: false, error: msg };
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete search';
      toast.error(msg);
      return { success: false, error: msg };
    }
  }, []);

  // ==================== UPDATE SAVED SEARCH ====================
  const updateSavedSearch = useCallback(async (searchId, updates) => {
    try {
      const response = await api.put(`/search/saved/${searchId}`, updates);

      if (response.data?.success) {
        setSavedSearches(prev =>
          prev.map(s => (s._id === searchId ? response.data.savedSearch : s))
        );
        toast.success('Search updated');
        return { success: true, savedSearch: response.data.savedSearch };
      } else {
        const msg = response.data?.error || 'Failed to update search';
        toast.error(msg);
        return { success: false, error: msg };
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update search';
      toast.error(msg);
      return { success: false, error: msg };
    }
  }, []);

  // ==================== GET SEARCH HISTORY ====================
  const getSearchHistory = useCallback(async () => {
    try {
      const response = await api.get('/search/history');
      if (response.data?.success) {
        return { success: true, history: response.data.history };
      }
      return { success: false, error: response.data?.error || 'Failed to get history' };
    } catch (err) {
      console.error('Failed to get search history:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // ==================== CLEAR SEARCH HISTORY ====================
  const clearSearchHistory = useCallback(async () => {
    try {
      const response = await api.delete('/search/history');
      if (response.data?.success) {
        toast.success('Search history cleared');
        return { success: true };
      }
      return { success: false, error: response.data?.error || 'Failed to clear history' };
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to clear history';
      toast.error(msg);
      return { success: false, error: msg };
    }
  }, []);

  // ==================== GET SEARCH ANALYTICS ====================
  const getSearchAnalytics = useCallback(async () => {
    try {
      const response = await api.get('/search/analytics');
      if (response.data?.success) {
        return { success: true, analytics: response.data.analytics };
      }
      return { success: false, error: response.data?.error || 'Failed to get analytics' };
    } catch (err) {
      console.error('Failed to get search analytics:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // ==================== GET TRENDING SEARCHES ====================
  const getTrendingSearches = useCallback(async () => {
    try {
      const response = await api.get('/search/trending');
      if (response.data?.success) {
        return { success: true, trending: response.data.trending };
      }
      return { success: false, error: response.data?.error || 'Failed to get trending' };
    } catch (err) {
      console.error('Failed to get trending searches:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // ==================== GET RECOMMENDATIONS ====================
  const getRecommendations = useCallback(async () => {
    try {
      const response = await api.get('/search/recommendations');
      if (response.data?.success) {
        return { success: true, recommendations: response.data.recommendations };
      }
      return { success: false, error: response.data?.error || 'Failed to get recommendations' };
    } catch (err) {
      console.error('Failed to get recommendations:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // ==================== RESET FILTERS ====================
  const resetFilters = useCallback(() => {
    setFilters({
      niche: [],
      followers: 'any',
      engagement: 'any',
      platform: [],
      location: '',
      priceRange: { min: '', max: '' },
      verified: false,
      available: false,
    });
  }, []);

  const value = {
    searchResults,
    loading,
    error,
    filters,
    setFilters,
    savedSearches,
    searchCreators,
    searchCampaigns,
    getSuggestions,
    saveSearch,
    getSavedSearches,
    deleteSavedSearch,
    updateSavedSearch,
    getSearchHistory,
    clearSearchHistory,
    getSearchAnalytics,
    getTrendingSearches,
    getRecommendations,
    resetFilters,
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};

export default SearchContext