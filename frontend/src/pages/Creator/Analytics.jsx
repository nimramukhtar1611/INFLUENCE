// pages/Creator/Analytics.jsx
import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
  TrendingUp, Users, DollarSign, Eye, RefreshCw,
  Activity, Heart, Award, Star, AlertCircle, MessageSquare,
  Share2, BarChart3, LineChart as LineChartIcon, Loader,
  PieChart as PieChartIcon
} from 'lucide-react';
import creatorService from '../../services/creatorService';
import { formatCurrency, formatNumber } from '../../utils/helpers';
import Button from '../../components/UI/Button';
import ChartCard from '../../components/Common/ChartCard';
import StatsCard from '../../components/Common/StatsCard';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';

const EmptyChart = ({ message = 'No data available yet' }) => (
  <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8">
    <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
    <p className="text-sm">{message}</p>
  </div>
);

const Analytics = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [dateRange, setDateRange] = useState('30d');
  const [chartType, setChartType] = useState('area');
  const [error, setError] = useState('');

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);
      setError('');

      const response = await creatorService.getAnalytics(dateRange);

      if (response?.success) {
        setAnalytics(response.analytics);
        if (showToast) toast.success('Analytics refreshed');
      } else {
        setError(response?.error || 'Failed to load analytics');
        setAnalytics(null);
      }
    } catch (error) {
      console.error('Analytics error:', error);
      setError('Failed to load analytics');
      setAnalytics(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const chartData = (analytics?.monthly || []).map(item => ({
    month: item.month || `${item._id?.month || ''}/${item._id?.year || ''}`,
    earnings: item.earnings || 0,
    deals: item.deals || 0
  }));

  const platformData = (analytics?.platforms || []).map(p => ({
    name: p.name,
    value: p.followers || 0,
    color: p.name === 'instagram' ? '#E1306C' :
           p.name === 'youtube'   ? '#FF0000' :
           p.name === 'tiktok'    ? '#000000' :
           p.name === 'twitter'   ? '#1DA1F2' : '#4F46E5'
  }));

  const engagementBreakdown = [
    { name: 'Likes',     value: analytics?.engagement?.likes    || 0 },
    { name: 'Comments',  value: analytics?.engagement?.comments || 0 },
    { name: 'Shares',    value: analytics?.engagement?.shares   || 0 },
    { name: 'Saves',     value: analytics?.engagement?.saves    || 0 },
    { name: 'Clicks',    value: analytics?.engagement?.clicks   || 0 }
  ];

  const hasChartData       = chartData.length > 0;
  const hasPlatformData    = platformData.length > 0;
  const hasEngagementData  = engagementBreakdown.some(e => e.value > 0);

  const summaryMetrics = [
    { title: 'Total Earnings',   value: formatCurrency(analytics?.summary?.totalEarnings   || 0), icon: DollarSign, color: 'green'  },
    { title: 'Total Followers',  value: formatNumber(analytics?.summary?.totalFollowers    || 0), icon: Users,      color: 'blue'   },
    { title: 'Avg Engagement',   value: `${(analytics?.summary?.averageEngagement || 0).toFixed(1)}%`, icon: Heart, color: 'pink'  },
    { title: 'Completed Deals',  value: analytics?.summary?.completedDeals  || 0,            icon: Award,      color: 'purple' },
    { title: 'Avg Rating',       value: (analytics?.summary?.averageRating   || 0).toFixed(1), icon: Star,       color: 'yellow' },
    { title: 'Avg Deal Value',   value: formatCurrency(analytics?.summary?.averageDealValue || 0), icon: TrendingUp, color: 'indigo' }
  ];

  const engagementMetrics = [
    { label: 'Impressions', value: formatNumber(analytics?.engagement?.impressions || 0), icon: Eye          },
    { label: 'Likes',       value: formatNumber(analytics?.engagement?.likes       || 0), icon: Heart        },
    { label: 'Comments',    value: formatNumber(analytics?.engagement?.comments    || 0), icon: MessageSquare },
    { label: 'Shares',      value: formatNumber(analytics?.engagement?.shares      || 0), icon: Share2       },
    { label: 'Clicks',      value: formatNumber(analytics?.engagement?.clicks      || 0), icon: Activity     },
    { label: 'Conversions', value: formatNumber(analytics?.engagement?.conversions || 0), icon: TrendingUp   }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isDark ? 'bg-gray-900' : 'bg-slate-100'}`}>
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl ${isDark ? 'bg-gray-900/90 backdrop-blur-sm border border-gray-700/50 shadow-sm' : 'bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-sm'}`}>
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Analytics Dashboard</h1>
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Track your performance and growth metrics</p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center rounded-lg border overflow-hidden shadow-sm ${
                isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white/50 border-gray-300/50'
              }`}>
                {[
                  { type: 'area', icon: LineChartIcon },
                  { type: 'bar',  icon: BarChart3     },
                  { type: 'line', icon: LineChartIcon  }
                ].map(({ type, icon: Icon }, i) => (
                  <button
                    key={type}
                    onClick={() => setChartType(type)}
                    className={`px-3 py-2 text-sm font-medium ${i > 0 ? 'border-l' : ''} ${
                      chartType === type 
                        ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white' 
                        : isDark 
                          ? 'hover:bg-gray-700/50 text-gray-300' 
                          : 'hover:bg-gray-50 text-gray-700'
                    } ${
                      i > 0 ? (isDark ? 'border-gray-700/50' : 'border-gray-300/50') : ''
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                icon={RefreshCw}
                onClick={() => fetchAnalytics(true)}
                loading={refreshing}
              >
                Refresh
              </Button>

              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm ${
                  isDark ? 'bg-gray-800/50 border-gray-700/50 text-gray-100' : 'bg-white/50 border-gray-300/50 text-gray-900'
                }`}
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="12m">Last 12 Months</option>
              </select>
            </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
          {summaryMetrics.map((metric, index) => (
            <StatsCard key={index} {...metric} />
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
          {engagementMetrics.map((metric, index) => (
            <div key={index} className="bg-white p-4 rounded-xl shadow-sm">
              <metric.icon className="w-5 h-5 text-gray-400 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              <p className="text-sm text-gray-600">{metric.label}</p>
            </div>
          ))}
        </div>

        <ChartCard title="Performance Over Time" showExport={false}>
          {hasChartData ? (
            <ResponsiveContainer width="100%" height={400}>
              {chartType === 'area' ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={(value, name) => name === 'earnings' ? formatCurrency(value) : value} />
                  <Legend />
                  <Area yAxisId="left"  type="monotone" dataKey="earnings" name="Earnings" stroke="#4F46E5" fill="url(#colorEarnings)" />
                  <Area yAxisId="right" type="monotone" dataKey="deals"    name="Deals"    stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                </AreaChart>
              ) : chartType === 'bar' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={(value, name) => name === 'earnings' ? formatCurrency(value) : value} />
                  <Legend />
                  <Bar yAxisId="left"  dataKey="earnings" name="Earnings" fill="#4F46E5" />
                  <Bar yAxisId="right" dataKey="deals"    name="Deals"    fill="#10B981" />
                </BarChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={(value, name) => name === 'earnings' ? formatCurrency(value) : value} />
                  <Legend />
                  <Line yAxisId="left"  type="monotone" dataKey="earnings" name="Earnings" stroke="#4F46E5" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="deals"    name="Deals"    stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 400 }}>
              <EmptyChart message="Complete your first deal to see performance data" />
            </div>
          )}
        </ChartCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <ChartCard title="Platform Distribution" showExport={false}>
            {hasPlatformData ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={platformData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {platformData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatNumber(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 300 }}>
                <EmptyChart message="Connect a social account to see platform data" />
              </div>
            )}
          </ChartCard>

          <ChartCard title="Engagement Breakdown" showExport={false}>
            {hasEngagementData ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={engagementBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip formatter={(value) => formatNumber(value)} />
                  <Bar dataKey="value" fill="#4F46E5" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 300 }}>
                <EmptyChart message="No engagement data yet" />
              </div>
            )}
          </ChartCard>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Brands</h2>
          {analytics?.topBrands && analytics.topBrands.length > 0 ? (
            <div className="space-y-3">
              {analytics.topBrands.map((brand, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <img
                      src={brand.brand?.logo || 'https://via.placeholder.com/40'}
                      alt={brand.brand?.brandName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{brand.brand?.brandName}</p>
                      <p className="text-xs text-gray-500">{brand.deals} deal{brand.deals !== 1 ? 's' : ''} completed</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">{formatCurrency(brand.earnings)}</p>
                    <p className="text-xs text-gray-500">earned</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Award className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Complete deals to see your top brands</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Age Groups</h2>
            {Object.keys(analytics?.demographics?.ageGroups || {}).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(analytics.demographics.ageGroups).map(([age, value]) => (
                  <div key={age}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{age}</span>
                      <span className="font-medium">{value}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-4 border border-gray-200 rounded-lg bg-gray-50">No demographic data available</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Gender Distribution</h2>
            {Object.keys(analytics?.demographics?.gender || {}).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(analytics.demographics.gender).map(([gender, value]) => (
                  <div key={gender}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{gender}</span>
                      <span className="font-medium">{value}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          gender === 'male' ? 'bg-blue-600' :
                          gender === 'female' ? 'bg-pink-600' : 'bg-purple-600'
                        }`}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-4 border border-gray-200 rounded-lg bg-gray-50">No gender data available</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Locations</h2>
            {analytics?.demographics?.locations && analytics.demographics.locations.length > 0 ? (
              <div className="space-y-3">
                {analytics.demographics.locations.map((loc, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{loc.country}</span>
                    <span className="text-sm font-medium text-indigo-600">{loc.percentage}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-4 border border-gray-200 rounded-lg bg-gray-50">No location data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;