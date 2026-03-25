const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // ==================== PLATFORM SETTINGS ====================
  platform: {
    name: {
      type: String,
      default: 'InfluenceX',
      trim: true
    },
    description: {
      type: String,
      default: 'Influencer Deal Marketplace',
      trim: true
    },
    logo: {
      type: String,
      default: '/logo.png'
    },
    favicon: {
      type: String,
      default: '/favicon.ico'
    },
    supportEmail: {
      type: String,
      default: 'support@influencex.com',
      lowercase: true,
      trim: true
    },
    supportPhone: {
      type: String,
      default: '+1 (555) 123-4567',
      trim: true
    },
    supportHours: {
      type: String,
      default: 'Mon-Fri, 9am-5pm EST',
      trim: true
    },
    timezone: {
      type: String,
      default: 'America/New_York'
    },
    dateFormat: {
      type: String,
      default: 'MM/DD/YYYY'
    },
    timeFormat: {
      type: String,
      enum: ['12h', '24h'],
      default: '12h'
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD']
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ar', 'hi', 'zh', 'ja']
    },
    languages: [{
      code: String,
      name: String,
      isDefault: { type: Boolean, default: false },
      isActive: { type: Boolean, default: true }
    }]
  },

  // ==================== FEE SETTINGS ====================
  fees: {
    commissionRate: {
      type: Number,
      default: 10,
      min: 0,
      max: 100
    },
    commissionTiers: [{
      minDealValue: { type: Number, default: 0 },
      maxDealValue: { type: Number, default: null },
      rate: { type: Number, required: true }
    }],
    transactionFee: {
      percentage: { type: Number, default: 2.9 },
      fixed: { type: Number, default: 0.30 }
    },
    withdrawalFee: {
      type: {
        type: String,
        enum: ['fixed', 'percentage', 'tiered'],
        default: 'fixed'
      },
      amount: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
      tiers: [{
        minAmount: Number,
        maxAmount: Number,
        fee: Number
      }]
    },
    escrowFee: {
      type: Number,
      default: 0,
      min: 0
    },
    featuredListingFee: {
      base: { type: Number, default: 50 },
      daily: { type: Number, default: 5 }
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    taxInclusive: {
      type: Boolean,
      default: false
    }
  },

  // ==================== PAYMENT SETTINGS ====================
  payments: {
    minPayoutAmount: {
      type: Number,
      default: 50,
      min: 1
    },
    maxPayoutAmount: {
      type: Number,
      default: 10000,
      min: 1
    },
    payoutSchedule: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly', 'manual'],
      default: 'weekly'
    },
    payoutDay: {
      type: Number,
      default: 1, // 1 = Monday, 7 = Sunday
      min: 1,
      max: 7
    },
    paymentMethods: [{
      type: {
        type: String,
        enum: ['credit_card', 'bank_account', 'paypal', 'stripe', 'crypto']
      },
      isActive: { type: Boolean, default: true },
      feePercentage: { type: Number, default: 0 },
      feeFixed: { type: Number, default: 0 },
      minAmount: { type: Number, default: 1 },
      maxAmount: { type: Number, default: null },
      countries: [String]
    }],
    stripe: {
      publishableKey: String,
      secretKey: String,
      webhookSecret: String,
      isEnabled: { type: Boolean, default: false }
    },
    paypal: {
      clientId: String,
      clientSecret: String,
      webhookId: String,
      isEnabled: { type: Boolean, default: false }
    },
    razorpay: {
      keyId: String,
      keySecret: String,
      webhookSecret: String,
      isEnabled: { type: Boolean, default: false }
    }
  },

  // ==================== SUBSCRIPTION SETTINGS ====================
  subscriptions: {
    enabled: {
      type: Boolean,
      default: true
    },
    trialDays: {
      type: Number,
      default: 14,
      min: 0
    },
    plans: [{
      planId: String,
      isActive: { type: Boolean, default: true },
      sortOrder: { type: Number, default: 0 }
    }],
  features: {
  basic_search: {
    free: { type: Boolean, default: true },
    starter: { type: Boolean, default: true },
    pro: { type: Boolean, default: true },
    enterprise: { type: Boolean, default: true }
  },
  advanced_search: {
    free: { type: Boolean, default: false },
    starter: { type: Boolean, default: true },
    pro: { type: Boolean, default: true },
    enterprise: { type: Boolean, default: true }
  },
  ai_matching: {
    free: { type: Boolean, default: false },
    starter: { type: Boolean, default: false },
    pro: { type: Boolean, default: true },
    enterprise: { type: Boolean, default: true }
  },
  api_access: {
    free: { type: Boolean, default: false },
    starter: { type: Boolean, default: false },
    pro: { type: Boolean, default: true },
    enterprise: { type: Boolean, default: true }
  },
  analytics: {
    free: { type: Boolean, default: false },
    starter: { type: Boolean, default: true },
    pro: { type: Boolean, default: true },
    enterprise: { type: Boolean, default: true }
  },
  custom_branding: {
    free: { type: Boolean, default: false },
    starter: { type: Boolean, default: false },
    pro: { type: Boolean, default: true },
    enterprise: { type: Boolean, default: true }
  },
  white_label: {
    free: { type: Boolean, default: false },
    starter: { type: Boolean, default: false },
    pro: { type: Boolean, default: false },
    enterprise: { type: Boolean, default: true }
  }
}
  },

  // ==================== SECURITY SETTINGS ====================
  security: {
    twoFactorRequired: {
      type: Boolean,
      default: false
    },
    twoFactorForAdmins: {
      type: Boolean,
      default: true
    },
    emailVerification: {
      type: Boolean,
      default: true
    },
    phoneVerification: {
      type: Boolean,
      default: false
    },
    maxLoginAttempts: {
      type: Number,
      default: 5,
      min: 1,
      max: 20
    },
    lockoutDuration: {
      type: Number,
      default: 30, // minutes
      min: 1,
      max: 1440
    },
    sessionTimeout: {
      type: Number,
      default: 30, // minutes
      min: 5,
      max: 480
    },
    passwordMinLength: {
      type: Number,
      default: 8,
      min: 6,
      max: 20
    },
    passwordRequireUppercase: {
      type: Boolean,
      default: true
    },
    passwordRequireLowercase: {
      type: Boolean,
      default: true
    },
    passwordRequireNumbers: {
      type: Boolean,
      default: true
    },
    passwordRequireSymbols: {
      type: Boolean,
      default: false
    },
    passwordExpiryDays: {
      type: Number,
      default: 90,
      min: 0,
      max: 365
    },
    passwordHistoryCount: {
      type: Number,
      default: 5,
      min: 0,
      max: 20
    },
    jwtExpiry: {
      type: String,
      default: '7d'
    },
    refreshTokenExpiry: {
      type: String,
      default: '30d'
    },
    allowedIPs: [String],
    blockedIPs: [String],
    ipWhitelistEnabled: {
      type: Boolean,
      default: false
    }
  },

  // ==================== VERIFICATION SETTINGS ====================
  verification: {
    minFollowerCount: {
      type: Number,
      default: 1000,
      min: 0
    },
    minAccountAge: {
      type: Number,
      default: 30, // days
      min: 0
    },
    requireSocialAccounts: {
      type: Boolean,
      default: true
    },
    requireIDVerification: {
      type: Boolean,
      default: false
    },
    manualVerificationRequired: {
      type: Boolean,
      default: true
    },
    autoVerifyEmail: {
      type: Boolean,
      default: true
    },
    autoVerifyPhone: {
      type: Boolean,
      default: false
    },
    supportedPlatforms: [{
      platform: {
        type: String,
        enum: ['instagram', 'youtube', 'tiktok', 'twitter', 'facebook', 'linkedin']
      },
      required: { type: Boolean, default: true },
      minFollowers: { type: Number, default: 0 }
    }]
  },

  // ==================== NOTIFICATION SETTINGS ====================
  notifications: {
    email: {
      enabled: { type: Boolean, default: true },
      provider: {
        type: String,
        enum: ['smtp', 'sendgrid', 'ses', 'mailgun'],
        default: 'smtp'
      },
      smtp: {
        host: String,
        port: Number,
        secure: { type: Boolean, default: false },
        auth: {
          user: String,
          pass: String
        }
      },
      sendgrid: {
        apiKey: String
      },
      fromEmail: {
        type: String,
        default: 'noreply@influencex.com'
      },
      fromName: {
        type: String,
        default: 'InfluenceX'
      },
      replyTo: {
        type: String,
        default: 'support@influencex.com'
      },
      templates: {
        welcome: { type: String, default: 'welcome' },
        verifyEmail: { type: String, default: 'verify-email' },
        resetPassword: { type: String, default: 'reset-password' },
        dealOffer: { type: String, default: 'deal-offer' },
        paymentReceived: { type: String, default: 'payment-received' }
      }
    },
    sms: {
      enabled: { type: Boolean, default: false },
      provider: {
        type: String,
        enum: ['twilio', 'nexmo', 'plivo'],
        default: 'twilio'
      },
      twilio: {
        accountSid: String,
        authToken: String,
        phoneNumber: String
      },
      fromNumber: String
    },
    push: {
      enabled: { type: Boolean, default: true },
      vapidPublicKey: String,
      vapidPrivateKey: String,
      vapidEmail: String
    },
    inApp: {
      enabled: { type: Boolean, default: true },
      retentionDays: {
        type: Number,
        default: 30,
        min: 1,
        max: 365
      }
    }
  },

  // ==================== FEATURE SETTINGS ====================
  features: {
    chat: {
      enabled: { type: Boolean, default: true },
      fileSharing: { type: Boolean, default: true },
      maxFileSize: { type: Number, default: 50 }, // MB
      typingIndicators: { type: Boolean, default: true },
      readReceipts: { type: Boolean, default: true }
    },
    reviews: {
      enabled: { type: Boolean, default: true },
      moderationRequired: { type: Boolean, default: false },
      minReviewLength: { type: Number, default: 10 },
      maxReviewLength: { type: Number, default: 500 }
    },
    disputes: {
      enabled: { type: Boolean, default: true },
      autoEscalateDays: { type: Number, default: 7 },
      resolutionDeadlineDays: { type: Number, default: 14 }
    },
    contracts: {
      enabled: { type: Boolean, default: true },
      esignRequired: { type: Boolean, default: true },
      templateLibrary: { type: Boolean, default: true }
    },
    featuredListings: {
      enabled: { type: Boolean, default: true },
      autoApprove: { type: Boolean, default: false }
    },
    affiliate: {
      enabled: { type: Boolean, default: false },
      commissionRate: { type: Number, default: 10 }
    }
  },

  // ==================== SEO SETTINGS ====================
  seo: {
    metaTitle: {
      type: String,
      default: 'InfluenceX - Influencer Marketing Platform'
    },
    metaDescription: {
      type: String,
      default: 'Connect with authentic micro-influencers for your brand campaigns'
    },
    metaKeywords: [String],
    googleAnalyticsId: String,
    facebookPixelId: String,
    twitterHandle: String,
    robotsTxt: {
      type: String,
      default: 'User-agent: *\nAllow: /'
    },
    sitemapEnabled: {
      type: Boolean,
      default: true
    }
  },

  // ==================== MAINTENANCE SETTINGS ====================
  maintenance: {
    enabled: {
      type: Boolean,
      default: false
    },
    message: {
      type: String,
      default: 'We are currently undergoing maintenance. Please check back soon.'
    },
    allowedIPs: [String],
    allowedPaths: [String],
    startTime: Date,
    endTime: Date
  },

  // ==================== GDPR SETTINGS ====================
  gdpr: {
    cookieConsentRequired: {
      type: Boolean,
      default: true
    },
    cookieLifetime: {
      type: Number,
      default: 365, // days
      min: 1,
      max: 730
    },
    dataRetentionDays: {
      campaigns: { type: Number, default: 2555 }, // 7 years
      deals: { type: Number, default: 2555 },
      payments: { type: Number, default: 3650 }, // 10 years
      messages: { type: Number, default: 1095 }, // 3 years
      logs: { type: Number, default: 90 } // 90 days
    },
    anonymizeData: {
      type: Boolean,
      default: true
    },
    exportFormat: {
      type: String,
      enum: ['json', 'csv', 'zip'],
      default: 'zip'
    }
  },

  // ==================== API SETTINGS ====================
  api: {
    rateLimit: {
      enabled: { type: Boolean, default: true },
      maxRequests: { type: Number, default: 100 },
      windowMs: { type: Number, default: 15 * 60 * 1000 } // 15 minutes
    },
    cors: {
      enabled: { type: Boolean, default: true },
      allowedOrigins: [String],
      allowedMethods: [String],
      allowedHeaders: [String],
      exposedHeaders: [String],
      maxAge: { type: Number, default: 86400 } // 24 hours
    },
    cache: {
      enabled: { type: Boolean, default: true },
      ttl: { type: Number, default: 3600 }, // 1 hour
      redis: {
        host: String,
        port: Number,
        password: String
      }
    }
  },

  // ==================== UPLOAD SETTINGS ====================
  upload: {
    maxFileSize: {
      type: Number,
      default: 100, // MB
      min: 1,
      max: 500
    },
    allowedFileTypes: [{
      type: String,
      enum: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'mov', 'avi', 'pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx', 'xls', 'zip']
    }],
    imageOptimization: {
      enabled: { type: Boolean, default: true },
      maxWidth: { type: Number, default: 1920 },
      maxHeight: { type: Number, default: 1080 },
      quality: { type: Number, default: 80, min: 1, max: 100 }
    },
    videoOptimization: {
      enabled: { type: Boolean, default: true },
      maxDuration: { type: Number, default: 300 }, // seconds
      maxBitrate: { type: Number, default: 5000 } // kbps
    },
    storage: {
      provider: {
        type: String,
        enum: ['local', 's3', 'cloudinary'],
        default: 'local'
      },
      s3: {
        bucket: String,
        region: String,
        accessKey: String,
        secretKey: String,
        endpoint: String
      },
      cloudinary: {
        cloudName: String,
        apiKey: String,
        apiSecret: String
      }
    }
  },

  // ==================== SOCIAL LOGIN SETTINGS ====================
  socialLogin: {
    google: {
      enabled: { type: Boolean, default: false },
      clientId: String,
      clientSecret: String
    },
    facebook: {
      enabled: { type: Boolean, default: false },
      appId: String,
      appSecret: String
    },
    instagram: {
      enabled: { type: Boolean, default: false },
      clientId: String,
      clientSecret: String
    },
    twitter: {
      enabled: { type: Boolean, default: false },
      consumerKey: String,
      consumerSecret: String
    },
    linkedin: {
      enabled: { type: Boolean, default: false },
      clientId: String,
      clientSecret: String
    }
  },

  // ==================== THIRD PARTY INTEGRATIONS ====================
  integrations: {
    stripe: {
      enabled: { type: Boolean, default: true },
      publishableKey: String,
      secretKey: String,
      webhookSecret: String
    },
    paypal: {
      enabled: { type: Boolean, default: false },
      clientId: String,
      clientSecret: String,
      webhookId: String
    },
    twilio: {
      enabled: { type: Boolean, default: false },
      accountSid: String,
      authToken: String,
      phoneNumber: String
    },
    sendgrid: {
      enabled: { type: Boolean, default: false },
      apiKey: String
    },
    cloudinary: {
      enabled: { type: Boolean, default: false },
      cloudName: String,
      apiKey: String,
      apiSecret: String
    },
    googleAnalytics: {
      enabled: { type: Boolean, default: false },
      trackingId: String
    },
    sentry: {
      enabled: { type: Boolean, default: false },
      dsn: String,
      environment: String
    }
  },

  // ==================== AUDIT & METADATA ====================
  version: {
    type: Number,
    default: 1
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
  timestamps: true,
  strict: false // Allow additional fields
});

