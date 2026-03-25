// hooks/useDeal.js - COMPLETE FIXED VERSION
import { useState, useCallback } from 'react';
import dealService from '../services/dealService';
import toast from 'react-hot-toast';
import api from '../services/api'
export const useDeal = () => {
  const [loading, setLoading] = useState(false);
  const [deals, setDeals] = useState([]);
  const [currentDeal, setCurrentDeal] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });
  const [counts, setCounts] = useState({});

  // ==================== VALID STATUS TRANSITIONS ====================
  const validTransitions = {
    'pending': ['accepted', 'declined', 'cancelled', 'negotiating'],
    'negotiating': ['pending', 'accepted', 'declined', 'cancelled'],
    'accepted': ['in-progress', 'cancelled'],
    'in-progress': ['completed', 'revision', 'cancelled', 'disputed'],
    'revision': ['in-progress', 'cancelled', 'disputed'],
    'completed': [],
    'cancelled': [],
    'disputed': ['resolved', 'cancelled']
  };

  // ==================== CHECK IF STATUS TRANSITION IS VALID ====================
  const isValidTransition = useCallback((currentStatus, newStatus) => {
    if (currentStatus === newStatus) return true;
    const allowed = validTransitions[currentStatus] || [];
    return allowed.includes(newStatus);
  }, []);

  // ==================== FETCH DEALS (BRAND) ====================
  const fetchBrandDeals = useCallback(async (status = 'all', page = 1) => {
    try {
      setLoading(true);
      console.log('Fetching brand deals with status:', status, 'page:', page);
      
      const response = await dealService.getBrandDeals(
        status === 'all' ? '' : status,
        page,
        10
      );
      
      console.log('Brand deals response:', response);
      
      if (response?.success) {
        setDeals(response.deals || []);
        setPagination(response.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 1
        });
        setCounts(response.counts || {});
      } else {
        console.error('Failed to fetch deals:', response?.error);
        toast.error(response?.error || 'Failed to load deals');
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
      toast.error('Failed to load deals');
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== FETCH DEALS (CREATOR) ====================
  const fetchCreatorDeals = useCallback(async (status = 'all', page = 1) => {
    try {
      setLoading(true);
      console.log('Fetching creator deals with status:', status, 'page:', page);
      
      const response = await dealService.getCreatorDeals(
        status === 'all' ? '' : status,
        page,
        10
      );
      
      console.log('Creator deals response:', response);
      
      if (response?.success) {
        setDeals(response.deals || []);
        setPagination({
          page: response.pagination?.page || 1,
          limit: response.pagination?.limit || 10,
          total: response.pagination?.total || 0,
          pages: response.pagination?.pages || 1
        });
        setCounts(response.counts || {});
      } else {
        console.error('Failed to fetch deals:', response?.error);
        toast.error(response?.error || 'Failed to load deals');
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
      toast.error('Failed to load deals');
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== FETCH SINGLE DEAL ====================
// hooks/useDeal.js – inside the hook

const fetchDeal = useCallback(async (id) => {
  try {
    setLoading(true);
    const response = await dealService.getDeal(id);
    if (response?.success && response.deal) {
      setCurrentDeal(response.deal);
      return response.deal;
    } else {
      console.error('Deal not found or invalid response', response);
      return null;
    }
  } catch (error) {
    console.error('Error fetching deal:', error);
    return null;
  } finally {
    setLoading(false);
  }
}, []);
  // ==================== CREATE DEAL ====================
  const createDeal = useCallback(async (dealData) => {
    try {
      setLoading(true);
      const response = await dealService.createDeal(dealData);
      
      if (response?.success) {
        toast.success('Deal offer sent successfully');
        setDeals(prev => [response.deal, ...prev]);
        return response.deal;
      } else {
        toast.error(response?.error || 'Failed to create deal');
        return null;
      }
    } catch (error) {
      console.error('Error creating deal:', error);
      toast.error('Failed to create deal');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== UPDATE DEAL STATUS (FIXED) ====================
  const updateDealStatus = useCallback(async (dealId, newStatus, reason = '') => {
    try {
      setLoading(true);
      
      // Check if transition is valid
      if (!isValidTransition(currentDeal?.status, newStatus)) {
        toast.error(`Cannot transition from ${currentDeal?.status} to ${newStatus}`);
        return false;
      }

      const response = await dealService.updateDealStatus(dealId, newStatus, reason);
      
      if (response?.success) {
        // Update deals list
        setDeals(prev => prev.map(d => 
          d._id === dealId ? { ...d, status: newStatus } : d
        ));
        
        // Update current deal if loaded
        if (currentDeal?._id === dealId) {
          setCurrentDeal(prev => ({ ...prev, status: newStatus }));
        }
        
        toast.success(`Deal ${newStatus} successfully`);
        return true;
      } else {
        toast.error(response?.error || `Failed to ${newStatus} deal`);
        return false;
      }
    } catch (error) {
      console.error('Error updating deal status:', error);
      toast.error('Failed to update deal status');
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentDeal, isValidTransition]);

  // ==================== ACCEPT DEAL ====================
  const acceptDeal = useCallback(async (dealId) => {
    return updateDealStatus(dealId, 'accepted');
  }, [updateDealStatus]);

  // ==================== REJECT DEAL ====================
  const rejectDeal = useCallback(async (dealId, reason) => {
    return updateDealStatus(dealId, 'declined', reason);
  }, [updateDealStatus]);

  // ==================== START DEAL (MARK IN PROGRESS) ====================
  const startDeal = useCallback(async (dealId) => {
    return updateDealStatus(dealId, 'in-progress');
  }, [updateDealStatus]);

  // ==================== COMPLETE DEAL ====================
  const completeDeal = useCallback(async (dealId) => {
    try {
      setLoading(true);
      const response = await dealService.completeDeal(dealId);
      
      if (response?.success) {
        setDeals(prev => prev.map(d => 
          d._id === dealId ? { ...d, status: 'completed' } : d
        ));
        
        if (currentDeal?._id === dealId) {
          setCurrentDeal(prev => ({ ...prev, status: 'completed' }));
        }
        
        toast.success('Deal completed successfully');
        return true;
      } else {
        toast.error(response?.error || 'Failed to complete deal');
        return false;
      }
    } catch (error) {
      console.error('Error completing deal:', error);
      toast.error('Failed to complete deal');
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentDeal]);

  // ==================== CANCEL DEAL ====================
  const cancelDeal = useCallback(async (dealId, reason) => {
    return updateDealStatus(dealId, 'cancelled', reason);
  }, [updateDealStatus]);

  // ==================== REQUEST REVISION ====================
  const requestRevision = useCallback(async (dealId, deliverableId, notes) => {
    try {
      setLoading(true);
      const response = await dealService.requestRevision(dealId, deliverableId, notes);
      
      if (response?.success) {
        setDeals(prev => prev.map(d => 
          d._id === dealId ? { ...d, status: 'revision' } : d
        ));
        
        if (currentDeal?._id === dealId) {
          setCurrentDeal(prev => ({ ...prev, status: 'revision' }));
        }
        
        toast.success('Revision requested');
        return true;
      } else {
        toast.error(response?.error || 'Failed to request revision');
        return false;
      }
    } catch (error) {
      console.error('Error requesting revision:', error);
      toast.error('Failed to request revision');
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentDeal]);

  // ==================== COUNTER OFFER ====================
  const counterOffer = useCallback(async (dealId, counterData) => {
    try {
      setLoading(true);
      const response = await dealService.counterOffer(dealId, counterData);
      
      if (response?.success) {
        setDeals(prev => prev.map(d => 
          d._id === dealId ? { ...d, status: 'negotiating' } : d
        ));
        
        if (currentDeal?._id === dealId) {
          setCurrentDeal(prev => ({ ...prev, status: 'negotiating' }));
        }
        
        toast.success('Counter offer sent');
        return response.deal;
      } else {
        toast.error(response?.error || 'Failed to send counter offer');
        return null;
      }
    } catch (error) {
      console.error('Error sending counter offer:', error);
      toast.error('Failed to send counter offer');
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentDeal]);

  // ==================== GET DEAL MESSAGES ====================
  const getDealMessages = useCallback(async (dealId) => {
    try {
      const response = await dealService.getDealMessages(dealId);
      
      if (response?.success) {
        return response.messages || [];
      } else {
        return [];
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }, []);

  // ==================== SEND MESSAGE ====================
  const sendMessage = useCallback(async (dealId, content, attachments = []) => {
    try {
      const response = await dealService.sendMessage(dealId, content, attachments);
      
      if (response?.success) {
        return response.message;
      } else {
        toast.error('Failed to send message');
        return null;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return null;
    }
  }, []);

  // ==================== SUBMIT DELIVERABLES ====================
  const submitDeliverables = useCallback(async (dealId, deliverables) => {
    try {
      setLoading(true);
      const response = await dealService.submitDeliverables(dealId, deliverables);
      
      if (response?.success) {
        toast.success('Deliverables submitted');
        return true;
      } else {
        toast.error(response?.error || 'Failed to submit deliverables');
        return false;
      }
    } catch (error) {
      console.error('Error submitting deliverables:', error);
      toast.error('Failed to submit deliverables');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== APPROVE DELIVERABLE ====================
  const approveDeliverable = useCallback(async (dealId, deliverableId, feedback) => {
    try {
      setLoading(true);
      const response = await dealService.approveDeliverable(dealId, deliverableId, feedback);
      
      if (response?.success) {
        toast.success('Deliverable approved');
        
        // Refresh deal to get updated status
        if (currentDeal?._id === dealId) {
          await fetchDeal(dealId);
        }
        
        return true;
      } else {
        toast.error(response?.error || 'Failed to approve deliverable');
        return false;
      }
    } catch (error) {
      console.error('Error approving deliverable:', error);
      toast.error('Failed to approve deliverable');
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentDeal, fetchDeal]);

  return {
    loading,
    deals,
    currentDeal,
    pagination,
    counts,
    validTransitions,
    isValidTransition,
    fetchBrandDeals,
    fetchCreatorDeals,
    fetchDeal,
    createDeal,
    updateDealStatus,
    acceptDeal,
    rejectDeal,
    startDeal,
    completeDeal,
    cancelDeal,
    requestRevision,
    counterOffer,
    getDealMessages,
    sendMessage,
    submitDeliverables,
    approveDeliverable
  };
};

export default useDeal;