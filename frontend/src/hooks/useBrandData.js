import { useState, useEffect, useCallback } from 'react';
import brandService from '../services/brandService';
import campaignService from '../services/campaignService';
import dealService from '../services/dealService';
import paymentService from '../services/paymentService';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

export const useBrandData = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [deals, setDeals] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [balance, setBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalDeals: 0,
    activeDeals: 0,
    completedDeals: 0,
    totalSpent: 0,
    avgROI: 0
  });

  const fetchAllData = useCallback(async (showToast = false) => {
    if (!user) return;

    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);

      const results = await Promise.allSettled([
        brandService.getProfile(),
        campaignService.getBrandCampaigns('all', 1, 5),
        dealService.getBrandDeals('all', 1, 5),
        paymentService.getBalance(),
        paymentService.getTransactions(1, 5),
        brandService.getAnalytics('30d')
      ]);

      // Profile
      if (results[0].status === 'fulfilled' && results[0].value?.success) {
        setProfile(results[0].value.brand || null);
      }

      // Campaigns
      if (results[1].status === 'fulfilled' && results[1].value?.success) {
        setCampaigns(results[1].value.campaigns || []);
      } else {
        setCampaigns([]);
      }

      // Deals
      if (results[2].status === 'fulfilled' && results[2].value?.success) {
        setDeals(results[2].value.deals || []);
      } else {
        setDeals([]);
      }

      // Balance
      if (results[3].status === 'fulfilled' && results[3].value?.success) {
        setBalance(results[3].value.balance || 0);
        setPendingBalance(results[3].value.pending || 0);
      }

      // Transactions
      if (results[4].status === 'fulfilled' && results[4].value?.success) {
        setTransactions(results[4].value.transactions || []);
      }

      // Analytics
      if (results[5].status === 'fulfilled' && results[5].value?.success) {
        setAnalytics(results[5].value.analytics || null);
      }

      // Compute stats
      const freshCampaigns = results[1].status === 'fulfilled' && results[1].value?.success
        ? results[1].value.campaigns || []
        : [];
      const freshDeals = results[2].status === 'fulfilled' && results[2].value?.success
        ? results[2].value.deals || []
        : [];

      const activeCampaigns = freshCampaigns.filter(c => c.status === 'active').length;
      const activeDeals = freshDeals.filter(d => ['accepted', 'in-progress'].includes(d.status)).length;
      const completedDeals = freshDeals.filter(d => d.status === 'completed').length;
      const totalSpent = freshDeals
        .filter(d => d.status === 'completed')
        .reduce((sum, d) => sum + (d.budget || 0), 0);

      setStats({
        totalCampaigns: freshCampaigns.length,
        activeCampaigns,
        totalDeals: freshDeals.length,
        activeDeals,
        completedDeals,
        totalSpent,
        avgROI: results[5].value?.analytics?.summary?.avgROI || 0
      });

      if (showToast) toast.success('Dashboard refreshed');
    } catch (error) {
      console.error('useBrandData error:', error);
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
    campaigns,
    deals,
    analytics,
    balance,
    pendingBalance,
    transactions,
    paymentMethods,
    teamMembers,
    invoices,
    stats,
    refreshData
  };
};