// models/Contract.js
const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
  dealId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal',
    required: true,
    unique: true
  },
  contractNumber: {
    type: String,
    required: true,
    unique: true
  },
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Creator',
    required: true
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'signed', 'expired', 'cancelled'],
    default: 'draft'
  },
  content: {
    type: String,
    required: true
  },
  terms: [{
    title: String,
    description: String,
    type: {
      type: String,
      enum: ['deliverable', 'payment', 'rights', 'deadline', 'other']
    }
  }],
  deliverables: [{
    description: String,
    quantity: Number,
    deadline: Date,
    requirements: String
  }],
  paymentTerms: {
    total: Number,
    platformFee: Number,
    netAmount: Number,
    schedule: [{
      milestone: String,
      amount: Number,
      dueDate: Date,
      status: { type: String, enum: ['pending', 'paid'] }
    }],
    escrowRequired: { type: Boolean, default: true }
  },
  rightsAndOwnership: {
    contentRights: String,
    usageRights: String,
    exclusivity: String,
    duration: String,
    territory: String
  },
  confidentiality: {
    required: { type: Boolean, default: true },
    terms: String,
    duration: String
  },
  cancellationTerms: {
    allowed: { type: Boolean, default: true },
    noticePeriod: String,
    penalty: String
  },
  signatures: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userType: { type: String, enum: ['brand', 'creator'] },
    signature: String,
    ipAddress: String,
    userAgent: String,
    signedAt: Date
  }],
  signedByBrand: { type: Boolean, default: false },
  signedByCreator: { type: Boolean, default: false },
  signedAt: Date,
  expiresAt: Date,
  pdfUrl: String,
  version: {
    type: Number,
    default: 1
  },
  metadata: mongoose.Schema.Types.Mixed,
  createdBy: {
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

// Generate contract number before save
contractSchema.pre('save', async function(next) {
  if (!this.contractNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.contractNumber = `CT-${year}-${random}`;
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Contract', contractSchema);