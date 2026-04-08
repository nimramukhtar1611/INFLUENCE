// pages/Admin/Payments.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useAdminData } from '../../hooks/useAdminData';
import { useTheme } from '../../hooks/useTheme';
import {
  Search,
  Filter,
  Eye,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Calendar,
  RefreshCw,
  AlertCircle,
  Wallet,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import StatsCard from '../../components/Common/StatsCard';
import Loader from '../../components/Common/Loader';
import { formatCurrency, formatDate, timeAgo } from '../../utils/helpers';
import { getStatusColor, getStatusIconColor } from '../../utils/colorScheme';
import toast from 'react-hot-toast';

const AdminPayments = () => {
  const { payments, loading, refreshData, stats, approveWithdrawal } = useAdminData();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // ==================== FILTER PAYMENTS ====================
  useEffect(() => {
    if (payments) {
      let filtered = [...payments];
      
      // Apply search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(p => 
          p.transactionId?.toLowerCase().includes(query) ||
          p.from?.brandName?.toLowerCase().includes(query) ||
          p.from?.fullName?.toLowerCase().includes(query) ||
          p.to?.displayName?.toLowerCase().includes(query) ||
          p.to?.fullName?.toLowerCase().includes(query)
        );
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(p => p.status === statusFilter);
      }

      // Apply type filter
      if (typeFilter !== 'all') {
        filtered = filtered.filter(p => p.type === typeFilter);
      }

      // Apply date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        const filterDate = new Date();
        
        switch(dateFilter) {
          case 'today':
            filterDate.setHours(0, 0, 0, 0);
            filtered = filtered.filter(p => new Date(p.createdAt) >= filterDate);
            break;
          case 'week':
            filterDate.setDate(now.getDate() - 7);
            filtered = filtered.filter(p => new Date(p.createdAt) >= filterDate);
            break;
          case 'month':
            filterDate.setMonth(now.getMonth() - 1);
            filtered = filtered.filter(p => new Date(p.createdAt) >= filterDate);
            break;
        }
      }

      setFilteredPayments(filtered);
    }
  }, [payments, searchQuery, statusFilter, typeFilter, dateFilter]);

  // ==================== HANDLE VIEW DETAILS ====================
  const handleViewDetails = (payment) => {
    setSelectedPayment(payment);
    setShowDetailsModal(true);
  };

  // ==================== EXPORT CSV ====================
  const handleExport = () => {
    // Generate CSV
    const csvContent = [
      ['Transaction ID', 'From', 'To', 'Amount', 'Fee', 'Net', 'Status', 'Type', 'Date'].join(','),
      ...filteredPayments.map(p => [
        p.transactionId,
        `"${p.from?.brandName || p.from?.fullName || ''}"`,
        `"${p.to?.displayName || p.to?.fullName || ''}"`,
        p.amount || 0,
        p.fee || 0,
        p.netAmount || 0,
        p.status,
        p.type,
        p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // ==================== HANDLE APPROVE WITHDRAWAL ====================
  const handleApproveWithdrawal = async (payment) => {
    if (!window.confirm(`Are you sure you want to approve this withdrawal of ${formatCurrency(payment.amount)} for ${payment.from?.fullName || 'the creator'}?`)) {
      return;
    }

    try {
      const success = await approveWithdrawal(payment._id);
      if (success) {
        refreshData();
      }
    } catch (error) {
      console.error('Approval failed:', error);
    }
  };

  // ==================== STATUS HELPERS ====================
  const getStatusIcon = (status) => {
    switch(status?.toLowerCase()) {
      case 'completed':
      case 'released':
        return CheckCircle;
      case 'pending':
      case 'processing':
        return Clock;
      case 'failed':
        return XCircle;
      case 'refunded':
        return RefreshCw;
      case 'in-escrow':
        return Wallet;
      default:
        return AlertCircle;
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'escrow':
      case 'payment':
        return <ArrowUpRight className="w-4 h-4 text-blue-600" />;
      case 'withdrawal':
        return <ArrowDownRight className="w-4 h-4 text-green-600" />;
      case 'refund':
        return <RefreshCw className="w-4 h-4 text-orange-600" />;
      default:
        return <DollarSign className="w-4 h-4 text-gray-600" />;
    }
  };

  // ==================== CALCULATE TOTALS ====================
  const calculateTotals = () => {
    const totalRevenue = filteredPayments
      .filter(p => p.status === 'completed' && p.type !== 'withdrawal')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const totalFees = filteredPayments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.fee || 0), 0);
    
    const totalWithdrawals = filteredPayments
      .filter(p => p.status === 'completed' && p.type === 'withdrawal')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    return { totalRevenue, totalFees, totalWithdrawals };
  };

  const totals = calculateTotals();
  const cardRevenue = Number(stats.totalRevenue || totals.totalRevenue || 0);
  const cardFees = Number(stats.totalFees || totals.totalFees || 0);
  const cardPending = Number(
    stats.pendingPayouts ||
    filteredPayments.filter((p) => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount || 0), 0) ||
    0
  );
  const cardWithdrawals = Number(stats.pendingWithdrawalAmount || totals.totalWithdrawals || 0);

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="large" color="purple" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isDark ? 'bg-gray-900' : 'bg-slate-100'}`}>
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl ${isDark ? 'bg-gray-900/90 backdrop-blur-sm border border-gray-700/50 shadow-sm' : 'bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-sm'}`}>
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Payment Management</h1>
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Monitor all financial transactions on the platform</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={RefreshCw} onClick={refreshData}>
            Refresh
          </Button>
          <Button variant="outline" icon={Download} onClick={handleExport}>
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Revenue"
          value={formatCurrency(cardRevenue)}
          icon={DollarSign}
          color="bg-blue-500"
        />
        <StatsCard
          title="Platform Fees"
          value={formatCurrency(cardFees)}
          icon={TrendingUp}
          color="bg-green-500"
        />
        <StatsCard
          title="Pending"
          value={formatCurrency(cardPending)}
          icon={Clock}
          color="bg-yellow-500"
        />
        <StatsCard
          title="Withdrawals"
          value={formatCurrency(cardWithdrawals)}
          icon={Wallet}
          color="bg-purple-500"
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by transaction ID, brand, or creator..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="in-escrow">In Escrow</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="payment">Payment</option>
              <option value="escrow">Escrow</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="refund">Refund</option>
              <option value="fee">Fee</option>
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border rounded-lg flex items-center gap-2 ${
                showFilters ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'border-gray-300'
              }`}
            >
              <Filter className="w-4 h-4" />
              More Filters
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min. Amount ($)
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., 100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max. Amount ($)
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., 1000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <div className="flex gap-2">
                  <input type="date" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg" placeholder="Start" />
                  <input type="date" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg" placeholder="End" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" size="sm">Clear</Button>
              <Button variant="primary" size="sm">Apply</Button>
            </div>
          </div>
        )}
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                  <tr 
                    key={payment._id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleViewDetails(payment)}
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-mono font-medium text-gray-900">{payment.transactionId}</div>
                      {payment.invoiceNumber && (
                        <div className="text-xs text-gray-500">Invoice: {payment.invoiceNumber}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-bold text-gray-900">{formatCurrency(payment.amount || 0)}</div>
                      {payment.fee > 0 && (
                        <div className="text-xs text-gray-500">Fee: {formatCurrency(payment.fee)}</div>
                      )}
                      {payment.netAmount > 0 && (
                        <div className="text-xs text-green-600">Net: {formatCurrency(payment.netAmount)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${getStatusColor(payment.status, 'payment')}`}>
                        {React.createElement(getStatusIcon(payment.status), { className: `w-3 h-3 ${getStatusIconColor(payment.status)}` })}
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {getTypeIcon(payment.type)}
                        <span className="text-sm capitalize">{payment.type}</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                    No payments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Payment Details"
        size="lg"
        className="modal-scrollable"
      >
        {selectedPayment && (
          <div className="space-y-6 pr-2">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500">Transaction ID</p>
                  <p className="font-mono text-lg font-semibold">{selectedPayment.transactionId}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium inline-flex items-center gap-1 ${getStatusColor(selectedPayment.status, 'payment')}`}>
                  {React.createElement(getStatusIcon(selectedPayment.status), { className: `w-3 h-3 ${getStatusIconColor(selectedPayment.status)}` })}
                  {selectedPayment.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">From</p>
                <p className="font-medium">{selectedPayment.from?.brandName || selectedPayment.from?.fullName || '—'}</p>
                <p className="text-xs text-gray-500">{selectedPayment.from?.accountType || ''}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">To</p>
                <p className="font-medium">{selectedPayment.to?.displayName || selectedPayment.to?.fullName || '—'}</p>
                <p className="text-xs text-gray-500">{selectedPayment.to?.accountType || ''}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Amount</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedPayment.amount || 0)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Fee</p>
                <p className="text-xl font-semibold text-gray-700">{formatCurrency(selectedPayment.fee || 0)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Net Amount</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(selectedPayment.netAmount || selectedPayment.amount)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Currency</p>
                <p className="font-medium">{selectedPayment.currency || 'USD'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Date</p>
                <p className="font-medium">{formatDate(selectedPayment.createdAt)}</p>
                <p className="text-xs text-gray-500">{timeAgo(selectedPayment.createdAt)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Type</p>
                <p className="font-medium capitalize">{selectedPayment.type}</p>
              </div>
            </div>

            {selectedPayment.description && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Description</p>
                <p className="text-gray-700">{selectedPayment.description}</p>
              </div>
            )}

            {selectedPayment.dealId && (
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-2">Related Deal</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-700">Deal ID: {selectedPayment.dealId._id}</p>
                  {selectedPayment.dealId.campaignId?.title && (
                    <p className="text-sm text-gray-600">Campaign: {selectedPayment.dealId.campaignId.title}</p>
                  )}
                </div>
              </div>
            )}

            {selectedPayment.refunds?.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Refunds</h4>
                <div className="space-y-2">
                  {selectedPayment.refunds.map((refund, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Amount: {formatCurrency(refund.amount)}</span>
                        <span className="text-xs text-gray-500">{formatDate(refund.processedAt)}</span>
                      </div>
                      {refund.reason && <p className="text-xs text-gray-600 mt-1">Reason: {refund.reason}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminPayments;