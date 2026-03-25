// services/notificationService.js - FULL FIXED VERSION
const Notification = require('../models/Notification');
const User = require('../models/User');
const webpush = require('web-push');

class NotificationService {
  constructor() {
    this.initWebPush();
  }

  initWebPush() {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        'mailto:' + (process.env.VAPID_EMAIL || 'support@influencex.com'),
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
      console.log('✅ Web Push initialized');
    } else {
      console.warn('⚠️ Web Push not configured (VAPID keys missing)');
    }
  }

  // ✅ FIX: getIO lazily from chatSocket — no circular dependency
  _getIO() {
    try {
      const { getIO } = require('../socket/chatSocket');
      return getIO();
    } catch (e) {
      return null;
    }
  }

  // ==================== CORE NOTIFICATION METHODS ====================

  async createNotification(userId, type, title, message, data = {}, options = {}) {
    try {
      const {
        priority    = 'medium',
        channels    = ['in-app'],
        scheduledFor = null,
        expiresAt   = null,
        groupId     = null,
        actorId     = null
      } = options;

      // Respect user notification preferences
      const user = await User.findById(userId).select('settings phone pushSubscriptions email');
      let activeChannels = [...channels];

      if (user?.settings?.notifications) {
        const pref = user.settings.notifications;
        const notifType = type === 'team' ? 'team'
                        : type === 'deal' ? 'deals'
                        : type === 'message' ? 'messages'
                        : type === 'payment' ? 'payments'
                        : null;

        if (notifType) {
          if (!pref.email?.[notifType]) activeChannels = activeChannels.filter(c => c !== 'email');
          if (!pref.push?.[notifType])  activeChannels = activeChannels.filter(c => c !== 'push');
          if (!pref.sms?.[notifType])   activeChannels = activeChannels.filter(c => c !== 'sms');
        }
      }

      const notification = await Notification.create({
        userId,
        type,
        title,
        message,
        data,
        priority,
        channels: activeChannels,
        scheduledFor,
        expiresAt,
        groupId,
        actorId,
        read:      false,
        delivered: false
      });

      // Send immediately if not scheduled
      if (!scheduledFor) {
        if (activeChannels.includes('push'))  await this.sendPushNotification(userId, { title, message, data });
        if (activeChannels.includes('email')) await this.sendEmailNotification(userId, { title, message, data });
        if (activeChannels.includes('sms'))   await this.sendSMSNotification(userId, message);
      }

      // ✅ FIX: Use getIO() from chatSocket — not require('../../server').io
      const io = this._getIO();
      if (io) {
        io.to(`user_${userId.toString()}`).emit('notification:new', notification);
      }

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }

  async sendNotification({ userId, type = 'general', title, message, data = {} }) {
    return this.createNotification(userId, type, title, message, data);
  }

  async createBulkNotifications(userIds, type, title, message, data = {}, options = {}) {
    const results = [];
    for (const userId of userIds) {
      const notification = await this.createNotification(userId, type, title, message, data, options);
      if (notification) results.push(notification);
    }
    return results;
  }

  // ==================== PUSH SUBSCRIPTION MANAGEMENT ====================

  async addPushSubscription(userId, subscription) {
    try {
      const user = await User.findById(userId);
      if (!user) return { success: false, message: 'User not found' };

      if (!user.pushSubscriptions) user.pushSubscriptions = [];

      const exists = user.pushSubscriptions.some(sub => sub.endpoint === subscription.endpoint);
      if (!exists) {
        user.pushSubscriptions.push(subscription);
        await user.save();
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async removePushSubscription(userId, endpoint) {
    try {
      const user = await User.findById(userId);
      if (!user?.pushSubscriptions) return { success: false };

      user.pushSubscriptions = user.pushSubscriptions.filter(sub => sub.endpoint !== endpoint);
      await user.save();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== TEAM NOTIFICATIONS ====================

  async sendTeamInvitation(userId, brandName, invitedBy) {
    return this.createNotification(userId, 'team', 'Team Invitation',
      `You've been invited to join ${brandName}'s team`,
      { brandName, invitedBy: invitedBy?.fullName, url: `/team/invitations` },
      { priority: 'high', channels: ['in-app', 'email'] }
    );
  }

  async sendTeamMemberJoined(brandOwnerId, memberName, brandName) {
    return this.createNotification(brandOwnerId, 'team', 'New Team Member',
      `${memberName} has joined your team`,
      { memberName, brandName, url: `/brand/team` }
    );
  }

  async sendTeamMemberLeft(brandOwnerId, memberName, brandName) {
    return this.createNotification(brandOwnerId, 'team', 'Team Member Left',
      `${memberName} has left your team`,
      { memberName, brandName, url: `/brand/team` }
    );
  }

  async sendRoleChanged(userId, brandName, newRole, changedBy) {
    return this.createNotification(userId, 'team', 'Role Updated',
      `Your role in ${brandName} has been changed to ${newRole}`,
      { brandName, newRole, changedBy: changedBy?.fullName, url: `/team` }
    );
  }

  async sendPermissionsUpdated(userId, brandName, changedBy) {
    return this.createNotification(userId, 'team', 'Permissions Updated',
      `Your permissions in ${brandName} have been updated`,
      { brandName, changedBy: changedBy?.fullName, url: `/team/permissions` }
    );
  }

  async sendInvitationAccepted(brandOwnerId, memberEmail, role) {
    return this.createNotification(brandOwnerId, 'team', 'Invitation Accepted',
      `${memberEmail} has accepted your invitation as ${role}`,
      { memberEmail, role, url: `/brand/team` }
    );
  }

  async sendInvitationDeclined(brandOwnerId, memberEmail) {
    return this.createNotification(brandOwnerId, 'team', 'Invitation Declined',
      `${memberEmail} has declined your invitation`,
      { memberEmail, url: `/brand/team/invitations` },
      { priority: 'low' }
    );
  }

  async sendInvitationExpired(brandOwnerId, memberEmail) {
    return this.createNotification(brandOwnerId, 'team', 'Invitation Expired',
      `Invitation to ${memberEmail} has expired`,
      { memberEmail, url: `/brand/team/invitations` },
      { priority: 'low' }
    );
  }

  // ==================== DEAL NOTIFICATIONS ====================

  async sendDealNotification(userId, deal, action) {
    const titles = {
      created:          'New Deal Offer',
      accepted:         'Deal Accepted',
      declined:         'Deal Declined',
      completed:        'Deal Completed',
      cancelled:        'Deal Cancelled',
      revision:         'Revision Requested',
      payment_released: 'Payment Released'
    };

    const messages = {
      created:          `You have received a new deal offer for $${deal.budget}`,
      accepted:         `Your deal has been accepted`,
      declined:         `Your deal has been declined`,
      completed:        `Your deal has been marked as completed`,
      cancelled:        `Your deal has been cancelled`,
      revision:         `Revisions have been requested`,
      payment_released: `Payment of $${deal.budget} has been released`
    };

    return this.createNotification(userId, 'deal', titles[action], messages[action],
      { dealId: deal._id, action, url: `/deals/${deal._id}` },
      { priority: 'high' }
    );
  }

  // ==================== PAYMENT NOTIFICATIONS ====================

  async sendPaymentNotification(userId, payment, action) {
    const titles   = { received: 'Payment Received', released: 'Payment Released', pending: 'Payment Pending', failed: 'Payment Failed', refunded: 'Payment Refunded' };
    const messages = {
      received: `You have received a payment of $${payment.amount}`,
      released: `Payment of $${payment.amount} has been released`,
      pending:  `Payment of $${payment.amount} is pending`,
      failed:   `Payment of $${payment.amount} has failed`,
      refunded: `Payment of $${payment.amount} has been refunded`
    };

    return this.createNotification(userId, 'payment', titles[action], messages[action],
      { paymentId: payment._id, action, url: `/payments/${payment._id}` },
      { priority: 'high' }
    );
  }

  // ==================== MESSAGE NOTIFICATIONS ====================

  async sendMessageNotification(userId, message, sender) {
    const content = message.content || '';
    return this.createNotification(userId, 'message', 'New Message',
      `New message from ${sender.fullName || sender.name}`,
      {
        messageId:      message._id,
        conversationId: message.conversation_id || message.conversationId,
        senderId:       sender._id,
        url:            `/inbox?conversation=${message.conversation_id || message.conversationId}`
      },
      { priority: 'medium', actorId: sender._id }
    );
  }

  // ==================== CAMPAIGN NOTIFICATIONS ====================

  async sendCampaignNotification(userId, campaign, action) {
    const titles = {
      published:            'Campaign Published',
      updated:              'Campaign Updated',
      ended:                'Campaign Ended',
      invitation:           'Campaign Invitation',
      application:          'New Application',
      application_accepted: 'Application Accepted',
      application_rejected: 'Application Reviewed'
    };

    const messages = {
      published:            `Your campaign "${campaign.title}" has been published`,
      updated:              `Campaign "${campaign.title}" has been updated`,
      ended:                `Campaign "${campaign.title}" has ended`,
      invitation:           `You've been invited to join campaign "${campaign.title}"`,
      application:          `New application for "${campaign.title}"`,
      application_accepted: `Your application for "${campaign.title}" has been accepted`,
      application_rejected: `Your application for "${campaign.title}" has been reviewed`
    };

    return this.createNotification(userId, 'campaign', titles[action], messages[action],
      { campaignId: campaign._id, action, url: `/campaigns/${campaign._id}` }
    );
  }

  // ==================== SYSTEM / ALERT / REMINDER ====================

  async sendSystemNotification(userId, title, message, data = {}) {
    return this.createNotification(userId, 'system', title, message, data, { priority: 'low' });
  }

  async sendAlertNotification(userId, title, message, priority = 'high', data = {}) {
    return this.createNotification(userId, 'alert', title, message, data,
      { priority, channels: ['in-app', 'email', 'push'] }
    );
  }

  async sendReminderNotification(userId, type, item) {
    const messages = {
      deadline:           `Deal deadline approaching: ${item.deadline?.toLocaleDateString()}`,
      submission:         `Deliverables submission due soon`,
      payment:            `Payment pending for deal`,
      review:             `Please leave a review for your completed deal`,
      verification:       `Please verify your account to continue`,
      incomplete_profile: `Complete your profile to get more deals`
    };

    return this.createNotification(userId, 'reminder', 'Reminder', messages[type] || 'Reminder',
      { type, itemId: item._id, url: `/${type}s/${item._id}` },
      { priority: 'low' }
    );
  }

  // ==================== CHANNEL DELIVERY ====================

  async sendPushNotification(userId, notification) {
    try {
      const user = await User.findById(userId).select('pushSubscriptions');
      if (!user?.pushSubscriptions?.length) return { success: false, message: 'No push subscriptions' };

      const payload = JSON.stringify({
        title:  notification.title,
        body:   notification.message,
        data:   notification.data,
        icon:   '/logo192.png',
        badge:  '/badge.png'
      });

      const validSubscriptions = [];
      for (const sub of user.pushSubscriptions) {
        try {
          await webpush.sendNotification(sub, payload);
          validSubscriptions.push(sub);
        } catch (err) {
          // Remove expired subscriptions (410 Gone)
          if (err.statusCode !== 410) validSubscriptions.push(sub);
          else console.log(`🧹 Removing expired push subscription for user ${userId}`);
        }
      }

      // Update if any subscriptions were removed
      if (validSubscriptions.length !== user.pushSubscriptions.length) {
        await User.findByIdAndUpdate(userId, { pushSubscriptions: validSubscriptions });
      }

      return { success: true };
    } catch (error) {
      console.error('Push notification error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendEmailNotification(userId, payload) {
    try {
      const user = await User.findById(userId).select('email');
      if (!user?.email) return { success: false, message: 'User email not found' };

      const emailService = require('./emailService');
      await emailService.sendEmail({
        to:      user.email,
        subject: payload.title,
        html:    `<h2>${payload.title}</h2><p>${payload.message}</p>${payload.data?.url ? `<p><a href="${payload.data.url}">View Details</a></p>` : ''}`
      });

      return { success: true };
    } catch (error) {
      console.error('Email notification error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendSMSNotification(userId, message) {
    try {
      const user = await User.findById(userId).select('phone');
      if (!user?.phone) return { success: false, message: 'User phone not found' };

      const smsService = require('./SMSService');
      await smsService.sendSMS({ to: user.phone, message });
      return { success: true };
    } catch (error) {
      console.error('SMS notification error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ==================== NOTIFICATION MANAGEMENT ====================

  async markAsRead(userId, notificationId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { read: true, readAt: new Date() },
        { new: true }
      );

      if (notification) {
        const io = this._getIO();
        if (io) io.to(`user_${userId.toString()}`).emit('notification:read', { notificationId });
      }

      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return null;
    }
  }

  async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { userId, read: false },
        { read: true, readAt: new Date() }
      );

      const io = this._getIO();
      if (io) io.to(`user_${userId.toString()}`).emit('notifications:all-read');

      return result;
    } catch (error) {
      console.error('Error marking all as read:', error);
      return null;
    }
  }

  async getUnreadCount(userId) {
    try {
      return await Notification.countDocuments({ userId, read: false });
    } catch (error) {
      return 0;
    }
  }

  async getUserNotifications(userId, options = {}) {
    try {
      const { limit = 20, skip = 0, type = null, read = null, priority = null } = options;
      const query = { userId };

      if (type)            query.type     = type;
      if (read !== null)   query.read     = read;
      if (priority)        query.priority = priority;

      const [notifications, total] = await Promise.all([
        Notification.find(query).sort({ createdAt: -1 }).limit(limit).skip(skip).lean(),
        Notification.countDocuments(query)
      ]);

      return {
        notifications,
        total,
        unread: await this.getUnreadCount(userId)
      };
    } catch (error) {
      return { notifications: [], total: 0, unread: 0 };
    }
  }

  async deleteNotification(userId, notificationId) {
    try {
      const result = await Notification.findOneAndDelete({ _id: notificationId, userId });

      if (result) {
        const io = this._getIO();
        if (io) io.to(`user_${userId.toString()}`).emit('notification:deleted', { notificationId });
      }

      return result;
    } catch (error) {
      return null;
    }
  }

  async clearAllNotifications(userId) {
    try {
      const result = await Notification.deleteMany({ userId });

      const io = this._getIO();
      if (io) io.to(`user_${userId.toString()}`).emit('notifications:cleared');

      return result;
    } catch (error) {
      return null;
    }
  }

  async processScheduledNotifications() {
    try {
      const now = new Date();
      const notifications = await Notification.find({
        scheduledFor: { $lte: now },
        delivered:    false
      });

      for (const notification of notifications) {
        notification.delivered   = true;
        notification.deliveredAt = now;
        await notification.save();

        if (notification.channels.includes('push')) {
          await this.sendPushNotification(notification.userId, {
            title:   notification.title,
            message: notification.message,
            data:    notification.data
          });
        }
      }

      return notifications.length;
    } catch (error) {
      console.error('Error processing scheduled notifications:', error);
      return 0;
    }
  }

  async cleanupOldNotifications(days = 30) {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const result = await Notification.deleteMany({
        read:      true,
        createdAt: { $lt: cutoff }
      });

      return result.deletedCount;
    } catch (error) {
      return 0;
    }
  }
}

module.exports = new NotificationService();