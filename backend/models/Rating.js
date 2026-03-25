// server/models/Rating.js
const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  rating_id: {
    type: String,
    unique: true,
    required: true
  },
  deal_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal',
    required: true,
    unique: true // One rating per deal per direction
  },
  from_user: {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    user_type: {
      type: String,
      enum: ['brand', 'creator'],
      required: true
    }
  },
  to_user: {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    user_type: {
      type: String,
      enum: ['brand', 'creator'],
      required: true
    }
  },
  rating_type: {
    type: String,
    enum: ['brand_to_creator', 'creator_to_brand'],
    required: true
  },
  scores: {
    overall: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    criteria: {
      // For brand rating creator
      quality_of_work: {
        type: Number,
        min: 1,
        max: 5
      },
      communication: {
        type: Number,
        min: 1,
        max: 5
      },
      on_time_delivery: {
        type: Number,
        min: 1,
        max: 5
      },
      professionalism: {
        type: Number,
        min: 1,
        max: 5
      },
      creativity: {
        type: Number,
        min: 1,
        max: 5
      },
      // For creator rating brand
      payment_speed: {
        type: Number,
        min: 1,
        max: 5
      },
      clear_brief: {
        type: Number,
        min: 1,
        max: 5
      },
      responsiveness: {
        type: Number,
        min: 1,
        max: 5
      },
      fair_negotiation: {
        type: Number,
        min: 1,
        max: 5
      },
      would_work_again: {
        type: Boolean
      }
    }
  },
  review_text: {
    type: String,
    trim: true,
    maxlength: [1000, 'Review cannot exceed 1000 characters']
  },
  pros: {
    type: String,
    trim: true,
    maxlength: [500, 'Pros cannot exceed 500 characters']
  },
  cons: {
    type: String,
    trim: true,
    maxlength: [500, 'Cons cannot exceed 500 characters']
  },
  tags: [{
    type: String,
    enum: [
      'professional',
      'creative',
      'reliable',
      'fast_delivery',
      'great_communication',
      'flexible',
      'late_delivery',
      'poor_communication',
      'delayed_payment',
      'unclear_brief',
      'recommended',
      'would_not_recommend'
    ]
  }],
  helpful_count: {
    type: Number,
    default: 0
  },
  helpful_users: [{
    user_id: mongoose.Schema.Types.ObjectId,
    voted_at: Date
  }],
  report_count: {
    type: Number,
    default: 0
  },
  reported_by: [{
    user_id: mongoose.Schema.Types.ObjectId,
    reason: String,
    reported_at: Date
  }],
  status: {
    type: String,
    enum: ['pending', 'published', 'flagged', 'removed', 'hidden'],
    default: 'pending'
  },
  moderation: {
    reviewed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    reviewed_at: Date,
    moderation_notes: String,
    action_taken: String
  },
  response: {
    text: String,
    responded_by: mongoose.Schema.Types.ObjectId,
    responded_at: Date,
    helpful_count: Number
  },
  is_verified_purchase: {
    type: Boolean,
    default: true
  },
  media_attachments: [{
    type: {
      type: String,
      enum: ['image', 'video', 'link']
    },
    url: String,
    thumbnail: String
  }],
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook
ratingSchema.pre('save', function(next) {
  if (!this.rating_id) {
    this.rating_id = `RAT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Calculate overall score if not provided
  if (!this.scores.overall && this.scores.criteria) {
    const criteriaScores = Object.values(this.scores.criteria).filter(v => typeof v === 'number');
    if (criteriaScores.length > 0) {
      this.scores.overall = criteriaScores.reduce((a, b) => a + b, 0) / criteriaScores.length;
    }
  }
  
  this.updated_at = Date.now();
  next();
});

// Methods
ratingSchema.methods.markHelpful = function(userId) {
  if (!this.helpful_users.some(u => u.user_id.equals(userId))) {
    this.helpful_users.push({
      user_id: userId,
      voted_at: new Date()
    });
    this.helpful_count += 1;
  }
  return this.save();
};

ratingSchema.methods.report = function(userId, reason) {
  if (!this.reported_by.some(u => u.user_id.equals(userId))) {
    this.reported_by.push({
      user_id: userId,
      reason,
      reported_at: new Date()
    });
    this.report_count += 1;
    
    if (this.report_count >= 3) {
      this.status = 'flagged';
    }
  }
  return this.save();
};

ratingSchema.methods.addResponse = function(text, userId) {
  this.response = {
    text,
    responded_by: userId,
    responded_at: new Date(),
    helpful_count: 0
  };
  return this.save();
};

// Static methods
ratingSchema.statics.getUserRatings = function(userId, userType) {
  const match = userType === 'creator' 
    ? { 'to_user.user_id': userId, 'to_user.user_type': 'creator' }
    : { 'to_user.user_id': userId, 'to_user.user_type': 'brand' };
  
  return this.aggregate([
    { $match: { ...match, status: 'published' } },
    {
      $group: {
        _id: null,
        average_rating: { $avg: '$scores.overall' },
        total_ratings: { $sum: 1 },
        rating_distribution: {
          $push: '$scores.overall'
        },
        criteria_averages: {
          $push: '$scores.criteria'
        }
      }
    }
  ]);
};

ratingSchema.statics.getRecentRatings = function(userId, limit = 10) {
  return this.find({
    $or: [
      { 'to_user.user_id': userId },
      { 'from_user.user_id': userId }
    ],
    status: 'published'
  })
  .sort('-created_at')
  .limit(limit)
  .populate('from_user.user_id', 'full_name profile_image')
  .populate('to_user.user_id', 'full_name profile_image');
};

// Indexes
ratingSchema.index({ deal_id: 1 }, { unique: true });
ratingSchema.index({ 'to_user.user_id': 1, status: 1 });
ratingSchema.index({ 'from_user.user_id': 1 });
ratingSchema.index({ rating_type: 1 });
ratingSchema.index({ status: 1 });
ratingSchema.index({ created_at: -1 });
ratingSchema.index({ 'scores.overall': -1 });

const Rating = mongoose.model('Rating', ratingSchema);
module.exports = Rating;