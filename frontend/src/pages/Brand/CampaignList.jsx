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
import { useTheme } from '../../hooks/useTheme';

const CampaignList = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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
        <Loader className="w-12 h-12 animate-spin text-[#667eea]" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isDark ? 'bg-gray-900' : 'bg-slate-100'}`}>
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl ${isDark ? 'bg-gray-900/90 backdrop-blur-sm border border-gray-700/50 shadow-sm' : 'bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-sm'}`}>
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Campaigns</h1>
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Manage all your influencer campaigns</p>
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
                ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status}
            {status !== 'all' && counts[status] > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                filter === status
                  ? 'bg-white text-[#667eea]'
                  : 'bg-gray-200 text-gray-700'
              }`}>
                {counts[status]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search Bar (Filters removed) */}
      <div className={`p-4 rounded-xl shadow-sm ${isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'}`}>
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search campaigns by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#667eea] ${
                isDark 
                  ? 'bg-gray-800/50 border-gray-700/50 text-gray-100 placeholder:text-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Campaigns Display */}
      <div className={`rounded-xl shadow-sm overflow-hidden border ${
        isDark ? 'bg-gray-900/90 border-gray-700/50' : 'bg-white border-gray-200/50'
      }`}>
        {campaigns.length > 0 ? (
          <>
            {/* Desktop Table View (hidden on mobile) */}
            <div className="hidden lg:block overflow-x-auto">
              <div className="min-w-full inline-block align-middle">
                <table className="w-full divide-y divide-gray-200">
                <thead className={isDark ? 'bg-gray-800' : 'bg-gray-50'}>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap min-w-[120px]">Campaign</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap min-w-[70px]">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap min-w-[70px]">Budget</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap min-w-[70px]">Spent</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap min-w-[60px]">Creators</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap min-w-[80px]">Progress</th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap min-w-[100px]">Dates</th>
                  </tr>
                </thead>
                <tbody className={`${isDark ? 'bg-gray-900' : 'bg-white'} divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {campaigns.map((campaign) => (
                    <tr 
                      key={campaign._id} 
                      className={`${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} transition-colors duration-200 cursor-pointer`}
                      onClick={() => window.location.href = `/brand/campaigns/${campaign._id}`}
                    >
                      <td className="px-3 py-3">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-[110px]">{campaign.title}</div>
                        <div className="text-xs mt-1 text-gray-500">ID: {campaign._id?.slice(-8)}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${getStatusBadge(campaign.status)}`}>
                          {getStatusIcon(campaign.status)}
                          {campaign.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm font-medium text-gray-900">
                        {formatCurrency(campaign.budget || 0)}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900">
                        {formatCurrency(campaign.spent || 0)}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900">
                        {campaign.selectedCreators?.length || 0}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 rounded-full h-1.5 bg-gray-200">
                            <div
                              className="bg-gradient-to-r from-[#667eea] to-[#764ba2] h-1.5 rounded-full"
                              style={{ width: `${campaign.progress || 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{campaign.progress || 0}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-xs text-gray-900">
                          Start: {campaign.startDate ? formatDate(campaign.startDate) : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                          End: {campaign.endDate ? formatDate(campaign.endDate) : 'N/A'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>

            {/* Mobile Card View (visible only on mobile and tablet) */}
            <div className="lg:hidden divide-y divide-gray-200">
              {campaigns.map((campaign) => (
                <div 
                  key={campaign._id} 
                  className="p-3 space-y-2 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                  onClick={() => window.location.href = `/brand/campaigns/${campaign._id}`}
                >
                  {/* Header with title and status */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1 mr-3">
                      <h3 className="font-medium text-gray-900 truncate text-sm">{campaign.title}</h3>
                      <p className="text-xs text-gray-500">ID: {campaign._id?.slice(-8)}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 flex-shrink-0 ${getStatusBadge(campaign.status)}`}>
                      {getStatusIcon(campaign.status)}
                      {campaign.status}
                    </span>
                  </div>

                  {/* Budget & Spent */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Budget:</span>{' '}
                      <span className="font-medium text-gray-900">{formatCurrency(campaign.budget || 0)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Spent:</span>{' '}
                      <span className="font-medium text-gray-900">{formatCurrency(campaign.spent || 0)}</span>
                    </div>
                  </div>

                  {/* Creators & Progress */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-gray-500">Creators:</span>{' '}
                      <span className="font-medium text-gray-900">{campaign.selectedCreators?.length || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-12 rounded-full h-1.5 bg-gray-200">
                        <div 
                          className="bg-gradient-to-r from-[#667eea] to-[#764ba2] h-1.5 rounded-full" 
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
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className={`px-6 py-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isDark ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} results
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(1)}
                    disabled={pagination.page === 1}
                    className={`p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                      isDark 
                        ? 'border-gray-600 hover:bg-gray-700/50'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                    title="First Page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>

                  <button
                    onClick={prevPage}
                    disabled={pagination.page === 1}
                    className={`p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                      isDark 
                        ? 'border-gray-600 hover:bg-gray-700/50'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className={`px-4 py-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Page {pagination.page} of {pagination.pages}
                  </span>

                  <button
                    onClick={nextPage}
                    disabled={pagination.page === pagination.pages}
                    className={`p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                      isDark 
                        ? 'border-gray-600 hover:bg-gray-700/50'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => goToPage(pagination.pages)}
                    disabled={pagination.page === pagination.pages}
                    className={`p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                      isDark 
                        ? 'border-gray-600 hover:bg-gray-700/50'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
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
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <TrendingUp className={`w-8 h-8 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
            </div>
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>No campaigns found</p>
            {/* "Create Your First Campaign" button removed as requested */}
          </div>
        )}
      </div>

      {/* Quick Tips */}
      <div className={`p-4 rounded-lg ${isDark ? 'bg-blue-900/30 border border-blue-700/30' : 'bg-blue-50'}`}>
        <div className="flex items-start gap-3">
          <div className={`p-1 rounded-full ${isDark ? 'bg-blue-800/50' : 'bg-blue-100'}`}>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className={`font-medium mb-1 ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>Campaign Tips</h3>
            <ul className={`text-sm space-y-1 ${isDark ? 'text-blue-200' : 'text-blue-700'}`}>
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