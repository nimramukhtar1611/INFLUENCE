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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatsCard title="Total Creators" value={stats.totalCreators?.toLocaleString() || '0'} icon={Users} color="bg-blue-500" />
        <StatsCard title="Active" value={creators.filter(c => c.status === 'active').length} icon={CheckCircle} color="bg-green-500" />
        <StatsCard title="Pending" value={creators.filter(c => c.status === 'pending').length} icon={Clock} color="bg-yellow-500" />
        <StatsCard title="Total Earnings" value={formatCurrency(creators.reduce((sum, c) => sum + (c.stats?.totalEarnings || 0), 0))} icon={DollarSign} color="bg-purple-500" />
      </div>

      <div className={`p-3 sm:p-4 lg:p-6 rounded-xl shadow-sm ${isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'}`}>
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search creators by name, email, or niche..."
              className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 shadow-sm text-sm ${
                isDark 
                  ? 'bg-gray-800/50 border-gray-700/50 text-gray-100 placeholder:text-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
              }`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)} 
                className={`appearance-none pl-9 sm:pl-10 pr-8 sm:pr-10 py-2 sm:py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 shadow-sm text-sm ${
                  isDark 
                    ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="all">All Creators</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                {filter === 'all' && <Users className={`w-3 h-3 sm:w-4 sm:h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />}
                {filter === 'active' && <UserCheck className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />}
                {filter === 'pending' && <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />}
                {filter === 'suspended' && <UserX className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />}
              </div>
              <Filter className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'} w-3 h-3 sm:w-4 sm:h-4 pointer-events-none`} />
            </div>

            <Button variant="outline" icon={Download} className="px-3 py-2 sm:px-4 sm:py-3">
              <span className="hidden sm:inline">Export</span>
              <span className="sm:hidden">Exp</span>
            </Button>
          </div>
        </div>
      </div>

      <div className={`rounded-xl shadow-sm overflow-hidden ${isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'}`}>
        <div className="overflow-x-auto">
          <table className={`min-w-full divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            <thead className={isDark ? 'bg-gray-800' : 'bg-gray-50'}>
              <tr>
                <th className={`px-1 sm:px-3 py-2 text-left whitespace-nowrap font-normal text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} min-w-[80px] sm:min-w-[120px]`}>Creator</th>
                <th className={`px-1 sm:px-3 py-2 text-left whitespace-nowrap font-normal text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} min-w-[50px]`}>Niche</th>
                <th className={`px-1 sm:px-3 py-2 text-left whitespace-nowrap font-normal text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} min-w-[50px]`}>Status</th>
                <th className={`hidden sm:table-cell px-1 sm:px-3 py-2 text-left whitespace-nowrap font-normal text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} min-w-[60px]`}>Platforms</th>
                <th className={`hidden md:table-cell px-1 sm:px-3 py-2 text-left whitespace-nowrap font-normal text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} min-w-[60px]`}>Followers</th>
                <th className={`hidden md:table-cell px-1 sm:px-3 py-2 text-left whitespace-nowrap font-normal text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} min-w-[60px]`}>Engagement</th>
                <th className={`hidden lg:table-cell px-1 sm:px-3 py-2 text-left whitespace-nowrap font-normal text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} min-w-[60px]`}>Earnings</th>
                <th className={`hidden lg:table-cell px-1 sm:px-3 py-2 text-left whitespace-nowrap font-normal text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} min-w-[60px]`}>Rating</th>
             </tr>
            </thead>
            <tbody className={`${isDark ? 'bg-gray-900' : 'bg-white'} divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredCreators.map(creator => (
                <tr 
                  key={creator._id} 
                  className={`${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} cursor-pointer`}
                  onClick={() => openCreatorDetails(creator)}
                >
                  <td className="px-1 sm:px-3 py-2 whitespace-nowrap">
                    <div className={`text-xs sm:text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} truncate max-w-[80px] sm:max-w-[120px]`}>{creator.displayName}</div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} truncate max-w-[80px] sm:max-w-[120px]`}>{creator.email}</div>
                  </td>
                  <td className={`px-1 sm:px-3 py-2 text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} truncate max-w-[60px] sm:max-w-[80px]`}>{creator.niches?.[0] || '—'}</td>
                  <td className="px-1 sm:px-3 py-2 whitespace-nowrap">
                    <span className={`px-1 py-1 text-xs rounded-full ${getStatusColorClass(creator.status)}`}>
                      {creator.status}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell px-1 sm:px-3 py-2 whitespace-nowrap">
                    <div className="flex gap-1">
                      {creator.socialMedia?.instagram && getPlatformIcon('instagram')}
                      {creator.socialMedia?.youtube && getPlatformIcon('youtube')}
                      {creator.socialMedia?.tiktok && getPlatformIcon('tiktok')}
                    </div>
                  </td>
                  <td className={`hidden md:table-cell px-1 sm:px-3 py-2 text-xs sm:text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'} whitespace-nowrap`}>{formatNumber(creator.totalFollowers || 0)}</td>
                  <td className={`hidden md:table-cell px-1 sm:px-3 py-2 text-xs sm:text-sm text-green-600 whitespace-nowrap`}>{creator.averageEngagement?.toFixed(1) || '0'}%</td>
                  <td className={`hidden lg:table-cell px-1 sm:px-3 py-2 text-xs sm:text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} whitespace-nowrap`}>{formatCurrency(creator.stats?.totalEarnings || 0)}</td>
                  <td className={`hidden lg:table-cell px-1 sm:px-3 py-2 whitespace-nowrap`}>
                    <div className="flex items-center">
                      <Star className="w-3 h-3 text-yellow-400 fill-current" />
                      <span className={`ml-1 text-xs sm:text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{creator.stats?.averageRating?.toFixed(1) || '0'}</span>
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
              <h3 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{selectedCreator.displayName || 'Creator'}</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{selectedCreator.email || 'No email available'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</p>
                <p className={`text-sm font-medium capitalize ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{selectedCreator.status || 'unknown'}</p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Joined</p>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{selectedCreator.createdAt ? formatDate(selectedCreator.createdAt) : 'N/A'}</p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Followers</p>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{formatNumber(selectedCreator.totalFollowers || 0)}</p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Engagement</p>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{selectedCreator.averageEngagement?.toFixed(1) || '0'}%</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className={`p-2 sm:p-3 rounded-lg text-center ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Earnings</p>
                <p className={`text-sm sm:text-base font-semibold text-green-600`}>{formatCurrency(selectedCreator.stats?.totalEarnings || 0)}</p>
              </div>
              <div className={`p-2 sm:p-3 rounded-lg text-center ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Campaigns</p>
                <p className={`text-sm sm:text-base font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{selectedCreator.stats?.completedCampaigns || 0}</p>
              </div>
              <div className={`p-2 sm:p-3 rounded-lg text-center ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Rating</p>
                <p className={`text-sm sm:text-base font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{selectedCreator.stats?.averageRating?.toFixed(1) || '0'}</p>
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