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
  Loader,
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
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import StatsCard from '../../components/Common/StatsCard';
import toast from 'react-hot-toast';

const AdminUsers = () => {
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
    userType: '',
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
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
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

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage all users on the platform</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={refreshData}
            loading={refreshing}
          >
            Refresh
          </Button>
          <Button variant="outline" size="sm" icon={Download}>
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
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select
              value={filters.userType}
              onChange={(e) => handleFilterChange('userType', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Types</option>
              <option value="brand">Brands</option>
              <option value="creator">Creators</option>
            </select>
            
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Verification</option>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </select>
          </div>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Verification
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length > 0 ? users.map((user) => {
                const TypeIcon = getUserTypeIcon(user.userType);
                return (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {user.profilePicture ? (
                          <img src={user.profilePicture} alt={user.fullName} className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-indigo-600" />
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full flex items-center w-fit gap-1 ${
                        user.userType === 'brand' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        <TypeIcon className="w-3 h-3" />
                        {user.userType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.isVerified ? (
                        <span className="flex items-center text-green-600">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Verified
                        </span>
                      ) : (
                        <span className="flex items-center text-yellow-600">
                          <Clock className="w-4 h-4 mr-1" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastLogin ? timeAgo(user.lastLogin) : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserModal(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {!user.isVerified && (
                          <button
                            onClick={() => handleVerify(user._id)}
                            className="text-green-600 hover:text-green-900"
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
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Suspend User"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        ) : user.status === 'suspended' ? (
                          <button
                            onClick={() => handleActivate(user._id)}
                            className="text-green-600 hover:text-green-900"
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
                          className="text-red-600 hover:text-red-900"
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
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.users.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((pagination.users.page - 1) * pagination.users.limit) + 1} to{' '}
              {Math.min(pagination.users.page * pagination.users.limit, pagination.users.total)} of{' '}
              {pagination.users.total} results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-1 text-sm text-gray-700">
                Page {currentPage} of {pagination.users.pages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(pagination.users.pages, prev + 1))}
                disabled={currentPage === pagination.users.pages}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              {selectedUser.profilePicture ? (
                <img src={selectedUser.profilePicture} alt={selectedUser.fullName} className="w-16 h-16 rounded-full" />
              ) : (
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-indigo-600" />
                </div>
              )}
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{selectedUser.fullName}</h3>
                <p className="text-gray-600">{selectedUser.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    selectedUser.userType === 'brand' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {selectedUser.userType}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedUser.status)}`}>
                    {selectedUser.status}
                  </span>
                  {selectedUser.isVerified ? (
                    <span className="flex items-center text-xs text-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </span>
                  ) : (
                    <span className="flex items-center text-xs text-yellow-600">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Phone</p>
                <p className="font-medium flex items-center">
                  {selectedUser.phone || 'Not provided'}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Joined</p>
                <p className="font-medium flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  {formatDate(selectedUser.createdAt)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Last Active</p>
                <p className="font-medium flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-gray-400" />
                  {selectedUser.lastLogin ? timeAgo(selectedUser.lastLogin) : 'Never'}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Login Count</p>
                <p className="font-medium">{selectedUser.loginCount || 0}</p>
              </div>
            </div>

            {/* Stats */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Activity</h4>
              <div className="grid grid-cols-3 gap-4">
                {selectedUser.userType === 'brand' ? (
                  <>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-indigo-600">{selectedUser.stats?.campaigns || 0}</p>
                      <p className="text-xs text-gray-600">Campaigns</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedUser.stats?.spent || 0)}</p>
                      <p className="text-xs text-gray-600">Spent</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">{selectedUser.stats?.creators || 0}</p>
                      <p className="text-xs text-gray-600">Creators</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-indigo-600">{formatNumber(selectedUser.stats?.followers || 0)}</p>
                      <p className="text-xs text-gray-600">Followers</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{selectedUser.stats?.engagement || 0}%</p>
                      <p className="text-xs text-gray-600">Engagement</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">{formatCurrency(selectedUser.stats?.earnings || 0)}</p>
                      <p className="text-xs text-gray-600">Earnings</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-gray-200 pt-4 flex gap-2">
              <button
                type="button"
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
                onClick={() => setShowUserModal(false)}
              >
                Close
              </button>
              {!selectedUser.isVerified && (
                <button
                  onClick={() => handleVerify(selectedUser._id)}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700"
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
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> Suspending this user will prevent them from accessing their account and all active deals will be paused.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Suspension *
            </label>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter reason for suspension..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Suspension Duration
            </label>
            <select
              value={suspendDuration}
              onChange={(e) => setSuspendDuration(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-lg">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">
              This action is permanent and cannot be undone. All user data including campaigns, deals, and messages will be permanently deleted.
            </p>
          </div>

          <p className="text-sm text-gray-600">
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