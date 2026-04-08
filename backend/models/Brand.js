// models/Brand.js - COMPLETE FIXED VERSION WITH PERMISSIONS
const mongoose = require('mongoose');
const User = require('./User');

const brandSchema = new mongoose.Schema({
  brandName: {
    type: String,
    required: [true, 'Brand name is required'],
    trim: true,
    minlength: [2, 'Brand name must be at least 2 characters'],
    maxlength: [100, 'Brand name cannot exceed 100 characters']
  },
  
  industry: {
    type: String,
    required: [true, 'Industry is required'],
    enum: {
      values: ['Fashion', 'Beauty', 'Technology', 'Food & Beverage', 'Fitness', 
               'Travel', 'Gaming', 'Lifestyle', 'Parenting', 'Finance', 
               'Education', 'Entertainment', 'Sports', 'Automotive', 'Real Estate', 
               'Health', 'Wellness', 'Other'],
      message: '{VALUE} is not a valid industry'
    },
    default: 'Other',
    index: true
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
  
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  
  founded: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^\d{4}$/.test(v);
      },
      message: 'Founded year must be a valid 4-digit year'
    }
  },
  
  employees: {
    type: String,
    enum: {
      values: ['1-10', '11-50', '51-200', '201-500', '500+'],
      message: '{VALUE} is not a valid employee range'
    }
  },
  
  companySize: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '500+'],
    default: '1-10'
  },
  
  businessType: {
    type: String,
    enum: {
      values: ['individual', 'sole_proprietor', 'llc', 'corporation', 'non_profit', 'partnership'],
      message: '{VALUE} is not a valid business type'
    },
    default: 'individual'
  },
  
  taxId: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^[A-Z0-9-]+$/.test(v);
      },
      message: 'Please enter a valid tax ID'
    }
  },
  
  logo: String,
  coverImage: String,
  
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    zipCode: { 
      type: String,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^[A-Z0-9-]+$/.test(v);
        },
        message: 'Please enter a valid ZIP code'
      }
    }
  },
  
  billingAddress: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    zipCode: { type: String }
  },
  
  socialMedia: {
    instagram: {
      type: String,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^@?[a-zA-Z0-9._]{1,30}$/.test(v.replace('@', ''));
        },
        message: 'Please enter a valid Instagram handle'
      }
    },
    twitter: {
      type: String,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^@?[a-zA-Z0-9_]{1,15}$/.test(v.replace('@', ''));
        },
        message: 'Please enter a valid Twitter handle'
      }
    },
    facebook: String,
    linkedin: String,
    youtube: String,
    tiktok: String
  },
  
  paymentMethods: [{
    type: {
      type: String,
      enum: ['credit_card', 'bank_account', 'paypal']
    },
    isDefault: { type: Boolean, default: false },
    last4: String,
    brand: String,
    expiry: String,
    bankName: String,
    accountNumber: String,
    routingNumber: String,
    paypalEmail: {
      type: String,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: 'Please enter a valid PayPal email'
      }
    }
  }],
  
  // ==================== ENHANCED TEAM MEMBERS WITH PERMISSIONS ====================
  teamMembers: [{
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true 
    },
    role: { 
      type: String, 
      enum: ['admin', 'manager', 'member', 'viewer'],
      default: 'member'
    },
    permissions: [{
      type: String,
      enum: [
        'view_campaigns',
        'create_campaigns',
        'edit_campaigns',
        'delete_campaigns',
        'view_deals',
        'create_deals',
        'edit_deals',
        'approve_deals',
        'view_payments',
        'process_payments',
        'view_analytics',
        'manage_team',
        'manage_settings',
        'view_creators',
        'invite_creators',
        'contact_creators'
      ]
    }],
    invitedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    invitedAt: { 
      type: Date, 
      default: Date.now 
    },
    joinedAt: Date,
    lastActive: Date,
    status: {
      type: String,
      enum: ['pending', 'active', 'inactive', 'removed'],
      default: 'pending'
    },
    notes: String
  }],

  // Team invitations (for tracking)
  teamInvitations: [{
    email: String,
    role: String,
    permissions: [String],
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    invitedAt: { type: Date, default: Date.now },
    expiresAt: Date,
    token: String,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired', 'cancelled'],
      default: 'pending'
    }
  }],

  preferences: {
    minFollowers: Number,
    maxFollowers: Number,
    minEngagement: Number,
    autoApprove: { type: Boolean, default: false },
    aiCounterEnabled: { type: Boolean, default: false },
    notificationPreferences: {
      newApplications: { type: Boolean, default: true },
      dealUpdates: { type: Boolean, default: true },
      paymentAlerts: { type: Boolean, default: true },
      teamActivity: { type: Boolean, default: true },
      marketingEmails: { type: Boolean, default: false }
    }
  },
  
  notifications: {
    newApplications: { type: Boolean, default: true },
    dealUpdates: { type: Boolean, default: true },
    paymentAlerts: { type: Boolean, default: true },
    marketingEmails: { type: Boolean, default: false }
  },

  // Verification fields
  verifiedAt: Date,
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: String,
  moderationNotes: String,

  // Stats with validation
  stats: {
    totalCampaigns: { 
      type: Number, 
      default: 0,
      min: [0, 'Total campaigns cannot be negative']
    },
    activeCampaigns: { 
      type: Number, 
      default: 0,
      min: [0, 'Active campaigns cannot be negative']
    },
    totalSpent: { 
      type: Number, 
      default: 0,
      min: [0, 'Total spent cannot be negative']
    },
    averageROI: { 
      type: Number, 
      default: 0 
    },
    totalCreators: { 
      type: Number, 
      default: 0,
      min: [0, 'Total creators cannot be negative']
    },
    averageRating: { 
      type: Number, 
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5']
    }
  }
}, {
  timestamps: true
});

// ==================== INDEXES ====================
brandSchema.index({ brandName: 1 });
brandSchema.index({ industry: 1, 'stats.totalSpent': -1 });
brandSchema.index({ isVerified: 1, status: 1 });
brandSchema.index({ 'teamMembers.userId': 1 });
brandSchema.index({ 'teamMembers.status': 1 });
brandSchema.index({ 'teamInvitations.email': 1 });
brandSchema.index({ 'teamInvitations.token': 1 });

// ==================== VIRTUAL PROPERTIES ====================
brandSchema.virtual('isVerified').get(function() {
  return !!this.verifiedAt;
});

brandSchema.virtual('activeTeamMembers').get(function() {
  return this.teamMembers.filter(m => m.status === 'active');
});

// ==================== METHODS ====================

/**
 * Add team member with permissions
 */
brandSchema.methods.addTeamMember = async function(userId, role, permissions, invitedBy) {
  // Check if already a member
  const existingMember = this.teamMembers.find(
    m => m.userId.toString() === userId.toString()
  );

  if (existingMember) {
    throw new Error('User is already a team member');
  }

  // Get permissions based on role if not specified
  if (!permissions || permissions.length === 0) {
    permissions = this.getDefaultPermissionsForRole(role);
  }

  this.teamMembers.push({
    userId,
    role,
    permissions,
    invitedBy,
    invitedAt: new Date(),
    status: 'pending'
  });

  await this.save();
  return this;
};

/**
 * Update team member permissions
 */
brandSchema.methods.updateTeamMemberPermissions = async function(memberId, updates) {
  const member = this.teamMembers.id(memberId);
  
  if (!member) {
    throw new Error('Team member not found');
  }

  if (updates.role) member.role = updates.role;
  if (updates.permissions) member.permissions = updates.permissions;
  if (updates.status) member.status = updates.status;

  member.lastActive = new Date();
  await this.save();
  return member;
};

/**
 * Remove team member
 */
brandSchema.methods.removeTeamMember = async function(memberId) {
  const member = this.teamMembers.id(memberId);
  
  if (!member) {
    throw new Error('Team member not found');
  }

  member.status = 'removed';
  await this.save();
  return true;
};

/**
 * Check if user has permission
 */
brandSchema.methods.userHasPermission = function(userId, permission) {
  const member = this.teamMembers.find(
    m => m.userId.toString() === userId.toString() && m.status === 'active'
  );

  if (!member) return false;
  
  // Admin has all permissions
  if (member.role === 'admin') return true;
  
  return member.permissions.includes(permission);
};

/**
 * Get default permissions for role
 */
brandSchema.methods.getDefaultPermissionsForRole = function(role) {
  const permissions = {
    admin: [
      'view_campaigns', 'create_campaigns', 'edit_campaigns', 'delete_campaigns',
      'view_deals', 'create_deals', 'edit_deals', 'approve_deals',
      'view_payments', 'process_payments', 'view_analytics', 'manage_team',
      'manage_settings', 'view_creators', 'invite_creators', 'contact_creators'
    ],
    manager: [
      'view_campaigns', 'create_campaigns', 'edit_campaigns',
      'view_deals', 'create_deals', 'edit_deals', 'approve_deals',
      'view_payments', 'view_analytics', 'view_creators', 'invite_creators', 'contact_creators'
    ],
    member: [
      'view_campaigns', 'create_campaigns', 'edit_campaigns',
      'view_deals', 'create_deals', 'view_payments', 'view_creators', 'contact_creators'
    ],
    viewer: [
      'view_campaigns', 'view_deals', 'view_payments', 'view_analytics', 'view_creators'
    ]
  };

  return permissions[role] || [];
};

/**
 * Create team invitation
 */
brandSchema.methods.createInvitation = async function(email, role, permissions, invitedBy) {
  const token = require('crypto').randomBytes(32).toString('hex');
  
  const invitation = {
    email,
    role,
    permissions: permissions || this.getDefaultPermissionsForRole(role),
    invitedBy,
    invitedAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    token,
    status: 'pending'
  };

  this.teamInvitations.push(invitation);
  await this.save();

  return { ...invitation, token };
};

/**
 * Accept invitation
 */
brandSchema.methods.acceptInvitation = async function(token, userId) {
  const invitation = this.teamInvitations.find(inv => inv.token === token);
  
  if (!invitation) {
    throw new Error('Invalid invitation token');
  }

  if (invitation.status !== 'pending') {
    throw new Error('Invitation already used');
  }

  if (new Date() > invitation.expiresAt) {
    invitation.status = 'expired';
    await this.save();
    throw new Error('Invitation expired');
  }

  // Add as team member
  await this.addTeamMember(
    userId,
    invitation.role,
    invitation.permissions,
    invitation.invitedBy
  );

  invitation.status = 'accepted';
  await this.save();

  return true;
};

/**
 * Cancel invitation
 */
brandSchema.methods.cancelInvitation = async function(invitationId) {
  const invitation = this.teamInvitations.id(invitationId);
  
  if (!invitation) {
    throw new Error('Invitation not found');
  }

  invitation.status = 'cancelled';
  await this.save();

  return true;
};

/**
 * Get team activity log
 */
brandSchema.methods.getTeamActivityLog = async function(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const activities = [];

  // Get recent campaigns created by team members
  const Campaign = mongoose.model('Campaign');
  const campaigns = await Campaign.find({
    brandId: this._id,
    createdAt: { $gte: since }
  }).populate('createdBy', 'fullName email');

  campaigns.forEach(c => {
    activities.push({
      type: 'campaign_created',
      user: c.createdBy,
      description: `Created campaign "${c.title}"`,
      date: c.createdAt
    });
  });

  // Get recent deals
  const Deal = mongoose.model('Deal');
  const deals = await Deal.find({
    brandId: this._id,
    createdAt: { $gte: since }
  }).populate('createdBy', 'fullName email');

  deals.forEach(d => {
    activities.push({
      type: 'deal_created',
      user: d.createdBy,
      description: `Created deal for campaign`,
      date: d.createdAt
    });
  });

  // Sort by date
  return activities.sort((a, b) => b.date - a.date);
};

brandSchema.methods.incrementCampaignCount = function() {
  this.stats.totalCampaigns += 1;
  return this.save();
};

brandSchema.methods.addSpent = function(amount) {
  if (amount > 0) {
    this.stats.totalSpent += amount;
  }
  return this.save();
};

brandSchema.methods.updateRating = async function() {
  const Deal = require('./Deal');
  const deals = await Deal.find({ 
    brandId: this._id,
    'rating.score': { $exists: true }
  });
  
  if (deals.length > 0) {
    const totalRating = deals.reduce((sum, d) => sum + (d.rating?.score || 0), 0);
    this.stats.averageRating = totalRating / deals.length;
  }
  
  return this.save();
};

const Brand = User.discriminator('brand', brandSchema);
module.exports = Brand;