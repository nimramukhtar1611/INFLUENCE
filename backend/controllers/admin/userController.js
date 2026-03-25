// controllers/admin/userController.js - COMPLETE
const User = require('../../models/User');
const Brand = require('../../models/Brand');
const Creator = require('../../models/Creator');
const Campaign = require('../../models/Campaign');
const Deal = require('../../models/Deal');
const Payment = require('../../models/Payment');
const AuditLog = require('../../models/AuditLog');
const asyncHandler = require('express-async-handler');
const { sendEmail } = require('../../services/emailService');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    search, 
    userType, 
    status, 
    verified,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const query = {};

  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  if (userType) query.userType = userType;
  if (status) query.status = status;
  if (verified !== undefined) query.isVerified = verified === 'true';

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password -refreshToken -resetPasswordToken -emailVerificationToken -twoFactorSecret')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean(),
    User.countDocuments(query)
  ]);

  // Get additional stats for each user
  const usersWithStats = await Promise.all(users.map(async (user) => {
    let stats = {};
    
    if (user.userType === 'brand') {
      const brand = await Brand.findById(user._id).lean();
      stats = {
        campaigns: brand?.stats?.totalCampaigns || 0,
        spent: brand?.stats?.totalSpent || 0,
        creators: brand?.stats?.totalCreators || 0
      };
    } else if (user.userType === 'creator') {
      const creator = await Creator.findById(user._id).lean();
      stats = {
        earnings: creator?.stats?.totalEarnings || 0,
        campaigns: creator?.stats?.completedCampaigns || 0,
        followers: creator?.totalFollowers || 0,
        engagement: creator?.averageEngagement || 0
      };
    }

    return {
      ...user,
      stats
    };
  }));

  res.json({
    success: true,
    data: usersWithStats,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password -refreshToken -resetPasswordToken -emailVerificationToken');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  let profile = null;
  let activity = {};

  if (user.userType === 'brand') {
    profile = await Brand.findById(user._id)
      .populate('teamMembers.userId', 'fullName email profilePicture')
      .lean();
    
    const [campaigns, deals] = await Promise.all([
      Campaign.find({ brandId: user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Deal.find({ brandId: user._id })
        .populate('creatorId', 'displayName handle')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    activity = { campaigns, deals };
  } else if (user.userType === 'creator') {
    profile = await Creator.findById(user._id).lean();
    
    const deals = await Deal.find({ creatorId: user._id })
      .populate('brandId', 'brandName')
      .populate('campaignId', 'title')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    activity = { deals };
  }

  res.json({
    success: true,
    data: {
      ...user.toObject(),
      profile,
      activity
    }
  });
});

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const { 
    fullName, 
    phone, 
    status, 
    isVerified,
    notes,
    role,
    permissions 
  } = req.body;

  const changes = {};

  if (fullName) {
    changes.fullName = fullName;
    user.fullName = fullName;
  }
  if (phone) {
    changes.phone = phone;
    user.phone = phone;
  }
  if (status) {
    changes.status = status;
    user.status = status;
  }
  if (isVerified !== undefined) {
    changes.isVerified = isVerified;
    user.isVerified = isVerified;
    if (isVerified) {
      user.verifiedAt = new Date();
      changes.verifiedAt = user.verifiedAt;
    }
  }

  // Add admin notes
  if (notes) {
    if (!user.adminNotes) user.adminNotes = [];
    user.adminNotes.push({
      content: notes,
      adminId: req.user._id,
      createdAt: new Date()
    });
  }

  await user.save();

  // Log the action
  await AuditLog.create({
    adminId: req.user._id,
    action: 'user_updated',
    targetUser: user._id,
    changes,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  // If verification status changed, send email
  if (isVerified !== undefined && isVerified !== user.isVerified) {
    await sendEmail({
      email: user.email,
      subject: isVerified ? 'Account Verified - InfluenceX' : 'Account Verification Update',
      html: `
        <h2>Account ${isVerified ? 'Verified' : 'Update'}</h2>
        <p>Hi ${user.fullName},</p>
        <p>Your account has been ${isVerified ? 'verified' : 'updated'}. You can now access all features.</p>
        ${notes ? `<p><strong>Admin Note:</strong> ${notes}</p>` : ''}
      `
    });
  }

  res.json({
    success: true,
    message: 'User updated successfully',
    data: user
  });
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Log before deletion
  await AuditLog.create({
    adminId: req.user._id,
    action: 'user_deleted',
    targetUser: user._id,
    metadata: {
      email: user.email,
      userType: user.userType,
      fullName: user.fullName
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Delete in parallel
  await Promise.all([
    user.userType === 'brand' ? Brand.findByIdAndDelete(user._id) : Creator.findByIdAndDelete(user._id),
    Campaign.deleteMany({ brandId: user._id }),
    Deal.deleteMany({ 
      $or: [
        { brandId: user._id },
        { creatorId: user._id }
      ]
    }),
    Payment.deleteMany({ 
      $or: [
        { 'from.userId': user._id },
        { 'to.userId': user._id }
      ]
    }),
    user.deleteOne()
  ]);

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

// @desc    Verify user
// @route   POST /api/admin/users/:id/verify
// @access  Private/Admin
const verifyUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.isVerified = true;
  user.verifiedAt = Date.now();
  user.status = 'active';
  await user.save();

  // Log the action
  await AuditLog.create({
    adminId: req.user._id,
    action: 'user_verified',
    targetUser: user._id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Send verification email
  await sendEmail({
    email: user.email,
    subject: 'Account Verified - InfluenceX',
    html: `
      <h2>Account Verified!</h2>
      <p>Hi ${user.fullName},</p>
      <p>Your account has been verified successfully! You can now access all features of InfluenceX.</p>
    `
  });

  res.json({
    success: true,
    message: 'User verified successfully'
  });
});

// @desc    Suspend user
// @route   POST /api/admin/users/:id/suspend
// @access  Private/Admin
const suspendUser = asyncHandler(async (req, res) => {
  const { reason, duration } = req.body;
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.status = 'suspended';
  user.suspendedAt = Date.now();
  user.suspensionReason = reason;
  user.suspensionDuration = duration;
  await user.save();

  // Log the action
  await AuditLog.create({
    adminId: req.user._id,
    action: 'user_suspended',
    targetUser: user._id,
    reason,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Send suspension email
  await sendEmail({
    email: user.email,
    subject: 'Account Suspended - InfluenceX',
    html: `
      <h2>Account Suspended</h2>
      <p>Hi ${user.fullName},</p>
      <p>Your account has been suspended.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      ${duration ? `<p><strong>Duration:</strong> ${duration} days</p>` : ''}
      <p>If you believe this is a mistake, please contact support.</p>
    `
  });

  res.json({
    success: true,
    message: 'User suspended successfully'
  });
});

// @desc    Activate user
// @route   POST /api/admin/users/:id/activate
// @access  Private/Admin
const activateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.status = 'active';
  user.suspendedAt = undefined;
  user.suspensionReason = undefined;
  user.suspensionDuration = undefined;
  await user.save();

  // Log the action
  await AuditLog.create({
    adminId: req.user._id,
    action: 'user_activated',
    targetUser: user._id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.json({
    success: true,
    message: 'User activated successfully'
  });
});

// @desc    Get user stats
// @route   GET /api/admin/users/stats
// @access  Private/Admin
const getUserStats = asyncHandler(async (req, res) => {
  const [total, active, pending, suspended, brands, creators, verified] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: 'active' }),
    User.countDocuments({ status: 'pending' }),
    User.countDocuments({ status: 'suspended' }),
    User.countDocuments({ userType: 'brand' }),
    User.countDocuments({ userType: 'creator' }),
    User.countDocuments({ isVerified: true })
  ]);

  // Growth over last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const growth = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: thirtyDaysAgo }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);

  res.json({
    success: true,
    data: {
      total,
      active,
      pending,
      suspended,
      brands,
      creators,
      verified,
      verificationRate: total > 0 ? (verified / total) * 100 : 0,
      growth
    }
  });
});

module.exports = {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  verifyUser,
  suspendUser,
  activateUser,
  getUserStats
};