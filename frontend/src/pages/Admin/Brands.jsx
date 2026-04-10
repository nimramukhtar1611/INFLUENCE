// pages/Admin/Brands.jsx
import React, { useState, useEffect } from 'react';
import { useAdminData } from '../../hooks/useAdminData';
import { useTheme } from '../../hooks/useTheme';
import {
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  DollarSign,
  Download,
  TrendingUp,
  Users,
  Mail,
  Phone,
  MapPin,
  Globe,
  Calendar
} from 'lucide-react';
import Button from '../../components/UI/Button';
import StatsCard from '../../components/Common/StatsCard';
import Modal from '../../components/Common/Modal';
import Loader from '../../components/Common/Loader';
import { formatCurrency, formatDate, timeAgo } from '../../utils/helpers';
import { getStatusColor } from '../../utils/colorScheme';
import toast from 'react-hot-toast';

const Brands = () => {
  const { brands, loading, refreshData, stats } = useAdminData();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [filteredBrands, setFilteredBrands] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ status: '', notes: '' });

  useEffect(() => {
    if (brands) {
      let filtered = [...brands];
      
      // Apply search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(b => 
          b.brandName?.toLowerCase().includes(query) ||
          b.email?.toLowerCase().includes(query) ||
          b.industry?.toLowerCase().includes(query)
        );
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(b => b.status === statusFilter);
      }

      // Apply industry filter
      if (industryFilter !== 'all') {
        filtered = filtered.filter(b => b.industry === industryFilter);
      }

      setFilteredBrands(filtered);
    }
  }, [brands, searchQuery, statusFilter, industryFilter]);

  const handleViewDetails = (brand) => {
    setSelectedBrand(brand);
    setShowDetailsModal(true);
  };

  const handleEdit = (brand) => {
    setSelectedBrand(brand);
    setEditForm({ status: brand.status, notes: '' });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      // This would call an admin API to update brand
      // For now, just show success
      toast.success('Brand updated successfully');
      setShowEditModal(false);
      refreshData();
    } catch (error) {
      toast.error('Failed to update brand');
    }
  };

  const handleExport = () => {
    // Generate CSV
    const csvContent = [
      ['Brand Name', 'Email', 'Industry', 'Status', 'Joined', 'Total Spent', 'Campaigns', 'Creators'].join(','),
      ...filteredBrands.map(b => [
        `"${b.brandName}"`,
        `"${b.email}"`,
        `"${b.industry}"`,
        b.status,
        formatDate(b.createdAt),
        b.stats?.totalSpent || 0,
        b.stats?.totalCampaigns || 0,
        b.stats?.totalCreators || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brands-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusColorClass = (status) => {
    return getStatusColor(status, 'status', false); // Brands page doesn't use theme yet
  };

  const industries = [...new Set(brands?.map(b => b.industry).filter(Boolean))];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="large" color="purple" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isDark ? 'bg-gray-900' : 'bg-slate-100'}`}>
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl ${isDark ? 'bg-gray-900/90 backdrop-blur-sm border border-gray-700/50 shadow-sm' : 'bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-sm'}`}>
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Brand Management</h1>
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Manage all brands on the platform</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={Download} onClick={handleExport}>
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatsCard
          title="Total Brands"
          value={stats.totalBrands?.toLocaleString() || '0'}
          icon={Building2}
          color="bg-blue-500"
        />
        <StatsCard
          title="Active Brands"
          value={brands?.filter(b => b.status === 'active').length || 0}
          icon={CheckCircle}
          color="bg-green-500"
        />
        <StatsCard
          title="Pending Verification"
          value={brands?.filter(b => b.status === 'pending').length || 0}
          icon={Clock}
          color="bg-yellow-500"
        />
        <StatsCard
          title="Total Spent"
          value={formatCurrency(brands?.reduce((sum, b) => sum + (b.stats?.totalSpent || 0), 0) || 0)}
          icon={DollarSign}
          color="bg-purple-500"
        />
      </div>

      {/* Search and Filters */}
      <div className={`p-3 sm:p-4 rounded-xl shadow-sm ${isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'}`}>
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search brands by name, email, or industry..."
              className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${
                isDark 
                  ? 'bg-gray-800/50 border-gray-700/50 text-gray-100 placeholder:text-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
              }`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${
                isDark 
                  ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>

            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${
                isDark 
                  ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Industries</option>
              {industries.map(industry => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 border rounded-lg flex items-center gap-2 text-sm ${
                showFilters 
                  ? isDark ? 'bg-indigo-900/30 border-indigo-600 text-indigo-400' : 'bg-indigo-50 border-indigo-600 text-indigo-600'
                  : isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'
              }`}
            >
              <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">More Filters</span>
              <span className="sm:hidden">Filters</span>
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className={`mt-3 sm:mt-4 pt-3 sm:pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className={`block text-xs sm:text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Min. Campaigns
                </label>
                <input
                  type="number"
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${
                    isDark 
                      ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="e.g., 5"
                />
              </div>
              <div>
                <label className={`block text-xs sm:text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Min. Spent ($)
                </label>
                <input
                  type="number"
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${
                    isDark 
                      ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="e.g., 1000"
                />
              </div>
              <div>
                <label className={`block text-xs sm:text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Joined After
                </label>
                <input
                  type="date"
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${
                    isDark 
                      ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3 sm:mt-4">
              <Button variant="secondary" size="sm">Clear</Button>
              <Button variant="primary" size="sm">Apply</Button>
            </div>
          </div>
        )}
      </div>

      {/* Brands Table */}
      <div className={`rounded-xl shadow-sm overflow-hidden ${isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'}`}>
        <div className="overflow-x-auto">
          <table className={`min-w-full divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            <thead className={isDark ? 'bg-gray-800' : 'bg-gray-50'}>
              <tr>
                <th className={`px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap min-w-[80px] sm:min-w-[120px]`}>
                  Brand
                </th>
                <th className={`px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap min-w-[50px]`}>
                  Industry
                </th>
                <th className={`px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap min-w-[50px]`}>
                  Status
                </th>
                <th className={`hidden sm:table-cell px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap min-w-[60px]`}>
                  Joined
                </th>
                <th className={`hidden md:table-cell px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap min-w-[60px]`}>
                  Campaigns
                </th>
                <th className={`hidden md:table-cell px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap min-w-[60px]`}>
                  Spent
                </th>
                <th className={`hidden lg:table-cell px-1 sm:px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap min-w-[60px]`}>
                  Creators
                </th>
                <th className={`px-1 sm:px-3 py-2 text-right text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap min-w-[60px]`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`${isDark ? 'bg-gray-900' : 'bg-white'} divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredBrands.length > 0 ? (
                filteredBrands.map((brand) => (
                  <tr key={brand._id} className={isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}>
                    <td className="px-1 sm:px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        {brand.logo ? (
                          <img src={brand.logo} alt={brand.brandName} className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover" />
                        ) : (
                          <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'}`}>
                            <Building2 className={`w-3 h-3 sm:w-4 sm:h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                          </div>
                        )}
                        <div className="ml-1 sm:ml-2 min-w-0 flex-1">
                          <div className={`text-xs sm:text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} truncate max-w-[80px] sm:max-w-[120px]`}>{brand.brandName}</div>
                          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} truncate max-w-[80px] sm:max-w-[120px]`}>{brand.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className={`px-1 sm:px-3 py-2 text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} truncate max-w-[60px] sm:max-w-[80px]`}>{brand.industry || '—'}</td>
                    <td className="px-1 sm:px-3 py-2 whitespace-nowrap">
                      <span className={`px-1 py-1 text-xs rounded-full ${getStatusColorClass(brand.status)}`}>
                        {brand.status}
                      </span>
                    </td>
                    <td className={`hidden sm:table-cell px-1 sm:px-3 py-2 text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap`}>
                      {formatDate(brand.createdAt)}
                    </td>
                    <td className={`hidden md:table-cell px-1 sm:px-3 py-2 text-xs sm:text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'} whitespace-nowrap`}>
                      {brand.stats?.totalCampaigns || 0}
                    </td>
                    <td className={`hidden md:table-cell px-1 sm:px-3 py-2 text-xs sm:text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} whitespace-nowrap`}>
                      {formatCurrency(brand.stats?.totalSpent || 0)}
                    </td>
                    <td className={`hidden lg:table-cell px-1 sm:px-3 py-2 text-xs sm:text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'} whitespace-nowrap`}>
                      {brand.stats?.totalCreators || 0}
                    </td>
                    <td className="px-1 sm:px-3 py-2 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleViewDetails(brand)}
                          className={`hover:${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}
                          title="View Details"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleEdit(brand)}
                          className={`hover:${isDark ? 'text-gray-300' : 'text-gray-600'}`}
                          title="Edit"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className={`px-2 sm:px-4 py-8 sm:py-12 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    No brands found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Brand Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Brand Details"
        size="lg"
      >
        {selectedBrand && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              {selectedBrand.logo ? (
                <img src={selectedBrand.logo} alt={selectedBrand.brandName} className="w-16 h-16 rounded-full" />
              ) : (
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-indigo-600" />
                </div>
              )}
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{selectedBrand.brandName}</h3>
                <p className="text-gray-600">{selectedBrand.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColorClass(selectedBrand.status)}`}>
                    {selectedBrand.status}
                  </span>
                  {selectedBrand.isVerified && (
                    <span className={`flex items-center text-xs ${getStatusColor('verified', 'status', false).split(' ')[1]}`}>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Industry</p>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} truncate`}>{selectedBrand.industry || '—'}</p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Website</p>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} truncate`}>
                  {selectedBrand.website ? (
                    <a href={selectedBrand.website} target="_blank" rel="noopener noreferrer" className={isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}>
                      {selectedBrand.website}
                    </a>
                  ) : '—'}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Phone</p>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} truncate`}>{selectedBrand.phone || '—'}</p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Joined</p>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} truncate`}>{formatDate(selectedBrand.createdAt)}</p>
              </div>
            </div>

            {selectedBrand.address && (
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Address</p>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {selectedBrand.address.street && `${selectedBrand.address.street}, `}
                  {selectedBrand.address.city && `${selectedBrand.address.city}, `}
                  {selectedBrand.address.state && `${selectedBrand.address.state} `}
                  {selectedBrand.address.zipCode && `${selectedBrand.address.zipCode}, `}
                  {selectedBrand.address.country || ''}
                </p>
              </div>
            )}

            {/* Stats */}
            <div>
              <h4 className={`font-medium mb-3 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Activity</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                <div className={`text-center p-2 sm:p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <p className="text-lg sm:text-2xl font-bold text-indigo-600">{selectedBrand.stats?.totalCampaigns || 0}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Campaigns</p>
                </div>
                <div className={`text-center p-2 sm:p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <p className="text-lg sm:text-2xl font-bold text-green-600">{formatCurrency(selectedBrand.stats?.totalSpent || 0)}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Spent</p>
                </div>
                <div className={`text-center p-2 sm:p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <p className="text-lg sm:text-2xl font-bold text-purple-600">{selectedBrand.stats?.totalCreators || 0}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Creators</p>
                </div>
              </div>
            </div>

            {/* Team Members */}
            {selectedBrand.teamMembers?.length > 0 && (
              <div>
                <h4 className={`font-medium mb-3 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Team Members</h4>
                <div className="space-y-2">
                  {selectedBrand.teamMembers.slice(0, 5).map(member => (
                    <div key={member._id} className={`flex items-center justify-between p-2 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Users className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} truncate`}>
                            {member.userId?.fullName || 'Pending User'}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} truncate`}>{member.userId?.email || member.email}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full capitalize whitespace-nowrap flex-shrink-0 ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                        {member.role}
                      </span>
                    </div>
                  ))}
                  {selectedBrand.teamMembers.length > 5 && (
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} text-center`}>+{selectedBrand.teamMembers.length - 5} more</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Brand Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Brand"
      >
        {selectedBrand && (
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Status
              </label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark 
                    ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Admin Notes
              </label>
              <textarea
                rows="4"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark 
                    ? 'bg-gray-800/50 border-gray-700/50 text-gray-100 placeholder:text-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
                }`}
                placeholder="Add notes about this brand..."
              />
            </div>

            <div className={`p-4 rounded-lg ${isDark ? 'bg-yellow-900/30 border border-yellow-700/30' : 'bg-yellow-50'}`}>
              <p className={`text-sm ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>
                <strong>Warning:</strong> Changing status may affect the brand's ability to access the platform.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveEdit}>
            Save Changes
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Brands;