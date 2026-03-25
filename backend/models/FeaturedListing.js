// models/FeaturedListing.js - COMPLETE NEW MODEL
const mongoose = require('mongoose');

const featuredListingSchema = new mongoose.Schema({
  listingId: {
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

  // What is being featured
  targetType: {
    type: String,
    enum: ['campaign', 'creator', 'brand'],
    required: true,
    index: true
  },

  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'targetModel',
    index: true
  },

  targetModel: {
    type: String,
    required: true,
    enum: ['Campaign', 'Creator', 'Brand']
  },

  // Placement details
  placement: {
    type: {
      type: String,
      enum: ['homepage', 'search_top', 'category_top', 'sidebar', 'featured_section', 'email_newsletter'],
      required: true
    },
    category: String, // For category-specific placements
    platform: String, // For platform-specific placements
    priority: {
      type: Number,
      default: 1,
      min: 1,
      max: 10
    }
  },

  // Duration
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  
  endDate: {
    type: Date,
    required: true,
    index: true
  },

  duration: {
    days: { type: Number, required: true },
    hours: { type: Number, default: 0 }
  },

  // Package details
  package: {
    name: {
      type: String,
      required: true,
      enum: ['basic', 'premium', 'enterprise', 'custom']
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
    features: [String],
    guaranteedImpressions: Number,
    guaranteedClicks: Number
  },

  // Payment
  payment: {
    transactionId: String,
    amount: Number,
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'failed'],
      default: 'pending'
    },
    paidAt: Date,
    refundedAt: Date,
    paymentMethod: String,
    invoiceNumber: String
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'active', 'expired', 'cancelled', 'paused'],
    default: 'pending',
    index: true
  },

  // Performance tracking
  performance: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    
    daily: [{
      date: { type: Date, default: Date.now },
      impressions: Number,
      clicks: Number,
      conversions: Number
    }],
    
    lastUpdated: Date
  },

  // Target audience (if applicable)
  targeting: {
    niches: [String],
    locations: [String],
    ageGroups: [String],
    genders: [String],
    platforms: [String],
    minFollowers: Number,
    maxFollowers: Number
  },

  // Display settings
  display: {
    title: String,
    description: String,
    image: String,
    badge: String,
    badgeColor: String,
    priorityBadge: Boolean,
    customCss: String
  },

  // Metadata
  metadata: {
    source: String,
    campaign: String,
    notes: String,
    adminNotes: String
  },

  // Approval
  requiresApproval: {
    type: Boolean,
    default: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectionReason: String,

  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancellationReason: String,

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
featuredListingSchema.index({ listingId: 1 }, { unique: true });
featuredListingSchema.index({ targetType: 1, targetId: 1 });
featuredListingSchema.index({ status: 1, startDate: 1, endDate: 1 });
featuredListingSchema.index({ 'placement.type': 1, status: 1 });
featuredListingSchema.index({ endDate: 1 }, { expireAfterSeconds: 0 });
featuredListingSchema.index({ 'payment.status': 1 });

// ==================== PRE-SAVE MIDDLEWARE ====================
featuredListingSchema.pre('save', async function(next) {
  this.updatedAt = Date.now();
  
  // Generate listing ID if not exists
  if (!this.listingId) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.listingId = `FEAT-${year}${month}-${random}`;
  }

  // Calculate duration in days
  if (this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate - this.startDate);
    this.duration = {
      days: Math.ceil(diffTime / (1000 * 60 * 60 * 24)),
      hours: Math.ceil((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    };
  }

  // Auto-update status based on dates
  const now = new Date();
  if (this.status === 'active') {
    if (now > this.endDate) {
      this.status = 'expired';
    } else if (now < this.startDate) {
      this.status = 'pending';
    }
  }

  next();
});

// ==================== VIRTUAL PROPERTIES ====================
featuredListingSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' && 
         now >= this.startDate && 
         now <= this.endDate;
});

featuredListingSchema.virtual('isExpired').get(function() {
  return new Date() > this.endDate;
});

featuredListingSchema.virtual('isPending').get(function() {
  return this.status === 'pending' && new Date() < this.startDate;
});

