// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['deal', 'message', 'payment', 'campaign', 'reminder', 'system', 'alert', 'security'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    url: String,
    action: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  delivered: {
    type: Boolean,
    default: false
  },
  deliveredAt: Date,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  channels: [{
    type: String,
    enum: ['in-app', 'email', 'push', 'sms']
  }],
  expiresAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for user notifications
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);