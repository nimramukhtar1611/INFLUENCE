// models/Creator.js - COMPLETE FIXED VERSION
const mongoose = require('mongoose');
const User = require('./User');

const creatorSchema = new mongoose.Schema({
  displayName: {
    type: String,
    required: [true, 'Display name is required'],
    trim: true,
    minlength: [2, 'Display name must be at least 2 characters'],
    maxlength: [50, 'Display name cannot exceed 50 characters']
  },
  
  handle: {
    type: String,
    required: [true, 'Handle is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Handle must be at least 3 characters'],
    maxlength: [30, 'Handle cannot exceed 30 characters'],
    validate: {
      validator: function(v) {
        return /^[a-zA-Z0-9_]+$/.test(v);
      },
      message: 'Handle can only contain letters, numbers, and underscores'
    },
    index: true
  },
  
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
    default: ''
  },
  
  location: {
    type: String,
    maxlength: [100, 'Location cannot exceed 100 characters'],
    default: ''
  },
  
  website: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(v);
      },
      message: 'Please enter a valid website URL'
    },
    default: ''
  },
  
  birthday: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return v < new Date();
      },
      message: 'Birthday must be in the past'
    }
  },
  
  gender: {
    type: String,
    enum: ['male', 'female', 'non-binary', 'prefer-not']
  },
  
  niches: [{
    type: String,
    enum: ['Fashion', 'Beauty', 'Fitness', 'Travel', 'Food', 'Tech', 
           'Gaming', 'Lifestyle', 'Parenting', 'Finance', 'Education',
           'Entertainment', 'Sports', 'Music', 'Art', 'Photography', 'Other']
  }],
  
  primaryPlatform: {
    type: String,
    enum: ['instagram', 'youtube', 'tiktok', 'twitter'],
    default: 'instagram'
  },
  
  // ==================== ENHANCED SOCIAL MEDIA FIELDS ====================
  socialMedia: {
    instagram: {
      handle: { type: String, trim: true, lowercase: true },
      url: String,
      followers: { type: Number, default: 0, min: 0 },
      following: { type: Number, default: 0, min: 0 },
      posts: { type: Number, default: 0, min: 0 },
      engagement: { type: Number, default: 0, min: 0, max: 100 },
      verified: { type: Boolean, default: false },
      isBusiness: { type: Boolean, default: false },
      profilePicture: String,
      lastSynced: Date,
      syncError: String,
      syncAttempts: { type: Number, default: 0 }
    },
    youtube: {
      handle: { type: String, trim: true, lowercase: true },
      channelId: String,
      url: String,
      subscribers: { type: Number, default: 0, min: 0 },
      views: { type: Number, default: 0, min: 0 },
      videos: { type: Number, default: 0, min: 0 },
      engagement: { type: Number, default: 0, min: 0, max: 100 },
      verified: { type: Boolean, default: false },
      profilePicture: String,
      banner: String,
      country: String,
      joinedDate: Date,
      lastSynced: Date,
      syncError: String
    },
    tiktok: {
      handle: { type: String, trim: true, lowercase: true },
      url: String,
      followers: { type: Number, default: 0, min: 0 },
      following: { type: Number, default: 0, min: 0 },
      likes: { type: Number, default: 0, min: 0 },
      videos: { type: Number, default: 0, min: 0 },
      engagement: { type: Number, default: 0, min: 0, max: 100 },
      verified: { type: Boolean, default: false },
      profilePicture: String,
      bio: String,
      lastSynced: Date,
      syncError: String
    },
    twitter: {
      handle: { type: String, trim: true, lowercase: true },
      url: String,
      followers: { type: Number, default: 0, min: 0 },
      following: { type: Number, default: 0, min: 0 },
      tweets: { type: Number, default: 0, min: 0 },
      engagement: { type: Number, default: 0, min: 0, max: 100 },
      verified: { type: Boolean, default: false },
      profilePicture: String,
      banner: String,
      lastSynced: Date,
      syncError: String
    },
    facebook: {
      handle: String,
      url: String,
      followers: { type: Number, default: 0, min: 0 },
      name: String,
      profilePicture: String,
      verified: { type: Boolean, default: false },
      lastSynced: Date
    },
    linkedin: {
      handle: String,
      url: String,
      name: String,
      profilePicture: String,
      headline: String,
      connections: { type: Number, default: 0, min: 0 },
      verified: { type: Boolean, default: false },
      lastSynced: Date
    }
  },
  
  // Aggregated fields (calculated from socialMedia)
  totalFollowers: {
    type: Number,
    default: 0,
    min: 0,
    index: true
  },
  
  averageEngagement: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    index: true
  },
  
  // Social media verification status
  socialVerification: {
    instagram: { type: Boolean, default: false },
    youtube: { type: Boolean, default: false },
    tiktok: { type: Boolean, default: false },
    twitter: { type: Boolean, default: false },
    facebook: { type: Boolean, default: false },
    linkedin: { type: Boolean, default: false }
  },
  
  // Last time social media was synced
  lastSocialSync: Date,
  
  // Social media sync status
  socialSyncStatus: {
    type: String,
    enum: ['pending', 'syncing', 'completed', 'failed'],
    default: 'pending'
  },
  
  // Rate card
  rateCard: {
    instagram: {
      post: { type: Number, default: 0, min: 0 },
      story: { type: Number, default: 0, min: 0 },
      reel: { type: Number, default: 0, min: 0 },
      carousel: { type: Number, default: 0, min: 0 },
      igtv: { type: Number, default: 0, min: 0 },
      live: { type: Number, default: 0, min: 0 }
    },
    youtube: {
      video: { type: Number, default: 0, min: 0 },
      shorts: { type: Number, default: 0, min: 0 },
      integration: { type: Number, default: 0, min: 0 },
      live: { type: Number, default: 0, min: 0 }
    },
    tiktok: {
      video: { type: Number, default: 0, min: 0 },
      challenge: { type: Number, default: 0, min: 0 },
      live: { type: Number, default: 0, min: 0 }
    },
    twitter: {
      tweet: { type: Number, default: 0, min: 0 },
      thread: { type: Number, default: 0, min: 0 },
      space: { type: Number, default: 0, min: 0 }
    }
  },
  
  // Portfolio
  portfolio: [{
    title: { type: String, required: true },
    description: String,
    mediaUrl: { type: String, required: true },
    thumbnail: String,
    platform: String,
    brand: String,
    campaign: String,
    performance: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      engagement: { type: Number, default: 0 }
    },
    date: { type: Date, default: Date.now }
  }],
  
  // Audience demographics
  audienceDemographics: {
    ageGroups: {
      '18-24': { type: Number, default: 0, min: 0, max: 100 },
      '25-34': { type: Number, default: 0, min: 0, max: 100 },
      '35-44': { type: Number, default: 0, min: 0, max: 100 },
      '45+': { type: Number, default: 0, min: 0, max: 100 }
    },
    gender: {
      male: { type: Number, default: 0, min: 0, max: 100 },
      female: { type: Number, default: 0, min: 0, max: 100 },
      other: { type: Number, default: 0, min: 0, max: 100 }
    },
    topCountries: [{
      country: String,
      percentage: { type: Number, min: 0, max: 100 }
    }],
    topCities: [{
      city: String,
      percentage: { type: Number, min: 0, max: 100 }
    }]
  },
  
  // Payment methods
  paymentMethods: [{
    type: {
      type: String,
      enum: ['paypal', 'bank_account', 'stripe']
    },
    isDefault: { type: Boolean, default: false },
    paypalEmail: {
      type: String,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
        }
      }
    },
    bankName: String,
    accountNumber: String,
    routingNumber: String,
    accountHolderName: String,
    swiftCode: String
  }],
  
  // Stats
  stats: {
    totalEarnings: { type: Number, default: 0, min: 0 },
    pendingEarnings: { type: Number, default: 0, min: 0 },
    totalCampaigns: { type: Number, default: 0, min: 0 },
    completedCampaigns: { type: Number, default: 0, min: 0 },
    averageRating: { 
      type: Number, 
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: { type: Number, default: 0, min: 0 }
  },
  
  // Availability
  availability: {
    status: { 
      type: String, 
      enum: ['available', 'busy', 'unavailable'], 
      default: 'available',
      index: true
    },
    nextAvailable: Date,
    preferredDealTypes: [String],
    maxActiveDeals: { 
      type: Number, 
      default: 5,
      min: 1,
      max: 20
    }
  },
  
  // Verification
  verifiedAt: Date,
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: String,
  moderationNotes: String

}, {
  timestamps: true
});

