// context/SocketContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import io from 'socket.io-client';
import toast from 'react-hot-toast';
import { getStorage } from '../utils/storage';

const SocketContext = createContext();

const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (typeof value._id === 'string') return value._id;
    if (typeof value.id === 'string') return value.id;
  }
  return String(value);
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [newMessage, setNewMessage] = useState(null);

  const socketRef = useRef(null);
  const connectErrorShownRef = useRef(false);
  const isCypressRun = typeof window !== 'undefined' && Boolean(window.Cypress);

  const resolveSocketUrl = useCallback(() => {
    const configured = import.meta.env.VITE_SOCKET_URL;
    if (configured) return configured;

    if (typeof window !== 'undefined') {
      if (import.meta.env.PROD) return window.location.origin;

      const host = window.location.hostname;
      const isLocalHost = host === 'localhost' || host === '127.0.0.1';
      if (!isLocalHost) {
        const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
        return `${protocol}//${host}:5000`;
      }
    }

    return 'http://localhost:5000';
  }, []);

  useEffect(() => {
    const disableSocket = isCypressRun || (typeof window !== 'undefined' && window.localStorage.getItem('disableSocket') === 'true');

    if (!user || !token || disableSocket) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const SOCKET_URL = resolveSocketUrl();
    socketRef.current = io(SOCKET_URL, {
      auth: { token, userId: user?._id },
      query: { userId: user?._id },
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setIsConnected(true);
      connectErrorShownRef.current = false;
    });
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', () => {
      if (!connectErrorShownRef.current && !isCypressRun) {
        toast.error('Cannot connect to chat server');
        connectErrorShownRef.current = true;
      }
    });

    // User presence
    socket.on('user:online', ({ userId }) => {
      setOnlineUsers(prev => new Set([...prev, userId]));
    });
    socket.on('user:offline', ({ userId }) => {
      setOnlineUsers(prev => {
        const s = new Set(prev);
        s.delete(userId);
        return s;
      });
    });

    // Messages – using underscore events (backend)
    socket.on('new_message', (msg) => {
      setNewMessage(msg);
      setUnreadCount(prev => prev + 1);
      const settings = getStorage('notificationSettings', {});
      if (settings.sound !== false && document.hidden && msg.senderId?._id !== user?._id) {
        new Audio('/sounds/message.mp3').play().catch(() => {});
      }
    });
    socket.on('messages_delivered', () => {});
    socket.on('messages_read', () => {});
    socket.on('message_reaction', () => {});
    socket.on('message_edited', () => {});
    socket.on('message_deleted', () => {});

    // Typing
    socket.on('typing:update', ({ userId, isTyping, conversationId }) => {
      setTypingUsers(prev => {
        const updated = { ...prev };
        if (isTyping) updated[conversationId] = { userId, isTyping: true };
        else delete updated[conversationId];
        return updated;
      });
    });

    // Notifications (colon style – backend uses 'notification:new')
    socket.on('notification:new', (notif) => {
      toast(notif.message, {
        icon: notif.priority === 'high' || notif.priority === 'urgent' ? '🔔' : '📬',
        duration: 4000
      });
      setUnreadCount(prev => prev + 1);
    });

    // Deal & payment events
    socket.on('deal:created', () => toast.success('New deal offer received! 💰'));
    socket.on('deal:updated', ({ status }) => toast(`Deal updated: ${status} 📝`));
    socket.on('deal:accepted', () => toast.success('Deal accepted! ✅'));
    socket.on('deal:completed', () => toast.success('Deal completed! 🎉'));
    socket.on('payment:received', ({ amount }) => toast.success(`Payment $${amount} received! 💰`));
    socket.on('payment:released', ({ amount }) => toast.success(`Payment $${amount} released! 💵`));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [user, token, isCypressRun, resolveSocketUrl]);

  const joinConversation = useCallback((conversationId) => {
    const normalizedConversationId = normalizeId(conversationId);
    if (!normalizedConversationId) return;
    socketRef.current?.emit('join_conversation', { conversationId: normalizedConversationId });
  }, []);

  const leaveConversation = useCallback((conversationId) => {
    const normalizedConversationId = normalizeId(conversationId);
    if (!normalizedConversationId) return;
    socketRef.current?.emit('leave_conversation', { conversationId: normalizedConversationId });
  }, []);

  const sendMessage = useCallback((data, onAck) => {
    if (!socketRef.current || !isConnected) return false;

    const normalizedConversationId = normalizeId(data?.conversationId);
    if (!normalizedConversationId) return false;

    const payload = {
      ...data,
      conversationId: normalizedConversationId,
      senderId: user?._id
    };

    if (typeof onAck === 'function') {
      socketRef.current.emit('send_message', payload, onAck);
    } else {
      socketRef.current.emit('send_message', payload);
    }

    return true;
  }, [user, isConnected]);

  const startTyping = useCallback((conversationId) => {
    const normalizedConversationId = normalizeId(conversationId);
    if (!normalizedConversationId) return;
    socketRef.current?.emit('typing:start', { conversationId: normalizedConversationId });
  }, []);

  const stopTyping = useCallback((conversationId) => {
    const normalizedConversationId = normalizeId(conversationId);
    if (!normalizedConversationId) return;
    socketRef.current?.emit('typing:stop', { conversationId: normalizedConversationId });
  }, []);

  const markAsRead = useCallback((conversationId, messageIds) => {
    const normalizedConversationId = normalizeId(conversationId);
    if (!normalizedConversationId || !Array.isArray(messageIds) || messageIds.length === 0) return;
    socketRef.current?.emit('mark_read', { conversationId: normalizedConversationId, messageIds });
  }, []);

  const addReaction = useCallback((messageId, reaction) => {
    socketRef.current?.emit('add_reaction', { messageId, reaction });
  }, []);

  const deleteMessage = useCallback((messageId) => {
    socketRef.current?.emit('delete_message', { messageId });
  }, []);

  const editMessage = useCallback((messageId, content) => {
    socketRef.current?.emit('edit_message', { messageId, content });
  }, []);

  const reconnect = useCallback(() => {
    socketRef.current?.connect();
  }, []);

  const isUserOnline = useCallback((userId) => onlineUsers.has(userId), [onlineUsers]);

  const getTypingUsers = useCallback((conversationId) => typingUsers[conversationId], [typingUsers]);

  const resetNewMessage = useCallback(() => setNewMessage(null), []);

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      isConnected,
      onlineUsers,
      typingUsers,
      unreadCount,
      newMessage,
      joinConversation,
      leaveConversation,
      sendMessage,
      startTyping,
      stopTyping,
      markAsRead,
      addReaction,
      deleteMessage,
      editMessage,
      reconnect,
      isUserOnline,
      getTypingUsers,
      resetNewMessage
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;