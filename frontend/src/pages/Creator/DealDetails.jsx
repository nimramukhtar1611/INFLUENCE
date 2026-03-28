// pages/Creator/DealDetails.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Calendar,
  DollarSign,
  FileText,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Eye,
  Edit,
  Send,
  Paperclip,
  Star,
  ThumbsUp,
  Flag,
  Upload,
  Loader,
  RefreshCw,
  XCircle,
  Activity
} from 'lucide-react';
import dealService from '../../services/dealService';
import disputeService from '../../services/disputeService';
import { formatCurrency, formatDate, timeAgo } from '../../utils/helpers';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../context/SocketContext';

const normalizeConversationId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (typeof value._id === 'string') return value._id;
    if (typeof value.id === 'string') return value.id;
  }
  return String(value);
};

const DealDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, joinConversation, leaveConversation, sendMessage: sendSocketMessage, markAsRead } = useSocket();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deal, setDeal] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const [conversationId, setConversationId] = useState(null);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [counterData, setCounterData] = useState({ budget: '', deadline: '', message: '' });
  const [submittingCounter, setSubmittingCounter] = useState(false);
  const [startingAiCounter, setStartingAiCounter] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [counterSuggestion, setCounterSuggestion] = useState(null);
  const [aiCounterAccess, setAiCounterAccess] = useState({ canUse: false, reason: '', plan: 'free', isActive: false });
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [disputeData, setDisputeData] = useState({
    type: 'payment',
    title: '',
    description: ''
  });

  useEffect(() => {
    fetchDeal();
  }, [id]);

  useEffect(() => {
    if (!conversationId) return;

    joinConversation(conversationId);

    return () => {
      leaveConversation(conversationId);
    };
  }, [conversationId, joinConversation, leaveConversation]);

  useEffect(() => {
    if (activeTab === 'messages') {
      fetchMessages();
    }
  }, [activeTab, id]);

  useEffect(() => {
    if (activeTab === 'messages') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleNewMessage = (message) => {
      if (normalizeConversationId(message?.conversationId) !== conversationId) {
        return;
      }

      setMessages((prev) => {
        if (prev.some((msg) => msg._id === message._id)) {
          return prev;
        }
        return [...prev, message];
      });

      const senderId = message?.senderId?._id || message?.senderId;
      if (String(senderId) !== String(user?._id) && message?._id) {
        markAsRead(conversationId, [message._id]);
      }
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, conversationId, user, markAsRead]);

  const fetchDeal = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);

      const response = await dealService.getDeal(id);

      if (response?.success) {
        setDeal(response.deal);
        setConversationId(normalizeConversationId(response.deal?.conversationId));
        await loadNegotiationSuggestion();
      } else {
        toast.error(response?.error || 'Failed to load deal');
        navigate('/creator/deals');
      }
    } catch (error) {
      console.error('Fetch deal error:', error);
      toast.error('Failed to load deal');
      navigate('/creator/deals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadNegotiationSuggestion = async () => {
    try {
      setSuggestionLoading(true);
      const response = await dealService.getNegotiationSuggestion(id);
      if (response?.success) {
        setCounterSuggestion(response.suggestion || null);
        setAiCounterAccess(response.aiCounter || { canUse: false, reason: '', plan: 'free', isActive: false });
      } else {
        setCounterSuggestion(null);
        setAiCounterAccess({ canUse: false, reason: response?.error || '', plan: 'free', isActive: false });
      }
    } catch (error) {
      setCounterSuggestion(null);
      setAiCounterAccess({ canUse: false, reason: 'Failed to load AI suggestion', plan: 'free', isActive: false });
    } finally {
      setSuggestionLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await dealService.getDealMessages(id);
      if (response?.success) {
        setMessages(response.messages || []);
      }
    } catch (error) {
      console.error('Fetch messages error:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;

    try {
      setSendingMessage(true);

      const content = messageInput.trim();
      const socketSent = await new Promise((resolve) => {
        if (!conversationId) {
          resolve(false);
          return;
        }

        const timeoutId = setTimeout(() => resolve(false), 2000);
        const emitted = sendSocketMessage({
          conversationId,
          content,
          dealId: id,
          contentType: 'text'
        }, (ack) => {
          clearTimeout(timeoutId);
          resolve(Boolean(ack?.success));
        });

        if (!emitted) {
          clearTimeout(timeoutId);
          resolve(false);
        }
      });

      if (!socketSent) {
        const response = await dealService.sendMessage(id, content);
        if (!response?.success) {
          toast.error('Failed to send message');
          return;
        }

        if (response.message) {
          setMessages((prev) => {
            if (prev.some((msg) => msg._id === response.message._id)) {
              return prev;
            }
            return [...prev, response.message];
          });
        }

        await fetchDeal();
      }

      setMessageInput('');
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const isManualCounterDisabledForActor = (dealState, actorRole) => {
    const settings = dealState?.negotiationSettings || {};
    if (settings?.mode !== 'ai') return false;

    if (actorRole === 'creator') {
      if (typeof settings.aiEnabledByCreator === 'boolean') return settings.aiEnabledByCreator;
      const aiEnabledBy = settings.aiEnabledBy?._id || settings.aiEnabledBy;
      return !aiEnabledBy || String(aiEnabledBy) === String(user?._id);
    }

    if (typeof settings.aiEnabledByBrand === 'boolean') return settings.aiEnabledByBrand;
    return false;
  };

  const handleCounterOffer = async () => {
    const manualLockedForActor = isManualCounterDisabledForActor(deal, 'creator');

    if (manualLockedForActor) {
      toast.error('Manual counter offer is disabled for the user who started AI Counter Dealing');
      return;
    }

    if (!counterData.message) {
      toast.error('Please add a message explaining your counter offer');
      return;
    }

    try {
      setSubmittingCounter(true);
      const response = await dealService.counterOffer(id, {
        budget: counterData.budget ? parseFloat(counterData.budget) : undefined,
        deadline: counterData.deadline || undefined,
        message: counterData.message
      });

      if (response?.success) {
          if (response?.insufficientFunds || response?.aiCounter?.insufficientFunds) {
            toast.error(response?.message || 'Brand funds are insufficient to auto-accept.');
          } else {
            toast.success(response?.message || 'Counter offer sent');
          }
        setShowCounterModal(false);
        setCounterData({ budget: '', deadline: '', message: '' });
        await fetchDeal();
      } else {
        toast.error(response?.error || 'Failed to send counter offer');
      }
    } catch (error) {
      console.error('Counter offer error:', error);
      toast.error('Failed to send counter offer');
    } finally {
      setSubmittingCounter(false);
    }
  };

  const handleStartAiCounter = async () => {
    try {
      setStartingAiCounter(true);
      const response = await dealService.startAiCounterDealing(id);
      if (response?.success) {
        if (response?.aiCounter?.insufficientFunds || response?.insufficientFunds) {
          toast.error(response?.message || 'AI could not accept due to insufficient brand funds.');
        } else {
          toast.success(response?.message || 'AI Counter Dealing started and counter sent');
        }
        setShowCounterModal(false);
        await fetchDeal();
      } else {
        toast.error(response?.error || 'Failed to start AI counter dealing');
      }
    } catch (error) {
      toast.error('Failed to start AI counter dealing');
    } finally {
      setStartingAiCounter(false);
    }
  };

  const handleAccept = async () => {
    try {
      const response = await dealService.acceptDeal(id);
      if (response?.success) {
        toast.success('Deal accepted!');
        await fetchDeal();
      } else {
        toast.error(response?.error || 'Failed to accept deal');
      }
    } catch (error) {
      toast.error('Failed to accept deal');
    }
  };

  const handleCancelDeal = async () => {
    if (!window.confirm('Are you sure you want to cancel this deal?')) return;
    try {
      const response = await dealService.cancelDeal(id, 'Cancelled by creator');
      if (response?.success) {
        toast.success('Deal cancelled');
        await fetchDeal();
      } else {
        toast.error(response?.error || 'Failed to cancel deal');
      }
    } catch (error) {
      toast.error('Failed to cancel deal');
    }
  };

  const handleAcceptCounterOffer = async () => {
    try {
      const response = await dealService.updateDealStatus(id, 'accepted', 'Counter offer accepted');
      if (response?.success) {
        toast.success('Counter offer accepted');
        await fetchDeal();
      } else {
        toast.error(response?.error || 'Failed to accept counter offer');
      }
    } catch (error) {
      toast.error('Failed to accept counter offer');
    }
  };

  const handleCreateDispute = async () => {
    if (!deal?._id) {
      toast.error('Deal is not available');
      return;
    }

    if (!disputeData.title.trim() || !disputeData.description.trim()) {
      toast.error('Please add a title and description');
      return;
    }

    try {
      setSubmittingDispute(true);
      const response = await disputeService.createDispute({
        dealId: deal._id,
        type: disputeData.type,
        title: disputeData.title.trim(),
        description: disputeData.description.trim(),
        evidence: []
      });

      if (response?.success) {
        toast.success('Issue reported successfully');
        setShowDisputeModal(false);
        setDisputeData({ type: 'payment', title: '', description: '' });
      } else {
        toast.error(response?.error || 'Failed to report issue');
      }
    } catch (error) {
      console.error('Create dispute error:', error);
      toast.error(error?.response?.data?.error || 'Failed to report issue');
    } finally {
      setSubmittingDispute(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':   return 'bg-green-100 text-green-800';
      case 'pending':     return 'bg-yellow-100 text-yellow-800';
      case 'negotiating': return 'bg-indigo-100 text-indigo-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'revision':    return 'bg-orange-100 text-orange-800';
      case 'accepted':    return 'bg-indigo-100 text-indigo-800';
      case 'cancelled':
      case 'declined':    return 'bg-red-100 text-red-800';
      default:            return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-12 h-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Deal Not Found</h2>
        <Button variant="primary" onClick={() => navigate('/creator/deals')}>
          Back to Deals
        </Button>
      </div>
    );
  }

  const latestCounter = deal.negotiation?.length
    ? deal.negotiation[deal.negotiation.length - 1]
    : null;
  const latestCounterProposedById = latestCounter?.proposedBy?._id || latestCounter?.proposedBy;
  const canCreatorAcceptCounter = Boolean(
    deal.status === 'negotiating' &&
    latestCounter &&
    latestCounterProposedById &&
    String(latestCounterProposedById) !== String(user?._id)
  );
  const manualCounterDisabled = isManualCounterDisabledForActor(deal, 'creator');
  const canCreatorCounter = (deal.status === 'pending') || (deal.status === 'negotiating' && canCreatorAcceptCounter);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/creator/deals" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {deal.campaignId?.title || 'Deal Details'}
          </h1>
          <p className="text-gray-600">Deal ID: {deal._id?.slice(-8)}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(deal.status)}`}>
          {deal.status}
        </span>
        <Button
          variant="outline"
          size="sm"
          icon={RefreshCw}
          onClick={() => fetchDeal(true)}
          loading={refreshing}
        />
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {['overview', 'deliverables', 'messages', 'timeline'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
              {tab === 'messages' && messages.length > 0 && (
                <span className="ml-2 bg-indigo-100 text-indigo-600 text-xs px-1.5 py-0.5 rounded-full">
                  {messages.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Deal Details</h2>
              <p className="text-gray-600 mb-4">{deal.campaignId?.description || 'No description provided'}</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Campaign</p>
                  <p className="font-medium">{deal.campaignId?.title || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Type</p>
                  <p className="font-medium capitalize">{deal.paymentType || 'fixed'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Budget</p>
                  <p className="font-medium text-lg">{formatCurrency(deal.budget || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Platform Fee</p>
                  <p className="font-medium text-red-600">{formatCurrency(deal.platformFee || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">You Receive</p>
                  <p className="font-medium text-green-600">{formatCurrency(deal.netAmount || deal.budget || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Deadline</p>
                  <p className="font-medium">{deal.deadline ? formatDate(deal.deadline) : 'No deadline'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Status</p>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    deal.paymentStatus === 'released'  ? 'bg-green-100 text-green-800' :
                    deal.paymentStatus === 'in-escrow' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {deal.paymentStatus || 'pending'}
                  </span>
                </div>
              </div>
            </div>

            {deal.requirements && deal.requirements.length > 0 && (
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Requirements</h2>
                <ul className="space-y-2">
                  {deal.requirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {deal.terms && (
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Terms</h2>
                <p className="text-sm text-gray-600 whitespace-pre-line">{deal.terms}</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Brand</h2>
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={deal.brandId?.logo || deal.brandId?.profilePicture || 'https://via.placeholder.com/60'}
                  alt={deal.brandId?.brandName}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-semibold text-gray-900">{deal.brandId?.brandName || 'Brand'}</h3>
                  <div className="flex items-center mt-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm ml-1">
                      {deal.brandId?.stats?.averageRating?.toFixed(1) || '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Progress</h2>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{ width: `${deal.progress || 0}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700">{deal.progress || 0}%</span>
              </div>
              <p className="text-xs text-gray-500">
                {deal.deliverables?.filter(d => d.status === 'approved').length || 0} of{' '}
                {deal.deliverables?.length || 0} deliverables approved
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>

              {deal.status === 'negotiating' && latestCounter && (
                <div className="mb-4 p-3 rounded-lg border border-indigo-100 bg-indigo-50">
                  <p className="text-xs text-indigo-700 font-medium mb-1">Latest Counter Offer</p>
                  {latestCounter.budget && (
                    <p className="text-sm text-indigo-800">Budget: {formatCurrency(latestCounter.budget)}</p>
                  )}
                  {latestCounter.deadline && (
                    <p className="text-sm text-indigo-800">Deadline: {formatDate(latestCounter.deadline)}</p>
                  )}
                  {latestCounter.message && (
                    <p className="text-sm text-indigo-900 mt-1">{latestCounter.message}</p>
                  )}
                </div>
              )}

              <div className="space-y-3">
                {deal.status === 'pending' && (
                  <>
                    <Button variant="primary" fullWidth icon={ThumbsUp} onClick={handleAccept}>
                      Accept Deal
                    </Button>
                    <Button
                      variant="outline"
                      fullWidth
                      icon={Edit}
                      onClick={() => setShowCounterModal(true)}
                      disabled={manualCounterDisabled}
                    >
                      Counter Offer
                    </Button>
                  </>
                )}

                {deal.status === 'negotiating' && (
                  <>
                    {canCreatorAcceptCounter && (
                      <Button variant="primary" fullWidth icon={ThumbsUp} onClick={handleAcceptCounterOffer}>
                        Accept Counter Offer
                      </Button>
                    )}
                    {canCreatorAcceptCounter && (
                      <Button
                        variant="outline"
                        fullWidth
                        icon={Edit}
                        onClick={() => setShowCounterModal(true)}
                        disabled={manualCounterDisabled}
                      >
                        Counter Again
                      </Button>
                    )}
                  </>
                )}

                {canCreatorCounter && aiCounterAccess?.canUse && (
                  <Button
                    variant="secondary"
                    fullWidth
                    icon={RefreshCw}
                    onClick={handleStartAiCounter}
                    loading={startingAiCounter}
                    disabled={manualCounterDisabled}
                  >
                    AI Counter Dealing
                  </Button>
                )}

                {canCreatorCounter && !aiCounterAccess?.canUse && aiCounterAccess?.reason && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                    {aiCounterAccess.reason}
                  </p>
                )}

                {manualCounterDisabled && (
                  <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg p-2">
                    You started AI Counter Dealing, so your manual counter offer is disabled.
                  </p>
                )}

                {['accepted', 'in-progress', 'revision'].includes(deal.status) && (
                  <Button
                    variant="primary"
                    fullWidth
                    icon={Upload}
                    onClick={() => navigate(`/creator/deliverables/${deal._id}`)}
                  >
                    Submit Deliverables
                  </Button>
                )}

                <Button
                  variant="outline"
                  fullWidth
                  icon={MessageSquare}
                  onClick={() => setActiveTab('messages')}
                >
                  Send Message
                </Button>

                {['pending', 'negotiating'].includes(deal.status) && (
                  <Button variant="danger" fullWidth icon={XCircle} onClick={handleCancelDeal}>
                    Cancel Deal
                  </Button>
                )}

                <Button variant="outline" fullWidth icon={Flag} onClick={() => setShowDisputeModal(true)}>
                  Report Issue
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'deliverables' && (
        <div className="space-y-6">
          {deal.deliverables && deal.deliverables.length > 0 ? (
            deal.deliverables.map((del) => (
              <div key={del._id} className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {del.status === 'approved' ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : del.status === 'submitted' ? (
                      <Clock className="w-6 h-6 text-blue-600" />
                    ) : del.status === 'revision' ? (
                      <AlertCircle className="w-6 h-6 text-orange-600" />
                    ) : (
                      <Clock className="w-6 h-6 text-yellow-600" />
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900 capitalize">{del.type}</h3>
                      <p className="text-sm text-gray-500 capitalize">{del.platform}</p>
                      {del.submittedAt && (
                        <p className="text-xs text-gray-400">Submitted: {formatDate(del.submittedAt)}</p>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(del.status)}`}>
                    {del.status}
                  </span>
                </div>

                {del.description && (
                  <p className="text-sm text-gray-600 mb-4">{del.description}</p>
                )}

                {del.revisionNotes && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                    <p className="text-sm font-medium text-orange-700 mb-1">Revision Requested:</p>
                    <p className="text-sm text-orange-600">{del.revisionNotes}</p>
                  </div>
                )}

                {del.feedback && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm font-medium text-blue-700 mb-1">Brand Feedback:</p>
                    <p className="text-sm text-blue-600">{del.feedback}</p>
                  </div>
                )}

                {del.files && del.files.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Submitted Files:</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {del.files.map((file, index) => (
                        <a
                          key={index}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative group block"
                        >
                          {file.type === 'image' ? (
                            <img
                              src={file.url}
                              alt={file.filename}
                              className="w-full h-28 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-full h-28 bg-gray-100 rounded-lg flex flex-col items-center justify-center gap-1">
                              <FileText className="w-8 h-8 text-gray-400" />
                              <p className="text-xs text-gray-500 truncate max-w-[90%] px-1">{file.filename}</p>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Eye className="w-4 h-4 text-white" />
                            <Download className="w-4 h-4 text-white" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {del.links && del.links.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Submitted Links:</p>
                    <div className="space-y-1">
                      {del.links.map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-indigo-600 hover:text-indigo-700 truncate"
                        >
                          {link}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {del.status !== 'approved' && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Upload}
                    onClick={() => navigate(`/creator/deliverables/${deal._id}`)}
                  >
                    {del.status === 'revision' ? 'Resubmit' : 'Upload Files'}
                  </Button>
                )}
              </div>
            ))
          ) : (
            <div className="bg-white p-12 rounded-xl shadow-sm text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No deliverables defined for this deal</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="bg-white rounded-xl shadow-sm h-[600px] flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">
              Messages with {deal.brandId?.brandName || 'Brand'}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length > 0 ? (
              messages.map((msg) => {
                const senderId = msg.senderId?._id || msg.senderId;
                const isOwn = String(senderId) === String(user?._id);
                return (
                  <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-lg p-3 ${
                      isOwn ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">
                          {isOwn ? 'You' : (msg.senderId?.fullName || msg.senderId?.brandName || 'Brand')}
                        </span>
                        <span className={`text-xs ${isOwn ? 'text-indigo-200' : 'text-gray-500'}`}>
                          {timeAgo(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.attachments.map((file, index) => (
                            <a
                              key={index}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs bg-white bg-opacity-20 px-2 py-1 rounded"
                            >
                              <Paperclip className="w-3 h-3" />
                              {file.filename || 'Attachment'}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-400">No messages yet. Start the conversation!</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || sendingMessage}
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {sendingMessage ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
          {deal.timeline && deal.timeline.length > 0 ? (
            <div className="relative">
              {deal.timeline.map((item, index) => (
                <div key={index} className="flex gap-4 mb-4 last:mb-0">
                  <div className="relative">
                    <div className="w-3 h-3 bg-indigo-600 rounded-full mt-1.5" />
                    {index < deal.timeline.length - 1 && (
                      <div className="absolute top-4 left-1.5 w-0.5 h-12 bg-gray-200" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">{item.event}</p>
                      <span className="text-xs text-gray-500">{timeAgo(item.createdAt)}</span>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No timeline events yet</p>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        title="Report Issue"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issue Type
            </label>
            <select
              value={disputeData.type}
              onChange={(e) => setDisputeData({ ...disputeData, type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="payment">Payment</option>
              <option value="delivery">Delivery</option>
              <option value="quality">Quality</option>
              <option value="communication">Communication</option>
              <option value="contract_breach">Contract Breach</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={disputeData.title}
              onChange={(e) => setDisputeData({ ...disputeData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Short summary of the issue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              rows="5"
              value={disputeData.description}
              onChange={(e) => setDisputeData({ ...disputeData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Describe what happened and what resolution you are expecting"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowDisputeModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateDispute} loading={submittingDispute}>
            Submit Issue
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={showCounterModal}
        onClose={() => setShowCounterModal(false)}
        title="Negotiate Terms"
      >
        <div className="space-y-4">
          {counterSuggestion && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
              <p className="text-xs font-semibold text-indigo-800 mb-1">Suggested Offer</p>
              <p className="text-sm text-indigo-900">Budget: {formatCurrency(counterSuggestion.suggestedBudget || 0)}</p>
              {counterSuggestion.suggestedDeadline && (
                <p className="text-sm text-indigo-900">Deadline: {formatDate(counterSuggestion.suggestedDeadline)}</p>
              )}
              <p className="text-xs text-indigo-700 mt-1">Confidence: {counterSuggestion.confidence || 0}%</p>
            </div>
          )}

          {suggestionLoading && (
            <p className="text-xs text-gray-500">Loading AI suggestion...</p>
          )}

          {manualCounterDisabled && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-800">
                Manual counter is disabled because you started AI Counter Dealing.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proposed Budget (optional)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="number"
                value={counterData.budget}
                onChange={(e) => setCounterData({ ...counterData, budget: e.target.value })}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={`Current: ${formatCurrency(deal.budget || 0)}`}
                disabled={manualCounterDisabled}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proposed Deadline (optional)
            </label>
            <input
              type="date"
              value={counterData.deadline}
              onChange={(e) => setCounterData({ ...counterData, deadline: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={manualCounterDisabled}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message to Brand *
            </label>
            <textarea
              rows="4"
              value={counterData.message}
              onChange={(e) => setCounterData({ ...counterData, message: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Explain your proposed changes..."
              disabled={manualCounterDisabled}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowCounterModal(false)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleCounterOffer}
            loading={submittingCounter}
            disabled={manualCounterDisabled}
          >
            Send Counter Offer
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default DealDetails;