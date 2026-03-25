// models/Refund.js - UPDATED (Stripe Only)
const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
  refundId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Related entities
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true,
    index: true
  },
  
  dealId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal',
    index: true
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Refund details
  amount: {
    type: Number,
    required: true,
    min: 0
  },

  currency: {
    type: String,
    default: 'USD'
  },

  fee: {
    type: Number,
    default: 0
  },

  netAmount: {
    type: Number,
    default: function() {
      return this.amount - this.fee;
    }
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
    default: 'pending',
    index: true
  },

  // Reason
  reason: {
    type: {
      type: String,
      enum: [
        'customer_request',
        'duplicate_payment',
        'fraudulent',
        'product_issue',
        'service_issue',
        'cancellation',
        'other'
      ],
      required: true
    },
    description: String,
    requestedBy: {
      type: {
        type: String,
        enum: ['customer', 'admin', 'system']
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }
  },

  // Stripe ONLY
  stripeRefundId: String,
  stripePaymentIntentId: String,
  stripeChargeId: String,

  // Timeline
  requestedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: Date,
  completedAt: Date,
  failedAt: Date,

  // Method
  method: {
    type: String,
    enum: ['original', 'balance', 'bank', 'other'],
    default: 'original'
  },

  // Destination (if not original)
  destination: {
    type: String,
    enum: ['card', 'bank', 'balance']
  },

  // Bank details (if bank transfer)
  bankDetails: {
    bankName: String,
    accountHolder: String,
    accountLast4: String
  },

  // Failure reason
  failureReason: String,
  failureCode: String,

  // Notes
  notes: String,
  adminNotes: String,

  // Approval
  requiresApproval: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  approvalNotes: String,

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
refundSchema.index({ refundId: 1 }, { unique: true });
refundSchema.index({ paymentId: 1 });
refundSchema.index({ userId: 1, createdAt: -1 });
refundSchema.index({ status: 1, requestedAt: 1 });
refundSchema.index({ stripeRefundId: 1 });

// ==================== PRE-SAVE MIDDLEWARE ====================
refundSchema.pre('save', async function(next) {
  this.updatedAt = Date.now();
  
  // Generate refund ID if not exists
  if (!this.refundId) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.refundId = `REF-${year}${month}-${random}`;
  }

  // Calculate net amount
  this.netAmount = this.amount - (this.fee || 0);

  next();
});

// ==================== METHODS ====================

/**
 * Process refund
 * @param {Object} processData - Processing data
 * @returns {Promise}
 */
refundSchema.methods.process = async function(processData) {
  this.status = 'processing';
  this.processedAt = new Date();
  this.stripeRefundId = processData.stripeRefundId;
  await this.save();
};

/**
 * Complete refund
 * @param {Object} completeData - Completion data
 * @returns {Promise}
 */
refundSchema.methods.complete = async function(completeData) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.notes = completeData.notes;
  await this.save();
};

/**
 * Fail refund
 * @param {string} reason - Failure reason
 * @param {string} code - Failure code
 * @returns {Promise}
 */
refundSchema.methods.fail = async function(reason, code = null) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.failureReason = reason;
  this.failureCode = code;
  await this.save();
};

/**
 * Cancel refund
 * @param {string} reason - Cancellation reason
 * @returns {Promise}
 */
refundSchema.methods.cancel = async function(reason) {
  this.status = 'cancelled';
  this.notes = reason;
  await this.save();
};

/**
 * Approve refund
 * @param {string} approvedBy - Admin user ID
 * @param {string} notes - Approval notes
 * @returns {Promise}
 */
refundSchema.methods.approve = async function(approvedBy, notes) {
  this.requiresApproval = false;
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  this.approvalNotes = notes;
  await this.save();
};

/**
 * Get status text
 * @returns {string}
 */
refundSchema.methods.getStatusText = function() {
  const statusMap = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled'
  };
  return statusMap[this.status] || this.status;
};

/**
 * Check if can be cancelled
 * @returns {boolean}
 */
refundSchema.methods.canCancel = function() {
  return ['pending', 'processing'].includes(this.status);
};

// ==================== STATIC METHODS ====================

/**
 * Get pending refunds
 * @returns {Query}
 */
refundSchema.statics.getPending = function() {
  return this.find({ status: 'pending' })
    .populate('userId', 'fullName email')
    .populate('paymentId')
    .sort({ requestedAt: 1 });
};

/**
 * Get refunds requiring approval
 * @returns {Query}
 */
refundSchema.statics.getRequiringApproval = function() {
  return this.find({ 
    requiresApproval: true,
    status: 'pending'
  })
    .populate('userId', 'fullName email')
    .populate('paymentId')
    .sort({ requestedAt: 1 });
};

/**
 * Get user refunds
 * @param {string} userId - User ID
 * @param {Object} options - Pagination options
 * @returns {Query}
 */
refundSchema.statics.getUserRefunds = function(userId, { page = 1, limit = 10 } = {}) {
  return this.find({ userId })
    .populate('paymentId')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

/**
 * Get refund stats
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise}
 */
refundSchema.statics.getStats = async function(startDate, endDate) {
  const match = {
    createdAt: { $gte: startDate, $lte: endDate }
  };

  const [total, completed, failed, pending] = await Promise.all([
    this.countDocuments(match),
    this.countDocuments({ ...match, status: 'completed' }),
    this.countDocuments({ ...match, status: 'failed' }),
    this.countDocuments({ ...match, status: 'pending' })
  ]);

  const totals = await this.aggregate([
    { $match: { ...match, status: 'completed' } },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        totalFees: { $sum: '$fee' },
        totalNet: { $sum: '$netAmount' },
        avgAmount: { $avg: '$amount' }
      }
    }
  ]);

  const byReason = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$reason.type',
        count: { $sum: 1 },
        amount: { $sum: '$amount' }
      }
    }
  ]);

  return {
    total,
    completed,
    failed,
    pending,
    totalAmount: totals[0]?.totalAmount || 0,
    totalFees: totals[0]?.totalFees || 0,
    totalNet: totals[0]?.totalNet || 0,
    avgAmount: totals[0]?.avgAmount || 0,
    byReason: byReason.reduce((acc, curr) => {
      acc[curr._id] = { count: curr.count, amount: curr.amount };
      return acc;
    }, {})
  };
};

const Refund = mongoose.model('Refund', refundSchema);

module.exports = Refund;