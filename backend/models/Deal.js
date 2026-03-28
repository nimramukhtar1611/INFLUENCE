// models/Deal.js - COMPLETE FIXED VERSION WITH PERFORMANCE FIELDS
const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true,
    index: true
  },
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'brand',
    required: true,
    index: true
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'creator',
    required: true,
    index: true
  },
  conversationId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Conversation'
},
  // ==================== STATUS ENUMS ====================
  status: {
    type: String,
    enum: {
      values: ['pending', 'accepted', 'declined', 'in-progress', 'completed', 
               'cancelled', 'disputed', 'revision', 'negotiating', 'overdue'],
      message: '{VALUE} is not a valid deal status'
    },
    default: 'pending',
    index: true
  },
  
  type: {
    type: String,
    enum: {
      values: ['direct', 'application', 'invitation', 'performance'],
      message: '{VALUE} is not a valid deal type'
    },
    default: 'direct'
  },
  
  // ==================== PAYMENT STATUS ====================
  paymentStatus: {
    type: String,
    enum: {
      values: ['pending', 'in-escrow', 'released', 'refunded', 'failed', 
               'partially_refunded', 'processing', 'on-hold', 'available'],
      message: '{VALUE} is not a valid payment status'
    },
    default: 'pending',
    index: true
  },
  
  // ==================== PERFORMANCE PAYMENT FIELDS (NEW) ====================
  paymentType: {
    type: String,
    enum: ['fixed', 'cpe', 'cpa', 'cpm', 'revenue_share', 'hybrid'],
    default: 'fixed'
  },
  
  performancePaymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PerformancePayment',
    index: true
  },
  
  performanceMetrics: {
    // CPE (Cost Per Engagement)
    cpe: {
      targetLikes: Number,
      targetComments: Number,
      targetShares: Number,
      targetSaves: Number,
      actualLikes: Number,
      actualComments: Number,
      actualShares: Number,
      actualSaves: Number,
      bonusRate: { type: Number, default: 0.5 },
      baseRate: Number,
      finalAmount: Number
    },
    
    // CPA (Cost Per Acquisition)
    cpa: {
      targetConversions: Number,
      actualConversions: Number,
      conversionRate: Number,
      saleValue: Number,
      commissionRate: { type: Number, default: 0.1 },
      baseRate: Number,
      finalAmount: Number
    },
    
    // CPM (Cost Per Mille)
    cpm: {
      targetImpressions: Number,
      actualImpressions: Number,
      cpmRate: { type: Number, default: 10 },
      baseRate: Number,
      finalAmount: Number
    },
    
    // Revenue Share
    revenueShare: {
      revenue: Number,
      sharePercentage: { type: Number, default: 20 },
      minimumGuarantee: Number,
      finalAmount: Number
    },
    
    // Hybrid
    hybrid: {
      basePortion: Number,
      performancePortion: Number,
      performanceWeight: { type: Number, default: 0.5 },
      finalAmount: Number
    }
  },
  
  // ==================== METRICS TRACKING (NEW) ====================
  metrics: {
    impressions: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 }, // Click Through Rate
    conversionRate: { type: Number, default: 0 },
    
    // Historical tracking
    history: [{
      date: { type: Date, default: Date.now },
      impressions: Number,
      likes: Number,
      comments: Number,
      shares: Number,
      conversions: Number
    }]
  },
  
  // ==================== ROI TRACKING (NEW) ====================
  roi: {
    spent: { type: Number, default: 0 },
    earned: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    cpe: { type: Number, default: 0 }, // Cost Per Engagement
    cpa: { type: Number, default: 0 }, // Cost Per Acquisition
    cpm: { type: Number, default: 0 }, // Cost Per Mille
    roas: { type: Number, default: 0 } // Return On Ad Spend
  },
  
  // ==================== PAYMENT TERMS ====================
  paymentTerms: {
    type: String,
    enum: {
      values: ['escrow', 'half', 'full', 'milestone', 'performance'],
      message: '{VALUE} is not a valid payment term'
    },
    default: 'escrow'
  },
  
  deliverables: [{
    type: {
      type: String,
      enum: ['post', 'story', 'reel', 'video', 'blog', 'review', 'image', 'other']
    },
    platform: {
      type: String,
      enum: ['instagram', 'youtube', 'tiktok', 'twitter', 'facebook', 'website', 'other']
    },
    description: String,
    quantity: { type: Number, default: 1, min: 1 },
    budget: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'submitted', 'approved', 'revision'],
      default: 'pending'
    },
    submittedAt: Date,
    approvedAt: Date,
    files: [{
      url: { type: String, required: true },
      type: { type: String, enum: ['image', 'video', 'pdf', 'other'] },
      size: Number,
      filename: String,
      uploadedAt: { type: Date, default: Date.now }
    }],
    links: [String],
    feedback: String,
    revisionNotes: String,
    revisionCount: { type: Number, default: 0 },
    
    // Performance tracking per deliverable
    performance: {
      impressions: Number,
      likes: Number,
      comments: Number,
      shares: Number,
      clicks: Number,
      conversions: Number
    }
  }],
  
  budget: {
    type: Number,
    required: [true, 'Budget is required'],
    min: [10, 'Budget must be at least $10'],
    max: [1000000, 'Budget cannot exceed $1,000,000']
  },
  
  platformFee: {
    type: Number,
    default: 0,
    min: 0
  },
  
  netAmount: {
    type: Number,
    default: function() {
      return this.budget - (this.platformFee || 0);
    }
  },
  
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD']
  },
  
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    index: true
  },
  
  contractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract'
  },
  
  startDate: Date,
  
  deadline: {
    type: Date,
    required: [true, 'Deadline is required'],
    validate: {
      validator: function(v) {
        return v > new Date();
      },
      message: 'Deadline must be in the future'
    }
  },
  
  completedAt: Date,
  
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  requirements: [String],
  terms: String,
  
  negotiation: [{
    proposedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    budget: Number,
    deadline: Date,
    deliverables: String,
    message: String,
    source: {
      type: String,
      enum: ['manual', 'ai'],
      default: 'manual'
    },
    status: { 
      type: String, 
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending'
    },
    createdAt: { type: Date, default: Date.now }
  }],

  negotiationSettings: {
    mode: {
      type: String,
      enum: ['manual', 'ai'],
      default: 'manual'
    },
    aiInitialBudget: Number,
    aiReferenceBudget: Number,
    aiEnabledAt: Date,
    aiEnabledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    aiEnabledByBrand: {
      type: Boolean,
      default: false
    },
    aiEnabledByCreator: {
      type: Boolean,
      default: false
    }
  },
  
  messages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }],
  
  timeline: [{
    event: String,
    description: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metadata: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now }
  }],
  
  rating: {
    score: { type: Number, min: 1, max: 5 },
    review: String,
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    criteria: {
      communication: Number,
      quality: Number,
      timeliness: Number,
      professionalism: Number
    },
    createdAt: Date
  },
  
  disputeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dispute'
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  
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
dealSchema.index({ brandId: 1, status: 1, createdAt: -1 });
dealSchema.index({ creatorId: 1, status: 1, createdAt: -1 });
dealSchema.index({ campaignId: 1 });
dealSchema.index({ paymentStatus: 1, status: 1 });
dealSchema.index({ deadline: 1, status: 1 });
dealSchema.index({ paymentType: 1 });
dealSchema.index({ performancePaymentId: 1 });
dealSchema.index({ 'metrics.impressions': -1 });
dealSchema.index({ 'metrics.conversions': -1 });

