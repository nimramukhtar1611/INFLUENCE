import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Archive,
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  MessageSquare,
  FileText,
  Eye,
  Send,
  Plus,
  Star,
  ThumbsUp,
  XCircle,
  BarChart3,
  Target,
  Image,
  Video,
  Trash2,
  ChevronRight,
  Pause,
  Play,
  RefreshCw,
  Loader,
  Award,
  Activity,
  Instagram,
  Youtube,
  Twitter,
  Facebook,
  Globe,
  X
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import campaignService from '../../services/campaignService';
import dealService from '../../services/dealService';
import api from '../../services/api';
import { formatCurrency, formatNumber, timeAgo, formatDate } from '../../utils/helpers';
import Button from '../../components/UI/Button';
import StatsCard from '../../components/Common/StatsCard';
import ChartCard from '../../components/Common/ChartCard';
import Input from '../../components/UI/Input';
import toast from 'react-hot-toast';

// Simple Modal Component (inline for simplicity, but you can import from Common if needed)
const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div
          className={`inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:w-full ${sizeClasses[size]}`}
        >
          <div className="px-4 pt-5 pb-4 bg-white sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

const CampaignDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaign, setCampaign] = useState(null);
  const [deals, setDeals] = useState([]);
  const [applications, setApplications] = useState([]);
  const [invitedCreators, setInvitedCreators] = useState([]);
  const [selectedCreators, setSelectedCreators] = useState([]);
  const [messages, setMessages] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [newMessage, setNewMessage] = useState('');

  // Modals
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddCreatorModal, setShowAddCreatorModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [applicationFeedback, setApplicationFeedback] = useState('');

  // Fetch campaign details
  useEffect(() => {
    if (id) {
      fetchCampaignDetails();
    }
  }, [id]);

  const fetchCampaignDetails = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);

      const response = await campaignService.getCampaign(id);

      if (response?.success) {
        const campaignData = response.campaign;
        setCampaign(campaignData);
        setDeals(response.deals || []);
        setApplications(campaignData.applications || []);
        setInvitedCreators(campaignData.invitedCreators || []);
        setSelectedCreators(campaignData.selectedCreators || []);

        fetchCampaignAnalytics();

        if (showToast) toast.success('Campaign refreshed');
      } else {
        toast.error(response?.error || 'Failed to load campaign');
        navigate('/brand/campaigns');
      }
    } catch (error) {
      console.error('Fetch campaign error:', error);
      toast.error('Failed to load campaign details');
      navigate('/brand/campaigns');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCampaignAnalytics = async () => {
    try {
      const response = await campaignService.getCampaignAnalytics(id);
      if (response?.success) {
        setAnalytics(response.metrics || {});
      }
    } catch (error) {
      console.error('Analytics error:', error);
    }
  };

  // Handle archive
  const handleArchive = async () => {
    try {
      setShowArchiveModal(false);
      const response = await campaignService.archiveCampaign(id);
      if (response?.success) {
        toast.success('Campaign archived');
        navigate('/brand/campaigns');
      } else {
        toast.error(response?.error || 'Failed to archive campaign');
      }
    } catch (error) {
      console.error('Archive error:', error);
      toast.error('Failed to archive campaign');
    }
  };

  // Handle unarchive
  const handleUnarchive = async () => {
    try {
      const response = await campaignService.updateCampaign(id, { status: 'draft' });
      if (response?.success) {
        toast.success('Campaign unarchived');
        fetchCampaignDetails();
      } else {
        toast.error(response?.error || 'Failed to unarchive campaign');
      }
    } catch (error) {
      console.error('Unarchive error:', error);
      toast.error('Failed to unarchive campaign');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      setShowDeleteModal(false);
      const response = await campaignService.deleteCampaign(id);
      if (response?.success) {
        toast.success('Campaign deleted successfully');
        navigate('/brand/campaigns');
      } else {
        toast.error(response?.error || 'Failed to delete campaign');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete campaign');
    }
  };

  // Handle edit
  const handleEdit = () => {
    navigate(`/brand/campaigns/${id}/edit`);
  };

  // Handle application review
  const handleReviewApplication = async (applicationId, status) => {
    try {
      const response = await campaignService.reviewApplication(id, applicationId, status, applicationFeedback);
      if (response?.success) {
        toast.success(`Application ${status}`);
        setShowApplicationModal(false);
        setSelectedApplication(null);
        setApplicationFeedback('');
        fetchCampaignDetails();
      } else {
        toast.error(response?.error || `Failed to ${status} application`);
      }
    } catch (error) {
      console.error('Review error:', error);
      toast.error('Failed to review application');
    }
  };

  // Status helpers
  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      draft: 'bg-gray-100 text-gray-800',
      paused: 'bg-orange-100 text-orange-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      accepted: 'bg-green-100 text-green-800',
      declined: 'bg-red-100 text-red-800',
      archived: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    const icons = {
      active: <CheckCircle className="w-4 h-4" />,
      pending: <Clock className="w-4 h-4" />,
      completed: <CheckCircle className="w-4 h-4" />,
      draft: <FileText className="w-4 h-4" />,
      paused: <Pause className="w-4 h-4" />,
      accepted: <CheckCircle className="w-4 h-4" />,
      declined: <XCircle className="w-4 h-4" />,
    };
    return icons[status] || <AlertCircle className="w-4 h-4" />;
  };

  const getPlatformIcon = (platform) => {
    const icons = {
      instagram: Instagram,
      youtube: Youtube,
      tiktok: Twitter,
      twitter: Twitter,
      facebook: Facebook,
    };
    const Icon = icons[platform] || Globe;
    return <Icon className="w-4 h-4" />;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-16 h-16 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading campaign details...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Campaign Not Found</h2>
        <Link to="/brand/campaigns" className="text-indigo-600 hover:text-indigo-700">
          Back to Campaigns
        </Link>
      </div>
    );
  }

  // Computed values
  const totalBudget = campaign.budget || 0;
  const spentBudget = campaign.spent || 0;
  const remaining = totalBudget - spentBudget;
  const totalDeliverables = campaign.deliverables?.reduce((sum, d) => sum + (d.quantity || 1), 0) || 0;
  const completedDeliverables = deals.reduce(
    (sum, d) => sum + (d.deliverables?.filter(del => del.status === 'approved').length || 0),
    0
  );
  const progress = totalDeliverables > 0 ? Math.round((completedDeliverables / totalDeliverables) * 100) : 0;
  const pendingApps = applications.filter(a => a.status === 'pending').length;

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/brand/campaigns" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{campaign.title}</h1>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getStatusColor(
                  campaign.status
                )}`}
              >
                {getStatusIcon(campaign.status)}
                {campaign.status}
              </span>
            </div>
            <p className="text-gray-600 text-sm mt-1">
              ID: {campaign._id?.slice(-8)} • Created {new Date(campaign.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" icon={Edit} onClick={handleEdit}>
            Edit
          </Button>

          {campaign?.status === 'archived' ? (
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={handleUnarchive}>
              Unarchive
            </Button>
          ) : (
            <Button variant="outline" size="sm" icon={Archive} onClick={() => setShowArchiveModal(true)}>
              Archive
            </Button>
          )}

          <Button variant="danger" size="sm" icon={Trash2} onClick={() => setShowDeleteModal(true)}>
            Delete
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatsCard
          title="Budget"
          value={formatCurrency(totalBudget)}
          subtitle={`Spent: ${formatCurrency(spentBudget)} • Left: ${formatCurrency(remaining)}`}
          icon={DollarSign}
          color="bg-blue-500"
        />
        <StatsCard
          title="Creators"
          value={selectedCreators.length.toString()}
          subtitle={`${selectedCreators.filter(c => c.status === 'active').length} active`}
          icon={Users}
          color="bg-green-500"
        />
        <StatsCard
          title="Progress"
          value={`${progress}%`}
          subtitle={`${completedDeliverables}/${totalDeliverables} deliverables`}
          icon={TrendingUp}
          color="bg-purple-500"
        />
        <StatsCard
          title="Applications"
          value={applications.length.toString()}
          subtitle={`${pendingApps} pending`}
          icon={Award}
          color="bg-orange-500"
        />
      </div>

      {/* Progress bar */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-900">Campaign Progress</h3>
          <span className="text-sm text-gray-600">{progress}% complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex flex-wrap justify-between mt-3 text-sm text-gray-600 gap-2">
          <span>💰 Budget: {formatCurrency(totalBudget)}</span>
          <span>💸 Spent: {formatCurrency(spentBudget)}</span>
          <span>📊 Left: {formatCurrency(remaining)}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex space-x-8 min-w-max">
          {[
            { id: 'overview', label: 'Overview', icon: Eye },
            { id: 'creators', label: 'Creators', icon: Users, badge: selectedCreators.length },
            { id: 'applications', label: 'Applications', icon: FileText, badge: pendingApps },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          ].map(({ id: tabId, label, icon: Icon, badge }) => (
            <button
              key={tabId}
              onClick={() => setActiveTab(tabId)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
                activeTab === tabId
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {badge > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ==================== OVERVIEW TAB ==================== */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Description</h2>
              <p className="text-gray-600 mb-4">{campaign.description || 'No description provided'}</p>

              {campaign.objectives?.length > 0 && (
                <>
                  <h3 className="font-medium text-gray-900 mb-3">Objectives</h3>
                  <ul className="space-y-2">
                    {campaign.objectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{obj}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {/* Deliverables */}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Deliverables</h2>
              <div className="space-y-3">
                {campaign.deliverables?.length > 0 ? (
                  campaign.deliverables.map((del, i) => (
                    <div
                      key={i}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg gap-3"
                    >
                      <div className="flex items-center gap-3">
                        {getPlatformIcon(del.platform)}
                        <div>
                          <p className="font-medium text-gray-900">
                            {del.quantity || 1}x {del.type}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">{del.platform}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {del.budget > 0 && (
                          <span className="font-medium text-gray-900">{formatCurrency(del.budget)}</span>
                        )}
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getStatusColor(del.status || 'pending')}`}
                        >
                          {del.status || 'pending'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No deliverables defined</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Quick actions */}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => setShowAddCreatorModal(true)}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                      <Users className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Find More Creators</p>
                      <p className="text-xs text-gray-500">Search and invite</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>

                <button
                  onClick={handleEdit}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                      <Edit className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Edit Campaign</p>
                      <p className="text-xs text-gray-500">Update details</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Status card */}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Status</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getStatusColor(
                      campaign.status
                    )}`}
                  >
                    {getStatusIcon(campaign.status)}
                    {campaign.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Start Date</span>
                  <span className="font-medium">
                    {campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">End Date</span>
                  <span className="font-medium">
                    {campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Category</span>
                  <span className="font-medium">{campaign.category || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CREATORS TAB ==================== */}
      {activeTab === 'creators' && (
        <div className="space-y-6">
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Campaign Creators</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedCreators.filter(c => c.status === 'active').length} active •{' '}
                  {selectedCreators.filter(c => c.status === 'completed').length} completed
                </p>
              </div>
              <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAddCreatorModal(true)}>
                Invite Creators
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {selectedCreators.length > 0 ? (
              selectedCreators.map(creator => (
                <div key={creator._id} className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {creator.creatorId?.profilePicture ? (
                        <img
                          src={creator.creatorId.profilePicture}
                          alt={creator.creatorId.displayName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                          <Users className="w-6 h-6 text-indigo-600" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900">{creator.creatorId?.displayName || 'Creator'}</h3>
                        <p className="text-sm text-gray-500">@{creator.creatorId?.handle}</p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getStatusColor(creator.status || 'pending')}`}
                    >
                      {creator.status || 'pending'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center mb-4">
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-xs text-gray-500">Followers</p>
                      <p className="text-sm font-bold">{formatNumber(creator.creatorId?.totalFollowers || 0)}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-xs text-gray-500">Engagement</p>
                      <p className="text-sm font-bold text-green-600">
                        {creator.creatorId?.averageEngagement?.toFixed(1) || '0'}%
                      </p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-xs text-gray-500">Budget</p>
                      <p className="text-sm font-bold">{formatCurrency(creator.deal?.budget || 0)}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      to={`/brand/deals/${creator.deal?._id}`}
                      className="flex-1 text-center text-xs py-1.5 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100"
                    >
                      View Deal
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No creators yet</h3>
                <p className="text-gray-500 mb-4">Invite creators to join this campaign</p>
                <Button variant="primary" onClick={() => setShowAddCreatorModal(true)}>
                  Invite Creators
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== APPLICATIONS TAB ==================== */}
      {activeTab === 'applications' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Creator Applications</h2>
            <p className="text-sm text-gray-500 mt-1">{applications.length} total — {pendingApps} pending</p>
          </div>

          <div className="divide-y divide-gray-200">
            {applications.length > 0 ? (
              applications.map(app => {
                const creator = app.creatorId;
                return (
                  <div key={app._id} className="p-4 sm:p-6 hover:bg-gray-50">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        {creator?.profilePicture ? (
                          <img
                            src={creator.profilePicture}
                            alt={creator.displayName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-indigo-600" />
                          </div>
                        )}

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-gray-900">{creator?.displayName || 'Creator'}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(app.status)}`}>
                              {app.status}
                            </span>
                          </div>

                          <p className="text-sm text-gray-500 mb-2">
                            @{creator?.handle} • {formatNumber(creator?.totalFollowers || 0)} followers
                          </p>

                          <div className="bg-gray-50 p-3 rounded-lg mb-3">
                            <p className="text-sm text-gray-700 line-clamp-3">{app.proposal}</p>
                          </div>

                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-medium text-indigo-600">
                              Rate: {formatCurrency(app.rate || 0)}
                            </span>
                            {app.appliedAt && (
                              <span className="text-xs text-gray-500">Applied {timeAgo(app.appliedAt)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {app.status === 'pending' && (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            variant="success"
                            size="sm"
                            icon={CheckCircle}
                            onClick={() => {
                              setSelectedApplication(app);
                              setShowApplicationModal(true);
                            }}
                          >
                            Review
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            icon={XCircle}
                            onClick={() => handleReviewApplication(app._id, 'rejected')}
                          >
                            Decline
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No applications yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== ANALYTICS TAB ==================== */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Total Impressions</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {formatNumber(analytics?.totalImpressions || 0)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Total Reach</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatNumber(analytics?.totalReach || 0)}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Engagement Rate</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">
                {analytics?.avgEngagement?.toFixed(1) || '0'}%
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Conversions</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{analytics?.totalConversions || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Chart */}
            <ChartCard title="Campaign Performance">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics?.dailyPerformance || []}>
                  <defs>
                    <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="impressions"
                    stroke="#4F46E5"
                    fill="url(#colorImpressions)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* ROI & Cost Metrics */}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">ROI & Cost Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">ROI</span>
                  <span className="text-xl font-bold text-green-600">{analytics?.roi?.toFixed(1) || '0'}x</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Cost Per Engagement</span>
                  <span className="font-bold text-gray-900">{formatCurrency(analytics?.cpe || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">CPM</span>
                  <span className="font-bold text-gray-900">{formatCurrency(analytics?.cpm || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Conversion Rate</span>
                  <span className="font-bold text-green-600">{analytics?.conversionRate?.toFixed(1) || '0'}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODALS ==================== */}

      {/* Archive Modal */}
      <Modal isOpen={showArchiveModal} onClose={() => setShowArchiveModal(false)} title="Archive Campaign">
        <div className="space-y-4">
          <div className="bg-yellow-50 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Archive this campaign?</p>
              <p className="text-sm text-yellow-700 mt-1">
                Archived campaigns are hidden from active lists but can be unarchived later. All data including deals
                and applications will be preserved.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Campaign:</strong> {campaign?.title}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowArchiveModal(false)}>
            Cancel
          </Button>
          <Button variant="warning" onClick={handleArchive}>
            Archive Campaign
          </Button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Campaign">
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Delete this campaign permanently?</p>
              <p className="text-sm text-red-700 mt-1">
                This action cannot be undone. All associated deals and applications will also be deleted.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Campaign:</strong> {campaign?.title}
            </p>
          </div>
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

      {/* Application Review Modal */}
      <Modal
        isOpen={showApplicationModal}
        onClose={() => {
          setShowApplicationModal(false);
          setSelectedApplication(null);
          setApplicationFeedback('');
        }}
        title="Review Application"
      >
        {selectedApplication && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                {selectedApplication.creatorId?.profilePicture ? (
                  <img
                    src={selectedApplication.creatorId.profilePicture}
                    alt={selectedApplication.creatorId.displayName}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-indigo-600" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedApplication.creatorId?.displayName || 'Creator'}
                  </h3>
                  <p className="text-xs text-gray-500">@{selectedApplication.creatorId?.handle}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Proposal</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">{selectedApplication.proposal}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Rate</h4>
              <p className="text-lg font-bold text-indigo-600">{formatCurrency(selectedApplication.rate || 0)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Feedback (Optional)</label>
              <textarea
                rows="3"
                value={applicationFeedback}
                onChange={(e) => setApplicationFeedback(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Add feedback for the creator..."
              />
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowApplicationModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => handleReviewApplication(selectedApplication?._id, 'rejected')}>
            Reject
          </Button>
          <Button variant="success" onClick={() => handleReviewApplication(selectedApplication?._id, 'accepted')}>
            Accept
          </Button>
        </div>
      </Modal>

      {/* Add Creator Modal */}
      <Modal isOpen={showAddCreatorModal} onClose={() => setShowAddCreatorModal(false)} title="Invite Creators">
        <div className="space-y-4">
          <p className="text-gray-600">
            This feature allows you to search and invite creators to your campaign. The creator discovery system is being
            enhanced for better recommendations.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              Coming soon: Advanced creator search with filters for niche, follower count, engagement rate, and more.
            </p>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button variant="secondary" onClick={() => setShowAddCreatorModal(false)}>
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default CampaignDetails;