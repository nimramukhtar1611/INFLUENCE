// models/ConsentLog.js - COMPLETE NEW FILE
const mongoose = require('mongoose');

const consentLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  action: {
    type: String,
    enum: [
      'account_creation',
      'privacy_policy_accept',
      'terms_accept',
      'marketing_consent',
      'data_sharing_consent',
      'cookie_consent',
      'consent_withdrawal',
      'privacy_update',
      'account_deletion',
      'data_export_request',
      'data_correction_request',
      'processing_restriction',
      'processing_objection'
    ],
    required: true,
    index: true
  },

  consent: {
    type: Boolean,
    required: true
  },

  consentType: {
    type: String,
    enum: [
      'privacy_policy',
      'terms_of_service',
      'marketing',
      'data_sharing',
      'cookies',
      'analytics',
      'third_party',
      'data_processing'
    ],
    index: true
  },

  // Version of terms accepted
  version: {
    type: String,
    default: '1.0'
  },

  // For consent withdrawal, reason provided
  reason: String,

  // IP and user agent for audit
  ipAddress: String,
  userAgent: String,

  // Location (if available)
  location: {
    country: String,
    city: String,
    latitude: Number,
    longitude: Number
  },

  // Metadata for additional context
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },

  // Proof of consent (hash or signature)
  proof: String,

  // Whether consent was verified
  verified: {
    type: Boolean,
    default: true
  },

  // Expiry of consent (if applicable)
  expiresAt: Date,

  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  }
}, {
  timestamps: true
});

// ==================== INDEXES ====================
consentLogSchema.index({ userId: 1, createdAt: -1 });
consentLogSchema.index({ userId: 1, action: 1, createdAt: -1 });
consentLogSchema.index({ consentType: 1, createdAt: -1 });
consentLogSchema.index({ expiresAt: 1 });
consentLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 }); // Keep for 1 year

// ==================== PRE-SAVE MIDDLEWARE ====================
consentLogSchema.pre('save', function(next) {
  // Generate proof of consent
  if (!this.proof) {
    const crypto = require('crypto');
    const data = `${this.userId}-${this.action}-${this.consent}-${this.createdAt}`;
    this.proof = crypto.createHash('sha256').update(data).digest('hex');
  }

  next();
});

// ==================== VIRTUAL PROPERTIES ====================
consentLogSchema.virtual('isExpired').get(function() {
  return this.expiresAt && new Date() > this.expiresAt;
});

consentLogSchema.virtual('age').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// ==================== METHODS ====================

/**
 * Verify consent proof
 */
consentLogSchema.methods.verifyProof = function() {
  const crypto = require('crypto');
  const data = `${this.userId}-${this.action}-${this.consent}-${this.createdAt}`;
  const proof = crypto.createHash('sha256').update(data).digest('hex');
  return proof === this.proof;
};

/**
 * Get consent details for audit
 */
consentLogSchema.methods.getAuditDetails = function() {
  return {
    logId: this._id,
    userId: this.userId,
    action: this.action,
    consent: this.consent,
    consentType: this.consentType,
    timestamp: this.createdAt,
    ipAddress: this.ipAddress,
    userAgent: this.userAgent,
    proof: this.proof,
    verified: this.verifyProof()
  };
};

// ==================== STATIC METHODS ====================

/**
 * Get latest consent for user
 */
consentLogSchema.statics.getLatestConsent = function(userId, consentType) {
  const query = { userId };
  if (consentType) query.consentType = consentType;
  
  return this.findOne(query).sort({ createdAt: -1 });
};

/**
 * Check if user has given consent
 */
consentLogSchema.statics.hasConsent = async function(userId, consentType) {
  const latest = await this.getLatestConsent(userId, consentType);
  return latest ? latest.consent : false;
};

/**
 * Get consent history for user
 */
consentLogSchema.statics.getUserHistory = function(userId, options = {}) {
  const { limit = 50, skip = 0, action } = options;
  
  const query = { userId };
  if (action) query.action = action;

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Get consent statistics
 */
consentLogSchema.statics.getStats = async function(startDate, endDate) {
  const match = {};
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  const [total, byAction, byType, acceptanceRate] = await Promise.all([
    this.countDocuments(match),
    this.aggregate([
      { $match: match },
      { $group: { _id: '$action', count: { $sum: 1 } } }
    ]),
    this.aggregate([
      { $match: match },
      { $group: { _id: '$consentType', count: { $sum: 1 } } }
    ]),
    this.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          consents: { $sum: { $cond: ['$consent', 1, 0] } }
        }
      },
      {
        $project: {
          rate: { $multiply: [{ $divide: ['$consents', '$total'] }, 100] }
        }
      }
    ])
  ]);

  return {
    total,
    byAction: byAction.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {}),
    byType: byType.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {}),
    acceptanceRate: acceptanceRate[0]?.rate || 0
  };
};

/**
 * Clean up old consent logs
 */
consentLogSchema.statics.cleanupOld = async function(daysToKeep = 365) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate }
  });

  return result.deletedCount;
};

const ConsentLog = mongoose.model('ConsentLog', consentLogSchema);

module.exports = ConsentLog;