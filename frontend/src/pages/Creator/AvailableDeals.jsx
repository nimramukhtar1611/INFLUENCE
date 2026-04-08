// pages/Creator/AvailableDeals.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  DollarSign,
  Users,
  Clock,
  Briefcase,
  ChevronRight,
  Loader,
  Filter,
  X,
  Calendar,
  Target,
  Award,
  Star,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import creatorService from '../../services/creatorService';
import { formatCurrency, timeAgo } from '../../utils/helpers';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';

const AvailableDeals = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  // ==================== STATE ====================
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [applicationData, setApplicationData] = useState({
    proposal: '',
    rate: '',
    portfolio: []
  });
  const [filters, setFilters] = useState({
    category: '',
    minBudget: '',
    maxBudget: '',
    platform: '',
    niche: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });
  const [error, setError] = useState('');

  // ==================== FETCH CAMPAIGNS ====================
  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await creatorService.getAvailableCampaigns(
        { ...filters, q: searchQuery },
        pagination.page,
        pagination.limit
      );

      if (response.success) {
        setCampaigns(response.campaigns || []);
        setPagination({
          page: response.pagination?.page || 1,
          limit: response.pagination?.limit || 10,
          total: response.pagination?.total || 0,
          pages: response.pagination?.pages || 1
        });
      } else {
        setError(response.error || 'Failed to load campaigns');
        setCampaigns([]);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      setError('Network error. Please try again.');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  // ==================== INITIAL LOAD & FILTER CHANGE ====================
  useEffect(() => {
    fetchCampaigns();
  }, [filters, pagination.page, searchQuery]);

  // ==================== HANDLE SEARCH ====================
  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchCampaigns();
  };

  // ==================== FILTER HANDLERS ====================
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      minBudget: '',
      maxBudget: '',
      platform: '',
      niche: ''
    });
    setSearchQuery('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // ==================== APPLY TO CAMPAIGN ====================
  const handleApply = (campaign) => {
    setSelectedCampaign(campaign);
    setApplicationData({
      proposal: '',
      rate: campaign.budget || '',
      portfolio: []
    });
    setShowApplyModal(true);
  };

  const handleSubmitApplication = async () => {
    if (!applicationData.proposal) {
      toast.error('Please write a proposal');
      return;
    }

    try {
      const response = await creatorService.applyToCampaign(
        selectedCampaign._id,
        applicationData
      );

      if (response.success) {
        toast.success('Application submitted successfully!');
        setShowApplyModal(false);
        fetchCampaigns(); // refresh list
      } else {
        toast.error(response.error || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Submit application error:', error);
      toast.error('Failed to submit application');
    }
  };

  // ==================== FILTER OPTIONS ====================
  const categories = [
    'Fashion', 'Beauty', 'Fitness', 'Technology', 'Food & Beverage',
    'Travel', 'Gaming', 'Lifestyle', 'Parenting', 'Finance'
  ];

  const platforms = ['instagram', 'youtube', 'tiktok', 'twitter', 'facebook'];

  // ==================== LOADING STATE ====================
  if (loading && campaigns.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading available deals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isDark ? 'bg-gray-900' : 'bg-slate-100'}`}>
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl ${isDark ? 'bg-gray-900/90 backdrop-blur-sm border border-gray-700/50 shadow-sm' : 'bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-sm'}`}>
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Available Deals</h1>
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Find brand collaborations that match your profile</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className={`p-4 rounded-xl shadow-sm ${isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'}`}>
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search campaigns, brands, or keywords..."
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDark 
                  ? 'bg-gray-800/50 border-gray-700/50 text-gray-100 placeholder:text-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
              }`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border rounded-lg flex items-center gap-2 ${
                showFilters 
                  ? 'bg-indigo-50 border-indigo-600 text-indigo-600' 
                  : isDark
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700/50'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <Button type="submit" variant="primary" size="md">
              Search
            </Button>
          </div>
        </form>

        {/* Filter Panel */}
        {showFilters && (
          <div className={`mt-4 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark 
                      ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Platform
                </label>
                <select
                  value={filters.platform}
                  onChange={(e) => handleFilterChange('platform', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark 
                      ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">All Platforms</option>
                  {platforms.map(plat => (
                    <option key={plat} value={plat}>{plat.charAt(0).toUpperCase() + plat.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Min Budget
                </label>
                <input
                  type="number"
                  value={filters.minBudget}
                  onChange={(e) => handleFilterChange('minBudget', e.target.value)}
                  placeholder="Any"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark 
                      ? 'bg-gray-800/50 border-gray-700/50 text-gray-100 placeholder:text-gray-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Max Budget
                </label>
                <input
                  type="number"
                  value={filters.maxBudget}
                  onChange={(e) => handleFilterChange('maxBudget', e.target.value)}
                  placeholder="Any"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark 
                      ? 'bg-gray-800/50 border-gray-700/50 text-gray-100 placeholder:text-gray-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
                  }`}
                />
              </div>
            </div>

            <div className={`flex justify-end gap-2 mt-4 ${isDark ? 'border-t border-gray-700' : 'border-t border-gray-200'}`}>
              <button
                onClick={clearFilters}
                className={`px-4 py-2 text-sm font-medium ${isDark ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Clear All
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className={`p-4 rounded-lg border flex items-center gap-3 ${
          isDark 
            ? 'bg-red-950/40 border-red-900 text-red-300'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      {/* Results Count */}
      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        Showing {campaigns.length} of {pagination.total} available deals
      </p>

      {/* Deals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {campaigns.length > 0 ? campaigns.map((campaign) => {
          const daysLeft = campaign.endDate
            ? Math.ceil((new Date(campaign.endDate) - new Date()) / (1000 * 60 * 60 * 24))
            : 30;

          return (
            <div key={campaign._id} className={`rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 ${
              isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'
            }`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <img
                    src={campaign.brandId?.logo || 'https://via.placeholder.com/60'}
                    alt={campaign.brandId?.brandName}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                  <div className="ml-4">
                    <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{campaign.brandId?.brandName}</h3>
                    <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{campaign.title}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className={`text-sm mb-4 line-clamp-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {campaign.description || 'No description provided'}
              </p>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center text-sm">
                  <DollarSign className={`w-4 h-4 mr-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  <span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {formatCurrency(campaign.budget || 0)}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <Briefcase className={`w-4 h-4 mr-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                    {campaign.deliverables?.length || 1} deliverables
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className={`w-4 h-4 mr-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                    {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <Users className={`w-4 h-4 mr-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                    {campaign.applications?.length || 0} applicants
                  </span>
                </div>
              </div>

              {/* Tags and Actions */}
              <div className={`flex items-center justify-between pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className="flex gap-2 flex-wrap">
                  {campaign.category && (
                    <span className={`px-3 py-1 rounded-full text-xs ${
                      isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {campaign.category}
                    </span>
                  )}
                  {campaign.targetAudience?.platforms?.slice(0, 2).map(platform => (
                    <span key={platform} className={`px-3 py-1 rounded-full text-xs capitalize ${
                      isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {platform}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => handleApply(campaign)}
                  className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white px-4 py-2 rounded-lg text-sm hover:opacity-90 flex items-center"
                >
                  Apply Now
                </button>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-2 text-center py-12">
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>No campaigns found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {campaigns.length > 0 && (
        <div className={`flex items-center justify-center gap-4 mt-6 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
            className={`px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
              isDark
                ? 'border-gray-600 hover:bg-gray-700/50'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            Previous
          </button>
          <span className={`px-4 py-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Page {pagination.page} of {pagination.pages}</span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === pagination.pages}
            className={`px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
              isDark
                ? 'border-gray-600 hover:bg-gray-700/50'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            Next
          </button>
        </div>
      )}

      {/* Apply Modal */}
      <Modal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        title="Apply to Campaign"
        size="lg"
      >
        {selectedCampaign && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <h3 className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{selectedCampaign.title}</h3>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{selectedCampaign.brandId?.brandName}</p>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Your Proposal *
              </label>
              <textarea
                rows="5"
                value={applicationData.proposal}
                onChange={(e) => setApplicationData({...applicationData, proposal: e.target.value})}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark 
                    ? 'bg-gray-800/50 border-gray-700/50 text-gray-100 placeholder:text-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
                }`}
                placeholder="Explain why you're a great fit for this campaign, your ideas, and how you'll deliver value..."
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Your Rate ($)
              </label>
              <input
                type="number"
                value={applicationData.rate}
                onChange={(e) => setApplicationData({...applicationData, rate: e.target.value})}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark 
                    ? 'bg-gray-800/50 border-gray-700/50 text-gray-100 placeholder:text-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
                }`}
                placeholder="Enter your rate"
              />
            </div>

            <div className={`p-4 rounded-lg ${isDark ? 'bg-yellow-900/30 border border-yellow-700/30' : 'bg-yellow-50'}`}>
              <p className={`text-sm ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>
                <strong>Tip:</strong> Personalize your proposal. Mention specific ideas for this campaign to increase your chances.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowApplyModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmitApplication}>
            Submit Application
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default AvailableDeals;