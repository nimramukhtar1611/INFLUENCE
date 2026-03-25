const webpush = require('web-push');

class WebPushService {
  constructor() {
    this.isConfigured = false;
    this.vapidDetails = null;
    this.initialize();
  }

  initialize() {
    try {
      const publicKey = process.env.VAPID_PUBLIC_KEY;
      const privateKey = process.env.VAPID_PRIVATE_KEY;
      const email = process.env.VAPID_EMAIL || 'support@influencex.com';

      if (publicKey && privateKey) {
        webpush.setVapidDetails(
          `mailto:${email}`,
          publicKey,
          privateKey
        );
        this.isConfigured = true;
        this.vapidDetails = { publicKey, email };
        console.log('✅ Web Push configured successfully');
      } else {
        console.log('⚠️ Web Push not configured (missing VAPID keys)');
      }
    } catch (error) {
      console.error('❌ Web Push initialization error:', error.message);
    }
  }

  /**
   * Send push notification to a user
   */
  async sendNotification(subscription, payload) {
    if (!this.isConfigured) {
      return { success: false, message: 'Web Push not configured' };
    }

    try {
      const result = await webpush.sendNotification(
        subscription,
        JSON.stringify({
          title: payload.title || 'InfluenceX',
          body: payload.body || '',
          icon: payload.icon || '/logo192.png',
          badge: payload.badge || '/badge.png',
          data: payload.data || {},
          actions: payload.actions || [],
          timestamp: Date.now()
        })
      );

      return { success: true, result };
    } catch (error) {
      console.error('❌ Push notification error:', error.message);
      
      if (error.statusCode === 410) {
        return { success: false, expired: true, message: 'Subscription expired' };
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendBulkNotifications(subscriptions, payload) {
    if (!this.isConfigured) {
      return { success: false, message: 'Web Push not configured' };
    }

    const results = await Promise.allSettled(
      subscriptions.map(sub => this.sendNotification(sub, payload))
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || !r.value.success).length;

    return {
      success: true,
      total: subscriptions.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Get VAPID public key for frontend
   */
  getPublicKey() {
    return this.vapidDetails?.publicKey || null;
  }

  /**
   * Check if configured
   */
  isReady() {
    return this.isConfigured;
  }
}

module.exports = new WebPushService();