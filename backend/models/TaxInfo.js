// models/TaxInfo.js - COMPLETE
const mongoose = require('mongoose');

const taxInfoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },

  userType: {
    type: String,
    enum: ['brand', 'creator'],
    required: true
  },

  // Taxpayer identification
  taxId: {
    type: String,
    sparse: true,
    index: true
  },
  taxIdType: {
    type: String,
    enum: ['ssn', 'ein', 'vat', 'gst', 'pan', 'other']
  },

  // Business information
  businessName: String,
  businessType: {
    type: String,
    enum: [
      'individual',
      'sole_proprietor',
      'llc',
      'corporation',
      'partnership',
      'non_profit',
      'other'
    ]
  },

  // Personal information (for individuals)
  personalInfo: {
    firstName: String,
    lastName: String,
    dateOfBirth: Date,
    nationality: String
  },

  // Address
  address: {
    line1: {
      type: String,
      required: true
    },
    line2: String,
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    postalCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true,
      default: 'US'
    }
  },

  // Tax residency
  taxResidency: {
    country: {
      type: String,
      default: 'US'
    },
    states: [String]
  },

  // W-9 / W-8BEN information (US)
  w9Info: {
    hasW9: { type: Boolean, default: false },
    w9File: String,
    w9Verified: { type: Boolean, default: false },
    w9VerifiedAt: Date,
    w9ExpiresAt: Date
  },

  w8benInfo: {
    hasW8ben: { type: Boolean, default: false },
    w8benFile: String,
    w8benVerified: { type: Boolean, default: false },
    w8benExpiresAt: Date,
    treatyCountry: String,
    treatyRate: Number,
    treatyArticle: String
  },

  // VAT information (EU)
  vatInfo: {
    vatNumber: String,
    vatCountry: String,
    vatRate: Number,
    vatRegistered: { type: Boolean, default: false },
    vatCertificate: String,
    vatVerified: { type: Boolean, default: false }
  },

  // GST information (India, Australia, Canada)
  gstInfo: {
    gstNumber: String,
    gstState: String,
    gstType: {
      type: String,
      enum: ['cgst', 'sgst', 'igst', 'other']
    },
    gstCertificate: String,
    gstVerified: { type: Boolean, default: false }
  },

  // Other tax information
  otherTaxInfo: [{
    country: String,
    taxNumber: String,
    taxType: String,
    certificate: String,
    verified: { type: Boolean, default: false }
  }],

  // Stripe Tax ID
  stripeTaxId: String,

  // Verification status
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'expired'],
    default: 'pending'
  },
  verifiedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: String,

  // Expiry
  expiresAt: Date,

  // Documents
  documents: [{
    type: {
      type: String,
      enum: ['tax_certificate', 'id_proof', 'address_proof', 'other']
    },
    url: String,
    filename: String,
    uploadedAt: { type: Date, default: Date.now },
    verified: { type: Boolean, default: false }
  }],

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
  timestamps: true
});

// ==================== INDEXES ====================
taxInfoSchema.index({ userId: 1 }, { unique: true });
taxInfoSchema.index({ taxId: 1 });
taxInfoSchema.index({ verificationStatus: 1 });
taxInfoSchema.index({ 'w9Info.w9Verified': 1 });
taxInfoSchema.index({ expiresAt: 1 });

// ==================== PRE-SAVE MIDDLEWARE ====================
taxInfoSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Set expiry (W-9 is valid for 3 years)
  if (this.w9Info?.w9Verified && !this.expiresAt) {
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 3);
    this.expiresAt = expiry;
  }

  next();
});

// ==================== METHODS ====================

/**
 * Verify tax information
 * @param {string} verifiedBy - Admin user ID
 * @returns {Promise}
 */
taxInfoSchema.methods.verify = async function(verifiedBy) {
  this.verificationStatus = 'verified';
  this.verifiedAt = new Date();
  this.verifiedBy = verifiedBy;
  
  if (this.w9Info?.hasW9) {
    this.w9Info.w9Verified = true;
    this.w9Info.w9VerifiedAt = new Date();
  }
  
  if (this.w8benInfo?.hasW8ben) {
    this.w8benInfo.w8benVerified = true;
  }
  
  if (this.vatInfo?.vatNumber) {
    this.vatInfo.vatVerified = true;
  }
  
  await this.save();
};

