// pages/Creator/Earnings.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Wallet,
  Loader,
  Calendar,
  Download,
  CreditCard,
  Building2,
  Plus,
  Trash2,
  Edit,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Eye,
  FileText,
  BarChart3
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useEarnings } from '../../hooks/useEarnings';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate, timeAgo } from '../../utils/helpers';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import StatsCard from '../../components/Common/StatsCard';
import toast from 'react-hot-toast';

const Earnings = () => {
  const { user } = useAuth();
  const {
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
  } = useEarnings();

  const [activeTab, setActiveTab] = useState('overview');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [period, setPeriod] = useState('30d');
  const [chartType, setChartType] = useState('area');
  
  const [newMethod, setNewMethod] = useState({
    type: 'paypal',
    paypalEmail: '',
    bankName: '',
    accountNumber: '',
    routingNumber: '',
    accountHolderName: ''
  });

  // ==================== FETCH DATA ON MOUNT ====================
  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      await Promise.all([
        fetchBalance(),
        fetchTransactions(1, 10),
        fetchWithdrawals(1, 10),
        fetchPaymentMethods(),
        fetchEarningsHistory(period)
      ]);
    };
    
    loadData();
  }, [period, user]);

  // ==================== WITHDRAWAL HANDLER ====================
  const handleWithdraw = async () => {
    if (!withdrawAmount || !selectedMethod) {
      toast.error('Please fill all fields');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (amount < 50) {
      toast.error('Minimum withdrawal amount is $50');
      return;
    }

    if (amount > balance) {
      toast.error('Insufficient balance');
      return;
    }

    const success = await requestWithdrawal(amount, selectedMethod);
    if (success) {
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setSelectedMethod('');
    }
  };

  // ==================== ADD PAYMENT METHOD ====================
  const handleAddPaymentMethod = async () => {
    if (newMethod.type === 'paypal' && !newMethod.paypalEmail) {
      toast.error('PayPal email is required');
      return;
    }

    if (newMethod.type === 'bank_account' && (!newMethod.accountNumber || !newMethod.routingNumber)) {
      toast.error('Bank account details are required');
      return;
    }

    const success = await addPaymentMethod(newMethod);
    if (success) {
      setShowAddMethodModal(false);
      setNewMethod({
        type: 'paypal',
        paypalEmail: '',
        bankName: '',
        accountNumber: '',
        routingNumber: '',
        accountHolderName: ''
      });
    }
  };

  // ==================== STATUS HELPERS ====================
  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'completed':
      case 'released':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'in-escrow':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch(status?.toLowerCase()) {
      case 'completed':
      case 'released':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
      case 'processing':
        return <Clock className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // ==================== CHART DATA ====================
  const chartData = earningsHistory.map(item => ({
    date: `${item._id?.month || ''}/${item._id?.year || ''}`,
    earnings: item.earnings || 0,
    deals: item.count || 0
  }));

  // ==================== SUMMARY CALCULATIONS ====================
  const totalEarned = transactions
    .filter(t => t.type === 'payment' && t.status === 'completed')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalWithdrawn = withdrawals
    .filter(w => w.status === 'completed')
    .reduce((sum, w) => sum + (w.amount || 0), 0);

  const pendingTotal = transactions
    .filter(t => t.status === 'pending' || t.status === 'in-escrow')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  // ==================== LOADING STATE ====================
  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
          <p className="text-gray-600">Track your income and manage payouts</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={() => {
              fetchBalance();
              fetchTransactions(1, 10);
              fetchWithdrawals(1, 10);
              fetchPaymentMethods();
              fetchEarningsHistory(period);
            }}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Wallet}
            onClick={() => setShowWithdrawModal(true)}
            disabled={balance < 50}
          >
            Withdraw Funds
          </Button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 rounded-xl shadow-lg text-white">
          <p className="text-sm opacity-90 mb-2">Available Balance</p>
          <h2 className="text-3xl font-bold mb-4">{formatCurrency(balance)}</h2>
          <button
            onClick={() => setShowWithdrawModal(true)}
            disabled={balance < 50}
            className="w-full bg-white text-indigo-600 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Withdraw Now
          </button>
        </div>

        <StatsCard
          title="Pending"
          value={formatCurrency(pendingBalance)}
          change="Awaiting approval"
          icon={Clock}
          color="bg-yellow-500"
        />

        <StatsCard
          title="This Month"
          value={formatCurrency(summary.thisMonth)}
          change={getGrowthPercentage()}
          icon={TrendingUp}
          color="bg-green-500"
        />

        <StatsCard
          title="Lifetime"
          value={formatCurrency(summary.total)}
          change={`${transactions.length} transactions`}
          icon={DollarSign}
          color="bg-blue-500"
        />
      </div>

      {/* Time Period Selector */}
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Time Period:</span>
          </div>
          <div className="flex gap-2">
            {['7d', '30d', '90d', '12m'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : p === '90d' ? '90 Days' : '12 Months'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Earnings Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Earnings Overview</h2>
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setChartType('area')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                chartType === 'area' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600'
              }`}
            >
              Area
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                chartType === 'bar' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600'
              }`}
            >
              Bar
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                chartType === 'line' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-600'
              }`}
            >
              Line
            </button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          {chartType === 'area' && (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Area
                type="monotone"
                dataKey="earnings"
                stroke="#4F46E5"
                fillOpacity={1}
                fill="url(#colorEarnings)"
              />
            </AreaChart>
          )}

          {chartType === 'bar' && (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="earnings" fill="#4F46E5" />
            </BarChart>
          )}

          {chartType === 'line' && (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Line type="monotone" dataKey="earnings" stroke="#4F46E5" strokeWidth={2} />
            </LineChart>
          )}
        </ResponsiveContainer>
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
            onClick={() => setActiveTab('withdrawals')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'withdrawals'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Withdrawals
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Total Earned</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalEarned)}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Total Withdrawn</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totalWithdrawn)}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Pending</p>
              <p className="text-xl font-bold text-yellow-600">{formatCurrency(pendingTotal)}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Avg. Deal Value</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.averageDealValue)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
              <button
                onClick={() => setActiveTab('transactions')}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                View All
              </button>
            </div>
            <div className="divide-y divide-gray-200">
              {transactions.slice(0, 5).map((transaction) => (
                <div key={transaction._id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        transaction.type === 'payment' ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        {transaction.type === 'payment' ? (
                          <ArrowUpRight className="w-4 h-4 text-green-600" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {transaction.description || 'Payment received'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {timeAgo(transaction.createdAt)} • {transaction.transactionId}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        +{formatCurrency(transaction.amount || 0)}
                      </p>
                      <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${getStatusColor(transaction.status)}`}>
                        {getStatusIcon(transaction.status)}
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All Transactions</h2>
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
                {transactions.length > 0 ? (
                  transactions.map((transaction) => (
                    <tr key={transaction._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(transaction.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.description || 'Payment'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {transaction.dealId?.campaignId?.title || ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {formatCurrency(transaction.amount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${getStatusColor(transaction.status)}`}>
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
                        <button
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setShowTransactionModal(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
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

          {pagination.pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-700">
                Page {pagination.page} of {pagination.pages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchTransactions(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchTransactions(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'withdrawals' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Withdrawal History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {withdrawals.length > 0 ? (
                  withdrawals.map((withdrawal) => (
                    <tr key={withdrawal._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(withdrawal.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {formatCurrency(withdrawal.amount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {withdrawal.paymentMethod?.type || 'Bank Transfer'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${getStatusColor(withdrawal.status)}`}>
                          {getStatusIcon(withdrawal.status)}
                          {withdrawal.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {withdrawal.transactionId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button className="text-indigo-600 hover:text-indigo-900">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No withdrawals yet
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
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Payment Methods</h2>
              <Button
                variant="outline"
                size="sm"
                icon={Plus}
                onClick={() => setShowAddMethodModal(true)}
              >
                Add Method
              </Button>
            </div>
            
            <div className="space-y-4">
              {paymentMethods.length > 0 ? (
                paymentMethods.map((method) => (
                  <div key={method._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      {method.type === 'paypal' ? (
                        <CreditCard className="w-6 h-6 text-blue-600" />
                      ) : (
                        <Building2 className="w-6 h-6 text-gray-600" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {method.type === 'paypal' 
                            ? `PayPal - ${method.paypalEmail}` 
                            : `${method.bankName || 'Bank'} - ****${method.accountNumber?.slice(-4)}`}
                        </p>
                        {method.verified && (
                          <p className="text-xs text-green-600 flex items-center mt-1">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {method.isDefault && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                          Default
                        </span>
                      )}
                      {!method.isDefault && (
                        <button
                          onClick={() => setDefaultMethod(method._id)}
                          className="text-sm text-indigo-600 hover:text-indigo-700"
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={() => deletePaymentMethod(method._id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No payment methods added yet</p>
                  <Button variant="outline" onClick={() => setShowAddMethodModal(true)}>
                    Add Payment Method
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payout Schedule</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Processing Time</span>
                <span className="font-medium">2-3 business days</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Minimum Withdrawal</span>
                <span className="font-medium">$50</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Withdrawal Fee</span>
                <span className="font-medium text-green-600">Free</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      <Modal
        isOpen={showWithdrawModal}
        onClose={() => {
          setShowWithdrawModal(false);
          setWithdrawAmount('');
          setSelectedMethod('');
        }}
        title="Withdraw Funds"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount to Withdraw
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                min="50"
                max={balance}
                step="0.01"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Available balance: {formatCurrency(balance)} | Minimum withdrawal: $50
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Payment Method
            </label>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a method</option>
              {paymentMethods.length > 0 ? (
                paymentMethods.map(method => (
                  <option key={method._id} value={method._id}>
                    {method.type === 'paypal' 
                      ? `PayPal - ${method.paypalEmail}`
                      : `${method.bankName || 'Bank'} - ****${method.accountNumber?.slice(-4)}`}
                    {method.isDefault ? ' (Default)' : ''}
                  </option>
                ))
              ) : (
                <option value="" disabled>No payment methods added</option>
              )}
            </select>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Processing Time:</strong> Withdrawals typically take 2-3 business days to process.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowWithdrawModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleWithdraw}
            disabled={!withdrawAmount || !selectedMethod || parseFloat(withdrawAmount) < 50 || parseFloat(withdrawAmount) > balance}
          >
            Confirm Withdrawal
          </Button>
        </div>
      </Modal>

      {/* Add Payment Method Modal */}
      <Modal
        isOpen={showAddMethodModal}
        onClose={() => {
          setShowAddMethodModal(false);
          setNewMethod({
            type: 'paypal',
            paypalEmail: '',
            bankName: '',
            accountNumber: '',
            routingNumber: '',
            accountHolderName: ''
          });
        }}
        title="Add Payment Method"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method Type
            </label>
            <select
              value={newMethod.type}
              onChange={(e) => setNewMethod({...newMethod, type: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="paypal">PayPal</option>
              <option value="bank_account">Bank Account (US Only)</option>
            </select>
          </div>

          {newMethod.type === 'paypal' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PayPal Email
              </label>
              <input
                type="email"
                value={newMethod.paypalEmail}
                onChange={(e) => setNewMethod({...newMethod, paypalEmail: e.target.value})}
                placeholder="your@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={newMethod.accountHolderName}
                  onChange={(e) => setNewMethod({...newMethod, accountHolderName: e.target.value})}
                  placeholder="John Doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={newMethod.bankName}
                  onChange={(e) => setNewMethod({...newMethod, bankName: e.target.value})}
                  placeholder="Chase, Wells Fargo, etc."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Routing Number
                </label>
                <input
                  type="text"
                  value={newMethod.routingNumber}
                  onChange={(e) => setNewMethod({...newMethod, routingNumber: e.target.value})}
                  placeholder="9-digit routing number"
                  maxLength="9"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  value={newMethod.accountNumber}
                  onChange={(e) => setNewMethod({...newMethod, accountNumber: e.target.value})}
                  placeholder="Account number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </>
          )}

          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Your payment method will be verified within 1-2 business days. You'll receive a confirmation email once verified.
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

      {/* Transaction Details Modal */}
      <Modal
        isOpen={showTransactionModal}
        onClose={() => {
          setShowTransactionModal(false);
          setSelectedTransaction(null);
        }}
        title="Transaction Details"
        size="lg"
      >
        {selectedTransaction && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">Transaction ID</p>
                  <p className="font-mono text-sm font-medium">{selectedTransaction.transactionId}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium inline-flex items-center gap-1 ${getStatusColor(selectedTransaction.status)}`}>
                  {getStatusIcon(selectedTransaction.status)}
                  {selectedTransaction.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Date</p>
                <p className="font-medium">{formatDate(selectedTransaction.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Time</p>
                <p className="font-medium">{new Date(selectedTransaction.createdAt).toLocaleTimeString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Amount</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(selectedTransaction.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Fee</p>
                <p className="font-medium text-gray-600">{formatCurrency(selectedTransaction.fee || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Net Amount</p>
                <p className="font-bold text-green-600">{formatCurrency(selectedTransaction.netAmount || selectedTransaction.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Type</p>
                <p className="font-medium capitalize">{selectedTransaction.type}</p>
              </div>
            </div>

            {selectedTransaction.description && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Description</p>
                <p className="text-gray-700">{selectedTransaction.description}</p>
              </div>
            )}

            {selectedTransaction.dealId && (
              <div className="border-t border-gray-200 pt-4">
                <Link
                  to={`/creator/deals/${selectedTransaction.dealId._id}`}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center"
                  onClick={() => setShowTransactionModal(false)}
                >
                  View Related Deal
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Earnings;