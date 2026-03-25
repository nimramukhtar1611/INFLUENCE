const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Session token (JWT ID)
  tokenId: {
    type: String,
    required: true,
    index: true
  },

  // Device information
  device: {
    type: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop', 'bot', 'other'],
      default: 'other'
    },
    name: String,
    brand: String,
    model: String,
    os: {
      name: String,
      version: String
    },
    browser: {
      name: String,
      version: String
    },
    isMobile: Boolean,
    isTablet: Boolean,
    isDesktop: Boolean,
    isBot: Boolean
  },

  // Location information
  location: {
    ip: String,
    country: String,
    city: String,
    region: String,
    latitude: Number,
    longitude: Number,
    timezone: String,
    isp: String
  },

  // User agent
  userAgent: {
    type: String,
    required: true
  },

  // Activity tracking
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  lastActivity: {
    type: Date,
    default: Date.now,
    index: true
  },

  expiresAt: {
    type: Date,
    required: true,
    index: true
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  },

  isValid: {
    type: Boolean,
    default: true
  },

  // Security
  isCurrent: {
    type: Boolean,
    default: false
  },

  authMethod: {
    type: String,
    enum: ['password', 'google', 'facebook', 'instagram', 'magic_link', '2fa'],
    default: 'password'
  },

  // Refresh token info
  refreshTokenId: String,
  refreshTokenExpiresAt: Date,

  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },

  // Termination
  terminatedAt: Date,
  terminatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  terminationReason: {
    type: String,
    enum: ['logout', 'expired', 'revoked', 'password_change', 'admin_termination']
  }
}, {
  timestamps: true
});

// ==================== INDEXES ====================
sessionSchema.index({ sessionId: 1 }, { unique: true });
sessionSchema.index({ userId: 1, isActive: 1, lastActivity: -1 });
sessionSchema.index({ userId: 1, isCurrent: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ tokenId: 1 });
sessionSchema.index({ refreshTokenId: 1 });
sessionSchema.index({ 'location.country': 1, 'location.city': 1 });

// ==================== PRE-SAVE MIDDLEWARE ====================
sessionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Generate session ID if not exists
  if (!this.sessionId) {
    this.sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Auto-deactivate if expired
  if (this.expiresAt && new Date() > this.expiresAt) {
    this.isActive = false;
    this.isValid = false;
  }

  next();
});

// ==================== VIRTUAL PROPERTIES ====================
sessionSchema.virtual('isExpired').get(function() {
  return this.expiresAt && new Date() > this.expiresAt;
});

sessionSchema.virtual('age').get(function() {
  return Math.floor((Date.now() - this.createdAt) / 1000);
});

sessionSchema.virtual('inactiveTime').get(function() {
  return Math.floor((Date.now() - this.lastActivity) / 1000);
});

sessionSchema.virtual('locationString').get(function() {
  const parts = [];
  if (this.location?.city) parts.push(this.location.city);
  if (this.location?.region) parts.push(this.location.region);
  if (this.location?.country) parts.push(this.location.country);
  return parts.join(', ') || 'Unknown';
});

sessionSchema.virtual('deviceString').get(function() {
  const parts = [];
  if (this.device?.browser?.name) parts.push(this.device.browser.name);
  if (this.device?.os?.name) parts.push(this.device.os.name);
  return parts.join(' on ') || 'Unknown device';
});

// ==================== METHODS ====================

/**
 * Update last activity
 */
sessionSchema.methods.updateActivity = async function() {
  this.lastActivity = new Date();
  
  // Extend expiry if within threshold
  if (!this.isExpired && this.expiresAt) {
    const timeLeft = this.expiresAt - new Date();
    if (timeLeft < 30 * 60 * 1000) { // Less than 30 minutes left
      this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Extend by 7 days
    }
  }
  
  await this.save();
};

/**
 * Mark as current session
 */
sessionSchema.methods.markAsCurrent = async function() {
  // Unmark other sessions
  await this.constructor.updateMany(
    { userId: this.userId, isCurrent: true },
    { $set: { isCurrent: false } }
  );
  
  this.isCurrent = true;
  await this.save();
};

