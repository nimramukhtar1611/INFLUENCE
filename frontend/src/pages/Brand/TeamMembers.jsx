// pages/Brand/TeamMembers.js - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Trash2,
  Edit2,
  Loader,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  MoreVertical,
  Search,
  Filter,
  ChevronDown,
  Shield,
  User,
  Crown,
  Star,
  Settings as SettingsIcon,
  AlertCircle
} from 'lucide-react';
import { useBrandData } from '../../hooks/useBrandData';
import Modal from '../../components/Common/Modal';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import brandService from '../../services/brandService';
import { formatDate, timeAgo } from '../../utils/helpers';
import toast from 'react-hot-toast';

// ==================== CONSTANTS ====================
const PERMISSIONS = [
  { id: 'view_campaigns', label: 'View Campaigns', category: 'Campaigns' },
  { id: 'create_campaigns', label: 'Create Campaigns', category: 'Campaigns' },
  { id: 'edit_campaigns', label: 'Edit Campaigns', category: 'Campaigns' },
  { id: 'delete_campaigns', label: 'Delete Campaigns', category: 'Campaigns' },
  { id: 'view_deals', label: 'View Deals', category: 'Deals' },
  { id: 'create_deals', label: 'Create Deals', category: 'Deals' },
  { id: 'edit_deals', label: 'Edit Deals', category: 'Deals' },
  { id: 'approve_deals', label: 'Approve Deals', category: 'Deals' },
  { id: 'view_payments', label: 'View Payments', category: 'Payments' },
  { id: 'process_payments', label: 'Process Payments', category: 'Payments' },
  { id: 'view_analytics', label: 'View Analytics', category: 'Analytics' },
  { id: 'manage_team', label: 'Manage Team', category: 'Team' },
  { id: 'view_creators', label: 'View Creators', category: 'Creators' },
  { id: 'contact_creators', label: 'Contact Creators', category: 'Creators' }
];

const ROLE_OPTIONS = [
  { value: 'viewer', label: 'Viewer — View only' },
  { value: 'member', label: 'Member — Create & view' },
  { value: 'manager', label: 'Manager — Full campaign control' },
  { value: 'admin', label: 'Admin — Full access' }
];

const ROLE_BADGE_COLORS = {
  admin: 'bg-purple-100 text-purple-800',
  manager: 'bg-blue-100 text-blue-800',
  member: 'bg-gray-100 text-gray-800',
  viewer: 'bg-gray-100 text-gray-500'
};

const STATUS_BADGE_COLORS = {
  active: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  inactive: 'bg-red-100 text-red-800',
  removed: 'bg-gray-100 text-gray-500'
};

const STATUS_ICONS = {
  active: CheckCircle,
  pending: Clock,
  inactive: XCircle,
  removed: XCircle
};

// ==================== HELPER FUNCTIONS ====================
const getRoleBadge = (role) => ROLE_BADGE_COLORS[role] || ROLE_BADGE_COLORS.member;
const getStatusBadge = (status) => STATUS_BADGE_COLORS[status] || STATUS_BADGE_COLORS.inactive;
const getStatusIcon = (status) => STATUS_ICONS[status] || XCircle;

