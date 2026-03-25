// models/PerformancePayment.js - COMPLETE NEW MODEL
const mongoose = require('mongoose');

const performancePaymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  dealId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal',
    required: true,
    index: true
  },

  type: {
    type: String,
    enum: ['cpe', 'cpa', 'cpm', 'revenue_share', 'hybrid'],
    required: true,
    index: true
  },

  status: {
    type: String,
    enum: ['pending', 'calculating', 'calculated', 'paid', 'failed'],
    default: 'pending'
  },

  // Base configuration
  config: {
    // CPE (Cost Per Engagement)
    cpe: {
      targetLikes: { type: Number, default: 0 },
      targetComments: { type: Number, default: 0 },
      targetShares: { type: Number, default: 0 },
      targetSaves: { type: Number, default: 0 },
      weightLikes: { type: Number, default: 1 },
      weightComments: { type: Number, default: 2 },
      weightShares: { type: Number, default: 3 },
      weightSaves: { type: Number, default: 2 },
      baseRate: Number,
      bonusRate: { type: Number, default: 0.5 },
      maxBonus: Number
    },
    
    // CPA (Cost Per Acquisition)
    cpa: {
      targetConversions: { type: Number, default: 1 },
      conversionValue: Number,
      commissionRate: { type: Number, default: 0.1 },
      baseRate: Number,
      bonusPerConversion: Number,
      maxConversions: Number
    },
    
    // CPM (Cost Per Mille)
    cpm: {
      targetImpressions: { type: Number, default: 10000 },
      cpmRate: { type: Number, default: 10 },
      baseRate: Number,
      bonusRate: { type: Number, default: 0.2 },
      maxImpressions: Number
    },
    
    // Revenue Share
    revenueShare: {
      sharePercentage: { type: Number, default: 20 },
      minimumGuarantee: Number,
      trackingPeriod: { type: String, enum: ['one_time', 'recurring', 'lifetime'], default: 'one_time' },
      recurringMonths: { type: Number, default: 12 },
      capAmount: Number
    },
    
    // Hybrid
    hybrid: {
      basePortion: Number,
      performancePortion: Number,
      performanceWeight: { type: Number, default: 0.5 },
      minGuarantee: Number,
      maxCap: Number
    }
  },

  // Actual metrics achieved
  metrics: {
    // CPE metrics
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    totalEngagement: { type: Number, default: 0 },
    
    // CPA metrics
    conversions: { type: Number, default: 0 },
    conversionValue: { type: Number, default: 0 },
    
    // CPM metrics
    impressions: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    
    // Revenue Share
    revenue: { type: Number, default: 0 },
    sales: { type: Number, default: 0 },
    
    // Derived metrics
    engagementRate: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 }
  },

  // Calculation results
  calculation: {
    baseAmount: { type: Number, default: 0 },
    bonusAmount: { type: Number, default: 0 },
    penaltyAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    platformFee: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    
    breakdown: {
      cpe: mongoose.Schema.Types.Mixed,
      cpa: mongoose.Schema.Types.Mixed,
      cpm: mongoose.Schema.Types.Mixed,
      revenueShare: mongoose.Schema.Types.Mixed,
      hybrid: mongoose.Schema.Types.Mixed
    },
    
    calculatedAt: Date,
    calculatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },

  // Tracking history
  tracking: [{
    date: { type: Date, default: Date.now },
    source: String,
    metric: String,
    value: Number,
    metadata: mongoose.Schema.Types.Mixed
  }],

  // Milestones
  milestones: [{
    name: String,
    target: Number,
    achieved: Number,
    bonus: Number,
    achievedAt: Date,
    status: { type: String, enum: ['pending', 'achieved', 'paid'] }
  }],

  // Verification
  verified: {
    isVerified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,
    verificationMethod: String,
    verificationNotes: String
  },

  // Payment reference
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },

  // Dispute
  disputed: { type: Boolean, default: false },
  disputeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dispute'
  },

  // Metadata
  metadata: mongoose.Schema.Types.Mixed,

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
performancePaymentSchema.index({ paymentId: 1 }, { unique: true });
performancePaymentSchema.index({ dealId: 1 });
performancePaymentSchema.index({ type: 1, status: 1 });
performancePaymentSchema.index({ 'calculation.totalAmount': -1 });
performancePaymentSchema.index({ createdAt: -1 });

