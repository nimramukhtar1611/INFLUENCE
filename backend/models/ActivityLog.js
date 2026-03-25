const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login', 'logout', 'register',
      'create_campaign', 'update_campaign', 'delete_campaign',
      'create_deal', 'accept_deal', 'reject_deal', 'complete_deal',
      'upload_deliverable', 'approve_deliverable',
      'make_payment', 'receive_payment', 'withdraw',
      'send_message', 'create_review',
      'update_profile', 'change_password',
      'admin_action'
    ]
  },
  resource: {
    type: {
      type: String,
      enum: ['user', 'campaign', 'deal', 'payment', 'message', 'review']
    },
    id: mongoose.Schema.Types.ObjectId
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: String,
  userAgent: String,
  status: {
    type: String,
    enum: ['success', 'failure'],
    default: 'success'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 90 * 24 * 60 * 60 // 90 days TTL
  }
}, {
  timestamps: true
});

// Indexes
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ 'resource.id': 1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
module.exports = ActivityLog;