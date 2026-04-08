import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import {
  Search,
  Send,
  Paperclip,
  MoreVertical,
  Check,
  CheckCheck,
  X,
  Image as ImageIcon,
  Video,
  FileText,
  Download,
  User,
  Briefcase,
  MessageSquare,
  Smile,
  Award,
  Clock,
  Trash2,
  Reply,
  Copy,
  Pin,
  Archive,
  AlertCircle,
  Loader,
  WifiOff,
  DollarSign,
  Eye,
  Bell,
  BellOff,
  XCircle,
  ChevronDown,
  CheckCircle,
} from 'lucide-react';
import { formatNumber, formatCurrency, formatDate, timeAgo } from '../../utils/helpers';
import { formatDistanceToNow } from 'date-fns';
import { getStatusColor, getStatusIconColor } from '../../utils/colorScheme';
import toast from 'react-hot-toast';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import EmojiPicker from 'emoji-picker-react';

// Message Bubble Component
const MessageBubble = ({ message, isOwn, onReaction, onDelete, onReply }) => {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const reactions = ['👍', '❤️', '😂', '😮', '😢', '👏', '🔥', '🎉'];

  const getStatusIcon = () => {
    if (!isOwn) return null;
    if (message.status === 'sending') return <Clock className="w-4 h-4 text-gray-400" />;
    if (message.readBy?.length > 1) return <CheckCheck className="w-4 h-4 text-blue-500" title="Read" />;
    if (message.deliveredTo?.length > 1) return <CheckCheck className="w-4 h-4 text-gray-400" title="Delivered" />;
    return <Check className="w-4 h-4 text-gray-400" title="Sent" />;
  };

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group relative mb-4`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactions(false);
      }}
    >
      {!isOwn && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 mr-2 mt-1">
          <Award className="w-4 h-4 text-white" />
        </div>
      )}

      <div className={`max-w-[70%] ${isOwn ? 'mr-2' : 'ml-2'}`}>
        {!isOwn && (
          <p className="text-xs text-gray-500 mb-1 ml-1">
            {message.senderId?.fullName || message.senderId?.displayName || 'Creator'}
          </p>
        )}

        <div className="relative">
          {showActions && !message.isDeleted && (
            <div
              className={`absolute ${
                isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'
              } top-0 flex items-center gap-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1 z-10`}
            >
              <button
                onClick={() => setShowReactions(!showReactions)}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <Smile className="w-4 h-4 text-gray-700" />
              </button>
              <button
                onClick={() => onReply(message)}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <Reply className="w-4 h-4 text-gray-700" />
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(message.content)}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <Copy className="w-4 h-4 text-gray-700" />
              </button>
              {isOwn && (
                <button
                  onClick={() => onDelete(message._id)}
                  className="p-1.5 hover:bg-red-100 rounded-lg"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              )}
            </div>
          )}

          {showReactions && (
            <div
              className={`absolute ${
                isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'
              } top-0 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-20`}
            >
              <div className="flex gap-1">
                {reactions.map(r => (
                  <button
                    key={r}
                    onClick={() => {
                      onReaction(message._id, r);
                      setShowReactions(false);
                    }}
                    className="w-8 h-8 hover:bg-gray-100 rounded-lg text-xl hover:scale-110 transition-all"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            className={`rounded-2xl p-3 ${
              message.isDeleted
                ? 'bg-gray-100 text-gray-600 italic'
                : message.contentType === 'deal_offer'
                ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white'
                : isOwn
                ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white'
                : 'bg-white text-gray-900 shadow-sm border border-gray-200'
            }`}
          >
            {!message.isDeleted && message.replyTo && (
              <div className={`mb-2 p-2 rounded-lg text-sm ${isOwn ? 'bg-indigo-700' : 'bg-gray-100'}`}>
                <p className="text-xs opacity-75 mb-1">Replying to:</p>
                <p className="truncate">{message.replyTo.content}</p>
              </div>
            )}

            {message.contentType === 'deal_offer' ? (
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                <span className="font-semibold">Deal Offer: ${message.metadata?.budget}</span>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                {message.isDeleted ? 'This message has been deleted' : message.content}
              </p>
            )}

            {message.attachments?.length > 0 && (
              <div className={`mt-3 space-y-2 ${isOwn ? 'bg-indigo-700 rounded-lg p-2' : ''}`}>
                {message.attachments.map((file, i) => (
                  <div key={i}>
                    {file.type === 'image' ? (
                      <img
                        src={file.url}
                        alt={file.filename}
                        className="max-w-full max-h-64 rounded-lg hover:opacity-90 cursor-pointer"
                        onClick={() => window.open(file.url, '_blank')}
                      />
                    ) : file.type === 'video' ? (
                      <video src={file.url} controls className="max-w-full max-h-64 rounded-lg" />
                    ) : (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-200 hover:border-[#667eea] transition-colors"
                      >
                        <FileText className="w-4 h-4 text-[#667eea]" />
                        <span className="text-sm text-gray-700 flex-1 truncate">{file.filename}</span>
                        <Download className="w-4 h-4 text-gray-400" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {message.reactions?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {message.reactions.map((r, i) => (
                  <span key={i} className="text-sm bg-white bg-opacity-20 rounded-full px-2 py-0.5">
                    {r.reaction}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div
            className={`flex items-center gap-2 mt-1 text-xs text-gray-500 ${
              isOwn ? 'justify-end' : 'justify-start'
            }`}
          >
            <span title={format(new Date(message.createdAt), 'PPpp')}>
              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
            </span>
            {isOwn && getStatusIcon()}
            {message.isEdited && !message.isDeleted && <span className="text-gray-400">(edited)</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

const BrandInbox = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const {
    socket,
    isConnected,
    joinConversation,
    leaveConversation,
    sendMessage: sendSocketMessage,
    startTyping,
    stopTyping,
    markAsRead,
    addReaction,
    deleteMessage,
  } = useSocket();

  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);
  const [dealDetails, setDealDetails] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedConvSettings, setSelectedConvSettings] = useState(null);
  const [typingUsersState, setTypingUsersState] = useState({});
  const [onlineUsersState, setOnlineUsersState] = useState(new Set());

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    loadConversations();
    window.addEventListener('online', () => setOnlineStatus(true));
    window.addEventListener('offline', () => setOnlineStatus(false));
    return () => {
      window.removeEventListener('online', () => setOnlineStatus(true));
      window.removeEventListener('offline', () => setOnlineStatus(false));
    };
  }, []);

  const loadConversations = async (includeArchived = false) => {
    try {
      setLoading(true);
      const res = await api.get('/messages/conversations', { params: { includeArchived } });
      if (res.data?.success) {
        setConversations(res.data.data || []);
      }
    } catch (e) {
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conv) => {
    if (selectedConversation) leaveConversation(selectedConversation._id);
    setSelectedConversation(conv);
    setMessages([]);
    setPage(1);
    setHasMore(true);
    joinConversation(conv._id);
    await loadMessages(conv._id);
    markMessagesAsRead(conv._id);
    setConversations(prev =>
      prev.map(c => (c._id === conv._id ? { ...c, unreadCount: 0 } : c))
    );
  };

  // Helper function for deal status with standardized colors
  const getDealStatusDisplay = (status) => {
    const statusClass = getStatusColor(status, 'deal', isDark);
    
    const getDealStatusIcon = (status) => {
      switch(status?.toLowerCase()) {
        case 'completed': return CheckCircle;
        case 'in-progress': return Clock;
        default: return AlertCircle;
      }
    };
    
    const StatusIcon = getDealStatusIcon(status);
    const iconColor = getStatusIconColor(status);
    
    return { statusClass, StatusIcon, iconColor };
  };

  const loadMessages = async (conversationId, pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      const res = await api.get(`/messages/conversations/${conversationId}`, {
        params: { page: pageNum, limit: 50 },
      });
      if (res.data?.success) {
        const newMsgs = res.data.data.messages || [];
        if (pageNum === 1) setMessages(newMsgs);
        else setMessages(prev => [...newMsgs, ...prev]);
        setHasMore(res.data.data.pagination?.hasMore || false);
        setPage(pageNum);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreMessages = () => {
    if (hasMore && !loadingMore && selectedConversation) {
      loadMessages(selectedConversation._id, page + 1);
    }
  };

  // Socket listeners – correct event names (underscore style)
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      setMessages(prev => [...prev, message]);
      setConversations(prev => {
        const updated = prev.map(c =>
          c._id === message.conversationId
            ? {
                ...c,
                lastMessage: message,
                lastMessageAt: new Date(),
                unreadCount:
                  message.senderId?._id !== user?._id ? (c.unreadCount || 0) + 1 : c.unreadCount,
              }
            : c
        );
        return updated.sort(
          (a, b) =>
            new Date(b.lastMessageAt || b.updatedAt) - new Date(a.lastMessageAt || a.updatedAt)
        );
      });
      if (selectedConversation?._id === message.conversationId) {
        scrollToBottom();
        if (message.senderId?._id !== user?._id) {
          markMessagesAsRead(message.conversationId, [message._id]);
        }
      } else if (message.senderId?._id !== user?._id) {
        toast.success(`New message from ${message.senderId?.displayName || 'Creator'}`, {
          icon: '💬',
        });
      }
    };

    const handleMessagesDelivered = ({ conversationId }) => {
      if (selectedConversation?._id === conversationId) {
        setMessages(prev => prev.map(msg => ({ ...msg, delivered: true })));
      }
    };

    const handleMessagesRead = ({ messageIds, userId, conversationId }) => {
      if (selectedConversation?._id === conversationId) {
        setMessages(prev =>
          prev.map(msg =>
            messageIds.includes(msg._id)
              ? {
                  ...msg,
                  readBy: [...(msg.readBy || []), { userId, readAt: new Date() }],
                }
              : msg
          )
        );
      }
    };

    const handleMessageReaction = ({ messageId, userId, reaction, conversationId }) => {
      if (selectedConversation?._id === conversationId) {
        setMessages(prev =>
          prev.map(msg => {
            if (msg._id === messageId) {
              const filtered = (msg.reactions || []).filter(r => r.userId !== userId);
              return {
                ...msg,
                reactions: [...filtered, { userId, reaction, createdAt: new Date() }],
              };
            }
            return msg;
          })
        );
      }
    };

    const handleMessageEdited = ({ messageId, content, conversationId }) => {
      if (selectedConversation?._id === conversationId) {
        setMessages(prev =>
          prev.map(msg =>
            msg._id === messageId ? { ...msg, content, isEdited: true } : msg
          )
        );
      }
    };

    const handleMessageDeleted = ({ messageId, conversationId }) => {
      if (selectedConversation?._id === conversationId) {
        setMessages(prev =>
          prev.map(msg =>
            msg._id === messageId
              ? {
                  ...msg,
                  isDeleted: true,
                  content: 'This message has been deleted',
                  attachments: [],
                }
              : msg
          )
        );
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('messages_delivered', handleMessagesDelivered);
    socket.on('messages_read', handleMessagesRead);
    socket.on('message_reaction', handleMessageReaction);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('typing:update', ({ userId, fullName, isTyping, conversationId }) => {
      if (selectedConversation?._id === conversationId && userId !== user?._id) {
        setTypingUsersState(prev => ({
          ...prev,
          [conversationId]: isTyping ? { userId, fullName } : null,
        }));
      }
    });
    socket.on('user:online', ({ userId }) =>
      setOnlineUsersState(prev => new Set([...prev, userId]))
    );
    socket.on('user:offline', ({ userId }) =>
      setOnlineUsersState(prev => {
        const s = new Set(prev);
        s.delete(userId);
        return s;
      })
    );

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('messages_delivered', handleMessagesDelivered);
      socket.off('messages_read', handleMessagesRead);
      socket.off('message_reaction', handleMessageReaction);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('typing:update');
      socket.off('user:online');
      socket.off('user:offline');
    };
  }, [socket, selectedConversation, user]);

  const handleTyping = (value) => {
    setMessageInput(value);
    if (!isTyping && value && selectedConversation) {
      setIsTyping(true);
      startTyping(selectedConversation._id);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping && selectedConversation) {
        setIsTyping(false);
        stopTyping(selectedConversation._id);
      }
    }, 1000);
  };

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && attachments.length === 0) || !selectedConversation || uploading)
      return;
    try {
      let uploadedAttachments = [];
      if (attachments.length > 0) {
        setUploading(true);
        const formData = new FormData();
        attachments.forEach(f => formData.append('files', f));
        const res = await api.post('/messages/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data?.success) uploadedAttachments = res.data.data;
        setUploading(false);
      }

      const success = sendSocketMessage({
        conversationId: selectedConversation._id,
        content: messageInput,
        attachments: uploadedAttachments,
        replyTo: replyingTo?._id,
        dealId: selectedConversation.deal_id?._id,
        contentType: 'text',
      });

      if (success) {
        setMessageInput('');
        setAttachments([]);
        setReplyingTo(null);
        if (isTyping && selectedConversation) {
          setIsTyping(false);
          stopTyping(selectedConversation._id);
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      } else {
        toast.error('Failed to send. Check your connection.');
      }
    } catch (e) {
      setUploading(false);
      toast.error('Failed to send message.');
    }
  };

  const markMessagesAsRead = async (conversationId, messageIds) => {
    if (!selectedConversation || selectedConversation._id !== conversationId) return;
    const unread =
      messageIds ||
      messages
        .filter(
          msg =>
            msg.senderId?._id !== user?._id && !msg.readBy?.some(r => r.userId === user?._id)
        )
        .map(msg => msg._id);
    if (unread.length > 0) {
      markAsRead(conversationId, unread);
      setMessages(prev =>
        prev.map(msg =>
          unread.includes(msg._id)
            ? {
                ...msg,
                readBy: [...(msg.readBy || []), { userId: user?._id, readAt: new Date() }],
              }
            : msg
        )
      );
      setConversations(prev =>
        prev.map(c => {
          if (c._id === conversationId) {
            // Calculate actual unread count
            const actualUnreadCount = messages.filter(
              msg => msg.senderId?._id !== user?._id && !msg.readBy?.some(r => r.userId === user?._id)
            ).length;
            return { ...c, unreadCount: actualUnreadCount };
          }
          return c;
        })
      );
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

  const removeAttachment = i =>
    setAttachments(prev => prev.filter((_, idx) => idx !== i));

  const scrollToBottom = () =>
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

  const handleScroll = useCallback(e => {
    if (e.target.scrollTop === 0 && hasMore && !loadingMore && selectedConversation) {
      loadMoreMessages();
    }
  }, [hasMore, loadingMore, selectedConversation]);

  const getOtherParticipant = conv =>
    conv.participants?.find(
      p =>
        p.user_id?._id?.toString() !== user?._id?.toString() &&
        p.user_id?.toString() !== user?._id?.toString()
    );

  const getConversationName = conv => {
    if (conv.isGroup) return conv.name || 'Group Chat';
    const other = getOtherParticipant(conv);
    return other?.user_id?.brandName || other?.user_id?.displayName || other?.user_id?.fullName || 'Brand';
  };

  const getConversationAvatar = conv => {
    const other = getOtherParticipant(conv);
    return other?.user_id?.profilePicture || 'https://via.placeholder.com/40';
  };

  const isUserOnline = conv => {
    const other = getOtherParticipant(conv);
    const otherId = other?.user_id?._id || other?.user_id;
    return otherId && onlineUsersState.has(otherId.toString());
  };

  const formatLastSeen = conv => {
    const other = getOtherParticipant(conv);
    if (!other?.user_id?.lastSeen) return 'Offline';
    return `Last seen ${formatDistanceToNow(new Date(other.user_id.lastSeen), { addSuffix: true })}`;
  };

  const handleArchive = async id => {
    try {
      await api.put(`/messages/conversations/${id}/archive`);
      toast.success('Archived');
      loadConversations();
      if (selectedConversation?._id === id) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch {
      toast.error('Failed to archive');
    }
  };

  const handleMute = async id => {
    try {
      await api.put(`/messages/conversations/${id}/mute`, {
        duration: 24 * 60 * 60 * 1000,
      });
      toast.success('Muted');
    } catch {
      toast.error('Failed');
    }
  };

  const handleUnmute = async id => {
    try {
      await api.put(`/messages/conversations/${id}/unmute`);
      toast.success('Unmuted');
    } catch {
      toast.error('Failed');
    }
  };

  const handlePin = async id => {
    try {
      await api.put(`/messages/conversations/${id}/pin`);
      toast.success('Pinned');
      loadConversations();
    } catch {
      toast.error('Failed');
    }
  };

  const handleUnpin = async id => {
    try {
      await api.put(`/messages/conversations/${id}/unpin`);
      toast.success('Unpinned');
      loadConversations();
    } catch {
      toast.error('Failed');
    }
  };

  const handleBlock = async userId => {
    try {
      await api.post(`/messages/block/${userId}`);
      toast.success('User blocked');
      loadConversations();
      setSelectedConversation(null);
      setMessages([]);
    } catch {
      toast.error('Failed to block');
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const name = getConversationName(conv).toLowerCase();
    const matchSearch = !searchQuery || name.includes(searchQuery.toLowerCase());
    if (filter === 'unread') return matchSearch && conv.unreadCount > 0;
    if (filter === 'deals') return matchSearch && conv.deal_id;
    if (filter === 'pinned') return matchSearch && conv.metadata?.is_pinned;
    return matchSearch;
  });

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <div className={`h-[calc(100vh-100px)] rounded-xl shadow-sm flex overflow-hidden border ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
      {!onlineStatus && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-500 text-white text-center py-1 text-sm z-50 flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" /> You are offline.
        </div>
      )}

      {/* Conversations List */}
      <div className={`w-1/3 border-r flex flex-col ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
        <div className={`p-4 border-b ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Messages</h2>
            {totalUnread > 0 && (
              <span className={`${isDark ? 'bg-[#667eea]/20 text-[#667eea]' : 'bg-[#667eea]/10 text-[#667eea]'} text-xs font-medium px-2.5 py-1 rounded-full`}>
                {totalUnread} unread
              </span>
            )}
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
            />
          </div>
          <div className="flex gap-2">
            {['all', 'unread', 'deals', 'pinned'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full capitalize ${
                  filter === f
                    ? 'bg-[#667eea] text-white'
                    : isDark 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f}
                {f === 'unread' && totalUnread > 0 && (
                  <span
                    className={`ml-1 rounded-full w-4 h-4 inline-flex items-center justify-center text-xs ${
                      filter === 'unread'
                        ? 'bg-white text-[#667eea]'
                        : 'bg-[#667eea] text-white'
                    }`}
                  >
                    {totalUnread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader className="w-8 h-8 animate-spin text-[#667eea]" />
            </div>
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map(conv => {
              const isSelected = selectedConversation?._id === conv._id;
              return (
                <div
                  key={conv._id}
                  onClick={() => selectConversation(conv)}
                  className={`p-4 border-b cursor-pointer transition-all ${
                    isSelected 
                      ? isDark ? 'bg-gray-700 shadow-sm' : 'bg-white shadow-sm'
                      : isDark ? 'hover:bg-gray-700' : 'hover:bg-white'
                  } ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <img
                        src={getConversationAvatar(conv)}
                        alt={getConversationName(conv)}
                        className={`w-12 h-12 rounded-full object-cover ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`}
                      />
                      {isUserOnline(conv) && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className={`font-bold truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                          {conv.deal_id?.campaignId?.title || conv.campaign_id?.title || getConversationName(conv)}
                        </h3>
                        {conv.lastMessageAt && (
                          <span className={`text-xs whitespace-nowrap ml-2 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                            {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      <div className={`text-xs font-medium mb-1 truncate ${isDark ? 'text-[#667eea]' : 'text-[#667eea]'}`}>
                        Partner: {getConversationName(conv)}
                      </div>
                      <p className={`text-sm truncate italic ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {conv.lastMessage?.senderId?._id === user?._id || conv.lastMessage?.senderId === user?._id ? 'You: ' : ''}
                        {conv.lastMessage?.contentType === 'deal_offer'
                          ? '💰 Deal offer'
                          : conv.lastMessage?.content ||
                            (conv.lastMessage?.attachments?.length > 0
                              ? '📷 Photo'
                              : 'No messages yet')}
                      </p>
                      {conv.deal_id && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block inline-flex items-center gap-1 ${getDealStatusDisplay(conv.deal_id.status).statusClass}`}
                        >
                          {React.createElement(getDealStatusDisplay(conv.deal_id.status).StatusIcon, { className: `w-3 h-3 ${getDealStatusDisplay(conv.deal_id.status).iconColor}` })}
                          ${conv.deal_id.budget} · {conv.deal_id.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className={`text-center py-12 px-4 ${isDark ? 'bg-gray-800' : ''}`}>
              <MessageSquare className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <h3 className={`text-base font-medium mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>No conversations</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Start collaborating with creators</p>
              <Link
                to="/brand/search"
                className="mt-4 inline-flex items-center px-4 py-2 bg-[#667eea] text-white text-sm font-medium rounded-lg hover:bg-[#5a67d8] transition-colors"
              >
                Find Creators
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        {selectedConversation ? (
          <>
            <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={getConversationAvatar(selectedConversation)}
                    alt={getConversationName(selectedConversation)}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  {isUserOnline(selectedConversation) && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {getConversationName(selectedConversation)}
                  </h3>
                  <span
                    className={`text-xs ${
                      typingUsersState[selectedConversation._id]
                        ? 'text-[#667eea] animate-pulse'
                        : isUserOnline(selectedConversation)
                        ? isDark ? 'text-green-400' : 'text-green-600'
                        : isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  >
                    {typingUsersState[selectedConversation._id]
                      ? `${typingUsersState[selectedConversation._id].fullName} is typing...`
                      : isUserOnline(selectedConversation)
                      ? '● Online'
                      : formatLastSeen(selectedConversation)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedConversation.deal_id && (
                  <button
                    onClick={() => {
                      setDealDetails(selectedConversation.deal_id);
                      setShowDealModal(true);
                    }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 ${
                    isDark 
                      ? 'bg-[#667eea]/20 text-[#667eea] hover:bg-[#667eea]/30'
                      : 'bg-[#667eea]/10 text-[#667eea] hover:bg-[#667eea]/20'
                  }`}
                  >
                    <Briefcase className="w-4 h-4" /> View Deal
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedConvSettings(selectedConversation);
                    setShowSettingsModal(true);
                  }}
                  className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <MoreVertical className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                </button>
              </div>
            </div>

            {selectedConversation.deal_id && (
              <div className={`px-4 py-2 border-b flex items-center justify-between ${
                isDark 
                  ? 'bg-gradient-to-r from-indigo-900 to-purple-900 border-indigo-800'
                  : 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100'
              }`}>
                <div className="flex items-center gap-4">
                  <Briefcase className={`w-4 h-4 ${isDark ? 'text-[#667eea]' : 'text-[#667eea]'}`} />
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="font-medium">Deal:</span>{' '}
                    {selectedConversation.deal_id.campaignId?.title || 'Campaign'}
                  </span>
                  <span className={`text-sm font-medium ${isDark ? 'text-[#667eea]' : 'text-[#667eea]'}`}>
                    ${selectedConversation.deal_id.budget}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${getDealStatusDisplay(selectedConversation.deal_id.status).statusClass}`}
                  >
                    {React.createElement(getDealStatusDisplay(selectedConversation.deal_id.status).StatusIcon, { className: `w-3 h-3 ${getDealStatusDisplay(selectedConversation.deal_id.status).iconColor}` })}
                    {selectedConversation.deal_id.status}
                  </span>
                </div>
                <Link
                  to={`/brand/deals/${selectedConversation.deal_id._id}`}
                  className={`text-xs font-medium ${
                    isDark ? 'text-[#667eea] hover:text-[#667eea]/80' : 'text-[#667eea] hover:text-[#5a67d8]'
                  }`}
                >
                  View Details
                </Link>
              </div>
            )}

            <div
              ref={messageContainerRef}
              onScroll={handleScroll}
              className={`flex-1 overflow-y-auto p-4 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}
            >
              {loadingMore && (
                <div className="flex justify-center py-2">
                  <Loader className="w-5 h-5 animate-spin text-[#667eea]" />
                </div>
              )}
              {messages.map(msg => (
                <MessageBubble
                  key={msg._id}
                  message={msg}
                  isOwn={
                    msg.senderId?._id?.toString() === user?._id?.toString() ||
                    msg.senderId?.toString() === user?._id?.toString()
                  }
                  onReaction={addReaction}
                  onDelete={deleteMessage}
                  onReply={setReplyingTo}
                />
              ))}
              {typingUsersState[selectedConversation._id] && (
                <div className={`flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`}>
                    <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>...</span>
                  </div>
                  <div className={`rounded-2xl px-4 py-2 shadow-sm ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
                    <div className="flex space-x-1">
                      {[0, 150, 300].map(d => (
                        <div
                          key={d}
                          className={`w-2 h-2 rounded-full animate-bounce ${isDark ? 'bg-gray-400' : 'bg-gray-400'}`}
                          style={{ animationDelay: `${d}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {replyingTo && (
              <div className={`px-4 py-2 border-t flex items-center justify-between ${
                isDark 
                  ? 'bg-indigo-900 border-indigo-800'
                  : 'bg-indigo-50 border-indigo-100'
              }`}>
                <div className="flex items-center gap-2">
                  <Reply className={`w-4 h-4 ${isDark ? 'text-[#667eea]' : 'text-[#667eea]'}`} />
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Replying to: {replyingTo.content?.substring(0, 50)}
                    {replyingTo.content?.length > 50 ? '...' : ''}
                  </span>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className={`${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {attachments.length > 0 && (
              <div className={`px-4 py-2 border-t flex flex-wrap gap-2 ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                {attachments.map((f, i) => (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100'}`}>
                    <FileText className="w-3 h-3" />
                    <span>{f.name}</span>
                    <button
                      onClick={() => removeAttachment(i)}
                      className={`${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className={`p-4 border-t ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    rows="1"
                    value={messageInput}
                    onChange={e => handleTyping(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={uploading ? 'Uploading...' : 'Type your message...'}
                    disabled={uploading || !onlineStatus}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none max-h-32 disabled:opacity-50 ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 disabled:bg-gray-800'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 disabled:bg-gray-100'
                    }`}
                    style={{ minHeight: '48px' }}
                  />
                  <div className="absolute right-2 bottom-2 flex items-center gap-1">
                    <label className={`cursor-pointer p-1.5 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="image/*"
                      />
                      <Paperclip className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    </label>
                    <button
                      className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      <Smile className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                      {showEmojiPicker && (
                        <div className="absolute bottom-12 right-0 z-50">
                          <EmojiPicker
                            onEmojiClick={e => {
                              setMessageInput(prev => prev + e.emoji);
                              setShowEmojiPicker(false);
                            }}
                          />
                        </div>
                      )}
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={
                    (!messageInput.trim() && attachments.length === 0) || uploading || !onlineStatus
                  }
                  className="px-4 py-3 bg-[#667eea] text-white rounded-lg hover:bg-[#5a67d8] disabled:opacity-50 transition-colors"
                >
                  {uploading ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
              {!onlineStatus && (
                <p className={`text-xs mt-2 flex items-center gap-1 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  <WifiOff className="w-3 h-3" /> You're offline.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-sm px-4">
              <div className="w-20 h-20 bg-[#667eea]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-10 h-10 text-[#667eea]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Your Messages</h3>
              <p className="text-gray-600 mb-6">Select a conversation to start chatting</p>
              <div className="bg-indigo-50 rounded-lg p-4 text-sm text-indigo-800">
                <p className="font-medium mb-1">💡 Pro Tips</p>
                <ul className="text-left space-y-1">
                  <li>• Respond quickly to build strong relationships</li>
                  <li>• Share campaign briefs clearly</li>
                  <li>• Use attachments to share images and creative assets</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Deal Modal */}
      <Modal isOpen={showDealModal} onClose={() => setShowDealModal(false)} title="Deal Details">
        {dealDetails && (
          <div className="space-y-4">
            <div className="bg-[#667eea]/10 p-4 rounded-lg">
              <p className="text-sm text-[#667eea] mb-1">Campaign</p>
              <p className="font-semibold text-gray-900">{dealDetails.campaignId?.title || 'Campaign'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Budget</p>
                <p className="text-lg font-bold">${dealDetails.budget}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <span
                  className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 ${getDealStatusDisplay(dealDetails.status).statusClass}`}
                >
                  {React.createElement(getDealStatusDisplay(dealDetails.status).StatusIcon, { className: `w-3 h-3 ${getDealStatusDisplay(dealDetails.status).iconColor}` })}
                  {dealDetails.status}
                </span>
              </div>
            </div>
            <Link
              to={`/brand/deals/${dealDetails._id}`}
              className="block w-full bg-[#667eea] text-white py-2 rounded-lg text-sm font-medium text-center hover:bg-[#5a67d8] transition-colors"
              onClick={() => setShowDealModal(false)}
            >
              Manage Deal
            </Link>
          </div>
        )}
      </Modal>

      {/* Conversation Settings Modal */}
      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="Conversation Settings"
      >
        {selectedConvSettings && (
          <div className="space-y-2">
            {[
              { label: 'Pin', icon: Pin, action: () => handlePin(selectedConvSettings._id) },
              { label: 'Archive', icon: Archive, action: () => handleArchive(selectedConvSettings._id) },
              { label: 'Mute', icon: BellOff, action: () => handleMute(selectedConvSettings._id) },
              { label: 'Unmute', icon: Bell, action: () => handleUnmute(selectedConvSettings._id) },
            ].map(({ label, icon: Icon, action }) => (
              <button
                key={label}
                onClick={() => {
                  action();
                  setShowSettingsModal(false);
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg text-left"
              >
                <Icon className="w-5 h-5 text-gray-600" />
                <span>{label}</span>
              </button>
            ))}
            <button
              onClick={() => {
                handleBlock(
                  getOtherParticipant(selectedConvSettings)?.user_id?._id ||
                    getOtherParticipant(selectedConvSettings)?.user_id
                );
                setShowSettingsModal(false);
              }}
              className="w-full flex items-center gap-3 p-3 hover:bg-red-50 rounded-lg text-left text-red-600"
            >
              <XCircle className="w-5 h-5" />
              <span>Block User</span>
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BrandInbox;