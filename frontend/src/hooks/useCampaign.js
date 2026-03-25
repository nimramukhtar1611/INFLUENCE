// hooks/useCampaign.js - COMPLETE FIXED VERSION
import { useState, useCallback } from 'react';
import campaignService from '../services/campaignService';
import toast from 'react-hot-toast';

export const useCampaign = () => {
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [currentCampaign, setCurrentCampaign] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });
  const [counts, setCounts] = useState({});
  const [error, setError] = useState(null);

  // ==================== FETCH BRAND CAMPAIGNS ====================
  const fetchBrandCampaigns = useCallback(async (status = 'all', page = 1) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching brand campaigns with status:', status, 'page:', page);
      
      const response = await campaignService.getBrandCampaigns(status, page, 10);
      
      console.log('Campaigns response:', response);
      
      if (response?.success) {
        setCampaigns(response.campaigns || []);
        setPagination(response.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 1
        });
        setCounts(response.counts || {});
      } else {
        const errorMsg = response?.error || 'Failed to load campaigns';
        setError(errorMsg);
        toast.error(errorMsg);
        setCampaigns([]);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      const errorMsg = error?.response?.data?.message || error.message || 'Failed to load campaigns';
      setError(errorMsg);
      toast.error(errorMsg);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== FETCH AVAILABLE CAMPAIGNS (FOR CREATORS) ====================
  const fetchAvailableCampaigns = useCallback(async (filters = {}, page = 1) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching available campaigns with filters:', filters, 'page:', page);
      
      const response = await campaignService.getAvailableCampaigns(filters, page, 10);
      
      console.log('Available campaigns response:', response);
      
      if (response?.success) {
        setCampaigns(response.campaigns || []);
        setPagination(response.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 1
        });
      } else {
        const errorMsg = response?.error || 'Failed to load campaigns';
        setError(errorMsg);
        toast.error(errorMsg);
        setCampaigns([]);
      }
    } catch (error) {
      console.error('Error fetching available campaigns:', error);
      const errorMsg = error?.response?.data?.message || error.message || 'Failed to load campaigns';
      setError(errorMsg);
      toast.error(errorMsg);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== FETCH SINGLE CAMPAIGN ====================
  const fetchCampaign = useCallback(async (campaignId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await campaignService.getCampaign(campaignId);
      
      if (response?.success) {
        setCurrentCampaign(response.campaign);
        return response.campaign;
      } else {
        const errorMsg = response?.error || 'Failed to load campaign';
        setError(errorMsg);
        toast.error(errorMsg);
        return null;
      }
    } catch (error) {
      console.error('Error fetching campaign:', error);
      const errorMsg = error?.response?.data?.message || error.message || 'Failed to load campaign';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== CREATE CAMPAIGN ====================
  const createCampaign = useCallback(async (campaignData) => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate required fields
      if (!campaignData.title || !campaignData.description || !campaignData.budget) {
        throw new Error('Title, description, and budget are required');
      }

      const response = await campaignService.createCampaign(campaignData);
      
      if (response?.success) {
        toast.success('Campaign created successfully');
        setCampaigns(prev => [response.campaign, ...prev]);
        return response.campaign;
      } else {
        const errorMsg = response?.error || 'Failed to create campaign';
        setError(errorMsg);
        toast.error(errorMsg);
        return null;
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      const errorMsg = error?.response?.data?.message || error.message || 'Failed to create campaign';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== UPDATE CAMPAIGN ====================
  const updateCampaign = useCallback(async (campaignId, campaignData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await campaignService.updateCampaign(campaignId, campaignData);
      
      if (response?.success) {
        toast.success('Campaign updated successfully');
        
        // Update in list
        setCampaigns(prev => prev.map(c => 
          c._id === campaignId ? response.campaign : c
        ));
        
        // Update current if loaded
        if (currentCampaign?._id === campaignId) {
          setCurrentCampaign(response.campaign);
        }
        
        return response.campaign;
      } else {
        const errorMsg = response?.error || 'Failed to update campaign';
        setError(errorMsg);
        toast.error(errorMsg);
        return null;
      }
    } catch (error) {
      console.error('Error updating campaign:', error);
      const errorMsg = error?.response?.data?.message || error.message || 'Failed to update campaign';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentCampaign]);

  // ==================== DELETE CAMPAIGN ====================
  const deleteCampaign = useCallback(async (campaignId) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!window.confirm('Are you sure you want to delete this campaign?')) {
        return false;
      }

      const response = await campaignService.deleteCampaign(campaignId);
      
      if (response?.success) {
        toast.success('Campaign deleted successfully');
        setCampaigns(prev => prev.filter(c => c._id !== campaignId));
        
        if (currentCampaign?._id === campaignId) {
          setCurrentCampaign(null);
        }
        
        return true;
      } else {
        const errorMsg = response?.error || 'Failed to delete campaign';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      const errorMsg = error?.response?.data?.message || error.message || 'Failed to delete campaign';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentCampaign]);

  // ==================== PUBLISH CAMPAIGN ====================
  const publishCampaign = useCallback(async (campaignId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await campaignService.publishCampaign(campaignId);
      
      if (response?.success) {
        toast.success('Campaign published successfully');
        
        // Update status in list
        setCampaigns(prev => prev.map(c => 
          c._id === campaignId ? { ...c, status: 'active' } : c
        ));
        
        // Update current if loaded
        if (currentCampaign?._id === campaignId) {
          setCurrentCampaign(prev => ({ ...prev, status: 'active' }));
        }
        
        return true;
      } else {
        const errorMsg = response?.error || 'Failed to publish campaign';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (error) {
      console.error('Error publishing campaign:', error);
      const errorMsg = error?.response?.data?.message || error.message || 'Failed to publish campaign';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentCampaign]);

  // ==================== PAUSE CAMPAIGN ====================
  const pauseCampaign = useCallback(async (campaignId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await campaignService.pauseCampaign(campaignId);
      
      if (response?.success) {
        toast.success('Campaign paused');
        
        setCampaigns(prev => prev.map(c => 
          c._id === campaignId ? { ...c, status: 'paused' } : c
        ));
        
        if (currentCampaign?._id === campaignId) {
          setCurrentCampaign(prev => ({ ...prev, status: 'paused' }));
        }
        
        return true;
      } else {
        const errorMsg = response?.error || 'Failed to pause campaign';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (error) {
      console.error('Error pausing campaign:', error);
      const errorMsg = error?.response?.data?.message || error.message || 'Failed to pause campaign';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentCampaign]);

  // ==================== ARCHIVE CAMPAIGN ====================
  const archiveCampaign = useCallback(async (campaignId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await campaignService.archiveCampaign(campaignId);
      
      if (response?.success) {
        toast.success('Campaign archived');
        
        setCampaigns(prev => prev.map(c => 
          c._id === campaignId ? { ...c, status: 'archived' } : c
        ));
        
        if (currentCampaign?._id === campaignId) {
          setCurrentCampaign(prev => ({ ...prev, status: 'archived' }));
        }
        
        return true;
      } else {
        const errorMsg = response?.error || 'Failed to archive campaign';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (error) {
      console.error('Error archiving campaign:', error);
      const errorMsg = error?.response?.data?.message || error.message || 'Failed to archive campaign';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentCampaign]);

  // ==================== DUPLICATE CAMPAIGN ====================
  const duplicateCampaign = useCallback(async (campaignId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await campaignService.duplicateCampaign(campaignId);
      
      if (response?.success) {
        toast.success('Campaign duplicated');
        setCampaigns(prev => [response.campaign, ...prev]);
        return response.campaign;
      } else {
        const errorMsg = response?.error || 'Failed to duplicate campaign';
        setError(errorMsg);
        toast.error(errorMsg);
        return null;
      }
    } catch (error) {
      console.error('Error duplicating campaign:', error);
      const errorMsg = error?.response?.data?.message || error.message || 'Failed to duplicate campaign';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== APPLY TO CAMPAIGN (CREATOR) ====================
  const applyToCampaign = useCallback(async (campaignId, applicationData) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!applicationData.proposal) {
        throw new Error('Proposal is required');
      }

      const response = await campaignService.applyToCampaign(campaignId, applicationData);
      
      if (response?.success) {
        toast.success('Application submitted successfully');
        return true;
      } else {
        const errorMsg = response?.error || 'Failed to submit application';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (error) {
      console.error('Error applying to campaign:', error);
      const errorMsg = error?.response?.data?.message || error.message || 'Failed to submit application';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== REVIEW APPLICATION (BRAND) ====================
  const reviewApplication = useCallback(async (campaignId, applicationId, status, feedback) => {
    try {
      setLoading(true);
      setError(null);
      const response = await campaignService.reviewApplication(campaignId, applicationId, status, feedback);
      
      if (response?.success) {
        toast.success(`Application ${status}`);
        
        // Refresh campaign to get updated applications
        if (currentCampaign?._id === campaignId) {
          await fetchCampaign(campaignId);
        }
        
        return true;
      } else {
        const errorMsg = response?.error || `Failed to ${status} application`;
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (error) {
      console.error('Error reviewing application:', error);
      const errorMsg = error?.response?.data?.message || error.message || 'Failed to review application';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentCampaign, fetchCampaign]);

  // ==================== INVITE CREATOR ====================
  const inviteCreator = useCallback(async (campaignId, creatorId, message) => {
    try {
      setLoading(true);
      setError(null);
      const response = await campaignService.inviteCreator(campaignId, creatorId, message);
      
      if (response?.success) {
        toast.success('Creator invited successfully');
        return true;
      } else {
        const errorMsg = response?.error || 'Failed to invite creator';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (error) {
      console.error('Error inviting creator:', error);
      const errorMsg = error?.response?.data?.message || error.message || 'Failed to invite creator';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== GET CAMPAIGN ANALYTICS ====================
  const getCampaignAnalytics = useCallback(async (campaignId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await campaignService.getCampaignAnalytics(campaignId);
      
      if (response?.success) {
        return response.metrics || {};
      } else {
        const errorMsg = response?.error || 'Failed to load analytics';
        setError(errorMsg);
        toast.error(errorMsg);
        return null;
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      const errorMsg = error?.response?.data?.message || error.message || 'Failed to load analytics';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== EXPORT CAMPAIGN REPORT ====================
  const exportCampaignReport = useCallback(async (campaignId, format = 'pdf') => {
    try {
      setLoading(true);
      setError(null);
      const response = await campaignService.exportCampaignReport(campaignId, format);
      
      if (response?.success) {
        toast.success('Report downloaded');
        return true;
      } else {
        const errorMsg = response?.error || 'Failed to export report';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      const errorMsg = error?.response?.data?.message || error.message || 'Failed to export report';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== RESET ERROR ====================
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    campaigns,
    currentCampaign,
    pagination,
    counts,
    error,
    fetchBrandCampaigns,
    fetchAvailableCampaigns,
    fetchCampaign,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    publishCampaign,
    pauseCampaign,
    archiveCampaign,
    duplicateCampaign,
    applyToCampaign,
    reviewApplication,
    inviteCreator,
    getCampaignAnalytics,
    exportCampaignReport,
    resetError
  };
};

export default useCampaign;