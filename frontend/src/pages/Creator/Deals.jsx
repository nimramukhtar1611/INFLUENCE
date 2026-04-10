// pages/Creator/Deals.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, CheckCircle, Clock, AlertCircle, DollarSign, MessageSquare, Eye,
  XCircle, Loader, Calendar, Filter, ChevronLeft, ChevronRight, ChevronsLeft,
  ChevronsRight, X, User, Briefcase, ThumbsUp, ThumbsDown, RefreshCw
} from 'lucide-react';
import dealService from '../../services/dealService';
import { formatNumber, formatCurrency, formatDate, timeAgo } from '../../utils/helpers';
import { getStatusColor } from '../../utils/colorScheme';
import Button from '../../components/UI/Button';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';

const CreatorDeals = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState([]);
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  const statusConfig = {
    pending: { label: 'Pending', color: getStatusColor('pending', 'deal', isDark), icon: AlertCircle },
    accepted: { label: 'Accepted', color: getStatusColor('accepted', 'deal', isDark), icon: CheckCircle },
    'in-progress': { label: 'In Progress', color: getStatusColor('in-progress', 'deal', isDark), icon: Clock },
    completed: { label: 'Completed', color: getStatusColor('completed', 'deal', isDark), icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: getStatusColor('cancelled', 'deal', isDark), icon: XCircle },
    declined: { label: 'Declined', color: getStatusColor('rejected', 'deal', isDark), icon: XCircle },
    revision: { label: 'Revision', color: getStatusColor('revision', 'deliverable', isDark), icon: AlertCircle },
    negotiating: { label: 'Negotiating', color: getStatusColor('pending', 'status', isDark), icon: Clock }
  };

  useEffect(() => {
    fetchDeals();
  }, [filter, pagination.page]);

  const fetchDeals = async () => {
    setLoading(true);
    const res = await dealService.getCreatorDeals(filter === 'all' ? '' : filter, pagination.page, pagination.limit);
    if (res.success) {
      setDeals(res.deals || []);
      setPagination(res.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
    } else {
      toast.error(res.error || 'Failed to load deals');
      setDeals([]);
    }
    setLoading(false);
  };

  if (loading && deals.length === 0) {
    return <div className="flex items-center justify-center min-h-screen"><Loader className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className={`space-y-6 ${isDark ? 'bg-gray-900' : 'bg-slate-100'}`}>
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl ${isDark ? 'bg-gray-900/90 backdrop-blur-sm border border-gray-700/50 shadow-sm' : 'bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-sm'}`}>
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>My Deals</h1>
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Manage all your brand collaborations</p>
        </div>
        <Link to="/creator/available-deals">
          <Button variant="primary" size="sm" icon={Briefcase}>Find Deals</Button>
        </Link>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        {['all', 'pending', 'negotiating', 'accepted', 'in-progress', 'completed', 'cancelled', 'revision'].map(s => (
          <button
            key={s}
            onClick={() => { setFilter(s); setPagination(p => ({ ...p, page: 1 })); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
              filter === s 
                ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white' 
                : isDark
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      {/* Deals table */}
      <div className={`rounded-xl shadow-sm overflow-hidden border ${
        isDark ? 'bg-gray-900/90 border-gray-700/50' : 'bg-white border-gray-200/50'
      }`}>
        {deals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className={`min-w-full divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
              <thead className={isDark ? 'bg-gray-800' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Campaign</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Brand</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Budget</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Deadline</th>
                </tr>
              </thead>
              <tbody className={`${isDark ? 'bg-gray-900' : 'bg-white'} divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {deals.map(deal => {
                  const StatusIcon = statusConfig[deal.status]?.icon || AlertCircle;
                  const statusColor = statusConfig[deal.status]?.color || 'bg-gray-100 text-gray-800';
                  return (
                    <tr key={deal._id} className={`${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} cursor-pointer`}>
                      <Link to={`/creator/deals/${deal._id}`} className="contents">
                        <td className={`px-6 py-4 text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{deal.campaignId?.title || 'Campaign'}</td>
                        <td className={`px-6 py-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{deal.brandId?.brandName || 'Brand'}</td>
                        <td className={`px-6 py-4 font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{formatCurrency(deal.budget)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${statusColor}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig[deal.status]?.label || deal.status}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                          {deal.deadline ? formatDate(deal.deadline) : 'No deadline'}
                        </td>
                      </Link>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={`text-center py-12 rounded-xl ${isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'}`}>
            <Briefcase className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
            <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No deals found</p>
            <Link to="/creator/available-deals" className={`hover:underline ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Browse deals</Link>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1}
            className={`p-2 border rounded-lg disabled:opacity-50 ${
              isDark
                ? 'border-gray-600 hover:bg-gray-700/50'
                : 'border-gray-300 hover:bg-gray-50'
            }`}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className={`px-4 py-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Page {pagination.page} of {pagination.pages}</span>
          <button onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page === pagination.pages}
            className={`p-2 border rounded-lg disabled:opacity-50 ${
              isDark
                ? 'border-gray-600 hover:bg-gray-700/50'
                : 'border-gray-300 hover:bg-gray-50'
            }`}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default CreatorDeals;