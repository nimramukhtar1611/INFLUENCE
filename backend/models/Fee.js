// models/Fee.js
const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'platform_commission',
      'transaction_fee',
      'withdrawal_fee',
      'subscription_fee',
      'feature_fee',
      'penalty_fee'
    ],
    required: true
  },
  name: String,
  description: String,
  
  // Fee calculation
  calculationType: {
    type: String,
    enum: ['percentage', 'fixed', 'tiered', 'mixed'],
    required: true
  },
  
  // For percentage fees
  percentage: Number,
  
  // For fixed fees
  fixedAmount: Number,
  currency: { type: String, default: 'USD' },
  
  // For tiered fees
  tiers: [{
    minAmount: Number,
    maxAmount: Number,
    percentage: Number,
    fixedAmount: Number
  }],
  
  // Minimum and maximum
  minFee: Number,
  maxFee: Number,
  
  // Who pays
  payerType: {
    type: String,
    enum: ['brand', 'creator', 'both', 'platform'],
    default: 'brand'
  },
  splitRatio: {
    brand: { type: Number, default: 100 }, // Percentage
    creator: { type: Number, default: 0 }
  },

  // Applicability
  applicableTo: [{
    type: String,
    enum: ['all_deals', 'subscriptions', 'withdrawals', 'specific_deals']
  }],
  
  // Conditions
  conditions: {
    minDealAmount: Number,
    maxDealAmount: Number,
    userTiers: [String],
    platforms: [String],
    categories: [String]
  },

  // Active status
  isActive: {
    type: Boolean,
    default: true
  },
  effectiveFrom: Date,
  effectiveTo: Date,

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

module.exports = mongoose.model('Fee', feeSchema);