// ==================== INDEXES ====================
settingsSchema.index({ 'platform.name': 1 });
settingsSchema.index({ version: 1 });

// ==================== PRE-SAVE MIDDLEWARE ====================
settingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Ensure only one settings document exists
  if (this.isNew) {
    this.constructor.countDocuments().then(count => {
      if (count > 0 && !this._id) {
        next(new Error('Only one settings document can exist'));
      } else {
        next();
      }
    });
  } else {
    next();
  }
});

// ==================== METHODS ====================

/**
 * Get setting value by path
 * @param {string} path - Dot notation path (e.g., 'platform.name')
 * @returns {any}
 */
settingsSchema.methods.getSetting = function(path) {
  return path.split('.').reduce((obj, key) => obj && obj[key], this.toObject());
};

/**
 * Update settings
 * @param {Object} updates - Settings updates
 * @param {string} userId - User ID making the update
 */
settingsSchema.methods.updateSettings = async function(updates, userId) {
  Object.assign(this, updates);
  this.updatedBy = userId;
  this.version += 1;
  await this.save();
  return this;
};

/**
 * Get public settings (safe for frontend)
 */
settingsSchema.methods.getPublicSettings = function() {
  const settings = this.toObject();
  
  // Remove sensitive data
  delete settings.fees?.stripe;
  delete settings.payments?.stripe?.secretKey;
  delete settings.payments?.paypal?.clientSecret;
  delete settings.notifications?.email?.smtp?.auth;
  delete settings.notifications?.email?.sendgrid?.apiKey;
  delete settings.notifications?.sms?.twilio?.authToken;
  delete settings.integrations?.stripe?.secretKey;
  delete settings.integrations?.paypal?.clientSecret;
  delete settings.integrations?.twilio?.authToken;
  delete settings.integrations?.sendgrid?.apiKey;
  delete settings.integrations?.cloudinary?.apiSecret;
  delete settings.api?.cache?.redis?.password;
  
  return settings;
};

