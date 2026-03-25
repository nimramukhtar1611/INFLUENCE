// models/BankAccount.js - COMPLETE
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

const bankAccountSchema = new mongoose.Schema({
  accountId: {
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

  // Account details (encrypted)
  bankName: {
    type: String,
    required: true
  },

  accountHolderName: {
    type: String,
    required: true
  },

  accountNumberEncrypted: {
    type: String,
    required: true,
    set: encrypt,
    get: decrypt
  },

  routingNumberEncrypted: {
    type: String,
    required: true,
    set: encrypt,
    get: decrypt
  },

  accountType: {
    type: String,
    enum: ['checking', 'savings'],
    default: 'checking'
  },

  currency: {
    type: String,
    default: 'USD'
  },

  // International
  swiftCode: String,
  iban: String,
  bicCode: String,

  // Country specific
  country: {
    type: String,
    required: true,
    default: 'US'
  },

  // For Canadian accounts
  transitNumber: String,
  institutionNumber: String,

  // For UK accounts
  sortCode: String,

  // For Australian accounts
  bsbCode: String,

  // For Indian accounts
  ifscCode: String,

  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  verificationMethod: {
    type: String,
    enum: ['micro_deposit', 'instant', 'manual', 'plaid']
  },
  verificationData: {
    attempts: { type: Number, default: 0 },
    lastAttemptAt: Date,
    depositAmounts: [Number],
    verifiedAmounts: [Number]
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'rejected'],
    default: 'pending'
  },

  // Default
  isDefault: {
    type: Boolean,
    default: false
  },

  // Stripe integration
  stripeBankAccountId: String,
  stripeCustomerId: String,

  // Plaid integration
  plaidAccountId: String,
  plaidItemId: String,

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
bankAccountSchema.index({ userId: 1, isDefault: 1 });
bankAccountSchema.index({ stripeBankAccountId: 1 });
bankAccountSchema.index({ plaidAccountId: 1 });
bankAccountSchema.index({ status: 1 });

// ==================== PRE-SAVE MIDDLEWARE ====================
bankAccountSchema.pre('save', async function(next) {
  this.updatedAt = Date.now();
  
  // Generate account ID if not exists
  if (!this.accountId) {
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    this.accountId = `BA-${random}`;
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

// Masked account number (virtual, not stored)
bankAccountSchema.virtual('maskedAccountNumber').get(function() {
  const accountNumber = this.accountNumberEncrypted;
  if (!accountNumber) return '';
  const last4 = accountNumber.slice(-4);
  return `****${last4}`;
});

// Masked routing number
bankAccountSchema.virtual('maskedRoutingNumber').get(function() {
  const routingNumber = this.routingNumberEncrypted;
  if (!routingNumber) return '';
  const last4 = routingNumber.slice(-4);
  return `****${last4}`;
});

// Full display name
bankAccountSchema.virtual('displayName').get(function() {
  return `${this.bankName} (${this.maskedAccountNumber})`;
});

// ==================== METHODS ====================

/**
 * Verify account with micro-deposits
 * @param {Array} amounts - Deposit amounts
 * @returns {Promise}
 */
bankAccountSchema.methods.verifyWithAmounts = async function(amounts) {
  if (!this.verificationData) {
    this.verificationData = { attempts: 0, depositAmounts: [] };
  }

  const sortedAttempt = amounts.sort().join(',');
  const sortedActual = this.verificationData.depositAmounts.sort().join(',');

  if (sortedAttempt === sortedActual) {
    this.isVerified = true;
    this.verifiedAt = new Date();
    this.verificationMethod = 'micro_deposit';
    this.status = 'active';
  } else {
    this.verificationData.attempts += 1;
    this.verificationData.lastAttemptAt = new Date();
  }

  await this.save();
};

/**
 * Set deposit amounts for verification
 * @param {Array} amounts - Deposit amounts
 * @returns {Promise}
 */
bankAccountSchema.methods.setDepositAmounts = async function(amounts) {
  if (!this.verificationData) {
    this.verificationData = {};
  }
  this.verificationData.depositAmounts = amounts;
  await this.save();
};

/**
 * Mark as verified (instant verification)
 * @param {string} method - Verification method
 * @returns {Promise}
 */
bankAccountSchema.methods.markAsVerified = async function(method = 'instant') {
  this.isVerified = true;
  this.verifiedAt = new Date();
  this.verificationMethod = method;
  this.status = 'active';
  await this.save();
};

/**
 * Mark as rejected
 * @param {string} reason - Rejection reason
 * @returns {Promise}
 */
bankAccountSchema.methods.reject = async function(reason) {
  this.status = 'rejected';
  this.metadata = this.metadata || new Map();
  this.metadata.set('rejectionReason', reason);
  await this.save();
};

/**
 * Get decrypted account number
 * @returns {string}
 */
bankAccountSchema.methods.getAccountNumber = function() {
  return this.accountNumberEncrypted;
};

/**
 * Get decrypted routing number
 * @returns {string}
 */
bankAccountSchema.methods.getRoutingNumber = function() {
  return this.routingNumberEncrypted;
};

/**
 * Check if can be used for payouts
 * @returns {boolean}
 */
bankAccountSchema.methods.canUseForPayout = function() {
  return this.status === 'active' && this.isVerified;
};

// ==================== STATIC METHODS ====================

/**
 * Get user's default bank account
 * @param {string} userId - User ID
 * @returns {Query}
 */
bankAccountSchema.statics.getDefault = function(userId) {
  return this.findOne({ userId, isDefault: true, status: 'active' });
};

/**
 * Get user's verified bank accounts
 * @param {string} userId - User ID
 * @returns {Query}
 */
bankAccountSchema.statics.getVerified = function(userId) {
  return this.find({ 
    userId, 
    isVerified: true, 
    status: 'active' 
  }).sort({ isDefault: -1, createdAt: -1 });
};

/**
 * Get accounts pending verification
 * @returns {Query}
 */
bankAccountSchema.statics.getPendingVerification = function() {
  return this.find({ 
    isVerified: false, 
    status: 'pending',
    'verificationData.depositAmounts': { $exists: true }
  }).populate('userId', 'fullName email');
};

/**
 * Set default account
 * @param {string} accountId - Account ID
 * @param {string} userId - User ID
 * @returns {Promise}
 */
bankAccountSchema.statics.setDefault = async function(accountId, userId) {
  // Remove default from all
  await this.updateMany(
    { userId },
    { $set: { isDefault: false } }
  );

  // Set new default
  return this.findByIdAndUpdate(
    accountId,
    { $set: { isDefault: true } },
    { new: true }
  );
};

/**
 * Get stats
 * @returns {Promise}
 */
bankAccountSchema.statics.getStats = async function() {
  const [total, verified, pending, active] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ isVerified: true }),
    this.countDocuments({ status: 'pending' }),
    this.countDocuments({ status: 'active' })
  ]);

  return {
    total,
    verified,
    pending,
    active
  };
};

const BankAccount = mongoose.model('BankAccount', bankAccountSchema);

module.exports = BankAccount;