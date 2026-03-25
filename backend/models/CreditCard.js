// models/CreditCard.js - UPDATED (Stripe Only)
const mongoose = require('mongoose');
const crypto = require('crypto');

// Encryption helper (would use a proper encryption service)
const encrypt = (text) => {
  if (!text) return text;
  const algorithm = 'aes-256-ctr';
  const secretKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decrypt = (hash) => {
  if (!hash) return hash;
  const algorithm = 'aes-256-ctr';
  const secretKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32);
  const parts = hash.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encryptedText = Buffer.from(parts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey), iv);
  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  return decrypted.toString();
};

const creditCardSchema = new mongoose.Schema({
  cardId: {
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

  // Card details (encrypted)
  cardNumberEncrypted: {
    type: String,
    required: true,
    set: encrypt,
    get: decrypt
  },

  cardholderName: {
    type: String,
    required: true
  },

  expiryMonth: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },

  expiryYear: {
    type: Number,
    required: true,
    min: new Date().getFullYear()
  },

  // Last 4 digits (stored for display)
  last4: {
    type: String,
    required: true
  },

  // Card brand
  brand: {
    type: String,
    enum: ['Visa', 'Mastercard', 'Amex', 'Discover', 'JCB', 'UnionPay', 'Other'],
    required: true
  },

  // Card type
  funding: {
    type: String,
    enum: ['credit', 'debit', 'prepaid', 'unknown'],
    default: 'unknown'
  },

  // Country
  country: {
    type: String,
    default: 'US'
  },

  // Stripe ONLY
  stripePaymentMethodId: String,
  stripeCustomerId: String,

  // Default
  isDefault: {
    type: Boolean,
    default: false
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'expired', 'invalid', 'removed'],
    default: 'active'
  },

  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,

  // Billing address
  billingAddress: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },

  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },

  // Audit
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
  toJSON: { getters: true },
  toObject: { getters: true }
});

// ==================== INDEXES ====================
creditCardSchema.index({ userId: 1, isDefault: 1 });
creditCardSchema.index({ stripePaymentMethodId: 1 });
creditCardSchema.index({ last4: 1, brand: 1 });
creditCardSchema.index({ status: 1 });

// ==================== PRE-SAVE MIDDLEWARE ====================
creditCardSchema.pre('save', async function(next) {
  this.updatedAt = Date.now();
  
  // Generate card ID if not exists
  if (!this.cardId) {
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    this.cardId = `CC-${random}`;
  }

  // Extract last 4 digits
  const cardNumber = this.cardNumberEncrypted;
  if (cardNumber && !this.last4) {
    this.last4 = cardNumber.slice(-4);
  }

  // If this is set as default, unset other defaults for this user
  if (this.isDefault) {
    await this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }

  next();
});

// ==================== VIRTUAL PROPERTIES ====================

// Masked card number
creditCardSchema.virtual('maskedNumber').get(function() {
  return `**** **** **** ${this.last4}`;
});

// Expiry formatted
creditCardSchema.virtual('expiryFormatted').get(function() {
  return `${this.expiryMonth.toString().padStart(2, '0')}/${this.expiryYear}`;
});

// Display name
creditCardSchema.virtual('displayName').get(function() {
  return `${this.brand} ending in ${this.last4}`;
});

// Check if expired
creditCardSchema.virtual('isExpired').get(function() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  return this.expiryYear < currentYear || 
         (this.expiryYear === currentYear && this.expiryMonth < currentMonth);
});

// ==================== METHODS ====================

/**
 * Mark as default
 * @returns {Promise}
 */
creditCardSchema.methods.setAsDefault = async function() {
  await this.constructor.updateMany(
    { userId: this.userId },
    { $set: { isDefault: false } }
  );
  
  this.isDefault = true;
  await this.save();
};

/**
 * Mark as verified
 * @returns {Promise}
 */
creditCardSchema.methods.verify = async function() {
  this.isVerified = true;
  this.verifiedAt = new Date();
  await this.save();
};

/**
 * Mark as expired
 * @returns {Promise}
 */
creditCardSchema.methods.markExpired = async function() {
  this.status = 'expired';
  await this.save();
};

/**
 * Mark as removed
 * @returns {Promise}
 */
creditCardSchema.methods.remove = async function() {
  this.status = 'removed';
  this.isDefault = false;
  await this.save();
};

/**
 * Get decrypted card number
 * @returns {string}
 */
creditCardSchema.methods.getCardNumber = function() {
  return this.cardNumberEncrypted;
};

/**
 * Check if can be used for payment
 * @returns {boolean}
 */
creditCardSchema.methods.canUse = function() {
  return this.status === 'active' && !this.isExpired;
};

// ==================== STATIC METHODS ====================

/**
 * Get user's default card
 * @param {string} userId - User ID
 * @returns {Query}
 */
creditCardSchema.statics.getDefault = function(userId) {
  return this.findOne({ userId, isDefault: true, status: 'active' });
};

/**
 * Get user's active cards
 * @param {string} userId - User ID
 * @returns {Query}
 */
creditCardSchema.statics.getActiveCards = function(userId) {
  return this.find({ 
    userId, 
    status: 'active' 
  }).sort({ isDefault: -1, createdAt: -1 });
};

/**
 * Set default card
 * @param {string} cardId - Card ID
 * @param {string} userId - User ID
 * @returns {Promise}
 */
creditCardSchema.statics.setDefault = async function(cardId, userId) {
  // Remove default from all
  await this.updateMany(
    { userId },
    { $set: { isDefault: false } }
  );

  // Set new default
  return this.findByIdAndUpdate(
    cardId,
    { $set: { isDefault: true } },
    { new: true }
  );
};

/**
 * Get expiring cards
 * @param {number} months - Months threshold
 * @returns {Query}
 */
creditCardSchema.statics.getExpiringCards = function(months = 2) {
  const now = new Date();
  const future = new Date();
  future.setMonth(future.getMonth() + months);
  
  return this.find({
    status: 'active',
    $or: [
      { expiryYear: now.getFullYear(), expiryMonth: { $gte: now.getMonth() + 1 } },
      { expiryYear: future.getFullYear(), expiryMonth: { $lte: future.getMonth() + 1 } }
    ]
  }).populate('userId', 'fullName email');
};

/**
 * Get stats
 * @returns {Promise}
 */
creditCardSchema.statics.getStats = async function() {
  const [total, active, expired] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ status: 'active' }),
    this.countDocuments({ status: 'expired' })
  ]);

  return {
    total,
    active,
    expired
  };
};

const CreditCard = mongoose.model('CreditCard', creditCardSchema);

module.exports = CreditCard;