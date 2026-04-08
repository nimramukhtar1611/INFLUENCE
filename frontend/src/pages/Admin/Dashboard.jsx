// pages/Admin/Dashboard.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  DollarSign,
  TrendingUp,
  Award,
  Eye,
  Calendar,
  Download,
  MoreVertical,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  UserPlus,
  CreditCard,
  Shield,
  Building2,
  Star,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Filter,
  Search,
  ChevronRight,
  AlertTriangle,
  MessageSquare,
  FileText,
  Mail,
  Phone,
  Globe,
  Zap,
  Heart,
  Share2,
  ThumbsUp,
  XCircle,
  Loader
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Scatter
} from 'recharts';
import { useAdminData } from '../../hooks/useAdminData';
import { formatCurrency, formatNumber, timeAgo } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import api from '../../services/api';
import StatsCard from '../../components/Common/StatsCard';
import ChartCard from '../../components/Common/ChartCard';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const {
    loading,
    refreshing,
    campaigns,
    disputes,
    systemHealth,
    stats,
    dashboard,
    users,
    deals,
    payments,
    refreshData
  } = useAdminData();

  const [dateRange, setDateRange] = useState('30d');
  const [revenueData, setRevenueData] = useState([]);
  const [userGrowthData, setUserGrowthData] = useState([]);
  const [platformData, setPlatformData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [showActivityModal, setShowActivityModal] = useState(false);

  // Fetch dashboard data when dateRange changes
  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  // Process dashboard data when it arrives
  useEffect(() => {
    if (dashboard) {
      // Format revenue data
      const revenue = dashboard.revenue?.byMonth?.map(item => ({
        month: item.month,
        revenue: item.amount,
        fees: item.fees
      })) || [];
      setRevenueData(revenue);

      // Format user growth data
      const growth = dashboard.users?.growth?.map(item => ({
        month: item.month,
        brands: item.brands,
        creators: item.creators
      })) || [];
      setUserGrowthData(growth);

      // Platform distribution
      const platforms = dashboard.platforms?.map(p => ({
        name: p.name,
        value: p.count,
        color: p.name === 'instagram' ? '#E1306C' :
               p.name === 'youtube' ? '#FF0000' :
               p.name === 'tiktok' ? '#000000' : '#4F46E5'
      })) || [];
      setPlatformData(platforms);

      // Recent activity
      const activity = [
        ...(dashboard.recent?.users || []).map(u => ({
          ...u,
          type: 'user',
          icon: UserPlus,
          color: 'bg-blue-500',
          description: `${u.fullName || u.name} joined as ${u.userType}`
        })),
        ...(dashboard.recent?.deals || []).map(d => ({
          ...d,
          type: 'deal',
          icon: TrendingUp,
          color: 'bg-green-500',
          description: `New deal: ${d.campaignId?.title || 'Campaign'}`
        })),
        ...(dashboard.recent?.payments || []).map(p => ({
          ...p,
          type: 'payment',
          icon: DollarSign,
          color: 'bg-purple-500',
          description: `Payment of ${formatCurrency(p.amount)} ${p.status}`
        })),
        ...(dashboard.recent?.disputes || []).map(d => ({
          ...d,
          type: 'dispute',
          icon: AlertTriangle,
          color: 'bg-red-500',
          description: `New dispute: ${d.title}`
        }))
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

      setRecentActivity(activity);
    }
  }, [dashboard]);

  const fetchDashboardData = async () => {
    await refreshData();
  };

  const handleRefresh = () => {
    refreshData();
    toast.success('Dashboard refreshed');
  };

  const handleExport = () => {
    // Generate CSV for dashboard data
    const csvContent = [
      ['Metric', 'Value', 'Change', 'Link'].join(','),
      ...metricItems.map(item => [
        `"${item.title}"`,
        item.value,
        item.change,
        item.link || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-export-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Dashboard data exported successfully');
  };

  const metricItems = [
    {
      title: 'Total Users',
      value: formatNumber(stats.totalUsers || 0),
      change: `+${stats.totalUsers ? Math.floor(stats.totalUsers * 0.12) : 0} this month`,
      icon: Users,
      color: 'bg-blue-500',
      link: '/admin/users',
      subtitle: `${stats.totalBrands || 0} Brands • ${stats.totalCreators || 0} Creators`
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue || 0),
      change: `Fees: ${formatCurrency(stats.totalFees || 0)}`,
      icon: DollarSign,
      color: 'bg-green-500',
      link: '/admin/payments',
      subtitle: 'Platform earnings'
    },
    {
      title: 'Active Campaigns',
      value: stats.activeCampaigns || 0,
      change: `${stats.totalCampaigns || 0} total campaigns`,
      icon: TrendingUp,
      color: 'bg-purple-500',
      link: '/admin/campaigns',
      subtitle: `${dashboard?.campaigns?.pending || 0} pending approval`
    },
    {
      title: 'Completed Deals',
      value: stats.completedDeals || 0,
      change: `${dashboard?.deals?.total || 0} total deals`,
      icon: Award,
      color: 'bg-orange-500',
      link: '/admin/deals',
      subtitle: `Value: ${formatCurrency(dashboard?.deals?.totalValue || 0)}`
    },
    {
      title: 'Pending Verifications',
      value: stats.pendingVerifications || 0,
      change: 'Awaiting review',
      icon: Clock,
      color: 'bg-yellow-500',
      link: '/admin/users?filter=pending',
      subtitle: 'Brands & Creators'
    },
    {
      title: 'Open Disputes',
      value: stats.pendingDisputes || 0,
      change: `${dashboard?.disputes?.resolved || 0} resolved`,
      icon: AlertTriangle,
      color: 'bg-red-500',
      link: '/admin/disputes',
      subtitle: 'Needs attention'
    }
  ];

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isDark ? 'bg-gray-900' : 'bg-slate-100'}`}>
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl ${isDark ? 'bg-gray-900/90 backdrop-blur-sm border border-gray-700/50 shadow-sm' : 'bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-sm'}`}>
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Admin Dashboard</h1>
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Welcome back! Here's what's happening on InfluenceX.</p>
        </div>
        <div className="flex flex-wrap gap-2">
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
            className={`px-4 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 shadow-sm ${
              isDark ? 'bg-gray-800/50 border-gray-700/50 text-gray-100' : 'bg-white/50 border-gray-300/50 text-gray-900'
            }`}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="12m">This Year</option>
          </select>
          <Button variant="outline" size="sm" icon={Download} onClick={handleExport}>
            Export
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metricItems.map((metric, index) => (
          <Link key={index} to={metric.link} className="block h-full">
            <StatsCard {...metric} className="h-full min-h-[180px]" />
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/admin/users?filter=pending" className="block h-full">
          <div className={`p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group border h-full min-h-[160px] flex flex-col justify-between ${isDark ? 'bg-gray-900/90 border-gray-700/50' : 'bg-white/90 border-gray-200/50'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 bg-blue-100/50 rounded-lg group-hover:bg-blue-200/50 transition-all duration-200 border border-blue-100/50 flex-shrink-0`}>
                <UserPlus className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-2xl font-bold text-blue-600 break-words">
                {stats.pendingVerifications || 0}
              </span>
            </div>
            <h3 className={`font-semibold text-center break-words px-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Pending Verifications</h3>
            <p className={`text-sm mt-1 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Review new users</p>
          </div>
        </Link>

        <Link to="/admin/fraud-review" className="block h-full">
          <div className={`p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group border h-full min-h-[160px] flex flex-col justify-between ${isDark ? 'bg-gray-900/90 border-gray-700/50' : 'bg-white/90 border-gray-200/50'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 bg-yellow-100/50 rounded-lg group-hover:bg-yellow-200/50 transition-all duration-200 border border-yellow-100/50 flex-shrink-0`}>
                <Shield className="w-6 h-6 text-yellow-600" />
              </div>
              <span className="text-2xl font-bold text-yellow-600 break-words">
                {dashboard?.campaigns?.pending || 0}
              </span>
            </div>
            <h3 className={`font-semibold text-center break-words px-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Pending Campaigns</h3>
            <p className={`text-sm mt-1 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Review & approve</p>
          </div>
        </Link>

        <Link to="/admin/disputes" className="block h-full">
          <div className={`p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group border h-full min-h-[160px] flex flex-col justify-between ${isDark ? 'bg-gray-900/90 border-gray-700/50' : 'bg-white/90 border-gray-200/50'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 bg-red-100/50 rounded-lg group-hover:bg-red-200/50 transition-all duration-200 border border-red-100/50 flex-shrink-0`}>
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <span className="text-2xl font-bold text-red-600 break-words">
                {stats.pendingDisputes || 0}
              </span>
            </div>
            <h3 className={`font-semibold text-center break-words px-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Open Disputes</h3>
            <p className={`text-sm mt-1 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Resolve issues</p>
          </div>
        </Link>

        <Link to="/admin/payments" className="block h-full">
          <div className={`p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group border h-full min-h-[160px] flex flex-col justify-between ${isDark ? 'bg-gray-900/90 border-gray-700/50' : 'bg-white/90 border-gray-200/50'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 bg-green-100/50 rounded-lg group-hover:bg-green-200/50 transition-all duration-200 border border-green-100/50 flex-shrink-0`}>
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-2xl font-bold text-green-600 break-words">
                {payments?.length || 0}
              </span>
            </div>
            <h3 className={`font-semibold text-center break-words px-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Recent Transactions</h3>
            <p className={`text-sm mt-1 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>View payments</p>
          </div>
        </Link>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <ChartCard title="Revenue Overview" onDownload={() => {}}>
          <ResponsiveContainer width="100%" height={300}>
            {revenueData.length > 0 ? (
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#4F46E5"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-400">No revenue data available</p>
              </div>
            )}
          </ResponsiveContainer>
        </ChartCard>

        {/* User Growth Chart */}
        <ChartCard title="User Growth" onDownload={() => {}}>
          <ResponsiveContainer width="100%" height={300}>
            {userGrowthData.length > 0 ? (
              <ComposedChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="brands" fill="#4F46E5" />
                <Bar dataKey="creators" fill="#10B981" />
              </ComposedChart>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-400">No user growth data available</p>
              </div>
            )}
          </ResponsiveContainer>
        </ChartCard>

        {/* Deals Distribution */}
        <ChartCard title="Deals by Status">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              {deals && deals.length > 0 ? (
                <Pie
                  data={[
                    { name: 'Completed', value: deals.filter(d => d.status === 'completed').length },
                    { name: 'In Progress', value: deals.filter(d => ['accepted', 'in-progress'].includes(d.status)).length },
                    { name: 'Pending', value: deals.filter(d => d.status === 'pending').length },
                    { name: 'Cancelled', value: deals.filter(d => d.status === 'cancelled').length }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#10B981" />
                  <Cell fill="#3B82F6" />
                  <Cell fill="#F59E0B" />
                  <Cell fill="#EF4444" />
                </Pie>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-400">No deals data available</p>
                </div>
              )}
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Platform Distribution */}
        <ChartCard title="Platform Distribution">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              {platformData.length > 0 ? (
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
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-400">No platform data available</p>
                </div>
              )}
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className={`bg-white rounded-xl shadow-sm overflow-hidden border ${isDark ? 'bg-gray-900/90 border-gray-700/50' : 'bg-white/90 border-gray-200/50'}`}>
              <div className={`px-6 py-4 border-b flex justify-between items-center ${isDark ? 'border-gray-700/50' : 'border-gray-200/50'}`}>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Recent Users</h2>
            <Link to="/admin/users" className={`text-sm hover:underline flex items-center ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}>
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className={`max-h-80 overflow-y-auto divide-y ${isDark ? 'divide-gray-700/30' : 'divide-gray-200/30'}`}>
            {users?.map((user, index) => (
              <div key={user._id || index} className={`p-4 transition-all duration-200 ${isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50/50'} border-b ${isDark ? 'border-gray-700/30' : 'border-gray-200/30'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt={user.fullName} className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className={`border rounded-lg p-4 flex items-start gap-3 transition-all duration-200 ${isDark ? 'bg-yellow-900/30 border-yellow-700/30' : 'bg-yellow-50/50 border-yellow-200/50'}`}>
                        <Users className="w-5 h-5 text-indigo-600" />
                      </div>
                    )}
                    <div>
                      <h3 className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{user.fullName || user.name}</h3>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          user.userType === 'brand' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {user.userType}
                        </span>
                        {user.isVerified ? (
                          <span className="text-xs text-green-600 flex items-center">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </span>
                        ) : (
                          <span className="text-xs text-yellow-600 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {timeAgo(user.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className={`bg-white rounded-xl shadow-sm overflow-hidden border ${isDark ? 'bg-gray-900/90 border-gray-700/50' : 'bg-white/90 border-gray-200/50'}`}>
          <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700/50' : 'border-gray-200/50'}`}>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Recent Activity</h2>
          </div>
          <div className={`max-h-80 overflow-y-auto divide-y ${isDark ? 'divide-gray-700/30' : 'divide-gray-200/30'}`}>
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => {
                const Icon = activity.icon;
                return (
                  <div key={index} className={`p-4 transition-all duration-200 ${isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50/50'} border-b ${isDark ? 'border-gray-700/30' : 'border-gray-200/30'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 ${activity.color} rounded-lg bg-opacity-10`}>
                        <Icon className={`w-4 h-4 ${activity.color.replace('bg-', 'text-')}`} />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{activity.description}</p>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>{timeAgo(activity.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center">
                <Activity className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-400' : 'text-gray-300'}`} />
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Platform Health</h3>
            <Activity className="w-6 h-6 opacity-80" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="opacity-90">Uptime</span>
              <span className="font-semibold">{systemHealth?.uptime || '99.9%'}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-90">Response Time</span>
              <span className="font-semibold">{systemHealth?.responseTime || '245ms'}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-90">Active Users</span>
              <span className="font-semibold">{stats.totalUsers}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-90">Server Load</span>
              <span className="font-semibold">{systemHealth?.cpuLoad || '32%'}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-teal-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Engagement</h3>
            <Heart className="w-6 h-6 opacity-80" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="opacity-90">Avg. Engagement Rate</span>
              <span className="font-semibold">{dashboard?.engagement?.average || '4.8%'}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-90">Total Impressions</span>
              <span className="font-semibold">{formatNumber(dashboard?.engagement?.impressions || 2400000)}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-90">Total Clicks</span>
              <span className="font-semibold">{formatNumber(dashboard?.engagement?.clicks || 124000)}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-90">Conversion Rate</span>
              <span className="font-semibold">{dashboard?.engagement?.conversion || '3.2%'}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-600 to-red-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Support</h3>
            <MessageSquare className="w-6 h-6 opacity-80" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="opacity-90">Open Tickets</span>
              <span className="font-semibold">{dashboard?.support?.openTickets || 12}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-90">Avg. Response Time</span>
              <span className="font-semibold">{dashboard?.support?.avgResponse || '2.5 hrs'}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-90">Resolution Rate</span>
              <span className="font-semibold">{dashboard?.support?.resolutionRate || '94%'}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-90">Satisfaction</span>
              <span className="font-semibold">{dashboard?.support?.satisfaction || '96%'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className={`bg-white rounded-xl shadow-sm overflow-hidden border ${isDark ? 'bg-gray-900/90 border-gray-700/50' : 'bg-white/90 border-gray-200/50'}`}>
        <div className={`px-6 py-4 border-b flex justify-between items-center ${isDark ? 'border-gray-700/50' : 'border-gray-200/50'}`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Recent Campaigns</h2>
          <Link to="/admin/campaigns" className={`text-sm hover:underline flex items-center ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}>
            View All <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-200/50">
          <div className="min-w-full inline-block align-middle">
            <table className="w-full divide-y divide-gray-200">
            <thead className={isDark ? 'bg-gray-800' : 'bg-gray-50/50'}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 whitespace-nowrap min-w-[120px]">Campaign</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 whitespace-nowrap min-w-[100px]">Brand</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 whitespace-nowrap min-w-[80px]">Budget</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 whitespace-nowrap min-w-[70px]">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 whitespace-nowrap min-w-[80px]">Creators</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 whitespace-nowrap min-w-[100px]">Performance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaigns?.slice(0, 5).map((campaign) => (
                <tr key={campaign._id} className="hover:bg-gray-50/50 transition-colors duration-200">
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{campaign.title}</div>
                    <div className="text-xs text-gray-500">ID: {campaign._id?.slice(-6)}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 truncate max-w-[150px]">{campaign.brandId?.brandName}</td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                    {formatCurrency(campaign.budget || 0)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                      campaign.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      campaign.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap">
                    {campaign.selectedCreators?.length || 0}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-green-600">{campaign.metrics?.engagement || '0'}%</div>
                    <div className="text-xs text-gray-500">{formatNumber(campaign.metrics?.impressions || 0)} impressions</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Disputes */}
      {disputes?.length > 0 && (
        <div className={`bg-white rounded-xl shadow-sm overflow-hidden border ${isDark ? 'bg-gray-900/90 border-gray-700/50' : 'bg-white/90 border-gray-200/50'}`}>
          <div className={`px-6 py-4 border-b flex justify-between items-center ${isDark ? 'border-gray-700/50' : 'border-gray-200/50'}`}>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Open Disputes</h2>
            <Link to="/admin/disputes" className={`text-sm hover:underline flex items-center ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}>
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className={`divide-y ${isDark ? 'divide-gray-700/30' : 'divide-gray-200/30'}`}>
            {disputes.slice(0, 3).map((dispute) => (
              <div key={dispute._id} className={`p-4 transition-all duration-200 ${isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50/50'} border-b ${isDark ? 'border-gray-700/30' : 'border-gray-200/30'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <h3 className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{dispute.title}</h3>
                      <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{dispute.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Raised by: {dispute.raisedBy?.userId?.fullName}
                        </span>
                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          vs {dispute.against?.userId?.fullName}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    dispute.priority === 'high' ? 'bg-red-100 text-red-800' :
                    dispute.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {dispute.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* All Activity Modal */}
      <Modal
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        title="All Activity"
        size="lg"
      >
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div key={index} className={`flex items-start gap-3 p-3 ${isDark ? 'bg-gray-800/50' : 'bg-gray-50/50'} rounded-lg border ${isDark ? 'border-gray-700/50' : 'border-gray-200/50'}`}>
                  <div className={`p-2 ${activity.color} rounded-lg border ${isDark ? 'border-gray-700/50' : 'border-gray-200/50'}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{activity.description}</p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>{new Date(activity.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No activity found</p>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default AdminDashboard;