// controllers/authController.js - COMPLETE PRODUCTION-READY VERSION
const User = require('../models/User');
const Brand = require('../models/Brand');
const Creator = require('../models/Creator');
const Admin = require('../models/Admin');
const TempOTP = require('../models/TempOTP');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('../services/emailService');
const smsService = require('../services/SMSService');
const { setTwoFASession, getTwoFASession, incrementAttempts, resetAttempts, MAX_ATTEMPTS } = require('../utils/twoFASessionStore');
const { generateToken, generateRefreshToken, hashToken } = require('../utils/jwtUtils');
const { isValidEmail, isValidPhone, isValidPassword } = require('../utils/validators');
const { catchAsync } = require('../utils/catchAsync');

// ==================== HELPER FUNCTIONS ====================

/**
 * Generate JWT tokens for user
 */
const generateTokenPair = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, userType: user.userType, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user._id, version: user.tokenVersion || 1 },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );

  return { accessToken, refreshToken };
};

/**
 * Normalize user response (remove sensitive fields)
 */
const normalizeUserResponse = (user) => {
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;
  delete userObj.refreshToken;
  delete userObj.resetPasswordToken;
  delete userObj.resetPasswordExpire;
  delete userObj.emailVerificationToken;
  delete userObj.emailVerificationExpire;
  delete userObj.twoFactorSecret;
  delete userObj.twoFactorBackupCodes;
  delete userObj.twoFactorTempSecret;
  delete userObj.twoFactorTempSecretExpires;
  return userObj;
};

// ==================== REGISTER ====================
exports.register = catchAsync(async (req, res) => {
  const sanitizedBodyForLog = {
    ...req.body,
    password: req.body?.password ? '***REDACTED***' : undefined,
    captchaToken: req.body?.captchaToken ? '***REDACTED***' : undefined,
  };
  console.log('📝 Register request body:', JSON.stringify(sanitizedBodyForLog));
  const {
    email,
    password,
    fullName,
    userType,
    phone,
    profilePicture,
    coverPicture,
    brandName,
    industry,
    website,
    displayName,
    handle,
    niches,
  } = req.body;

  // Validate required fields
  if (!email || !password || !fullName || !userType) {
    return res.status(400).json({
      success: false,
      error: 'Email, password, full name, and user type are required',
    });
  }

  // Validate email format
  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email format' });
  }

  // Validate password strength
  if (!isValidPassword(password)) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 8 characters with uppercase, lowercase, and a number',
    });
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, error: 'Email already registered' });
  }

  // Base user data
  const userData = {
    email,
    password,
    fullName,
    userType,
    phone: phone || undefined,
    profilePicture: profilePicture || 'default-profile.jpg',
    coverPicture: coverPicture || 'default-cover.jpg',
    emailVerified: false,
    status: 'pending',
  };

  let user;

  if (userType === 'brand') {
    // Brand-specific validation
    if (!brandName || !industry) {
      return res.status(400).json({
        success: false,
        error: 'Brand name and industry are required for brand accounts',
      });
    }

    user = new Brand({
      ...userData,
      brandName,
      industry,
      website: website || '',
    });
  } else if (userType === 'creator') {
    // Creator-specific validation
    if (!displayName && !fullName) {
      return res.status(400).json({
        success: false,
        error: 'Display name is required for creator accounts',
      });
    }

    user = new Creator({
      ...userData,
      displayName: displayName || fullName,
      handle: handle || email.split('@')[0],
      niches: niches || [],
    });
  } else {
    // Admin accounts should not be created via public registration
    return res.status(400).json({ success: false, error: 'Invalid user type' });
  }

  await user.save();

  // Generate tokens
  const { accessToken, refreshToken } = generateTokenPair(user);

  user.refreshToken = refreshToken;
  await user.save();

  // Send welcome email
  try {
    await emailService.sendWelcomeEmail(user.email, user.fullName);
  } catch (emailError) {
    console.warn('Welcome email failed:', emailError.message);
  }

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    token: accessToken,
    refreshToken,
    user: normalizeUserResponse(user),
  });
});

// ==================== LOGIN ====================
exports.login = catchAsync(async (req, res) => {
  const { email, password, userType, captchaToken } = req.body;

  if (!email || !password || !userType) {
    return res.status(400).json({ success: false, error: 'Email, password, and user type are required' });
  }

  // Find user
  const user = await User.findOne({ email, userType }).select(
    '+password +refreshToken +twoFactorSecret +twoFactorEnabled +twoFactorBackupCodes'
  );

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ success: false, error: 'Invalid email or password' });
  }

  // Check account status
  if (user.status === 'suspended') {
    return res.status(403).json({ success: false, error: 'Account is suspended. Contact support.' });
  }
  if (user.status === 'deleted') {
    return res.status(403).json({ success: false, error: 'Account has been deleted.' });
  }

  // 2FA check
  if (user.twoFactorEnabled) {
    setTwoFASession(user._id);
    return res.status(200).json({
      success: true,
      require2FA: true,
      userId: user._id,
      message: '2FA code required',
      expiresIn: 300,
    });
  }

  // Update last login and reset attempts
  user.lastLogin = new Date();
  user.loginAttempts = 0;
  user.lockUntil = undefined;

  const { accessToken, refreshToken } = generateTokenPair(user);
  user.refreshToken = refreshToken;
  await user.save();

  res.json({
    success: true,
    message: 'Login successful',
    token: accessToken,
    refreshToken,
    user: normalizeUserResponse(user),
  });
});