// ==================== PRE-SAVE MIDDLEWARE ====================
performancePaymentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Generate payment ID if not exists
  if (!this.paymentId) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.paymentId = `PERF-${year}${month}-${random}`;
  }

  // Calculate total engagement
  this.metrics.totalEngagement = (this.metrics.likes || 0) + 
                                 (this.metrics.comments || 0) + 
                                 (this.metrics.shares || 0);

  next();
});

// ==================== METHODS ====================

/**
 * Update metrics
 */
performancePaymentSchema.methods.updateMetrics = async function(metrics) {
  // Add to tracking history
  this.tracking.push({
    date: new Date(),
    source: metrics.source || 'manual',
    metric: Object.keys(metrics).join(','),
    value: metrics,
    metadata: metrics.metadata
  });

  // Update metrics
  Object.assign(this.metrics, metrics);
  
  await this.save();
};

/**
 * Calculate payment
 */
performancePaymentSchema.methods.calculate = async function(calculatedBy) {
  const PaymentCalculator = require('../services/paymentCalculator');
  
  let calculation;
  
  switch(this.type) {
    case 'cpe':
      calculation = await PaymentCalculator.calculateCPE(this, this.metrics);
      break;
    case 'cpa':
      calculation = await PaymentCalculator.calculateCPA(this, this.metrics);
      break;
    case 'cpm':
      calculation = await PaymentCalculator.calculateCPM(this, this.metrics);
      break;
    case 'revenue_share':
      calculation = await PaymentCalculator.calculateRevenueShare(this, this.metrics);
      break;
    case 'hybrid':
      calculation = await PaymentCalculator.calculateHybridPayment(this, this.metrics);
      break;
    default:
      throw new Error('Invalid payment type');
  }

  this.calculation = {
    ...calculation,
    calculatedAt: new Date(),
    calculatedBy
  };

  this.status = 'calculated';
  await this.save();
  
  return this.calculation;
};

/**
 * Add milestone
 */
performancePaymentSchema.methods.addMilestone = async function(milestoneData) {
  this.milestones.push({
    ...milestoneData,
    status: 'pending'
  });
  await this.save();
};

/**
 * Update milestone achievement
 */
performancePaymentSchema.methods.updateMilestone = async function(milestoneId, achieved) {
  const milestone = this.milestones.id(milestoneId);
  if (milestone) {
    milestone.achieved = achieved;
    milestone.achievedAt = new Date();
    milestone.status = achieved >= milestone.target ? 'achieved' : 'pending';
    await this.save();
  }
};

/**
 * Verify metrics
 */
performancePaymentSchema.methods.verify = async function(verifiedBy, method, notes) {
  this.verified = {
    isVerified: true,
    verifiedBy,
    verifiedAt: new Date(),
    verificationMethod: method,
    verificationNotes: notes
  };
  await this.save();
};

/**
 * Get summary
 */
performancePaymentSchema.methods.getSummary = function() {
  return {
    paymentId: this.paymentId,
    dealId: this.dealId,
    type: this.type,
    status: this.status,
    metrics: this.metrics,
    calculation: this.calculation,
    milestones: this.milestones,
    tracking: this.tracking.slice(-10), // Last 10 tracking entries
    verified: this.verified
  };
};

// ==================== STATIC METHODS ====================

/**
 * Get pending calculations
 */
performancePaymentSchema.statics.getPendingCalculations = function() {
  return this.find({ status: 'pending' })
    .populate('dealId')
    .sort({ createdAt: 1 });
};

/**
 * Get stats by type
 */
performancePaymentSchema.statics.getStatsByType = async function(startDate, endDate) {
  const match = {};
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalAmount: { $sum: '$calculation.totalAmount' },
        avgAmount: { $avg: '$calculation.totalAmount' },
        totalBonus: { $sum: '$calculation.bonusAmount' }
      }
    }
  ]);
};

const PerformancePayment = mongoose.model('PerformancePayment', performancePaymentSchema);

module.exports = PerformancePayment;