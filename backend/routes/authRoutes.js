const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const authController = require('../controllers/authController');
const adminController = require('../controllers/admin/adminController');
const { verifyCaptcha, captchaRateLimit } = require('../middleware/captcha');

// ============================================================
// PUBLIC ROUTES
// ============================================================

// ✅ SIGNUP: ALWAYS require CAPTCHA
router.post(
  '/register',
  verifyCaptcha('register'),
  captchaRateLimit,
  authController.register
);

// ✅ LOGIN: Smart CAPTCHA (only if token provided)
router.post(
  '/login',
  (req, res, next) => {
    // Only verify captcha if token is present
    if (req.body.captchaToken || req.headers['x-captcha-token']) {
      console.log('🔐 CAPTCHA token detected for login - verifying');
      verifyCaptcha('login')(req, res, next);
    } else {
      console.log('⏭️ No CAPTCHA token for login - skipping verification');
      req.captcha = { success: true, score: 1.0 };
      next();
    }
  },
  captchaRateLimit,
  authController.login
);

// ✅ ADMIN LOGIN: Smart CAPTCHA (only if token provided)
router.post(
  '/admin/login',
  (req, res, next) => {
    // Only verify captcha if token is present
    if (req.body.captchaToken || req.headers['x-captcha-token']) {
      console.log('🔐 CAPTCHA token detected for admin login - verifying');
      verifyCaptcha('login')(req, res, next);
    } else {
      console.log('⏭️ No CAPTCHA token for admin login - skipping verification');
      req.captcha = { success: true, score: 1.0 };
      next();
    }
  },
  captchaRateLimit,
  adminController.adminLogin
);

// Token management
router.post('/refresh-token', authController.refreshToken);

// Password reset
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Email verification
router.post('/verify-email', authController.verifyEmail);

// Email OTP
router.post('/send-otp', authController.sendOTP);
router.post('/send-email-otp', authController.sendOTP);
router.post('/verify-otp', authController.verifyOTP);
router.post('/verify-email-otp', authController.verifyOTP);

// Phone OTP
router.post('/send-phone-otp', authController.sendPhoneOTP);
router.post('/verify-phone-otp', authController.verifyPhoneOTP);

// ============================================================
// PROTECTED ROUTES
// ============================================================
router.use(protect);

router.get('/me', authController.getMe);
router.post('/logout', authController.logout);
router.post('/change-password', authController.changePassword);

module.exports = router;