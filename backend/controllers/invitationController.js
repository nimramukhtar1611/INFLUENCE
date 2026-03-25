const Invitation = require('../models/Invitation');
const User = require('../models/User');
const Brand = require('../models/Brand');
const crypto = require('crypto');
const { sendEmail } = require('../services/emailService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// Create invitation
const createInvitation = catchAsync(async (req, res) => {
  const { email, role, permissions } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    // Check if already a team member
    const brand = await Brand.findById(req.user._id);
    const isMember = brand.teamMembers.some(
      member => member.userId.toString() === existingUser._id.toString()
    );

    if (isMember) {
      throw new AppError('User is already a team member', 400);
    }
  }

  // Check for existing pending invitation
  const existingInvitation = await Invitation.findOne({
    email,
    brandId: req.user._id,
    status: 'pending'
  });

  if (existingInvitation) {
    throw new AppError('Invitation already sent to this email', 400);
  }

  // Generate token
  const token = crypto.randomBytes(32).toString('hex');

  // Create invitation
  const invitation = await Invitation.create({
    email,
    brandId: req.user._id,
    invitedBy: req.user._id,
    role,
    permissions,
    token
  });

  // Send invitation email
  const inviteUrl = `${process.env.FRONTEND_URL}/accept-invite?token=${token}`;
  
  await sendEmail({
    email,
    subject: `Join ${req.user.brandName} on InfluenceX`,
    template: 'teamInvitation',
    data: {
      brandName: req.user.brandName,
      inviterName: req.user.fullName,
      role,
      inviteUrl,
      expiresIn: '7 days'
    }
  });

  res.status(201).json({
    success: true,
    data: invitation
  });
});

// Get brand invitations
const getBrandInvitations = catchAsync(async (req, res) => {
  const invitations = await Invitation.find({
    brandId: req.user._id
  })
    .populate('invitedBy', 'fullName email')
    .sort('-createdAt');

  res.json({
    success: true,
    data: invitations
  });
});

// Accept invitation
const acceptInvitation = catchAsync(async (req, res) => {
  const { token } = req.body;

  const invitation = await Invitation.findOne({
    token,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  });

  if (!invitation) {
    throw new AppError('Invalid or expired invitation', 400);
  }

  // Check if user exists
  let user = await User.findOne({ email: invitation.email });

  if (!user) {
    // User will need to register first
    return res.json({
      success: true,
      requiresRegistration: true,
      email: invitation.email,
      token: invitation.token
    });
  }

  // Add user to brand team
  const brand = await Brand.findById(invitation.brandId);
  
  brand.teamMembers.push({
    userId: user._id,
    role: invitation.role,
    permissions: invitation.permissions,
    joinedAt: new Date()
  });

  await brand.save();

  // Update invitation
  invitation.status = 'accepted';
  invitation.acceptedAt = new Date();
  await invitation.save();

  res.json({
    success: true,
    message: 'Invitation accepted successfully'
  });
});

// Cancel invitation
const cancelInvitation = catchAsync(async (req, res) => {
  const invitation = await Invitation.findById(req.params.id);

  if (!invitation) {
    throw new AppError('Invitation not found', 404);
  }

  if (invitation.brandId.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized', 403);
  }

  invitation.status = 'cancelled';
  await invitation.save();

  res.json({
    success: true,
    message: 'Invitation cancelled'
  });
});

// Resend invitation
const resendInvitation = catchAsync(async (req, res) => {
  const invitation = await Invitation.findById(req.params.id)
    .populate('brandId', 'brandName')
    .populate('invitedBy', 'fullName');

  if (!invitation) {
    throw new AppError('Invitation not found', 404);
  }

  if (invitation.brandId._id.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized', 403);
  }

  if (invitation.status !== 'pending') {
    throw new AppError('Invitation is no longer pending', 400);
  }

  if (invitation.expiresAt < new Date()) {
    // Generate new token and expiry
    invitation.token = crypto.randomBytes(32).toString('hex');
    invitation.expiresAt = new Date(+new Date() + 7*24*60*60*1000);
    await invitation.save();
  }

  // Resend email
  const inviteUrl = `${process.env.FRONTEND_URL}/accept-invite?token=${invitation.token}`;
  
  await sendEmail({
    email: invitation.email,
    subject: `Reminder: Join ${invitation.brandId.brandName} on InfluenceX`,
    template: 'teamInvitation',
    data: {
      brandName: invitation.brandId.brandName,
      inviterName: invitation.invitedBy.fullName,
      role: invitation.role,
      inviteUrl,
      expiresIn: '7 days'
    }
  });

  res.json({
    success: true,
    message: 'Invitation resent'
  });
});

module.exports = {
  createInvitation,
  getBrandInvitations,
  acceptInvitation,
  cancelInvitation,
  resendInvitation
};