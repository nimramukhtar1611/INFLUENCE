// models/Campaign.js - UPDATED VERSION
const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Campaign title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters'],
    maxlength: [100, 'Title cannot exceed 100 characters'],
    index: true
  },

  description: {
    type: String,
    required: [true, 'Campaign description is required'],
    minlength: [20, 'Description must be at least 20 characters'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },

  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // This should be 'User' since Brand is a discriminator of User
    required: true,
    index: true
  },

  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Fashion', 'Beauty', 'Technology', 'Food & Beverage', 'Fitness',
      'Travel', 'Gaming', 'Lifestyle', 'Parenting', 'Finance',
      'Education', 'Entertainment', 'Sports', 'Automotive', 'Real Estate',
      'Health', 'Wellness', 'Other'
    ],
    index: true
  },

  objectives: [{
    type: String,
    trim: true
  }],

  status: {
    type: String,
    enum: ['draft', 'pending', 'active', 'paused', 'completed', 'archived', 'rejected'],
    default: 'draft',
    index: true
  },

  deliverables: [{
    type: {
      type: String,
      enum: ['post', 'story', 'reel', 'video', 'blog', 'review', 'image', 'other'],
      required: true
    },
    platform: {
      type: String,
      enum: ['instagram', 'youtube', 'tiktok', 'twitter', 'facebook', 'linkedin', 'website', 'other'],
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      max: [100, 'Quantity cannot exceed 100']
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    requirements: {
      type: String,
      maxlength: [1000, 'Requirements cannot exceed 1000 characters']
    },
    budget: {
      type: Number,
      min: [0, 'Budget cannot be negative'],
      default: 0
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'approved'],
      default: 'pending'
    }
  }],

  budget: {
    type: Number,
    required: [true, 'Budget is required'],
    min: [10, 'Budget must be at least $10'],
    max: [1000000, 'Budget cannot exceed $1,000,000']
  },

  spent: {
    type: Number,
    default: 0,
    min: [0, 'Spent amount cannot be negative']
  },

  budgetType: {
    type: String,
    enum: ['fixed', 'outcome-based', 'hourly', 'milestone'],
    default: 'fixed'
  },

  paymentTerms: {
    type: String,
    enum: ['escrow', 'half', 'full', 'milestone'],
    default: 'escrow'
  },

  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },

  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },

  submissionDeadline: {
    type: Date
  },

  publishedAt: Date,
  completedAt: Date,

  targetAudience: {
    minFollowers: {
      type: Number,
      min: [0, 'Min followers cannot be negative']
    },
    maxFollowers: {
      type: Number,
      min: [0, 'Max followers cannot be negative']
    },
    minEngagement: {
      type: Number,
      min: [0, 'Min engagement cannot be negative'],
      max: [100, 'Min engagement cannot exceed 100']
    },
    locations: [String],
    ages: [{
      type: String,
      enum: ['18-24', '25-34', '35-44', '45+']
    }],
    genders: [{
      type: String,
      enum: ['male', 'female', 'all']
    }],
    niches: [String],
    platforms: [{
      type: String,
      enum: ['instagram', 'youtube', 'tiktok', 'twitter', 'facebook', 'linkedin']
    }]
  },

  requirements: [String],

  brandAssets: [{
    name: String,
    fileUrl: String,
    fileType: {
      type: String,
      enum: ['image', 'video', 'document', 'other']
    },
    fileSize: Number,
    uploadedAt: { type: Date, default: Date.now }
  }],

  invitedCreators: [{
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: String,
    invitedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending'
    }
  }],

  applications: [{
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    proposal: String,
    rate: Number,
    portfolio: [String],
    appliedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    reviewedAt: Date,
    feedback: String
  }],

  selectedCreators: [{
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    selectedAt: { type: Date, default: Date.now },
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed'],
      default: 'pending'
    }
  }],

  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
campaignSchema.index({ brandId: 1, status: 1, createdAt: -1 });
campaignSchema.index({ category: 1, status: 1 });
campaignSchema.index({ budget: -1, status: 1 });
campaignSchema.index({ startDate: 1, endDate: 1 });

// ==================== PRE-SAVE MIDDLEWARE ====================
campaignSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.deliverables && this.deliverables.length > 0) {
    const completed = this.deliverables.filter(d => d.status === 'completed' || d.status === 'approved').length;
    this.progress = Math.round((completed / this.deliverables.length) * 100);
  }
  next();
});

// ==================== METHODS ====================
campaignSchema.methods.publish = function() {
  if (this.status !== 'draft' && this.status !== 'pending') {
    throw new Error('Cannot publish campaign in current state');
  }
  this.status = 'active';
  this.publishedAt = new Date();
  return this.save();
};

campaignSchema.methods.pause = function() {
  if (this.status !== 'active') {
    throw new Error('Can only pause active campaigns');
  }
  this.status = 'paused';
  return this.save();
};

campaignSchema.methods.complete = function() {
  if (this.status !== 'active' && this.status !== 'paused') {
    throw new Error('Can only complete active or paused campaigns');
  }
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

campaignSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

campaignSchema.methods.getRemainingBudget = function() {
  return this.budget - this.spent;
};

campaignSchema.methods.isActive = function() {
  const now = new Date();
  return this.status === 'active' &&
         now >= this.startDate &&
         now <= this.endDate;
};

module.exports = mongoose.model('Campaign', campaignSchema);