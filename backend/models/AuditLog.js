const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'user_suspended', 'user_activated', 'user_verified', 'user_deleted',
      'campaign_approved', 'campaign_rejected', 'campaign_featured',
      'deal_intervened', 'dispute_resolved',
      'settings_updated', 'fee_updated', 'plan_updated',
      'content_moderated', 'review_deleted'
    ]
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  targetResource: {
    type: {
      type: String,
      enum: ['campaign', 'deal', 'dispute', 'review']
    },
    id: mongoose.Schema.Types.ObjectId
  },
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },
  reason: String,
  ipAddress: String,
  userAgent: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ targetUser: 1 });
auditLogSchema.index({ 'targetResource.id': 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;