import { useState, useCallback } from 'react';
import paymentService from '../services/paymentService';
import toast from 'react-hot-toast';

export const usePayments = () => {
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  const fetchBalance = useCallback(async () => {
    try {
      const response = await paymentService.getBalance();
      if (response.success) {
        setBalance(response.balance || 0);
        setPendingBalance(response.pending || 0);
      }
    } catch (error) {
      console.error('Balance error:', error);
    }
  }, []);

  const fetchTransactions = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const response = await paymentService.getTransactions(page, 10);
      
      if (response.success) {
        setTransactions(response.transactions);
        setPagination(response.pagination);
      }
    } catch (error) {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      const response = await paymentService.getPaymentMethods();
      if (response.success) {
        setPaymentMethods(response.paymentMethods);
      }
    } catch (error) {
      console.error('Payment methods error:', error);
    }
  }, []);

  const fetchWithdrawals = useCallback(async () => {
    try {
      const response = await paymentService.getWithdrawals();
      if (response.success) {
        setWithdrawals(response.withdrawals);
      }
    } catch (error) {
      console.error('Withdrawals error:', error);
    }
  }, []);

  const fetchInvoices = useCallback(async (page = 1) => {
    try {
      const response = await paymentService.getInvoices(page, 10);
      if (response.success) {
        setInvoices(response.invoices);
      }
    } catch (error) {
      console.error('Invoices error:', error);
    }
  }, []);

  const createEscrow = useCallback(async (dealId) => {
    try {
      setLoading(true);
      const response = await paymentService.createEscrow(dealId);
      
      if (response.success) {
        toast.success('Escrow created');
        return response;
      }
    } catch (error) {
      toast.error(error.error || 'Failed to create escrow');
    } finally {
      setLoading(false);
    }
  }, []);

  const releasePayment = useCallback(async (dealId) => {
    try {
      setLoading(true);
      const response = await paymentService.releasePayment(dealId);
      
      if (response.success) {
        toast.success('Payment released');
        return true;
      }
    } catch (error) {
      toast.error(error.error || 'Failed to release payment');
    } finally {
      setLoading(false);
    }
  }, []);

  const addPaymentMethod = useCallback(async (methodData) => {
    try {
      setLoading(true);
      const response = await paymentService.addPaymentMethod(methodData);
      
      if (response.success) {
        toast.success('Payment method added');
        setPaymentMethods(response.paymentMethods);
        return true;
      }
    } catch (error) {
      toast.error(error.error || 'Failed to add payment method');
    } finally {
      setLoading(false);
    }
  }, []);

  const setDefaultMethod = useCallback(async (methodId) => {
    try {
      const response = await paymentService.setDefaultMethod(methodId);
      
      if (response.success) {
        toast.success('Default method updated');
        await fetchPaymentMethods();
      }
    } catch (error) {
      toast.error(error.error || 'Failed to update default method');
    }
  }, [fetchPaymentMethods]);

  const deletePaymentMethod = useCallback(async (methodId) => {
    try {
      const response = await paymentService.deletePaymentMethod(methodId);
      
      if (response.success) {
        toast.success('Payment method deleted');
        setPaymentMethods(prev => prev.filter(m => m._id !== methodId));
      }
    } catch (error) {
      toast.error(error.error || 'Failed to delete payment method');
    }
  }, []);

  return {
    loading,
    balance,
    pendingBalance,
    transactions,
    paymentMethods,
    withdrawals,
    invoices,
    pagination,
    fetchBalance,
    fetchTransactions,
    fetchPaymentMethods,
    fetchWithdrawals,
    fetchInvoices,
    createEscrow,
    releasePayment,
    addPaymentMethod,
    setDefaultMethod,
    deletePaymentMethod
  };
};