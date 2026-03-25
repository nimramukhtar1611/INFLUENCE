const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'campaign_performance',
      'creator_earnings',
      'brand_spending',
      'platform_analytics',
      'user_activity',
      'financial_summary',
      'engagement_metrics',
      'custom'
    ],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  
  // Report configuration
  config: {
    dateRange: {
      start: Date,
      end: Date
    },
    filters: {
      categories: [String],
      platforms: [String],
      statuses: [String],
      minAmount: Number,
      maxAmount: Number,
      countries: [String],
      userIds: [mongoose.Schema.Types.ObjectId]
    },
    groupBy: {
      type: String,
      enum: ['day', 'week', 'month', 'quarter', 'category', 'platform'],
      default: 'day'
    },
    metrics: [String],
    sortBy: String,
    sortOrder: {
      type: String,
      enum: ['asc', 'desc'],
      default: 'desc'
    }
  },

  // Report data
  summary: {
    total: Number,
    average: Number,
    minimum: Number,
    maximum: Number,
    growth: Number,
    previousTotal: Number
  },

  data: [mongoose.Schema.Types.Mixed],

  // Chart data
  charts: {
    line: [{
      name: String,
      data: [{ x: String, y: Number }]
    }],
    bar: [{
      name: String,
      data: [{ label: String, value: Number }]
    }],
    pie: [{
      name: String,
      data: [{ label: String, value: Number, color: String }]
    }],
    table: [mongoose.Schema.Types.Mixed]
  },

  // Export settings
  exportFormats: {
    pdf: { type: Boolean, default: true },
    csv: { type: Boolean, default: true },
    excel: { type: Boolean, default: true },
    json: { type: Boolean, default: false }
  },

  // File info
  fileUrl: String,
  fileSize: Number,
  
  // Scheduling
  isScheduled: {
    type: Boolean,
    default: false
  },
  schedule: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly']
    },
    nextRun: Date,
    recipients: [String],
    lastRun: Date
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'generating', 'completed', 'failed'],
    default: 'pending'
  },
  error: String,
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
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

// Indexes
reportSchema.index({ userId: 1, createdAt: -1 });
reportSchema.index({ type: 1, status: 1 });
reportSchema.index({ isScheduled: 1, 'schedule.nextRun': 1 });

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;