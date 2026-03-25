import { io } from 'socket.io-client';
import { getStorage } from './storage';
import toast from 'react-hot-toast';

class SocketManager {
  constructor() {
    this.socket = null;
    this.handlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.eventQueue = [];
    this.isConnected = false;
  }

  // ==================== INITIALIZE SOCKET ====================
  initialize(token) {
    if (this.socket) return;

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      autoConnect: true
    });

    this.setupEventListeners();
  }

  // ==================== SETUP EVENT LISTENERS ====================
  setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('🔌 Socket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.processEventQueue();
      
      const user = getStorage('user');
      if (user?._id) {
        this.emit('user:connected', { userId: user._id });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      this.isConnected = false;

      if (reason === 'io server disconnect') {
        // Server disconnected, attempt to reconnect
        setTimeout(() => {
          this.socket?.connect();
        }, this.reconnectDelay);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        toast.error('Unable to connect to chat server. Please refresh the page.');
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.processEventQueue();
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      console.log(`Reconnection attempt ${attempt}`);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Reconnection failed');
      toast.error('Lost connection to server. Please refresh the page.');
    });

    // ==================== MESSAGE EVENTS ====================
    this.socket.on('message:new', (data) => {
      this.triggerHandlers('message:new', data);
    });

    this.socket.on('message:delivered', (data) => {
      this.triggerHandlers('message:delivered', data);
    });

    this.socket.on('message:read', (data) => {
      this.triggerHandlers('message:read', data);
    });

    this.socket.on('message:reaction', (data) => {
      this.triggerHandlers('message:reaction', data);
    });

    this.socket.on('message:edited', (data) => {
      this.triggerHandlers('message:edited', data);
    });

    this.socket.on('message:deleted', (data) => {
      this.triggerHandlers('message:deleted', data);
    });

    // ==================== TYPING EVENTS ====================
    this.socket.on('typing:start', (data) => {
      this.triggerHandlers('typing:start', data);
    });

    this.socket.on('typing:stop', (data) => {
      this.triggerHandlers('typing:stop', data);
    });

    // ==================== NOTIFICATION EVENTS ====================
    this.socket.on('notification:new', (data) => {
      this.triggerHandlers('notification:new', data);
    });

    this.socket.on('notification:read', (data) => {
      this.triggerHandlers('notification:read', data);
    });

    this.socket.on('notification:deleted', (data) => {
      this.triggerHandlers('notification:deleted', data);
    });

    // ==================== DEAL EVENTS ====================
    this.socket.on('deal:created', (data) => {
      this.triggerHandlers('deal:created', data);
    });

    this.socket.on('deal:updated', (data) => {
      this.triggerHandlers('deal:updated', data);
    });

    this.socket.on('deal:accepted', (data) => {
      this.triggerHandlers('deal:accepted', data);
    });

    this.socket.on('deal:rejected', (data) => {
      this.triggerHandlers('deal:rejected', data);
    });

    this.socket.on('deal:completed', (data) => {
      this.triggerHandlers('deal:completed', data);
    });

    this.socket.on('deal:cancelled', (data) => {
      this.triggerHandlers('deal:cancelled', data);
    });

    // ==================== PAYMENT EVENTS ====================
    this.socket.on('payment:received', (data) => {
      this.triggerHandlers('payment:received', data);
    });

    this.socket.on('payment:released', (data) => {
      this.triggerHandlers('payment:released', data);
    });

    this.socket.on('payment:failed', (data) => {
      this.triggerHandlers('payment:failed', data);
    });

    // ==================== USER PRESENCE EVENTS ====================
    this.socket.on('user:online', (data) => {
      this.triggerHandlers('user:online', data);
    });

    this.socket.on('user:offline', (data) => {
      this.triggerHandlers('user:offline', data);
    });

    // ==================== ERROR EVENT ====================
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.triggerHandlers('error', error);
    });
  }

  // ==================== REGISTER EVENT HANDLER ====================
  on(event, handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event).push(handler);
  }

  // ==================== OFF (REMOVE HANDLER) ====================
  off(event, handler) {
    if (!this.handlers.has(event)) return;
    
    if (handler) {
      const handlers = this.handlers.get(event).filter(h => h !== handler);
      this.handlers.set(event, handlers);
    } else {
      this.handlers.delete(event);
    }
  }

  // ==================== TRIGGER HANDLERS ====================
  triggerHandlers(event, data) {
    const handlers = this.handlers.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in ${event} handler:`, error);
      }
    });
  }

  // ==================== EMIT EVENT ====================
  emit(event, data) {
    if (!this.socket || !this.isConnected) {
      this.queueEvent(event, data);
      return false;
    }

    this.socket.emit(event, data);
    return true;
  }

  // ==================== QUEUE EVENT FOR OFFLINE ====================
  queueEvent(event, data) {
    this.eventQueue.push({ event, data, timestamp: Date.now() });
    
    // Keep queue size manageable
    if (this.eventQueue.length > 100) {
      this.eventQueue.shift();
    }
  }

  // ==================== PROCESS QUEUED EVENTS ====================
  processEventQueue() {
    if (!this.isConnected || this.eventQueue.length === 0) return;

    console.log(`Processing ${this.eventQueue.length} queued events`);

    const queue = [...this.eventQueue];
    this.eventQueue = [];

    queue.forEach(({ event, data }) => {
      this.socket.emit(event, data);
    });
  }

  // ==================== JOIN CONVERSATION ====================
  joinConversation(conversationId) {
    this.emit('conversation:join', { conversationId });
  }

  // ==================== LEAVE CONVERSATION ====================
  leaveConversation(conversationId) {
    this.emit('conversation:leave', { conversationId });
  }

  // ==================== SEND MESSAGE ====================
  sendMessage(conversationId, content, attachments = [], repliedTo = null) {
    return this.emit('message:send', {
      conversationId,
      content,
      attachments,
      repliedTo,
      timestamp: Date.now()
    });
  }

  // ==================== START TYPING ====================
  startTyping(conversationId) {
    this.emit('typing:start', { conversationId });
  }

  // ==================== STOP TYPING ====================
  stopTyping(conversationId) {
    this.emit('typing:stop', { conversationId });
  }

  // ==================== MARK AS READ ====================
  markAsRead(conversationId, messageIds) {
    this.emit('message:read', { conversationId, messageIds });
  }

  // ==================== ADD REACTION ====================
  addReaction(messageId, reaction) {
    this.emit('message:react', { messageId, reaction });
  }

  // ==================== DELETE MESSAGE ====================
  deleteMessage(messageId) {
    this.emit('message:delete', { messageId });
  }

  // ==================== EDIT MESSAGE ====================
  editMessage(messageId, content) {
    this.emit('message:edit', { messageId, content });
  }

  // ==================== GET CONNECTION STATUS ====================
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      queuedEvents: this.eventQueue.length
    };
  }

  // ==================== DISCONNECT ====================
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.handlers.clear();
    }
  }

  // ==================== RECONNECT ====================
  reconnect() {
    if (this.socket && !this.isConnected) {
      this.socket.connect();
    }
  }
}

// Create singleton instance
const socketManager = new SocketManager();

export default socketManager;