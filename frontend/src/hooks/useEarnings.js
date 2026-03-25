// hooks/useEarnings.js
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import paymentService from '../services/paymentService';
import creatorService from '../services/creatorService';
import toast from 'react-hot-toast';

export const useEarnings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [earningsHistory, setEarningsHistory] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    thisMonth: 0,
    averageDealValue: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  const fetchBalance = useCallback(async () => {
    try {
      const res = await paymentService.getBalance();
      if (res?.success) {
        setBalance(res.balance || 0);
        setPendingBalance(res.pending || 0);
      }
    } catch (error) {
      console.error('Balance fetch error:', error);
    }
  }, []);

  const fetchTransactions = useCallback(async (page = 1, limit = 10) => {
    try {
      const res = await paymentService.getTransactions({ page, limit });
      if (res?.success) {
        setTransactions(res.transactions || []);
        setPagination(res.pagination || { page, limit, total: 0, pages: 1 });
      }
    } catch (error) {
      console.error('Transactions fetch error:', error);
    }
  }, []);

  const fetchWithdrawals = useCallback(async (page = 1, limit = 10) => {
    try {
      // Use transactions with type=withdrawal
      const res = await paymentService.getTransactions({ page, limit, type: 'withdrawal' });
      if (res?.success) {
        setWithdrawals(res.transactions || []);
      }
    } catch (error) {
      console.error('Withdrawals fetch error:', error);
    }
  }, []);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      const res = await paymentService.getPaymentMethods();
      if (res?.success) {
        setPaymentMethods(res.paymentMethods || []);
      }
    } catch (error) {
      console.error('Payment methods fetch error:', error);
    }
  }, []);

  const fetchEarningsHistory = useCallback(async (period = '30d') => {
    try {
      const res = await creatorService.getEarningsHistory(period);
      if (res?.success) {
        setEarningsHistory(res.history || []);
      }
    } catch (error) {
      console.error('Earnings history error:', error);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await creatorService.getEarningsSummary();
      if (res?.success) {
        setSummary(res.summary || { total: 0, thisMonth: 0, averageDealValue: 0 });
      }
    } catch (error) {
      console.error('Earnings summary error:', error);
    }
  }, []);

  const requestWithdrawal = useCallback(async (amount, methodId) => {
    try {
      const res = await paymentService.requestWithdrawal(amount, methodId);
      if (res?.success) {
        toast.success('Withdrawal requested successfully');
        await fetchBalance();
        await fetchWithdrawals();
        return res;
      } else {
        toast.error(res?.error || 'Failed to request withdrawal');
        return res;
      }
    } catch (error) {
      toast.error('Failed to request withdrawal');
      return { success: false, error: error.message };
    }
  }, [fetchBalance, fetchWithdrawals]);

  const addPaymentMethod = useCallback(async (methodData) => {
    try {
      const res = await paymentService.addPaymentMethod(methodData);
      if (res?.success) {
        toast.success('Payment method added');
        await fetchPaymentMethods();
      } else {
        toast.error(res?.error || 'Failed to add payment method');
      }
      return res;
    } catch (error) {
      toast.error('Failed to add payment method');
      return { success: false, error: error.message };
    }
  }, [fetchPaymentMethods]);

  const setDefaultMethod = useCallback(async (methodId) => {
    try {
      const res = await paymentService.setDefaultMethod(methodId);
      if (res?.success) {
        toast.success('Default method updated');
        await fetchPaymentMethods();
      } else {
        toast.error(res?.error || 'Failed to update default method');
      }
      return res;
    } catch (error) {
      toast.error('Failed to update default method');
      return { success: false, error: error.message };
    }
  }, [fetchPaymentMethods]);

  const deletePaymentMethod = useCallback(async (methodId) => {
    try {
      const res = await paymentService.deletePaymentMethod(methodId);
      if (res?.success) {
        toast.success('Payment method removed');
        await fetchPaymentMethods();
      } else {
        toast.error(res?.error || 'Failed to remove payment method');
      }
      return res;
    } catch (error) {
      toast.error('Failed to remove payment method');
      return { success: false, error: error.message };
    }
  }, [fetchPaymentMethods]);

  const getGrowthPercentage = useCallback(() => {
    if (summary.total === 0) return '0%';
    return ((summary.thisMonth - summary.total) / summary.total * 100).toFixed(1) + '%';
  }, [summary]);

  // Load all data on mount
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchBalance(),
        fetchTransactions(1, 10),
        fetchWithdrawals(1, 10),
        fetchPaymentMethods(),
        fetchEarningsHistory('30d'),
        fetchSummary()
      ]);
      setLoading(false);
    };
    if (user) {
      loadAll();
    }
  }, [user]);

  return {
    loading,
    balance,
    pendingBalance,
    transactions,
    withdrawals,
    paymentMethods,
    earningsHistory,
    summary,
    pagination,
    fetchBalance,
    fetchTransactions,
    fetchWithdrawals,
    fetchPaymentMethods,
    fetchEarningsHistory,
    requestWithdrawal,
    addPaymentMethod,
    setDefaultMethod,
    deletePaymentMethod,
    getGrowthPercentage
  };
};