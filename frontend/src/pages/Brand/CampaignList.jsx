// pages/Brand/CampaignList.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Play,
  Eye,
  Edit,
  Copy,
  Archive,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Loader,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  MoreVertical,
  RefreshCw,
  Save, // for Draft button
  File, // alternative if needed
} from 'lucide-react';
import campaignService from '../../services/campaignService';
import { formatCurrency, formatDate } from '../../utils/helpers';
import Button from '../../components/UI/Button';
import { useCampaign } from '../../hooks/useCampaign';
import StatsCard from '../../components/Common/StatsCard';
import toast from 'react-hot-toast';

const CampaignList = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [counts, setCounts] = useState({});
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { publishCampaign } = useCampaign();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  // ==================== FETCH CAMPAIGNS ====================
  const fetchCampaigns = async (showToast = false) => {
    try {
      if (showToast) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params = {
        status: filter === 'all' ? '' : filter,
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery,
      };

      const response = await campaignService.getBrandCampaigns(
        filter === 'all' ? '' : filter,
        pagination.page,
        pagination.limit
      );

      if (response?.success) {
        setCampaigns(response.campaigns || []);
        setCounts(response.counts || {});
        setPagination(response.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 1
        });

        if (showToast) {
          toast.success('Campaigns refreshed');
        }
      } else {
        toast.error(response?.error || 'Failed to load campaigns');
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ==================== INITIAL LOAD ====================
  useEffect(() => {
    fetchCampaigns();
  }, [filter, pagination.page, pagination.limit]);

  // ==================== HANDLE SEARCH ====================
  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchCampaigns();
  };

  // ==================== CLEAR SEARCH ====================
  const clearSearch = () => {
    setSearchQuery('');
    setPagination(prev => ({ ...prev, page: 1 }));
    setTimeout(() => fetchCampaigns(), 100);
  };

  // ==================== CHANGE PAGE ====================
  const goToPage = (page) => {
    setPagination(prev => ({ ...prev, page }));
  };

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

  // ==================== DUPLICATE CAMPAIGN ====================
  const handleDuplicate = async (campaignId) => {
    try {
      const response = await campaignService.duplicateCampaign(campaignId);
      if (response?.success) {
        toast.success('Campaign duplicated');
        fetchCampaigns();
      } else {
        toast.error(response?.error || 'Failed to duplicate campaign');
      }
    } catch (error) {
      toast.error('Failed to duplicate campaign');
    }
  };

  // ==================== ARCHIVE CAMPAIGN ====================
  const handleArchive = async (campaignId) => {
    if (!window.confirm('Archive this campaign? It will be hidden from active lists.')) {
      return;
    }

    try {
      const response = await campaignService.archiveCampaign(campaignId);
      if (response?.success) {
        toast.success('Campaign archived');
        fetchCampaigns();
      } else {
        toast.error(response?.error || 'Failed to archive campaign');
      }
    } catch (error) {
      toast.error('Failed to archive campaign');
    }
  };

  // ==================== PUBLISH ============================
  const handlePublish = async (campaignId) => {
    try {
      const result = await publishCampaign(campaignId);
      if (result) {
        toast.success('Campaign published successfully');
        fetchCampaigns();
      }
    } catch (error) {
      toast.error('Failed to publish campaign');
    }
  };

  // ==================== MOVE TO DRAFT =====================
  const handleDraft = async (campaignId) => {
    try {
      // Assuming campaignService has an updateCampaign method
      const response = await campaignService.updateCampaign(campaignId, { status: 'draft' });
      if (response?.success) {
        toast.success('Campaign moved to draft');
        fetchCampaigns();
      } else {
        toast.error(response?.error || 'Failed to update campaign');
      }
    } catch (error) {
      toast.error('Failed to update campaign');
    }
  };

  // ==================== STATS ====================
  const stats = [
    {
      label: 'Total Campaigns',
      value: pagination.total,
      icon: TrendingUp,
      color: 'bg-blue-500'
    },
    {
      label: 'Active',
      value: counts.active || 0,
      icon: CheckCircle,
      color: 'bg-green-500'
    },
    {
      label: 'Draft',
      value: counts.draft || 0,
      icon: Edit,
      color: 'bg-gray-500'
    },
    {
      label: 'Completed',
      value: counts.completed || 0,
      icon: Archive,
      color: 'bg-purple-500'
    },
  ];

  // ==================== STATUS BADGE ====================
  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      paused: 'bg-orange-100 text-orange-800',
      completed: 'bg-blue-100 text-blue-800',
      archived: 'bg-gray-100 text-gray-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'active': return <CheckCircle className="w-3 h-3" />;
      case 'draft': return <Edit className="w-3 h-3" />;
      case 'pending': return <Clock className="w-3 h-3" />;
      case 'paused': return <Clock className="w-3 h-3" />;
      case 'completed': return <CheckCircle className="w-3 h-3" />;
      default: return <AlertCircle className="w-3 h-3" />;
    }
  };

  // ==================== LOADING STATE ====================
  if (loading && campaigns.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-12 h-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600">Manage all your influencer campaigns</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={() => fetchCampaigns(true)}
            loading={refreshing}
          >
            Refresh
          </Button>
          <Link to="/brand/campaigns/new">
            <Button variant="primary" icon={Plus}>
              New Campaign
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Status Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {['all', 'active', 'draft', 'pending', 'paused', 'completed'].map((status) => (
          <button
            key={status}
            onClick={() => {
              setFilter(status);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === status
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status}
            {status !== 'all' && counts[status] > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                filter === status
                  ? 'bg-white text-indigo-600'
                  : 'bg-gray-200 text-gray-700'
              }`}>
                {counts[status]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search Bar (Filters removed) */}
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search campaigns by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Campaigns Display */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {campaigns.length > 0 ? (
          <>
            {/* Desktop Table View (hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campaign
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
                      Progress
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
                  {campaigns.map((campaign) => (
                    <tr key={campaign._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{campaign.title}</div>
                        <div className="text-xs text-gray-500 mt-1">ID: {campaign._id?.slice(-8)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${getStatusBadge(campaign.status)}`}>
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
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-indigo-600 h-2 rounded-full"
                              style={{ width: `${campaign.progress || 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{campaign.progress || 0}%</span>
                        </div>
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
                          <Link
                            to={`/brand/campaigns/${campaign._id}`}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link
                            to={`/brand/campaigns/${campaign._id}/edit`}
                            className="text-gray-600 hover:text-gray-900"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDuplicate(campaign._id)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Duplicate"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          {campaign.status !== 'archived' && (
                            <button
                              onClick={() => handleArchive(campaign._id)}
                              className="text-gray-600 hover:text-gray-900"
                              title="Archive"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}
                          {campaign.status === 'active' && (
                            <button
                              onClick={() => handleDraft(campaign._id)}
                              className="text-orange-600 hover:text-orange-700"
                              title="Move to Draft"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                          )}
                          {(campaign.status === 'draft' || campaign.status === 'pending') && (
                            <button
                              onClick={() => handlePublish(campaign._id)}
                              className="text-green-600 hover:text-green-700"
                              title="Publish"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (visible only on mobile) */}
            <div className="md:hidden divide-y divide-gray-200">
              {campaigns.map((campaign) => (
                <div key={campaign._id} className="p-4 space-y-3">
                  {/* Header with title and status */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{campaign.title}</h3>
                      <p className="text-xs text-gray-500">ID: {campaign._id?.slice(-8)}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${getStatusBadge(campaign.status)}`}>
                      {getStatusIcon(campaign.status)}
                      {campaign.status}
                    </span>
                  </div>

                  {/* Budget & Spent */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Budget:</span>{' '}
                      <span className="font-medium">{formatCurrency(campaign.budget || 0)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Spent:</span>{' '}
                      <span className="font-medium">{formatCurrency(campaign.spent || 0)}</span>
                    </div>
                  </div>

                  {/* Creators & Progress */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-gray-500">Creators:</span>{' '}
                      <span className="font-medium">{campaign.selectedCreators?.length || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${campaign.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">{campaign.progress || 0}%</span>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="text-xs text-gray-600">
                    <div>Start: {campaign.startDate ? formatDate(campaign.startDate) : 'N/A'}</div>
                    <div>End: {campaign.endDate ? formatDate(campaign.endDate) : 'N/A'}</div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                    <Link
                      to={`/brand/campaigns/${campaign._id}`}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    <Link
                      to={`/brand/campaigns/${campaign._id}/edit`}
                      className="text-gray-600 hover:text-gray-900"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDuplicate(campaign._id)}
                      className="text-gray-600 hover:text-gray-900"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {campaign.status !== 'archived' && (
                      <button
                        onClick={() => handleArchive(campaign._id)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Archive"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                    {campaign.status === 'active' && (
                      <button
                        onClick={() => handleDraft(campaign._id)}
                        className="text-orange-600 hover:text-orange-700"
                        title="Move to Draft"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                    )}
                    {(campaign.status === 'draft' || campaign.status === 'pending') && (
                      <button
                        onClick={() => handlePublish(campaign._id)}
                        className="text-green-600 hover:text-green-700"
                        title="Publish"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
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
                  <button
                    onClick={() => goToPage(1)}
                    disabled={pagination.page === 1}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="First Page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>

                  <button
                    onClick={prevPage}
                    disabled={pagination.page === 1}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-4 py-2 text-sm text-gray-700">
                    Page {pagination.page} of {pagination.pages}
                  </span>

                  <button
                    onClick={nextPage}
                    disabled={pagination.page === pagination.pages}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => goToPage(pagination.pages)}
                    disabled={pagination.page === pagination.pages}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Last Page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">No campaigns found</p>
            {/* "Create Your First Campaign" button removed as requested */}
          </div>
        )}
      </div>

      {/* Quick Tips */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="p-1 bg-blue-100 rounded-full">
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-blue-800 mb-1">Campaign Tips</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Active campaigns are visible to creators</li>
              <li>• You can pause campaigns anytime</li>
              <li>• Draft campaigns are only visible to you</li>
              <li>• Completed campaigns are archived automatically</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignList;