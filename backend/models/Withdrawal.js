const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  withdrawalId: {
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

  // Withdrawal details
  amount: {
    type: Number,
    required: true,
    min: [1, 'Amount must be at least 1'],
    max: [1000000, 'Amount cannot exceed 1,000,000']
  },

  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD']
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
      'pending',      // Initial state - waiting for admin approval
      'processing',    // Being processed by payment system
      'completed',     // Successfully completed
      'failed',        // Failed (will be retried or refunded)
      'cancelled',     // Cancelled by user
      'rejected',      // Rejected by admin
      'on_hold'        // On hold for review
    ],
    default: 'pending',
    index: true
  },

  // Payment method
  paymentMethod: {
    type: {
      type: String,
      enum: ['paypal', 'bank_account', 'stripe', 'wire_transfer'],
      required: true
    },
    details: {
      // PayPal
      paypalEmail: String,
      paypalTransactionId: String,
      
      // Bank Account
      bankName: String,
      accountHolderName: String,
      accountNumber: String,
      routingNumber: String,
      swiftCode: String,
      iban: String,
      
      // Stripe
      stripeTransferId: String,
      stripePayoutId: String,
      
      // Wire Transfer
      wireReference: String,
      intermediaryBank: String
    },
    last4: String // Last 4 digits of account/card
  },

  // Bank account reference (if using saved account)
  bankAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount'
  },

  // Processing details
  requestedAt: {
    type: Date,
    default: Date.now
  },

  processedAt: {
    type: Date
  },

  completedAt: {
    type: Date
  },

  failedAt: {
    type: Date
  },

  cancelledAt: {
    type: Date
  },

  // Transaction references
  transactionId: {
    type: String,
    sparse: true,
    index: true
  },

  reference: String,

  // Batch processing
  batchId: {
    type: String,
    index: true
  },

  isBatchProcessed: {
    type: Boolean,
    default: false
  },

  // Fee breakdown
  feeBreakdown: {
    platformFee: { type: Number, default: 0 },
    gatewayFee: { type: Number, default: 0 },
    currencyConversion: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },

  // Exchange rate (if different currency)
  exchangeRate: {
    type: Number,
    default: 1
  },

  originalAmount: Number,
  originalCurrency: String,

  // Admin actions
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  approvedAt: Date,

  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  rejectedAt: Date,
  rejectionReason: String,

  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  cancellationReason: String,

  // Notes
  userNotes: String,
  adminNotes: String,

  // Metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    source: {
      type: String,
      enum: ['web', 'mobile', 'api'],
      default: 'web'
    }
  },

  // For failed withdrawals - retry tracking
  retryCount: {
    type: Number,
    default: 0
  },
  
  lastRetryAt: Date,
  
  failureReason: String,
  failureCode: String,

  // Receipt
  receiptUrl: String,
  receiptGeneratedAt: Date,

  // Tax information
  taxWithholding: {
    amount: Number,
    rate: Number,
    reason: String
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
withdrawalSchema.index({ withdrawalId: 1 }, { unique: true });
withdrawalSchema.index({ userId: 1, createdAt: -1 });
withdrawalSchema.index({ status: 1, createdAt: -1 });
withdrawalSchema.index({ batchId: 1, status: 1 });
withdrawalSchema.index({ transactionId: 1 });
withdrawalSchema.index({ bankAccountId: 1 });
withdrawalSchema.index({ requestedAt: 1, status: 1 });
withdrawalSchema.index({ 'paymentMethod.type': 1, status: 1 });

// Compound indexes for reporting
withdrawalSchema.index({ 
  status: 1, 
  requestedAt: 1, 
  amount: 1 
});

withdrawalSchema.index({ 
  userId: 1, 
  status: 1, 
  createdAt: -1 
});

// ==================== PRE-SAVE MIDDLEWARE ====================
withdrawalSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Generate withdrawal ID if not exists
  if (!this.withdrawalId) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.withdrawalId = `WTH-${year}${month}-${random}`;
  }

  // Calculate net amount
  this.netAmount = this.amount - (this.fee || 0);

  // Apply tax withholding if applicable
  if (this.taxWithholding?.amount) {
    this.netAmount -= this.taxWithholding.amount;
  }

  next();
});

// ==================== VIRTUAL PROPERTIES ====================

