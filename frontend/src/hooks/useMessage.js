// hooks/useMessage.js - COMPLETE FIXED VERSION
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import api from '../config/api';
import toast from 'react-hot-toast';
import io from 'socket.io-client';

export const useMessage = () => {
  const { user, token } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // ==================== SOCKET CONNECTION ====================
  useEffect(() => {
    if (!user || !token) return;

    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    
    // Initialize socket connection
    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    // Connection events
    socketRef.current.on('connect', () => {
      console.log('🔌 Socket connected');
      setIsConnected(true);
      
      // Join user's room
      socketRef.current.emit('user:online', { userId: user._id });
    });

    socketRef.current.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setIsConnected(false);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    // New message received
    socketRef.current.on('message:new', (message) => {
      handleNewMessage(message);
    });

    // Message delivered
    socketRef.current.on('message:delivered', ({ messageId }) => {
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? { ...msg, delivered: true } : msg
      ));
    });

    // Message read receipt
    socketRef.current.on('message:read-receipt', ({ messageIds, userId, conversationId }) => {
      if (currentConversation?._id === conversationId) {
        setMessages(prev => prev.map(msg => 
          messageIds.includes(msg._id) 
            ? { ...msg, readBy: [...(msg.readBy || []), { userId, readAt: new Date() }] }
            : msg
        ));
      }
    });

    // Message reaction
    socketRef.current.on('message:reaction', ({ messageId, userId, reaction, conversationId }) => {
      if (currentConversation?._id === conversationId) {
        setMessages(prev => prev.map(msg => {
          if (msg._id === messageId) {
            const existingReactions = msg.reactions || [];
            const filtered = existingReactions.filter(r => r.userId !== userId);
            return {
              ...msg,
              reactions: [...filtered, { userId, reaction, createdAt: new Date() }]
            };
          }
          return msg;
        }));
      }
    });

    // Message edited
    socketRef.current.on('message:edited', ({ messageId, content, conversationId, editedAt }) => {
      if (currentConversation?._id === conversationId) {
        setMessages(prev => prev.map(msg => 
          msg._id === messageId 
            ? { ...msg, content, isEdited: true, updatedAt: editedAt }
            : msg
        ));
      }
    });

    // Message deleted
    socketRef.current.on('message:deleted', ({ messageId, conversationId }) => {
      if (currentConversation?._id === conversationId) {
        setMessages(prev => prev.map(msg => 
          msg._id === messageId 
            ? { ...msg, isDeleted: true, content: 'This message has been deleted', attachments: [] }
            : msg
        ));
      }
    });

    // Typing indicators
    socketRef.current.on('typing:update', ({ userId, fullName, isTyping, conversationId }) => {
      if (currentConversation?._id === conversationId && userId !== user?._id) {
        setTypingUsers(prev => ({
          ...prev,
          [conversationId]: isTyping ? { userId, fullName } : null
        }));
      }
    });

    // User online/offline
    socketRef.current.on('user:online', ({ userId }) => {
      setOnlineUsers(prev => new Set([...prev, userId]));
    });

    socketRef.current.on('user:offline', ({ userId }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user, token, currentConversation]);

  // ==================== HANDLE NEW MESSAGE ====================
  const handleNewMessage = (message) => {
    // Update messages if in current conversation
    if (currentConversation?._id === message.conversationId) {
      setMessages(prev => [...prev, message]);
      
      // Mark as read
      markMessagesAsRead(message.conversationId, [message._id]);
    }

    // Update conversation list
    setConversations(prev => {
      const updated = prev.map(conv => 
        conv._id === message.conversationId
          ? {
              ...conv,
              lastMessage: message,
              lastMessageAt: new Date(),
              unreadCount: message.senderId?._id !== user?._id 
                ? (conv.unreadCount || 0) + 1 
                : conv.unreadCount
            }
          : conv
      );
      
      // Sort by latest message
      return updated.sort((a, b) => 
        new Date(b.lastMessageAt || b.updatedAt) - 
        new Date(a.lastMessageAt || a.updatedAt)
      );
    });

    // Show notification if not current conversation
    if (currentConversation?._id !== message.conversationId && 
        message.senderId?._id !== user?._id) {
      toast.success(`New message from ${message.senderId?.fullName || 'User'}`, {
        icon: '💬',
        duration: 4000
      });
    }
  };

  // ==================== FETCH CONVERSATIONS ====================
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/messages/conversations');
      
      if (response.data?.success) {
        setConversations(response.data.data || []);
        
        // Calculate unread count
        const unread = (response.data.data || []).reduce(
          (acc, conv) => acc + (conv.unreadCount || 0), 0
        );
        setUnreadCount(unread);
        
        return { success: true, conversations: response.data.data };
      }
      return { success: false };
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== FETCH MESSAGES ====================
  const fetchMessages = useCallback(async (conversationId, page = 1) => {
    try {
      setLoading(true);
      const response = await api.get(`/messages/conversations/${conversationId}`, {
        params: { page, limit: 50 }
      });
      
      if (response.data?.success) {
        const newMessages = response.data.data.messages || [];
        
        if (page === 1) {
          setMessages(newMessages);
        } else {
          setMessages(prev => [...newMessages, ...prev]);
        }
        
        // Mark as read
        await markMessagesAsRead(conversationId);
        
        return {
          success: true,
          messages: newMessages,
          hasMore: response.data.data.pagination?.hasMore || false,
          page
        };
      }
      return { success: false };
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== SELECT CONVERSATION ====================
  const selectConversation = useCallback(async (conversation) => {
    if (!socketRef.current || !isConnected) {
      toast.error('Chat service not connected');
      return;
    }

    // Leave previous conversation
    if (currentConversation) {
      socketRef.current.emit('conversation:leave', currentConversation._id);
    }

    setCurrentConversation(conversation);
    setMessages([]);
    
    // Join new conversation
    socketRef.current.emit('conversation:join', conversation._id);
    
    // Load messages
    await fetchMessages(conversation._id, 1);
    
    // Mark as read
    await markMessagesAsRead(conversation._id);
  }, [currentConversation, fetchMessages, isConnected]);

  // ==================== SEND MESSAGE ====================
  const sendMessage = useCallback(async (content, attachments = [], repliedTo = null) => {
    if (!currentConversation) {
      toast.error('No conversation selected');
      return { success: false };
    }

    if (!content.trim() && (!attachments || attachments.length === 0)) {
      return { success: false };
    }

    if (!socketRef.current || !isConnected) {
      toast.error('Chat service not connected');
      return { success: false };
    }

    try {
      const messageData = {
        conversationId: currentConversation._id,
        content,
        attachments,
        repliedTo,
        dealId: currentConversation.dealId?._id
      };

      socketRef.current.emit('message:send', messageData);
      
      // Stop typing indicator
      stopTyping();
      
      return { success: true };
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return { success: false, error: error.message };
    }
  }, [currentConversation, isConnected]);

  // ==================== START TYPING ====================
  const startTyping = useCallback(() => {
    if (!currentConversation || !socketRef.current || !isConnected) return;
    
    socketRef.current.emit('typing:start', { 
      conversationId: currentConversation._id 
    });
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [currentConversation, isConnected]);

  // ==================== STOP TYPING ====================
  const stopTyping = useCallback(() => {
    if (!currentConversation || !socketRef.current || !isConnected) return;
    
    socketRef.current.emit('typing:stop', { 
      conversationId: currentConversation._id 
    });
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [currentConversation, isConnected]);

  // ==================== MARK MESSAGES AS READ ====================
  const markMessagesAsRead = useCallback(async (conversationId, messageIds = null) => {
    if (!currentConversation || currentConversation._id !== conversationId) return;

    const unreadMessages = messageIds || messages
      .filter(msg => 
        msg.senderId?._id !== user?._id && 
        !msg.readBy?.some(r => r.userId === user?._id)
      )
      .map(msg => msg._id);

    if (unreadMessages.length > 0 && socketRef.current && isConnected) {
      socketRef.current.emit('message:read', { 
        conversationId, 
        messageIds: unreadMessages 
      });
      
      // Update local state
      setMessages(prev => prev.map(msg => 
        unreadMessages.includes(msg._id)
          ? { 
              ...msg, 
              readBy: [...(msg.readBy || []), { 
                userId: user?._id, 
                readAt: new Date() 
              }] 
            }
          : msg
      ));
      
      // Update conversation unread count
      setConversations(prev => prev.map(c => 
        c._id === conversationId ? { ...c, unreadCount: 0 } : c
      ));
    }
  }, [currentConversation, messages, user, isConnected]);

  // ==================== ADD REACTION ====================
  const addReaction = useCallback((messageId, reaction) => {
    if (!socketRef.current || !isConnected) return;
    
    socketRef.current.emit('message:react', { messageId, reaction });
  }, [isConnected]);

  // ==================== DELETE MESSAGE ====================
  const deleteMessage = useCallback((messageId) => {
    if (!socketRef.current || !isConnected) return;
    
    socketRef.current.emit('message:delete', { messageId });
  }, [isConnected]);

  // ==================== CREATE CONVERSATION ====================
  const createConversation = useCallback(async (participantId, initialMessage = '') => {
    try {
      setLoading(true);
      const response = await api.post('/messages/conversations', {
        participantId,
        initialMessage
      });
      
      if (response.data?.success) {
        const newConversation = response.data.data;
        setConversations(prev => [newConversation, ...prev]);
        
        // Select the new conversation
        await selectConversation(newConversation);
        
        return { success: true, conversation: newConversation };
      }
      return { success: false };
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to start conversation');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [selectConversation]);

  // ==================== ARCHIVE CONVERSATION ====================
  const archiveConversation = useCallback(async (conversationId) => {
    try {
      const response = await api.put(`/messages/conversations/${conversationId}/archive`);
      
      if (response.data?.success) {
        setConversations(prev => prev.filter(c => c._id !== conversationId));
        
        if (currentConversation?._id === conversationId) {
          setCurrentConversation(null);
          setMessages([]);
        }
        
        toast.success('Conversation archived');
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      console.error('Error archiving conversation:', error);
      toast.error('Failed to archive conversation');
      return { success: false, error: error.message };
    }
  }, [currentConversation]);

  // ==================== MUTE CONVERSATION ====================
  const muteConversation = useCallback(async (conversationId) => {
    try {
      const response = await api.put(`/messages/conversations/${conversationId}/mute`);
      
      if (response.data?.success) {
        toast.success('Conversation muted');
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      console.error('Error muting conversation:', error);
      toast.error('Failed to mute conversation');
      return { success: false, error: error.message };
    }
  }, []);

  // ==================== UNMUTE CONVERSATION ====================
  const unmuteConversation = useCallback(async (conversationId) => {
    try {
      const response = await api.put(`/messages/conversations/${conversationId}/unmute`);
      
      if (response.data?.success) {
        toast.success('Conversation unmuted');
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      console.error('Error unmuting conversation:', error);
      toast.error('Failed to unmute conversation');
      return { success: false, error: error.message };
    }
  }, []);

  // ==================== SEARCH MESSAGES ====================
  const searchMessages = useCallback(async (query) => {
    try {
      const response = await api.get('/messages/search', {
        params: { q: query }
      });
      
      if (response.data?.success) {
        return { success: true, results: response.data.data };
      }
      return { success: false };
    } catch (error) {
      console.error('Error searching messages:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // ==================== GET UNREAD COUNT ====================
  const refreshUnreadCount = useCallback(async () => {
    try {
      const response = await api.get('/messages/unread');
      
      if (response.data?.success) {
        setUnreadCount(response.data.data.totalUnread || 0);
        return response.data.data.totalUnread;
      }
      return 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }, []);

  // ==================== UPLOAD ATTACHMENTS ====================
  const uploadAttachments = useCallback(async (files) => {
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      
      const response = await api.post('/messages/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data?.success) {
        return { success: true, files: response.data.data };
      }
      return { success: false };
    } catch (error) {
      console.error('Error uploading attachments:', error);
      toast.error('Failed to upload files');
      return { success: false, error: error.message };
    }
  }, []);

  return {
    conversations,
    currentConversation,
    setCurrentConversation,
    messages,
    loading,
    unreadCount,
    isConnected,
    typingUsers,
    onlineUsers,
    fetchConversations,
    fetchMessages,
    selectConversation,
    sendMessage,
    startTyping,
    stopTyping,
    markMessagesAsRead,
    addReaction,
    deleteMessage,
    createConversation,
    archiveConversation,
    muteConversation,
    unmuteConversation,
    searchMessages,
    refreshUnreadCount,
    uploadAttachments
  };
};

export default useMessage;