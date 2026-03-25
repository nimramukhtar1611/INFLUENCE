import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import toast from 'react-hot-toast';

const DealContext = createContext();

export const useDeal = () => {
  const context = useContext(DealContext);
  if (!context) {
    throw new Error('useDeal must be used within a DealProvider');
  }
  return context;
};

export const DealProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const [deals, setDeals] = useState([]);
  const [currentDeal, setCurrentDeal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [counts, setCounts] = useState({});

  // ==================== VALID STATUS TRANSITIONS ====================
  const validTransitions = {
    pending: ['accepted', 'declined', 'cancelled', 'negotiating'],
    negotiating: ['pending', 'accepted', 'declined', 'cancelled'],
    accepted: ['in-progress', 'cancelled'],
    'in-progress': ['completed', 'revision', 'cancelled', 'disputed'],
    revision: ['in-progress', 'cancelled', 'disputed'],
    completed: [],
    cancelled: [],
    disputed: ['resolved', 'cancelled'],
    overdue: ['in-progress', 'completed', 'cancelled'],
  };

  // ==================== STATUS CONFIGURATION ====================
  const statusConfig = {
    pending: {
      label: 'Pending',
      color: 'bg-yellow-100 text-yellow-800',
      icon: '⏳',
      nextActions: ['accept', 'reject', 'counter'],
    },
    accepted: {
      label: 'Accepted',
      color: 'bg-blue-100 text-blue-800',
      icon: '✅',
      nextActions: ['start', 'cancel'],
    },
    'in-progress': {
      label: 'In Progress',
      color: 'bg-purple-100 text-purple-800',
      icon: '⚙️',
      nextActions: ['complete', 'cancel', 'revision'],
    },
    completed: {
      label: 'Completed',
      color: 'bg-green-100 text-green-800',
      icon: '🏆',
      nextActions: ['review'],
    },
    cancelled: {
      label: 'Cancelled',
      color: 'bg-red-100 text-red-800',
      icon: '❌',
      nextActions: [],
    },
    declined: {
      label: 'Declined',
      color: 'bg-red-100 text-red-800',
      icon: '❌',
      nextActions: [],
    },
    revision: {
      label: 'Revision',
      color: 'bg-orange-100 text-orange-800',
      icon: '🔄',
      nextActions: ['submit', 'cancel'],
    },
    negotiating: {
      label: 'Negotiating',
      color: 'bg-indigo-100 text-indigo-800',
      icon: '🤝',
      nextActions: ['accept', 'reject', 'counter'],
    },
    disputed: {
      label: 'Disputed',
      color: 'bg-red-100 text-red-800',
      icon: '⚠️',
      nextActions: ['resolve'],
    },
    overdue: {
      label: 'Overdue',
      color: 'bg-red-100 text-red-800',
      icon: '⏰',
      nextActions: ['contact', 'cancel'],
    },
  };

  // ==================== FETCH BRAND DEALS ====================
  const fetchBrandDeals = useCallback(async (status = 'all', page = 1) => {
    if (!isAuthenticated || user?.userType !== 'brand') return;

    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/deals/brand', {
        params: {
          status: status === 'all' ? '' : status,
          page,
          limit: 10,
        },
      });

      if (response.data?.success) {
        setDeals(response.data.deals || []);
        setPagination(response.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 1,
        });
        setCounts(response.data.counts || {});
      } else {
        const errorMsg = response.data?.error || 'Failed to load deals';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load deals';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // ==================== FETCH CREATOR DEALS ====================
  const fetchCreatorDeals = useCallback(async (status = 'all', page = 1) => {
    if (!isAuthenticated || user?.userType !== 'creator') return;

    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/deals/creator', {
        params: {
          status: status === 'all' ? '' : status,
          page,
          limit: 10,
        },
      });

      if (response.data?.success) {
        setDeals(response.data.deals || []);
        setPagination(response.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 1,
        });
        setCounts(response.data.counts || {});
      } else {
        const errorMsg = response.data?.error || 'Failed to load deals';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load deals';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // ==================== FETCH SINGLE DEAL ====================
  const fetchDeal = useCallback(async (dealId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/deals/${dealId}`);

      if (response.data?.success) {
        setCurrentDeal(response.data.deal);
        return response.data.deal;
      } else {
        const errorMsg = response.data?.error || 'Failed to load deal';
        setError(errorMsg);
        toast.error(errorMsg);
        return null;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load deal';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== CREATE DEAL ====================
  const createDeal = useCallback(async (dealData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/deals', dealData);

      if (response.data?.success) {
        toast.success('Deal offer sent successfully');
        if (user?.userType === 'brand') {
          await fetchBrandDeals();
        } else {
          await fetchCreatorDeals();
        }
        return response.data.deal;
      } else {
        const errorMsg = response.data?.error || 'Failed to create deal';
        setError(errorMsg);
        toast.error(errorMsg);
        return null;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to create deal';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, fetchBrandDeals, fetchCreatorDeals]);

  // ==================== UPDATE DEAL STATUS ====================
  const updateDealStatus = useCallback(async (dealId, newStatus, reason = '') => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.put(`/deals/${dealId}/status`, { status: newStatus, reason });

      if (response.data?.success) {
        setDeals(prev =>
          prev.map(deal => (deal._id === dealId ? { ...deal, status: newStatus } : deal))
        );
        if (currentDeal?._id === dealId) {
          setCurrentDeal(prev => ({ ...prev, status: newStatus }));
        }
        toast.success(`Deal ${newStatus} successfully`);
        return true;
      } else {
        const errorMsg = response.data?.error || `Failed to ${newStatus} deal`;
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || `Failed to ${newStatus} deal`;
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentDeal]);

  // ==================== ACCEPT DEAL ====================
  const acceptDeal = useCallback(async (dealId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/deals/${dealId}/accept`);

      if (response.data?.success) {
        toast.success('Deal accepted successfully');
        if (user?.userType === 'brand') {
          await fetchBrandDeals();
        } else {
          await fetchCreatorDeals();
        }
        return true;
      } else {
        const errorMsg = response.data?.error || 'Failed to accept deal';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to accept deal';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, fetchBrandDeals, fetchCreatorDeals]);

  // ==================== REJECT DEAL ====================
  const rejectDeal = useCallback(async (dealId, reason) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/deals/${dealId}/reject`, { reason });

      if (response.data?.success) {
        toast.success('Deal rejected');
        if (user?.userType === 'brand') {
          await fetchBrandDeals();
        } else {
          await fetchCreatorDeals();
        }
        return true;
      } else {
        const errorMsg = response.data?.error || 'Failed to reject deal';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to reject deal';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, fetchBrandDeals, fetchCreatorDeals]);

  // ==================== START DEAL (MARK IN PROGRESS) ====================
  const startDeal = useCallback(async (dealId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/deals/${dealId}/start`);

      if (response.data?.success) {
        toast.success('Deal started');
        if (user?.userType === 'brand') {
          await fetchBrandDeals();
        } else {
          await fetchCreatorDeals();
        }
        return true;
      } else {
        const errorMsg = response.data?.error || 'Failed to start deal';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to start deal';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, fetchBrandDeals, fetchCreatorDeals]);

  // ==================== COMPLETE DEAL ====================
  const completeDeal = useCallback(async (dealId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/deals/${dealId}/complete`);

      if (response.data?.success) {
        toast.success('Deal completed successfully');
        if (user?.userType === 'brand') {
          await fetchBrandDeals();
        } else {
          await fetchCreatorDeals();
        }
        return true;
      } else {
        const errorMsg = response.data?.error || 'Failed to complete deal';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to complete deal';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, fetchBrandDeals, fetchCreatorDeals]);

  // ==================== CANCEL DEAL ====================
  const cancelDeal = useCallback(async (dealId, reason) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/deals/${dealId}/cancel`, { reason });

      if (response.data?.success) {
        toast.success('Deal cancelled');
        if (user?.userType === 'brand') {
          await fetchBrandDeals();
        } else {
          await fetchCreatorDeals();
        }
        return true;
      } else {
        const errorMsg = response.data?.error || 'Failed to cancel deal';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to cancel deal';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, fetchBrandDeals, fetchCreatorDeals]);

  // ==================== REQUEST REVISION ====================
  const requestRevision = useCallback(async (dealId, deliverableId, notes) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/deals/${dealId}/revision`, { deliverableId, notes });

      if (response.data?.success) {
        toast.success('Revision requested');
        if (currentDeal?._id === dealId) {
          await fetchDeal(dealId);
        }
        return true;
      } else {
        const errorMsg = response.data?.error || 'Failed to request revision';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to request revision';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentDeal, fetchDeal]);

  // ==================== COUNTER OFFER ====================
  const counterOffer = useCallback(async (dealId, counterData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/deals/${dealId}/counter`, counterData);

      if (response.data?.success) {
        toast.success('Counter offer sent');
        if (currentDeal?._id === dealId) {
          await fetchDeal(dealId);
        } else {
          if (user?.userType === 'brand') {
            await fetchBrandDeals();
          } else {
            await fetchCreatorDeals();
          }
        }
        return response.data.deal;
      } else {
        const errorMsg = response.data?.error || 'Failed to send counter offer';
        setError(errorMsg);
        toast.error(errorMsg);
        return null;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to send counter offer';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, currentDeal, fetchDeal, fetchBrandDeals, fetchCreatorDeals]);

  // ==================== GET DEAL MESSAGES ====================
  const getDealMessages = useCallback(async (dealId) => {
    try {
      const response = await api.get(`/deals/${dealId}/messages`);
      if (response.data?.success) {
        return response.data.messages || [];
      }
      return [];
    } catch (err) {
      console.error('Error fetching messages:', err);
      return [];
    }
  }, []);

  // ==================== SEND MESSAGE ====================
  const sendMessage = useCallback(async (dealId, content, attachments = []) => {
    try {
      const response = await api.post(`/deals/${dealId}/messages`, { content, attachments });
      if (response.data?.success) {
        if (currentDeal?._id === dealId) {
          await fetchDeal(dealId);
        }
        return response.data.message;
      }
      return null;
    } catch (err) {
      toast.error('Failed to send message');
      return null;
    }
  }, [currentDeal, fetchDeal]);

  // ==================== SUBMIT DELIVERABLES ====================
  const submitDeliverables = useCallback(async (dealId, deliverables) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/deals/${dealId}/deliverables`, { deliverables });

      if (response.data?.success) {
        toast.success('Deliverables submitted');
        if (currentDeal?._id === dealId) {
          await fetchDeal(dealId);
        }
        return true;
      } else {
        const errorMsg = response.data?.error || 'Failed to submit deliverables';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to submit deliverables';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentDeal, fetchDeal]);

  // ==================== APPROVE DELIVERABLE ====================
  const approveDeliverable = useCallback(async (dealId, deliverableId, feedback) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/deals/${dealId}/deliverables/${deliverableId}/approve`, { feedback });

      if (response.data?.success) {
        toast.success('Deliverable approved');
        if (currentDeal?._id === dealId) {
          await fetchDeal(dealId);
        }
        return true;
      } else {
        const errorMsg = response.data?.error || 'Failed to approve deliverable';
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to approve deliverable';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentDeal, fetchDeal]);

  // ==================== GET DEAL STATS ====================
  const getDealStats = useCallback(async () => {
    try {
      const response = await api.get('/deals/stats');
      if (response.data?.success) {
        return response.data.stats;
      }
      return null;
    } catch (err) {
      console.error('Error fetching deal stats:', err);
      return null;
    }
  }, []);

  // ==================== CHECK STATUS TRANSITION ====================
  const isValidTransition = useCallback((currentStatus, newStatus) => {
    if (currentStatus === newStatus) return true;
    const allowed = validTransitions[currentStatus] || [];
    return allowed.includes(newStatus);
  }, []);

  // ==================== GET STATUS CONFIG ====================
  const getStatusConfig = useCallback((status) => {
    return statusConfig[status] || statusConfig.pending;
  }, []);

  // ==================== RESET CURRENT DEAL ====================
  const resetCurrentDeal = useCallback(() => {
    setCurrentDeal(null);
  }, []);

  const value = {
    deals,
    currentDeal,
    loading,
    error,
    pagination,
    counts,
    validTransitions,
    statusConfig,
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
    approveDeliverable,
    getDealStats,
    isValidTransition,
    getStatusConfig,
    resetCurrentDeal,
    setCurrentDeal,
  };

  return (
    <DealContext.Provider value={value}>
      {children}
    </DealContext.Provider>
  );
};

export default DealContext;