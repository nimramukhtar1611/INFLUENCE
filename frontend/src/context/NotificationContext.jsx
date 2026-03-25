// context/NotificationContext.js - COMPLETE FIXED VERSION
import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { socket, isConnected } = useSocket();
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscription, setPushSubscription] = useState(null);
  const [permission, setPermission] = useState('default');
  const [settings, setSettings] = useState({
    email: {
      deals: true,
      messages: true,
      payments: true,
      campaigns: true,
      marketing: false
    },
    push: {
      deals: true,
      messages: true,
      payments: true,
      campaigns: false
    },
    sms: {
      deals: false,
      messages: false,
      payments: true
    }
  });

  const notificationSound = useRef(null);

  // ==================== INITIALIZE NOTIFICATION SOUND ====================
  useEffect(() => {
    notificationSound.current = new Audio('/sounds/notification.mp3');
  }, []);

  // ==================== CHECK PUSH NOTIFICATION SUPPORT ====================
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      setPermission(Notification.permission);
      
      // Register service worker
      registerServiceWorker();
    }
  }, []);

  // ==================== REGISTER SERVICE WORKER ====================
  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      
      // Check for existing subscription
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        setPushSubscription(subscription);
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  // ==================== REQUEST PUSH PERMISSION ====================
  const requestPushPermission = useCallback(async () => {
    if (!pushSupported) {
      toast.error('Push notifications are not supported in your browser');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission === 'granted') {
        await subscribeToPush();
        return true;
      } else {
        toast.error('Push notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Failed to request notification permission');
      return false;
    }
  }, [pushSupported]);

  // ==================== SUBSCRIBE TO PUSH ====================
  const subscribeToPush = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID public key from server
      const response = await api.get('/notifications/push/vapid-key');
      const vapidPublicKey = response.data.publicKey;
      
      // Convert key to Uint8Array
      const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
      
      // Subscribe
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });
      
      // Send subscription to server
      await api.post('/notifications/push/subscribe', {
        subscription: subscription.toJSON()
      });
      
      setPushSubscription(subscription);
      toast.success('Push notifications enabled');
      
      return subscription;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Failed to enable push notifications');
      return null;
    }
  }, []);

  // ==================== UNSUBSCRIBE FROM PUSH ====================
  const unsubscribeFromPush = useCallback(async () => {
    try {
      if (pushSubscription) {
        await pushSubscription.unsubscribe();
        
        await api.post('/notifications/push/unsubscribe', {
          endpoint: pushSubscription.endpoint
        });
        
        setPushSubscription(null);
        toast.success('Push notifications disabled');
      }
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      toast.error('Failed to disable push notifications');
    }
  }, [pushSubscription]);

  // ==================== FETCH NOTIFICATIONS ====================
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const response = await api.get('/notifications');
      
      if (response.data?.success) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // ==================== FETCH SETTINGS ====================
  const fetchSettings = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await api.get('/notifications/settings');
      
      if (response.data?.success) {
        setSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    }
  }, [isAuthenticated]);

  // ==================== UPDATE SETTINGS ====================
  const updateSettings = useCallback(async (newSettings) => {
    try {
      const response = await api.put('/notifications/settings', newSettings);
      
      if (response.data?.success) {
        setSettings(response.data.settings);
        toast.success('Notification settings updated');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
      return false;
    }
  }, []);

  // ==================== MARK AS READ ====================
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const response = await api.put(`/notifications/${notificationId}/read`);
      
      if (response.data?.success) {
        setNotifications(prev =>
          prev.map(n =>
            n._id === notificationId ? { ...n, read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }, []);

  // ==================== MARK ALL AS READ ====================
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await api.put('/notifications/read-all');
      
      if (response.data?.success) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, read: true }))
        );
        setUnreadCount(0);
        toast.success('All notifications marked as read');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
      return false;
    }
  }, []);

  // ==================== DELETE NOTIFICATION ====================
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const response = await api.delete(`/notifications/${notificationId}`);
      
      if (response.data?.success) {
        const deletedNotification = notifications.find(n => n._id === notificationId);
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
        
        if (!deletedNotification?.read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }, [notifications]);

  // ==================== CLEAR ALL ====================
  const clearAll = useCallback(async () => {
    try {
      const response = await api.delete('/notifications/clear-all');
      
      if (response.data?.success) {
        setNotifications([]);
        setUnreadCount(0);
        toast.success('All notifications cleared');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast.error('Failed to clear notifications');
      return false;
    }
  }, []);

  // ==================== HANDLE NEW NOTIFICATION ====================
  const handleNewNotification = useCallback((notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Play sound for important notifications
    if (notification.priority === 'high' || notification.priority === 'urgent') {
      notificationSound.current?.play().catch(e => console.log('Audio play failed:', e));
    }
    
    // Show toast
    toast.success(notification.message, {
      icon: getNotificationIcon(notification.type),
      duration: 5000
    });
  }, []);

  // ==================== GET NOTIFICATION ICON ====================
  const getNotificationIcon = (type) => {
    switch(type) {
      case 'deal': return '💰';
      case 'message': return '💬';
      case 'payment': return '💵';
      case 'campaign': return '📢';
      case 'reminder': return '⏰';
      case 'alert': return '⚠️';
      default: return '🔔';
    }
  };

  // ==================== SEND TEST NOTIFICATION ====================
  const sendTestNotification = useCallback(async (type = 'system') => {
    try {
      const response = await api.post('/notifications/test', { type });
      
      if (response.data?.success) {
        toast.success('Test notification sent');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
      return false;
    }
  }, []);

  // ==================== SOCKET EVENT LISTENER ====================
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on('notification:new', handleNewNotification);
    socket.on('notification:read', ({ notificationId }) => {
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    });
    socket.on('notifications:all-read', () => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    });
    socket.on('notification:deleted', ({ notificationId }) => {
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
    });

    return () => {
      socket.off('notification:new');
      socket.off('notification:read');
      socket.off('notifications:all-read');
      socket.off('notification:deleted');
    };
  }, [socket, isConnected, handleNewNotification]);

  // ==================== INITIAL FETCH ====================
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      fetchSettings();
    }
  }, [isAuthenticated, fetchNotifications, fetchSettings]);

  const value = {
    notifications,
    unreadCount,
    loading,
    settings,
    pushSupported,
    pushSubscription,
    permission,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    updateSettings,
    requestPushPermission,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Helper function to convert base64 to Uint8Array
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export default NotificationContext;