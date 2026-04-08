// pages/Admin/Creators.jsx
import React, { useState } from 'react';
import { useAdminData } from '../../hooks/useAdminData';
import { useTheme } from '../../hooks/useTheme';
import { Search, Filter, CheckCircle, Clock, Users, DollarSign, Star, Instagram, Youtube, Twitter, Download, UserCheck, UserX } from 'lucide-react';
import Button from '../../components/UI/Button';
import StatsCard from '../../components/Common/StatsCard';
import Modal from '../../components/Common/Modal';
import Loader from '../../components/Common/Loader';
import { formatNumber, formatCurrency, formatDate } from '../../utils/helpers';
import { getStatusColor } from '../../utils/colorScheme';

const Creators = () => {
  const { creators, loading, refreshData, stats } = useAdminData();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCreator, setSelectedCreator] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const filteredCreators = creators.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (searchQuery && !c.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) && !c.email?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getStatusColorClass = (status) => {
    return getStatusColor(status, 'status', false); // Creators page doesn't use theme yet
  };

  const getPlatformIcon = (platform) => {
    switch(platform) {
      case 'instagram': return <Instagram className="w-4 h-4 text-pink-600" />;
      case 'youtube': return <Youtube className="w-4 h-4 text-red-600" />;
      case 'tiktok': return <Twitter className="w-4 h-4 text-black" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="large" color="purple" />
      </div>
    );
  }

  const openCreatorDetails = (creator) => {
    setSelectedCreator(creator);
    setShowDetailsModal(true);
  };

  return (
    <div className={`space-y-6 ${isDark ? 'bg-gray-900' : 'bg-slate-100'}`}>
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl ${isDark ? 'bg-gray-900/90 backdrop-blur-sm border border-gray-700/50 shadow-sm' : 'bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-sm'}`}>
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Creator Management</h1>
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Manage all creators on the platform</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={Download}>
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="Total Creators" value={stats.totalCreators?.toLocaleString() || '0'} icon={Users} color="bg-blue-500" />
        <StatsCard title="Active" value={creators.filter(c => c.status === 'active').length} icon={CheckCircle} color="bg-green-500" />
        <StatsCard title="Pending" value={creators.filter(c => c.status === 'pending').length} icon={Clock} color="bg-yellow-500" />
        <StatsCard title="Total Earnings" value={formatCurrency(creators.reduce((sum, c) => sum + (c.stats?.totalEarnings || 0), 0))} icon={DollarSign} color="bg-purple-500" />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200/50">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search creators by name, email, or niche..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)} 
                className="appearance-none pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 shadow-sm bg-white"
              >
                <option value="all">All Creators</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                {filter === 'all' && <Users className="w-4 h-4 text-gray-400" />}
                {filter === 'active' && <UserCheck className="w-4 h-4 text-green-500" />}
                {filter === 'pending' && <Clock className="w-4 h-4 text-yellow-500" />}
                {filter === 'suspended' && <UserX className="w-4 h-4 text-red-500" />}
              </div>
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>

            <Button variant="outline" icon={Download} className="px-4 py-3">
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div>
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left whitespace-nowrap font-normal text-gray-600">Creator</th>
                <th className="px-4 py-3 text-left whitespace-nowrap font-normal text-gray-600">Niche</th>
                <th className="px-4 py-3 text-left whitespace-nowrap font-normal text-gray-600">Status</th>
                <th className="px-4 py-3 text-left whitespace-nowrap font-normal text-gray-600">Platforms</th>
                <th className="px-4 py-3 text-left whitespace-nowrap font-normal text-gray-600">Followers</th>
                <th className="px-4 py-3 text-left whitespace-nowrap font-normal text-gray-600">Engagement</th>
                <th className="px-4 py-3 text-left whitespace-nowrap font-normal text-gray-600">Earnings</th>
                <th className="px-4 py-3 text-left whitespace-nowrap font-normal text-gray-600">Rating</th>
             </tr>
            </thead>
            <tbody>
              {filteredCreators.map(creator => (
                <tr 
                  key={creator._id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openCreatorDetails(creator)}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="font-medium truncate max-w-[150px]">{creator.displayName}</div>
                    <div className="text-sm text-gray-500 truncate max-w-[150px]">{creator.email}</div>
                  </td>
                  <td className="px-4 py-4 truncate max-w-[100px]">{creator.niches?.[0] || '—'}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColorClass(creator.status)}`}>
                      {creator.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex gap-1">
                      {creator.socialMedia?.instagram && getPlatformIcon('instagram')}
                      {creator.socialMedia?.youtube && getPlatformIcon('youtube')}
                      {creator.socialMedia?.tiktok && getPlatformIcon('tiktok')}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">{formatNumber(creator.totalFollowers || 0)}</td>
                  <td className="px-4 py-4 text-green-600 whitespace-nowrap">{creator.averageEngagement?.toFixed(1) || '0'}%</td>
                  <td className="px-4 py-4 font-medium whitespace-nowrap">{formatCurrency(creator.stats?.totalEarnings || 0)}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="ml-1">{creator.stats?.averageRating?.toFixed(1) || '0'}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedCreator(null);
        }}
        title="Creator Details"
        size="lg"
      >
        {selectedCreator && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{selectedCreator.displayName || 'Creator'}</h3>
              <p className="text-sm text-gray-600">{selectedCreator.email || 'No email available'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500">Status</p>
                <p className="font-medium capitalize">{selectedCreator.status || 'unknown'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500">Joined</p>
                <p className="font-medium">{selectedCreator.createdAt ? formatDate(selectedCreator.createdAt) : 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500">Followers</p>
                <p className="font-medium">{formatNumber(selectedCreator.totalFollowers || 0)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-500">Engagement</p>
                <p className="font-medium">{selectedCreator.averageEngagement?.toFixed(1) || '0'}%</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-xs text-gray-500">Total Earnings</p>
                <p className="font-semibold text-green-600">{formatCurrency(selectedCreator.stats?.totalEarnings || 0)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-xs text-gray-500">Campaigns</p>
                <p className="font-semibold">{selectedCreator.stats?.completedCampaigns || 0}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-xs text-gray-500">Rating</p>
                <p className="font-semibold">{selectedCreator.stats?.averageRating?.toFixed(1) || '0'}</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Creators;