/**
 * Check if feature is enabled
 * @param {string} feature - Feature name
 * @returns {boolean}
 */
settingsSchema.methods.isFeatureEnabled = function(feature) {
  return this.features?.[feature]?.enabled ?? true;
};

/**
 * Get fee for amount
 * @param {number} amount - Transaction amount
 * @param {string} type - Fee type
 * @returns {Object}
 */
settingsSchema.methods.calculateFee = function(amount, type = 'commission') {
  let fee = 0;
  
  if (type === 'commission') {
    // Check tiers
    if (this.fees.commissionTiers?.length > 0) {
      for (const tier of this.fees.commissionTiers) {
        if (amount >= tier.minDealValue && (!tier.maxDealValue || amount <= tier.maxDealValue)) {
          fee = (amount * tier.rate) / 100;
          break;
        }
      }
    } else {
      fee = (amount * this.fees.commissionRate) / 100;
    }
  } else if (type === 'withdrawal') {
    if (this.fees.withdrawalFee.type === 'fixed') {
      fee = this.fees.withdrawalFee.amount;
    } else if (this.fees.withdrawalFee.type === 'percentage') {
      fee = (amount * this.fees.withdrawalFee.percentage) / 100;
    } else if (this.fees.withdrawalFee.type === 'tiered' && this.fees.withdrawalFee.tiers) {
      for (const tier of this.fees.withdrawalFee.tiers) {
        if (amount >= tier.minAmount && (!tier.maxAmount || amount <= tier.maxAmount)) {
          fee = tier.fee;
          break;
        }
      }
    }
  } else if (type === 'transaction') {
    fee = (amount * this.fees.transactionFee.percentage) / 100 + this.fees.transactionFee.fixed;
  }
  
  return {
    amount,
    fee,
    netAmount: amount - fee,
    type
  };
};

