// models/Payout.js - UPDATED (Stripe Only)
const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
  payoutId: {
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

  // Payout details
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
    default: 0,
    min: 0
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
      'cancelled',
      'on_hold'
    ],
    default: 'pending',
    index: true
  },

  // Payout method
  method: {
    type: {
      type: String,
      enum: ['bank', 'card', 'stripe'],
      required: true
    },
    details: {
      // Bank details
      bankName: String,
      accountHolderName: String,
      accountLast4: String,
      
      // Card details
      cardLast4: String,
      cardBrand: String,
      
      // Stripe details
      stripeAccountId: String
    }
  },

  // Stripe ONLY
  stripePayoutId: String,
  stripeTransferId: String,

  // Schedule
  requestedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: Date,
  completedAt: Date,
  failedAt: Date,

  // Period
  period: {
    start: Date,
    end: Date
  },

  // Breakdown of earnings
  breakdown: {
    deals: [{
      dealId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Deal'
      },
      amount: Number,
      fee: Number,
      netAmount: Number,
      description: String
    }],
    bonuses: [{
      amount: Number,
      reason: String
    }],
    adjustments: [{
      amount: Number,
      reason: String,
      type: {
        type: String,
        enum: ['credit', 'debit']
      }
    }]
  },

  // Summary
  summary: {
    totalDeals: Number,
    totalFees: Number,
    totalEarnings: Number
  },

  // Bank account reference
  bankAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount'
  },

  // Tax information
  taxWithholding: {
    amount: Number,
    rate: Number,
    reason: String
  },

  // Receipt/Invoice
  receiptUrl: String,
  invoiceNumber: String,

  // Failure reason
  failureReason: String,
  failureCode: String,

  // Notes
  notes: String,
  adminNotes: String,

  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },

  // Audit
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledBy: {
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
payoutSchema.index({ userId: 1, createdAt: -1 });
payoutSchema.index({ status: 1, createdAt: -1 });
payoutSchema.index({ stripePayoutId: 1 });
payoutSchema.index({ requestedAt: 1 });

// ==================== PRE-SAVE MIDDLEWARE ====================
payoutSchema.pre('save', async function(next) {
  this.updatedAt = Date.now();
  
  // Generate payout ID if not exists
  if (!this.payoutId) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.payoutId = `PO-${year}${month}-${random}`;
  }

  // Calculate summary
  if (this.breakdown?.deals) {
    this.summary = {
      totalDeals: this.breakdown.deals.length,
      totalFees: this.breakdown.deals.reduce((sum, d) => sum + (d.fee || 0), 0),
      totalEarnings: this.breakdown.deals.reduce((sum, d) => sum + (d.netAmount || 0), 0)
    };
  }

  // Calculate net amount
  this.netAmount = this.amount - (this.fee || 0) - (this.taxWithholding?.amount || 0);

  next();
});

// ==================== METHODS ====================

/**
 * Process payout
 * @param {Object} processData - Processing data
 * @returns {Promise}
 */
payoutSchema.methods.process = async function(processData) {
  this.status = 'processing';
  this.processedAt = new Date();
  this.processedBy = processData.processedBy;
  this.stripePayoutId = processData.stripePayoutId;
  await this.save();
};

/**
 * Complete payout
 * @param {Object} completeData - Completion data
 * @returns {Promise}
 */
payoutSchema.methods.complete = async function(completeData) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.receiptUrl = completeData.receiptUrl;
  this.invoiceNumber = completeData.invoiceNumber;
  await this.save();
};

/**
 * Fail payout
 * @param {string} reason - Failure reason
 * @param {string} code - Failure code
 * @returns {Promise}
 */
payoutSchema.methods.fail = async function(reason, code = null) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.failureReason = reason;
  this.failureCode = code;
  await this.save();
};

/**
 * Cancel payout
 * @param {string} reason - Cancellation reason
 * @returns {Promise}
 */
payoutSchema.methods.cancel = async function(reason) {
  this.status = 'cancelled';
  this.notes = reason;
  await this.save();
};

/**
 * Add to breakdown
 * @param {Object} item - Breakdown item
 * @returns {Promise}
 */
payoutSchema.methods.addBreakdownItem = async function(item) {
  if (!this.breakdown) {
    this.breakdown = { deals: [], bonuses: [], adjustments: [] };
  }

  if (item.type === 'deal') {
    this.breakdown.deals.push({
      dealId: item.dealId,
      amount: item.amount,
      fee: item.fee,
      netAmount: item.netAmount,
      description: item.description
    });
  } else if (item.type === 'bonus') {
    this.breakdown.bonuses.push({
      amount: item.amount,
      reason: item.reason
    });
  } else if (item.type === 'adjustment') {
    this.breakdown.adjustments.push({
      amount: item.amount,
      reason: item.reason,
      type: item.adjustmentType
    });
  }

  await this.save();
};

/**
 * Get payout status text
 * @returns {string}
 */
payoutSchema.methods.getStatusText = function() {
  const statusMap = {
    pending: 'Pending Review',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
    on_hold: 'On Hold'
  };
  return statusMap[this.status] || this.status;
};

/**
 * Check if can be cancelled
 * @returns {boolean}
 */
payoutSchema.methods.canCancel = function() {
  return ['pending', 'on_hold'].includes(this.status);
};

// ==================== STATIC METHODS ====================

/**
 * Get pending payouts
 * @returns {Query}
 */
payoutSchema.statics.getPending = function() {
  return this.find({ status: 'pending' }).sort({ requestedAt: 1 });
};

/**
 * Get user payouts
 * @param {string} userId - User ID
 * @param {Object} options - Pagination options
 * @returns {Query}
 */
payoutSchema.statics.getUserPayouts = function(userId, { page = 1, limit = 10 } = {}) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

/**
 * Get payout stats
 * @param {string} userId - User ID
 * @returns {Promise}
 */
payoutSchema.statics.getUserStats = async function(userId) {
  const [total, completed, pending] = await Promise.all([
    this.countDocuments({ userId }),
    this.countDocuments({ userId, status: 'completed' }),
    this.countDocuments({ userId, status: { $in: ['pending', 'processing'] } })
  ]);

  const totals = await this.aggregate([
    { $match: { userId, status: 'completed' } },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        totalFees: { $sum: '$fee' },
        totalNet: { $sum: '$netAmount' }
      }
    }
  ]);

  return {
    total,
    completed,
    pending,
    totalAmount: totals[0]?.totalAmount || 0,
    totalFees: totals[0]?.totalFees || 0,
    totalNet: totals[0]?.totalNet || 0
  };
};

/**
 * Get payout summary
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise}
 */
payoutSchema.statics.getSummary = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalPayouts: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalFees: { $sum: '$fee' },
        totalNet: { $sum: '$netAmount' },
        avgAmount: { $avg: '$amount' }
      }
    }
  ]);
};

const Payout = mongoose.model('Payout', payoutSchema);

module.exports = Payout;