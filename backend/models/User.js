// models/User.js - UPDATED WITH 2FA FIELDS
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters']
  },
  userType: {
    type: String,
    enum: ['brand', 'creator', 'admin'],
    required: true,
    index: true
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  profilePicture: {
    type: String,
    default: 'default-profile.jpg'
  },
  coverPicture: {
    type: String,
    default: 'default-cover.jpg'
  },
  emailVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // ==================== 2FA FIELDS ====================
  twoFactorEnabled: {
    type: Boolean,
    default: false,
    index: true
  },
  twoFactorSecret: {
    type: String,
    select: false // Don't return by default
  },
  twoFactorTempSecret: {
    type: String,
    select: false // Temporary secret during setup
  },
  twoFactorTempSecretExpires: {
    type: Date,
    select: false
  },
  twoFactorBackupCodes: [{
    type: String,
    select: false
  }],
  twoFactorMethod: {
    type: String,
    enum: ['app', 'sms', 'email', null],
    default: 'app'
  },
  
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending', 'deleted'],
    default: 'pending',
    index: true
  },
  deletedAt: Date,
  deletionReason: String,
  lastLogin: {
    type: Date,
    index: true
  },
  lastActive: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  refreshToken: String,
  tokenVersion: {
    type: Number,
    default: 1
  },
  
  // Push notification subscriptions
  pushSubscriptions: [{
    endpoint: String,
    keys: {
      auth: String,
      p256dh: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // ==================== GDPR/CONSENT FIELDS ====================
  consents: {
    privacyPolicy: {
      accepted: { type: Boolean, default: false },
      acceptedAt: Date,
      version: { type: String, default: '1.0' },
      ipAddress: String
    },
    termsOfService: {
      accepted: { type: Boolean, default: false },
      acceptedAt: Date,
      version: { type: String, default: '1.0' },
      ipAddress: String
    },
    marketing: {
      accepted: { type: Boolean, default: false },
      acceptedAt: Date,
      updatedAt: Date
    },
    dataSharing: {
      accepted: { type: Boolean, default: true },
      acceptedAt: Date,
      updatedAt: Date
    },
    cookies: {
      accepted: { type: Boolean, default: true },
      acceptedAt: Date,
      updatedAt: Date
    },
    analytics: {
      accepted: { type: Boolean, default: true },
      acceptedAt: Date,
      updatedAt: Date
    },
    thirdParty: {
      accepted: { type: Boolean, default: false },
      acceptedAt: Date,
      updatedAt: Date
    }
  },

  // Privacy settings
  privacySettings: {
    profileVisibility: {
      type: String,
      enum: ['public', 'private', 'team'],
      default: 'public'
    },
    showEmail: { type: Boolean, default: false },
    showPhone: { type: Boolean, default: false },
    showLocation: { type: Boolean, default: true },
    showActivity: { type: Boolean, default: true },
    dataRetention: {
      type: String,
      enum: ['1year', '3years', '7years', 'forever'],
      default: '7years'
    }
  },

  // Data processing restrictions
  processingRestricted: {
    active: { type: Boolean, default: false },
    reason: String,
    restrictedAt: Date
  },

  processingObjections: [{
    type: {
      type: String,
      enum: ['automated_decision', 'marketing', 'profiling']
    },
    reason: String,
    objectedAt: Date
  }],

  // Data export requests
  dataExports: [{
    requestedAt: Date,
    completedAt: Date,
    fileUrl: String,
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed']
    },
    expiresAt: Date
  }],

  settings: {
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' },
    notifications: {
      email: {
        deals: { type: Boolean, default: true },
        messages: { type: Boolean, default: true },
        payments: { type: Boolean, default: true },
        campaigns: { type: Boolean, default: true },
        marketing: { type: Boolean, default: false },
        team: { type: Boolean, default: true },
        security: { type: Boolean, default: true } // For 2FA notifications
      },
      push: {
        deals: { type: Boolean, default: true },
        messages: { type: Boolean, default: true },
        payments: { type: Boolean, default: true },
        campaigns: { type: Boolean, default: false },
        team: { type: Boolean, default: true },
        security: { type: Boolean, default: true }
      },
      sms: {
        deals: { type: Boolean, default: false },
        messages: { type: Boolean, default: false },
        payments: { type: Boolean, default: true },
        security: { type: Boolean, default: true } // For 2FA via SMS
      }
    },
    privacy: {
      showEmail: { type: Boolean, default: false },
      showPhone: { type: Boolean, default: false },
      showLocation: { type: Boolean, default: true }
    }
  },

  socialLogins: [{
    provider: String,
    providerId: String,
    profileUrl: String
  }],

  adminNotes: [{
    content: String,
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],

  stripeCustomerId: String,
  stripeAccountId: String,
  stripeAccountStatus: {
    type: String,
    enum: ['pending', 'active', 'inactive'],
    default: 'pending'
  },

  stats: {
    totalReviews: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    completedDeals: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    totalCampaigns: { type: Number, default: 0 }
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
  timestamps: true,
  discriminatorKey: 'userType'
});

// ==================== INDEXES ====================
userSchema.index({ email: 1 });
userSchema.index({ userType: 1, status: 1, createdAt: -1 });
userSchema.index({ isVerified: 1, status: 1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ twoFactorEnabled: 1 }); // For 2FA queries
userSchema.index({ twoFactorTempSecretExpires: 1 }); // For cleanup

// ==================== PRE-SAVE MIDDLEWARE ====================
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// ==================== METHODS ====================
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.methods.incrementLoginAttempts = async function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    // Reset if lock expired
    this.loginAttempts = 1;
    this.lockUntil = undefined;
    return this.save();
  }

  this.loginAttempts += 1;

  if (this.loginAttempts >= 5 && !this.isLocked()) {
    this.lockUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
  }

  return this.save();
};

