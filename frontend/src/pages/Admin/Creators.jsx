// pages/Admin/Creators.jsx
import React, { useState } from 'react';
import { useAdminData } from '../../hooks/useAdminData';
import { Search, Filter, Eye, Edit, MoreVertical, CheckCircle, XCircle, Clock, Users, DollarSign, Star, Instagram, Youtube, Twitter, Download } from 'lucide-react';
import Button from '../../components/UI/Button';
import StatsCard from '../../components/Common/StatsCard';
import { formatNumber, formatCurrency, formatDate } from '../../utils/helpers';

const Creators = () => {
  const { creators, loading, refreshData, stats } = useAdminData();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCreators = creators.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (searchQuery && !c.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) && !c.email?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlatformIcon = (platform) => {
    switch(platform) {
      case 'instagram': return <Instagram className="w-4 h-4 text-pink-600" />;
      case 'youtube': return <Youtube className="w-4 h-4 text-red-600" />;
      case 'tiktok': return <Twitter className="w-4 h-4 text-black" />;
      default: return null;
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Creator Management</h1>
        <Button variant="outline" icon={Download}>Export</Button>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <StatsCard title="Total Creators" value={stats.totalCreators?.toLocaleString() || '0'} icon={Users} color="bg-blue-500" />
        <StatsCard title="Active" value={creators.filter(c => c.status === 'active').length} icon={CheckCircle} color="bg-green-500" />
        <StatsCard title="Pending" value={creators.filter(c => c.status === 'pending').length} icon={Clock} color="bg-yellow-500" />
        <StatsCard title="Total Earnings" value={formatCurrency(creators.reduce((sum, c) => sum + (c.stats?.totalEarnings || 0), 0))} icon={DollarSign} color="bg-purple-500" />
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search creators..."
            className="flex-1 px-4 py-2 border rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-4 py-2 border rounded-lg">
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left">Creator</th>
              <th className="px-6 py-3 text-left">Niche</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Platforms</th>
              <th className="px-6 py-3 text-left">Followers</th>
              <th className="px-6 py-3 text-left">Engagement</th>
              <th className="px-6 py-3 text-left">Earnings</th>
              <th className="px-6 py-3 text-left">Rating</th>
              <th className="px-6 py-3 text-right">Actions</th>
             </tr>
          </thead>
          <tbody>
            {filteredCreators.map(creator => (
              <tr key={creator._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-medium">{creator.displayName}</div>
                  <div className="text-sm text-gray-500">{creator.email}</div>
                </td>
                <td className="px-6 py-4">{creator.niches?.[0] || '—'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(creator.status)}`}>
                    {creator.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1">
                    {creator.socialMedia?.instagram && getPlatformIcon('instagram')}
                    {creator.socialMedia?.youtube && getPlatformIcon('youtube')}
                    {creator.socialMedia?.tiktok && getPlatformIcon('tiktok')}
                  </div>
                </td>
                <td className="px-6 py-4">{formatNumber(creator.totalFollowers || 0)}</td>
                <td className="px-6 py-4 text-green-600">{creator.averageEngagement?.toFixed(1) || '0'}%</td>
                <td className="px-6 py-4 font-medium">{formatCurrency(creator.stats?.totalEarnings || 0)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="ml-1">{creator.stats?.averageRating?.toFixed(1) || '0'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-indigo-600 hover:text-indigo-900 mr-2">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Creators;