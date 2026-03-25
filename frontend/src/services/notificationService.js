// services/notificationService.js - COMPLETE FIXED VERSION
import api from './api';

class NotificationService {
  
  // ==================== GET NOTIFICATIONS ====================
  async getNotifications(page = 1, limit = 20, read = null) {
    try {
      const params = { page, limit };
      if (read !== null) params.read = read;
      
      const response = await api.get('/notifications', { params });
      
      return {
        success: true,
        notifications: response.notifications || [],
        unreadCount: response.unreadCount || 0,
        totalPages: response.totalPages || 1,
        currentPage: response.currentPage || page,
        total: response.total || 0
      };
    } catch (error) {
      console.error('Get notifications error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to get notifications',
        notifications: [],
        unreadCount: 0,
        totalPages: 1,
        currentPage: page,
        total: 0
      };
    }
  }

  // ==================== GET UNREAD COUNT ====================
  async getUnreadCount() {
    try {
      const response = await api.get('/notifications/unread-count');
      
      return {
        success: true,
        count: response.count || 0
      };
    } catch (error) {
      console.error('Get unread count error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to get unread count',
        count: 0
      };
    }
  }

  // ==================== MARK AS READ ====================
  async markAsRead(notificationId) {
    try {
      if (!notificationId) {
        throw new Error('Notification ID is required');
      }

      const response = await api.put(`/notifications/${notificationId}/read`);
      
      return {
        success: true,
        message: response.message || 'Notification marked as read'
      };
    } catch (error) {
      console.error('Mark as read error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to mark as read'
      };
    }
  }

  // ==================== MARK ALL AS READ ====================
  async markAllAsRead() {
    try {
      const response = await api.put('/notifications/read-all');
      
      return {
        success: true,
        message: response.message || 'All notifications marked as read'
      };
    } catch (error) {
      console.error('Mark all as read error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to mark all as read'
      };
    }
  }

  // ==================== DELETE NOTIFICATION ====================
  async deleteNotification(notificationId) {
    try {
      if (!notificationId) {
        throw new Error('Notification ID is required');
      }

      const response = await api.delete(`/notifications/${notificationId}`);
      
      return {
        success: true,
        message: response.message || 'Notification deleted'
      };
    } catch (error) {
      console.error('Delete notification error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to delete notification'
      };
    }
  }

  // ==================== CLEAR ALL ====================
  async clearAll() {
    try {
      const response = await api.delete('/notifications/clear-all');
      
      return {
        success: true,
        message: response.message || 'All notifications cleared'
      };
    } catch (error) {
      console.error('Clear all error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to clear notifications'
      };
    }
  }

  // ==================== GET SETTINGS ====================
  async getSettings() {
    try {
      const response = await api.get('/notifications/settings');
      
      return {
        success: true,
        settings: response.settings || {}
      };
    } catch (error) {
      console.error('Get settings error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to get notification settings',
        settings: {}
      };
    }
  }

  // ==================== UPDATE SETTINGS ====================
  async updateSettings(settings) {
    try {
      if (!settings) {
        throw new Error('Settings are required');
      }

      const response = await api.put('/notifications/settings', settings);
      
      return {
        success: true,
        settings: response.settings || {},
        message: response.message || 'Settings updated'
      };
    } catch (error) {
      console.error('Update settings error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to update settings'
      };
    }
  }

  // ==================== SEND TEST NOTIFICATION ====================
  async sendTestNotification(type = 'system') {
    try {
      const response = await api.post('/notifications/test', { type });
      
      return {
        success: true,
        notification: response.notification,
        message: response.message || 'Test notification sent'
      };
    } catch (error) {
      console.error('Send test notification error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to send test notification'
      };
    }
  }

  // ==================== PUSH NOTIFICATIONS ====================
  async getVapidPublicKey() {
    try {
      const response = await api.get('/notifications/push/vapid-key');
      
      return {
        success: true,
        publicKey: response.publicKey
      };
    } catch (error) {
      console.error('Get VAPID key error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to get VAPID key',
        publicKey: null
      };
    }
  }

  async subscribeToPush(subscription) {
    try {
      if (!subscription) {
        throw new Error('Push subscription is required');
      }

      const response = await api.post('/notifications/push/subscribe', {
        subscription
      });
      
      return {
        success: true,
        message: response.message || 'Push subscription saved'
      };
    } catch (error) {
      console.error('Subscribe to push error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to subscribe to push'
      };
    }
  }

  async unsubscribeFromPush(endpoint) {
    try {
      if (!endpoint) {
        throw new Error('Endpoint is required');
      }

      const response = await api.post('/notifications/push/unsubscribe', {
        endpoint
      });
      
      return {
        success: true,
        message: response.message || 'Push subscription removed'
      };
    } catch (error) {
      console.error('Unsubscribe from push error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to unsubscribe from push'
      };
    }
  }

  async getPushStatus() {
    try {
      const response = await api.get('/notifications/push/status');
      
      return {
        success: true,
        subscribed: response.subscribed || false,
        subscription: response.subscription || null
      };
    } catch (error) {
      console.error('Get push status error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to get push status',
        subscribed: false,
        subscription: null
      };
    }
  }