/**
 * Reject tax information
 * @param {string} reason - Rejection reason
 * @param {string} rejectedBy - Admin user ID
 * @returns {Promise}
 */
taxInfoSchema.methods.reject = async function(reason, rejectedBy) {
  this.verificationStatus = 'rejected';
  this.rejectionReason = reason;
  this.verifiedBy = rejectedBy;
  await this.save();
};

/**
 * Add document
 * @param {Object} documentData - Document data
 * @returns {Promise}
 */
taxInfoSchema.methods.addDocument = async function(documentData) {
  this.documents.push({
    ...documentData,
    uploadedAt: new Date()
  });
  await this.save();
};

/**
 * Verify document
 * @param {string} documentId - Document ID
 * @returns {Promise}
 */
taxInfoSchema.methods.verifyDocument = async function(documentId) {
  const document = this.documents.id(documentId);
  if (document) {
    document.verified = true;
    await this.save();
  }
};

/**
 * Check if tax info is valid
 * @returns {boolean}
 */
taxInfoSchema.methods.isValid = function() {
  return this.verificationStatus === 'verified' && 
         (!this.expiresAt || new Date() < this.expiresAt);
};

/**
 * Check if tax info is expiring soon
 * @param {number} days - Days threshold
 * @returns {boolean}
 */
taxInfoSchema.methods.isExpiringSoon = function(days = 30) {
  if (!this.expiresAt) return false;
  const daysUntilExpiry = Math.ceil((this.expiresAt - new Date()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry <= days;
};

/**
 * Get formatted tax ID
 * @returns {string}
 */
taxInfoSchema.methods.getFormattedTaxId = function() {
  if (!this.taxId) return '';
  
  if (this.taxIdType === 'ssn') {
    // Format as XXX-XX-XXXX
    return this.taxId.replace(/(\d{3})(\d{2})(\d{4})/, '$1-$2-$3');
  } else if (this.taxIdType === 'ein') {
    // Format as XX-XXXXXXX
    return this.taxId.replace(/(\d{2})(\d{7})/, '$1-$2');
  }
  
  return this.taxId;
};

/**
 * Get masked tax ID
 * @returns {string}
 */
taxInfoSchema.methods.getMaskedTaxId = function() {
  if (!this.taxId) return '';
  
  const taxId = this.taxId;
  if (taxId.length <= 4) return '****';
  
  const last4 = taxId.slice(-4);
  return `****${last4}`;
};

// ==================== STATIC METHODS ====================

/**
 * Get pending verifications
 * @returns {Query}
 */
taxInfoSchema.statics.getPendingVerifications = function() {
  return this.find({ verificationStatus: 'pending' })
    .populate('userId', 'fullName email')
    .sort({ createdAt: 1 });
};

/**
 * Get expiring tax info
 * @param {number} days - Days threshold
 * @returns {Query}
 */
taxInfoSchema.statics.getExpiring = function(days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    verificationStatus: 'verified',
    expiresAt: { $lte: futureDate, $gt: new Date() }
  }).populate('userId', 'fullName email');
};

/**
 * Get expired tax info
 * @returns {Query}
 */
taxInfoSchema.statics.getExpired = function() {
  return this.find({
    verificationStatus: 'verified',
    expiresAt: { $lt: new Date() }
  }).populate('userId', 'fullName email');
};

/**
 * Get stats
 * @returns {Promise}
 */
taxInfoSchema.statics.getStats = async function() {
  const [total, verified, pending, rejected, expired] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ verificationStatus: 'verified' }),
    this.countDocuments({ verificationStatus: 'pending' }),
    this.countDocuments({ verificationStatus: 'rejected' }),
    this.countDocuments({
      verificationStatus: 'verified',
      expiresAt: { $lt: new Date() }
    })
  ]);

  return {
    total,
    verified,
    pending,
    rejected,
    expired
  };
};

const TaxInfo = mongoose.model('TaxInfo', taxInfoSchema);

module.exports = TaxInfo;