// ==================== GET ME ====================
exports.getMe = catchAsync(async (req, res) => {
  let user = await User.findById(req.user._id).select('-password -refreshToken');

  // If not found in User (maybe admin), check Admin model
  if (!user) {
    const admin = await Admin.findById(req.user._id).select('-password -twoFactorSecret');
    if (admin) {
      return res.json({
        success: true,
        user: { ...admin.toObject(), userType: 'admin' },
      });
    }
  }

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  res.json({ success: true, user: normalizeUserResponse(user) });
});

// ==================== REFRESH TOKEN ====================
exports.refreshToken = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ success: false, error: 'Refresh token required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }

    // Increment token version to invalidate old refresh tokens
    user.tokenVersion = (user.tokenVersion || 1) + 1;
    const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(user);
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
      success: true,
      token: accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
  }
});

// ==================== LOGOUT ====================
exports.logout = catchAsync(async (req, res) => {
  if (req.user) {
    // Increment token version to invalidate all tokens
    req.user.tokenVersion = (req.user.tokenVersion || 1) + 1;
    req.user.refreshToken = undefined;
    await req.user.save();
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// ==================== FORGOT PASSWORD ====================
exports.forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }

  const user = await User.findOne({ email });

  if (!user) {
    // Don't reveal if user exists for security
    return res.json({
      success: true,
      message: 'If that email exists, a reset link has been sent.',
    });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = hashToken(resetToken);

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save();

  try {
    const emailResult = await emailService.sendPasswordResetEmail(user.email, user.fullName, resetToken);
    if (!emailResult?.success) {
      console.warn('Password reset email not delivered:', {
        to: user.email,
        error: emailResult?.error,
        rejected: emailResult?.rejected,
        pending: emailResult?.pending,
      });
    }
  } catch (emailError) {
    console.warn('Password reset email failed:', emailError.message);
  }

  res.json({
    success: true,
    message: 'If that email exists, a reset link has been sent.',
  });
});

// ==================== RESET PASSWORD ====================
exports.resetPassword = catchAsync(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ success: false, error: 'Token and new password are required' });
  }

  if (!isValidPassword(newPassword)) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 8 characters with uppercase, lowercase, and a number',
    });
  }

  const hashedToken = hashToken(token);
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ success: false, error: 'Invalid or expired token' });
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  // Increment token version to invalidate all sessions
  user.tokenVersion = (user.tokenVersion || 1) + 1;
  await user.save();

  res.json({ success: true, message: 'Password reset successful' });
});

// ==================== VERIFY EMAIL ====================
exports.verifyEmail = catchAsync(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, error: 'Token is required' });
  }

  const hashedToken = hashToken(token);
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ success: false, error: 'Invalid or expired token' });
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save();

  res.json({ success: true, message: 'Email verified successfully' });
});

// ==================== CHANGE PASSWORD ====================
exports.changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Current and new password are required' });
  }

  if (!isValidPassword(newPassword)) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 8 characters with uppercase, lowercase, and a number',
    });
  }

  const user = await User.findById(req.user._id).select('+password');
  const isMatch = await user.matchPassword(currentPassword);

  if (!isMatch) {
    return res.status(401).json({ success: false, error: 'Current password is incorrect' });
  }

  user.password = newPassword;
  // Increment token version to invalidate all sessions
  user.tokenVersion = (user.tokenVersion || 1) + 1;
  // Clear the stored refresh token to force re‑login on all devices
  user.refreshToken = undefined;
  await user.save();

  res.json({ success: true, message: 'Password changed successfully' });
});

// ==================== SEND EMAIL OTP ====================
exports.sendOTP = catchAsync(async (req, res) => {
  const { email } = req.body;
  // Check for existing valid OTP
  const existing = await TempOTP.findOne({ email, expiry: { $gt: new Date() } });
  if (existing) {
    return res.json({ success: true, message: 'OTP already sent, please check your email' });
  }
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await TempOTP.create({ email, otp, expiry: new Date(Date.now() + 10 * 60 * 1000) });

  try {
    await emailService.sendOTP(email, null, otp);
  } catch (emailError) {
    console.warn('OTP email failed:', emailError.message);
  }

  res.json({ success: true, message: 'OTP sent successfully' });
});

// ==================== VERIFY EMAIL OTP ====================
exports.verifyOTP = catchAsync(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, error: 'Email and OTP are required' });
  }

  const otpRecord = await TempOTP.findOne({
    email,
    otp,
    expiry: { $gt: new Date() },
  });

  if (!otpRecord) {
    return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
  }

  await TempOTP.deleteOne({ _id: otpRecord._id });

  res.json({ success: true, message: 'OTP verified successfully' });
});

// ==================== SEND PHONE OTP ====================
exports.sendPhoneOTP = catchAsync(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, error: 'Phone number is required' });
  }

  if (!isValidPhone(phone)) {
    return res.status(400).json({ success: false, error: 'Invalid phone number format' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await TempOTP.create({
    email: phone, // using email field as key for phone
    otp,
    expiry: new Date(Date.now() + 10 * 60 * 1000),
  });

  try {
    await smsService.sendOTP(phone, otp);
  } catch (smsError) {
    console.warn('SMS OTP failed:', smsError.message);
  }

  res.json({ success: true, message: 'OTP sent successfully' });
});

// ==================== VERIFY PHONE OTP ====================
exports.verifyPhoneOTP = catchAsync(async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ success: false, error: 'Phone and OTP are required' });
  }

  const otpRecord = await TempOTP.findOne({
    email: phone,
    otp,
    expiry: { $gt: new Date() },
  });

  if (!otpRecord) {
    return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
  }

  await TempOTP.deleteOne({ _id: otpRecord._id });

  // Update user phone verified if logged in
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, { phoneVerified: true, phone });
  }

  res.json({ success: true, message: 'Phone verified successfully' });
});