// ==================== INDEXES ====================
creatorSchema.index({ handle: 1 }, { unique: true });
creatorSchema.index({ totalFollowers: -1 });
creatorSchema.index({ averageEngagement: -1 });
creatorSchema.index({ 'stats.totalEarnings': -1 });
creatorSchema.index({ 'stats.completedCampaigns': -1 });
creatorSchema.index({ 'availability.status': 1, 'stats.completedCampaigns': -1 });
creatorSchema.index({ niches: 1 });
creatorSchema.index({ primaryPlatform: 1, totalFollowers: -1 });

// Compound indexes for search
creatorSchema.index({ 
  niches: 1, 
  totalFollowers: -1, 
  averageEngagement: -1 
});

// Social media indexes
creatorSchema.index({ 'socialMedia.instagram.handle': 1 });
creatorSchema.index({ 'socialMedia.youtube.handle': 1 });
creatorSchema.index({ 'socialMedia.tiktok.handle': 1 });
creatorSchema.index({ lastSocialSync: 1 });

// ==================== PRE-SAVE MIDDLEWARE ====================
creatorSchema.pre('save', function(next) {
  // Calculate total followers
  let total = 0;
  if (this.socialMedia.instagram?.followers) total += this.socialMedia.instagram.followers;
  if (this.socialMedia.youtube?.subscribers) total += this.socialMedia.youtube.subscribers;
  if (this.socialMedia.tiktok?.followers) total += this.socialMedia.tiktok.followers;
  if (this.socialMedia.twitter?.followers) total += this.socialMedia.twitter.followers;
  this.totalFollowers = total;
  
  // Calculate average engagement
  let engagementSum = 0;
  let platformCount = 0;
  
  if (this.socialMedia.instagram?.engagement) {
    engagementSum += this.socialMedia.instagram.engagement;
    platformCount++;
  }
  if (this.socialMedia.youtube?.engagement) {
    engagementSum += this.socialMedia.youtube.engagement;
    platformCount++;
  }
  if (this.socialMedia.tiktok?.engagement) {
    engagementSum += this.socialMedia.tiktok.engagement;
    platformCount++;
  }
  if (this.socialMedia.twitter?.engagement) {
    engagementSum += this.socialMedia.twitter.engagement;
    platformCount++;
  }
  
  this.averageEngagement = platformCount > 0 ? engagementSum / platformCount : 0;
  
  next();
});