/**
 * Get maintenance status
 */
settingsSchema.methods.getMaintenanceStatus = function() {
  const now = new Date();
  
  if (!this.maintenance.enabled) {
    return { enabled: false };
  }
  
  const inMaintenanceWindow = (!this.maintenance.startTime || now >= this.maintenance.startTime) &&
                              (!this.maintenance.endTime || now <= this.maintenance.endTime);
  
  return {
    enabled: this.maintenance.enabled && inMaintenanceWindow,
    message: this.maintenance.message,
    startTime: this.maintenance.startTime,
    endTime: this.maintenance.endTime
  };
};

// ==================== STATIC METHODS ====================

/**
 * Get settings (singleton)
 */
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  
  if (!settings) {
    settings = await this.create({});
  }
  
  return settings;
};

/**
 * Initialize default settings
 */
settingsSchema.statics.initialize = async function() {
  const count = await this.countDocuments();
  
  if (count === 0) {
    await this.create({});
    console.log('✅ Default settings initialized');
  }
};

/**
 * Update multiple settings
 * @param {Object} updates - Settings updates
 * @param {string} userId - User ID
 */
settingsSchema.statics.updateMany = async function(updates, userId) {
  const settings = await this.getSettings();
  return settings.updateSettings(updates, userId);
};

/**
 * Get payment method settings
 * @param {string} method - Payment method
 */
