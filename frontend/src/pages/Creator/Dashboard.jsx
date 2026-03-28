// pages/Creator/Dashboard.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  Star,
  Award,
  ChevronRight,
  RefreshCw,
  Calendar,
  Activity,
  Briefcase,
  CheckCircle,
  User,
  Wallet,
  BarChart3,
  Loader,
  AlertCircle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useCreatorData } from '../../hooks/useCreatorData';
import { useEarnings } from '../../hooks/useEarnings';
import { formatCurrency, formatNumber, timeAgo } from '../../utils/helpers';
import StatsCard from '../../components/Common/StatsCard';
import ChartCard from '../../components/Common/ChartCard';
import Button from '../../components/UI/Button';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';

const CreatorDashboard = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  // ==================== HOOKS ====================
  const {
    loading: dataLoading,
    refreshing,
    profile,
    deals,
    availableCampaigns,
    analytics,
    stats,
    refreshData
  } = useCreatorData();

  const {
    balance,
    pendingBalance,
    getGrowthPercentage,
    loading: earningsLoading
  } = useEarnings();

  // ==================== LOCAL STATE ====================
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [error, setError] = useState(null);

  // ==================== UPDATE LOADING STATE ====================
  useEffect(() => {
    if (!dataLoading && !earningsLoading) {
      setLoading(false);
    }
  }, [dataLoading, earningsLoading]);

  // ==================== COMPUTE UPCOMING DEADLINES ====================
  useEffect(() => {
    if (deals && deals.length > 0) {
      const deadlines = deals
        .filter(d => ['accepted', 'in-progress'].includes(d.status) && d.deadline)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 3);
      setUpcomingDeadlines(deadlines);
    } else {
      setUpcomingDeadlines([]);
    }
  }, [deals]);

  // ==================== COMPUTE RECENT ACTIVITY ====================
  useEffect(() => {
    if (deals && deals.length > 0) {
      const activity = deals.slice(0, 5).map(deal => ({
        id: deal._id,
        title: deal.campaignId?.title || 'Deal',
        brand: deal.brandId?.brandName || 'Brand',
        amount: deal.budget,
        status: deal.status,
        date: deal.updatedAt || deal.createdAt,
        url: `/creator/deals/${deal._id}`
      }));
      setRecentActivity(activity);
    } else {
      setRecentActivity([]);
    }
  }, [deals]);

  // ==================== PREPARE PERFORMANCE DATA ====================
  const performanceData = (analytics?.monthly || []).map(item => ({
    month: item.month || `${item._id?.month || ''}/${item._id?.year || ''}`,
    earnings: item.earnings || 0,
    deals: item.deals || 0
  }));

  // ==================== PREPARE PLATFORM DATA ====================
  const platformData = (() => {
    if (analytics?.platforms && analytics.platforms.length > 0) {
      return analytics.platforms.map(p => ({
        name: p.name,
        value: p.followers || 0,
        color: p.name === 'instagram' ? '#E1306C' :
               p.name === 'youtube'   ? '#FF0000' :
               p.name === 'tiktok'    ? '#000000' : '#4F46E5'
      }));
    }
    // Fallback to socialMedia from profile
    if (profile?.socialMedia) {
      const platforms = [];
      if (profile.socialMedia.instagram?.followers)
        platforms.push({ name: 'instagram', value: profile.socialMedia.instagram.followers, color: '#E1306C' });
      if (profile.socialMedia.youtube?.subscribers)
        platforms.push({ name: 'youtube', value: profile.socialMedia.youtube.subscribers, color: '#FF0000' });
      if (profile.socialMedia.tiktok?.followers)
        platforms.push({ name: 'tiktok', value: profile.socialMedia.tiktok.followers, color: '#000000' });
      if (profile.socialMedia.twitter?.followers)
        platforms.push({ name: 'twitter', value: profile.socialMedia.twitter.followers, color: '#1DA1F2' });
      return platforms;
    }
    return [];
  })();

  // ==================== COMPUTE STATS ====================
  const activeDeals = (deals || []).filter(d => ['accepted', 'in-progress'].includes(d.status));
  const completedDeals = (deals || []).filter(d => d.status === 'completed');
  const pendingDeals = (deals || []).filter(d => d.status === 'pending');

  // ==================== METRICS ====================
  const metrics = [
    {
      title: 'Available Balance',
      value: formatCurrency(balance || 0),
      change: getGrowthPercentage ? getGrowthPercentage() : '0%',
      icon: DollarSign,
      color: 'green',
      link: '/creator/earnings'
    },
    {
      title: 'Active Deals',
      value: activeDeals.length.toString(),
      change: `${completedDeals.length} completed`,
      icon: Briefcase,
      color: 'blue',
      link: '/creator/deals'
    },
    {
      title: 'Total Followers',
      value: formatNumber(profile?.totalFollowers || 0),
      change: `${(profile?.averageEngagement || 0).toFixed(1)}% engagement`,
      icon: Users,
      color: 'purple',
      link: '/creator/analytics'
    },
    {
      title: 'Pending Earnings',
      value: formatCurrency(pendingBalance || 0),
      change: `${pendingDeals.length} deals pending`,
      icon: Clock,
      color: 'orange',
      link: '/creator/earnings'
    }
  ];

  // ==================== HANDLE REFRESH ====================
  const handleRefresh = async () => {
    try {
      await refreshData();
      toast.success('Dashboard refreshed');
    } catch (err) {
      console.error('Refresh error:', err);
      toast.error('Failed to refresh dashboard');
    }
  };

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <div className="text-center">
          <Loader className="w-16 h-16 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // ==================== ERROR STATE ====================
  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <div className={`text-center max-w-md mx-auto p-6 rounded-xl ${isDark ? 'bg-red-950/40 border border-red-900' : 'bg-red-50'}`}>
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Unable to Load Dashboard</h2>
          <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{error}</p>
          <Button variant="primary" onClick={handleRefresh}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 ${isDark ? 'bg-gray-900 border-b border-gray-800' : 'bg-white border-b border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {profile?.profilePicture ? (
                <img
                  src={profile.profilePicture}
                  alt={profile.displayName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-indigo-600"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    Welcome back, {profile?.displayName || 'Creator'}!
                  </h1>
                  {profile?.isVerified && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </span>
                  )}
                </div>
                <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                  {profile?.handle && `${profile.handle} • `}
                  {profile?.niches?.slice(0, 2).join(', ')}
                  {profile?.niches?.length > 2 && ' ...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                icon={RefreshCw}
                onClick={handleRefresh}
                loading={refreshing}
              >
                Refresh
              </Button>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, index) => (
            <Link key={index} to={metric.link}>
              <StatsCard {...metric} />
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Active Deals + Chart + Activity */}
          <div className="lg:col-span-2 space-y-8">
            {/* Active Deals */}
            <div className={`rounded-xl shadow-sm overflow-hidden border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
              <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Active Deals</h2>
                <Link
                  to="/creator/deals"
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center"
                >
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
              <div className={`divide-y ${isDark ? 'divide-gray-800' : 'divide-gray-200'}`}>
                {activeDeals.length > 0 ? (
                  activeDeals.slice(0, 3).map((deal) => (
                    <Link key={deal._id} to={`/creator/deals/${deal._id}`}>
                      <div className={`p-6 transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                              {deal.brandId?.brandName || 'Brand'}
                            </h3>
                            <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                              {deal.campaignId?.title || 'Campaign'}
                            </p>
                          </div>
                          <span className="text-lg font-bold text-indigo-600">
                            {formatCurrency(deal.budget || 0)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div className={`flex items-center text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            <Calendar className={`w-4 h-4 mr-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                            {deal.deadline ? new Date(deal.deadline).toLocaleDateString() : 'No deadline'}
                          </div>
                          <div className={`flex items-center text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            <Activity className={`w-4 h-4 mr-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                            {deal.deliverables?.length || 0} deliverables
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              deal.status === 'accepted' ? 'bg-green-100 text-green-800' :
                              deal.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                              deal.status === 'revision' ? 'bg-orange-100 text-orange-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {deal.status}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className={`w-24 rounded-full h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                              <div
                                className="bg-indigo-600 h-2 rounded-full"
                                style={{ width: `${deal.progress || 0}%` }}
                              />
                            </div>
                            <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{deal.progress || 0}%</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="p-12 text-center">
                    <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className={`text-base font-medium mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>No active deals</h3>
                    <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Browse available campaigns to get started</p>
                    <Link to="/creator/available-deals">
                      <Button variant="primary" size="sm">Find Deals</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Performance Chart */}
            <ChartCard title="Performance Overview">
              {performanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Area
                      type="monotone"
                      dataKey="earnings"
                      stroke="#4F46E5"
                      fillOpacity={1}
                      fill="url(#colorEarnings)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex flex-col items-center justify-center text-gray-400">
                  <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">Complete your first deal to see earnings data</p>
                </div>
              )}
            </ChartCard>

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
              <div className={`rounded-xl shadow-sm overflow-hidden border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                <div className={`p-6 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                  <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Recent Activity</h2>
                </div>
                <div className={`divide-y ${isDark ? 'divide-gray-800' : 'divide-gray-200'}`}>
                  {recentActivity.map((activity) => (
                    <Link key={activity.id} to={activity.url} className={`block p-4 ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              activity.status === 'completed' ? 'bg-green-100' :
                              activity.status === 'pending' ? 'bg-yellow-100' :
                              'bg-blue-100'
                            }`}
                          >
                            {activity.status === 'completed' ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : activity.status === 'pending' ? (
                              <Clock className="w-4 h-4 text-yellow-600" />
                            ) : (
                              <Activity className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{activity.title}</p>
                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {activity.brand} • {formatCurrency(activity.amount)}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{timeAgo(activity.date)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Stats + Balance + Platforms + Deadlines + Quick Actions */}
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className={`rounded-xl shadow-sm p-6 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Quick Stats</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                  <div>
                    <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Total Earnings</p>
                    <p className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                      {formatCurrency(stats.totalEarnings || 0)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-indigo-600" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-lg text-center ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Completed</p>
                    <p className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{stats.completedDeals || 0}</p>
                  </div>
                  <div className={`p-3 rounded-lg text-center ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Active</p>
                    <p className="text-lg font-bold text-blue-600">{stats.activeDeals || 0}</p>
                  </div>
                  <div className={`p-3 rounded-lg text-center ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Rating</p>
                    <div className="flex items-center justify-center">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className={`text-lg font-bold ml-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                        {stats.averageRating?.toFixed(1) || '—'}
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg text-center ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Engagement</p>
                    <p className="text-lg font-bold text-green-600">
                      {stats.averageEngagement?.toFixed(1) || '0'}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Balance Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <Wallet className="w-8 h-8 text-white opacity-90" />
                <span className="text-sm opacity-90">Available Balance</span>
              </div>
              <p className="text-3xl font-bold mb-1">{formatCurrency(balance || 0)}</p>
              <p className="text-sm opacity-90 mb-4">Pending: {formatCurrency(pendingBalance || 0)}</p>
              <div className="flex gap-2">
                <Link to="/creator/earnings" className="flex-1">
                  <button className="w-full bg-white text-indigo-600 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors">
                    Withdraw
                  </button>
                </Link>
                <Link to="/creator/earnings" className="flex-1">
                  <button className="w-full bg-indigo-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-400 transition-colors">
                    History
                  </button>
                </Link>
              </div>
            </div>

            {/* Platform Distribution */}
            {platformData.length > 0 && (
              <div className={`rounded-xl shadow-sm p-6 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Platform Distribution</h2>
                <div className="space-y-3">
                  {platformData.map((platform, index) => {
                    const maxVal = Math.max(...platformData.map(p => p.value), 1);
                    return (
                      <div key={index}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize">{platform.name}</span>
                          <span className="font-medium">{formatNumber(platform.value)}</span>
                        </div>
                        <div className={`w-full rounded-full h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${(platform.value / maxVal) * 100}%`,
                              backgroundColor: platform.color
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upcoming Deadlines */}
            {upcomingDeadlines.length > 0 && (
              <div className={`rounded-xl shadow-sm p-6 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Upcoming Deadlines</h2>
                <div className="space-y-3">
                  {upcomingDeadlines.map((deal) => {
                    const daysLeft = Math.ceil((new Date(deal.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                    return (
                      <Link
                        key={deal._id}
                        to={`/creator/deals/${deal._id}`}
                        className={`block p-3 rounded-lg ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <p className={`font-medium text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                            {deal.campaignId?.title || 'Campaign'}
                          </p>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              daysLeft <= 2 ? 'bg-red-100 text-red-800' :
                              daysLeft <= 5 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}
                          >
                            {daysLeft}d
                          </span>
                        </div>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{deal.brandId?.brandName}</p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className={`rounded-xl shadow-sm p-6 border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                <Link to="/creator/available-deals">
                  <button className="w-full p-3 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium">
                    Find Deals
                  </button>
                </Link>
                <Link to="/creator/earnings">
                  <button className="w-full p-3 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium">
                    Withdraw
                  </button>
                </Link>
                <Link to="/creator/profile">
                  <button className="w-full p-3 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium">
                    Edit Profile
                  </button>
                </Link>
                <Link to="/creator/settings">
                  <button className={`w-full p-3 rounded-lg transition-colors text-sm font-medium ${isDark ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                    Settings
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorDashboard;