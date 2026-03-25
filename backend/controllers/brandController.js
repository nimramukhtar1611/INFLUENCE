// controllers/brandController.js - COMPLETE PRODUCTION-READY VERSION
const Brand = require('../models/Brand');
const User = require('../models/User');
const Creator = require('../models/Creator');
const Campaign = require('../models/Campaign');
const Deal = require('../models/Deal');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const Invitation = require('../models/Invitation');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { catchAsync } = require('../utils/catchAsync');

// ==================== PROFILE MANAGEMENT ====================

exports.getProfile = catchAsync(async (req, res) => {
  const brand = await Brand.findById(req.user._id)
    .select('-password -refreshToken')
    .populate('teamMembers.userId', 'fullName email profilePicture')
    .populate('teamMembers.invitedBy', 'fullName email')
    .populate('teamInvitations.invitedBy', 'fullName email');

  if (!brand) {
    return res.status(404).json({ success: false, error: 'Brand profile not found' });
  }

  res.json({ success: true, brand });
});

/**
 * @desc    Update brand profile
 * @route   PUT /api/brands/profile
 * @access  Private/Brand
 */
exports.updateProfile = async (req, res) => {
  try {
    const allowedUpdates = ['brandName', 'industry', 'website', 'description', 'founded', 'employees', 'address', 'socialMedia', 'preferences'];
    const updateData = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }
    const brand = await Brand.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

  if (!brand) {
    return res.status(404).json({ success: false, error: 'Brand not found' });
  }

   } catch (error) {
        return res.status(500).json({ success: false, error: 'error occured ' });

   }
};

// ==================== DASHBOARD ====================

/**
 * @desc    Get brand dashboard data
 * @route   GET /api/brands/dashboard
 * @access  Private/Brand
 */
exports.getDashboard = catchAsync(async (req, res) => {
  const brandId = req.user._id;

  const [campaigns, deals, payments, recentActivity] = await Promise.all([
    Campaign.find({ brandId }).sort('-createdAt').limit(5).select('title status budget spent progress'),
    Deal.find({ brandId })
      .populate('creatorId', 'displayName profilePicture')
      .populate('campaignId', 'title')
      .sort('-createdAt')
      .limit(5),
    Payment.find({ 'from.userId': brandId }).sort('-createdAt').limit(5),
    getRecentActivity(brandId),
  ]);

  const stats = {
    totalCampaigns: await Campaign.countDocuments({ brandId }),
    activeCampaigns: await Campaign.countDocuments({ brandId, status: 'active' }),
    totalDeals: await Deal.countDocuments({ brandId }),
    pendingDeals: await Deal.countDocuments({ brandId, status: 'pending' }),
    activeTeamMembers: (await Brand.findById(brandId).select('teamMembers'))?.teamMembers?.filter(m => m.status === 'active').length || 0,
  };

  res.json({
    success: true,
    campaigns,
    deals,
    payments,
    recentActivity,
    stats,
  });
});

// Helper to get recent activity for dashboard
async function getRecentActivity(brandId) {
  const activities = [];

  // Campaign updates
  const campaigns = await Campaign.find({ brandId })
    .sort('-updatedAt')
    .limit(3)
    .select('title status updatedAt');
  campaigns.forEach(c => {
    activities.push({
      type: 'campaign',
      action: c.status === 'active' ? 'published' : 'updated',
      title: c.title,
      timestamp: c.updatedAt,
    });
  });

  // Deal updates
  const deals = await Deal.find({ brandId })
    .populate('creatorId', 'displayName')
    .sort('-updatedAt')
    .limit(3);
  deals.forEach(d => {
    activities.push({
      type: 'deal',
      action: d.status,
      title: `Deal with ${d.creatorId?.displayName || 'Creator'}`,
      timestamp: d.updatedAt,
    });
  });

  return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
}

// ==================== ANALYTICS ====================

/**
 * @desc    Get brand analytics
 * @route   GET /api/brands/analytics
 * @access  Private/Brand
 */
