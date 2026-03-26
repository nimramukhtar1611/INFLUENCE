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

  const requestWithdrawal = useCallback(async (amount) => {
    try {
      const res = await paymentService.requestWithdrawal(amount);
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
    earningsHistory,
    summary,
    pagination,
    fetchBalance,
    fetchTransactions,
    fetchWithdrawals,
    fetchEarningsHistory,
    requestWithdrawal,
    getGrowthPercentage
  };
};