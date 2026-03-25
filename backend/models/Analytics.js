// models/Analytics.js
const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  // User analytics
  userAnalytics: {
    total: { type: Number, default: 0 },
    brands: { type: Number, default: 0 },
    creators: { type: Number, default: 0 },
    active: { type: Number, default: 0 },
    newToday: { type: Number, default: 0 },
    newThisWeek: { type: Number, default: 0 },
    newThisMonth: { type: Number, default: 0 },
    verified: { type: Number, default: 0 },
    suspended: { type: Number, default: 0 },
    
    // Growth metrics
    growthRate: { type: Number, default: 0 },
    retentionRate: { type: Number, default: 0 },
    churnRate: { type: Number, default: 0 },
    
    // Demographics
    demographics: {
      countries: [{
        name: String,
        count: Number,
        percentage: Number
      }],
      ageGroups: {
        '18-24': Number,
        '25-34': Number,
        '35-44': Number,
        '45-54': Number,
        '55+': Number
      },
      gender: {
        male: Number,
        female: Number,
        other: Number
      }
    }
  },

  // Campaign analytics
  campaignAnalytics: {
    total: { type: Number, default: 0 },
    active: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    draft: { type: Number, default: 0 },
    paused: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
    
    // Performance metrics
    avgBudget: { type: Number, default: 0 },
    totalBudget: { type: Number, default: 0 },
    avgDuration: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 },
    
    // By category
    byCategory: [{
      category: String,
      count: Number,
      totalBudget: Number,
      avgEngagement: Number
    }],
    
    // By platform
    byPlatform: [{
      platform: String,
      count: Number,
      totalSpent: Number,
      avgROI: Number
    }]
  },

  // Deal analytics
  dealAnalytics: {
    total: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
    inProgress: { type: Number, default: 0 },
    cancelled: { type: Number, default: 0 },
    disputed: { type: Number, default: 0 },
    
    // Financial metrics
    totalValue: { type: Number, default: 0 },
    avgValue: { type: Number, default: 0 },
    totalFees: { type: Number, default: 0 },
    avgFees: { type: Number, default: 0 },
    
    // Performance
    avgCompletionTime: { type: Number, default: 0 }, // in days
    acceptanceRate: { type: Number, default: 0 },
    revisionRate: { type: Number, default: 0 },
    
    // By status
    byStatus: [{
      status: String,
      count: Number,
      value: Number
    }]
  },

  // Payment analytics
  paymentAnalytics: {
    totalRevenue: { type: Number, default: 0 },
    totalFees: { type: Number, default: 0 },
    totalPayouts: { type: Number, default: 0 },
    
    // Transaction metrics
    transactionCount: { type: Number, default: 0 },
    avgTransactionValue: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 },
    
    // By payment method
    byMethod: [{
      method: String,
      count: Number,
      volume: Number
    }],
    
    // Revenue trends
    dailyRevenue: [{
      date: Date,
      amount: Number
    }],
    monthlyRevenue: [{
      month: String,
      amount: Number
    }],
    
    // Subscription revenue
    subscriptionRevenue: { type: Number, default: 0 },
    commissionRevenue: { type: Number, default: 0 }
  },

  // Engagement analytics
  engagementAnalytics: {
    avgEngagementRate: { type: Number, default: 0 },
    totalImpressions: { type: Number, default: 0 },
    totalReach: { type: Number, default: 0 },
    totalLikes: { type: Number, default: 0 },
    totalComments: { type: Number, default: 0 },
    totalShares: { type: Number, default: 0 },
    totalClicks: { type: Number, default: 0 },
    totalConversions: { type: Number, default: 0 },
    
    // Platform-specific
    byPlatform: [{
      platform: String,
      impressions: Number,
      engagement: Number,
      clicks: Number
    }]
  },

  // Creator performance
  creatorPerformance: {
    topPerformers: [{
      creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Creator' },
      name: String,
      deals: Number,
      earnings: Number,
      avgRating: Number,
      engagement: Number
    }],
    
    categories: [{
      name: String,
      avgEarnings: Number,
      totalDeals: Number,
      topCreator: String
    }],
    
    followerRanges: [{
      range: String,
      count: Number,
      avgEngagement: Number,
      avgEarnings: Number
    }]
  },

  // Brand performance
  brandPerformance: {
    topSpenders: [{
      brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
      name: String,
      totalSpent: Number,
      campaigns: Number,
      avgROI: Number
    }],
    
    industries: [{
      name: String,
      totalSpent: Number,
      avgDealSize: Number,
      topBrand: String
    }]
  },

  // Platform metrics
  platformMetrics: {
    uptime: { type: Number, default: 99.9 },
    avgResponseTime: { type: Number, default: 0 }, // in ms
    activeSessions: { type: Number, default: 0 },
    apiCalls: { type: Number, default: 0 },
    storageUsed: { type: Number, default: 0 }, // in MB
    bandwidthUsed: { type: Number, default: 0 } // in GB
  },

  // Time period
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startDate: Date,
  endDate: Date,

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

// Index for efficient queries
analyticsSchema.index({ period: 1, date: -1 });
analyticsSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Analytics', analyticsSchema);