// controllers/userController.js - FIXED IMPORTS
const User = require('../models/User');
const Brand = require('../models/Brand');
const Creator = require('../models/Creator');
const asyncHandler = require('express-async-handler');
const { sendEmail } = require('../services/emailService'); // CHANGE THIS

// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, userType, status } = req.query;

  const query = {};

  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  if (userType) query.userType = userType;
  if (status) query.status = status;

  const users = await User.find(query)
    .select('-password -refreshToken -resetPasswordToken -emailVerificationToken')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const total = await User.countDocuments(query);

  res.json({
    success: true,
    users,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    total
  });
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password -refreshToken -resetPasswordToken -emailVerificationToken');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Get specific profile based on user type
  let profile = null;
  if (user.userType === 'brand') {
    profile = await Brand.findById(user._id);
  } else if (user.userType === 'creator') {
    profile = await Creator.findById(user._id);
  }

  res.json({
    success: true,
    user: {
      ...user.toObject(),
      profile
    }
  });
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const { fullName, phone, status, isVerified, userType, ...otherData } = req.body;

  // Update common fields
  if (fullName) user.fullName = fullName;
  if (phone) user.phone = phone;
  if (status) user.status = status;
  if (isVerified !== undefined) user.isVerified = isVerified;

  await user.save();

  // Update specific profile
  if (user.userType === 'brand' && otherData.brandData) {
    await Brand.findByIdAndUpdate(user._id, { $set: otherData.brandData });
  } else if (user.userType === 'creator' && otherData.creatorData) {
    await Creator.findByIdAndUpdate(user._id, { $set: otherData.creatorData });
  }

  res.json({
    success: true,
    message: 'User updated successfully'
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Delete specific profile
  if (user.userType === 'brand') {
    await Brand.findByIdAndDelete(user._id);
  } else if (user.userType === 'creator') {
    await Creator.findByIdAndDelete(user._id);
  }

  await user.remove();

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

// @desc    Verify user
// @route   POST /api/users/:id/verify
// @access  Private/Admin
const verifyUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.isVerified = true;
  user.verifiedAt = Date.now();
  await user.save();

  // Send verification email
  await sendEmail({
    email: user.email,
    subject: 'Account Verified - InfluenceX',
    template: 'accountVerified',
    data: {
      name: user.fullName
    }
  });

  res.json({
    success: true,
    message: 'User verified successfully'
  });
});

// @desc    Suspend user
// @route   POST /api/users/:id/suspend
// @access  Private/Admin
const suspendUser = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.status = 'suspended';
  await user.save();

  // Send suspension email
  await sendEmail({
    email: user.email,
    subject: 'Account Suspended - InfluenceX',
    template: 'accountSuspended',
    data: {
      name: user.fullName,
      reason
    }
  });

  res.json({
    success: true,
    message: 'User suspended successfully'
  });
});

// @desc    Activate user
// @route   POST /api/users/:id/activate
// @access  Private/Admin
const activateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.status = 'active';
  await user.save();

  res.json({
    success: true,
    message: 'User activated successfully'
  });
});

// @desc    Get user stats
// @route   GET /api/users/stats
// @access  Private/Admin
const getUserStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ status: 'active' });
  const pendingUsers = await User.countDocuments({ status: 'pending' });
  const suspendedUsers = await User.countDocuments({ status: 'suspended' });
  
  const brandCount = await User.countDocuments({ userType: 'brand' });
  const creatorCount = await User.countDocuments({ userType: 'creator' });
  
  const verifiedUsers = await User.countDocuments({ isVerified: true });
  
  const recentUsers = await User.find()
    .select('fullName email userType createdAt')
    .sort({ createdAt: -1 })
    .limit(10);

  res.json({
    success: true,
    stats: {
      total: totalUsers,
      active: activeUsers,
      pending: pendingUsers,
      suspended: suspendedUsers,
      brands: brandCount,
      creators: creatorCount,
      verified: verifiedUsers,
      recent: recentUsers
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