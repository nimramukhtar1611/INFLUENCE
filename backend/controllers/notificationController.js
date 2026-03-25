// controllers/notificationController.js - COMPLETE FIXED VERSION
const Notification  = require('../models/Notification');
const User          = require('../models/User');
const asyncHandler  = require('express-async-handler');
const webpush       = require('web-push');

// Configure web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:' + (process.env.VAPID_EMAIL || 'support@influencex.com'),
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS — CRUD
// ─────────────────────────────────────────────────────────────────────────────

// @route  GET /api/notifications
// @access Private
const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, read } = req.query;

  const query = { userId: req.user._id };
  if (read !== undefined) query.read = read === 'true';

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ userId: req.user._id, read: false })
  ]);

  res.json({
    success:     true,
    notifications,
    unreadCount,
    totalPages:  Math.ceil(total / limit),
    currentPage: parseInt(page),
    total
  });
});

// @route  GET /api/notifications/unread-count
// @access Private
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    userId: req.user._id,
    read:   false
  });
  res.json({ success: true, count });
});

// @route  GET /api/notifications/type/:type
// @access Private
const getNotificationsByType = asyncHandler(async (req, res) => {
  const { type }              = req.params;
  const { page = 1, limit = 20 } = req.query;

  const query = { userId: req.user._id, type };

  const [notifications, total] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean(),
    Notification.countDocuments(query)
  ]);

  res.json({
    success:     true,
    notifications,
    totalPages:  Math.ceil(total / limit),
    currentPage: parseInt(page),
    total
  });
});

// @route  PUT /api/notifications/:notificationId/read
// @access Private
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.notificationId);

  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }

  if (notification.userId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  notification.read   = true;
  notification.readAt = Date.now();
  await notification.save();

  const io = req.app.get('io');
  if (io) {
    io.to(req.user._id.toString()).emit('notification:read', {
      notificationId: notification._id
    });
  }

  res.json({ success: true, message: 'Notification marked as read' });
});

// @route  PUT /api/notifications/read-all
// @access Private
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, read: false },
    { read: true, readAt: Date.now() }
  );

  const io = req.app.get('io');
  if (io) {
    io.to(req.user._id.toString()).emit('notifications:all-read');
  }

  res.json({ success: true, message: 'All notifications marked as read' });
});

// @route  DELETE /api/notifications/:notificationId
// @access Private
const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.notificationId);

  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }

  if (notification.userId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  await notification.deleteOne();

  res.json({ success: true, message: 'Notification deleted' });
});

// @route  DELETE /api/notifications/clear-all
// @access Private
const clearAll = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ userId: req.user._id });
  res.json({ success: true, message: 'All notifications cleared' });
});

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS
// Merged getSettings + getNotificationSettings → single function
// Both routes (/settings via getSettings alias) point here
// ─────────────────────────────────────────────────────────────────────────────

// @route  GET /api/notifications/settings
// @access Private
const getSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('notificationSettings settings');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Support both notificationSettings (dedicated field) and
  // settings.notifications (nested field) — whichever exists
  const settings = user.notificationSettings || user.settings?.notifications || {
    email: {
      newDeal:         true,
      dealAccepted:    true,
      dealCompleted:   true,
      newMessage:      true,
      paymentReceived: true,
      campaignUpdates: true,
      marketing:       false
    },
    push: {
      newDeal:         true,
      dealAccepted:    true,
      dealCompleted:   true,
      newMessage:      true,
      paymentReceived: true,
      campaignUpdates: true
    },
    sms: {
      newDeal:         false,
      paymentReceived: false,
      urgentOnly:      false
    },
    inApp: {
      all:   true,
      sound: true,
      badge: true
    }
  };

  res.json({ success: true, settings });
});

