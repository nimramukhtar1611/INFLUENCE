// models/Invoice.js - COMPLETE
const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
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
  
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    index: true
  },
  
  // Customer details (snapshot)
  customer: {
    name: String,
    email: String,
    phone: String,
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    taxId: String
  },

  // Invoice details
  type: {
    type: String,
    enum: ['subscription', 'one_time', 'refund', 'credit'],
    default: 'subscription'
  },
  
  status: {
    type: String,
    enum: [
      'draft',
      'open',
      'paid',
      'uncollectible',
      'void',
      'refunded',
      'partially_refunded'
    ],
    default: 'draft',
    index: true
  },

  // Dates
  issueDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidDate: Date,
  voidDate: Date,

  // Period covered
  period: {
    start: Date,
    end: Date
  },

  // Line items
  items: [{
    description: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    type: {
      type: String,
      enum: ['subscription', 'setup', 'additional', 'discount', 'credit']
    },
    metadata: {
      planId: String,
      planName: String,
      subscriptionId: mongoose.Schema.Types.ObjectId
    }
  }],

  // Totals
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  
  discounts: [{
    description: String,
    code: String,
    type: {
      type: String,
      enum: ['percentage', 'fixed']
    },
    amount: Number
  }],
  
  discountTotal: {
    type: Number,
    default: 0
  },

  // Tax
  tax: {
    items: [{
      description: String,
      rate: Number,
      amount: Number
    }],
    total: {
      type: Number,
      default: 0
    }
  },

  // Shipping
  shipping: {
    amount: { type: Number, default: 0 },
    method: String,
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    }
  },

  // Total
  total: {
    type: Number,
    required: true,
    min: 0
  },

  currency: {
    type: String,
    default: 'USD'
  },

  // Payment
  payments: [{
    paymentId: String,
    amount: Number,
    method: {
      type: String,
      enum: ['card', 'paypal', 'bank', 'crypto']
    },
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed', 'refunded']
    },
    transactionId: String,
    date: { type: Date, default: Date.now }
  }],
  
  amountPaid: {
    type: Number,
    default: 0
  },
  
  amountDue: {
    type: Number,
    default: 0
  },
  
  amountRemaining: {
    type: Number,
    default: 0
  },

  // Refunds
  refunds: [{
    refundId: String,
    amount: Number,
    reason: String,
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed']
    },
    date: { type: Date, default: Date.now }
  }],
  
  refundTotal: {
    type: Number,
    default: 0
  },

  // Payment gateway references
  stripeInvoiceId: String,
  stripePaymentIntentId: String,
  stripeChargeId: String,
  paypalInvoiceId: String,
  razorpayInvoiceId: String,

  // PDF
  pdfUrl: String,
  pdfGeneratedAt: Date,

  // Notes
  notes: String,
  terms: String,
  footer: String,

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
invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ userId: 1, createdAt: -1 });
invoiceSchema.index({ subscriptionId: 1, createdAt: -1 });
invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ stripeInvoiceId: 1 });
invoiceSchema.index({ paypalInvoiceId: 1 });
invoiceSchema.index({ razorpayInvoiceId: 1 });