/**
 * Terminate session
 * @param {string} reason - Termination reason
 * @param {string} terminatedBy - User ID who terminated
 */
sessionSchema.methods.terminate = async function(reason, terminatedBy = null) {
  this.isActive = false;
  this.isValid = false;
  this.isCurrent = false;
  this.terminatedAt = new Date();
  this.terminationReason = reason;
  if (terminatedBy) {
    this.terminatedBy = terminatedBy;
  }
  await this.save();
};

/**
 * Extend session expiry
 * @param {number} days - Days to extend
 */
sessionSchema.methods.extend = async function(days = 7) {
  this.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await this.save();
};

/**
 * Check if session can be refreshed
 */
sessionSchema.methods.canRefresh = function() {
  return this.isActive && 
         this.isValid && 
         !this.isExpired && 
         this.refreshTokenExpiresAt && 
         new Date() < this.refreshTokenExpiresAt;
};

/**
 * Get session summary
 */
sessionSchema.methods.getSummary = function() {
  return {
    sessionId: this.sessionId,
    device: this.deviceString,
    location: this.locationString,
    ip: this.location?.ip,
    lastActive: this.lastActivity,
    isCurrent: this.isCurrent,
    isActive: this.isActive,
    age: this.age,
    inactiveFor: this.inactiveTime
  };
};

// ==================== STATIC METHODS ====================

/**
 * Create new session
 * @param {string} userId - User ID
 * @param {Object} data - Session data
 */
sessionSchema.statics.createSession = async function(userId, data) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days default

  const session = new this({
    userId,
    tokenId: data.tokenId,
    device: data.device,
    location: data.location,
    userAgent: data.userAgent,
    expiresAt,
    authMethod: data.authMethod || 'password',
    refreshTokenId: data.refreshTokenId,
    refreshTokenExpiresAt: data.refreshTokenExpiresAt,
    metadata: data.metadata
  });

  await session.save();
  return session;
};

/**
 * Get active sessions for user
 * @param {string} userId - User ID
 */
sessionSchema.statics.getActiveSessions = function(userId) {
  return this.find({
    userId,
    isActive: true,
    isValid: true,
    expiresAt: { $gt: new Date() }
  }).sort({ isCurrent: -1, lastActivity: -1 });
};

/**
 * Terminate all user sessions except current
 * @param {string} userId - User ID
 * @param {string} currentSessionId - Current session ID to keep
 * @param {string} reason - Termination reason
 */
sessionSchema.statics.terminateAllExcept = async function(userId, currentSessionId, reason) {
  const result = await this.updateMany(
    {
      userId,
      _id: { $ne: currentSessionId },
      isActive: true
    },
    {
      $set: {
        isActive: false,
        isValid: false,
        isCurrent: false,
        terminatedAt: new Date(),
        terminationReason: reason
      }
    }
  );
  return result.modifiedCount;
};

/**
 * Clean up expired sessions
 */
sessionSchema.statics.cleanupExpired = async function() {
  const result = await this.updateMany(
    {
      isActive: true,
      expiresAt: { $lt: new Date() }
    },
    {
      $set: {
        isActive: false,
        isValid: false,
        terminatedAt: new Date(),
        terminationReason: 'expired'
      }
    }
  );
  return result.modifiedCount;
};

/**
 * Get session statistics
 */
sessionSchema.statics.getStats = async function(userId) {
  const [total, active, expired] = await Promise.all([
    this.countDocuments({ userId }),
    this.countDocuments({ userId, isActive: true, expiresAt: { $gt: new Date() } }),
    this.countDocuments({ userId, isActive: false })
  ]);

  const devices = await this.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: '$device.type',
        count: { $sum: 1 },
        lastUsed: { $max: '$lastActivity' }
      }
    }
  ]);

  const locations = await this.aggregate([
    { $match: { userId, 'location.country': { $exists: true } } },
    {
      $group: {
        _id: '$location.country',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);

  return {
    total,
    active,
    expired,
    devices: devices.reduce((acc, curr) => {
      acc[curr._id || 'other'] = { count: curr.count, lastUsed: curr.lastUsed };
      return acc;
    }, {}),
    topLocations: locations.map(l => ({ country: l._id, count: l.count }))
  };
};

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;