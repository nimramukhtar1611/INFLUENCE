// pages/Brand/DealDetails.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useDeal } from '../../hooks/useDeal';
import { useSocket } from '../../context/SocketContext';
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
  X,
  Loader,
  RefreshCw,
  XCircle,
  Activity,
  Image as ImageIcon,
  Video,
  Link2,
  Check,
  CheckCheck,
  Reply,
  Copy,
  Trash2,
  Smile
} from 'lucide-react';
import { formatCurrency, formatDate, timeAgo } from '../../utils/helpers';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import toast from 'react-hot-toast';
import EmojiPicker from 'emoji-picker-react';

const DealDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, joinConversation, leaveConversation, sendMessage: sendSocketMessage, markAsRead, addReaction, deleteMessage } = useSocket();
  const {
    currentDeal: deal,
    loading,
    fetchDeal,
    updateDealStatus,
    acceptDeal,
    rejectDeal,
    counterOffer,
    requestRevision,
    approveDeliverable,
    rateDeal,
    submitDeliverables,
    getDealMessages,
    sendMessage
  } = useDeal();

  const [activeTab, setActiveTab] = useState('overview');
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [counterData, setCounterData] = useState({ budget: '', deadline: '', message: '' });
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingReview, setRatingReview] = useState('');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  useEffect(() => {
    if (id) {
      loadDeal();
    }
    return () => {
      if (conversationId) leaveConversation(conversationId);
    };
  }, [id]);

  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleNewMessage = (message) => {
      if (message.conversationId === conversationId) {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
        if (message.senderId?._id !== user?._id) {
          markMessagesAsRead([message._id]);
        }
      }
    };

    const handleMessagesRead = ({ messageIds, userId, conversationId: cid }) => {
      if (cid === conversationId) {
        setMessages(prev => prev.map(msg =>
          messageIds.includes(msg._id)
            ? { ...msg, readBy: [...(msg.readBy || []), { userId, readAt: new Date() }] }
            : msg
        ));
      }
    };

    const handleMessageReaction = ({ messageId, userId, reaction, conversationId: cid }) => {
      if (cid === conversationId) {
        setMessages(prev => prev.map(msg => {
          if (msg._id === messageId) {
            const filtered = (msg.reactions || []).filter(r => r.userId !== userId);
            return { ...msg, reactions: [...filtered, { userId, reaction, createdAt: new Date() }] };
          }
          return msg;
        }));
      }
    };

    const handleMessageEdited = ({ messageId, content, conversationId: cid }) => {
      if (cid === conversationId) {
        setMessages(prev => prev.map(msg =>
          msg._id === messageId ? { ...msg, content, isEdited: true } : msg
        ));
      }
    };

    const handleMessageDeleted = ({ messageId, conversationId: cid }) => {
      if (cid === conversationId) {
        setMessages(prev => prev.map(msg =>
          msg._id === messageId
            ? { ...msg, isDeleted: true, content: 'This message has been deleted', attachments: [] }
            : msg
        ));
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('messages_read', handleMessagesRead);
    socket.on('message_reaction', handleMessageReaction);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('messages_read', handleMessagesRead);
      socket.off('message_reaction', handleMessageReaction);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
    };
  }, [socket, conversationId, user]);

  const loadDeal = async () => {
    const data = await fetchDeal(id);
    if (data) {
      if (data.conversationId) {
        setConversationId(data.conversationId);
        joinConversation(data.conversationId);
      }
      const msgs = await getDealMessages(id);
      setMessages(msgs || []);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const markMessagesAsRead = (messageIds) => {
    if (conversationId && messageIds.length > 0) {
      markAsRead(conversationId, messageIds);
    }
  };

  const handleTyping = (value) => {
    setMessageInput(value);
    if (!isTyping && value && conversationId) {
      setIsTyping(true);
      socket?.emit('typing:start', { conversationId });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping && conversationId) {
        setIsTyping(false);
        socket?.emit('typing:stop', { conversationId });
      }
    }, 1000);
  };

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && attachments.length === 0) || !conversationId || sendingMessage) return;

    setSendingMessage(true);
    try {
      let uploadedAttachments = [];
      if (attachments.length > 0) {
        setUploading(true);
        const formData = new FormData();
        attachments.forEach(f => formData.append('files', f));
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(res => res.json());
        if (uploadRes.success) {
          uploadedAttachments = uploadRes.files;
        }
        setUploading(false);
      }

      const success = sendSocketMessage({
        conversationId,
        content: messageInput,
        attachments: uploadedAttachments,
        replyTo: replyingTo?._id,
        dealId: id,
        contentType: 'text'
      });

      if (success) {
        setMessageInput('');
        setAttachments([]);
        setReplyingTo(null);
        if (isTyping && conversationId) {
          setIsTyping(false);
          socket?.emit('typing:stop', { conversationId });
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      } else {
        // fallback to HTTP
        await sendMessage(id, messageInput, uploadedAttachments);
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
      setUploading(false);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files).filter(f => {
      if (f.size > 50 * 1024 * 1024) {
        toast.error(`${f.name} too large`);
        return false;
      }
      return true;
    });
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleApproveDeliverable = async () => {
    try {
      if (selectedDeliverable) {
        // Approve a single specific deliverable
        await approveDeliverable(id, selectedDeliverable, '');
        toast.success('Deliverable approved');
      } else {
        // Approve all submitted deliverables
        const submitted = deal.deliverables?.filter(d => d.status === 'submitted') || [];
        if (submitted.length === 0) {
          toast.error('No submitted deliverables to approve');
          return;
        }
        for (const del of submitted) {
          await approveDeliverable(id, del._id, '');
        }
        toast.success(`${submitted.length} deliverable(s) approved`);
      }
      setShowApproveModal(false);
      setSelectedDeliverable(null);
      loadDeal();
    } catch (error) {
      toast.error('Failed to approve');
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionNotes) {
      toast.error('Please provide revision notes');
      return;
    }
    try {
      await requestRevision(id, selectedDeliverable, revisionNotes);
      toast.success('Revision requested');
      setShowRevisionModal(false);
      setRevisionNotes('');
      loadDeal();
    } catch (error) {
      toast.error('Failed to request revision');
    }
  };

  const handleCounterOffer = async () => {
    if (!counterData.message) {
      toast.error('Please add a message');
      return;
    }
    try {
      await counterOffer(id, counterData);
      toast.success('Counter offer sent');
      setShowCounterModal(false);
      setCounterData({ budget: '', deadline: '', message: '' });
      loadDeal();
    } catch (error) {
      toast.error('Failed to send counter offer');
    }
  };

  const handleRateDeal = async () => {
    try {
      await rateDeal(id, ratingScore, ratingReview);
      toast.success('Deal rated');
      setShowRatingModal(false);
      loadDeal();
    } catch (error) {
      toast.error('Failed to rate deal');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-purple-100 text-purple-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'revision': return 'bg-orange-100 text-orange-800';
      case 'cancelled':
      case 'declined': return 'bg-red-100 text-red-800';
      case 'disputed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDeliverableStatusColor = (status) => {
    switch(status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'revision': return 'bg-orange-100 text-orange-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
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
        <Button variant="primary" onClick={() => navigate('/brand/deals')}>
          Back to Deals
        </Button>
      </div>
    );
  }

  const isBrand = user?.userType === 'brand';
  const otherParty = isBrand ? deal.creatorId : deal.brandId;
  const submittedDeliverables = deal.deliverables?.filter(d => d.status === 'submitted') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/brand/deals" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {deal.campaignId?.title || 'Deal Details'}
            </h1>
            <p className="text-gray-600">Deal ID: {deal._id?.slice(-8)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(deal.status)}`}>
            {deal.status}
          </span>
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={loadDeal}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Budget</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(deal.budget)}</p>
          {deal.netAmount && (
            <p className="text-xs text-green-600 mt-1">Net: {formatCurrency(deal.netAmount)}</p>
          )}
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Deadline</p>
          <p className="text-2xl font-bold text-gray-900">
            {deal.deadline ? formatDate(deal.deadline) : 'No deadline'}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Progress</p>
          <p className="text-2xl font-bold text-indigo-600">{deal.progress || 0}%</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Payment</p>
          <p className="text-2xl font-bold text-gray-900 capitalize">{deal.paymentStatus || 'pending'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex space-x-8 min-w-max">
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
                <span className="ml-2 bg-indigo-100 text-indigo-600 text-xs px-2 py-0.5 rounded-full">
                  {messages.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Deal Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Deal Details</h2>
              <p className="text-gray-600 mb-4">{deal.campaignId?.description || 'No description provided'}</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Campaign</p>
                  <p className="font-medium">{deal.campaignId?.title || '—'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Payment Type</p>
                  <p className="font-medium capitalize">{deal.paymentType || 'fixed'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Created</p>
                  <p className="font-medium">{formatDate(deal.createdAt)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Last Updated</p>
                  <p className="font-medium">{timeAgo(deal.updatedAt)}</p>
                </div>
              </div>
            </div>

            {deal.requirements?.length > 0 && (
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

          {/* Right Column - Partner Info & Actions */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {isBrand ? 'Creator' : 'Brand'}
              </h2>
              <div className="flex items-center gap-4 mb-4">
                {otherParty?.profilePicture ? (
                  <img src={otherParty.profilePicture} alt={otherParty.displayName} className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-indigo-600" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {isBrand ? otherParty?.displayName : otherParty?.brandName}
                  </h3>
                  {isBrand && otherParty?.handle && (
                    <p className="text-sm text-gray-500">@{otherParty.handle}</p>
                  )}
                  <div className="flex items-center mt-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm ml-1">
                      {otherParty?.stats?.averageRating?.toFixed(1) || '—'}
                    </span>
                  </div>
                </div>
              </div>

              <Link
                to={isBrand ? `/brand/creators/${otherParty?._id}` : `/brands/${otherParty?._id}`}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center"
              >
                View Full Profile
              </Link>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
              <div className="space-y-3">
                {deal.status === 'pending' && isBrand && (
                  <>
                    <Button variant="success" fullWidth icon={CheckCircle} onClick={() => acceptDeal(id)}>
                      Accept Deal
                    </Button>
                    <Button variant="outline" fullWidth icon={Edit} onClick={() => setShowCounterModal(true)}>
                      Counter Offer
                    </Button>
                    <Button variant="danger" fullWidth icon={XCircle} onClick={() => rejectDeal(id)}>
                      Reject Deal
                    </Button>
                  </>
                )}

                {['accepted', 'in-progress', 'revision'].includes(deal.status) && isBrand && (
                  <Button variant="primary" fullWidth icon={MessageSquare} onClick={() => setActiveTab('messages')}>
                    Send Message
                  </Button>
                )}

                {deal.conversationId && isBrand && (
                  <Link to={`/brand/inbox?conversationId=${deal.conversationId}`} className="block w-full">
                    <Button variant="outline" fullWidth icon={MessageSquare}>
                      Chat with Creator
                    </Button>
                  </Link>
                )}

                {deal.status === 'in-progress' && isBrand && submittedDeliverables.length > 0 && (
                  <>
                    <Button variant="success" fullWidth icon={ThumbsUp} onClick={() => setShowApproveModal(true)}>
                      Approve Deliverables
                    </Button>
                    <Button variant="warning" fullWidth icon={Edit} onClick={() => setShowRevisionModal(true)}>
                      Request Revision
                    </Button>
                  </>
                )}

                {deal.status === 'completed' && !deal.rating && (
                  <Button variant="primary" fullWidth icon={Star} onClick={() => setShowRatingModal(true)}>
                    Rate Deal
                  </Button>
                )}

                {deal.status !== 'cancelled' && deal.status !== 'completed' && (
                  <Button variant="danger" fullWidth icon={Flag} onClick={() => setShowCancelModal(true)}>
                    Cancel Deal
                  </Button>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contract</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Contract ID</span>
                  <span className="text-sm font-mono">{deal.contract?.id || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Signed</span>
                  <span className="text-sm">{deal.contract?.signed ? formatDate(deal.contract.signed) : 'Not signed'}</span>
                </div>
                {deal.contract?.file && (
                  <Button variant="outline" size="sm" fullWidth icon={Download}>
                    Download Contract
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'deliverables' && (
        <div className="space-y-6">
          {deal.deliverables?.length > 0 ? (
            deal.deliverables.map((del) => (
              <div key={del._id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
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
                        <p className="text-xs text-gray-400 mt-1">Submitted: {formatDate(del.submittedAt)}</p>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDeliverableStatusColor(del.status)}`}>
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

                {del.files?.length > 0 && (
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
                            <img src={file.url} alt={file.filename} className="w-full h-28 object-cover rounded-lg" />
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

                {del.links?.length > 0 && (
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

                {isBrand && del.status === 'submitted' && (
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="success"
                      size="sm"
                      icon={ThumbsUp}
                      onClick={() => {
                        setSelectedDeliverable(del._id);
                        setShowApproveModal(true);
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="warning"
                      size="sm"
                      icon={Edit}
                      onClick={() => {
                        setSelectedDeliverable(del._id);
                        setShowRevisionModal(true);
                      }}
                    >
                      Request Changes
                    </Button>
                  </div>
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
              Messages with {isBrand ? deal.creatorId?.displayName : deal.brandId?.brandName}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg) => {
              const isOwn = msg.senderId?._id === user?._id || msg.senderId === user?._id;
              return (
                <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-lg p-3 ${
                    isOwn ? 'bg-indigo-600 text-white' : 'bg-white text-gray-900 shadow-sm border border-gray-100'
                  }`}>
                    {!isOwn && (
                      <p className="text-xs text-gray-500 mb-1">
                        {msg.senderId?.fullName || msg.senderId?.brandName || 'User'}
                      </p>
                    )}
                    {msg.replyTo && (
                      <div className={`mb-2 p-2 rounded-lg text-sm ${isOwn ? 'bg-indigo-700' : 'bg-gray-100'}`}>
                        <p className="text-xs opacity-75 mb-1">Replying to:</p>
                        <p className="truncate">{msg.replyTo.content}</p>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    {msg.attachments?.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {msg.attachments.map((file, i) => (
                          <a
                            key={i}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-white bg-opacity-20 rounded p-2 text-sm"
                          >
                            <FileText className="w-4 h-4" />
                            <span className="flex-1 truncate">{file.filename}</span>
                            <Download className="w-4 h-4" />
                          </a>
                        ))}
                      </div>
                    )}
                    <div className={`flex items-center justify-end mt-1 text-xs ${
                      isOwn ? 'text-indigo-200' : 'text-gray-500'
                    }`}>
                      <span>{timeAgo(msg.createdAt)}</span>
                      {isOwn && (
                        <span className="ml-2">
                          {msg.readBy?.length > 1 ? (
                            <CheckCheck className="w-4 h-4" title="Read" />
                          ) : (
                            <Check className="w-4 h-4" title="Sent" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-200">
            {replyingTo && (
              <div className="mb-2 flex items-center justify-between bg-indigo-50 p-2 rounded-lg">
                <span className="text-sm text-indigo-600">Replying to: {replyingTo.content?.substring(0, 50)}</span>
                <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachments.map((f, i) => (
                  <div key={i} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs">
                    <FileText className="w-3 h-3" />
                    <span>{f.name}</span>
                    <button onClick={() => removeAttachment(i)} className="text-gray-500 hover:text-gray-700">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <textarea
                  rows="1"
                  value={messageInput}
                  onChange={(e) => handleTyping(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder={uploading ? 'Uploading...' : 'Type your message...'}
                  disabled={uploading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  style={{ minHeight: '48px' }}
                />
                <div className="absolute right-2 bottom-2 flex items-center gap-1">
                  <label className="cursor-pointer p-1.5 hover:bg-gray-100 rounded-lg">
                    <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                    <Paperclip className="w-5 h-5 text-gray-500" />
                  </label>
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg"
                  >
                    <Smile className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
              <button
                onClick={handleSendMessage}
                disabled={(!messageInput.trim() && attachments.length === 0) || sendingMessage || uploading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {sendingMessage ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
            {showEmojiPicker && (
              <div className="absolute bottom-20 right-4 z-50">
                <EmojiPicker onEmojiClick={(e) => { setMessageInput(prev => prev + e.emoji); setShowEmojiPicker(false); }} />
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
          {deal.timeline?.length > 0 ? (
            <div className="relative">
              {deal.timeline.map((item, index) => (
                <div key={index} className="flex gap-4 mb-4 last:mb-0">
                  <div className="relative">
                    <div className={`w-3 h-3 rounded-full mt-1.5 ${
                      item.type === 'create' ? 'bg-blue-600' :
                      item.type === 'accept' ? 'bg-green-600' :
                      item.type === 'submit' ? 'bg-purple-600' :
                      item.type === 'message' ? 'bg-orange-600' :
                      'bg-gray-600'
                    }`} />
                    {index < deal.timeline.length - 1 && (
                      <div className="absolute top-4 left-1.5 w-0.5 h-12 bg-gray-200" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">{item.event}</p>
                      <span className="text-xs text-gray-500">{formatDate(item.createdAt)}</span>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    )}
                    {item.userId && (
                      <p className="text-xs text-gray-500 mt-1">by {item.userId?.fullName || 'User'}</p>
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

      {/* Modals */}
      <Modal isOpen={showApproveModal} onClose={() => setShowApproveModal(false)} title="Approve Deliverable">
        <p className="text-gray-600 mb-4">
          {selectedDeliverable
            ? 'Are you sure you want to approve this deliverable?'
            : `Approve all ${submittedDeliverables.length} submitted deliverables?`}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowApproveModal(false)}>Cancel</Button>
          <Button variant="success" onClick={handleApproveDeliverable}>
            {selectedDeliverable ? 'Approve' : 'Approve All'}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={showRevisionModal} onClose={() => setShowRevisionModal(false)} title="Request Revision">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Revision Notes
            </label>
            <textarea
              rows="4"
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Describe what changes are needed..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowRevisionModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleRequestRevision}>Request Revision</Button>
        </div>
      </Modal>

      <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} title="Cancel Deal">
        <div className="space-y-4">
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> Cancelling this deal may have consequences. Please provide a reason.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Cancellation
            </label>
            <textarea
              rows="3"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter reason..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowCancelModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => updateDealStatus(id, 'cancelled', cancelReason)}>Cancel Deal</Button>
        </div>
      </Modal>

      <Modal isOpen={showCounterModal} onClose={() => setShowCounterModal(false)} title="Counter Offer">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proposed Budget (optional)
            </label>
            <input
              type="number"
              value={counterData.budget}
              onChange={(e) => setCounterData({ ...counterData, budget: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder={`Current: ${formatCurrency(deal.budget)}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proposed Deadline (optional)
            </label>
            <input
              type="date"
              value={counterData.deadline}
              onChange={(e) => setCounterData({ ...counterData, deadline: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message to {isBrand ? 'Creator' : 'Brand'} *
            </label>
            <textarea
              rows="4"
              value={counterData.message}
              onChange={(e) => setCounterData({ ...counterData, message: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Explain your proposed changes..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowCounterModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleCounterOffer}>Send Counter Offer</Button>
        </div>
      </Modal>

      <Modal isOpen={showRatingModal} onClose={() => setShowRatingModal(false)} title="Rate This Deal">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Score</label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  onClick={() => setRatingScore(n)}
                  className={`w-10 h-10 rounded-lg border-2 font-bold ${
                    ratingScore >= n ? 'border-yellow-400 bg-yellow-50 text-yellow-600' : 'border-gray-200 text-gray-400'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Review (optional)</label>
            <textarea
              rows="3"
              value={ratingReview}
              onChange={(e) => setRatingReview(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Share your experience..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowRatingModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleRateDeal}>Submit Rating</Button>
        </div>
      </Modal>
    </div>
  );
};

export default DealDetails;