  // ==================== REGISTER SERVICE WORKER ====================
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return {
        success: false,
        error: 'Push notifications not supported'
      };
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      
      return {
        success: true,
        registration
      };
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return {
        success: false,
        error: error.message || 'Service Worker registration failed'
      };
    }
  }

  // ==================== REQUEST PERMISSION ====================
  async requestPermission() {
    if (!('Notification' in window)) {
      return {
        success: false,
        error: 'Notifications not supported'
      };
    }

    try {
      const permission = await Notification.requestPermission();
      
      return {
        success: permission === 'granted',
        permission
      };
    } catch (error) {
      console.error('Request permission error:', error);
      return {
        success: false,
        error: error.message || 'Failed to request permission'
      };
    }
  }

  // ==================== CHECK PERMISSION ====================
  checkPermission() {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  // ==================== SUBSCRIBE WITH BROWSER ====================
  async subscribeWithBrowser() {
    try {
      // Check support
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return {
          success: false,
          error: 'Push notifications not supported'
        };
      }

      // Check permission
      if (Notification.permission !== 'granted') {
        const permResult = await this.requestPermission();
        if (!permResult.success) {
          return permResult;
        }
      }

      // Get VAPID key
      const keyResult = await this.getVapidPublicKey();
      if (!keyResult.success || !keyResult.publicKey) {
        return {
          success: false,
          error: 'Failed to get VAPID key'
        };
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Convert VAPID key
      const convertedKey = this.urlBase64ToUint8Array(keyResult.publicKey);

      // Subscribe
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });

      // Send to server
      const subscribeResult = await this.subscribeToPush(subscription.toJSON());
      
      return subscribeResult;
    } catch (error) {
      console.error('Subscribe with browser error:', error);
      return {
        success: false,
        error: error.message || 'Failed to subscribe'
      };
    }
  }

  // ==================== UNSUBSCRIBE WITH BROWSER ====================
  async unsubscribeWithBrowser() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        
        // Notify server
        return await this.unsubscribeFromPush(endpoint);
      }

      return {
        success: true,
        message: 'No subscription found'
      };
    } catch (error) {
      console.error('Unsubscribe with browser error:', error);
      return {
        success: false,
        error: error.message || 'Failed to unsubscribe'
      };
    }
  }

  // ==================== URL BASE64 TO UINT8ARRAY ====================
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // ==================== GET NOTIFICATIONS BY TYPE ====================
  async getNotificationsByType(type, page = 1, limit = 20) {
    try {
      if (!type) {
        throw new Error('Notification type is required');
      }

      const response = await api.get(`/notifications/type/${type}`, {
        params: { page, limit }
      });
      
      return {
        success: true,
        notifications: response.notifications || [],
        totalPages: response.totalPages || 1,
        currentPage: response.currentPage || page,
        total: response.total || 0
      };
    } catch (error) {
      console.error('Get notifications by type error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to get notifications',
        notifications: []
      };
    }
  }

  // ==================== GET DEAL NOTIFICATIONS ====================
  async getDealNotifications(dealId, page = 1, limit = 20) {
    try {
      if (!dealId) {
        throw new Error('Deal ID is required');
      }

      const response = await api.get(`/notifications/deal/${dealId}`, {
        params: { page, limit }
      });
      
      return {
        success: true,
        notifications: response.notifications || []
      };
    } catch (error) {
      console.error('Get deal notifications error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to get deal notifications'
      };
    }
  }

  // ==================== GET CAMPAIGN NOTIFICATIONS ====================
  async getCampaignNotifications(campaignId, page = 1, limit = 20) {
    try {
      if (!campaignId) {
        throw new Error('Campaign ID is required');
      }

      const response = await api.get(`/notifications/campaign/${campaignId}`, {
        params: { page, limit }
      });
      
      return {
        success: true,
        notifications: response.notifications || []
      };
    } catch (error) {
      console.error('Get campaign notifications error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to get campaign notifications'
      };
    }
  }

  // ==================== MUTE NOTIFICATIONS ====================
  async muteNotifications(duration) {
    try {
      const response = await api.post('/notifications/mute', { duration });
      
      return {
        success: true,
        mutedUntil: response.mutedUntil,
        message: response.message || 'Notifications muted'
      };
    } catch (error) {
      console.error('Mute notifications error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to mute notifications'
      };
    }
  }

  // ==================== UNMUTE NOTIFICATIONS ====================
  async unmuteNotifications() {
    try {
      const response = await api.post('/notifications/unmute');
      
      return {
        success: true,
        message: response.message || 'Notifications unmuted'
      };
    } catch (error) {
      console.error('Unmute notifications error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to unmute notifications'
      };
    }
  }

  // ==================== GET MUTE STATUS ====================
  async getMuteStatus() {
    try {
      const response = await api.get('/notifications/mute-status');
      
      return {
        success: true,
        muted: response.muted || false,
        mutedUntil: response.mutedUntil
      };
    } catch (error) {
      console.error('Get mute status error:', error);
      return {
        success: false,
        error: error?.error || 'Failed to get mute status',
        muted: false
      };
    }
  }
}

export default new NotificationService();