settingsSchema.statics.getPaymentMethod = async function(method) {
  const settings = await this.getSettings();
  return settings.payments.paymentMethods.find(m => m.type === method && m.isActive);
};

/**
 * Get supported languages
 */
settingsSchema.statics.getLanguages = async function() {
  const settings = await this.getSettings();
  return settings.platform.languages.filter(l => l.isActive);
};

/**
 * Get default language
 */
settingsSchema.statics.getDefaultLanguage = async function() {
  const settings = await this.getSettings();
  const defaultLang = settings.platform.languages.find(l => l.isDefault);
  return defaultLang || { code: settings.platform.language, name: 'English' };
};

/**
 * Validate IP against whitelist/blacklist
 * @param {string} ip - IP address
 */
settingsSchema.statics.validateIP = async function(ip) {
  const settings = await this.getSettings();
  
  // Check whitelist
  if (settings.security.ipWhitelistEnabled && settings.security.allowedIPs.length > 0) {
    if (!settings.security.allowedIPs.includes(ip)) {
      return { allowed: false, reason: 'IP not in whitelist' };
    }
  }
  
  // Check blacklist
  if (settings.security.blockedIPs.includes(ip)) {
    return { allowed: false, reason: 'IP is blacklisted' };
  }
  
  return { allowed: true };
};

/**
 * Get maintenance status
 */
settingsSchema.statics.getMaintenanceStatus = async function() {
  const settings = await this.getSettings();
  return settings.getMaintenanceStatus();
};

/**
 * Check if in maintenance mode
 */
settingsSchema.statics.isInMaintenance = async function(ip = null) {
  const settings = await this.getSettings();
  const status = settings.getMaintenanceStatus();
  
  if (!status.enabled) return false;
  
  // Check if IP is allowed during maintenance
  if (ip && settings.maintenance.allowedIPs.includes(ip)) {
    return false;
  }
  
  return true;
};

/**
 * Get feature flag
 * @param {string} feature - Feature name
 */
settingsSchema.statics.getFeatureFlag = async function(feature) {
  const settings = await this.getSettings();
  return settings.isFeatureEnabled(feature);
};

// ==================== EXPORT ====================
const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;