userSchema.methods.resetLoginAttempts = async function() {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  return this.save();
};

userSchema.methods.updateLastActive = function() {
  this.lastActive = Date.now();
  return this.save();
};

// ==================== 2FA METHODS ====================
userSchema.methods.enable2FA = function(secret, method = 'app') {
  this.twoFactorEnabled = true;
  this.twoFactorSecret = secret;
  this.twoFactorMethod = method;
  this.twoFactorTempSecret = undefined;
  this.twoFactorTempSecretExpires = undefined;
  return this.save();
};

userSchema.methods.disable2FA = function() {
  this.twoFactorEnabled = false;
  this.twoFactorSecret = undefined;
  this.twoFactorBackupCodes = undefined;
  this.twoFactorMethod = undefined;
  return this.save();
};

userSchema.methods.setTemp2FASecret = function(secret, expiryMinutes = 10) {
  this.twoFactorTempSecret = secret;
  this.twoFactorTempSecretExpires = new Date(Date.now() + expiryMinutes * 60 * 1000);
  return this.save();
};

userSchema.methods.is2FATempSecretValid = function() {
  return this.twoFactorTempSecret && 
         this.twoFactorTempSecretExpires && 
         this.twoFactorTempSecretExpires > new Date();
};

userSchema.methods.addPushSubscription = function(subscription) {
  if (!this.pushSubscriptions) {
    this.pushSubscriptions = [];
  }
  
  this.pushSubscriptions = this.pushSubscriptions.filter(
    sub => sub.endpoint !== subscription.endpoint
  );
  
  this.pushSubscriptions.push({
    ...subscription,
    createdAt: new Date()
  });
  
  return this.save();
};

userSchema.methods.removePushSubscription = function(endpoint) {
  if (this.pushSubscriptions) {
    this.pushSubscriptions = this.pushSubscriptions.filter(
      sub => sub.endpoint !== endpoint
    );
  }
  return this.save();
};

// ==================== GDPR/CONSENT METHODS ====================
userSchema.methods.acceptPrivacyPolicy = async function(version, ipAddress) {
  this.consents.privacyPolicy = {
    accepted: true,
    acceptedAt: new Date(),
    version,
    ipAddress
  };
  return this.save();
};

userSchema.methods.acceptTermsOfService = async function(version, ipAddress) {
  this.consents.termsOfService = {
    accepted: true,
    acceptedAt: new Date(),
    version,
    ipAddress
  };
  return this.save();
};

userSchema.methods.anonymize = async function(reason) {
  this.email = `deleted-${Date.now()}@anonymous.com`;
  this.fullName = 'Deleted User';
  this.phone = null;
  this.profilePicture = null;
  this.coverPicture = null;
  this.isVerified = false;
  this.emailVerified = false;
  this.phoneVerified = false;
  this.twoFactorEnabled = false;
  this.twoFactorSecret = undefined;
  this.twoFactorBackupCodes = undefined;
  this.status = 'deleted';
  this.deletedAt = new Date();
  this.deletionReason = reason;
  
  // Remove sensitive data
  this.password = undefined;
  this.refreshToken = undefined;
  this.resetPasswordToken = undefined;
  this.emailVerificationToken = undefined;
  this.pushSubscriptions = [];
  this.stripeCustomerId = undefined;
  this.stripeAccountId = undefined;
  
  return this.save();
};

userSchema.methods.getExportData = function() {
  return {
    profile: {
      email: this.email,
      fullName: this.fullName,
      userType: this.userType,
      phone: this.phone,
      twoFactorEnabled: this.twoFactorEnabled,
      twoFactorMethod: this.twoFactorMethod,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    },
    consents: this.consents,
    settings: this.settings,
    stats: this.stats
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;