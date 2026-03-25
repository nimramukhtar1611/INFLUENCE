// pages/Creator/Deals.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, CheckCircle, Clock, AlertCircle, DollarSign, MessageSquare, Eye,
  XCircle, Loader, Calendar, Filter, ChevronLeft, ChevronRight, ChevronsLeft,
  ChevronsRight, X, User, Briefcase, ThumbsUp, ThumbsDown, RefreshCw
} from 'lucide-react';
import dealService from '../../services/dealService';
import { formatCurrency, formatDate, timeAgo } from '../../utils/helpers';
import Button from '../../components/UI/Button';
import toast from 'react-hot-toast';

const CreatorDeals = () => {
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState([]);
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  const statusConfig = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
    accepted: { label: 'Accepted', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
    'in-progress': { label: 'In Progress', color: 'bg-purple-100 text-purple-800', icon: Clock },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
    declined: { label: 'Declined', color: 'bg-red-100 text-red-800', icon: XCircle },
    revision: { label: 'Revision', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
    negotiating: { label: 'Negotiating', color: 'bg-indigo-100 text-indigo-800', icon: Clock }
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Deals</h1>
          <p className="text-gray-600">Manage all your brand collaborations</p>
        </div>
        <Link to="/creator/available-deals">
          <Button variant="primary" size="sm" icon={Briefcase}>Find Deals</Button>
        </Link>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        {['all', 'pending', 'accepted', 'in-progress', 'completed', 'cancelled', 'revision'].map(s => (
          <button
            key={s}
            onClick={() => { setFilter(s); setPagination(p => ({ ...p, page: 1 })); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
              filter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      {/* Deals table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {deals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Budget</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deadline</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deals.map(deal => {
                  const StatusIcon = statusConfig[deal.status]?.icon || AlertCircle;
                  const statusColor = statusConfig[deal.status]?.color || 'bg-gray-100 text-gray-800';
                  return (
                    <tr key={deal._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{deal.campaignId?.title || 'Campaign'}</td>
                      <td className="px-6 py-4">{deal.brandId?.brandName || 'Brand'}</td>
                      <td className="px-6 py-4 font-bold text-gray-900">{formatCurrency(deal.budget)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${statusColor}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig[deal.status]?.label || deal.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {deal.deadline ? formatDate(deal.deadline) : 'No deadline'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/creator/deals/${deal._id}`} className="text-indigo-600 hover:text-indigo-900">
                          <Eye className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No deals found</p>
            <Link to="/creator/available-deals" className="text-indigo-600 hover:text-indigo-700">Browse deals</Link>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-4 py-2 text-gray-600">Page {pagination.page} of {pagination.pages}</span>
          <button onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page === pagination.pages}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default CreatorDeals;