// ==================== METHODS ====================
creatorSchema.methods.updateSocialMedia = function(platform, data) {
  this.socialMedia[platform] = {
    ...this.socialMedia[platform],
    ...data,
    lastSynced: new Date(),
    syncError: null
  };
  this.socialVerification[platform] = true;
  this.lastSocialSync = new Date();
  return this.save();
};

creatorSchema.methods.markSocialSyncFailed = function(platform, error) {
  if (this.socialMedia[platform]) {
    this.socialMedia[platform].syncError = error;
    this.socialMedia[platform].syncAttempts = (this.socialMedia[platform].syncAttempts || 0) + 1;
  }
  return this.save();
};

creatorSchema.methods.addEarnings = function(amount) {
  this.stats.totalEarnings += amount;
  return this.save();
};

creatorSchema.methods.incrementCompletedCampaigns = function() {
  this.stats.completedCampaigns += 1;
  return this.save();
};

creatorSchema.methods.updateRating = async function() {
  const Deal = require('./Deal');
  const deals = await Deal.find({ 
    creatorId: this._id,
    'rating.score': { $exists: true }
  });
  
  if (deals.length > 0) {
    const totalRating = deals.reduce((sum, d) => sum + (d.rating?.score || 0), 0);
    this.stats.averageRating = totalRating / deals.length;
    this.stats.totalReviews = deals.length;
  }
  
  return this.save();
};
let Creator;
try {
  Creator = mongoose.model('creator');
} catch (err) {
  Creator = User.discriminator('creator', creatorSchema); 
}

module.exports = Creator;