exports.getAnalytics = catchAsync(async (req, res) => {
  const { period = '30d' } = req.query;
  const brandId = req.user._id;

  let startDate = new Date();
  switch (period) {
    case '7d': startDate.setDate(startDate.getDate() - 7); break;
    case '30d': startDate.setDate(startDate.getDate() - 30); break;
    case '90d': startDate.setDate(startDate.getDate() - 90); break;
    case '12m': startDate.setFullYear(startDate.getFullYear() - 1); break;
    default: startDate.setDate(startDate.getDate() - 30);
  }

  const [campaignPerformance, platformDistribution, topCreators, summary] = await Promise.all([
    Campaign.aggregate([
      { $match: { brandId, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } },
          campaigns: { $sum: 1 },
          spent: { $sum: '$spent' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]),
    Deal.aggregate([
      { $match: { brandId } },
      { $unwind: '$deliverables' },
      {
        $group: {
          _id: '$deliverables.platform',
          count: { $sum: 1 },
          spend: { $sum: '$deliverables.budget' },
        },
      },
    ]),
    Deal.aggregate([
      { $match: { brandId, status: 'completed' } },
      {
        $group: {
          _id: '$creatorId',
          deals: { $sum: 1 },
          totalSpent: { $sum: '$budget' },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'creators',
          localField: '_id',
          foreignField: '_id',
          as: 'creator',
        },
      },
      { $unwind: '$creator' },
    ]),
    {
      totalCampaigns: await Campaign.countDocuments({ brandId }),
      activeCampaigns: await Campaign.countDocuments({ brandId, status: 'active' }),
      totalDeals: await Deal.countDocuments({ brandId }),
      completedDeals: await Deal.countDocuments({ brandId, status: 'completed' }),
      totalSpent: await Deal.aggregate([
        { $match: { brandId, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$budget' } } },
      ]).then(r => r[0]?.total || 0),
      avgROI: 0, // placeholder; can be calculated from deals with metrics
    },
  ]);

  res.json({
    success: true,
    analytics: {
      campaignPerformance,
      platformDistribution,
      topCreators,
      summary,
    },
  });
});

// ==================== CREATOR SEARCH ====================

/**
 * @desc    Search creators
 * @route   GET /api/brands/creators/search
 * @access  Private/Brand
 */
exports.searchCreators = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    niche,
    minFollowers,
    maxFollowers,
    minEngagement,
    platform,
    location,
    verified,
    available,
    q,
    sort = 'relevance',
  } = req.query;

  const query = { userType: 'creator', status: 'active' };

  // Text search
  if (q) {
    query.$or = [
      { displayName: { $regex: q, $options: 'i' } },
      { handle: { $regex: q, $options: 'i' } },
      { bio: { $regex: q, $options: 'i' } },
    ];
  }

  // Niche filter
  if (niche) query.niches = { $in: [niche] };

  // Follower range
  if (minFollowers || maxFollowers) {
    query.totalFollowers = {};
    if (minFollowers) query.totalFollowers.$gte = parseInt(minFollowers);
    if (maxFollowers) query.totalFollowers.$lte = parseInt(maxFollowers);
  }

  // Engagement
  if (minEngagement) query.averageEngagement = { $gte: parseFloat(minEngagement) };

  // Platform
  if (platform) query[`socialMedia.${platform}.handle`] = { $exists: true };

  // Location
  if (location) query.location = { $regex: location, $options: 'i' };

  // Verification
  if (verified === 'true') query.isVerified = true;

  // Availability
  if (available === 'true') query['availability.status'] = 'available';

  // Sorting
  let sortOption = {};
  switch (sort) {
    case 'followers_desc': sortOption = { totalFollowers: -1 }; break;
    case 'followers_asc': sortOption = { totalFollowers: 1 }; break;
    case 'engagement_desc': sortOption = { averageEngagement: -1 }; break;
    case 'rating_desc': sortOption = { 'stats.averageRating': -1 }; break;
    case 'newest': sortOption = { createdAt: -1 }; break;
    default: sortOption = { totalFollowers: -1 };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Creator.countDocuments(query);
  const creators = await Creator.find(query)
    .select('displayName handle profilePicture niches totalFollowers averageEngagement stats location socialMedia')
    .sort(sortOption)
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  res.json({
    success: true,
    creators,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * @desc    Get creator details by ID
 * @route   GET /api/brands/creators/:id
 * @access  Private/Brand
 */
exports.getCreatorById = catchAsync(async (req, res) => {
  const creator = await Creator.findById(req.params.id)
    .select('-paymentMethods -stripeAccountId -payoutSettings -twoFactorSecret')
    .lean();

  if (!creator) {
    return res.status(404).json({ success: false, error: 'Creator not found' });
  }

  // Get recent deals with this creator
  const recentDeals = await Deal.find({ creatorId: creator._id, status: 'completed' })
    .populate('campaignId', 'title')
    .sort('-completedAt')
    .limit(5)
    .lean();

  res.json({
    success: true,
    creator: { ...creator, recentDeals },
  });
});

// ==================== TEAM MANAGEMENT ====================

/**
 * @desc    Get team members
 * @route   GET /api/brands/team
 * @access  Private/Brand
 */
exports.getTeamMembers = catchAsync(async (req, res) => {
  const brand = await Brand.findById(req.user._id)
    .populate('teamMembers.userId', 'fullName email profilePicture lastActive')
    .populate('teamMembers.invitedBy', 'fullName email');

  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  const activeMembers = brand.teamMembers.filter(m => m.status !== 'removed');
  res.json({ success: true, teamMembers: activeMembers });
});

/**
 * @desc    Get single team member details
 * @route   GET /api/brands/team/:memberId
 * @access  Private/Brand
 */
exports.getTeamMemberDetails = catchAsync(async (req, res) => {
  const brand = await Brand.findById(req.user._id);
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  const member = brand.teamMembers.id(req.params.memberId);
  if (!member) return res.status(404).json({ success: false, error: 'Team member not found' });

  await member.populate('userId', 'fullName email profilePicture phone lastActive createdAt');
  await member.populate('invitedBy', 'fullName email');

  const [campaigns, deals, totalCampaigns, totalDeals] = await Promise.all([
    Campaign.find({ brandId: req.user._id, createdBy: member.userId._id }).sort('-createdAt').limit(5),
    Deal.find({ brandId: req.user._id, createdBy: member.userId._id }).sort('-createdAt').limit(5),
    Campaign.countDocuments({ brandId: req.user._id, createdBy: member.userId._id }),
    Deal.countDocuments({ brandId: req.user._id, createdBy: member.userId._id }),
  ]);

  res.json({
    success: true,
    member,
    activity: { campaigns, deals, totalCampaigns, totalDeals },
  });
});

/**
 * @desc    Add team member (invite existing user)
 * @route   POST /api/brands/team
 * @access  Private/Brand
 */
exports.addTeamMember = catchAsync(async (req, res) => {
  const { email, role = 'member', permissions = [] } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }

  const brand = await Brand.findById(req.user._id);
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  // Check if user exists
  let user = await User.findOne({ email });
  if (user) {
    // Check if already a member
    const existingMember = brand.teamMembers.find(
      m => m.userId?.toString() === user._id.toString() && m.status !== 'removed'
    );
    if (existingMember) {
      return res.status(400).json({ success: false, error: 'User is already a team member' });
    }

    // Add member
    brand.teamMembers.push({
      userId: user._id,
      role,
      permissions,
      invitedBy: req.user._id,
      invitedAt: new Date(),
      status: 'pending',
    });
    await brand.save();

    // Notify user
    await Notification.create({
      userId: user._id,
      type: 'team',
      title: 'Added to Team',
      message: `You have been added to ${brand.brandName}'s team as ${role}`,
      data: { brandId: brand._id },
    });
  } else {
    // Send invitation to non-existing user
    const token = crypto.randomBytes(32).toString('hex');
    const invitation = {
      email,
      role,
      permissions,
      invitedBy: req.user._id,
      invitedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      token,
      status: 'pending',
    };
    brand.teamInvitations.push(invitation);
    await brand.save();

    // TODO: Send invitation email
  }

  await brand.populate('teamMembers.userId', 'fullName email profilePicture');

  res.json({
    success: true,
    message: user ? 'Team member added' : 'Invitation sent',
    teamMembers: brand.teamMembers,
  });
});

/**
 * @desc    Update team member role
 * @route   PUT /api/brands/team/:memberId/role
 * @access  Private/Brand
 */
exports.updateTeamMemberRole = catchAsync(async (req, res) => {
  const { memberId } = req.params;
  const { role } = req.body;

  const brand = await Brand.findById(req.user._id);
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  const member = brand.teamMembers.id(memberId);
  if (!member) return res.status(404).json({ success: false, error: 'Team member not found' });

  member.role = role;
  await brand.save();

  res.json({ success: true, message: 'Role updated', member });
});

/**
 * @desc    Update team member permissions
 * @route   PUT /api/brands/team/:memberId/permissions
 * @access  Private/Brand
 */
exports.updateTeamMemberPermissions = catchAsync(async (req, res) => {
  const { memberId } = req.params;
  const { permissions } = req.body;

  if (!Array.isArray(permissions)) {
    return res.status(400).json({ success: false, error: 'Permissions must be an array' });
  }

  const brand = await Brand.findById(req.user._id);
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  const member = brand.teamMembers.id(memberId);
  if (!member) return res.status(404).json({ success: false, error: 'Team member not found' });

  member.permissions = permissions;
  await brand.save();

  res.json({ success: true, message: 'Permissions updated', member });
});

/**
 * @desc    Remove team member
 * @route   DELETE /api/brands/team/:memberId
 * @access  Private/Brand
 */
exports.removeTeamMember = catchAsync(async (req, res) => {
  const { memberId } = req.params;

  const brand = await Brand.findById(req.user._id);
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  const memberIndex = brand.teamMembers.findIndex(m => m._id.toString() === memberId);
  if (memberIndex === -1) return res.status(404).json({ success: false, error: 'Team member not found' });

  brand.teamMembers.splice(memberIndex, 1);
  await brand.save();

  res.json({ success: true, message: 'Team member removed' });
});

// ==================== TEAM INVITATIONS ====================

/**
 * @desc    Get pending invitations
 * @route   GET /api/brands/team/invitations
 * @access  Private/Brand
 */
exports.getInvitations = catchAsync(async (req, res) => {
  const brand = await Brand.findById(req.user._id);
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  const pending = brand.teamInvitations.filter(i => i.status === 'pending');
  res.json({ success: true, invitations: pending });
});

/**
 * @desc    Send invitation (alias for addTeamMember)
 * @route   POST /api/brands/team/invitations
 * @access  Private/Brand
 */
exports.sendInvitation = exports.addTeamMember;

/**
 * @desc    Resend invitation
 * @route   POST /api/brands/team/invitations/:invitationId/resend
 * @access  Private/Brand
 */
exports.resendInvitation = catchAsync(async (req, res) => {
  const { invitationId } = req.params;

  const brand = await Brand.findById(req.user._id);
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  const invitation = brand.teamInvitations.id(invitationId);
  if (!invitation) return res.status(404).json({ success: false, error: 'Invitation not found' });

  if (invitation.status !== 'pending') {
    return res.status(400).json({ success: false, error: 'Invitation is no longer pending' });
  }

  // Regenerate token and expiry
  invitation.token = crypto.randomBytes(32).toString('hex');
  invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  invitation.resentAt = new Date();
  await brand.save();

  // TODO: Resend email

  res.json({ success: true, message: 'Invitation resent' });
});

/**
 * @desc    Cancel invitation
 * @route   DELETE /api/brands/team/invitations/:invitationId
 * @access  Private/Brand
 */
exports.cancelInvitation = catchAsync(async (req, res) => {
  const { invitationId } = req.params;

  const brand = await Brand.findById(req.user._id);
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  const invitation = brand.teamInvitations.id(invitationId);
  if (!invitation) return res.status(404).json({ success: false, error: 'Invitation not found' });

  invitation.status = 'cancelled';
  await brand.save();

  res.json({ success: true, message: 'Invitation cancelled' });
});

/**
 * @desc    Accept invitation (public route)
 * @route   POST /api/brands/team/invitations/accept
 * @access  Public
 */
exports.acceptInvitation = catchAsync(async (req, res) => {
  const { token, userId } = req.body;

  const brand = await Brand.findOne({ 'teamInvitations.token': token });
  if (!brand) return res.status(404).json({ success: false, error: 'Invalid invitation token' });

  const invitation = brand.teamInvitations.find(i => i.token === token);
  if (!invitation || invitation.status !== 'pending') {
    return res.status(400).json({ success: false, error: 'Invitation not valid' });
  }

  if (new Date() > invitation.expiresAt) {
    invitation.status = 'expired';
    await brand.save();
    return res.status(400).json({ success: false, error: 'Invitation expired' });
  }

  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    return res.status(400).json({ success: false, error: 'User not found' });
  }

  // Add as team member
  brand.teamMembers.push({
    userId: user._id,
    role: invitation.role,
    permissions: invitation.permissions,
    invitedBy: invitation.invitedBy,
    invitedAt: invitation.invitedAt,
    joinedAt: new Date(),
    status: 'active',
  });
  invitation.status = 'accepted';
  await brand.save();

  res.json({ success: true, message: 'Invitation accepted' });
});

// ==================== PAYMENT METHODS ====================

/**
 * @desc    Get payment methods
 * @route   GET /api/brands/payment-methods
 * @access  Private/Brand
 */
exports.getPaymentMethods = catchAsync(async (req, res) => {
  const brand = await Brand.findById(req.user._id).select('paymentMethods');
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  res.json({ success: true, paymentMethods: brand.paymentMethods || [] });
});

/**
 * @desc    Add payment method
 * @route   POST /api/brands/payment-methods
 * @access  Private/Brand
 */
exports.addPaymentMethod = catchAsync(async (req, res) => {
  const brand = await Brand.findById(req.user._id);
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  const newMethod = {
    _id: new mongoose.Types.ObjectId(),
    ...req.body,
    isDefault: false,
    createdAt: new Date(),
  };

  brand.paymentMethods.push(newMethod);
  await brand.save();

  res.json({ success: true, paymentMethods: brand.paymentMethods });
});

/**
 * @desc    Set default payment method
 * @route   PUT /api/brands/payment-methods/:methodId/default
 * @access  Private/Brand
 */
exports.setDefaultPaymentMethod = catchAsync(async (req, res) => {
  const { methodId } = req.params;

  const brand = await Brand.findById(req.user._id);
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  // Reset default flag on all methods
  brand.paymentMethods.forEach(m => (m.isDefault = false));

  const method = brand.paymentMethods.id(methodId);
  if (!method) return res.status(404).json({ success: false, error: 'Payment method not found' });

  method.isDefault = true;
  await brand.save();

  res.json({ success: true, paymentMethods: brand.paymentMethods });
});

/**
 * @desc    Delete payment method
 * @route   DELETE /api/brands/payment-methods/:methodId
 * @access  Private/Brand
 */
exports.deletePaymentMethod = catchAsync(async (req, res) => {
  const { methodId } = req.params;

  const brand = await Brand.findById(req.user._id);
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  brand.paymentMethods = brand.paymentMethods.filter(m => m._id.toString() !== methodId);
  await brand.save();

  res.json({ success: true, paymentMethods: brand.paymentMethods });
});

// ==================== INVOICES ====================

/**
 * @desc    Get invoices
 * @route   GET /api/brands/invoices
 * @access  Private/Brand
 */
exports.getInvoices = catchAsync(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const payments = await Payment.find({ 'from.userId': req.user._id })
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .populate('dealId', 'title')
    .lean();

  const total = await Payment.countDocuments({ 'from.userId': req.user._id });

  res.json({
    success: true,
    invoices: payments,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// ==================== TAX INFO ====================

/**
 * @desc    Get tax information
 * @route   GET /api/brands/tax-info
 * @access  Private/Brand
 */
exports.getTaxInfo = catchAsync(async (req, res) => {
  const brand = await Brand.findById(req.user._id).select('taxInfo businessType taxId');
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  res.json({
    success: true,
    taxInfo: brand.taxInfo || {},
    businessType: brand.businessType,
    taxId: brand.taxId,
  });
});

/**
 * @desc    Update tax information
 * @route   PUT /api/brands/tax-info
 * @access  Private/Brand
 */
exports.updateTaxInfo = catchAsync(async (req, res) => {
  const { taxId, businessType, taxInfo } = req.body;

  const brand = await Brand.findById(req.user._id);
  if (!brand) return res.status(404).json({ success: false, error: 'Brand not found' });

  if (taxId !== undefined) brand.taxId = taxId;
  if (businessType !== undefined) brand.businessType = businessType;
  if (taxInfo !== undefined) brand.taxInfo = { ...brand.taxInfo, ...taxInfo };

  await brand.save();

  res.json({
    success: true,
    message: 'Tax information updated',
    taxId: brand.taxId,
    businessType: brand.businessType,
    taxInfo: brand.taxInfo,
  });
});