// Days since requested
withdrawalSchema.virtual('daysSinceRequested').get(function() {
  return Math.floor((Date.now() - this.requestedAt) / (1000 * 60 * 60 * 24));
});

// Processing time (if completed)
withdrawalSchema.virtual('processingTime').get(function() {
  if (this.completedAt && this.requestedAt) {
    return Math.floor((this.completedAt - this.requestedAt) / (1000 * 60 * 60));
  }
  return null;
});

// Is overdue (pending for more than 3 days)
withdrawalSchema.virtual('isOverdue').get(function() {
  return this.status === 'pending' && this.daysSinceRequested > 3;
});

// Can be cancelled by user
withdrawalSchema.virtual('canBeCancelled').get(function() {
  return ['pending', 'on_hold'].includes(this.status);
});

// Can be retried
withdrawalSchema.virtual('canBeRetried').get(function() {
  return this.status === 'failed' && this.retryCount < 3;
});

// Formatted amount with currency
withdrawalSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency
  }).format(this.amount);
});

// Formatted net amount
withdrawalSchema.virtual('formattedNetAmount').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency
  }).format(this.netAmount);
});

// ==================== METHODS ====================

/**
 * Approve withdrawal
 * @param {string} adminId - Admin user ID
 * @param {string} notes - Admin notes
 */
withdrawalSchema.methods.approve = async function(adminId, notes = '') {
  this.status = 'processing';
  this.approvedBy = adminId;
  this.approvedAt = new Date();
  this.adminNotes = notes;
  await this.save();
};

/**
 * Complete withdrawal
 * @param {Object} data - Completion data
 */
withdrawalSchema.methods.complete = async function(data = {}) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.transactionId = data.transactionId;
  this.reference = data.reference;
  this.receiptUrl = data.receiptUrl;
  this.receiptGeneratedAt = new Date();
  this.processedBy = data.processedBy;
  await this.save();
};

/**
 * Fail withdrawal
 * @param {string} reason - Failure reason
 * @param {string} code - Failure code
 */
withdrawalSchema.methods.fail = async function(reason, code = null) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.failureReason = reason;
  this.failureCode = code;
  this.retryCount += 1;
  this.lastRetryAt = new Date();
  await this.save();
};

/**
 * Reject withdrawal
 * @param {string} adminId - Admin user ID
 * @param {string} reason - Rejection reason
 */
withdrawalSchema.methods.reject = async function(adminId, reason) {
  this.status = 'rejected';
  this.rejectedBy = adminId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  await this.save();
};

/**
 * Cancel withdrawal
 * @param {string} userId - User ID
 * @param {string} reason - Cancellation reason
 */
withdrawalSchema.methods.cancel = async function(userId, reason) {
  this.status = 'cancelled';
  this.cancelledBy = userId;
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  await this.save();
};

/**
 * Put on hold
 * @param {string} adminId - Admin user ID
 * @param {string} reason - Hold reason
 */
withdrawalSchema.methods.hold = async function(adminId, reason) {
  this.status = 'on_hold';
  this.adminNotes = reason;
  await this.save();
};

/**
 * Add to batch
 * @param {string} batchId - Batch ID
 */
withdrawalSchema.methods.addToBatch = async function(batchId) {
  this.batchId = batchId;
  this.isBatchProcessed = false;
  await this.save();
};

/**
 * Mark batch as processed
 */
withdrawalSchema.methods.markBatchProcessed = async function() {
  this.isBatchProcessed = true;
  await this.save();
};

/**
 * Generate receipt
 * @returns {Object} Receipt data
 */
withdrawalSchema.methods.generateReceipt = function() {
  const receipt = {
    withdrawalId: this.withdrawalId,
    date: this.completedAt || this.processedAt || new Date(),
    amount: this.amount,
    currency: this.currency,
    fee: this.fee,
    netAmount: this.netAmount,
    method: this.paymentMethod?.type,
    reference: this.reference,
    transactionId: this.transactionId
  };

  return receipt;
};

/**
 * Get status history
 */
