// pages/Brand/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  Plus,
  ChevronRight,
  RefreshCw,
  Briefcase,
  Target,
  Award,
  Loader,
  Calendar,
  Eye,
  AlertCircle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import brandService from '../../services/brandService';
import campaignService from '../../services/campaignService';
import dealService from '../../services/dealService';
import paymentService from '../../services/paymentService';
import { formatCurrency, formatNumber, timeAgo } from '../../utils/helpers';
import StatsCard from '../../components/Common/StatsCard';
import ChartCard from '../../components/Common/ChartCard';
import Button from '../../components/UI/Button';
import toast from 'react-hot-toast';

const BrandDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [deals, setDeals] = useState([]);
  const [balance, setBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState({
    campaignPerformance: [],
    platformDistribution: [],
    topCreators: []
  });
  const [dateRange, setDateRange] = useState('30d');
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalDeals: 0,
    activeDeals: 0,
    completedDeals: 0,
    totalSpent: 0,
    avgROI: 0
  });

  // ==================== FETCH ALL DASHBOARD DATA ====================
  const fetchDashboardData = async (showToast = false) => {
    try {
      if (showToast) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Fetch all data in parallel with error handling
      const results = await Promise.allSettled([
        brandService.getProfile(),
        campaignService.getBrandCampaigns('all', 1, 5),
        dealService.getBrandDeals('all', 1, 5),
        paymentService.getBalance(),
        paymentService.getTransactions(1, 5),
        brandService.getAnalytics(dateRange)
      ]);

      // Profile
      if (results[0].status === 'fulfilled' && results[0].value?.success) {
        setProfile(results[0].value.brand);
      }

      // Campaigns
      if (results[1].status === 'fulfilled' && results[1].value?.success) {
        setCampaigns(results[1].value.campaigns || []);
      }

      // Deals
      if (results[2].status === 'fulfilled' && results[2].value?.success) {
        setDeals(results[2].value.deals || []);
      }

      // Balance
      if (results[3].status === 'fulfilled' && results[3].value?.success) {
        setBalance(results[3].value.balance || 0);
        setPendingBalance(results[3].value.pending || 0);
      }

      // Transactions
      if (results[4].status === 'fulfilled' && results[4].value?.success) {
        setTransactions(results[4].value.transactions || []);
      }

      // Analytics
      if (results[5].status === 'fulfilled' && results[5].value?.success) {
        setAnalytics({
          campaignPerformance: results[5].value.analytics?.campaignPerformance || [],
          platformDistribution: results[5].value.analytics?.platforms || [],
          topCreators: results[5].value.analytics?.topCreators || []
        });
      }

      // Calculate stats
      const activeCampaignsCount = results[1].value?.campaigns?.filter(c => c.status === 'active').length || 0;
      const activeDealsCount = results[2].value?.deals?.filter(d => ['accepted', 'in-progress'].includes(d.status)).length || 0;
      const completedDealsCount = results[2].value?.deals?.filter(d => d.status === 'completed').length || 0;
      const totalSpentAmount = results[2].value?.deals
        ?.filter(d => d.status === 'completed')
        .reduce((sum, d) => sum + (d.budget || 0), 0) || 0;

      setStats({
        totalCampaigns: results[1].value?.campaigns?.length || 0,
        activeCampaigns: activeCampaignsCount,
        totalDeals: results[2].value?.deals?.length || 0,
        activeDeals: activeDealsCount,
        completedDeals: completedDealsCount,
        totalSpent: totalSpentAmount,
        avgROI: results[5].value?.analytics?.summary?.avgROI || 0
      });

      if (showToast) {
        toast.success('Dashboard refreshed');
      }

    } catch (error) {
      console.error('Dashboard error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ==================== INITIAL LOAD ====================
  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  // ==================== HANDLE REFRESH ====================
  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  // ==================== PREPARE CHART DATA ====================
  const performanceData = analytics.campaignPerformance.map(item => ({
    date: `${item._id?.month || ''}/${item._id?.day || ''}`,
    value: item.spent || 0
  }));

  const platformColors = {
    instagram: '#E1306C',
    youtube: '#FF0000',
    tiktok: '#000000',
    twitter: '#1DA1F2',
    facebook: '#4267B2',
    default: '#4F46E5'
  };

  const platformData = analytics.platformDistribution.map(p => ({
    name: p._id || 'other',
    value: p.count || 0,
    color: platformColors[p._id] || platformColors.default
  }));

  // ==================== LOADING STATE ====================
  if (loading && !refreshing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ==================== METRICS ====================
  const metrics = [
    {
      title: 'Total Campaigns',
      value: stats.totalCampaigns.toString(),
      change: `${stats.activeCampaigns} active`,
      icon: TrendingUp,
      color: 'bg-blue-500',
      link: '/brand/campaigns'
    },
    {
      title: 'Active Deals',
      value: stats.activeDeals.toString(),
      change: `${stats.completedDeals} completed`,
      icon: Users,
      color: 'bg-green-500',
      link: '/brand/deals'
    },
    {
      title: 'Total Spent',
      value: formatCurrency(stats.totalSpent),
      change: `Avg ROI: ${stats.avgROI.toFixed(1)}x`,
      icon: DollarSign,
      color: 'bg-purple-500',
      link: '/brand/analytics'
    },
    {
      title: 'Available Balance',
      value: formatCurrency(balance),
      change: `${formatCurrency(pendingBalance)} pending`,
      icon: Clock,
      color: 'bg-orange-500',
      link: '/brand/payments'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brand Dashboard</h1>
          <p className="text-gray-600">
            Welcome back, {profile?.brandName || user?.fullName || 'Brand'}!
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={handleRefresh}
            loading={refreshing}
          >
            Refresh
          </Button>

          <Link to="/brand/campaigns/new">
            <Button variant="primary" size="sm" icon={Plus}>
              New Campaign
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <Link key={index} to={metric.link}>
            <StatsCard {...metric} />
          </Link>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <ChartCard title="Campaign Performance">
          <ResponsiveContainer width="100%" height={300}>
            {performanceData.length > 0 ? (
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="Spent"
                  stroke="#4F46E5"
                  fill="url(#colorSpent)"
                />
              </AreaChart>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-400">No campaign data yet</p>
              </div>
            )}
          </ResponsiveContainer>
        </ChartCard>

        {/* Platform Distribution */}
        <ChartCard title="Platform Distribution">
          <ResponsiveContainer width="100%" height={300}>
            {platformData.length > 0 ? (
              <PieChart>
                <Pie
                  data={platformData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {platformData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-400">No platform data yet</p>
              </div>
            )}
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Recent Campaigns */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Recent Campaigns</h2>
          <Link to="/brand/campaigns" className="text-indigo-600 text-sm hover:text-indigo-700">
            View All
          </Link>
        </div>

        <div className="divide-y divide-gray-200">
          {campaigns.length > 0 ? (
            campaigns.slice(0, 5).map((campaign) => (
              <Link
                key={campaign._id}
                to={`/brand/campaigns/${campaign._id}`}
                className="block p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{campaign.title}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span>Budget: {formatCurrency(campaign.budget || 0)}</span>
                      <span>Progress: {campaign.progress || 0}%</span>
                      {campaign.endDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Ends: {new Date(campaign.endDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                      campaign.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                      campaign.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {campaign.status}
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="p-8 text-center">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No campaigns yet</p>
              <Link to="/brand/campaigns/new">
                <Button variant="primary" size="sm" icon={Plus}>
                  Create Campaign
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent Deals */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Recent Deals</h2>
          <Link to="/brand/deals" className="text-indigo-600 text-sm hover:text-indigo-700">
            View All
          </Link>
        </div>

        <div className="divide-y divide-gray-200">
          {deals.length > 0 ? (
            deals.slice(0, 5).map((deal) => (
              <Link
                key={deal._id}
                to={`/brand/deals/${deal._id}`}
                className="block p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {deal.creatorId?.displayName || 'Creator'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{deal.campaignId?.title}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="font-medium text-indigo-600">
                        {formatCurrency(deal.budget || 0)}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        deal.status === 'completed' ? 'bg-green-100 text-green-800' :
                        deal.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                        deal.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        deal.status === 'revision' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {deal.status}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            ))
          ) : (
            <div className="p-8 text-center">
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No deals yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      {transactions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {transactions.slice(0, 3).map((transaction) => (
              <div key={transaction._id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {transaction.description || 'Payment'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{timeAgo(transaction.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatCurrency(transaction.amount || 0)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                      transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      transaction.status === 'in-escrow' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {transaction.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/brand/search">
          <div className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Find Creators</h3>
                <p className="text-xs text-gray-500">Discover new talent</p>
              </div>
            </div>
          </div>
        </Link>

        <Link to="/brand/analytics">
          <div className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">View Analytics</h3>
                <p className="text-xs text-gray-500">Track performance</p>
              </div>
            </div>
          </div>
        </Link>

        <Link to="/brand/payments">
          <div className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Add Funds</h3>
                <p className="text-xs text-gray-500">{formatCurrency(balance)} available</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Alerts */}
      {deals.filter(d => d.status === 'revision').length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-yellow-800">Revision Requests</h3>
            <p className="text-sm text-yellow-700">
              You have {deals.filter(d => d.status === 'revision').length} deal(s) waiting for your review.
            </p>
          </div>
          <Link to="/brand/deals?status=revision" className="ml-auto text-sm font-medium text-yellow-800 hover:text-yellow-900">
            Review Now
          </Link>
        </div>
      )}
    </div>
  );
};

export default BrandDashboard;