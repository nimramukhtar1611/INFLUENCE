// routes/twoFARoutes.js - USER 2FA ONLY - FINAL FIXED
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const TwoFactorService = require('../services/twoFactorService');
const User = require('../models/User');
const { catchAsync } = require('../utils/catchAsync');
const {
  setTwoFASession, getTwoFASession, deleteTwoFASession,
  getAttempts, incrementAttempts, resetAttempts, MAX_ATTEMPTS
} = require('../utils/twoFASessionStore');

const validateToken = [body('token').notEmpty().withMessage('Token is required')];
const validateUserId = [body('userId').isMongoId().withMessage('Invalid user ID')];

// POST /api/auth/2fa/generate
router.post('/generate', protect, catchAsync(async (req, res) => {
  const result = await TwoFactorService.generateSecret(req.user._id, req.user.email);
  if (!result.success) return res.status(400).json({ success: false, error: result.error });
  res.json({ success: true, data: { secret: result.secret, qrCode: result.qrCode, otpauth_url: result.otpauth_url } });
}));

// POST /api/auth/2fa/verify
router.post('/verify', protect, validateToken, catchAsync(async (req, res) => {
  const result = await TwoFactorService.verifyAndEnable(req.user._id, req.body.token);
  if (!result.success) return res.status(400).json({ success: false, error: result.error });
  res.json({ success: true, message: result.message, data: { backupCodes: result.backupCodes } });
}));

// POST /api/auth/2fa/disable
router.post('/disable', protect, validateToken, catchAsync(async (req, res) => {
  const result = await TwoFactorService.disable(req.user._id, req.body.token);
  if (!result.success) return res.status(400).json({ success: false, error: result.error });
  res.json({ success: true, message: result.message });
}));

// POST /api/auth/2fa/regenerate-codes
router.post('/regenerate-codes', protect, validateToken, catchAsync(async (req, res) => {
  const result = await TwoFactorService.regenerateBackupCodes(req.user._id, req.body.token);
  if (!result.success) return res.status(400).json({ success: false, error: result.error });
  res.json({ success: true, data: { backupCodes: result.backupCodes } });
}));

// GET /api/auth/2fa/status
router.get('/status', protect, catchAsync(async (req, res) => {
  const result = await TwoFactorService.getStatus(req.user._id);
  res.json({ success: true, data: result });
}));
const rateLimit = require('express-rate-limit');
const twoFALoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: { success: false, error: 'Too many 2FA attempts, please try again later.' }
});

router.post('/verify-login', twoFALoginLimiter, validateUserId, validateToken, catchAsync(async (req, res) => {
  const { userId, token } = req.body;

  // ✅ FIX: Session check PEHLE — expired session pe attempts count nahi hogi
  if (!getTwoFASession(userId)) {
    return res.status(401).json({
      success: false,
      error: '2FA session expired. Please login again.'
    });
  }

  // Rate limit check baad mein — sirf valid session pe
  if (getAttempts(userId) >= MAX_ATTEMPTS) {
    return res.status(429).json({
      success: false,
      error: 'Too many failed attempts. Please login again.'
    });
  }

  const result = await TwoFactorService.verifyToken(userId, token);

  if (!result.success) {
    const count = incrementAttempts(userId);
    if (count >= MAX_ATTEMPTS) {
      deleteTwoFASession(userId);
      return res.status(429).json({
        success: false,
        error: 'Too many failed attempts. Please login again.'
      });
    }
    return res.status(401).json({ success: false, error: result.error || 'Invalid 2FA code' });
  }

  deleteTwoFASession(userId);
  resetAttempts(userId);

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });

  const { generateTokenPair } = require('../utils/jwtUtils');
  const tokens = generateTokenPair(user);
  user.refreshToken = tokens.refreshToken;
  await user.save();

  const userResponse = user.toObject();
  delete userResponse.password;
  delete userResponse.twoFactorSecret;
  delete userResponse.twoFactorBackupCodes;
  delete userResponse.refreshToken;

  res.json({
    success: true,
    message: result.usedBackupCode ? 'Login successful (backup code used)' : 'Login successful',
    token: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: userResponse,
    usedBackupCode: result.usedBackupCode || false,
    remainingBackupCodes: result.remainingBackupCodes
  });
}));

router.get('/health', (req, res) => res.json({ success: true, service: '2FA Service' }));

// Export helpers for testing
router.setTwoFASession = setTwoFASession;
router.resetAttempts = resetAttempts;
router.getTwoFASession = getTwoFASession;

module.exports = router;