withdrawalSchema.methods.getStatusHistory = function() {
  const history = [];

  if (this.requestedAt) {
    history.push({
      status: 'requested',
      date: this.requestedAt
    });
  }

  if (this.approvedAt) {
    history.push({
      status: 'approved',
      date: this.approvedAt,
      by: this.approvedBy
    });
  }

  if (this.processedAt) {
    history.push({
      status: 'processed',
      date: this.processedAt,
      by: this.processedBy
    });
  }

  if (this.completedAt) {
    history.push({
      status: 'completed',
      date: this.completedAt
    });
  }

  if (this.failedAt) {
    history.push({
      status: 'failed',
      date: this.failedAt,
      reason: this.failureReason
    });
  }

  if (this.rejectedAt) {
    history.push({
      status: 'rejected',
      date: this.rejectedAt,
      reason: this.rejectionReason
    });
  }

  if (this.cancelledAt) {
    history.push({
      status: 'cancelled',
      date: this.cancelledAt,
      reason: this.cancellationReason
    });
  }

  return history.sort((a, b) => a.date - b.date);
};

// ==================== STATIC METHODS ====================

/**
 * Get pending withdrawals
 * @returns {Query}
 */
withdrawalSchema.statics.getPending = function() {
  return this.find({ status: 'pending' })
    .populate('userId', 'fullName email')
    .sort({ requestedAt: 1 });
};

/**
 * Get withdrawals by status
 * @param {string} status - Status
 * @param {Object} options - Pagination options
 */
withdrawalSchema.statics.getByStatus = function(status, { page = 1, limit = 20 } = {}) {
  return this.find({ status })
    .populate('userId', 'fullName email')
    .sort({ requestedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

/**
 * Get user withdrawals
 * @param {string} userId - User ID
 * @param {Object} options - Pagination options
 */
withdrawalSchema.statics.getUserWithdrawals = function(userId, { page = 1, limit = 20 } = {}) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

/**
 * Get withdrawals needing attention (pending > 3 days)
 * @returns {Query}
 */
withdrawalSchema.statics.getOverdue = function() {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  return this.find({
    status: 'pending',
    requestedAt: { $lt: threeDaysAgo }
  }).populate('userId', 'fullName email');
};

/**
 * Get withdrawals summary
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 */
withdrawalSchema.statics.getSummary = async function(startDate, endDate) {
  const match = {
    createdAt: { $gte: startDate, $lte: endDate }
  };

  const [total, completed, pending, failed] = await Promise.all([
    this.countDocuments(match),
    this.countDocuments({ ...match, status: 'completed' }),
    this.countDocuments({ ...match, status: 'pending' }),
    this.countDocuments({ ...match, status: 'failed' })
  ]);

  const amounts = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        totalAmount: { $sum: '$amount' },
        totalFees: { $sum: '$fee' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' }
      }
    }
  ]);

  const byMethod = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$paymentMethod.type',
        count: { $sum: 1 },
        amount: { $sum: '$amount' }
      }
    }
  ]);

  return {
    total,
    completed,
    pending,
    failed,
    amounts: amounts.reduce((acc, curr) => {
      acc[curr._id] = {
        total: curr.totalAmount,
        fees: curr.totalFees,
        avg: curr.avgAmount
      };
      return acc;
    }, {}),
    byMethod: byMethod.reduce((acc, curr) => {
      acc[curr._id] = { count: curr.count, amount: curr.amount };
      return acc;
    }, {})
  };
};

/**
 * Get daily stats
 * @param {number} days - Number of days
 */
withdrawalSchema.statics.getDailyStats = async function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        count: { $sum: 1 },
        amount: { $sum: '$amount' },
        fees: { $sum: '$fee' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);
};

/**
 * Create withdrawal request
 * @param {string} userId - User ID
 * @param {Object} data - Withdrawal data
 */
withdrawalSchema.statics.createRequest = async function(userId, data) {
  const withdrawal = new this({
    userId,
    amount: data.amount,
    currency: data.currency || 'USD',
    paymentMethod: data.paymentMethod,
    bankAccountId: data.bankAccountId,
    userNotes: data.notes,
    metadata: {
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      source: data.source || 'web'
    }
  });

  await withdrawal.save();
  return withdrawal;
};

/**
 * Process batch withdrawals
 * @param {Array} withdrawalIds - Array of withdrawal IDs
 */
withdrawalSchema.statics.processBatch = async function(withdrawalIds) {
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await this.updateMany(
    { _id: { $in: withdrawalIds } },
    {
      $set: {
        batchId,
        status: 'processing',
        processedAt: new Date()
      }
    }
  );

  return batchId;
};

// ==================== EXPORT ====================
const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);

module.exports = Withdrawal;