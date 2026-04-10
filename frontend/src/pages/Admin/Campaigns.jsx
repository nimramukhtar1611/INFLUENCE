// pages/Admin/Campaigns.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useAdminData } from '../../hooks/useAdminData';
import {
  Search,
  Filter,
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
import Loader from '../../components/Common/Loader';
import { formatCurrency, formatDate, timeAgo } from '../../utils/helpers';
import adminService from '../../services/adminService';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';

const Campaigns = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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
      const response = await adminService.updateCampaignStatus(selectedCampaign._id, statusAction.status, statusAction.reason);
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to update campaign status');
      }

      toast.success(`Campaign status updated to ${statusAction.status}`);
      setShowStatusModal(false);
      setSelectedCampaign(null);
      setStatusAction({ status: '', reason: '' });
      refreshData();
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message || 'Failed to update campaign status');
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
          <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Campaign Management</h1>
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Monitor and manage all campaigns on the platform</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={Download} onClick={handleExport}>
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
      <div className={`p-3 sm:p-4 rounded-xl shadow-sm ${isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'}`}>
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search campaigns by title, brand, or category..."
              className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${
                isDark 
                  ? 'bg-gray-800/50 border-gray-700/50 text-gray-100 placeholder:text-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
              }`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${
                isDark 
                  ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
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
              className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${
                isDark 
                  ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 border rounded-lg flex items-center gap-2 text-sm ${
                showFilters 
                  ? isDark ? 'bg-indigo-900/30 border-indigo-600 text-indigo-400' : 'bg-indigo-50 border-indigo-600 text-indigo-600'
                  : isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'
              }`}
            >
              <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">More Filters</span>
              <span className="sm:hidden">Filters</span>
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className={`mt-3 sm:mt-4 pt-3 sm:pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className={`block text-xs sm:text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Min. Budget ($)
                </label>
                <input
                  type="number"
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${
                    isDark 
                      ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="e.g., 1000"
                />
              </div>
              <div>
                <label className={`block text-xs sm:text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Max. Budget ($)
                </label>
                <input
                  type="number"
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${
                    isDark 
                      ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="e.g., 10000"
                />
              </div>
              <div>
                <label className={`block text-xs sm:text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Date Range
                </label>
                <select className={`w-full px-3 py-2 border rounded-lg text-sm ${
                  isDark 
                    ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}>
                  <option value="">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3 sm:mt-4">
              <Button variant="secondary" size="sm">Clear</Button>
              <Button variant="primary" size="sm">Apply</Button>
            </div>
          </div>
        )}
      </div>

      {/* Campaigns Table */}
      <div className={`rounded-xl shadow-sm overflow-hidden ${isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'}`}>
        <div className="overflow-x-auto overflow-y-hidden">
          <table className={`min-w-full divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            <thead className={isDark ? 'bg-gray-800' : 'bg-gray-50'}>
              <tr>
                <th className={`px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap min-w-[80px] sm:min-w-[120px]`}>
                  Campaign
                </th>
                <th className={`px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap min-w-[60px] sm:min-w-[80px]`}>
                  Brand
                </th>
                <th className={`hidden sm:table-cell px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap min-w-[60px]`}>
                  Category
                </th>
                <th className={`px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap min-w-[50px]`}>
                  Status
                </th>
                <th className={`hidden md:table-cell px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap min-w-[60px]`}>
                  Budget
                </th>
                <th className={`hidden md:table-cell px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap min-w-[60px]`}>
                  Spent
                </th>
                <th className={`hidden lg:table-cell px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap min-w-[60px]`}>
                  Creators
                </th>
                <th className={`hidden lg:table-cell px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap min-w-[60px]`}>
                  Created
                </th>
              </tr>
            </thead>
            <tbody className={`${isDark ? 'bg-gray-900' : 'bg-white'} divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredCampaigns.length > 0 ? (
                filteredCampaigns.map((campaign) => (
                  <tr 
                    key={campaign._id} 
                    className={`${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} cursor-pointer`}
                    onClick={() => handleViewDetails(campaign)}
                  >
                    <td className="px-1 sm:px-3 py-2 whitespace-nowrap">
                      <div className={`text-xs sm:text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} truncate max-w-[80px] sm:max-w-[120px]`}>{campaign.title}</div>
                      <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ID: {campaign._id?.slice(-6)}</div>
                    </td>
                    <td className={`px-1 sm:px-3 py-2 text-xs sm:text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'} truncate max-w-[60px] sm:max-w-[80px]`}>{campaign.brandId?.brandName}</td>
                    <td className={`hidden sm:table-cell px-1 sm:px-3 py-2 text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} truncate max-w-[60px] sm:max-w-[80px]`}>{campaign.category}</td>
                    <td className="px-1 sm:px-3 py-2 whitespace-nowrap">
                      <span className={`px-1 py-1 text-xs rounded-full ${
                        campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                        campaign.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        campaign.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        campaign.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className={`hidden md:table-cell px-1 sm:px-3 py-2 text-xs sm:text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} whitespace-nowrap`}>
                      {formatCurrency(campaign.budget || 0)}
                    </td>
                    <td className={`hidden md:table-cell px-1 sm:px-3 py-2 text-xs sm:text-sm font-medium text-green-600 whitespace-nowrap`}>
                      {formatCurrency(campaign.spent || 0)}
                    </td>
                    <td className={`hidden lg:table-cell px-1 sm:px-3 py-2 text-xs sm:text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'} whitespace-nowrap`}>
                      {campaign.selectedCreators?.length || 0}
                    </td>
                    <td className={`hidden lg:table-cell px-1 sm:px-3 py-2 text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap`}>
                      <div className="text-xs">
                        {campaign.createdAt && formatDate(campaign.createdAt)}
                        <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{timeAgo(campaign.createdAt)}</div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className={`px-2 sm:px-4 py-8 sm:py-12 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
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
              <h3 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{selectedCampaign.title}</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                Brand: {selectedCampaign.brandId?.brandName} • Category: {selectedCampaign.category}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Budget</p>
                <p className={`text-lg sm:text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{formatCurrency(selectedCampaign.budget || 0)}</p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Spent</p>
                <p className={`text-lg sm:text-xl font-bold text-green-600`}>{formatCurrency(selectedCampaign.spent || 0)}</p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Start Date</p>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{selectedCampaign.startDate ? formatDate(selectedCampaign.startDate) : 'N/A'}</p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>End Date</p>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{selectedCampaign.endDate ? formatDate(selectedCampaign.endDate) : 'N/A'}</p>
              </div>
            </div>

            {selectedCampaign.description && (
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-2`}>Description</p>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{selectedCampaign.description}</p>
              </div>
            )}

            {/* Deliverables */}
            {selectedCampaign.deliverables?.length > 0 && (
              <div>
                <h4 className={`font-medium mb-3 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Deliverables</h4>
                <div className="space-y-2">
                  {selectedCampaign.deliverables.map((del, index) => (
                    <div key={index} className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <div className="flex justify-between items-center">
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium capitalize ${isDark ? 'text-gray-100' : 'text-gray-900'} truncate`}>{del.type} on {del.platform}</p>
                          {del.description && <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} truncate`}>{del.description}</p>}
                        </div>
                        <span className={`text-xs sm:text-sm font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Qty: {del.quantity || 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Target Audience */}
            {selectedCampaign.targetAudience && (
              <div>
                <h4 className={`font-medium mb-3 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Target Audience</h4>
                <div className="grid grid-cols-2 gap-3">
                  {selectedCampaign.targetAudience.minFollowers && (
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Min Followers</p>
                      <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{selectedCampaign.targetAudience.minFollowers}</p>
                    </div>
                  )}
                  {selectedCampaign.targetAudience.maxFollowers && (
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Max Followers</p>
                      <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{selectedCampaign.targetAudience.maxFollowers}</p>
                    </div>
                  )}
                  {selectedCampaign.targetAudience.minEngagement && (
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Min Engagement</p>
                      <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{selectedCampaign.targetAudience.minEngagement}%</p>
                    </div>
                  )}
                </div>
                {selectedCampaign.targetAudience.niches?.length > 0 && (
                  <div className="mt-3">
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-2`}>Niches</p>
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {selectedCampaign.targetAudience.niches.map((niche, i) => (
                        <span key={i} className={`px-1 sm:px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs`}>
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
                <h4 className={`font-medium mb-3 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Applications ({selectedCampaign.applications.length})</h4>
                <div className="space-y-2">
                  {selectedCampaign.applications.slice(0, 3).map((app, index) => (
                    <div key={index} className={`p-3 rounded-lg flex justify-between items-center ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} truncate`}>{app.creatorId?.displayName || 'Creator'}</p>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Applied {timeAgo(app.appliedAt)}</p>
                      </div>
                      <span className={`px-1 sm:px-2 py-1 text-xs rounded-full ${
                        app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        app.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {app.status}
                      </span>
                    </div>
                  ))}
                  {selectedCampaign.applications.length > 3 && (
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} text-center`}>+{selectedCampaign.applications.length - 3} more</p>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons for pending campaigns */}
            {selectedCampaign.status === 'pending' && (
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="danger"
                  onClick={() => {
                    setStatusAction({ status: 'rejected', reason: '' });
                    setShowStatusModal(true);
                    setShowDetailsModal(false);
                  }}
                >
                  Reject
                </Button>
                <Button
                  variant="success"
                  onClick={() => {
                    setStatusAction({ status: 'active', reason: '' });
                    setShowStatusModal(true);
                    setShowDetailsModal(false);
                  }}
                >
                  Approve
                </Button>
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
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Are you sure you want to {statusAction.status === 'active' ? 'approve' : 'reject'} the campaign "{selectedCampaign.title}"?
            </p>
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Reason (Optional)
              </label>
              <textarea
                rows="3"
                value={statusAction.reason}
                onChange={(e) => setStatusAction({ ...statusAction, reason: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark 
                    ? 'bg-gray-800/50 border-gray-700/50 text-gray-100 placeholder:text-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
                }`}
                placeholder="Enter reason for this action..."
              />
            </div>

            {statusAction.status === 'rejected' && (
              <div className={`p-4 rounded-lg ${isDark ? 'bg-red-900/30 border border-red-700/30' : 'bg-red-50'}`}>
                <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-800'}`}>
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