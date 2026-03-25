const mongoose = require('mongoose');

const exportRequestSchema = new mongoose.Schema({
  exportId: {
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

  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'expired'],
    default: 'pending',
    index: true
  },

  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // Export configuration
  type: {
    type: String,
    enum: ['full', 'partial', 'selected'],
    default: 'full'
  },

  selectedData: [{
    type: String,
    enum: ['profile', 'campaigns', 'deals', 'payments', 'messages', 'notifications', 'consents']
  }],

  // File information
  fileUrl: {
    type: String,
    default: null
  },
  
  filename: {
    type: String,
    default: null
  },
  
  fileSize: {
    type: Number,
    default: null
  },

  // Format
  format: {
    type: String,
    enum: ['json', 'csv', 'zip'],
    default: 'zip'
  },

  // Data summary
  summary: {
    collections: { type: Number, default: 0 },
    totalDocuments: { type: Number, default: 0 },
    size: { type: String, default: null }
  },

  // Error tracking
  error: {
    message: String,
    stack: String,
    failedAt: Date
  },

  // Timeline
  requestedAt: {
    type: Date,
    default: Date.now
  },

  startedAt: {
    type: Date,
    default: null
  },

  completedAt: {
    type: Date,
    default: null
  },

  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 7 * 24 * 60 * 60 * 1000) // 7 days
  },

  // Metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    userEmail: String
  },

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
exportRequestSchema.index({ exportId: 1 }, { unique: true });
exportRequestSchema.index({ userId: 1, createdAt: -1 });
exportRequestSchema.index({ status: 1, createdAt: -1 });
exportRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ==================== PRE-SAVE MIDDLEWARE ====================
exportRequestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Generate export ID if not exists
  if (!this.exportId) {
    const date = new Date();
    const timestamp = date.getTime().toString(36);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.exportId = `EXP-${timestamp}-${random}`;
  }

  next();
});

// ==================== VIRTUAL PROPERTIES ====================
exportRequestSchema.virtual('isExpired').get(function() {
  return this.expiresAt && new Date() > this.expiresAt;
});

exportRequestSchema.virtual('timeElapsed').get(function() {
  if (!this.startedAt) return 0;
  const end = this.completedAt || new Date();
  return Math.floor((end - this.startedAt) / 1000);
});

exportRequestSchema.virtual('estimatedTimeRemaining').get(function() {
  if (this.status !== 'processing' || this.progress === 0) return null;
  const elapsed = this.timeElapsed;
  const estimatedTotal = (elapsed / this.progress) * 100;
  return Math.max(0, Math.floor(estimatedTotal - elapsed));
});

// ==================== METHODS ====================

/**
 * Start processing the export
 */
exportRequestSchema.methods.start = async function() {
  this.status = 'processing';
  this.startedAt = new Date();
  await this.save();
};

/**
 * Update progress
 * @param {number} progress - Progress percentage
 */
exportRequestSchema.methods.updateProgress = async function(progress) {
  this.progress = Math.min(100, Math.max(0, progress));
  await this.save();
};

/**
 * Complete the export
 * @param {Object} fileData - File information
 */
exportRequestSchema.methods.complete = async function(fileData) {
  this.status = 'completed';
  this.progress = 100;
  this.completedAt = new Date();
  this.fileUrl = fileData.url;
  this.filename = fileData.filename;
  this.fileSize = fileData.size;
  this.summary = fileData.summary || {};
  await this.save();
};

/**
 * Fail the export
 * @param {Error} error - Error object
 */
exportRequestSchema.methods.fail = async function(error) {
  this.status = 'failed';
  this.error = {
    message: error.message,
    stack: error.stack,
    failedAt: new Date()
  };
  await this.save();
};

/**
 * Mark as expired
 */
exportRequestSchema.methods.expire = async function() {
  this.status = 'expired';
  await this.save();
};

/**
 * Get status information
 */
exportRequestSchema.methods.getStatus = function() {
  return {
    exportId: this.exportId,
    status: this.status,
    progress: this.progress,
    timeElapsed: this.timeElapsed,
    timeRemaining: this.estimatedTimeRemaining,
    fileUrl: this.fileUrl,
    filename: this.filename,
    fileSize: this.fileSize,
    expiresAt: this.expiresAt,
    isExpired: this.isExpired,
    createdAt: this.createdAt,
    completedAt: this.completedAt
  };
};

// ==================== STATIC METHODS ====================

/**
 * Get active exports for user
 * @param {string} userId - User ID
 */
exportRequestSchema.statics.getActiveForUser = function(userId) {
  return this.find({
    userId,
    status: { $in: ['pending', 'processing'] }
  }).sort({ createdAt: -1 });
};

/**
 * Get completed exports for user
 * @param {string} userId - User ID
 * @param {number} limit - Limit
 */
exportRequestSchema.statics.getCompletedForUser = function(userId, limit = 10) {
  return this.find({
    userId,
    status: 'completed'
  })
    .sort({ completedAt: -1 })
    .limit(limit);
};

/**
 * Clean up expired exports
 */
exportRequestSchema.statics.cleanupExpired = async function() {
  const result = await this.updateMany(
    {
      status: { $in: ['completed', 'failed', 'expired'] },
      expiresAt: { $lt: new Date() }
    },
    {
      $set: { status: 'expired' }
    }
  );
  return result.modifiedCount;
};

/**
 * Delete old export records
 * @param {number} daysToKeep - Days to keep
 */
exportRequestSchema.statics.deleteOld = async function(daysToKeep = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await this.deleteMany({
    status: { $in: ['completed', 'failed', 'expired'] },
    completedAt: { $lt: cutoffDate }
  });

  return result.deletedCount;
};

/**
 * Get export statistics
 */
exportRequestSchema.statics.getStats = async function(startDate, endDate) {
  const match = {};
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  const [total, completed, failed, pending] = await Promise.all([
    this.countDocuments(match),
    this.countDocuments({ ...match, status: 'completed' }),
    this.countDocuments({ ...match, status: 'failed' }),
    this.countDocuments({ ...match, status: { $in: ['pending', 'processing'] } })
  ]);

  const avgTime = await this.aggregate([
    { $match: { ...match, status: 'completed', startedAt: { $exists: true }, completedAt: { $exists: true } } },
    {
      $project: {
        duration: {
          $divide: [
            { $subtract: ['$completedAt', '$startedAt'] },
            1000 // convert to seconds
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        avgDuration: { $avg: '$duration' }
      }
    }
  ]);

  return {
    total,
    completed,
    failed,
    pending,
    successRate: total > 0 ? (completed / total) * 100 : 0,
    averageProcessingTime: avgTime[0]?.avgDuration || 0
  };
};

const ExportRequest = mongoose.model('ExportRequest', exportRequestSchema);

module.exports = ExportRequest;