// @route  PUT /api/notifications/settings
// @access Private
// @body   { email?, push?, sms?, inApp? }
const updateSettings = asyncHandler(async (req, res) => {
  const { email, push, sms, inApp } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Support both storage styles — write to notificationSettings
  if (!user.notificationSettings) user.notificationSettings = {};

  if (email) user.notificationSettings.email = { ...user.notificationSettings.email, ...email };
  if (push)  user.notificationSettings.push  = { ...user.notificationSettings.push,  ...push  };
  if (sms)   user.notificationSettings.sms   = { ...user.notificationSettings.sms,   ...sms   };
  if (inApp) user.notificationSettings.inApp = { ...user.notificationSettings.inApp, ...inApp };

  user.markModified('notificationSettings');
  await user.save();

  res.json({
    success:  true,
    message:  'Notification settings updated',
    settings: user.notificationSettings
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PREFERENCES  (per-type toggles — alias to settings handlers)
// ─────────────────────────────────────────────────────────────────────────────
const getPreferences    = getSettings;
const updatePreferences = updateSettings;

// ─────────────────────────────────────────────────────────────────────────────
// PUSH NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

// @route  POST /api/notifications/push/subscribe
// @access Private
const subscribePush = asyncHandler(async (req, res) => {
  const { subscription } = req.body;

  if (!subscription) {
    res.status(400);
    throw new Error('Push subscription is required');
  }

  if (!req.user.pushSubscriptions) req.user.pushSubscriptions = [];

  const exists = req.user.pushSubscriptions.some(
    sub => sub.endpoint === subscription.endpoint
  );

  if (!exists) {
    req.user.pushSubscriptions.push(subscription);
    await req.user.save();
  }

  res.json({ success: true, message: 'Push subscription saved' });
});

// @route  POST /api/notifications/push/unsubscribe
// @access Private
const unsubscribePush = asyncHandler(async (req, res) => {
  const { endpoint } = req.body;

  if (!req.user.pushSubscriptions) {
    return res.json({ success: true, message: 'No subscriptions found' });
  }

  req.user.pushSubscriptions = req.user.pushSubscriptions.filter(
    sub => sub.endpoint !== endpoint
  );
  await req.user.save();

  res.json({ success: true, message: 'Push subscription removed' });
});

// @route  POST /api/notifications/push/send
// @access Private/Admin
const sendPushNotification = asyncHandler(async (req, res) => {
  const { userId, title, body, data } = req.body;

  const user = await User.findById(userId);
  if (!user || !user.pushSubscriptions?.length) {
    return res.json({ success: true, message: 'No push subscriptions' });
  }

  const payload = JSON.stringify({
    title,
    body,
    data,
    icon:  '/logo192.png',
    badge: '/badge.png'
  });

  const results = await Promise.allSettled(
    user.pushSubscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, payload);
      } catch (error) {
        // Remove expired subscriptions (HTTP 410 Gone)
        if (error.statusCode === 410) {
          user.pushSubscriptions = user.pushSubscriptions.filter(
            sub => sub.endpoint !== subscription.endpoint
          );
        }
        throw error;
      }
    })
  );

  await user.save();

  res.json({
    success: true,
    sent:    results.filter(r => r.status === 'fulfilled').length,
    failed:  results.filter(r => r.status === 'rejected').length
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST
// ─────────────────────────────────────────────────────────────────────────────

// @route  POST /api/notifications/test
// @access Private
const sendTestNotification = asyncHandler(async (req, res) => {
  const { type = 'system' } = req.body;

  const notification = await Notification.create({
    userId:   req.user._id,
    type,
    title:    'Test Notification',
    message:  'This is a test notification from InfluenceX',
    priority: 'low',
    channels: ['in-app']
  });

  const io = req.app.get('io');
  if (io) {
    io.to(req.user._id.toString()).emit('notification:new', notification);
  }

  res.json({ success: true, notification });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────────────────────

// @route  DELETE /api/notifications/cleanup
// @access Private/Admin
const cleanupOldNotifications = asyncHandler(async (req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await Notification.deleteMany({
    read:      true,
    createdAt: { $lt: thirtyDaysAgo }
  });

  res.json({ success: true, deletedCount: result.deletedCount });
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// All names exported — including aliases so routes file works with either name
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  // Core CRUD
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAll,
  clearAllNotifications:        clearAll,           // alias

  // Unread / by-type
  getUnreadCount,
  getNotificationsByType,

  // Settings (two export names, same function)
  getSettings,
  updateSettings,
  getNotificationSettings:      getSettings,        // alias
  updateNotificationSettings:   updateSettings,      // alias

  // Preferences (alias to settings)
  getPreferences,
  updatePreferences,

  // Push
  subscribePush,
  unsubscribePush,
  sendPushNotification,

  // Test
  sendTestNotification,

  // Admin
  cleanupOldNotifications
};