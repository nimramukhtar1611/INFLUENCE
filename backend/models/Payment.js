// models/Payment.js - COMPLETE FIXED VERSION WITH REFUND TRACKING
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  type: {
    type: String,
    enum: ['escrow', 'withdrawal', 'refund', 'fee', 'payment', 'bonus', 'penalty', 'performance'],
    required: true,
    index: true
  },
  
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'in-escrow', 'refunded', 'partially_refunded', 'cancelled', 'available'],
    default: 'pending',
    index: true
  },
  
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount cannot be negative']
  },
  
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD']
  },
  
  fee: {
    type: Number,
    default: 0,
    min: [0, 'Fee cannot be negative']
  },
  
  netAmount: {
    type: Number,
    default: function() {
      return this.amount - this.fee;
    }
  },
  
  from: {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true,
      index: true
    },
    accountType: { 
      type: String, 
      enum: ['brand', 'creator', 'admin'],
      required: true 
    }
  },
  
  to: {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true,
      index: true
    },
    accountType: { 
      type: String, 
      enum: ['brand', 'creator', 'admin'],
      required: true 
    }
  },
  
  dealId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal',
    index: true
  },
  
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  
  performancePaymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PerformancePayment'
  },
  
  paymentMethod: {
    type: {
      type: String,
      enum: ['credit_card', 'bank_account', 'paypal', 'stripe', 'wire', 'crypto']
    },
    last4: String,
    brand: String,
    details: mongoose.Schema.Types.Mixed
  },
  
  // ==================== REFUND TRACKING FIELDS ====================
  refunds: [{
    refundId: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Refund amount cannot be negative']
    },
    reason: String,
    reasonType: {
      type: String,
      enum: ['customer_request', 'duplicate', 'fraudulent', 'service_issue', 'cancellation', 'other']
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    processedAt: Date,
    completedAt: Date,
    failureReason: String,
    
    // Payment processor refund ID
    processorRefundId: String,
    
    // Refund method
    method: {
      type: String,
      enum: ['original', 'balance', 'bank', 'other']
    },
    
    // Metadata
    metadata: mongoose.Schema.Types.Mixed
  }],
  
  // Total amount refunded
  totalRefunded: {
    type: Number,
    default: 0,
    min: [0, 'Total refunded cannot be negative']
  },
  
  // Number of refunds
  refundCount: {
    type: Number,
    default: 0
  },
  
  // Last refund date
  lastRefundAt: Date,
  
  // Original payment ID (if this is a refund)
  originalPaymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  
  // ==================== PAYMENT PROCESSOR FIELDS ====================
  stripePaymentIntentId: String,
  stripeTransferId: String,
  stripeRefundId: String,
  
  paypalTransactionId: String,
  paypalPayoutId: String,
  paypalRefundId: String,
  
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpayRefundId: String,
  
  // ==================== ADDITIONAL FIELDS ====================
  description: String,
  
  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  
  invoiceUrl: String,
  invoicePdf: String,
  
  paidAt: Date,
  
  // For scheduled payments
  scheduledFor: Date,
  isScheduled: { type: Boolean, default: false },
  
  // For recurring payments
  recurring: {
    isRecurring: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly']
    },
    nextPaymentDate: Date,
    endDate: Date,
    paymentsMade: { type: Number, default: 0 }
  },
  
  // ==================== DISPUTE FIELDS ====================
  disputeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dispute'
  },
  
  disputed: { type: Boolean, default: false },
  disputeReason: String,
  disputeResolution: String,
  
  // ==================== METADATA ====================
  metadata: mongoose.Schema.Types.Mixed,
  
  // For failed payments
  failureCode: String,
  failureMessage: String,
  failureReason: String,
  
  // For receipts
  receiptEmail: String,
  receiptUrl: String,
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// ==================== INDEXES ====================
paymentSchema.index({ 'from.userId': 1, createdAt: -1 });
paymentSchema.index({ 'to.userId': 1, createdAt: -1 });
paymentSchema.index({ dealId: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ type: 1, status: 1 });
paymentSchema.index({ stripePaymentIntentId: 1 });
paymentSchema.index({ paypalTransactionId: 1 });
paymentSchema.index({ performancePaymentId: 1 });

// Compound indexes for refund tracking
paymentSchema.index({ 'refunds.status': 1, 'refunds.requestedAt': -1 });
paymentSchema.index({ totalRefunded: 1, amount: 1 });

// ==================== PRE-SAVE MIDDLEWARE ====================
paymentSchema.pre('save', async function(next) {
  if (!this.transactionId) {
    const prefix = this.type === 'escrow' ? 'ESC' : 
                   this.type === 'withdrawal' ? 'WTH' : 
                   this.type === 'refund' ? 'REF' : 
                   this.type === 'performance' ? 'PERF' : 'TXN';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.transactionId = `${prefix}-${timestamp}-${random}`;
  }
  
  this.updatedAt = Date.now();
  this.netAmount = this.amount - (this.fee || 0);
  
  // Generate invoice number if not exists and payment completed
  if (!this.invoiceNumber && this.status === 'completed') {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = await mongoose.model('Payment').countDocuments({
      createdAt: {
        $gte: new Date(year, month - 1, 1),
        $lt: new Date(year, month, 1)
      }
    });

    // Use a combination of count and a slice of transactionId for entropy
    const suffix = this.transactionId.split('-').pop();
    this.invoiceNumber = `INV-${year}${month}-${String(count + 1).padStart(4, '0')}-${suffix}`;
  }
  
  next();
});

