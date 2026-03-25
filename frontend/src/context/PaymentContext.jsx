import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const PaymentContext = createContext();

export const usePayment = () => {
  const context = React.useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};

export const PaymentProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const [balance, setBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    transactions: { page: 1, limit: 10, total: 0, pages: 1 },
    withdrawals: { page: 1, limit: 10, total: 0, pages: 1 },
    invoices: { page: 1, limit: 10, total: 0, pages: 1 },
  });

  // ==================== FETCH BALANCE ====================
  const fetchBalance = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await api.get('/payments/balance');
      if (response.data?.success) {
        setBalance(response.data.balance || 0);
        setPendingBalance(response.data.pending || 0);
      } else {
        const msg = response.data?.error || 'Failed to fetch balance';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to fetch balance';
      setError(msg);
      toast.error(msg);
    }
  }, [isAuthenticated]);

  // ==================== FETCH TRANSACTIONS ====================
  const fetchTransactions = useCallback(async (page = 1) => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/payments/transactions', {
        params: { page, limit: 10 },
      });

      if (response.data?.success) {
        setTransactions(response.data.transactions || []);
        setPagination(prev => ({
          ...prev,
          transactions: response.data.pagination || {
            page: 1,
            limit: 10,
            total: 0,
            pages: 1,
          },
        }));
      } else {
        const msg = response.data?.error || 'Failed to load transactions';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to load transactions';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // ==================== FETCH PAYMENT METHODS ====================
  const fetchPaymentMethods = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await api.get('/payments/methods');
      if (response.data?.success) {
        setPaymentMethods(response.data.paymentMethods || []);
      } else {
        const msg = response.data?.error || 'Failed to load payment methods';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to load payment methods';
      setError(msg);
      toast.error(msg);
    }
  }, [isAuthenticated]);

  // ==================== FETCH WITHDRAWALS ====================
  const fetchWithdrawals = useCallback(async (page = 1) => {
    if (!isAuthenticated) return;

    try {
      const response = await api.get('/payments/withdrawals', {
        params: { page, limit: 10 },
      });

      if (response.data?.success) {
        setWithdrawals(response.data.withdrawals || []);
        setPagination(prev => ({
          ...prev,
          withdrawals: response.data.pagination || {
            page: 1,
            limit: 10,
            total: 0,
            pages: 1,
          },
        }));
      } else {
        const msg = response.data?.error || 'Failed to load withdrawals';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to load withdrawals';
      setError(msg);
      toast.error(msg);
    }
  }, [isAuthenticated]);

  // ==================== FETCH INVOICES ====================
  const fetchInvoices = useCallback(async (page = 1) => {
    if (!isAuthenticated) return;

    try {
      const response = await api.get('/payments/invoices', {
        params: { page, limit: 10 },
      });

      if (response.data?.success) {
        setInvoices(response.data.invoices || []);
        setPagination(prev => ({
          ...prev,
          invoices: response.data.pagination || {
            page: 1,
            limit: 10,
            total: 0,
            pages: 1,
          },
        }));
      } else {
        const msg = response.data?.error || 'Failed to load invoices';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to load invoices';
      setError(msg);
      toast.error(msg);
    }
  }, [isAuthenticated]);

  // ==================== ADD PAYMENT METHOD ====================
  const addPaymentMethod = useCallback(async (methodData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/payments/methods', methodData);

      if (response.data?.success) {
        toast.success('Payment method added successfully');
        await fetchPaymentMethods();
        return true;
      } else {
        const msg = response.data?.error || 'Failed to add payment method';
        setError(msg);
        toast.error(msg);
        return false;
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to add payment method';
      setError(msg);
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchPaymentMethods]);

  // ==================== SET DEFAULT METHOD ====================
  const setDefaultMethod = useCallback(async (methodId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.put(`/payments/methods/${methodId}/default`);

      if (response.data?.success) {
        toast.success('Default method updated');
        await fetchPaymentMethods();
        return true;
      } else {
        const msg = response.data?.error || 'Failed to set default method';
        setError(msg);
        toast.error(msg);
        return false;
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to set default method';
      setError(msg);
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchPaymentMethods]);

  // ==================== DELETE PAYMENT METHOD ====================
  const deletePaymentMethod = useCallback(async (methodId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.delete(`/payments/methods/${methodId}`);

      if (response.data?.success) {
        toast.success('Payment method deleted');
        await fetchPaymentMethods();
        return true;
      } else {
        const msg = response.data?.error || 'Failed to delete payment method';
        setError(msg);
        toast.error(msg);
        return false;
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to delete payment method';
      setError(msg);
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchPaymentMethods]);

  // ==================== CREATE ESCROW ====================
  const createEscrow = useCallback(async (dealId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/payments/escrow', { dealId });

      if (response.data?.success) {
        toast.success('Escrow created successfully');
        await fetchBalance();
        await fetchTransactions();
        return response.data.payment;
      } else {
        const msg = response.data?.error || 'Failed to create escrow';
        setError(msg);
        toast.error(msg);
        return null;
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to create escrow';
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchBalance, fetchTransactions]);

  // ==================== RELEASE PAYMENT ====================
  const releasePayment = useCallback(async (dealId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/payments/release/${dealId}`);

      if (response.data?.success) {
        toast.success('Payment released successfully');
        await fetchBalance();
        await fetchTransactions();
        return true;
      } else {
        const msg = response.data?.error || 'Failed to release payment';
        setError(msg);
        toast.error(msg);
        return false;
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to release payment';
      setError(msg);
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchBalance, fetchTransactions]);

  // ==================== REQUEST WITHDRAWAL ====================
  const requestWithdrawal = useCallback(async (amount, methodId) => {
    try {
      setLoading(true);
      setError(null);

      if (amount < 50) {
        toast.error('Minimum withdrawal amount is $50');
        return false;
      }

      if (amount > balance) {
        toast.error('Insufficient balance');
        return false;
      }

      const response = await api.post('/payments/withdraw', { amount, methodId });

      if (response.data?.success) {
        toast.success('Withdrawal requested successfully');
        await fetchBalance();
        await fetchWithdrawals();
        return true;
      } else {
        const msg = response.data?.error || 'Failed to request withdrawal';
        setError(msg);
        toast.error(msg);
        return false;
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to request withdrawal';
      setError(msg);
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [balance, fetchBalance, fetchWithdrawals]);

  // ==================== CANCEL WITHDRAWAL ====================
  const cancelWithdrawal = useCallback(async (withdrawalId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/payments/withdrawals/${withdrawalId}/cancel`);

      if (response.data?.success) {
        toast.success('Withdrawal cancelled');
        await fetchWithdrawals();
        await fetchBalance();
        return true;
      } else {
        const msg = response.data?.error || 'Failed to cancel withdrawal';
        setError(msg);
        toast.error(msg);
        return false;
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to cancel withdrawal';
      setError(msg);
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchWithdrawals, fetchBalance]);

  // ==================== DOWNLOAD INVOICE ====================
  const downloadInvoice = useCallback(async (invoiceId) => {
    try {
      const response = await api.get(`/payments/invoices/${invoiceId}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Invoice downloaded');
      return true;
    } catch (err) {
      toast.error('Failed to download invoice');
      return false;
    }
  }, []);

  // ==================== GET TRANSACTION DETAILS ====================
  const getTransactionDetails = useCallback(async (transactionId) => {
    try {
      const response = await api.get(`/payments/transactions/${transactionId}`);
      if (response.data?.success) {
        return response.data.transaction;
      }
      return null;
    } catch (err) {
      toast.error('Failed to load transaction details');
      return null;
    }
  }, []);

  // ==================== GET WITHDRAWAL DETAILS ====================
  const getWithdrawalDetails = useCallback(async (withdrawalId) => {
    try {
      const response = await api.get(`/payments/withdrawals/${withdrawalId}`);
      if (response.data?.success) {
        return response.data.withdrawal;
      }
      return null;
    } catch (err) {
      toast.error('Failed to load withdrawal details');
      return null;
    }
  }, []);

  // ==================== VERIFY BANK ACCOUNT ====================
  const verifyBankAccount = useCallback(async (methodId, amounts) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/payments/methods/${methodId}/verify`, { amounts });

      if (response.data?.success) {
        toast.success('Bank account verified');
        await fetchPaymentMethods();
        return true;
      } else {
        const msg = response.data?.error || 'Failed to verify bank account';
        setError(msg);
        toast.error(msg);
        return false;
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to verify bank account';
      setError(msg);
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchPaymentMethods]);

  // ==================== GET WITHDRAWAL LIMITS ====================
  const getWithdrawalLimits = useCallback(() => {
    return {
      min: 50,
      max: 10000,
      daily: 20000,
      weekly: 50000,
      monthly: 100000,
    };
  }, []);

  // ==================== CALCULATE FEES ====================
  const calculateFees = useCallback((amount) => {
    const platformFee = amount * 0.1; // 10%
    const processingFee = amount * 0.029 + 0.3; // 2.9% + $0.30
    const totalFees = platformFee + processingFee;
    const netAmount = amount - totalFees;

    return {
      amount,
      platformFee: parseFloat(platformFee.toFixed(2)),
      processingFee: parseFloat(processingFee.toFixed(2)),
      totalFees: parseFloat(totalFees.toFixed(2)),
      netAmount: parseFloat(netAmount.toFixed(2)),
    };
  }, []);

  // ==================== SET PAGE HANDLERS ====================
  const setTransactionsPage = useCallback((page) => {
    setPagination(prev => ({
      ...prev,
      transactions: { ...prev.transactions, page },
    }));
    fetchTransactions(page);
  }, [fetchTransactions]);

  const setWithdrawalsPage = useCallback((page) => {
    setPagination(prev => ({
      ...prev,
      withdrawals: { ...prev.withdrawals, page },
    }));
    fetchWithdrawals(page);
  }, [fetchWithdrawals]);

  const setInvoicesPage = useCallback((page) => {
    setPagination(prev => ({
      ...prev,
      invoices: { ...prev.invoices, page },
    }));
    fetchInvoices(page);
  }, [fetchInvoices]);

  // ==================== INITIAL FETCH ====================
  useEffect(() => {
    if (isAuthenticated) {
      fetchBalance();
      fetchTransactions();
      fetchPaymentMethods();
      fetchWithdrawals();
      fetchInvoices();
    }
  }, [
    isAuthenticated,
    fetchBalance,
    fetchTransactions,
    fetchPaymentMethods,
    fetchWithdrawals,
    fetchInvoices,
  ]);

  const value = {
    balance,
    pendingBalance,
    transactions,
    paymentMethods,
    withdrawals,
    invoices,
    loading,
    error,
    pagination,
    fetchBalance,
    fetchTransactions,
    fetchPaymentMethods,
    fetchWithdrawals,
    fetchInvoices,
    addPaymentMethod,
    setDefaultMethod,
    deletePaymentMethod,
    createEscrow,
    releasePayment,
    requestWithdrawal,
    cancelWithdrawal,
    downloadInvoice,
    getTransactionDetails,
    getWithdrawalDetails,
    verifyBankAccount,
    getWithdrawalLimits,
    calculateFees,
    setTransactionsPage,
    setWithdrawalsPage,
    setInvoicesPage,
  };

  return (
    <PaymentContext.Provider value={value}>
      {children}
    </PaymentContext.Provider>
  );
};

export default PaymentContext;