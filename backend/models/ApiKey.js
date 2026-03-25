// models/ApiKey.js - COMPLETE
const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema({
  keyId: {
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

  // API Key (hashed)
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Key prefix (for identification)
  prefix: {
    type: String,
    required: true,
    index: true
  },

  // Key name/description
  name: {
    type: String,
    required: true
  },

  description: String,

  // Permissions
  permissions: [{
    type: String,
    enum: [
      'read:campaigns',
      'write:campaigns',
      'delete:campaigns',
      'read:deals',
      'write:deals',
      'read:payments',
      'write:payments',
      'read:users',
      'write:users',
      'read:analytics',
      'admin:all'
    ]
  }],

  // IP Whitelist
  ipWhitelist: [String],

  // Rate limits (per minute)
  rateLimit: {
    type: Number,
    default: 60 // requests per minute
  },

  // Usage
  usage: {
    count: { type: Number, default: 0 },
    lastUsedAt: Date,
    monthlyUsage: [{
      month: String,
      count: Number
    }]
  },

  // Expiry
  expiresAt: Date,

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired', 'revoked'],
    default: 'active',
    index: true
  },

  // Last rotated
  lastRotatedAt: Date,

  // Environment
  environment: {
    type: String,
    enum: ['development', 'staging', 'production'],
    default: 'production'
  },

  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },

  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  revokedAt: Date,
  revocationReason: String,

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// ==================== INDEXES ====================
apiKeySchema.index({ keyId: 1 }, { unique: true });
apiKeySchema.index({ key: 1 }, { unique: true });
apiKeySchema.index({ prefix: 1 });
apiKeySchema.index({ userId: 1, status: 1 });
apiKeySchema.index({ expiresAt: 1 });

// ==================== PRE-SAVE MIDDLEWARE ====================
apiKeySchema.pre('save', async function(next) {
  this.updatedAt = Date.now();
  
  // Generate key ID if not exists
  if (!this.keyId) {
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    this.keyId = `KEY-${random}`;
  }

  // Generate prefix if not exists
  if (!this.prefix && this.key) {
    this.prefix = this.key.substring(0, 8);
  }

  next();
});

// ==================== METHODS ====================

/**
 * Validate API key
 * @param {string} providedKey - Key to validate
 * @returns {boolean}
 */
apiKeySchema.methods.validateKey = function(providedKey) {
  return this.key === providedKey && this.status === 'active';
};

/**
 * Check if IP is whitelisted
 * @param {string} ip - IP address
 * @returns {boolean}
 */
apiKeySchema.methods.isIpWhitelisted = function(ip) {
  if (!this.ipWhitelist || this.ipWhitelist.length === 0) return true;
  return this.ipWhitelist.includes(ip);
};

/**
 * Check if has permission
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
apiKeySchema.methods.hasPermission = function(permission) {
  if (this.permissions.includes('admin:all')) return true;
  return this.permissions.includes(permission);
};

/**
 * Check if expired
 * @returns {boolean}
 */
apiKeySchema.methods.isExpired = function() {
  return this.expiresAt && new Date() > this.expiresAt;
};

/**
 * Record usage
 * @param {string} ip - IP address
 * @returns {Promise}
 */
apiKeySchema.methods.recordUsage = async function(ip) {
  this.usage.count += 1;
  this.usage.lastUsedAt = new Date();
  
  // Track monthly usage
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  const monthlyIndex = this.usage.monthlyUsage.findIndex(m => m.month === month);
  
  if (monthlyIndex >= 0) {
    this.usage.monthlyUsage[monthlyIndex].count += 1;
  } else {
    this.usage.monthlyUsage.push({ month, count: 1 });
  }
  
  // Keep only last 12 months
  if (this.usage.monthlyUsage.length > 12) {
    this.usage.monthlyUsage = this.usage.monthlyUsage.slice(-12);
  }
  
  await this.save();
};

/**
 * Rotate API key
 * @returns {Promise<string>} New key
 */
apiKeySchema.methods.rotate = async function() {
  const newKey = crypto.randomBytes(32).toString('hex');
  this.key = newKey;
  this.prefix = newKey.substring(0, 8);
  this.lastRotatedAt = new Date();
  await this.save();
  return newKey;
};

/**
 * Revoke API key
 * @param {string} reason - Revocation reason
 * @param {string} revokedBy - Admin user ID
 * @returns {Promise}
 */
apiKeySchema.methods.revoke = async function(reason, revokedBy) {
  this.status = 'revoked';
  this.revokedAt = new Date();
  this.revocationReason = reason;
  this.revokedBy = revokedBy;
  await this.save();
};

/**
 * Activate API key
 * @returns {Promise}
 */
apiKeySchema.methods.activate = async function() {
  this.status = 'active';
  await this.save();
};

/**
 * Deactivate API key
 * @returns {Promise}
 */
apiKeySchema.methods.deactivate = async function() {
  this.status = 'inactive';
  await this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Generate new API key
 * @param {string} userId - User ID
 * @param {Object} options - Key options
 * @returns {Promise<Object>}
 */
apiKeySchema.statics.generateKey = async function(userId, options = {}) {
  const {
    name = 'API Key',
    description = '',
    permissions = [],
    ipWhitelist = [],
    rateLimit = 60,
    expiresIn = null, // in days
    environment = 'production'
  } = options;

  // Generate secure key
  const key = crypto.randomBytes(32).toString('hex');
  const prefix = key.substring(0, 8);

  // Calculate expiry
  let expiresAt = null;
  if (expiresIn) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresIn);
  }

  const apiKey = new this({
    userId,
    key,
    prefix,
    name,
    description,
    permissions,
    ipWhitelist,
    rateLimit,
    expiresAt,
    environment,
    status: 'active'
  });

  await apiKey.save();

  // Return key (only shown once)
  return {
    ...apiKey.toObject(),
    key // Include plain text key for user to save
  };
};

