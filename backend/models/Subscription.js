// models/Subscription.js - COMPLETE
const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  
  planId: {
    type: String,
    required: true,
    enum: ['free', 'starter', 'professional', 'enterprise'],
    default: 'free',
    index: true
  },
  
  status: {
    type: String,
    enum: [
      'active', 
      'inactive', 
      'past_due', 
      'canceled', 
      'trialing',
      'expired',
      'suspended'
    ],
    default: 'active',
    index: true
  },
  
  // Stripe integration
  stripeCustomerId: {
    type: String,
    index: true,
    sparse: true
  },
  stripeSubscriptionId: {
    type: String,
    index: true,
    sparse: true
  },
  stripePriceId: String,
  
  // PayPal integration
  paypalSubscriptionId: {
    type: String,
    index: true,
    sparse: true
  },
  paypalPlanId: String,
  
  // Razorpay integration
  razorpaySubscriptionId: {
    type: String,
    index: true,
    sparse: true
  },
  razorpayPlanId: String,
  
  // Plan details (snapshot at time of subscription)
  planDetails: {
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    interval: {
      type: String,
      enum: ['month', 'year'],
      default: 'month'
    },
    intervalCount: {
      type: Number,
      default: 1
    },
    features: [String],
    limits: {
      campaigns: { type: Number, default: -1 }, // -1 = unlimited
      activeDeals: { type: Number, default: -1 },
      teamMembers: { type: Number, default: -1 },
      storage: { type: Number, default: -1 }, // MB
      apiCalls: { type: Number, default: -1 }, // per month
      analytics: { type: Boolean, default: false },
      api_access: { type: Boolean, default: false },
      priority_support: { type: Boolean, default: false }
    }
  },

  // Billing period
  billingPeriod: {
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    }
  },
  
  // Trial period
  trialPeriod: {
    start: Date,
    end: Date
  },
  
  // Cancellation
  canceledAt: Date,
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  },
  cancellationReason: String,
  cancellationFeedback: String,

  // Payment method
  paymentMethodId: String,
  paymentMethodDetails: {
    type: {
      type: String,
      enum: ['card', 'paypal', 'bank']
    },
    brand: String,
    last4: String,
    expiryMonth: String,
    expiryYear: String,
    paypalEmail: String
  },

  // Usage metrics
  usage: {
    campaignsUsed: { type: Number, default: 0 },
    activeDealsUsed: { type: Number, default: 0 },
    teamMembersUsed: { type: Number, default: 0 },
    storageUsed: { type: Number, default: 0 }, // MB
    apiCallsUsed: { type: Number, default: 0 },
    lastResetDate: { type: Date, default: Date.now }
  },

  // Invoices
  invoices: [{
    invoiceId: String,
    invoiceNumber: String,
    amount: Number,
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      enum: ['draft', 'open', 'paid', 'void', 'uncollectible']
    },
    date: Date,
    paidAt: Date,
    pdfUrl: String,
    hostedUrl: String,
    lines: [{
      description: String,
      amount: Number,
      period: {
        start: Date,
        end: Date
      }
    }]
  }],

  // Discount/Coupon
  discount: {
    couponId: String,
    code: String,
    type: {
      type: String,
      enum: ['percentage', 'fixed']
    },
    amount: Number,
    duration: {
      type: String,
      enum: ['once', 'repeating', 'forever']
    },
    durationInMonths: Number,
    validUntil: Date
  },

  // Tax information
  tax: {
    taxId: String,
    taxType: {
      type: String,
      enum: ['vat', 'gst', 'sales_tax', 'none']
    },
    taxRate: Number,
    taxInclusive: { type: Boolean, default: false }
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
subscriptionSchema.index({ userId: 1 }, { unique: true });
subscriptionSchema.index({ status: 1, 'billingPeriod.end': 1 });
subscriptionSchema.index({ stripeCustomerId: 1 });
subscriptionSchema.index({ stripeSubscriptionId: 1 });
subscriptionSchema.index({ paypalSubscriptionId: 1 });
subscriptionSchema.index({ razorpaySubscriptionId: 1 });
subscriptionSchema.index({ 'billingPeriod.end': 1, status: 1 });

// ==================== PRE-SAVE MIDDLEWARE ====================
subscriptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// ==================== METHODS ====================

/**
 * Check if subscription is active
 * @returns {boolean}
 */
subscriptionSchema.methods.isActive = function() {
  return ['active', 'trialing'].includes(this.status) && 
         new Date() <= this.billingPeriod.end;
};

/**
 * Check if subscription is on trial
 * @returns {boolean}
 */
subscriptionSchema.methods.isTrialing = function() {
  return this.status === 'trialing' && 
         this.trialPeriod && 
         new Date() <= this.trialPeriod.end;
};

/**
 * Check if subscription is expired
 * @returns {boolean}
 */
subscriptionSchema.methods.isExpired = function() {
  return new Date() > this.billingPeriod.end;
};

/**
 * Check if subscription will cancel at period end
 * @returns {boolean}
 */
subscriptionSchema.methods.willCancel = function() {
  return this.cancelAtPeriodEnd;
};

/**
 * Get days remaining in billing period
 * @returns {number}
 */
subscriptionSchema.methods.getDaysRemaining = function() {
  const now = new Date();
  const end = new Date(this.billingPeriod.end);
  const diffTime = end - now;
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
};

/**
 * Check if user has reached limit
 * @param {string} limitType - Type of limit (campaigns, activeDeals, etc.)
 * @returns {boolean}
 */
subscriptionSchema.methods.hasReachedLimit = function(limitType) {
  const limit = this.planDetails.limits[limitType];
  const usage = this.usage[`${limitType}Used`];
  
  if (limit === -1) return false; // Unlimited
  return usage >= limit;
};

/**
 * Increment usage counter
 * @param {string} usageType - Type of usage
 * @param {number} amount - Amount to increment
 * @returns {Promise}
 */
subscriptionSchema.methods.incrementUsage = async function(usageType, amount = 1) {
  this.usage[`${usageType}Used`] += amount;
  await this.save();
};

/**
 * Decrement usage counter
 * @param {string} usageType - Type of usage
 * @param {number} amount - Amount to decrement
 * @returns {Promise}
 */
subscriptionSchema.methods.decrementUsage = async function(usageType, amount = 1) {
  this.usage[`${usageType}Used`] = Math.max(0, this.usage[`${usageType}Used`] - amount);
  await this.save();
};

/**
 * Reset monthly usage
 * @returns {Promise}
 */
subscriptionSchema.methods.resetUsage = async function() {
  this.usage = {
    campaignsUsed: 0,
    activeDealsUsed: 0,
    teamMembersUsed: 0,
    storageUsed: 0,
    apiCallsUsed: 0,
    lastResetDate: new Date()
  };
  await this.save();
};

/**
 * Cancel subscription
 * @param {boolean} atPeriodEnd - Cancel at period end or immediately
 * @param {string} reason - Cancellation reason
 * @returns {Promise}
 */
subscriptionSchema.methods.cancel = async function(atPeriodEnd = true, reason = null) {
  if (atPeriodEnd) {
    this.cancelAtPeriodEnd = true;
  } else {
    this.status = 'canceled';
    this.canceledAt = new Date();
  }
  
  if (reason) {
    this.cancellationReason = reason;
  }
  
  await this.save();
};

/**
 * Add invoice to history
 * @param {Object} invoiceData - Invoice data
 * @returns {Promise}
 */
subscriptionSchema.methods.addInvoice = async function(invoiceData) {
  this.invoices.push(invoiceData);
  await this.save();
};

/**
 * Apply discount
 * @param {Object} discountData - Discount data
 * @returns {Promise}
 */
subscriptionSchema.methods.applyDiscount = async function(discountData) {
  this.discount = discountData;
  await this.save();
};

/**
 * Remove discount
 * @returns {Promise}
 */
subscriptionSchema.methods.removeDiscount = async function() {
  this.discount = undefined;
  await this.save();
};

/**
 * Update payment method
 * @param {Object} paymentMethodData - Payment method data
 * @returns {Promise}
 */
subscriptionSchema.methods.updatePaymentMethod = async function(paymentMethodData) {
  this.paymentMethodId = paymentMethodData.id;
  this.paymentMethodDetails = paymentMethodData.details;
  await this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Get active subscriptions
 * @returns {Query}
 */
subscriptionSchema.statics.getActive = function() {
  const now = new Date();
  return this.find({
    status: { $in: ['active', 'trialing'] },
    'billingPeriod.end': { $gt: now }
  });
};

/**
 * Get expiring subscriptions
 * @param {number} days - Days until expiry
 * @returns {Query}
 */
subscriptionSchema.statics.getExpiring = function(days = 7) {
  const future = new Date();
  future.setDate(future.getDate() + days);
  
  return this.find({
    status: { $in: ['active', 'trialing'] },
    'billingPeriod.end': { $lte: future, $gt: new Date() }
  });
};

/**
 * Get expired subscriptions
 * @returns {Query}
 */
subscriptionSchema.statics.getExpired = function() {
  return this.find({
    status: { $in: ['active', 'trialing'] },
    'billingPeriod.end': { $lt: new Date() }
  });
};

/**
 * Get subscriptions by plan
 * @param {string} planId - Plan ID
 * @returns {Query}
 */
subscriptionSchema.statics.getByPlan = function(planId) {
  return this.find({ planId, status: 'active' });
};

/**
 * Get revenue stats
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise}
 */
subscriptionSchema.statics.getRevenueStats = async function(startDate, endDate) {
  const match = {
    status: 'active',
    'billingPeriod.start': { $gte: startDate, $lte: endDate }
  };

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$planId',
        count: { $sum: 1 },
        revenue: { $sum: '$planDetails.price' }
      }
    }
  ]);
};

/**
 * Get subscription stats
 * @returns {Promise}
 */
subscriptionSchema.statics.getStats = async function() {
  const [total, active, trialing, canceled, expired] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ status: 'active' }),
    this.countDocuments({ status: 'trialing' }),
    this.countDocuments({ status: 'canceled' }),
    this.countDocuments({ status: 'expired' })
  ]);

  const byPlan = await this.aggregate([
    {
      $group: {
        _id: '$planId',
        count: { $sum: 1 }
      }
    }
  ]);

  const revenue = await this.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: null,
        monthly: { $sum: '$planDetails.price' },
        yearly: {
          $sum: {
            $cond: [
              { $eq: ['$planDetails.interval', 'year'] },
              '$planDetails.price',
              '$planDetails.price'
            ]
          }
        }
      }
    }
  ]);

  return {
    total,
    active,
    trialing,
    canceled,
    expired,
    byPlan: byPlan.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {}),
    monthlyRevenue: revenue[0]?.monthly || 0,
    yearlyRevenue: revenue[0]?.yearly || 0
  };
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;