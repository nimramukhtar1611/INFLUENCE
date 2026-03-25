// models/PasswordHistory.js - COMPLETE
const mongoose = require('mongoose');

const passwordHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  password: {
    type: String,
    required: [true, 'Password hash is required']
  },
  
  changedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  ipAddress: String,
  userAgent: String,
  
  reason: {
    type: String,
    enum: ['user_change', 'admin_reset', 'system_rotation', 'first_setup'],
    default: 'user_change'
  },
  
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// ==================== INDEXES ====================
passwordHistorySchema.index({ userId: 1, changedAt: -1 });
passwordHistorySchema.index({ userId: 1, changedAt: -1 }, { unique: false });

// TTL index - keep password history for 1 year
passwordHistorySchema.index({ changedAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// ==================== STATIC METHODS ====================

/**
 * Add password to history
 * @param {string} userId - User ID
 * @param {string} hashedPassword - Hashed password
 * @param {Object} options - Additional options
 * @returns {Promise<Object>}
 */
passwordHistorySchema.statics.addPassword = async function(userId, hashedPassword, options = {}) {
  const {
    changedBy = null,
    ipAddress = null,
    userAgent = null,
    reason = 'user_change',
    metadata = {}
  } = options;

  try {
    const historyEntry = await this.create({
      userId,
      password: hashedPassword,
      changedBy,
      ipAddress,
      userAgent,
      reason,
      metadata,
      changedAt: new Date()
    });

    return { success: true, historyEntry };
  } catch (error) {
    console.error('Error adding password to history:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if password was used before
 * @param {string} userId - User ID
 * @param {string} hashedPassword - Hashed password to check
 * @param {number} checkCount - Number of previous passwords to check
 * @returns {Promise<Object>}
 */
passwordHistorySchema.statics.checkPreviousPasswords = async function(userId, hashedPassword, checkCount = 5) {
  try {
    const history = await this.find({ userId })
      .sort({ changedAt: -1 })
      .limit(checkCount)
      .lean();

    const used = history.some(entry => entry.password === hashedPassword);
    
    if (used) {
      const lastUsed = history.find(entry => entry.password === hashedPassword)?.changedAt;
      return {
        used: true,
        lastUsed,
        message: `Password was used ${Math.floor((Date.now() - new Date(lastUsed)) / (1000 * 60 * 60 * 24))} days ago`
      };
    }

    return { used: false };
  } catch (error) {
    console.error('Error checking password history:', error);
    return { used: false, error: error.message };
  }
};

/**
 * Get password history for user
 * @param {string} userId - User ID
 * @param {number} limit - Number of entries to return
 * @returns {Promise<Array>}
 */
passwordHistorySchema.statics.getUserHistory = async function(userId, limit = 10) {
  try {
    return await this.find({ userId })
      .sort({ changedAt: -1 })
      .limit(limit)
      .lean();
  } catch (error) {
    console.error('Error getting password history:', error);
    return [];
  }
};

/**
 * Clean up old password history for user
 * @param {string} userId - User ID
 * @param {number} keepCount - Number of entries to keep
 * @returns {Promise<number>}
 */
passwordHistorySchema.statics.cleanupUserHistory = async function(userId, keepCount = 10) {
  try {
    const history = await this.find({ userId })
      .sort({ changedAt: -1 })
      .skip(keepCount)
      .select('_id');

    if (history.length > 0) {
      const ids = history.map(h => h._id);
      const result = await this.deleteMany({ _id: { $in: ids } });
      return result.deletedCount;
    }

    return 0;
  } catch (error) {
    console.error('Error cleaning up password history:', error);
    return 0;
  }
};

// ==================== INSTANCE METHODS ====================

/**
 * Get age of password in days
 * @returns {number}
 */
passwordHistorySchema.methods.getAge = function() {
  return Math.floor((Date.now() - this.changedAt) / (1000 * 60 * 60 * 24));
};

/**
 * Check if password is expired based on max age
 * @param {number} maxAgeDays - Maximum age in days
 * @returns {boolean}
 */
passwordHistorySchema.methods.isExpired = function(maxAgeDays = 90) {
  return this.getAge() > maxAgeDays;
};

const PasswordHistory = mongoose.model('PasswordHistory', passwordHistorySchema);

module.exports = PasswordHistory;