import React, { useState } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  DollarSign,
  Award,
  Eye,
  Printer
} from 'lucide-react';
import Button from '../../components/UI/Button';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell
} from 'recharts';

const Reports = () => {
  const [reportType, setReportType] = useState('revenue');
  const [dateRange, setDateRange] = useState('30d');

  const reports = [
    { id: 'revenue', label: 'Revenue Report', icon: DollarSign },
    { id: 'users', label: 'User Growth', icon: Users },
    { id: 'campaigns', label: 'Campaign Performance', icon: TrendingUp },
    { id: 'platform', label: 'Platform Analytics', icon: BarChart3 },
    { id: 'creators', label: 'Creator Earnings', icon: Award },
    { id: 'brands', label: 'Brand Activity', icon: Eye }
  ];

  const revenueData = [
    { month: 'Jan', revenue: 45000, commissions: 4500, withdrawals: 38000 },
    { month: 'Feb', revenue: 52000, commissions: 5200, withdrawals: 44000 },
    { month: 'Mar', revenue: 48000, commissions: 4800, withdrawals: 41000 },
    { month: 'Apr', revenue: 61000, commissions: 6100, withdrawals: 52000 },
    { month: 'May', revenue: 58000, commissions: 5800, withdrawals: 49000 },
    { month: 'Jun', revenue: 72000, commissions: 7200, withdrawals: 61000 }
  ];

  const userGrowth = [
    { month: 'Jan', brands: 6200, creators: 12500 },
    { month: 'Feb', brands: 6800, creators: 13200 },
    { month: 'Mar', brands: 7100, creators: 14100 },
    { month: 'Apr', brands: 7600, creators: 14800 },
    { month: 'May', brands: 7900, creators: 15600 },
    { month: 'Jun', brands: 8234, creators: 16287 }
  ];

  const platformData = [
    { name: 'Instagram', value: 55, color: '#E1306C' },
    { name: 'TikTok', value: 25, color: '#000000' },
    { name: 'YouTube', value: 15, color: '#FF0000' },
    { name: 'Other', value: 5, color: '#808080' }
  ];

  const summaryStats = {
    totalRevenue: '$336,000',
    totalCommissions: '$33,600',
    avgDealSize: '$425',
    totalUsers: '24,521',
    activeCampaigns: '1,245',
    completionRate: '94%'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Generate and export detailed reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={Printer}>
            Print
          </Button>
          <Button variant="primary" icon={Download}>
            Export PDF
          </Button>
        </div>
      </div>

      {/* Report Controls */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2">
            {reports.map((report) => {
              const Icon = report.icon;
              return (
                <button
                  key={report.id}
                  onClick={() => setReportType(report.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                    reportType === report.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {report.label}
                </button>
              );
            })}
          </div>
          
          <div className="flex gap-2">
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">This Year</option>
              <option value="all">All Time</option>
            </select>
            
            <Button variant="outline" icon={Calendar}>
              Custom Range
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
          <p className="text-xl font-bold text-gray-900">{summaryStats.totalRevenue}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Commissions</p>
          <p className="text-xl font-bold text-gray-900">{summaryStats.totalCommissions}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Avg Deal Size</p>
          <p className="text-xl font-bold text-gray-900">{summaryStats.avgDealSize}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Total Users</p>
          <p className="text-xl font-bold text-gray-900">{summaryStats.totalUsers}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Active Campaigns</p>
          <p className="text-xl font-bold text-gray-900">{summaryStats.activeCampaigns}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Completion Rate</p>
          <p className="text-xl font-bold text-green-600">{summaryStats.completionRate}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={2} />
              <Line type="monotone" dataKey="commissions" stroke="#10B981" strokeWidth={2} />
              <Line type="monotone" dataKey="withdrawals" stroke="#F59E0B" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={userGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="brands" fill="#4F46E5" />
              <Bar dataKey="creators" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
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
            </RePieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Most Active Platform</span>
              <span className="font-bold text-indigo-600">Instagram (55%)</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Peak Campaign Month</span>
              <span className="font-bold">June</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Average Deal Time</span>
              <span className="font-bold">12 days</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Top Category</span>
              <span className="font-bold">Fashion (32%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition-colors">
            <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="font-medium text-gray-900">Full Report</p>
            <p className="text-xs text-gray-500">PDF • All metrics</p>
          </button>
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition-colors">
            <BarChart3 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="font-medium text-gray-900">Financial Report</p>
            <p className="text-xs text-gray-500">Excel • Revenue & fees</p>
          </button>
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition-colors">
            <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="font-medium text-gray-900">User Analytics</p>
            <p className="text-xs text-gray-500">CSV • Growth metrics</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Reports;