// ==================== PRE-SAVE MIDDLEWARE ====================
dealSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate net amount
  this.netAmount = this.budget - (this.platformFee || 0);
  
  // Calculate progress based on deliverables
  if (this.deliverables && this.deliverables.length > 0) {
    const completed = this.deliverables.filter(d => d.status === 'approved').length;
    this.progress = Math.round((completed / this.deliverables.length) * 100);
  }
  
  // Calculate ROI metrics
  if (this.metrics && this.budget > 0) {
    const totalEngagement = (this.metrics.likes || 0) + 
                           (this.metrics.comments || 0) + 
                           (this.metrics.shares || 0);
    
    this.metrics.engagement = totalEngagement;
    this.metrics.ctr = this.metrics.impressions > 0 
      ? (this.metrics.clicks / this.metrics.impressions) * 100 
      : 0;
    
    this.metrics.conversionRate = this.metrics.clicks > 0 
      ? (this.metrics.conversions / this.metrics.clicks) * 100 
      : 0;
    
    // ROI calculations
    this.roi = {
      spent: this.budget,
      earned: this.metrics.conversions * 50, // Placeholder - would need actual value
      percentage: this.budget > 0 ? ((this.metrics.conversions * 50 - this.budget) / this.budget) * 100 : 0,
      cpe: totalEngagement > 0 ? this.budget / totalEngagement : 0,
      cpa: this.metrics.conversions > 0 ? this.budget / this.metrics.conversions : 0,
      cpm: this.metrics.impressions > 0 ? (this.budget / this.metrics.impressions) * 1000 : 0,
      roas: this.metrics.conversions > 0 ? (this.metrics.conversions * 50) / this.budget : 0
    };
  }
  
  next();
});

// ==================== METHODS ====================
dealSchema.methods.canTransitionTo = function(newStatus) {
  const validTransitions = {
    'pending': ['accepted', 'declined', 'cancelled', 'negotiating'],
    'negotiating': ['pending', 'accepted', 'declined', 'cancelled'],
    'accepted': ['in-progress', 'cancelled'],
    'in-progress': ['completed', 'revision', 'cancelled', 'disputed'],
    'revision': ['in-progress', 'cancelled', 'disputed'],
    'completed': [],
    'cancelled': [],
    'disputed': ['resolved', 'cancelled'],
    'overdue': ['in-progress', 'completed', 'cancelled']
  };
  
  return validTransitions[this.status]?.includes(newStatus) || false;
};

