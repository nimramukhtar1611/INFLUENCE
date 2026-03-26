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
      'user_suspended', 'user_activated', 'user_verified', 'user_deleted', 'user_updated',
      'campaign_approved', 'campaign_rejected', 'campaign_featured', 'campaign_status_updated', 'campaigns_bulk_updated', 'campaign_deleted',
      'deal_intervened', 'dispute_resolved', 'dispute_assigned', 'dispute_escalated',
      'settings_updated', 'fee_updated', 'plan_updated', 'cache_cleared',
      'content_moderated', 'review_deleted',
      'withdrawal_approved', 'withdrawal_rejected', 'withdrawal_processed',
      'admin_login', '2fa_generate', '2fa_enable', '2fa_disable', '2fa_regenerate_codes',
      'admin_assigned', 'report_generation_started', 'report_generation_completed', 'report_generation_failed',
      'report_deleted', 'report_downloaded', 'report_scheduled',
      'backup_created', 'backup_restored',
      'account_deletion', 'privacy_update', 'consent_withdrawal', 'data_correction_request', 'processing_restriction', 'processing_objection', 'permanent_deletion'
    ]
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  targetResource: {
    type: {
      type: String,
      enum: ['campaign', 'deal', 'dispute', 'review', 'withdrawal', 'report', 'setting']
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