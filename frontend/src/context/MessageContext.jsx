import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const MessageContext = createContext();

export const useMessage = () => {
  const context = React.useContext(MessageContext);
  if (!context) throw new Error('useMessage must be used within a MessageProvider');
  return context;
};

export const MessageProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { socket, isConnected, sendMessage: sendSocketMessage } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  const messageCache = useRef(new Map());

  // ================= OFFLINE QUEUE =================
  const addToOfflineQueue = useCallback((item) => {
    setOfflineQueue(prev => [...prev, { ...item, id: `temp-${Date.now()}` }]);
  }, []);

  const processOfflineQueue = useCallback(async () => {
    if (!offlineQueue.length || !isConnected || isProcessingQueue) return;

    setIsProcessingQueue(true);
    const queue = [...offlineQueue];
    setOfflineQueue([]);

    for (const item of queue) {
      try {
        if (item.type === 'message') {
          await api.post(`/messages/conversations/${item.data.conversationId}`, item.data);
        } else if (item.type === 'reaction') {
          await api.post(`/messages/${item.data.messageId}/reactions`, { reaction: item.data.reaction });
        } else if (item.type === 'read') {
          await api.put(`/messages/conversations/${item.data.conversationId}/read`, {
            messageIds: item.data.messageIds,
          });
        } else if (item.type === 'delete') {
          await api.delete(`/messages/${item.data.messageId}`);
        } else if (item.type === 'edit') {
          await api.put(`/messages/${item.data.messageId}`, { content: item.data.content });
        }
      } catch {
        setOfflineQueue(prev => [...prev, item]);
      }
    }

    setIsProcessingQueue(false);
  }, [offlineQueue, isConnected, isProcessingQueue]);

  // ================= SEND MESSAGE =================
  const sendMessage = useCallback(async (conversationId, content, attachments = []) => {
    if (!content.trim() && !attachments.length) return;

    const tempId = `temp-${Date.now()}`;

    const optimistic = {
      _id: tempId,
      conversationId,
      content,
      attachments,
      senderId: user,
      createdAt: new Date(),
      status: 'sending',
      isOptimistic: true,
    };

    setMessages(prev => [...prev, optimistic]);

    try {
      if (isConnected) {
        sendSocketMessage({ conversationId, content, attachments });

        setTimeout(() => {
          setMessages(prev =>
            prev.map(m => (m._id === tempId ? { ...m, status: 'sent' } : m))
          );
        }, 500);
      } else {
        throw new Error('Socket not connected');
      }
    } catch {
      addToOfflineQueue({ type: 'message', data: { conversationId, content, attachments } });
      setMessages(prev =>
        prev.map(m => (m._id === tempId ? { ...m, status: 'queued' } : m))
      );
      toast.warning('Message queued (offline mode)');
    }
  }, [user, isConnected, sendSocketMessage, addToOfflineQueue]);

  // ================= FETCH CONVERSATIONS =================
  const fetchConversations = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/messages/conversations');
      const data = res.data?.data || [];

      setConversations(data);
      const totalUnread = data.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
      setUnreadCount(totalUnread);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to load conversations';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // ================= FETCH MESSAGES =================
  const fetchMessages = useCallback(async (conversationId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/messages/conversations/${conversationId}`);
      const msgs = res.data?.data?.messages || [];

      setMessages(msgs);
      messageCache.current.set(conversationId, msgs);
      return msgs;
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to load messages';
      setError(msg);
      toast.error(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ================= MARK MESSAGES AS READ =================
  const markMessagesAsRead = useCallback(async (conversationId, messageIds) => {
    try {
      if (isConnected) {
        await api.put(`/messages/conversations/${conversationId}/read`, { messageIds });
      } else {
        addToOfflineQueue({ type: 'read', data: { conversationId, messageIds } });
      }

      setMessages(prev =>
        prev.map(m =>
          messageIds.includes(m._id)
            ? { ...m, readBy: [...(m.readBy || []), { userId: user?._id, readAt: new Date() }] }
            : m
        )
      );
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }, [isConnected, user, addToOfflineQueue]);

  // ================= SELECT CONVERSATION =================
  const selectConversation = useCallback(async (conv) => {
    setCurrentConversation(conv);

    const msgs = await fetchMessages(conv._id);

    const unread = msgs
      ?.filter(m => m.senderId?._id !== user?._id && !m.readBy?.some(r => r.userId === user?._id))
      .map(m => m._id);

    if (unread?.length) {
      markMessagesAsRead(conv._id, unread);
    }

    // Update conversation list to mark as read
    setConversations(prev =>
      prev.map(c =>
        c._id === conv._id ? { ...c, unreadCount: 0 } : c
      )
    );
    setUnreadCount(prev => Math.max(0, prev - (unread?.length || 0)));
  }, [user, fetchMessages, markMessagesAsRead]);

  // ================= ADD REACTION =================
  const addReaction = useCallback(async (messageId, reaction) => {
    try {
      if (isConnected) {
        await api.post(`/messages/${messageId}/reactions`, { reaction });
      } else {
        addToOfflineQueue({ type: 'reaction', data: { messageId, reaction } });
      }

      setMessages(prev =>
        prev.map(msg => {
          if (msg._id === messageId) {
            const existing = msg.reactions || [];
            const filtered = existing.filter(r => r.userId !== user?._id);
            return {
              ...msg,
              reactions: [...filtered, { userId: user?._id, reaction, createdAt: new Date() }],
            };
          }
          return msg;
        })
      );
    } catch (err) {
      toast.error('Failed to add reaction');
    }
  }, [isConnected, user, addToOfflineQueue]);

  // ================= DELETE MESSAGE =================
  const deleteMessage = useCallback(async (messageId) => {
    try {
      if (isConnected) {
        await api.delete(`/messages/${messageId}`);
      } else {
        addToOfflineQueue({ type: 'delete', data: { messageId } });
      }

      setMessages(prev =>
        prev.map(m =>
          m._id === messageId
            ? { ...m, isDeleted: true, content: 'This message has been deleted', attachments: [] }
            : m
        )
      );
    } catch (err) {
      toast.error('Failed to delete message');
    }
  }, [isConnected, addToOfflineQueue]);

  // ================= EDIT MESSAGE =================
  const editMessage = useCallback(async (messageId, content) => {
    try {
      if (isConnected) {
        await api.put(`/messages/${messageId}`, { content });
      } else {
        addToOfflineQueue({ type: 'edit', data: { messageId, content } });
      }

      setMessages(prev =>
        prev.map(m =>
          m._id === messageId
            ? { ...m, content, isEdited: true }
            : m
        )
      );
    } catch (err) {
      toast.error('Failed to edit message');
    }
  }, [isConnected, addToOfflineQueue]);

  // ================= CREATE CONVERSATION =================
  const createConversation = useCallback(async (participantId, initialMessage = '') => {
    try {
      setLoading(true);
      const res = await api.post('/messages/conversations', { participantId, initialMessage });

      if (res.data?.success) {
        const newConv = res.data.data;
        setConversations(prev => [newConv, ...prev]);
        await selectConversation(newConv);
        return { success: true, conversation: newConv };
      }
      return { success: false, error: res.data?.error || 'Failed to create conversation' };
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to start conversation';
      toast.error(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [selectConversation]);

  // ================= ARCHIVE CONVERSATION =================
  const archiveConversation = useCallback(async (conversationId) => {
    try {
      const res = await api.put(`/messages/conversations/${conversationId}/archive`);

      if (res.data?.success) {
        setConversations(prev => prev.filter(c => c._id !== conversationId));
        if (currentConversation?._id === conversationId) {
          setCurrentConversation(null);
          setMessages([]);
        }
        toast.success('Conversation archived');
        return { success: true };
      }
      return { success: false, error: res.data?.error || 'Failed to archive' };
    } catch (err) {
      toast.error('Failed to archive conversation');
      return { success: false, error: err.message };
    }
  }, [currentConversation]);

  // ================= MUTE CONVERSATION =================
  const muteConversation = useCallback(async (conversationId, duration) => {
    try {
      const res = await api.put(`/messages/conversations/${conversationId}/mute`, { duration });
      if (res.data?.success) {
        toast.success('Conversation muted');
        return { success: true };
      }
      return { success: false, error: res.data?.error || 'Failed to mute' };
    } catch (err) {
      toast.error('Failed to mute conversation');
      return { success: false, error: err.message };
    }
  }, []);

  // ================= UNMUTE CONVERSATION =================
  const unmuteConversation = useCallback(async (conversationId) => {
    try {
      const res = await api.put(`/messages/conversations/${conversationId}/unmute`);
      if (res.data?.success) {
        toast.success('Conversation unmuted');
        return { success: true };
      }
      return { success: false, error: res.data?.error || 'Failed to unmute' };
    } catch (err) {
      toast.error('Failed to unmute conversation');
      return { success: false, error: err.message };
    }
  }, []);

  // ================= SEARCH MESSAGES =================
  const searchMessages = useCallback(async (query) => {
    try {
      const res = await api.get('/messages/search', { params: { q: query } });
      if (res.data?.success) {
        return { success: true, results: res.data.data };
      }
      return { success: false, error: res.data?.error || 'Search failed' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // ================= GET UNREAD COUNT =================
  const refreshUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/messages/unread');
      if (res.data?.success) {
        setUnreadCount(res.data.data.totalUnread || 0);
        return res.data.data.totalUnread;
      }
      return 0;
    } catch (err) {
      console.error('Error fetching unread count:', err);
      return 0;
    }
  }, []);

  // ================= UPLOAD ATTACHMENTS =================
  const uploadAttachments = useCallback(async (files) => {
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      const res = await api.post('/messages/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        return { success: true, files: res.data.data };
      }
      return { success: false, error: res.data?.error || 'Upload failed' };
    } catch (err) {
      toast.error('Failed to upload files');
      return { success: false, error: err.message };
    }
  }, []);

  // ================= SOCKET EVENT HANDLERS =================
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      setMessages(prev => prev.filter(m => !m._id.startsWith('temp-')).concat(message));

      setConversations(prev =>
        prev.map(c =>
          c._id === message.conversationId
            ? { ...c, lastMessage: message, lastMessageAt: new Date() }
            : c
        )
      );

      if (currentConversation?._id === message.conversationId && message.senderId?._id !== user?._id) {
        markMessagesAsRead(message.conversationId, [message._id]);
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('messages_read', ({ messageIds, userId: readerId, conversationId }) => {
      if (currentConversation?._id === conversationId) {
        setMessages(prev =>
          prev.map(msg =>
            messageIds.includes(msg._id)
              ? { ...msg, readBy: [...(msg.readBy || []), { userId: readerId, readAt: new Date() }] }
              : msg
          )
        );
      }
    });
    socket.on('message_reaction', ({ messageId, userId: reactorId, reaction, conversationId }) => {
      if (currentConversation?._id === conversationId) {
        setMessages(prev =>
          prev.map(msg =>
            msg._id === messageId
              ? {
                  ...msg,
                  reactions: [
                    ...(msg.reactions || []).filter(r => r.userId !== reactorId),
                    { userId: reactorId, reaction, createdAt: new Date() },
                  ],
                }
              : msg
          )
        );
      }
    });
    socket.on('message_edited', ({ messageId, content, conversationId }) => {
      if (currentConversation?._id === conversationId) {
        setMessages(prev =>
          prev.map(msg =>
            msg._id === messageId ? { ...msg, content, isEdited: true } : msg
          )
        );
      }
    });
    socket.on('message_deleted', ({ messageId, conversationId }) => {
      if (currentConversation?._id === conversationId) {
        setMessages(prev =>
          prev.map(msg =>
            msg._id === messageId
              ? { ...msg, isDeleted: true, content: 'This message has been deleted', attachments: [] }
              : msg
          )
        );
      }
    });

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('messages_read');
      socket.off('message_reaction');
      socket.off('message_edited');
      socket.off('message_deleted');
    };
  }, [socket, currentConversation, user, markMessagesAsRead]);

  // ================= PROCESS OFFLINE QUEUE =================
  useEffect(() => {
    if (isConnected && offlineQueue.length) {
      processOfflineQueue();
    }
  }, [isConnected, offlineQueue, processOfflineQueue]);

  // ================= INITIAL FETCH =================
  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
    }
  }, [isAuthenticated, fetchConversations]);

  const value = {
    conversations,
    currentConversation,
    messages,
    loading,
    error,
    unreadCount,
    sendMessage,
    fetchMessages,
    fetchConversations,
    selectConversation,
    markMessagesAsRead,
    addReaction,
    deleteMessage,
    editMessage,
    createConversation,
    archiveConversation,
    muteConversation,
    unmuteConversation,
    searchMessages,
    refreshUnreadCount,
    uploadAttachments,
    setCurrentConversation,
  };

  return (
    <MessageContext.Provider value={value}>
      {children}
    </MessageContext.Provider>
  );
};

export default MessageContext;