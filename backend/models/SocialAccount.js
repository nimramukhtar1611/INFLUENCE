// server/models/SocialAccount.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const socialAccountSchema = new mongoose.Schema({
  account_id: {
    type: String,
    unique: true,
    required: true
  },
  creator_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Creator',
    required: true,
    index: true
  },
  platform: {
    type: String,
    enum: ['instagram', 'youtube', 'tiktok', 'twitter', 'facebook', 'linkedin'],
    required: true
  },
  platform_user_id: {
    type: String,
    required: true
  },
  platform_username: {
    type: String,
    required: true,
    trim: true
  },
  platform_display_name: String,
  profile_url: String,
  avatar_url: String,
  bio: String,
  // Encrypted tokens
  access_token: {
    type: String,
    required: true,
    set: function(value) {
      if (!value) return value;
      const cipher = crypto.createCipher('aes-256-cbc', process.env.TOKEN_ENCRYPTION_KEY);
      let encrypted = cipher.update(value, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    },
    get: function(value) {
      if (!value) return value;
      const decipher = crypto.createDecipher('aes-256-cbc', process.env.TOKEN_ENCRYPTION_KEY);
      let decrypted = decipher.update(value, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }
  },
  refresh_token: {
    type: String,
    set: function(value) {
      if (!value) return value;
      const cipher = crypto.createCipher('aes-256-cbc', process.env.TOKEN_ENCRYPTION_KEY);
      let encrypted = cipher.update(value, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    },
    get: function(value) {
      if (!value) return value;
      const decipher = crypto.createDecipher('aes-256-cbc', process.env.TOKEN_ENCRYPTION_KEY);
      let decrypted = decipher.update(value, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }
  },
  token_expiry: {
    type: Date,
    required: true
  },
  token_scopes: [String],
  auth_method: {
    type: String,
    enum: ['oauth2', 'api_key', 'manual'],
    default: 'oauth2'
  },
  // Metrics
  metrics: {
    followers: {
      type: Number,
      default: 0
    },
    following: {
      type: Number,
      default: 0
    },
    posts_count: {
      type: Number,
      default: 0
    },
    engagement_rate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    avg_likes: {
      type: Number,
      default: 0
    },
    avg_comments: {
      type: Number,
      default: 0
    },
    avg_shares: {
      type: Number,
      default: 0
    },
    avg_views: {
      type: Number,
      default: 0
    },
    total_engagement: {
      type: Number,
      default: 0
    },
    demographics: {
      age_groups: mongoose.Schema.Types.Mixed,
      gender_split: {
        male: Number,
        female: Number,
        other: Number
      },
      top_locations: [{
        country: String,
        city: String,
        percentage: Number
      }],
      interests: [{
        category: String,
        percentage: Number
      }]
    },
    growth_rate: {
      daily: Number,
      weekly: Number,
      monthly: Number
    },
    best_performing_times: [{
      day: String,
      time: String,
      engagement: Number
    }],
    content_categories: [{
      category: String,
      percentage: Number
    }]
  },
  // Historical data
  metrics_history: [{
    date: Date,
    followers: Number,
    engagement_rate: Number,
    posts: Number
  }],
  // Posts/Content
  recent_posts: [{
    post_id: String,
    post_url: String,
    thumbnail_url: String,
    caption: String,
    likes: Number,
    comments: Number,
    shares: Number,
    views: Number,
    posted_at: Date,
    engagement_rate: Number
  }],
  // Verification status
  verified: {
    type: Boolean,
    default: false
  },
  verification_method: {
    type: String,
    enum: ['oauth', 'manual', 'api']
  },
  verified_at: Date,
  verified_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  // Account status
  is_active: {
    type: Boolean,
    default: true
  },
  is_public: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['connected', 'disconnected', 'expired', 'revoked', 'error'],
    default: 'connected'
  },
  status_reason: String,
  // Sync settings
  sync_settings: {
    auto_sync: {
      type: Boolean,
      default: true
    },
    sync_frequency: {
      type: String,
      enum: ['hourly', 'daily', 'weekly'],
      default: 'daily'
    },
    last_sync: Date,
    next_sync: Date,
    sync_error: String
  },
  // Webhooks
  webhook_subscriptions: [{
    topic: String,
    callback_url: String,
    active: Boolean,
    subscribed_at: Date
  }],
  // Rate limiting
  rate_limit_info: {
    calls_remaining: Number,
    reset_time: Date
  },
  // Metadata
  meta_data: {
    account_type: String, // personal, business, creator
    category: String,
    is_verified_badge: Boolean,
    business_email: String,
    contact_phone: String,
    website: String
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  last_synced: {
    type: Date,
    default: null
  }
});

// Pre-save hook
socialAccountSchema.pre('save', function(next) {
  if (!this.account_id) {
    this.account_id = `SOC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Set next sync time
  if (this.sync_settings.auto_sync && !this.sync_settings.next_sync) {
    const now = new Date();
    switch(this.sync_settings.sync_frequency) {
      case 'hourly':
        this.sync_settings.next_sync = new Date(now.setHours(now.getHours() + 1));
        break;
      case 'daily':
        this.sync_settings.next_sync = new Date(now.setDate(now.getDate() + 1));
        break;
      case 'weekly':
        this.sync_settings.next_sync = new Date(now.setDate(now.getDate() + 7));
        break;
    }
  }
  
  this.updated_at = Date.now();
  next();
});

// Methods
socialAccountSchema.methods.updateMetrics = function(newMetrics) {
  // Store current metrics in history
  if (this.metrics.followers > 0) {
    this.metrics_history.push({
      date: new Date(),
      followers: this.metrics.followers,
      engagement_rate: this.metrics.engagement_rate,
      posts: this.metrics.posts_count
    });
    
    // Keep only last 90 days
    if (this.metrics_history.length > 90) {
      this.metrics_history = this.metrics_history.slice(-90);
    }
  }
  
  // Update with new metrics
  this.metrics = {
    ...this.metrics,
    ...newMetrics
  };
  
  // Calculate growth rates
  if (this.metrics_history.length >= 2) {
    const last = this.metrics_history[this.metrics_history.length - 1];
    const prev = this.metrics_history[this.metrics_history.length - 2];
    
    if (prev && last) {
      this.metrics.growth_rate = {
        daily: ((last.followers - prev.followers) / prev.followers) * 100,
        weekly: this.calculateWeeklyGrowth(),
        monthly: this.calculateMonthlyGrowth()
      };
    }
  }
  
  this.last_synced = new Date();
  return this.save();
};

socialAccountSchema.methods.calculateWeeklyGrowth = function() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekData = this.metrics_history.filter(m => m.date >= weekAgo);
  
  if (weekData.length < 2) return 0;
  
  const oldest = weekData[0].followers;
  const newest = weekData[weekData.length - 1].followers;
  
  return ((newest - oldest) / oldest) * 100;
};

socialAccountSchema.methods.calculateMonthlyGrowth = function() {
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const monthData = this.metrics_history.filter(m => m.date >= monthAgo);
  
  if (monthData.length < 2) return 0;
  
  const oldest = monthData[0].followers;
  const newest = monthData[monthData.length - 1].followers;
  
  return ((newest - oldest) / oldest) * 100;
};

socialAccountSchema.methods.isTokenExpired = function() {
  return this.token_expiry < new Date();
};

socialAccountSchema.methods.refreshToken = async function() {
  // This will be implemented in the service layer
  // Actual API call to refresh token
  this.status = 'connected';
  return this.save();
};

socialAccountSchema.methods.disconnect = function(reason) {
  this.is_active = false;
  this.status = 'disconnected';
  this.status_reason = reason;
  this.sync_settings.auto_sync = false;
  return this.save();
};

// Static methods
socialAccountSchema.statics.getAccountsNeedingSync = function() {
  return this.find({
    'sync_settings.auto_sync': true,
    'sync_settings.next_sync': { $lte: new Date() },
    status: 'connected',
    is_active: true
  });
};

socialAccountSchema.statics.getCreatorStats = function(creatorId) {
  return this.aggregate([
    { $match: { creator_id: creatorId, is_active: true } },
    {
      $group: {
        _id: '$platform',
        followers: { $first: '$metrics.followers' },
        engagement_rate: { $first: '$metrics.engagement_rate' },
        posts_count: { $first: '$metrics.posts_count' },
        verified: { $first: '$verified' }
      }
    }
  ]);
};

// Indexes
socialAccountSchema.index({ creator_id: 1, platform: 1 }, { unique: true });
socialAccountSchema.index({ platform_user_id: 1, platform: 1 });
socialAccountSchema.index({ status: 1 });
socialAccountSchema.index({ verified: 1 });
socialAccountSchema.index({ 'sync_settings.next_sync': 1 });
socialAccountSchema.index({ token_expiry: 1 });
socialAccountSchema.index({ last_synced: -1 });

// Enable getters/setters for encrypted fields
socialAccountSchema.set('toJSON', { getters: true });
socialAccountSchema.set('toObject', { getters: true });

const SocialAccount = mongoose.model('SocialAccount', socialAccountSchema);
module.exports = SocialAccount;