// ==================== METHODS ====================

/**
 * Add refund request
 */
paymentSchema.methods.addRefund = async function(refundData) {
  // Validate refund amount
  const totalPossibleRefund = this.amount - this.totalRefunded;
  if (refundData.amount > totalPossibleRefund) {
    throw new Error(`Refund amount exceeds available balance. Max refund: ${totalPossibleRefund}`);
  }
  
  // Create refund record
  const refund = {
    refundId: `REF-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    amount: refundData.amount,
    reason: refundData.reason,
    reasonType: refundData.reasonType || 'other',
    requestedBy: refundData.requestedBy,
    status: 'pending',
    requestedAt: new Date(),
    method: refundData.method || 'original',
    metadata: refundData.metadata
  };
  
  this.refunds.push(refund);
  this.refundCount = this.refunds.length;
  
  await this.save();
  return refund;
};

/**
 * Process refund
 */
paymentSchema.methods.processRefund = async function(refundId, status, processorRefundId) {
  const refund = this.refunds.id(refundId);
  if (!refund) {
    throw new Error('Refund not found');
  }
  
  refund.status = status;
  refund.processedAt = new Date();
  
  if (status === 'completed') {
    refund.completedAt = new Date();
    this.totalRefunded += refund.amount;
    this.lastRefundAt = new Date();
    
    // Update payment status based on total refunded
    if (this.totalRefunded >= this.amount) {
      this.status = 'refunded';
    } else if (this.totalRefunded > 0) {
      this.status = 'partially_refunded';
    }
  } else if (status === 'failed') {
    refund.failureReason = refund.failureReason;
  }
  
  if (processorRefundId) {
    refund.processorRefundId = processorRefundId;
  }
  
  await this.save();
  return refund;
};

/**
 * Complete refund
 */
paymentSchema.methods.completeRefund = async function(refundId, processorRefundId) {
  return this.processRefund(refundId, 'completed', processorRefundId);
};

/**
 * Fail refund
 */
paymentSchema.methods.failRefund = async function(refundId, reason) {
  const refund = this.refunds.id(refundId);
  if (refund) {
    refund.status = 'failed';
    refund.failureReason = reason;
    refund.processedAt = new Date();
    await this.save();
  }
  return refund;
};

/**
 * Get refund summary
 */
paymentSchema.methods.getRefundSummary = function() {
  return {
    originalAmount: this.amount,
    totalRefunded: this.totalRefunded,
    remainingBalance: this.amount - this.totalRefunded,
    refundCount: this.refundCount,
    refunds: this.refunds.map(r => ({
      amount: r.amount,
      reason: r.reason,
      status: r.status,
      requestedAt: r.requestedAt,
      completedAt: r.completedAt
    }))
  };
};

/**
 * Mark as completed
 */
paymentSchema.methods.markAsCompleted = async function() {
  this.status = 'completed';
  this.paidAt = new Date();
  await this.save();
  return this;
};

/**
 * Mark as failed
 */
paymentSchema.methods.markAsFailed = async function(reason) {
  this.status = 'failed';
  this.failureReason = reason;
  await this.save();
  return this;
};

/**
 * Generate invoice
 */
paymentSchema.methods.generateInvoice = async function() {
  if (!this.invoiceNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = await mongoose.model('Payment').countDocuments({
      createdAt: {
        $gte: new Date(year, month - 1, 1),
        $lt: new Date(year, month, 1)
      }
    });
    this.invoiceNumber = `INV-${year}${month}-${String(count + 1).padStart(4, '0')}`;
    await this.save();
  }
  return this.invoiceNumber;
};

// ==================== STATIC METHODS ====================

/**
 * Get revenue stats
 */
paymentSchema.statics.getRevenueStats = async function(startDate, endDate) {
  const match = { status: 'completed' };
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = startDate;
    if (endDate) match.createdAt.$lte = endDate;
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalFees: { $sum: '$fee' },
        totalNet: { $sum: '$netAmount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' }
      }
    }
  ]);
};

/**
 * Get refund stats
 */
paymentSchema.statics.getRefundStats = async function(startDate, endDate) {
  const match = {};
  if (startDate || endDate) {
    match['refunds.requestedAt'] = {};
    if (startDate) match['refunds.requestedAt'].$gte = startDate;
    if (endDate) match['refunds.requestedAt'].$lte = endDate;
  }
  
  return this.aggregate([
    { $unwind: '$refunds' },
    { $match: match },
    {
      $group: {
        _id: '$refunds.status',
        totalAmount: { $sum: '$refunds.amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$refunds.amount' }
      }
    }
  ]);
};

/**
 * Get pending refunds
 */
paymentSchema.statics.getPendingRefunds = function() {
  return this.find({
    'refunds.status': 'pending'
  }).populate('from.userId', 'fullName email');
};

module.exports = mongoose.model('Payment', paymentSchema);