featuredListingSchema.virtual('daysRemaining').get(function() {
  if (this.isExpired) return 0;
  const diffTime = this.endDate - new Date();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

featuredListingSchema.virtual('hoursRemaining').get(function() {
  if (this.isExpired) return 0;
  const diffTime = this.endDate - new Date();
  return Math.ceil(diffTime / (1000 * 60 * 60));
});

// ==================== METHODS ====================

/**
 * Activate listing
 * @returns {Promise}
 */
featuredListingSchema.methods.activate = async function() {
  this.status = 'active';
  await this.save();
};

/**
 * Pause listing
 * @returns {Promise}
 */
featuredListingSchema.methods.pause = async function() {
  this.status = 'paused';
  await this.save();
};

/**
 * Resume listing
 * @returns {Promise}
 */
featuredListingSchema.methods.resume = async function() {
  this.status = 'active';
  await this.save();
};

/**
 * Cancel listing
 * @param {string} reason - Cancellation reason
 * @param {string} cancelledBy - User ID
 * @returns {Promise}
 */
featuredListingSchema.methods.cancel = async function(reason, cancelledBy) {
  this.status = 'cancelled';
  this.cancellationReason = reason;
  this.cancelledBy = cancelledBy;
  await this.save();
};

/**
 * Extend listing
 * @param {number} days - Days to extend
 * @returns {Promise}
 */
featuredListingSchema.methods.extend = async function(days) {
  this.endDate.setDate(this.endDate.getDate() + days);
  this.status = 'active';
  await this.save();
};

/**
 * Track impression
 * @returns {Promise}
 */
featuredListingSchema.methods.trackImpression = async function() {
  this.performance.impressions += 1;
  
  // Update daily stats
  const today = new Date().toDateString();
  let dailyStat = this.performance.daily.find(d => 
    new Date(d.date).toDateString() === today
  );
  
  if (!dailyStat) {
    dailyStat = { date: new Date(), impressions: 0, clicks: 0, conversions: 0 };
    this.performance.daily.push(dailyStat);
  }
  
  dailyStat.impressions += 1;
  this.performance.lastUpdated = new Date();
  
  await this.save();
};

/**
 * Track click
 * @returns {Promise}
 */
featuredListingSchema.methods.trackClick = async function() {
  this.performance.clicks += 1;
  
  // Update daily stats
  const today = new Date().toDateString();
  let dailyStat = this.performance.daily.find(d => 
    new Date(d.date).toDateString() === today
  );
  
  if (!dailyStat) {
    dailyStat = { date: new Date(), impressions: 0, clicks: 0, conversions: 0 };
    this.performance.daily.push(dailyStat);
  }
  
  dailyStat.clicks += 1;
  
  // Calculate CTR
  if (this.performance.impressions > 0) {
    this.performance.ctr = (this.performance.clicks / this.performance.impressions) * 100;
  }
  
  this.performance.lastUpdated = new Date();
  
  await this.save();
};

/**
 * Track conversion
 * @param {number} value - Conversion value
 * @returns {Promise}
 */
featuredListingSchema.methods.trackConversion = async function(value = 0) {
  this.performance.conversions += 1;
  this.performance.revenue += value;
  
  // Update daily stats
  const today = new Date().toDateString();
  let dailyStat = this.performance.daily.find(d => 
    new Date(d.date).toDateString() === today
  );
  
  if (!dailyStat) {
    dailyStat = { date: new Date(), impressions: 0, clicks: 0, conversions: 0 };
    this.performance.daily.push(dailyStat);
  }
  
  dailyStat.conversions += 1;
  this.performance.lastUpdated = new Date();
  
  await this.save();
};

/**
 * Get performance summary
 * @returns {Object}
 */
featuredListingSchema.methods.getPerformanceSummary = function() {
  const ctr = this.performance.impressions > 0 
    ? (this.performance.clicks / this.performance.impressions) * 100 
    : 0;
  
  const conversionRate = this.performance.clicks > 0 
    ? (this.performance.conversions / this.performance.clicks) * 100 
    : 0;
  
  return {
    listingId: this.listingId,
    targetType: this.targetType,
    placement: this.placement,
    duration: this.duration,
    performance: {
      impressions: this.performance.impressions,
      clicks: this.performance.clicks,
      ctr: parseFloat(ctr.toFixed(2)),
      conversions: this.performance.conversions,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      revenue: this.performance.revenue,
      roi: this.package.price > 0 
        ? ((this.performance.revenue - this.package.price) / this.package.price) * 100 
        : 0,
      daily: this.performance.daily.slice(-7) // Last 7 days
    },
    status: this.status,
    daysRemaining: this.daysRemaining
  };
};

// ==================== STATIC METHODS ====================

/**
 * Get active featured listings
 * @param {Object} filters - Filters
 * @returns {Query}
 */
featuredListingSchema.statics.getActive = function(filters = {}) {
  const now = new Date();
  const query = {
    status: 'active',
    startDate: { $lte: now },
    endDate: { $gte: now },
    ...filters
  };
  
  return this.find(query)
    .populate('targetId')
    .sort({ 'placement.priority': -1, createdAt: -1 });
};

/**
 * Get listings by placement
 * @param {string} placementType - Placement type
 * @param {number} limit - Limit
 * @returns {Query}
 */
featuredListingSchema.statics.getByPlacement = function(placementType, limit = 10) {
  const now = new Date();
  
  return this.find({
    'placement.type': placementType,
    status: 'active',
    startDate: { $lte: now },
    endDate: { $gte: now }
  })
    .populate('targetId')
    .sort({ 'placement.priority': -1 })
    .limit(limit);
};

/**
 * Get expiring listings
 * @param {number} days - Days threshold
 * @returns {Query}
 */
featuredListingSchema.statics.getExpiring = function(days = 3) {
  const future = new Date();
  future.setDate(future.getDate() + days);
  
  return this.find({
    status: 'active',
    endDate: { $lte: future, $gt: new Date() }
  }).populate('userId', 'email fullName');
};

/**
 * Get expired listings
 * @returns {Query}
 */
featuredListingSchema.statics.getExpired = function() {
  return this.find({
    status: 'active',
    endDate: { $lt: new Date() }
  });
};

/**
 * Get user listings
 * @param {string} userId - User ID
 * @returns {Query}
 */
featuredListingSchema.statics.getUserListings = function(userId) {
  return this.find({ userId })
    .sort({ createdAt: -1 });
};

/**
 * Calculate price
 * @param {string} packageName - Package name
 * @param {number} days - Duration in days
 * @param {Object} options - Additional options
 * @returns {Object}
 */
featuredListingSchema.statics.calculatePrice = function(packageName, days, options = {}) {
  const basePrices = {
    basic: 50,
    premium: 100,
    enterprise: 250,
    custom: 0
  };

  const dailyRates = {
    basic: 5,
    premium: 10,
    enterprise: 25,
    custom: 0
  };

  const basePrice = basePrices[packageName] || 50;
  const dailyRate = dailyRates[packageName] || 5;
  
  let total = basePrice + (dailyRate * days);
  
  // Apply discounts for longer durations
  if (days >= 30) total *= 0.8; // 20% off for monthly
  if (days >= 90) total *= 0.7; // 30% off for quarterly
  if (days >= 365) total *= 0.5; // 50% off for yearly
  
  // Add premium placement costs
  if (options.placement === 'homepage') total *= 1.5;
  if (options.placement === 'search_top') total *= 1.3;
  
  return {
    package: packageName,
    days,
    basePrice,
    dailyRate,
    subtotal: basePrice + (dailyRate * days),
    discount: basePrice + (dailyRate * days) - total,
    total: Math.round(total * 100) / 100,
    currency: 'USD'
  };
};

/**
 * Get stats
 * @returns {Promise}
 */
featuredListingSchema.statics.getStats = async function() {
  const [total, active, expired, pending] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ status: 'active' }),
    this.countDocuments({ status: 'expired' }),
    this.countDocuments({ status: 'pending' })
  ]);

  const revenue = await this.aggregate([
    { $match: { 'payment.status': 'paid' } },
    {
      $group: {
        _id: null,
        total: { $sum: '$package.price' }
      }
    }
  ]);

  const performance = await this.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: null,
        totalImpressions: { $sum: '$performance.impressions' },
        totalClicks: { $sum: '$performance.clicks' },
        totalConversions: { $sum: '$performance.conversions' }
      }
    }
  ]);

  return {
    total,
    active,
    expired,
    pending,
    revenue: revenue[0]?.total || 0,
    performance: {
      impressions: performance[0]?.totalImpressions || 0,
      clicks: performance[0]?.totalClicks || 0,
      conversions: performance[0]?.totalConversions || 0,
      ctr: performance[0]?.totalImpressions > 0 
        ? (performance[0]?.totalClicks / performance[0]?.totalImpressions) * 100 
        : 0
    }
  };
};

const FeaturedListing = mongoose.model('FeaturedListing', featuredListingSchema);

module.exports = FeaturedListing;