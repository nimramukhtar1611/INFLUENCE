// hooks/useCreatorData.js
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import creatorService from '../services/creatorService';
import dealService from '../services/dealService';
import paymentService from '../services/paymentService';
import toast from 'react-hot-toast';

export const useCreatorData = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [deals, setDeals] = useState([]);
  const [availableCampaigns, setAvailableCampaigns] = useState([]);
  const [earnings, setEarnings] = useState({
    balance: 0,
    pending: 0,
    total: 0,
    thisMonth: 0,
    transactions: []
  });
  const [analytics, setAnalytics] = useState(null);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    thisMonthEarnings: 0,
    pendingEarnings: 0,
    completedDeals: 0,
    activeDeals: 0,
    averageRating: 0,
    totalFollowers: 0,
    averageEngagement: 0
  });

  // Helper to safely extract data from service responses
  const extractData = (result, key, defaultValue = null) => {
    if (result.status === 'fulfilled' && result.value?.success) {
      return result.value[key] || result.value.data?.[key] || defaultValue;
    }
    return defaultValue;
  };

  const fetchAllData = useCallback(async (showToast = false) => {
    if (!user) return;

    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);

      // Fetch all data in parallel
      const results = await Promise.allSettled([
        creatorService.getProfile(),
        creatorService.getDashboard(),
        dealService.getCreatorDeals('all', 1, 20),
        creatorService.getAvailableCampaigns({}, 1, 6),
        paymentService.getBalance(),
        paymentService.getTransactions(1, 10),
        creatorService.getEarningsSummary(),
        creatorService.getAnalytics('30d')
      ]);

      // Profile
      const profileData = extractData(results[0], 'creator');
      setProfile(profileData);

      // Dashboard
      const dashboardData = extractData(results[1], 'dashboard');
      setDashboard(dashboardData);

      // Deals
      const dealsData = extractData(results[2], 'deals', []);
      setDeals(dealsData);

      // Available campaigns
      const campaignsData = extractData(results[3], 'campaigns', []);
      setAvailableCampaigns(campaignsData);

      // Balance
      if (results[4].status === 'fulfilled' && results[4].value?.success) {
        setEarnings(prev => ({
          ...prev,
          balance: results[4].value.balance || 0,
          pending: results[4].value.pending || 0
        }));
      }

      // Transactions
      if (results[5].status === 'fulfilled' && results[5].value?.success) {
        setEarnings(prev => ({
          ...prev,
          transactions: results[5].value.transactions || []
        }));
      }

      // Earnings summary
      if (results[6].status === 'fulfilled' && results[6].value?.success) {
        setEarnings(prev => ({
          ...prev,
          total: results[6].value.summary?.total || 0,
          thisMonth: results[6].value.summary?.thisMonth || 0
        }));
      }

      // Analytics
      const analyticsData = extractData(results[7], 'analytics');
      setAnalytics(analyticsData);

      // Recompute stats
      const completedCount = dealsData.filter(d => d.status === 'completed').length;
      const activeCount = dealsData.filter(d => ['accepted', 'in-progress'].includes(d.status)).length;

      setStats({
        totalEarnings: earnings.total,
        thisMonthEarnings: earnings.thisMonth,
        pendingEarnings: earnings.pending,
        completedDeals: completedCount,
        activeDeals: activeCount,
        averageRating: profileData?.stats?.averageRating || 0,
        totalFollowers: profileData?.totalFollowers || 0,
        averageEngagement: profileData?.averageEngagement || 0
      });

      if (showToast) toast.success('Dashboard refreshed');
    } catch (error) {
      console.error('useCreatorData error:', error);
      if (showToast) toast.error('Failed to refresh data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user, fetchAllData]);

  const refreshData = useCallback(() => fetchAllData(true), [fetchAllData]);

  return {
    loading,
    refreshing,
    profile,
    dashboard,
    deals,
    availableCampaigns,
    earnings,
    analytics,
    stats,
    refreshData
  };
};