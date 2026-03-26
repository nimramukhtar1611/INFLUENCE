import { useState, useEffect, useCallback } from 'react';
import adminService from '../services/adminService';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

export const useAdminData = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [creators, setCreators] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [deals, setDeals] = useState([]);
  const [payments, setPayments] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [moderationQueue, setModerationQueue] = useState([]);
  const [settings, setSettings] = useState(null);
  const [fees, setFees] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [logs, setLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBrands: 0,
    totalCreators: 0,
    totalCampaigns: 0,
    totalRevenue: 0,
    totalFees: 0,
    activeCampaigns: 0,
    completedDeals: 0,
    pendingDisputes: 0,
    pendingVerifications: 0
  });
  const [pagination, setPagination] = useState({
    users: { page: 1, limit: 10, total: 0, pages: 1 },
    brands: { page: 1, limit: 10, total: 0, pages: 1 },
    creators: { page: 1, limit: 10, total: 0, pages: 1 },
    campaigns: { page: 1, limit: 10, total: 0, pages: 1 },
    deals: { page: 1, limit: 10, total: 0, pages: 1 },
    payments: { page: 1, limit: 10, total: 0, pages: 1 },
    disputes: { page: 1, limit: 10, total: 0, pages: 1 }
  });

  const fetchAllData = useCallback(async (showToast = false) => {
    if (!user) return;

    try {
      if (showToast) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Fetch all data in parallel
      const [
        dashboardRes,
        usersRes,
        brandsRes,
        creatorsRes,
        campaignsRes,
        dealsRes,
        paymentsRes,
        disputesRes,
        moderationRes,
        settingsRes,
        feesRes,
        healthRes,
        reportsRes
      ] = await Promise.allSettled([
        adminService.getDashboard(),
        adminService.getUsers({ page: 1, limit: 10 }),
        adminService.getBrands({ page: 1, limit: 10 }),
        adminService.getCreators({ page: 1, limit: 10 }),
        adminService.getCampaigns({ page: 1, limit: 10 }),
        adminService.getDeals({ page: 1, limit: 10 }),
        adminService.getPayments({ page: 1, limit: 10 }),
        adminService.getDisputes({ page: 1, limit: 10 }),
        adminService.getModerationQueue({ page: 1, limit: 10 }),
        adminService.getSettings(),
        adminService.getFees(),
        adminService.getSystemHealth(),
        adminService.getReports({ page: 1, limit: 10 })
      ]);

      // Dashboard
      if (dashboardRes.status === 'fulfilled' && dashboardRes.value?.success) {
        const dashboardData = dashboardRes.value;
        setDashboard(dashboardRes.value);

        const recentDeals = dashboardData.recent?.deals || [];
        const campaignsFromDeals = Array.from(
          new Map(
            recentDeals
              .map((deal) => {
                const campaignId = deal?.campaignId?._id || deal?.campaignId || deal?._id;
                if (!campaignId) return null;
                return [String(campaignId), {
                  _id: campaignId,
                  title: deal?.campaignId?.title || 'Campaign',
                  brandId: { brandName: deal?.brandId?.brandName || 'Unknown brand' },
                  status: deal?.status === 'completed' ? 'completed' : 'active',
                  budget: deal?.budget || 0,
                  selectedCreators: deal?.creatorId ? [deal.creatorId] : [],
                  metrics: { engagement: 0, impressions: 0 },
                  createdAt: deal?.createdAt,
                }];
              })
              .filter(Boolean)
          ).values()
        );

        setCampaigns(campaignsFromDeals);
        setDeals(recentDeals);
        setPayments(dashboardData.recent?.payments || []);
        setModerationQueue(
          (dashboardData.recent?.users || [])
            .filter((u) => u?.isVerified === false)
            .map((u) => ({
              id: u._id,
              type: 'user_verification',
              status: 'pending',
              title: u.fullName || u.email,
              createdAt: u.createdAt,
            }))
        );
        setFees((prev) => ({
          commissionRate: prev?.commissionRate || 10,
          creatorPayoutMin: prev?.creatorPayoutMin || 50,
          withdrawalFee: prev?.withdrawalFee || 0,
          totalFees: dashboardData.stats?.revenue?.fees || 0,
        }));

        setStats({
          totalUsers: dashboardRes.value.stats?.users?.total || 0,
          totalBrands: dashboardRes.value.stats?.users?.brands || 0,
          totalCreators: dashboardRes.value.stats?.users?.creators || 0,
          totalCampaigns: dashboardRes.value.stats?.campaigns?.total || 0,
          totalRevenue: dashboardRes.value.stats?.revenue?.total || 0,
          totalFees: dashboardRes.value.stats?.revenue?.fees || 0,
          activeCampaigns: dashboardRes.value.stats?.campaigns?.active || 0,
          completedDeals: dashboardRes.value.stats?.deals?.completed || 0,
          pendingDisputes: dashboardRes.value.stats?.disputes?.pending || 0,
          pendingVerifications: dashboardRes.value.stats?.users?.pendingVerifications || 0
        });
      }

      // Users
      if (usersRes.status === 'fulfilled' && usersRes.value?.success) {
        setUsers(usersRes.value.users || []);
        setPagination(prev => ({
          ...prev,
          users: usersRes.value.pagination || prev.users
        }));
      }

      // Brands
      if (brandsRes.status === 'fulfilled' && brandsRes.value?.success) {
        setBrands(brandsRes.value.brands || []);
        setPagination(prev => ({
          ...prev,
          brands: brandsRes.value.pagination || prev.brands
        }));
      }

      // Creators
      if (creatorsRes.status === 'fulfilled' && creatorsRes.value?.success) {
        setCreators(creatorsRes.value.creators || []);
        setPagination(prev => ({
          ...prev,
          creators: creatorsRes.value.pagination || prev.creators
        }));
      }

      // Campaigns
      if (
        campaignsRes.status === 'fulfilled' &&
        campaignsRes.value?.success &&
        (campaignsRes.value.campaigns || []).length > 0
      ) {
        setCampaigns(campaignsRes.value.campaigns || []);
        setPagination(prev => ({
          ...prev,
          campaigns: campaignsRes.value.pagination || prev.campaigns
        }));
      }

      // Deals
      if (
        dealsRes.status === 'fulfilled' &&
        dealsRes.value?.success &&
        (dealsRes.value.deals || []).length > 0
      ) {
        setDeals(dealsRes.value.deals || []);
        setPagination(prev => ({
          ...prev,
          deals: dealsRes.value.pagination || prev.deals
        }));
      }

      // Payments
      if (
        paymentsRes.status === 'fulfilled' &&
        paymentsRes.value?.success &&
        (paymentsRes.value.payments || []).length > 0
      ) {
        setPayments(paymentsRes.value.payments || []);
        setPagination(prev => ({
          ...prev,
          payments: paymentsRes.value.pagination || prev.payments
        }));
      }

      // Disputes
      if (disputesRes.status === 'fulfilled' && disputesRes.value?.success) {
        setDisputes(disputesRes.value.disputes || []);
        setPagination(prev => ({
          ...prev,
          disputes: disputesRes.value.pagination || prev.disputes
        }));
      }

      // Moderation Queue
      if (
        moderationRes.status === 'fulfilled' &&
        moderationRes.value?.success &&
        (moderationRes.value.items || []).length > 0
      ) {
        setModerationQueue(moderationRes.value.items || []);
      }

      // Settings
      if (settingsRes.status === 'fulfilled' && settingsRes.value?.success) {
        setSettings(settingsRes.value.settings);
      }

      // Fees
      if (
        feesRes.status === 'fulfilled' &&
        feesRes.value?.success &&
        feesRes.value?.fees &&
        Number(feesRes.value.fees.totalFees || 0) > 0
      ) {
        setFees(feesRes.value.fees);
      }

      // System Health
      if (healthRes.status === 'fulfilled' && healthRes.value?.success) {
        setSystemHealth(healthRes.value);
      }

      // Reports
      if (reportsRes.status === 'fulfilled' && reportsRes.value?.success) {
        setReports(reportsRes.value.reports || []);
      }

      if (showToast) {
        toast.success('Dashboard refreshed');
      }

    } catch (error) {
      console.error('Error fetching admin data:', error);
      if (showToast) {
        toast.error('Failed to refresh data');
      }
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

  const refreshData = () => fetchAllData(true);

  const fetchUsers = useCallback(async (page = 1, filters = {}) => {
    try {
      const response = await adminService.getUsers({ page, limit: 10, ...filters });
      if (response.success) {
        setUsers(response.users);
        setPagination(prev => ({
          ...prev,
          users: response.pagination || prev.users
        }));
      }
    } catch (error) {
      toast.error('Failed to load users');
    }
  }, []);

  const fetchBrands = useCallback(async (page = 1, filters = {}) => {
    try {
      const response = await adminService.getBrands({ page, limit: 10, ...filters });
      if (response.success) {
        setBrands(response.brands);
        setPagination(prev => ({
          ...prev,
          brands: response.pagination || prev.brands
        }));
      }
    } catch (error) {
      toast.error('Failed to load brands');
    }
  }, []);

  const fetchCreators = useCallback(async (page = 1, filters = {}) => {
    try {
      const response = await adminService.getCreators({ page, limit: 10, ...filters });
      if (response.success) {
        setCreators(response.creators);
        setPagination(prev => ({
          ...prev,
          creators: response.pagination || prev.creators
        }));
      }
    } catch (error) {
      toast.error('Failed to load creators');
    }
  }, []);

  const fetchCampaigns = useCallback(async (page = 1, filters = {}) => {
    try {
      const response = await adminService.getCampaigns({ page, limit: 10, ...filters });
      if (response.success) {
        setCampaigns(response.campaigns);
        setPagination(prev => ({
          ...prev,
          campaigns: response.pagination || prev.campaigns
        }));
      }
    } catch (error) {
      toast.error('Failed to load campaigns');
    }
  }, []);

  const fetchDeals = useCallback(async (page = 1, filters = {}) => {
    try {
      const response = await adminService.getDeals({ page, limit: 10, ...filters });
      if (response.success) {
        setDeals(response.deals);
        setPagination(prev => ({
          ...prev,
          deals: response.pagination || prev.deals
        }));
      }
    } catch (error) {
      toast.error('Failed to load deals');
    }
  }, []);

  const fetchPayments = useCallback(async (page = 1, filters = {}) => {
    try {
      const response = await adminService.getPayments({ page, limit: 10, ...filters });
      if (response.success) {
        setPayments(response.payments);
        setPagination(prev => ({
          ...prev,
          payments: response.pagination || prev.payments
        }));
      }
    } catch (error) {
      toast.error('Failed to load payments');
    }
  }, []);

  const fetchDisputes = useCallback(async (page = 1, filters = {}) => {
    try {
      const response = await adminService.getDisputes({ page, limit: 10, ...filters });
      if (response.success) {
        setDisputes(response.disputes);
        setPagination(prev => ({
          ...prev,
          disputes: response.pagination || prev.disputes
        }));
      }
    } catch (error) {
      toast.error('Failed to load disputes');
    }
  }, []);

  const verifyUser = useCallback(async (userId) => {
    try {
      const response = await adminService.verifyUser(userId);
      if (response.success) {
        toast.success('User verified successfully');
        await fetchAllData();
        return true;
      }
    } catch (error) {
      toast.error(error.error || 'Failed to verify user');
      return false;
    }
  }, [fetchAllData]);

  const suspendUser = useCallback(async (userId, reason, duration) => {
    try {
      const response = await adminService.suspendUser(userId, reason, duration);
      if (response.success) {
        toast.success('User suspended');
        await fetchAllData();
        return true;
      }
    } catch (error) {
      toast.error(error.error || 'Failed to suspend user');
      return false;
    }
  }, [fetchAllData]);

  const activateUser = useCallback(async (userId) => {
    try {
      const response = await adminService.activateUser(userId);
      if (response.success) {
        toast.success('User activated');
        await fetchAllData();
        return true;
      }
    } catch (error) {
      toast.error(error.error || 'Failed to activate user');
      return false;
    }
  }, [fetchAllData]);

  const deleteUser = useCallback(async (userId) => {
    try {
      const response = await adminService.deleteUser(userId);
      if (response.success) {
        toast.success('User deleted');
        await fetchAllData();
        return true;
      }
    } catch (error) {
      toast.error(error.error || 'Failed to delete user');
      return false;
    }
  }, [fetchAllData]);

  const approveItem = useCallback(async (type, id, notes) => {
    try {
      const response = await adminService.approveItem(type, id, notes);
      if (response.success) {
        toast.success('Item approved');
        await fetchAllData();
        return true;
      }
    } catch (error) {
      toast.error(error.error || 'Failed to approve item');
      return false;
    }
  }, [fetchAllData]);

  const rejectItem = useCallback(async (type, id, reason) => {
    try {
      const response = await adminService.rejectItem(type, id, reason);
      if (response.success) {
        toast.success('Item rejected');
        await fetchAllData();
        return true;
      }
    } catch (error) {
      toast.error(error.error || 'Failed to reject item');
      return false;
    }
  }, [fetchAllData]);

  const resolveDispute = useCallback(async (disputeId, resolution) => {
    try {
      const response = await adminService.resolveDispute(disputeId, resolution);
      if (response.success) {
        toast.success('Dispute resolved');
        await fetchAllData();
        return true;
      }
    } catch (error) {
      toast.error(error.error || 'Failed to resolve dispute');
      return false;
    }
  }, [fetchAllData]);

  const refundPayment = useCallback(async (paymentId, reason) => {
    try {
      const response = await adminService.refundPayment(paymentId, reason);
      if (response.success) {
        toast.success('Payment refunded');
        await fetchAllData();
        return true;
      }
    } catch (error) {
      toast.error(error.error || 'Failed to refund payment');
      return false;
    }
  }, [fetchAllData]);

  const approveWithdrawal = useCallback(async (withdrawalId, notes) => {
    try {
      const response = await adminService.approveWithdrawal(withdrawalId, notes);
      if (response.success) {
        toast.success('Withdrawal approved successfully');
        await fetchAllData();
        return true;
      }
    } catch (error) {
      toast.error(error.error || 'Failed to approve withdrawal');
      return false;
    }
  }, [fetchAllData]);

  const updateSettings = useCallback(async (settingsData) => {
    try {
      const response = await adminService.updateSettings(settingsData);
      if (response.success) {
        toast.success('Settings updated');
        setSettings(response.settings);
        return true;
      }
    } catch (error) {
      toast.error(error.error || 'Failed to update settings');
      return false;
    }
  }, []);

  const updateFees = useCallback(async (feeData) => {
    try {
      const response = await adminService.updateFees(feeData);
      if (response.success) {
        toast.success('Fees updated');
        setFees(response.fees);
        return true;
      }
    } catch (error) {
      toast.error(error.error || 'Failed to update fees');
      return false;
    }
  }, []);

  const get2FAStatus = useCallback(async () => {
    try {
      return await adminService.get2FAStatus();
    } catch (error) {
      toast.error('Failed to get 2FA status');
      return null;
    }
  }, []);

  const generate2FA = useCallback(async () => {
    try {
      return await adminService.generate2FA();
    } catch (error) {
      toast.error('Failed to generate 2FA secret');
      return null;
    }
  }, []);

  const verify2FA = useCallback(async (token) => {
    try {
      const response = await adminService.verify2FA(token);
      if (response.success) {
        toast.success('2FA enabled successfully');
        return response;
      }
    } catch (error) {
      toast.error(error.error || 'Failed to verify 2FA code');
      return null;
    }
  }, []);

  const disable2FA = useCallback(async (token) => {
    try {
      const response = await adminService.disable2FA(token);
      if (response.success) {
        toast.success('2FA disabled successfully');
        return true;
      }
    } catch (error) {
      toast.error(error.error || 'Failed to disable 2FA');
      return false;
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      const response = await adminService.clearCache();
      if (response.success) {
        toast.success('Cache cleared');
        return true;
      }
    } catch (error) {
      toast.error(error.error || 'Failed to clear cache');
      return false;
    }
  }, []);

  return {
    loading,
    refreshing,
    dashboard,
    users,
    brands,
    creators,
    campaigns,
    deals,
    payments,
    disputes,
    moderationQueue,
    settings,
    fees,
    systemHealth,
    logs,
    auditLogs,
    reports,
    stats,
    pagination,
    refreshData,
    fetchUsers,
    fetchBrands,
    fetchCreators,
    fetchCampaigns,
    fetchDeals,
    fetchPayments,
    fetchDisputes,
    verifyUser,
    suspendUser,
    activateUser,
    deleteUser,
    approveItem,
    rejectItem,
    resolveDispute,
    refundPayment,
    approveWithdrawal,
    updateSettings,
    updateFees,
    get2FAStatus,
    generate2FA,
    verify2FA,
    disable2FA,
    clearCache
  };
};