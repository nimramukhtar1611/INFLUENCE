// pages/Brand/Analytics.js - COMPLETE FIXED VERSION
// FIX 28: "Key Performance Indicators" section was 100% hardcoded (78%, 4.8%, 12.5K likes, etc.)
// Now reads from analytics.summary — shows empty/zero state when no data
import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area, ComposedChart
} from 'recharts';
import {
  TrendingUp, Users, DollarSign, Eye, Download, RefreshCw,
  Activity, Heart, Share2, MessageSquare, Target, Award
} from 'lucide-react';
import brandService from '../../services/brandService';
import { formatCurrency, formatNumber } from '../../utils/helpers';
import Button from '../../components/UI/Button';
import StatsCard from '../../components/Common/StatsCard';
import ChartCard from '../../components/Common/ChartCard';
import toast from 'react-hot-toast';

const Analytics = () => {
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics,  setAnalytics]  = useState(null);
  const [dateRange,  setDateRange]  = useState('30d');
  const [chartType,  setChartType]  = useState('area');

  useEffect(() => { fetchAnalytics(); }, [dateRange]);

  const fetchAnalytics = async (showToast = false) => {
    try {
      showToast ? setRefreshing(true) : setLoading(true);
      const res = await brandService.getAnalytics(dateRange);
      if (res?.success) {
        setAnalytics(res.analytics);
      } else {
        setAnalytics(null);
      }
      if (showToast) toast.success('Analytics refreshed');
    } catch (e) {
      console.error('Analytics error:', e);
      toast.error('Failed to load analytics');
      setAnalytics(null);
    } finally { setLoading(false); setRefreshing(false); }
  };

  // ── Chart data ────────────────────────────────────────────────────────────
  const performanceData = (analytics?.campaignPerformance || []).map(item => ({
    date:  `${item._id?.month || ''}/${item._id?.day || ''}`,
    spent: item.spent     || 0,
    deals: item.campaigns || item.deals || 0
  }));

  const platformData = (analytics?.platforms || []).map(p => ({
    name:  p._id || 'other',
    value: p.count || 0,
    color: p._id === 'instagram' ? '#E1306C' :
           p._id === 'youtube'   ? '#FF0000' :
           p._id === 'tiktok'    ? '#000000' :
           p._id === 'twitter'   ? '#1DA1F2' :
           p._id === 'facebook'  ? '#4267B2' : '#4F46E5'
  }));

  const dealData = [
    { name: 'Completed',   value: analytics?.summary?.completedDeals || 0,  color: '#10B981' },
    { name: 'In Progress', value: Math.max(0, (analytics?.summary?.totalDeals || 0) - (analytics?.summary?.completedDeals || 0)), color: '#3B82F6' }
  ].filter(d => d.value > 0);

  // ── Top-level stat cards ──────────────────────────────────────────────────
  const metrics = [
    { label: 'Total Campaigns',  value: analytics?.summary?.totalCampaigns  || 0,                         icon: TrendingUp },
    { label: 'Active Campaigns', value: analytics?.summary?.activeCampaigns || 0,                         icon: Eye        },
    { label: 'Total Spent',      value: formatCurrency(analytics?.summary?.totalSpent || 0),              icon: DollarSign },
    { label: 'Avg. ROI',         value: `${(analytics?.summary?.avgROI || 0).toFixed(1)}x`,               icon: TrendingUp },
    { label: 'Total Deals',      value: analytics?.summary?.totalDeals      || 0,                         icon: Activity   },
    { label: 'Completed',        value: analytics?.summary?.completedDeals  || 0,                         icon: Award      },
  ];

  // ── KPI helper — compute from analytics.summary ───────────────────────────
  const totalDeals     = analytics?.summary?.totalDeals     || 0;
  const completedDeals = analytics?.summary?.completedDeals || 0;

  // Campaign success rate = completed / total (as %)
  const successRate    = totalDeals > 0 ? Math.round((completedDeals / totalDeals) * 100) : 0;
  const avgEngagement  = analytics?.summary?.avgEngagement  || 0;
  const avgRating      = analytics?.summary?.avgRating      || 0;
  const ratingPct      = avgRating > 0 ? Math.round((avgRating / 5) * 100) : 0;

  const totalLikes     = analytics?.summary?.totalLikes     || 0;
  const totalComments  = analytics?.summary?.totalComments  || 0;
  const totalShares    = analytics?.summary?.totalShares    || 0;
  const totalImpressions = analytics?.summary?.totalImpressions || 0;

  const hasAnyData = totalDeals > 0 || (analytics?.campaignPerformance?.length > 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-600">Track your campaign performance and ROI</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Chart type toggle */}
          <div className="flex items-center bg-white rounded-lg border border-gray-300 overflow-hidden">
            {['area', 'bar', 'line'].map((t, i) => (
              <button key={t} onClick={() => setChartType(t)}
                className={`px-3 py-2 text-sm font-medium capitalize ${i > 0 ? 'border-l border-gray-300' : ''} ${chartType === t ? 'bg-indigo-600 text-white' : 'hover:bg-gray-50'}`}>
                {t}
              </button>
            ))}
          </div>
          <select value={dateRange} onChange={e => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="12m">This Year</option>
          </select>
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => fetchAnalytics(true)} loading={refreshing}>Refresh</Button>
          <Button variant="outline" size="sm" icon={Download}>Export</Button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((m, i) => <StatsCard key={i} {...m} />)}
      </div>

      {/* Performance chart */}
      <ChartCard title="Campaign Performance">
        {performanceData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            {chartType === 'area' ? (
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#4F46E5" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" /><YAxis yAxisId="left" /><YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(v, n) => n === 'spent' ? formatCurrency(v) : v} />
                <Legend />
                <Area yAxisId="left"  type="monotone" dataKey="spent" name="Spent" stroke="#4F46E5" fill="url(#colorSpent)" />
                <Area yAxisId="right" type="monotone" dataKey="deals" name="Deals" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
              </AreaChart>
            ) : chartType === 'bar' ? (
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" /><YAxis yAxisId="left" /><YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(v, n) => n === 'spent' ? formatCurrency(v) : v} /><Legend />
                <Bar yAxisId="left"  dataKey="spent" name="Spent" fill="#4F46E5" />
                <Bar yAxisId="right" dataKey="deals" name="Deals" fill="#10B981" />
              </BarChart>
            ) : (
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" /><YAxis yAxisId="left" /><YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(v, n) => n === 'spent' ? formatCurrency(v) : v} /><Legend />
                <Line yAxisId="left"  type="monotone" dataKey="spent" name="Spent" stroke="#4F46E5" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="deals" name="Deals" stroke="#10B981" strokeWidth={2} dot={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-400">
            No campaign data for this period
          </div>
        )}
      </ChartCard>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform distribution */}
        <ChartCard title="Platform Distribution">
          {platformData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={platformData} cx="50%" cy="50%" labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100} dataKey="value">
                  {platformData.map((entry, i) => (
                    <Cell key={i} fill={entry.color || ['#4F46E5','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899'][i % 6]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400">No platform data yet</div>
          )}
        </ChartCard>

        {/* Deal status */}
        <ChartCard title="Deal Status">
          {dealData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={dealData} cx="50%" cy="50%" labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100} dataKey="value">
                  {dealData.map((entry, i) => (
                    <Cell key={i} fill={entry.color || ['#4F46E5','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899'][i % 6]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400">No deals yet</div>
          )}
        </ChartCard>

        {/* Monthly trends */}
        <ChartCard title="Monthly Trends">
          {performanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={performanceData.slice(-12)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" /><YAxis yAxisId="left" /><YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(v, n) => n === 'spent' ? formatCurrency(v) : v} /><Legend />
                <Bar  yAxisId="left"  dataKey="spent" name="Spent" fill="#4F46E5" />
                <Line yAxisId="right" type="monotone" dataKey="deals" name="Deals" stroke="#10B981" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400">No data yet</div>
          )}
        </ChartCard>

        {/* ── KEY PERFORMANCE INDICATORS ─────────────────────────────────────
            FIX 28: Was 78%, 4.8%, 4.6/5, 12.5K all hardcoded.
            Now reads from analytics.summary. Shows 0 / empty state if no data.
        ──────────────────────────────────────────────────────────────────── */}
        <ChartCard title="Key Performance Indicators">
          <div className="space-y-5 p-2">
            {!hasAnyData ? (
              <div className="py-8 text-center text-gray-400">
                <Target className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p>No performance data yet.</p>
                <p className="text-sm">Launch a campaign to start tracking KPIs.</p>
              </div>
            ) : (
              <>
                {/* Campaign success rate */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">Campaign Success Rate</span>
                    <span className="text-sm font-bold text-gray-900">{successRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${successRate}%` }} />
                  </div>
                </div>

                {/* Average engagement */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">Average Engagement</span>
                    <span className="text-sm font-bold text-gray-900">
                      {avgEngagement > 0 ? `${avgEngagement.toFixed(1)}%` : '—'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(avgEngagement * 10, 100)}%` }} />
                  </div>
                  {avgEngagement === 0 && (
                    <p className="text-xs text-gray-400 mt-1">Engagement data collected from deal metrics</p>
                  )}
                </div>

                {/* Creator satisfaction */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">Creator Satisfaction</span>
                    <span className="text-sm font-bold text-gray-900">
                      {avgRating > 0 ? `${avgRating.toFixed(1)}/5` : '—'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${ratingPct}%` }} />
                  </div>
                  {avgRating === 0 && (
                    <p className="text-xs text-gray-400 mt-1">Rating collected after deal completion</p>
                  )}
                </div>

                {/* Social engagement grid */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <Heart className="w-5 h-5 text-pink-600 mx-auto mb-1" />
                    <p className="text-xl font-bold text-gray-900">
                      {totalLikes > 0 ? formatNumber(totalLikes) : <span className="text-gray-400 text-sm">No data</span>}
                    </p>
                    <p className="text-xs text-gray-500">Total Likes</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <MessageSquare className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <p className="text-xl font-bold text-gray-900">
                      {totalComments > 0 ? formatNumber(totalComments) : <span className="text-gray-400 text-sm">No data</span>}
                    </p>
                    <p className="text-xs text-gray-500">Comments</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <Share2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                    <p className="text-xl font-bold text-gray-900">
                      {totalShares > 0 ? formatNumber(totalShares) : <span className="text-gray-400 text-sm">No data</span>}
                    </p>
                    <p className="text-xs text-gray-500">Shares</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <Eye className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                    <p className="text-xl font-bold text-gray-900">
                      {totalImpressions > 0 ? formatNumber(totalImpressions) : <span className="text-gray-400 text-sm">No data</span>}
                    </p>
                    <p className="text-xs text-gray-500">Impressions</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

export default Analytics;