// ==================== PRE-SAVE MIDDLEWARE ====================
invoiceSchema.pre('save', async function(next) {
  this.updatedAt = Date.now();
  
  // Generate invoice number if not exists
  if (!this.invoiceNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = await mongoose.model('Invoice').countDocuments({
      createdAt: {
        $gte: new Date(year, month - 1, 1),
        $lt: new Date(year, month, 1)
      }
    });
    this.invoiceNumber = `INV-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }
  
  // Calculate totals
  this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);
  this.total = this.subtotal - this.discountTotal + this.tax.total + this.shipping.amount;
  this.amountDue = this.total - this.amountPaid;
  this.amountRemaining = Math.max(0, this.amountDue);
  
  next();
});

// ==================== METHODS ====================

/**
 * Mark invoice as paid
 * @param {Object} paymentData - Payment data
 * @returns {Promise}
 */
invoiceSchema.methods.markAsPaid = async function(paymentData) {
  this.status = 'paid';
  this.paidDate = new Date();
  this.payments.push(paymentData);
  this.amountPaid += paymentData.amount;
  this.amountDue = this.total - this.amountPaid;
  await this.save();
};

/**
 * Mark invoice as void
 * @param {string} reason - Void reason
 * @returns {Promise}
 */
invoiceSchema.methods.void = async function(reason) {
  this.status = 'void';
  this.voidDate = new Date();
  this.notes = reason;
  await this.save();
};

/**
 * Add refund
 * @param {Object} refundData - Refund data
 * @returns {Promise}
 */
invoiceSchema.methods.addRefund = async function(refundData) {
  this.refunds.push(refundData);
  this.refundTotal += refundData.amount;
  this.amountPaid -= refundData.amount;
  this.amountDue = this.total - this.amountPaid;
  
  if (this.refundTotal >= this.total) {
    this.status = 'refunded';
  } else if (this.refundTotal > 0) {
    this.status = 'partially_refunded';
  }
  
  await this.save();
};

/**
 * Add payment
 * @param {Object} paymentData - Payment data
 * @returns {Promise}
 */
invoiceSchema.methods.addPayment = async function(paymentData) {
  this.payments.push(paymentData);
  this.amountPaid += paymentData.amount;
  this.amountDue = this.total - this.amountPaid;
  
  if (this.amountDue <= 0) {
    this.status = 'paid';
    this.paidDate = new Date();
  }
  
  await this.save();
};

/**
 * Check if invoice is overdue
 * @returns {boolean}
 */
invoiceSchema.methods.isOverdue = function() {
  return this.status === 'open' && new Date() > this.dueDate;
};

/**
 * Get days overdue
 * @returns {number}
 */
invoiceSchema.methods.getDaysOverdue = function() {
  if (!this.isOverdue()) return 0;
  const now = new Date();
  const diffTime = now - this.dueDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Generate PDF URL
 * @param {string} url - PDF URL
 * @returns {Promise}
 */
invoiceSchema.methods.setPdfUrl = async function(url) {
  this.pdfUrl = url;
  this.pdfGeneratedAt = new Date();
  await this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Get overdue invoices
 * @returns {Query}
 */
invoiceSchema.statics.getOverdue = function() {
  return this.find({
    status: 'open',
    dueDate: { $lt: new Date() }
  });
};

/**
 * Get invoices by user
 * @param {string} userId - User ID
 * @param {Object} options - Pagination options
 * @returns {Query}
 */
invoiceSchema.statics.getByUser = function(userId, { page = 1, limit = 10 } = {}) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

/**
 * Get invoice stats
 * @param {string} userId - User ID
 * @returns {Promise}
 */
invoiceSchema.statics.getUserStats = async function(userId) {
  const [total, paid, open, overdue] = await Promise.all([
    this.countDocuments({ userId }),
    this.countDocuments({ userId, status: 'paid' }),
    this.countDocuments({ userId, status: 'open' }),
    this.countDocuments({ 
      userId, 
      status: 'open',
      dueDate: { $lt: new Date() }
    })
  ]);

  const totals = await this.aggregate([
    { $match: { userId, status: 'paid' } },
    {
      $group: {
        _id: null,
        totalPaid: { $sum: '$total' },
        averageAmount: { $avg: '$total' }
      }
    }
  ]);

  return {
    total,
    paid,
    open,
    overdue,
    totalPaid: totals[0]?.totalPaid || 0,
    averageAmount: totals[0]?.averageAmount || 0
  };
};

/**
 * Generate invoice number
 * @returns {Promise<string>}
 */
invoiceSchema.statics.generateInvoiceNumber = async function() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const count = await this.countDocuments({
    createdAt: {
      $gte: new Date(year, month - 1, 1),
      $lt: new Date(year, month, 1)
    }
  });
  return `INV-${year}${month}-${String(count + 1).padStart(4, '0')}`;
};

/**
 * Create invoice from subscription
 * @param {Object} subscription - Subscription object
 * @param {Object} options - Options
 * @returns {Promise}
 */
invoiceSchema.statics.createFromSubscription = async function(subscription, options = {}) {
  const { period = {}, dueDate = new Date() } = options;

  const user = await mongoose.model('User').findById(subscription.userId);
  
  const items = [{
    description: `${subscription.planDetails.name} Plan - ${subscription.planDetails.interval}ly`,
    quantity: 1,
    unitPrice: subscription.planDetails.price,
    amount: subscription.planDetails.price,
    type: 'subscription',
    metadata: {
      planId: subscription.planId,
      planName: subscription.planDetails.name,
      subscriptionId: subscription._id
    }
  }];

  const invoice = new this({
    userId: subscription.userId,
    subscriptionId: subscription._id,
    customer: {
      name: user.fullName,
      email: user.email,
      phone: user.phone
    },
    type: 'subscription',
    status: 'open',
    issueDate: new Date(),
    dueDate,
    period: {
      start: period.start || subscription.billingPeriod.start,
      end: period.end || subscription.billingPeriod.end
    },
    items,
    subtotal: subscription.planDetails.price,
    total: subscription.planDetails.price,
    currency: subscription.planDetails.currency
  });

  await invoice.save();
  return invoice;
};

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;