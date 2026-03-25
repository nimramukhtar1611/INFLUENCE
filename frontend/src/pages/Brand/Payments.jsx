import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  CreditCard,
  Wallet,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Trash2,
  Edit,
  ArrowUpRight,
  ArrowDownRight,
  Loader,
  Calendar,
  Filter,
  Search,
  Eye,
  MoreVertical,
  RefreshCw,
} from 'lucide-react';
import paymentService from '../../services/paymentService';
import { formatCurrency, formatDate, timeAgo } from '../../utils/helpers';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Modal from '../../components/Common/Modal';
import StatsCard from '../../components/Common/StatsCard';
import toast from 'react-hot-toast';

const Payments = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  const [newMethod, setNewMethod] = useState({
    type: 'credit_card',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
    isDefault: false,
  });

  const [pagination, setPagination] = useState({
    transactions: { page: 1, limit: 10, total: 0, pages: 1 },
    invoices: { page: 1, limit: 10, total: 0, pages: 1 },
  });

  // ==================== FETCH DATA ====================
  const fetchPaymentData = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);

      const [balanceRes, transactionsRes, methodsRes, invoicesRes] = await Promise.allSettled([
        paymentService.getBalance(),
        paymentService.getTransactions(pagination.transactions.page, 10),
        paymentService.getPaymentMethods(),
        paymentService.getInvoices(pagination.invoices.page, 10),
      ]);

      // Balance
      if (balanceRes.status === 'fulfilled' && balanceRes.value?.success) {
        setBalance(balanceRes.value.balance || 0);
        setPendingBalance(balanceRes.value.pending || 0);
      }

      // Transactions
      if (transactionsRes.status === 'fulfilled' && transactionsRes.value?.success) {
        setTransactions(transactionsRes.value.transactions || []);
        setPagination(prev => ({
          ...prev,
          transactions: transactionsRes.value.pagination || prev.transactions,
        }));
      }

      // Payment Methods
      if (methodsRes.status === 'fulfilled' && methodsRes.value?.success) {
        setPaymentMethods(methodsRes.value.paymentMethods || []);
      }

      // Invoices
      if (invoicesRes.status === 'fulfilled' && invoicesRes.value?.success) {
        setInvoices(invoicesRes.value.invoices || []);
        setPagination(prev => ({
          ...prev,
          invoices: invoicesRes.value.pagination || prev.invoices,
        }));
      }

      if (showToast) toast.success('Payment data refreshed');
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPaymentData();
  }, []);

  // ==================== ADD PAYMENT METHOD ====================
  const handleAddPaymentMethod = async () => {
    try {
      if (newMethod.type === 'credit_card') {
        if (!newMethod.cardNumber || newMethod.cardNumber.length !== 16) {
          toast.error('Please enter a valid card number');
          return;
        }
        if (!newMethod.expiryMonth || !newMethod.expiryYear) {
          toast.error('Please enter expiry date');
          return;
        }
        if (!newMethod.cvv || newMethod.cvv.length < 3) {
          toast.error('Please enter a valid CVV');
          return;
        }
      }

      const response = await paymentService.addPaymentMethod(newMethod);
      if (response?.success) {
        setShowAddMethodModal(false);
        setNewMethod({
          type: 'credit_card',
          cardNumber: '',
          expiryMonth: '',
          expiryYear: '',
          cvv: '',
          cardholderName: '',
          isDefault: false,
        });
        fetchPaymentData();
        toast.success('Payment method added');
      } else {
        toast.error(response?.error || 'Failed to add payment method');
      }
    } catch (error) {
      console.error('Error adding payment method:', error);
      toast.error('Failed to add payment method');
    }
  };

  // ==================== SET DEFAULT METHOD ====================
  const handleSetDefaultMethod = async (methodId) => {
    try {
      await paymentService.setDefaultMethod(methodId);
      fetchPaymentData();
      toast.success('Default method updated');
    } catch (error) {
      console.error('Error setting default method:', error);
      toast.error('Failed to set default method');
    }
  };

  // ==================== DELETE METHOD ====================
  const handleDeleteMethod = async (methodId) => {
    if (!window.confirm('Are you sure you want to delete this payment method?')) return;

    try {
      await paymentService.deletePaymentMethod(methodId);
      fetchPaymentData();
      toast.success('Payment method deleted');
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast.error('Failed to delete payment method');
    }
  };

  // ==================== HANDLE DEPOSIT ====================
  const handleDeposit = async () => {
    if (!depositAmount || depositAmount < 10) {
      toast.error('Minimum deposit is $10');
      return;
    }

    // In a real implementation, this would integrate with Stripe
    toast.info('Deposit functionality coming soon. This would integrate with Stripe.');
    setShowDepositModal(false);
    setDepositAmount('');
  };

  // ==================== GET STATUS STYLES ====================
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'released':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-escrow':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'released':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'in-escrow':
        return <Wallet className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      case 'refunded':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // ==================== FILTERED TRANSACTIONS ====================
  const getFilteredTransactions = () => {
    let filtered = [...transactions];

    if (searchQuery) {
      filtered = filtered.filter(
        t =>
          t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.transactionId?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
        case '7d':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(t => new Date(t.createdAt) >= filterDate);
          break;
        case '30d':
          filterDate.setDate(now.getDate() - 30);
          filtered = filtered.filter(t => new Date(t.createdAt) >= filterDate);
          break;
        case '90d':
          filterDate.setDate(now.getDate() - 90);
          filtered = filtered.filter(t => new Date(t.createdAt) >= filterDate);
          break;
      }
    }

    return filtered;
  };

  // ==================== CALCULATE TOTALS ====================
  const calculateTotals = () => {
    const totalDeposits = transactions
      .filter(t => t.type === 'deposit' && t.status === 'completed')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalSpent = transactions
      .filter(t => t.type === 'payment' && t.status === 'completed')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalFees = transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + (t.fee || 0), 0);

    return { totalDeposits, totalSpent, totalFees };
  };

  const totals = calculateTotals();

  // ==================== LOADING STATE ====================
  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-12 h-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  const filteredTransactions = getFilteredTransactions();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600">Manage your transactions and payment methods</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={() => fetchPaymentData(true)}
            loading={refreshing}
          >
            Refresh
          </Button>
          <Button variant="primary" icon={DollarSign} onClick={() => setShowDepositModal(true)}>
            Add Funds
          </Button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 rounded-xl shadow-lg text-white">
          <p className="text-sm opacity-90 mb-2">Available Balance</p>
          <h2 className="text-3xl font-bold mb-4">{formatCurrency(balance)}</h2>
          <Button
            variant="secondary"
            size="sm"
            className="bg-white text-indigo-600 hover:bg-indigo-50"
            onClick={() => setShowDepositModal(true)}
          >
            Add Funds
          </Button>
        </div>

        <StatsCard
          title="Pending"
          value={formatCurrency(pendingBalance)}
          change="Awaiting approval"
          icon={Clock}
          color="bg-yellow-500"
        />

        <StatsCard
          title="Total Deposits"
          value={formatCurrency(totals.totalDeposits)}
          change={`${transactions.filter(t => t.type === 'deposit').length} transactions`}
          icon={ArrowDownRight}
          color="bg-green-500"
        />

        <StatsCard
          title="Total Spent"
          value={formatCurrency(totals.totalSpent)}
          change={`Fees: ${formatCurrency(totals.totalFees)}`}
          icon={ArrowUpRight}
          color="bg-blue-500"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'transactions'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'invoices'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Invoices
          </button>
          <button
            onClick={() => setActiveTab('methods')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'methods'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Payment Methods
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Recent Transactions */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
              <button
                onClick={() => setActiveTab('transactions')}
                className="text-indigo-600 text-sm hover:text-indigo-700"
              >
                View All
              </button>
            </div>
            <div className="divide-y divide-gray-200">
              {transactions.slice(0, 5).map(transaction => (
                <div key={transaction._id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          transaction.type === 'deposit' ? 'bg-green-100' : 'bg-blue-100'
                        }`}
                      >
                        {transaction.type === 'deposit' ? (
                          <ArrowDownRight className="w-4 h-4 text-green-600" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {transaction.description || 'Transaction'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {timeAgo(transaction.createdAt)} • {transaction.transactionId}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {transaction.type === 'deposit' ? '+' : '-'}
                        {formatCurrency(transaction.amount || 0)}
                      </p>
                      <span
                        className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${getStatusColor(
                          transaction.status
                        )}`}
                      >
                        {getStatusIcon(transaction.status)}
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Methods Summary */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Payment Methods</h2>
              <button
                onClick={() => setActiveTab('methods')}
                className="text-indigo-600 text-sm hover:text-indigo-700"
              >
                Manage
              </button>
            </div>

            <div className="space-y-3">
              {paymentMethods.length > 0 ? (
                paymentMethods.slice(0, 2).map(method => (
                  <div
                    key={method._id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {method.type === 'credit_card'
                            ? `${method.brand || 'Card'} ending in ${method.last4}`
                            : method.type === 'paypal'
                            ? `PayPal - ${method.paypalEmail}`
                            : `${method.bankName} - ${method.accountNumber}`}
                        </p>
                        {method.expiry && (
                          <p className="text-xs text-gray-500">Expires {method.expiry}</p>
                        )}
                      </div>
                    </div>
                    {method.isDefault && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">No payment methods added</p>
                  <button
                    onClick={() => setShowAddMethodModal(true)}
                    className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                  >
                    Add Payment Method
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <p className="text-sm text-gray-500 mb-1">This Month's Spending</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(
                  transactions
                    .filter(t => {
                      const date = new Date(t.createdAt);
                      const now = new Date();
                      return (
                        t.type === 'payment' &&
                        t.status === 'completed' &&
                        date.getMonth() === now.getMonth() &&
                        date.getFullYear() === now.getFullYear()
                      );
                    })
                    .reduce((sum, t) => sum + (t.amount || 0), 0)
                )}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Average Transaction</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(
                  transactions
                    .filter(t => t.status === 'completed')
                    .reduce((sum, t, _, arr) => sum + (t.amount || 0) / (arr.length || 1), 0)
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-gray-900">All Transactions</h2>

              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <select
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Time</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map(transaction => (
                    <tr key={transaction._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(transaction.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.description || 'Payment'}
                        </div>
                        {transaction.dealId?.campaignId?.title && (
                          <div className="text-xs text-gray-500">
                            {transaction.dealId.campaignId.title}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          {formatCurrency(transaction.amount || 0)}
                        </div>
                        {transaction.fee > 0 && (
                          <div className="text-xs text-gray-500">Fee: {formatCurrency(transaction.fee)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${getStatusColor(
                            transaction.status
                          )}`}
                        >
                          {getStatusIcon(transaction.status)}
                          {transaction.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                        {transaction.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-500">
                        {transaction.transactionId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button className="text-indigo-600 hover:text-indigo-900 mr-2">
                          <Eye className="w-4 h-4" />
                        </button>
                        {transaction.type === 'payment' && transaction.status === 'completed' && (
                          <button className="text-gray-400 hover:text-gray-600">
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.transactions.pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-700">
                Page {pagination.transactions.page} of {pagination.transactions.pages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPagination(prev => ({
                      ...prev,
                      transactions: { ...prev.transactions, page: prev.transactions.page - 1 },
                    }));
                    fetchPaymentData();
                  }}
                  disabled={pagination.transactions.page === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => {
                    setPagination(prev => ({
                      ...prev,
                      transactions: { ...prev.transactions, page: prev.transactions.page + 1 },
                    }));
                    fetchPaymentData();
                  }}
                  disabled={pagination.transactions.page === pagination.transactions.pages}
                  className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Invoices</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.length > 0 ? (
                  invoices.map(invoice => (
                    <tr key={invoice._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {invoice.invoiceNumber || invoice.transactionId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(invoice.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{invoice.description || 'Invoice'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {formatCurrency(invoice.amount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => paymentService.downloadInvoice(invoice._id)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No invoices found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'methods' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Payment Methods</h2>
              <Button variant="outline" size="sm" icon={Plus} onClick={() => setShowAddMethodModal(true)}>
                Add Method
              </Button>
            </div>

            <div className="divide-y divide-gray-200">
              {paymentMethods.length > 0 ? (
                paymentMethods.map(method => (
                  <div key={method._id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <CreditCard className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {method.type === 'credit_card'
                              ? `${method.brand || 'Card'} •••• ${method.last4}`
                              : method.type === 'paypal'
                              ? `PayPal - ${method.paypalEmail}`
                              : `${method.bankName} •••• ${method.accountNumber?.slice(-4)}`}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {method.expiry && (
                              <p className="text-xs text-gray-500">Expires {method.expiry}</p>
                            )}
                            {method.verified && (
                              <span className="text-xs text-green-600">✓ Verified</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {method.isDefault && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            Default
                          </span>
                        )}
                        {!method.isDefault && (
                          <button
                            onClick={() => handleSetDefaultMethod(method._id)}
                            className="text-sm text-indigo-600 hover:text-indigo-700"
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteMethod(method._id)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No payment methods added yet</p>
                  <Button variant="outline" size="sm" icon={Plus} onClick={() => setShowAddMethodModal(true)}>
                    Add Payment Method
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Security Note */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800">Secure Payment Processing</p>
                <p className="text-sm text-blue-600 mt-1">
                  All payment information is encrypted and processed securely through Stripe. We never store your full
                  card details.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Method Modal */}
      <Modal
        isOpen={showAddMethodModal}
        onClose={() => setShowAddMethodModal(false)}
        title="Add Payment Method"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method Type</label>
            <select
              value={newMethod.type}
              onChange={e => setNewMethod({ ...newMethod, type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="credit_card">Credit Card</option>
              <option value="paypal">PayPal</option>
              <option value="bank_account">Bank Account</option>
            </select>
          </div>

          {newMethod.type === 'credit_card' && (
            <>
              <Input
                label="Card Number"
                value={newMethod.cardNumber}
                onChange={e => setNewMethod({ ...newMethod, cardNumber: e.target.value })}
                placeholder="1234 5678 9012 3456"
                maxLength="19"
              />
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Month"
                  value={newMethod.expiryMonth}
                  onChange={e => setNewMethod({ ...newMethod, expiryMonth: e.target.value })}
                  placeholder="MM"
                  maxLength="2"
                />
                <Input
                  label="Year"
                  value={newMethod.expiryYear}
                  onChange={e => setNewMethod({ ...newMethod, expiryYear: e.target.value })}
                  placeholder="YY"
                  maxLength="2"
                />
                <Input
                  label="CVV"
                  value={newMethod.cvv}
                  onChange={e => setNewMethod({ ...newMethod, cvv: e.target.value })}
                  placeholder="123"
                  maxLength="4"
                  type="password"
                />
              </div>
              <Input
                label="Cardholder Name"
                value={newMethod.cardholderName}
                onChange={e => setNewMethod({ ...newMethod, cardholderName: e.target.value })}
                placeholder="John Doe"
              />
            </>
          )}

          {newMethod.type === 'paypal' && (
            <Input
              label="PayPal Email"
              type="email"
              value={newMethod.paypalEmail}
              onChange={e => setNewMethod({ ...newMethod, paypalEmail: e.target.value })}
              placeholder="your@email.com"
            />
          )}

          {newMethod.type === 'bank_account' && (
            <>
              <Input
                label="Account Holder Name"
                value={newMethod.accountHolderName}
                onChange={e => setNewMethod({ ...newMethod, accountHolderName: e.target.value })}
                placeholder="John Doe"
              />
              <Input
                label="Bank Name"
                value={newMethod.bankName}
                onChange={e => setNewMethod({ ...newMethod, bankName: e.target.value })}
                placeholder="Chase, Wells Fargo, etc."
              />
              <Input
                label="Routing Number"
                value={newMethod.routingNumber}
                onChange={e => setNewMethod({ ...newMethod, routingNumber: e.target.value })}
                placeholder="123456789"
                maxLength="9"
              />
              <Input
                label="Account Number"
                value={newMethod.accountNumber}
                onChange={e => setNewMethod({ ...newMethod, accountNumber: e.target.value })}
                placeholder="Account number"
              />
            </>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isDefault"
              checked={newMethod.isDefault}
              onChange={e => setNewMethod({ ...newMethod, isDefault: e.target.checked })}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isDefault" className="ml-2 text-sm text-gray-600">
              Set as default payment method
            </label>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Your payment method will be verified within 1-2 business days. You'll receive a
              confirmation once verified.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowAddMethodModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddPaymentMethod}>
            Add Method
          </Button>
        </div>
      </Modal>

      {/* Deposit Modal */}
      <Modal isOpen={showDepositModal} onClose={() => setShowDepositModal(false)} title="Add Funds">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount to Add</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="number"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                placeholder="0.00"
                min="10"
                step="10"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Minimum deposit: $10</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            {paymentMethods.length > 0 ? (
              <select className="w-full px-4 py-3 border border-gray-300 rounded-lg">
                {paymentMethods.map(method => (
                  <option key={method._id} value={method._id}>
                    {method.type === 'credit_card'
                      ? `${method.brand || 'Card'} ending in ${method.last4}`
                      : method.type === 'paypal'
                      ? `PayPal - ${method.paypalEmail}`
                      : `${method.bankName} - ${method.accountNumber}`}
                    {method.isDefault ? ' (Default)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-center py-4 border border-gray-200 rounded-lg">
                <p className="text-gray-500">No payment methods added</p>
                <button
                  onClick={() => {
                    setShowDepositModal(false);
                    setShowAddMethodModal(true);
                  }}
                  className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                >
                  Add Payment Method
                </button>
              </div>
            )}
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Processing:</strong> Funds will be available immediately in your account.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowDepositModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleDeposit}
            disabled={!depositAmount || depositAmount < 10 || paymentMethods.length === 0}
          >
            Add Funds
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Payments;