// ==================== MAIN COMPONENT ====================
const TeamMembers = () => {
  const { teamMembers: teamFromHook, invitations: invitesFromHook, loading: hookLoading, refreshData } = useBrandData();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [activeTab, setActiveTab] = useState('members');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'member',
    permissions: []
  });

  const [editData, setEditData] = useState({ role: 'member', permissions: [] });

  // ==================== LOAD DATA FROM HOOK ====================
  useEffect(() => {
    if (teamFromHook) {
      setTeamMembers(Array.isArray(teamFromHook) ? teamFromHook : []);
    }
    if (invitesFromHook) {
      setInvitations(Array.isArray(invitesFromHook) ? invitesFromHook : []);
    }
    setLoading(hookLoading);
  }, [teamFromHook, invitesFromHook, hookLoading]);

  // ==================== FILTERED DATA ====================
  const filteredMembers = teamMembers.filter((member) => {
    if (statusFilter !== 'all' && member.status !== statusFilter) return false;
    if (searchQuery) {
      const name = member.userId?.fullName?.toLowerCase() || '';
      const email = member.userId?.email?.toLowerCase() || '';
      const query = searchQuery.toLowerCase();
      if (!name.includes(query) && !email.includes(query)) return false;
    }
    return true;
  });

  const filteredInvitations = invitations.filter((inv) => {
    if (searchQuery) {
      const email = inv.email?.toLowerCase() || '';
      const query = searchQuery.toLowerCase();
      if (!email.includes(query)) return false;
    }
    return true;
  });

  // ==================== FETCH DATA ====================
  const fetchData = async (showToast = false) => {
    if (showToast) {
      setRefreshing(true);
      await refreshData();
      setRefreshing(false);
      toast.success('Team data refreshed');
    }
  };

  // ==================== INVITE MEMBER ====================
  const handleInvite = async () => {
    if (!inviteData.email) {
      toast.error('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setSaving(true);
      const res = await brandService.sendInvitation(
        inviteData.email,
        inviteData.role,
        inviteData.permissions
      );

      if (res?.success) {
        toast.success('Invitation sent successfully');
        setShowInviteModal(false);
        setInviteData({ email: '', role: 'member', permissions: [] });
        refreshData();
      } else {
        toast.error(res?.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Invite error:', error);
      toast.error(error.response?.data?.error || 'Failed to send invitation');
    } finally {
      setSaving(false);
    }
  };

  // ==================== OPEN EDIT MODAL ====================
  const openEditModal = (member) => {
    setSelectedMember(member);
    setEditData({
      role: member.role || 'member',
      permissions: member.permissions || []
    });
    setShowEditModal(true);
  };

  // ==================== UPDATE MEMBER ====================
  const handleUpdateMember = async () => {
    if (!selectedMember) return;

    try {
      setSaving(true);

      // Update role and permissions
      await Promise.all([
        brandService.updateTeamMemberRole(selectedMember._id, editData.role),
        brandService.updateTeamMemberPermissions(selectedMember._id, editData.permissions)
      ]);

      toast.success('Member updated successfully');
      setShowEditModal(false);
      refreshData();
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error.response?.data?.error || 'Failed to update member');
    } finally {
      setSaving(false);
    }
  };

  // ==================== REMOVE MEMBER ====================
  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from the team?`)) {
      return;
    }

    try {
      const res = await brandService.removeTeamMember(memberId);
      if (res?.success) {
        toast.success('Member removed successfully');
        refreshData();
      } else {
        toast.error(res?.error || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Remove error:', error);
      toast.error(error.response?.data?.error || 'Failed to remove member');
    }
  };

  // ==================== CANCEL INVITATION ====================
  const handleCancelInvitation = async (invitationId) => {
    if (!window.confirm('Cancel this invitation?')) return;

    try {
      const res = await brandService.cancelInvitation(invitationId);
      if (res?.success) {
        toast.success('Invitation cancelled');
        refreshData();
      } else {
        toast.error(res?.error || 'Failed to cancel invitation');
      }
    } catch (error) {
      console.error('Cancel invitation error:', error);
      toast.error(error.response?.data?.error || 'Failed to cancel invitation');
    }
  };

  // ==================== RESEND INVITATION ====================
  const handleResendInvitation = async (invitationId) => {
    try {
      const res = await brandService.resendInvitation(invitationId);
      if (res?.success) {
        toast.success('Invitation resent');
        refreshData();
      } else {
        toast.error(res?.error || 'Failed to resend invitation');
      }
    } catch (error) {
      console.error('Resend invitation error:', error);
      toast.error(error.response?.data?.error || 'Failed to resend invitation');
    }
  };

  // ==================== TOGGLE PERMISSION ====================
  const togglePermission = (permId, currentPermissions, setPermissions) => {
    if (currentPermissions.includes(permId)) {
      setPermissions(currentPermissions.filter((p) => p !== permId));
    } else {
      setPermissions([...currentPermissions, permId]);
    }
  };

  // ==================== GROUP PERMISSIONS BY CATEGORY ====================
  const groupPermissionsByCategory = (permissionsList) => {
    const groups = {};
    permissionsList.forEach((perm) => {
      if (!groups[perm.category]) groups[perm.category] = [];
      groups[perm.category].push(perm);
    });
    return groups;
  };

  const permissionGroups = groupPermissionsByCategory(PERMISSIONS);

  // ==================== STATS ====================
  const activeMembers = teamMembers.filter((m) => m.status === 'active');
  const pendingMembers = teamMembers.filter((m) => m.status === 'pending');
  const totalMembers = teamMembers.length;

  if (loading && teamMembers.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-12 h-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
          <p className="text-gray-600">Manage your team and their permissions</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={() => fetchData(true)}
            loading={refreshing}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            icon={UserPlus}
            onClick={() => setShowInviteModal(true)}
          >
            Invite Member
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{totalMembers}</p>
          <p className="text-sm text-gray-600">Total Members</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <p className="text-2xl font-bold text-green-600">{activeMembers.length}</p>
          <p className="text-sm text-gray-600">Active</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <p className="text-2xl font-bold text-yellow-600">{pendingMembers.length}</p>
          <p className="text-sm text-gray-600">Pending</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <p className="text-2xl font-bold text-purple-600">{invitations.length}</p>
          <p className="text-sm text-gray-600">Invitations</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('members')}
            className={`py-3 px-1 border-b-2 text-sm font-medium ${
              activeTab === 'members'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Team Members
            {activeMembers.length > 0 && (
              <span className="ml-2 bg-indigo-100 text-indigo-600 text-xs px-2 py-0.5 rounded-full">
                {activeMembers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`py-3 px-1 border-b-2 text-sm font-medium ${
              activeTab === 'invitations'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Pending Invitations
            {invitations.length > 0 && (
              <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                {invitations.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Team Members Table */}
      {activeTab === 'members' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Last Active
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((member) => {
                    const StatusIcon = getStatusIcon(member.status);
                    return (
                      <tr key={member._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {member.userId?.profilePicture ? (
                              <img
                                src={member.userId.profilePicture}
                                alt={member.userId.fullName}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-indigo-600" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {member.userId?.fullName || 'Pending User'}
                              </p>
                              <p className="text-xs text-gray-500">{member.userId?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 text-xs rounded-full capitalize ${getRoleBadge(
                              member.role
                            )}`}
                          >
                            {member.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 text-xs rounded-full flex items-center w-fit gap-1 ${getStatusBadge(
                              member.status
                            )}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {member.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {member.lastActive
                            ? timeAgo(member.lastActive)
                            : member.joinedAt
                            ? formatDate(member.joinedAt)
                            : 'Never'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(member)}
                              className="text-gray-400 hover:text-indigo-600"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleRemoveMember(
                                  member._id,
                                  member.userId?.fullName || 'member'
                                )
                              }
                              className="text-gray-400 hover:text-red-600"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      No team members found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invitations List */}
      {activeTab === 'invitations' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {filteredInvitations.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredInvitations.map((inv) => (
                <div key={inv._id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{inv.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full capitalize ${getRoleBadge(
                            inv.role
                          )}`}
                        >
                          {inv.role}
                        </span>
                        {inv.expiresAt && (
                          <span className="text-xs text-gray-500">
                            Expires {formatDate(inv.expiresAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResendInvitation(inv._id)}
                    >
                      Resend
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleCancelInvitation(inv._id)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-lg font-medium text-gray-900 mb-2">No pending invitations</p>
              <p className="text-sm text-gray-500 mb-6">
                Invite team members to collaborate on campaigns
              </p>
              <Button variant="primary" size="sm" onClick={() => setShowInviteModal(true)}>
                Send Invitation
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Team Member"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="member@company.com"
            value={inviteData.email}
            onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
            icon={Mail}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={inviteData.role}
              onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-4">
              {Object.entries(permissionGroups).map(([category, perms]) => (
                <div key={category}>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">{category}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {perms.map((perm) => (
                      <label key={perm.id} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={inviteData.permissions.includes(perm.id)}
                          onChange={() =>
                            togglePermission(
                              perm.id,
                              inviteData.permissions,
                              (perms) => setInviteData({ ...inviteData, permissions: perms })
                            )
                          }
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        {perm.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              An invitation email will be sent with a link to join your team.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowInviteModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleInvite} loading={saving}>
            Send Invitation
          </Button>
        </div>
      </Modal>

      {/* Edit Member Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Team Member"
        size="lg"
      >
        {selectedMember && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {selectedMember.userId?.profilePicture ? (
                <img
                  src={selectedMember.userId.profilePicture}
                  alt={selectedMember.userId.fullName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900">{selectedMember.userId?.fullName}</p>
                <p className="text-sm text-gray-500">{selectedMember.userId?.email}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <select
                value={editData.role}
                onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-4">
                {Object.entries(permissionGroups).map(([category, perms]) => (
                  <div key={category}>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">{category}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {perms.map((perm) => (
                        <label
                          key={perm.id}
                          className="flex items-center gap-2 text-sm text-gray-700"
                        >
                          <input
                            type="checkbox"
                            checked={editData.permissions.includes(perm.id)}
                            onChange={() =>
                              togglePermission(
                                perm.id,
                                editData.permissions,
                                (perms) => setEditData({ ...editData, permissions: perms })
                              )
                            }
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          {perm.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUpdateMember} loading={saving}>
            Save Changes
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default TeamMembers;