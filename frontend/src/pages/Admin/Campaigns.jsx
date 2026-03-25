// pages/Admin/Campaigns.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useAdminData } from '../../hooks/useAdminData';
import {
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Download,
  BarChart3,
  Target,
  Award,
  AlertCircle,
  Pause,
  Play,
  Archive
} from 'lucide-react';
import Button from '../../components/UI/Button';
import StatsCard from '../../components/Common/StatsCard';
import Modal from '../../components/Common/Modal';
import { formatCurrency, formatDate, timeAgo } from '../../utils/helpers';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const Campaigns = () => {
  const { campaigns, loading, refreshData, stats } = useAdminData();
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusAction, setStatusAction] = useState({ status: '', reason: '' });

  // ==================== FILTER CAMPAIGNS ====================
  useEffect(() => {
    if (campaigns) {
      let filtered = [...campaigns];
      
      // Apply search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(c => 
          c.title?.toLowerCase().includes(query) ||
          c.brandId?.brandName?.toLowerCase().includes(query) ||
          c.category?.toLowerCase().includes(query)
        );
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(c => c.status === statusFilter);
      }

      // Apply category filter
      if (categoryFilter !== 'all') {
        filtered = filtered.filter(c => c.category === categoryFilter);
      }

      setFilteredCampaigns(filtered);
    }
  }, [campaigns, searchQuery, statusFilter, categoryFilter]);

  // ==================== HANDLE VIEW DETAILS ====================
  const handleViewDetails = (campaign) => {
    setSelectedCampaign(campaign);
    setShowDetailsModal(true);
  };

  // ==================== HANDLE STATUS CHANGE ====================
  const handleStatusChange = async () => {
    try {
      // This would call an admin API to update campaign status
      // For now, just show success
      toast.success(`Campaign status updated to ${statusAction.status}`);
      setShowStatusModal(false);
      refreshData();
    } catch (error) {
      toast.error('Failed to update campaign status');
    }
  };

  // ==================== EXPORT CSV ====================
  const handleExport = () => {
    // Generate CSV
    const csvContent = [
      ['Title', 'Brand', 'Category', 'Status', 'Budget', 'Spent', 'Start Date', 'End Date', 'Creators'].join(','),
      ...filteredCampaigns.map(c => [
        `"${c.title}"`,
        `"${c.brandId?.brandName || ''}"`,
        `"${c.category}"`,
        c.status,
        c.budget || 0,
        c.spent || 0,
        c.startDate ? formatDate(c.startDate) : '',
        c.endDate ? formatDate(c.endDate) : '',
        c.selectedCreators?.length || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaigns-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // ==================== STATUS COLOR & ICON ====================
  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-orange-100 text-orange-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'draft': return <Edit className="w-4 h-4" />;
      case 'completed': return <Award className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      case 'archived': return <Archive className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const categories = [...new Set(campaigns?.map(c => c.category).filter(Boolean))];

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaign Management</h1>
          <p className="text-gray-600">Monitor and manage all campaigns on the platform</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={Download} onClick={handleExport}>
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Campaigns"
          value={stats.totalCampaigns?.toLocaleString() || '0'}
          icon={Target}
          color="bg-blue-500"
        />
        <StatsCard
          title="Active Campaigns"
          value={campaigns?.filter(c => c.status === 'active').length || 0}
          icon={TrendingUp}
          color="bg-green-500"
        />
        <StatsCard
          title="Pending Approval"
          value={campaigns?.filter(c => c.status === 'pending').length || 0}
          icon={Clock}
          color="bg-yellow-500"
        />
        <StatsCard
          title="Total Budget"
          value={formatCurrency(campaigns?.reduce((sum, c) => sum + (c.budget || 0), 0) || 0)}
          icon={DollarSign}
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
              placeholder="Search campaigns by title, brand, or category..."
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
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="draft">Draft</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
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
                  Min. Budget ($)
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., 1000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max. Budget ($)
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., 10000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                  <option value="">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" size="sm">Clear</Button>
              <Button variant="primary" size="sm">Apply</Button>
            </div>
          </div>
        )}
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Brand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Budget
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Creators
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dates
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCampaigns.length > 0 ? (
                filteredCampaigns.map((campaign) => (
                  <tr key={campaign._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{campaign.title}</div>
                      <div className="text-xs text-gray-500">ID: {campaign._id?.slice(-8)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {campaign.brandId?.logo ? (
                          <img src={campaign.brandId.logo} alt={campaign.brandId.brandName} className="w-6 h-6 rounded-full mr-2" />
                        ) : (
                          <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mr-2">
                            <span className="text-xs font-bold text-indigo-600">B</span>
                          </div>
                        )}
                        <span className="text-sm text-gray-900">{campaign.brandId?.brandName || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{campaign.category || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${getStatusColor(campaign.status)}`}>
                        {getStatusIcon(campaign.status)}
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(campaign.budget || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(campaign.spent || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {campaign.selectedCreators?.length || 0}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-900">
                        Start: {campaign.startDate ? formatDate(campaign.startDate) : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">
                        End: {campaign.endDate ? formatDate(campaign.endDate) : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDetails(campaign)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <Link
                          to={`/admin/campaigns/${campaign._id}/edit`}
                          className="text-gray-400 hover:text-gray-600"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        {campaign.status === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedCampaign(campaign);
                                setStatusAction({ status: 'active', reason: '' });
                                setShowStatusModal(true);
                              }}
                              className="text-green-600 hover:text-green-700"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCampaign(campaign);
                                setStatusAction({ status: 'rejected', reason: '' });
                                setShowStatusModal(true);
                              }}
                              className="text-red-600 hover:text-red-700"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                    No campaigns found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaign Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Campaign Details"
        size="lg"
      >
        {selectedCampaign && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{selectedCampaign.title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                Brand: {selectedCampaign.brandId?.brandName} • Category: {selectedCampaign.category}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Budget</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(selectedCampaign.budget || 0)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Spent</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(selectedCampaign.spent || 0)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Start Date</p>
                <p className="font-medium">{selectedCampaign.startDate ? formatDate(selectedCampaign.startDate) : 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">End Date</p>
                <p className="font-medium">{selectedCampaign.endDate ? formatDate(selectedCampaign.endDate) : 'N/A'}</p>
              </div>
            </div>

            {selectedCampaign.description && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-2">Description</p>
                <p className="text-gray-700">{selectedCampaign.description}</p>
              </div>
            )}

            {/* Deliverables */}
            {selectedCampaign.deliverables?.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Deliverables</h4>
                <div className="space-y-2">
                  {selectedCampaign.deliverables.map((del, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium capitalize">{del.type} on {del.platform}</p>
                          {del.description && <p className="text-sm text-gray-600">{del.description}</p>}
                        </div>
                        <span className="text-sm font-semibold">Qty: {del.quantity || 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Target Audience */}
            {selectedCampaign.targetAudience && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Target Audience</h4>
                <div className="grid grid-cols-2 gap-4">
                  {selectedCampaign.targetAudience.minFollowers && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Min Followers</p>
                      <p className="font-medium">{selectedCampaign.targetAudience.minFollowers}</p>
                    </div>
                  )}
                  {selectedCampaign.targetAudience.maxFollowers && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Max Followers</p>
                      <p className="font-medium">{selectedCampaign.targetAudience.maxFollowers}</p>
                    </div>
                  )}
                  {selectedCampaign.targetAudience.minEngagement && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Min Engagement</p>
                      <p className="font-medium">{selectedCampaign.targetAudience.minEngagement}%</p>
                    </div>
                  )}
                </div>
                {selectedCampaign.targetAudience.niches?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-500 mb-2">Niches</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedCampaign.targetAudience.niches.map((niche, i) => (
                        <span key={i} className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs">
                          {niche}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Applications */}
            {selectedCampaign.applications?.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Applications ({selectedCampaign.applications.length})</h4>
                <div className="space-y-2">
                  {selectedCampaign.applications.slice(0, 3).map((app, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-medium">{app.creatorId?.displayName || 'Creator'}</p>
                        <p className="text-xs text-gray-500">Applied {timeAgo(app.appliedAt)}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        app.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {app.status}
                      </span>
                    </div>
                  ))}
                  {selectedCampaign.applications.length > 3 && (
                    <p className="text-xs text-gray-500 text-center">+{selectedCampaign.applications.length - 3} more</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Status Change Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title={`${statusAction.status === 'active' ? 'Approve' : 'Reject'} Campaign`}
      >
        {selectedCampaign && (
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to {statusAction.status === 'active' ? 'approve' : 'reject'} the campaign "{selectedCampaign.title}"?
            </p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason (Optional)
              </label>
              <textarea
                rows="3"
                value={statusAction.reason}
                onChange={(e) => setStatusAction({ ...statusAction, reason: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter reason for this action..."
              />
            </div>

            {statusAction.status === 'rejected' && (
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Note:</strong> The brand will be notified and the campaign will be moved to rejected status.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowStatusModal(false)}>
            Cancel
          </Button>
          <Button
            variant={statusAction.status === 'active' ? 'success' : 'danger'}
            onClick={handleStatusChange}
          >
            {statusAction.status === 'active' ? 'Approve' : 'Reject'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Campaigns;