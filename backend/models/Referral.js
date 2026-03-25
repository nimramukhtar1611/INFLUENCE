// server/models/Referral.js
const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  referral_id: {
    type: String,
    unique: true,
    required: true
  },
  referrer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  referrer_type: {
    type: String,
    enum: ['brand', 'creator', 'agency'],
    required: true
  },
  referral_code: {
    type: String,
    unique: true,
    required: true
  },
  referral_link: {
    type: String,
    required: true
  },
  referred_email: {
    type: String,
    required: [true, 'Referred email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  referred_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  referred_user_type: {
    type: String,
    enum: ['brand', 'creator', null],
    default: null
  },
  status: {
    type: String,
    enum: [
      'pending',      // Email sent but not signed up
      'clicked',      // Clicked referral link
      'converted',    // Signed up but no action
      'active',       // Completed first action (campaign/deal)
      'paid',         // Commission paid
      'expired',      // Link expired
      'fraud'         // Marked as fraudulent
    ],
    default: 'pending'
  },
  referral_tier: {
    type: String,
    enum: ['tier_1', 'tier_2', 'tier_3'],
    default: 'tier_1'
  },
  commission_structure: {
    type: {
      type: String,
      enum: ['percentage', 'fixed', 'hybrid']
    },
    rate: Number, // Percentage or fixed amount
    tiers: [{
      level: Number,
      threshold: Number, // Minimum revenue
      rate: Number
    }]
  },
  commissions: [{
    level: {
      type: Number,
      default: 1
    }, // 1 for direct, 2 for second level
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    },
    source_type: {
      type: String,
      enum: ['subscription', 'deal', 'featured_listing']
    },
    source_id: mongoose.Schema.Types.ObjectId,
    source_details: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'cancelled'],
      default: 'pending'
    },
    approved_at: Date,
    paid_at: Date,
    transaction_id: String
  }],
  total_earned: {
    type: Number,
    default: 0
  },
  pending_earnings: {
    type: Number,
    default: 0
  },
  paid_earnings: {
    type: Number,
    default: 0
  },
  referral_stats: {
    clicks: {
      type: Number,
      default: 0
    },
    signups: {
      type: Number,
      default: 0
    },
    conversions: {
      type: Number,
      default: 0
    },
    click_details: [{
      ip: String,
      user_agent: String,
      timestamp: Date,
      converted: Boolean
    }]
  },
  milestones: [{
    name: String,
    threshold: Number,
    achieved: Boolean,
    achieved_at: Date,
    bonus_amount: Number,
    paid: Boolean
  }],
  referred_users: [{
    user_id: mongoose.Schema.Types.ObjectId,
    level: Number,
    joined_at: Date,
    status: String
  }],
  expiry_date: {
    type: Date,
    default: () => new Date(+new Date() + 90*24*60*60*1000) // 90 days
  },
  terms_accepted: {
    type: Boolean,
    default: false
  },
  accepted_at: Date,
  ip_address: String,
  user_agent: String,
  fraud_check: {
    flagged: {
      type: Boolean,
      default: false
    },
    reason: String,
    checked_at: Date
  },
  notes: String,
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
referralSchema.pre('save', function(next) {
  if (!this.referral_id) {
    this.referral_id = `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  if (!this.referral_code) {
    // Generate unique referral code
    this.referral_code = `${this.referrer_id.toString().slice(-6)}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }
  
  if (!this.referral_link) {
    this.referral_link = `https://influencex.com/ref/${this.referral_code}`;
  }
  
  this.updated_at = Date.now();
  next();
});

// Methods
referralSchema.methods.recordClick = function(ip, userAgent) {
  this.referral_stats.clicks += 1;
  this.referral_stats.click_details.push({
    ip,
    user_agent: userAgent,
    timestamp: new Date()
  });
  return this.save();
};

referralSchema.methods.markConverted = function(userId, userType) {
  this.referred_user_id = userId;
  this.referred_user_type = userType;
  this.status = 'converted';
  this.referral_stats.signups += 1;
  
  this.referred_users.push({
    user_id: userId,
    level: 1,
    joined_at: new Date(),
    status: 'converted'
  });
  
  return this.save();
};

referralSchema.methods.addCommission = function(commissionData) {
  this.commissions.push({
    ...commissionData,
    status: 'pending'
  });
  
  this.pending_earnings += commissionData.amount;
  this.total_earned += commissionData.amount;
  
  return this.save();
};

referralSchema.methods.approveCommission = function(commissionId) {
  const commission = this.commissions.id(commissionId);
  if (commission) {
    commission.status = 'approved';
    commission.approved_at = new Date();
    
    // Update earnings
    this.pending_earnings -= commission.amount;
    // Paid earnings will update when actually paid
  }
  return this.save();
};

referralSchema.methods.markCommissionPaid = function(commissionId, transactionId) {
  const commission = this.commissions.id(commissionId);
  if (commission) {
    commission.status = 'paid';
    commission.paid_at = new Date();
    commission.transaction_id = transactionId;
    
    this.paid_earnings += commission.amount;
  }
  return this.save();
};

referralSchema.methods.checkMilestones = function() {
  const milestones = [
    {
      name: 'First Referral',
      threshold: 1,
      bonus: 50
    },
    {
      name: '5 Referrals',
      threshold: 5,
      bonus: 100
    },
    {
      name: '10 Referrals',
      threshold: 10,
      bonus: 250
    },
    {
      name: '50 Referrals',
      threshold: 50,
      bonus: 1000
    }
  ];
  
  const conversions = this.referral_stats.conversions;
  
  milestones.forEach(milestone => {
    if (conversions >= milestone.threshold) {
      const existing = this.milestones.find(m => m.name === milestone.name);
      if (!existing) {
        this.milestones.push({
          name: milestone.name,
          threshold: milestone.threshold,
          achieved: true,
          achieved_at: new Date(),
          bonus_amount: milestone.bonus,
          paid: false
        });
        
        // Add bonus commission
        this.addCommission({
          amount: milestone.bonus,
          source_type: 'bonus',
          source_details: { milestone: milestone.name }
        });
      }
    }
  });
  
  return this.save();
};

// Static methods
referralSchema.statics.getReferrerStats = function(referrerId) {
  return this.aggregate([
    { $match: { referrer_id: referrerId } },
    {
      $group: {
        _id: null,
        total_referrals: { $sum: 1 },
        conversions: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        total_earned: { $sum: '$total_earned' },
        pending_earnings: { $sum: '$pending_earnings' },
        paid_earnings: { $sum: '$paid_earnings' }
      }
    }
  ]);
};

referralSchema.statics.getTopReferrers = function(limit = 10) {
  return this.aggregate([
    { $match: { status: { $ne: 'fraud' } } },
    {
      $group: {
        _id: '$referrer_id',
        total_referrals: { $sum: 1 },
        conversions: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        total_earned: { $sum: '$total_earned' }
      }
    },
    { $sort: { total_earned: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'referrer'
      }
    }
  ]);
};

// Indexes
referralSchema.index({ referrer_id: 1, status: 1 });
referralSchema.index({ referral_code: 1 }, { unique: true });
referralSchema.index({ referred_email: 1 });
referralSchema.index({ referred_user_id: 1 });
referralSchema.index({ status: 1 });
referralSchema.index({ created_at: -1 });
referralSchema.index({ expiry_date: 1 });
referralSchema.index({ 'commissions.status': 1 });

const Referral = mongoose.model('Referral', referralSchema);
module.exports = Referral;