dealSchema.methods.updatePaymentStatus = function(newStatus) {
  const validPaymentTransitions = {
    'pending': ['in-escrow', 'failed', 'cancelled'],
    'in-escrow': ['released', 'refunded', 'partially_refunded', 'on-hold', 'available'],
    'released': ['refunded', 'partially_refunded'],
    'refunded': [],
    'failed': ['pending', 'in-escrow'],
    'partially_refunded': ['released', 'refunded'],
    'processing': ['in-escrow', 'failed'],
    'on-hold': ['in-escrow', 'released', 'refunded'],
    'available': ['withdrawn', 'refunded']
  };
  
  if (validPaymentTransitions[this.paymentStatus]?.includes(newStatus)) {
    this.paymentStatus = newStatus;
    return true;
  }
  return false;
};

// ==================== NEW METHODS FOR PERFORMANCE TRACKING ====================

/**
 * Update performance metrics
 * @param {Object} metrics - Performance metrics
 * @returns {Promise}
 */
dealSchema.methods.updatePerformanceMetrics = async function(metrics) {
  // Add to history
  if (!this.metrics.history) {
    this.metrics.history = [];
  }
  
  this.metrics.history.push({
    date: new Date(),
    impressions: this.metrics.impressions,
    likes: this.metrics.likes,
    comments: this.metrics.comments,
    shares: this.metrics.shares,
    conversions: this.metrics.conversions
  });
  
  // Update current metrics
  Object.assign(this.metrics, metrics);
  
  // Keep only last 30 days of history
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  this.metrics.history = this.metrics.history.filter(h => h.date > thirtyDaysAgo);
  
  await this.save();
};

/**
 * Calculate performance payment
 * @param {Object} performanceData - Performance data
 * @returns {Promise<Object>}
 */
dealSchema.methods.calculatePerformancePayment = async function(performanceData) {
  const PaymentCalculator = require('../services/paymentCalculator');
  
  const calculation = await PaymentCalculator.calculatePerformancePayment(
    this,
    this.paymentType,
    performanceData
  );
  
  // Update deal with calculation
  this.budget = calculation.finalAmount;
  this.metadata = {
    ...this.metadata,
    performanceCalculation: calculation
  };
  
  await this.save();
  
  return calculation;
};

/**
 * Get performance summary
 * @returns {Object}
 */
dealSchema.methods.getPerformanceSummary = function() {
  return {
    dealId: this._id,
    campaignId: this.campaignId,
    brandId: this.brandId,
    creatorId: this.creatorId,
    paymentType: this.paymentType,
    budget: this.budget,
    metrics: this.metrics,
    roi: this.roi,
    progress: this.progress,
    status: this.status,
    timeline: this.timeline.slice(-5) // Last 5 events
  };
};

dealSchema.methods.addTimelineEvent = function(event, description, userId, metadata = {}) {
  this.timeline.push({
    event,
    description,
    userId,
    metadata,
    createdAt: new Date()
  });
  return this.save();
};

dealSchema.methods.submitDeliverable = function(deliverableId, files, links) {
  const deliverable = this.deliverables.id(deliverableId);
  if (deliverable) {
    deliverable.status = 'submitted';
    deliverable.submittedAt = new Date();
    if (files) deliverable.files.push(...files);
    if (links) deliverable.links.push(...links);
  }
  return this.save();
};

dealSchema.methods.approveDeliverable = function(deliverableId, feedback) {
  const deliverable = this.deliverables.id(deliverableId);
  if (deliverable) {
    deliverable.status = 'approved';
    deliverable.approvedAt = new Date();
    if (feedback) deliverable.feedback = feedback;
  }
  return this.save();
};

dealSchema.methods.requestRevision = function(deliverableId, notes) {
  const deliverable = this.deliverables.id(deliverableId);
  if (deliverable) {
    deliverable.status = 'revision';
    deliverable.revisionNotes = notes;
    deliverable.revisionRequestedAt = new Date();
    deliverable.revisionCount += 1;
  }
  return this.save();
};

// ==================== STATIC METHODS ====================
dealSchema.statics.getActiveDeals = function(userId, userType) {
  const query = userType === 'brand' 
    ? { brandId: userId, status: { $in: ['accepted', 'in-progress'] } }
    : { creatorId: userId, status: { $in: ['accepted', 'in-progress'] } };
  
  return this.find(query)
    .populate('brandId', 'brandName logo')
    .populate('creatorId', 'displayName handle profilePicture')
    .populate('campaignId', 'title')
    .sort('-createdAt');
};

dealSchema.statics.getPerformanceDeals = function(userId) {
  return this.find({
    $or: [{ brandId: userId }, { creatorId: userId }],
    paymentType: { $in: ['cpe', 'cpa', 'cpm', 'revenue_share', 'hybrid'] }
  }).populate('performancePaymentId');
};

dealSchema.statics.getDealsNeedingAttention = function(userId, userType) {
  const query = userType === 'brand'
    ? { brandId: userId, status: { $in: ['pending', 'revision', 'overdue'] } }
    : { creatorId: userId, status: { $in: ['pending', 'revision', 'overdue'] } };
  
  return this.countDocuments(query);
};

module.exports = mongoose.model('Deal', dealSchema);