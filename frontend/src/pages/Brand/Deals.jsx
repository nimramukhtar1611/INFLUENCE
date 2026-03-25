// pages/Brand/Deals.js - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  MessageSquare,
  Eye,
  XCircle,
  Loader,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  User,
  Briefcase,
  RefreshCw,
  MoreVertical
} from 'lucide-react';
import dealService from '../../services/dealService';
import { formatCurrency, formatDate, timeAgo } from '../../utils/helpers';
import Button from '../../components/UI/Button';
import toast from 'react-hot-toast';

const Deals = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deals, setDeals] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  // ==================== STATUS CONFIGURATION ====================
  const statusConfig = {
    pending:      { label: 'Pending',      color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
    accepted:     { label: 'Accepted',     color: 'bg-blue-100 text-blue-800',     icon: CheckCircle },
    'in-progress':{ label: 'In Progress',  color: 'bg-purple-100 text-purple-800', icon: Clock      },
    completed:    { label: 'Completed',    color: 'bg-green-100 text-green-800',   icon: CheckCircle },
    cancelled:    { label: 'Cancelled',    color: 'bg-red-100 text-red-800',       icon: XCircle    },
    declined:     { label: 'Declined',     color: 'bg-red-100 text-red-800',       icon: XCircle    },
    revision:     { label: 'Revision',     color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
    negotiating:  { label: 'Negotiating',  color: 'bg-indigo-100 text-indigo-800', icon: Clock     },
    disputed:     { label: 'Disputed',     color: 'bg-red-100 text-red-800',       icon: AlertCircle }
  };

  // ==================== STATUS FILTER OPTIONS ====================
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'declined', label: 'Declined' },
    { value: 'revision', label: 'Revision' },
    { value: 'negotiating', label: 'Negotiating' },
    { value: 'disputed', label: 'Disputed' }
  ];

  // ==================== FETCH DEALS ====================
  const fetchDeals = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);

      const response = await dealService.getBrandDeals(
        filter === 'all' ? '' : filter,
        pagination.page,
        pagination.limit
      );

      if (response?.success) {
        setDeals(response.deals || []);
        setPagination(response.pagination || {
          page: 1, limit: 10, total: 0, pages: 1
        });
        if (showToast) toast.success('Deals refreshed');
      } else {
        toast.error(response?.error || 'Failed to load deals');
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
      toast.error('Failed to load deals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ==================== INITIAL LOAD ====================
  useEffect(() => {
    fetchDeals();
  }, [filter, pagination.page, pagination.limit]);

  // ==================== PAGINATION HANDLERS ====================
  const goToPage = (page) => setPagination(prev => ({ ...prev, page }));
  const nextPage = () => {
    if (pagination.page < pagination.pages) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
    }
  };
  const prevPage = () => {
    if (pagination.page > 1) {
      setPagination(prev => ({ ...prev, page: prev.page - 1 }));
    }
  };

  // ==================== STATS ====================
  const activeCount = deals.filter(d => ['accepted', 'in-progress'].includes(d.status)).length;
  const pendingCount = deals.filter(d => d.status === 'pending').length;
  const completedCount = deals.filter(d => d.status === 'completed').length;

  // ==================== LOADING STATE ====================
  if (loading && deals.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-12 h-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deals</h1>
          <p className="text-gray-600">Manage all your creator collaborations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => fetchDeals(true)} loading={refreshing}>
            Refresh
          </Button>
          <Link to="/brand/search">
            <Button variant="primary" icon={User}>Find Creators</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Total Deals</p>
          <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Active</p>
          <p className="text-2xl font-bold text-blue-600">{activeCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Completed</p>
          <p className="text-2xl font-bold text-green-600">{completedCount}</p>
        </div>
      </div>

      {/* Status Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => {
              setFilter(option.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === option.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by campaign, creator, or deal ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Deals Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {deals.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deal Info</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creator</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Budget</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deadline</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deals.map((deal) => {
                    const StatusIcon = statusConfig[deal.status]?.icon || AlertCircle;
                    const statusStyles = statusConfig[deal.status] || statusConfig.pending;
                    
                    return (
                      <tr key={deal._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {deal.campaignId?.title || 'Campaign'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              ID: {deal._id?.slice(-8)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                              <User className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {deal.creatorId?.displayName || 'Creator'}
                              </div>
                              <div className="text-xs text-gray-500">{deal.creatorId?.handle || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-gray-900">
                            {formatCurrency(deal.budget || 0)}
                          </div>
                          {deal.platformFee > 0 && (
                            <div className="text-xs text-gray-500">
                              Fee: {formatCurrency(deal.platformFee)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs rounded-full flex items-center w-fit gap-1 ${statusStyles.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusStyles.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500">
                            {deal.deadline ? formatDate(deal.deadline) : 'No deadline'}
                          </div>
                          {deal.deadline && (
                            <div className="text-xs text-gray-400 mt-1">
                              {timeAgo(deal.deadline)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-indigo-600 h-2 rounded-full" 
                                style={{ width: `${deal.progress || 0}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">{deal.progress || 0}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            deal.paymentStatus === 'released' ? 'bg-green-100 text-green-800' :
                            deal.paymentStatus === 'in-escrow' ? 'bg-blue-100 text-blue-800' :
                            deal.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            deal.paymentStatus === 'refunded' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {deal.paymentStatus || 'pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/brand/deals/${deal._id}`}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            {deal.messages?.length > 0 && (
                              <div className="relative">
                                <MessageSquare className="w-4 h-4 text-gray-400" />
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                  {deal.messages.length}
                                </span>
                              </div>
                            )}
                         
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-sm text-gray-700">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} results
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => goToPage(1)} disabled={pagination.page === 1}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button onClick={prevPage} disabled={pagination.page === 1}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-700">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button onClick={nextPage} disabled={pagination.page === pagination.pages}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button onClick={() => goToPage(pagination.pages)} disabled={pagination.page === pagination.pages}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No deals found</p>
            <Link to="/brand/search">
              <Button variant="primary" size="sm">Find Creators</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Deals;