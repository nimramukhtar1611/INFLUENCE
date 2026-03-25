// models/TransactionLog.js - UPDATED (Stripe Only)
const mongoose = require('mongoose');

const transactionLogSchema = new mongoose.Schema({
  logId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Transaction reference
  transactionId: {
    type: String,
    required: true,
    index: true
  },

  // Related entities
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    index: true
  },
  
  dealId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal',
    index: true
  },
  
  payoutId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payout',
    index: true
  },
  
  refundId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Refund',
    index: true
  },

  // Transaction type
  type: {
    type: String,
    enum: [
      'payment',
      'refund',
      'payout',
      'fee',
      'subscription',
      'escrow',
      'withdrawal',
      'deposit'
    ],
    required: true,
    index: true
  },

  // Action
  action: {
    type: String,
    enum: [
      'created',
      'processed',
      'completed',
      'failed',
      'cancelled',
      'refunded',
      'released'
    ],
    required: true
  },

  // Amount
  amount: {
    type: Number,
    required: true,
    min: 0
  },

  currency: {
    type: String,
    default: 'USD'
  },

  // Status
  status: {
    type: String,
    enum: [
      'pending',
      'processing',
      'completed',
      'failed',
      'cancelled'
    ],
    required: true
  },

  // Stripe ONLY
  stripeEventId: String,
  stripeEventType: String,
  stripePaymentIntentId: String,
  stripeChargeId: String,
  stripeRefundId: String,
  stripePayoutId: String,

  // Request/Response
  request: {
    method: String,
    url: String,
    headers: mongoose.Schema.Types.Mixed,
    body: mongoose.Schema.Types.Mixed,
    timestamp: Date
  },

  response: {
    status: Number,
    headers: mongoose.Schema.Types.Mixed,
    body: mongoose.Schema.Types.Mixed,
    timestamp: Date
  },

  // Error
  error: {
    code: String,
    message: String,
    stack: String
  },

  // Timing
  duration: Number, // in milliseconds

  // IP and User Agent
  ipAddress: String,
  userAgent: String,

  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },

  // Notes
  notes: String,

  createdAt: {
    type: Date,
    default: Date.now,
    expires: 90 * 24 * 60 * 60 // 90 days TTL
  }
}, {
  timestamps: true
});

// ==================== INDEXES ====================
transactionLogSchema.index({ logId: 1 }, { unique: true });
transactionLogSchema.index({ transactionId: 1 });
transactionLogSchema.index({ userId: 1, createdAt: -1 });
transactionLogSchema.index({ paymentId: 1 });
transactionLogSchema.index({ dealId: 1 });
transactionLogSchema.index({ type: 1, action: 1, createdAt: -1 });
transactionLogSchema.index({ status: 1, createdAt: -1 });
transactionLogSchema.index({ stripeEventId: 1 });
transactionLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// ==================== PRE-SAVE MIDDLEWARE ====================
transactionLogSchema.pre('save', async function(next) {
  // Generate log ID if not exists
  if (!this.logId) {
    const date = new Date();
    const timestamp = date.getTime().toString(36);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.logId = `LOG-${timestamp}-${random}`;
  }
  next();
});

// ==================== METHODS ====================

/**
 * Mark as success
 * @param {Object} responseData - Response data
 * @returns {Promise}
 */
transactionLogSchema.methods.success = async function(responseData) {
  this.response = {
    status: responseData.status,
    headers: responseData.headers,
    body: responseData.body,
    timestamp: new Date()
  };
  this.status = 'completed';
  await this.save();
};

/**
 * Mark as failure
 * @param {Error} error - Error object
 * @param {Object} responseData - Response data (optional)
 * @returns {Promise}
 */
transactionLogSchema.methods.failure = async function(error, responseData = null) {
  this.status = 'failed';
  this.error = {
    code: error.code,
    message: error.message,
    stack: error.stack
  };
  
  if (responseData) {
    this.response = {
      status: responseData.status,
      headers: responseData.headers,
      body: responseData.body,
      timestamp: new Date()
    };
  }
  
  await this.save();
};

/**
 * Add metadata
 * @param {string} key - Metadata key
 * @param {any} value - Metadata value
 * @returns {Promise}
 */
transactionLogSchema.methods.addMetadata = async function(key, value) {
  if (!this.metadata) {
    this.metadata = new Map();
  }
  this.metadata.set(key, value);
  await this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Create log entry
 * @param {Object} data - Log data
 * @returns {Promise}
 */
transactionLogSchema.statics.createLog = async function(data) {
  return this.create({
    transactionId: data.transactionId,
    userId: data.userId,
    paymentId: data.paymentId,
    dealId: data.dealId,
    payoutId: data.payoutId,
    refundId: data.refundId,
    type: data.type,
    action: data.action,
    amount: data.amount,
    currency: data.currency,
    status: data.status || 'pending',
    stripeEventId: data.stripeEventId,
    stripeEventType: data.stripeEventType,
    request: data.request,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    metadata: data.metadata,
    notes: data.notes
  });
};

/**
 * Get logs by transaction
 * @param {string} transactionId - Transaction ID
 * @returns {Query}
 */
transactionLogSchema.statics.getByTransaction = function(transactionId) {
  return this.find({ transactionId }).sort({ createdAt: -1 });
};

/**
 * Get logs by user
 * @param {string} userId - User ID
 * @param {Object} options - Pagination options
 * @returns {Query}
 */
transactionLogSchema.statics.getByUser = function(userId, { page = 1, limit = 20 } = {}) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

/**
 * Get failed transactions
 * @param {Date} since - Since date
 * @returns {Query}
 */
transactionLogSchema.statics.getFailed = function(since = new Date(Date.now() - 24 * 60 * 60 * 1000)) {
  return this.find({
    status: 'failed',
    createdAt: { $gte: since }
  }).sort({ createdAt: -1 });
};

/**
 * Get Stripe webhook events
 * @param {string} eventId - Stripe event ID
 * @returns {Query}
 */
transactionLogSchema.statics.getStripeEvent = function(eventId) {
  return this.findOne({ stripeEventId: eventId });
};

/**
 * Get stats
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise}
 */
transactionLogSchema.statics.getStats = async function(startDate, endDate) {
  const match = {
    createdAt: { $gte: startDate, $lte: endDate }
  };

  const [total, completed, failed] = await Promise.all([
    this.countDocuments(match),
    this.countDocuments({ ...match, status: 'completed' }),
    this.countDocuments({ ...match, status: 'failed' })
  ]);

  const byType = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        failed: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        }
      }
    }
  ]);

  return {
    total,
    completed,
    failed,
    successRate: total > 0 ? (completed / total) * 100 : 0,
    byType
  };
};

const TransactionLog = mongoose.model('TransactionLog', transactionLogSchema);

module.exports = TransactionLog;