/**
 * Validate and get API key
 * @param {string} key - API key to validate
 * @param {string} ip - IP address
 * @returns {Promise<Object>}
 */
apiKeySchema.statics.validateAndGet = async function(key, ip) {
  const apiKey = await this.findOne({ key }).populate('userId', 'email fullName userType');
  
  if (!apiKey) {
    throw new Error('Invalid API key');
  }

  if (apiKey.status !== 'active') {
    throw new Error('API key is not active');
  }

  if (apiKey.isExpired()) {
    throw new Error('API key has expired');
  }

  if (!apiKey.isIpWhitelisted(ip)) {
    throw new Error('IP address not whitelisted');
  }

  return apiKey;
};

/**
 * Get user's API keys
 * @param {string} userId - User ID
 * @returns {Query}
 */
apiKeySchema.statics.getUserKeys = function(userId) {
  return this.find({ userId })
    .select('-key') // Don't return actual key
    .sort({ createdAt: -1 });
};

/**
 * Get expiring keys
 * @param {number} days - Days threshold
 * @returns {Query}
 */
apiKeySchema.statics.getExpiringKeys = function(days = 7) {
  const future = new Date();
  future.setDate(future.getDate() + days);
  
  return this.find({
    status: 'active',
    expiresAt: { $lte: future, $gt: new Date() }
  }).populate('userId', 'email');
};

/**
 * Get expired keys
 * @returns {Query}
 */
apiKeySchema.statics.getExpiredKeys = function() {
  return this.find({
    status: 'active',
    expiresAt: { $lt: new Date() }
  });
};

/**
 * Get stats
 * @returns {Promise}
 */
apiKeySchema.statics.getStats = async function() {
  const [total, active, expired, revoked] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ status: 'active' }),
    this.countDocuments({ status: 'expired' }),
    this.countDocuments({ status: 'revoked' })
  ]);

  const usage = await this.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: null,
        totalCalls: { $sum: '$usage.count' },
        avgCalls: { $avg: '$usage.count' }
      }
    }
  ]);

  return {
    total,
    active,
    expired,
    revoked,
    totalCalls: usage[0]?.totalCalls || 0,
    avgCalls: usage[0]?.avgCalls || 0
  };
};

const ApiKey = mongoose.model('ApiKey', apiKeySchema);

module.exports = ApiKey;