import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Mail,
  Calendar,
  Shield,
  Ban,
  Download,
  RefreshCw,
  ChevronDown,
  Star,
  DollarSign,
  TrendingUp,
  Users as UsersIcon,
  Building2,
  Award,
  AlertCircle,
  ThumbsUp,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { useAdminData } from '../../hooks/useAdminData';
import { formatCurrency, formatDate, formatNumber, timeAgo } from '../../utils/helpers';
import { getStatusColor, getStatusIconColor } from '../../utils/colorScheme';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import StatsCard from '../../components/Common/StatsCard';
import Loader from '../../components/Common/Loader';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';

const AdminUsers = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const {
    loading,
    refreshing,
    users,
    stats,
    pagination,
    refreshData,
    fetchUsers,
    verifyUser,
    suspendUser,
    activateUser,
    deleteUser
  } = useAdminData();

  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendDuration, setSuspendDuration] = useState('7');
  const [filters, setFilters] = useState({
    search: '',
    user_type: '',
    status: '',
    verified: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchUsers(currentPage, filters);
  }, [currentPage, filters]);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setCurrentPage(1);
    fetchUsers(1, newFilters);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers(1, filters);
  };

  const handleVerify = async (userId) => {
    const success = await verifyUser(userId);
    if (success) {
      setShowUserModal(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspendReason) {
      toast.error('Please provide a reason');
      return;
    }

    const success = await suspendUser(selectedUser._id, suspendReason, suspendDuration);
    if (success) {
      setShowSuspendModal(false);
      setSuspendReason('');
      setSelectedUser(null);
    }
  };

  const handleActivate = async (userId) => {
    await activateUser(userId);
  };

  const handleDelete = async () => {
    const success = await deleteUser(selectedUser._id);
    if (success) {
      setShowDeleteModal(false);
      setSelectedUser(null);
    }
  };

  const handleExport = () => {
    // Generate CSV for users data
    const csvContent = [
      ['Name', 'Email', 'Type', 'Status', 'Verified', 'Joined', 'Last Active'].join(','),
      ...users.map(user => [
        `"${user.fullName || user.name}"`,
        `"${user.email}"`,
        user.userType,
        user.status,
        user.isVerified ? 'Verified' : 'Pending',
        user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : '',
        user.lastLogin ? new Date(user.lastLogin).toISOString().split('T')[0] : 'Never'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Users data exported successfully');
  };

  const getStatusColorClass = (status) => {
    return getStatusColor(status, 'status', isDark);
  };

  const getStatusIcon = (status) => {
    switch(status?.toLowerCase()) {
      case 'active': return CheckCircle;
      case 'suspended': return Ban;
      case 'inactive': return Clock;
      default: return AlertCircle;
    }
  };

  const getUserTypeIcon = (type) => {
    switch(type) {
      case 'brand': return Building2;
      case 'creator': return Award;
      default: return User;
    }
  };

  if (loading && users.length === 0) {
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
          <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>User Management</h1>
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Manage all users on the platform</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={refreshData}
            loading={refreshing}
          >
            Refresh
          </Button>
          <Button variant="outline" size="sm" icon={Download} onClick={handleExport}>
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="Total Users"
          value={stats.totalUsers?.toLocaleString() || '0'}
          change={`+${stats.totalUsers ? Math.floor(stats.totalUsers * 0.12) : 0}`}
          icon={UsersIcon}
          color="bg-blue-500"
        />
        <StatsCard
          title="Brands"
          value={stats.totalBrands?.toLocaleString() || '0'}
          change={`+${stats.totalBrands ? Math.floor(stats.totalBrands * 0.08) : 0}`}
          icon={Building2}
          color="bg-purple-500"
        />
        <StatsCard
          title="Creators"
          value={stats.totalCreators?.toLocaleString() || '0'}
          change={`+${stats.totalCreators ? Math.floor(stats.totalCreators * 0.15) : 0}`}
          icon={Award}
          color="bg-green-500"
        />
        <StatsCard
          title="Pending Verification"
          value={stats.pendingVerifications?.toLocaleString() || '0'}
          change="-5%"
          icon={Clock}
          color="bg-yellow-500"
        />
      </div>

      {/* Filters */}
      <div className={`p-4 rounded-xl shadow-sm ${isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'}`}>
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search users by name or email..."
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#667eea] ${
                isDark 
                  ? 'bg-gray-800/50 border-gray-700/50 text-gray-100 placeholder:text-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
              }`}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select
              value={filters.user_type}
              onChange={(e) => handleFilterChange('user_type', e.target.value)}
              className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#667eea] ${
                isDark 
                  ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">All Types</option>
              <option value="brand">Brands</option>
              <option value="creator">Creators</option>
            </select>
            
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#667eea] ${
                isDark 
                  ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
            
            <select
              value={filters.verified}
              onChange={(e) => handleFilterChange('verified', e.target.value)}
              className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#667eea] ${
                isDark 
                  ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">All Verification</option>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </select>
          </div>
        </form>
      </div>

      {/* Users Table */}
      <div className={`rounded-xl shadow-sm overflow-hidden ${isDark ? 'bg-gray-900/90 border border-gray-700/50' : 'bg-white border-gray-200/50'}`}>
        <div className="overflow-x-auto">
          <table className={`min-w-full divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            <thead className={isDark ? 'bg-gray-800' : 'bg-gray-50'}>
              <tr>
                <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap`}>
                  User
                </th>
                <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap`}>
                  Type
                </th>
                <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap`}>
                  Status
                </th>
                <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap`}>
                  Verification
                </th>
                <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap`}>
                  Joined
                </th>
                <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap`}>
                  Last Active
                </th>
                <th className={`px-4 py-3 text-right text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`${isDark ? 'bg-gray-900' : 'bg-white'} divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {users.length > 0 ? users.map((user) => {
                const TypeIcon = getUserTypeIcon(user.userType);
                return (
                  <tr key={user._id} className={isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {user.profilePicture ? (
                          <img src={user.profilePicture} alt={user.fullName} className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-gradient-to-r from-[#667eea]/20 to-[#764ba2]/20' : 'bg-gradient-to-r from-[#667eea]/10 to-[#764ba2]/10'}`}>
                            <User className="w-5 h-5 text-[#667eea]" />
                          </div>
                        )}
                        <div className="ml-3">
                          <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'} truncate max-w-[150px]`}>{user.fullName}</div>
                          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} truncate max-w-[150px]`}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full flex items-center w-fit gap-1 ${
                        user.userType === 'brand' 
                          ? getStatusColor('brand', 'userType', isDark)
                          : getStatusColor('creator', 'userType', isDark)
                      }`}>
                        <TypeIcon className="w-3 h-3" />
                        {user.userType}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${getStatusColorClass(user.status)}`}>
                        {React.createElement(getStatusIcon(user.status), { className: `w-3 h-3 ${getStatusIconColor(user.status)}` })}
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {user.isVerified ? (
                        <span className={`flex items-center ${getStatusColor('verified', 'status', isDark).split(' ')[1]}`}>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Verified
                        </span>
                      ) : (
                        <span className={`flex items-center ${getStatusColor('unverified', 'status', isDark).split(' ')[1]}`}>
                          <Clock className="w-4 h-4 mr-1" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatDate(user.createdAt)}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {user.lastLogin ? timeAgo(user.lastLogin) : 'Never'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserModal(true);
                          }}
                          className={`hover:${isDark ? 'text-[#667eea]' : 'text-[#667eea]'}`}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {!user.isVerified && (
                          <button
                            onClick={() => handleVerify(user._id)}
                            className={`hover:${isDark ? 'text-green-400' : 'text-green-900'}`}
                            title="Verify User"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        
                        {user.status === 'active' ? (
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowSuspendModal(true);
                            }}
                            className={`hover:${isDark ? 'text-yellow-400' : 'text-yellow-900'}`}
                            title="Suspend User"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        ) : user.status === 'suspended' ? (
                          <button
                            onClick={() => handleActivate(user._id)}
                            className={`hover:${isDark ? 'text-green-400' : 'text-green-900'}`}
                            title="Activate User"
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </button>
                        ) : null}
                        
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteModal(true);
                          }}
                          className={`hover:${isDark ? 'text-red-400' : 'text-red-900'}`}
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="7" className={`px-4 py-12 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.users.pages > 1 && (
          <div className={`px-4 py-4 border-t flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Showing {((pagination.users.page - 1) * pagination.users.limit) + 1} to{' '}
              {Math.min(pagination.users.page * pagination.users.limit, pagination.users.total)} of{' '}
              {pagination.users.total} results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 border rounded-lg hover:disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark
                    ? 'border-gray-600 hover:bg-gray-700/50'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                Previous
              </button>
              <span className={`px-4 py-1 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Page {currentPage} of {pagination.users.pages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(pagination.users.pages, prev + 1))}
                disabled={currentPage === pagination.users.pages}
                className={`px-3 py-1 border rounded-lg hover:disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark
                    ? 'border-gray-600 hover:bg-gray-700/50'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setSelectedUser(null);
        }}
        title="User Details"
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {selectedUser.profilePicture ? (
                <img src={selectedUser.profilePicture} alt={selectedUser.fullName} className="w-16 h-16 rounded-full" />
              ) : (
                <div className="w-16 h-16 bg-gradient-to-r from-[#667eea]/10 to-[#764ba2]/10 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-[#667eea]" />
                </div>
              )}
              <div>
                <h3 className={`text-xl font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{selectedUser.fullName}</h3>
                <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>{selectedUser.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    selectedUser.userType === 'brand' ? getStatusColor('brand', 'userType', isDark) : getStatusColor('creator', 'userType', isDark)
                  }`}>
                    {selectedUser.userType}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColorClass(selectedUser.status)}`}>
                    {selectedUser.status}
                  </span>
                  {selectedUser.isVerified ? (
                    <span className={`flex items-center text-xs ${getStatusColor('verified', 'status', isDark).split(' ')[1]}`}>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </span>
                  ) : (
                    <span className={`flex items-center text-xs ${getStatusColor('unverified', 'status', isDark).split(' ')[1]}`}>
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Phone</p>
                <p className={`text-sm font-medium flex items-center ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                  {selectedUser.phone || 'Not provided'}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Joined</p>
                <p className={`text-sm font-medium flex items-center ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                  <Calendar className={`w-3 h-3 mr-2 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                  {formatDate(selectedUser.createdAt)}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Last Active</p>
                <p className={`text-sm font-medium flex items-center ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                  <Clock className={`w-3 h-3 mr-2 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                  {selectedUser.lastLogin ? timeAgo(selectedUser.lastLogin) : 'Never'}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Login Count</p>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{selectedUser.loginCount || 0}</p>
              </div>
            </div>

            {/* Stats */}
            <div>
              <h4 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Activity</h4>
              <div className="grid grid-cols-3 gap-3">
                {selectedUser.userType === 'brand' ? (
                  <>
                    <div className={`text-center p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <p className="text-xl font-bold text-[#667eea]">{selectedUser.stats?.campaigns || 0}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Campaigns</p>
                    </div>
                    <div className={`text-center p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(selectedUser.stats?.spent || 0)}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Spent</p>
                    </div>
                    <div className={`text-center p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <p className="text-xl font-bold text-purple-600">{selectedUser.stats?.creators || 0}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Creators</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`text-center p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <p className="text-xl font-bold text-[#667eea]">{formatNumber(selectedUser.stats?.followers || 0)}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Followers</p>
                    </div>
                    <div className={`text-center p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <p className="text-xl font-bold text-green-600">{selectedUser.stats?.engagement || 0}%</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Engagement</p>
                    </div>
                    <div className={`text-center p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <p className="text-xl font-bold text-purple-600">{formatCurrency(selectedUser.stats?.earnings || 0)}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Earnings</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className={`border-t pt-3 flex gap-2 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                type="button"
                className={`flex-1 py-2 rounded-lg text-sm font-medium hover:from-[#5a67d8] hover:to-[#6b4c9a] ${
                  isDark ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white' : 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white'
                }`}
                onClick={() => setShowUserModal(false)}
              >
                Close
              </button>
              {!selectedUser.isVerified && (
                <button
                  onClick={() => handleVerify(selectedUser._id)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium hover:bg-green-700 ${
                    isDark ? 'bg-green-600 text-white' : 'bg-green-600 text-white'
                  }`}
                >
                  Verify User
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Suspend User Modal */}
      <Modal
        isOpen={showSuspendModal}
        onClose={() => {
          setShowSuspendModal(false);
          setSelectedUser(null);
          setSuspendReason('');
        }}
        title="Suspend User"
      >
        <div className="space-y-4">
          <div className={`p-4 rounded-lg ${isDark ? 'bg-yellow-900/30 border border-yellow-700/30' : 'bg-yellow-50'}`}>
            <p className={`text-sm ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>
              <strong>Warning:</strong> Suspending this user will prevent them from accessing their account and all active deals will be paused.
            </p>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Reason for Suspension *
            </label>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows="3"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#667eea] ${
                isDark
                  ? 'bg-gray-800/50 border-gray-700/50 text-gray-100 placeholder:text-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
              }`}
              placeholder="Enter reason for suspension..."
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Suspension Duration
            </label>
            <select
              value={suspendDuration}
              onChange={(e) => setSuspendDuration(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#667eea] ${
                isDark
                  ? 'bg-gray-800/50 border-gray-700/50 text-gray-100'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="1">1 day</option>
              <option value="3">3 days</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="permanent">Permanent</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowSuspendModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleSuspend}>
            Suspend User
          </Button>
        </div>
      </Modal>

      {/* Delete User Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedUser(null);
        }}
        title="Delete User"
      >
        <div className="space-y-4">
          <div className={`flex items-center gap-3 text-red-600 p-4 rounded-lg ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">
              This action is permanent and cannot be undone. All user data including campaigns, deals, and messages will be permanently deleted.
            </p>
          </div>

          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Are you sure you want to delete <strong>{selectedUser?.fullName}</strong>?
          </p>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete Permanently
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminUsers;