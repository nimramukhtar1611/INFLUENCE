import React, { useEffect, useMemo, useState } from 'react';
import {
  DollarSign,
  Wallet,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Loader,
  Search,
  RefreshCw,
} from 'lucide-react';
import paymentService from '../../services/paymentService';
import { formatNumber, formatCurrency, formatDate, timeAgo } from '../../utils/helpers';
import { getStatusColor, getStatusIconColor } from '../../utils/colorScheme';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import StatsCard from '../../components/Common/StatsCard';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';

const Payments = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingDeposit, setSubmittingDeposit] = useState(false);
  const [balance, setBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  const [pagination, setPagination] = useState({
    transactions: { page: 1, limit: 10, total: 0, pages: 1 },
    invoices: { page: 1, limit: 10, total: 0, pages: 1 },
  });

  const fetchPaymentData = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);

      const [balanceRes, transactionsRes, invoicesRes] = await Promise.allSettled([
        paymentService.getBalance(),
        paymentService.getTransactions(pagination.transactions.page, 10),
        paymentService.getInvoices(pagination.invoices.page, 10),
      ]);

      if (balanceRes.status === 'fulfilled' && balanceRes.value?.success) {
        setBalance(balanceRes.value.balance || 0);
        setPendingBalance(balanceRes.value.pending || 0);
      }

      if (transactionsRes.status === 'fulfilled' && transactionsRes.value?.success) {
        setTransactions(transactionsRes.value.transactions || []);
        setPagination(prev => ({
          ...prev,
          transactions: transactionsRes.value.pagination || prev.transactions,
        }));
      }

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
    const params = new URLSearchParams(window.location.search);
    const depositStatus = params.get('deposit');

    if (depositStatus === 'success') {
      toast.success('Stripe payment completed successfully. Refreshing payment data...');
      fetchPaymentData();
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (depositStatus === 'cancel') {
      toast('Stripe payment canceled.');
      window.history.replaceState({}, '', window.location.pathname);
    }

    fetchPaymentData();
  }, []);

  const handleDeposit = async () => {
    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount < 10) {
      toast.error('Minimum deposit is $10');
      return;
    }

    try {
      setSubmittingDeposit(true);
      const response = await paymentService.createDepositCheckoutSession(amount, 'usd');
      if (!response.success || !response.url) {
        toast.error(response.error || 'Failed to start Stripe checkout');
        return;
      }

      window.location.assign(response.url);
    } catch (error) {
      toast.error('Failed to start Stripe checkout');
    } finally {
      setSubmittingDeposit(false);
    }
  };

  const getStatusColorClass = (status) => {
    return getStatusColor(status, 'payment', isDark);
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'released':
        return CheckCircle;
      case 'pending':
        return Clock;
      case 'in-escrow':
        return Wallet;
      case 'failed':
        return XCircle;
      case 'refunded':
        return RefreshCw;
      default:
        return AlertCircle;
    }
  };

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      filtered = filtered.filter(
        t =>
          t.description?.toLowerCase().includes(term) ||
          t.transactionId?.toLowerCase().includes(term)
      );
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      if (dateFilter === '7d') filterDate.setDate(now.getDate() - 7);
      if (dateFilter === '30d') filterDate.setDate(now.getDate() - 30);
      if (dateFilter === '90d') filterDate.setDate(now.getDate() - 90);

      filtered = filtered.filter(t => new Date(t.createdAt) >= filterDate);
    }

    return filtered;
  }, [transactions, searchQuery, dateFilter]);

  const totals = useMemo(() => {
    const completed = transactions.filter((t) => t.status === 'completed');
    const totalVolume = completed.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalFees = completed.reduce((sum, t) => sum + Number(t.fee || 0), 0);

    const thisMonthVolume = completed
      .filter((t) => {
        const date = new Date(t.createdAt);
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      })
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    return { totalVolume, totalFees, thisMonthVolume };
  }, [transactions]);

  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-12 h-12 animate-spin text-[#667eea]" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isDark ? 'bg-gray-900' : 'bg-slate-100'}`}>
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl ${isDark ? 'bg-gray-900/90 backdrop-blur-sm border border-gray-700/50 shadow-sm' : 'bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-sm'}`}>
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Payments</h1>
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Stripe securely handles all payment details and billing checkout.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 rounded-xl shadow-lg text-white">
          <p className="text-sm opacity-90 mb-2">Available Balance</p>
          <h2 className="text-3xl font-bold mb-4">{formatCurrency(balance)}</h2>
          <Button
            variant="secondary"
            size="sm"
            className="bg-white text-[#667eea] hover:bg-gradient-to-r hover:from-[#667eea]/5 hover:to-[#764ba2]/5"
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
          title="Total Volume"
          value={formatCurrency(totals.totalVolume)}
          change="Completed transactions"
          icon={ArrowDownRight}
          color="bg-green-500"
        />

        <StatsCard
          title="Fees"
          value={formatCurrency(totals.totalFees)}
          change={`This month: ${formatCurrency(totals.thisMonthVolume)}`}
          icon={ArrowUpRight}
          color="bg-blue-500"
        />
      </div>

      <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-[#667eea] text-[#667eea]'
                : isDark
                  ? 'border-transparent text-gray-400 hover:text-gray-300'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'transactions'
                ? 'border-[#667eea] text-[#667eea]'
                : isDark
                  ? 'border-transparent text-gray-400 hover:text-gray-300'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'invoices'
                ? 'border-[#667eea] text-[#667eea]'
                : isDark
                  ? 'border-transparent text-gray-400 hover:text-gray-300'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Invoices
          </button>
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className={`rounded-xl shadow-sm overflow-hidden ${
          isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'
        }`}>
          <div className={`px-6 py-4 border-b flex justify-between items-center ${
            isDark ? 'border-gray-700/50' : 'border-gray-200/50'
          }`}>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Recent Transactions</h2>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`text-sm hover:underline ${
                isDark ? 'text-[#667eea] hover:text-[#5a67d8]' : 'text-[#667eea] hover:text-[#764ba2]'
              }`}
            >
              View All
            </button>
          </div>
          <div className={`divide-y ${isDark ? 'divide-gray-700/30' : 'divide-gray-200/30'}`}>
            {transactions.slice(0, 6).map(transaction => (
              <div key={transaction._id} className={`p-4 transition-all duration-200 ${isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{transaction.description || 'Transaction'}</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{timeAgo(transaction.createdAt)} • {transaction.transactionId}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{formatCurrency(transaction.amount || 0)}</p>
                    <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${getStatusColorClass(transaction.status)}`}>
                      {React.createElement(getStatusIcon(transaction.status), { className: `w-3 h-3 ${getStatusIconColor(transaction.status)}` })}
                      {transaction.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className={`rounded-xl shadow-sm overflow-hidden ${
          isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'
        }`}>
          <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700/50' : 'border-gray-200/50'}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>All Transactions</h2>

              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={`pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark 
                        ? 'bg-gray-800/50 border-gray-700/50 text-gray-100 placeholder:text-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
                    }`}
                  />
                </div>

                <select
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark 
                      ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
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
            <table className={`min-w-full divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
              <thead className={isDark ? 'bg-gray-800' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Date</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Description</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Amount</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Type</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Reference</th>
                </tr>
              </thead>
              <tbody className={`${isDark ? 'bg-gray-900' : 'bg-white'} divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map(transaction => (
                    <tr key={transaction._id} className={isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{formatDate(transaction.createdAt)}</td>
                      <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{transaction.description || 'Payment'}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{formatCurrency(transaction.amount || 0)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${getStatusColor(transaction.status)}`}>
                          {getStatusIcon(transaction.status)}
                          {transaction.status}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {transaction.type}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-xs font-mono ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{transaction.transactionId}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className={`px-6 py-12 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No transactions found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className={`rounded-xl shadow-sm overflow-hidden ${
          isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'
        }`}>
          <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700/50' : 'border-gray-200/50'}`}>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Invoices</h2>
          </div>
          <div className="overflow-x-auto">
            <table className={`min-w-full divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
              <thead className={isDark ? 'bg-gray-800' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Invoice #</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Date</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Amount</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</th>
                  <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`${isDark ? 'bg-gray-900' : 'bg-white'} divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {invoices.length > 0 ? (
                  invoices.map(invoice => (
                    <tr key={invoice._id} className={isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                        {invoice.invoiceNumber || invoice.transactionId}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatDate(invoice.createdAt)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                        {formatCurrency(invoice.amount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${getStatusColorClass(invoice.status)}`}>
                          {React.createElement(getStatusIcon(invoice.status), { className: `w-3 h-3 ${getStatusIconColor(invoice.status)}` })}
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => paymentService.downloadInvoice(invoice._id)}
                          className={`hover:${isDark ? 'text-[#667eea]' : 'text-[#764ba2]'}`}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className={`px-6 py-12 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No invoices found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={showDepositModal} onClose={() => setShowDepositModal(false)} title="Add Funds via Stripe">
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Amount to Add</label>
            <div className="relative">
              <DollarSign className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="number"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                placeholder="0.00"
                min="10"
                step="1"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark 
                    ? 'bg-gray-800/50 border-gray-700/50 text-gray-100 placeholder:text-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
                }`}
              />
            </div>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Minimum deposit: $10</p>
          </div>

          <div className={`p-4 rounded-lg ${isDark ? 'bg-blue-900/30 border border-blue-700/30' : 'bg-blue-50'}`}>
            <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
              You will be redirected to Stripe Checkout to complete payment securely.
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
            loading={submittingDeposit}
            disabled={!depositAmount || Number(depositAmount) < 10}
          >
            Continue to Stripe
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Payments;