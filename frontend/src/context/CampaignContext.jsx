import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const CampaignContext = createContext();

export const useCampaign = () => {
  const context = React.useContext(CampaignContext);
  if (!context) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
};

export const CampaignProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const [campaigns, setCampaigns] = useState([]);
  const [currentCampaign, setCurrentCampaign] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [counts, setCounts] = useState({});

  const [filters, setFilters] = useState({
    status: 'all',
    category: '',
    minBudget: '',
    maxBudget: '',
    platform: '',
    niche: '',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    dateRange: 'all',
    startDate: null,
    endDate: null,
    location: '',
    minFollowers: '',
    maxFollowers: '',
    minEngagement: '',
    verified: false,
    available: false,
  });

  const filterOptions = useMemo(() => ({
    statuses: [
      { value: 'all', label: 'All Status' },
      { value: 'active', label: 'Active' },
      { value: 'draft', label: 'Draft' },
      { value: 'pending', label: 'Pending' },
      { value: 'paused', label: 'Paused' },
      { value: 'completed', label: 'Completed' },
      { value: 'archived', label: 'Archived' },
    ],
    categories: [
      'Fashion', 'Beauty', 'Technology', 'Food & Beverage', 'Fitness',
      'Travel', 'Gaming', 'Lifestyle', 'Parenting', 'Finance',
      'Education', 'Entertainment', 'Sports', 'Health', 'Other',
    ],
    platforms: ['instagram', 'youtube', 'tiktok', 'twitter', 'facebook', 'linkedin'],
    niches: [
      'Fashion', 'Beauty', 'Fitness', 'Travel', 'Food', 'Tech',
      'Gaming', 'Lifestyle', 'Parenting', 'Finance', 'Health',
    ],
    sortOptions: [
      { value: 'createdAt_desc', label: 'Newest First' },
      { value: 'createdAt_asc', label: 'Oldest First' },
      { value: 'budget_desc', label: 'Budget: High to Low' },
      { value: 'budget_asc', label: 'Budget: Low to High' },
      { value: 'title_asc', label: 'Title: A to Z' },
      { value: 'title_desc', label: 'Title: Z to A' },
      { value: 'deadline_asc', label: 'Deadline: Soonest' },
      { value: 'progress_desc', label: 'Progress: Most Complete' },
    ],
    dateRanges: [
      { value: 'all', label: 'All Time' },
      { value: 'today', label: 'Today' },
      { value: 'yesterday', label: 'Yesterday' },
      { value: '7d', label: 'Last 7 Days' },
      { value: '30d', label: 'Last 30 Days' },
      { value: '90d', label: 'Last 90 Days' },
      { value: 'thisMonth', label: 'This Month' },
      { value: 'lastMonth', label: 'Last Month' },
      { value: 'custom', label: 'Custom Range' },
    ],
  }), []);

  const resetFilters = useCallback(() => {
    setFilters({
      status: 'all',
      category: '',
      minBudget: '',
      maxBudget: '',
      platform: '',
      niche: '',
      search: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      dateRange: 'all',
      startDate: null,
      endDate: null,
      location: '',
      minFollowers: '',
      maxFollowers: '',
      minEngagement: '',
      verified: false,
      available: false,
    });
  }, []);

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  const buildQueryParams = useCallback(() => {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
    };

    if (filters.status && filters.status !== 'all') params.status = filters.status;
    if (filters.category) params.category = filters.category;
    if (filters.minBudget) params.minBudget = filters.minBudget;
    if (filters.maxBudget) params.maxBudget = filters.maxBudget;
    if (filters.platform) params.platform = filters.platform;
    if (filters.niche) params.niche = filters.niche;
    if (filters.search) params.search = filters.search;
    if (filters.location) params.location = filters.location;
    if (filters.minFollowers) params.minFollowers = filters.minFollowers;
    if (filters.maxFollowers) params.maxFollowers = filters.maxFollowers;
    if (filters.minEngagement) params.minEngagement = filters.minEngagement;
    if (filters.verified) params.verified = true;
    if (filters.available) params.available = true;

    if (filters.dateRange === 'custom') {
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
    } else if (filters.dateRange !== 'all') {
      params.dateRange = filters.dateRange;
    }

    if (filters.sortBy && filters.sortOrder) {
      params.sortBy = filters.sortBy;
      params.sortOrder = filters.sortOrder;
    }

    return params;
  }, [filters, pagination.page, pagination.limit]);

  const fetchBrandCampaigns = useCallback(async () => {
    if (!isAuthenticated || user?.userType !== 'brand') return;

    try {
      setLoading(true);
      setError(null);
      const params = buildQueryParams();
      const response = await api.get('/campaigns/brand', { params });

      if (response.data?.success) {
        setCampaigns(response.data.campaigns || []);
        setPagination(response.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 1,
        });
        setCounts(response.data.counts || {});
      } else {
        const errorMsg = response.data?.error || 'Failed to load campaigns';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load campaigns';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, buildQueryParams]);

  const fetchAvailableCampaigns = useCallback(async () => {
    if (!isAuthenticated || user?.userType !== 'creator') return;

    try {
      setLoading(true);
      setError(null);
      const params = buildQueryParams();
      const response = await api.get('/campaigns/available', { params });

      if (response.data?.success) {
        setCampaigns(response.data.campaigns || []);
        setPagination(response.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 1,
        });
      } else {
        const errorMsg = response.data?.error || 'Failed to load campaigns';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load campaigns';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, buildQueryParams]);

  const fetchCampaign = useCallback(async (campaignId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/campaigns/${campaignId}`);

      if (response.data?.success) {
        setCurrentCampaign(response.data.campaign);
        return response.data.campaign;
      } else {
        const errorMsg = response.data?.error || 'Failed to load campaign';
        setError(errorMsg);
        toast.error(errorMsg);
        return null;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load campaign';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCampaign = useCallback(async (campaignData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/campaigns', campaignData);

      if (response.data?.success) {
        toast.success('Campaign created successfully');
        await fetchBrandCampaigns();
        return response.data.campaign;
      } else {
        const errorMsg = response.data?.error || 'Failed to create campaign';
        setError(errorMsg);
        toast.error(errorMsg);
        return null;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to create campaign';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchBrandCampaigns]);

  const updateCampaign = useCallback(async (campaignId, campaignData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.put(`/campaigns/${campaignId}`, campaignData);

      if (response.data?.success) {
        toast.success('Campaign updated successfully');
        await fetchBrandCampaigns();
        if (currentCampaign?._id === campaignId) {
          setCurrentCampaign(response.data.campaign);
        }
        return response.data.campaign;
      } else {
        const errorMsg = response.data?.error || 'Failed to update campaign';
        setError(errorMsg);
        toast.error(errorMsg);
        return null;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to update campaign';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchBrandCampaigns, currentCampaign]);

  const deleteCampaign = useCallback(async (campaignId) => {
    if (!window.confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return false;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await api.delete(`/campaigns/${campaignId}`);

      if (response.data?.success) {
        toast.success('Campaign deleted successfully');
        await fetchBrandCampaigns();
        if (currentCampaign?._id === campaignId) {
          setCurrentCampaign(null);
        }
        return true;
      } else {
        const errorMsg = response.data?.error || 'Failed to delete campaign';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to delete campaign';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchBrandCampaigns, currentCampaign]);

  const publishCampaign = useCallback(async (campaignId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/campaigns/${campaignId}/publish`);

      if (response.data?.success) {
        toast.success('Campaign published successfully');
        await fetchBrandCampaigns();
        if (currentCampaign?._id === campaignId) {
          setCurrentCampaign(prev => ({ ...prev, status: 'active' }));
        }
        return true;
      } else {
        const errorMsg = response.data?.error || 'Failed to publish campaign';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to publish campaign';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchBrandCampaigns, currentCampaign]);

  const pauseCampaign = useCallback(async (campaignId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/campaigns/${campaignId}/pause`);

      if (response.data?.success) {
        toast.success('Campaign paused');
        await fetchBrandCampaigns();
        if (currentCampaign?._id === campaignId) {
          setCurrentCampaign(prev => ({ ...prev, status: 'paused' }));
        }
        return true;
      } else {
        const errorMsg = response.data?.error || 'Failed to pause campaign';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to pause campaign';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchBrandCampaigns, currentCampaign]);

  const archiveCampaign = useCallback(async (campaignId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/campaigns/${campaignId}/archive`);

      if (response.data?.success) {
        toast.success('Campaign archived');
        await fetchBrandCampaigns();
        if (currentCampaign?._id === campaignId) {
          setCurrentCampaign(prev => ({ ...prev, status: 'archived' }));
        }
        return true;
      } else {
        const errorMsg = response.data?.error || 'Failed to archive campaign';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to archive campaign';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchBrandCampaigns, currentCampaign]);

  const duplicateCampaign = useCallback(async (campaignId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/campaigns/${campaignId}/duplicate`);

      if (response.data?.success) {
        toast.success('Campaign duplicated');
        await fetchBrandCampaigns();
        return response.data.campaign;
      } else {
        const errorMsg = response.data?.error || 'Failed to duplicate campaign';
        setError(errorMsg);
        toast.error(errorMsg);
        return null;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to duplicate campaign';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchBrandCampaigns]);

  const applyToCampaign = useCallback(async (campaignId, applicationData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/campaigns/${campaignId}/apply`, applicationData);

      if (response.data?.success) {
        toast.success('Application submitted successfully');
        return true;
      } else {
        const errorMsg = response.data?.error || 'Failed to submit application';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to submit application';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const reviewApplication = useCallback(async (campaignId, applicationId, status, feedback) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.put(`/campaigns/${campaignId}/applications/${applicationId}`, { status, feedback });

      if (response.data?.success) {
        toast.success(`Application ${status}`);
        await fetchCampaign(campaignId);
        return true;
      } else {
        const errorMsg = response.data?.error || `Failed to ${status} application`;
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to review application';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchCampaign]);

  const inviteCreator = useCallback(async (campaignId, creatorId, message) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/campaigns/${campaignId}/invite`, { creatorId, message });

      if (response.data?.success) {
        toast.success('Creator invited successfully');
        return true;
      } else {
        const errorMsg = response.data?.error || 'Failed to invite creator';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to invite creator';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getCampaignAnalytics = useCallback(async (campaignId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/campaigns/${campaignId}/analytics`);

      if (response.data?.success) {
        return response.data.metrics || {};
      } else {
        const errorMsg = response.data?.error || 'Failed to load analytics';
        setError(errorMsg);
        toast.error(errorMsg);
        return null;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load analytics';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const setPage = useCallback((page) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const setLimit = useCallback((limit) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }));
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.userType === 'brand') {
        fetchBrandCampaigns();
      } else if (user?.userType === 'creator') {
        fetchAvailableCampaigns();
      }
    }
  }, [
    isAuthenticated,
    user,
    filters,
    pagination.page,
    pagination.limit,
    fetchBrandCampaigns,
    fetchAvailableCampaigns,
  ]);

  const value = {
    campaigns,
    currentCampaign,
    loading,
    error,
    pagination,
    counts,
    filters,
    filterOptions,
    updateFilter,
    updateFilters,
    resetFilters,
    setPage,
    setLimit,
    fetchBrandCampaigns,
    fetchAvailableCampaigns,
    fetchCampaign,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    applyToCampaign,
    reviewApplication,
    inviteCreator,
    publishCampaign,
    pauseCampaign,
    archiveCampaign,
    duplicateCampaign,
    getCampaignAnalytics,
    setCurrentCampaign,
  };

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
};

export default CampaignContext;