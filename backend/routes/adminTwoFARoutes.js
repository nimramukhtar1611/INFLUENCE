// routes/adminTwoFARoutes.js - ADMIN 2FA ONLY
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { adminProtect } = require('../middleware/auth');
const TwoFactorService = require('../services/twoFactorService');
const { catchAsync } = require('../utils/catchAsync');

const validateToken = [body('token').notEmpty().withMessage('Token is required')];

// POST /api/admin/2fa/generate  ✅
router.post('/generate', adminProtect, catchAsync(async (req, res) => {
  const adminId = req.admin?._id || req.user?._id;
  const adminEmail = req.admin?.email || req.user?.email;
  const result = await TwoFactorService.generateSecret(adminId, adminEmail);
  if (!result.success) return res.status(400).json({ success: false, error: result.error });
  res.json({ success: true, data: { secret: result.secret, qrCode: result.qrCode, otpauth_url: result.otpauth_url } });
}));

// POST /api/admin/2fa/verify
router.post('/verify', adminProtect, validateToken, catchAsync(async (req, res) => {
  const adminId = req.admin?._id || req.user?._id;
  const result = await TwoFactorService.verifyAndEnable(adminId, req.body.token);
  if (!result.success) return res.status(400).json({ success: false, error: result.error });
  res.json({ success: true, message: result.message, data: { backupCodes: result.backupCodes } });
}));

// POST /api/admin/2fa/disable
router.post('/disable', adminProtect, validateToken, catchAsync(async (req, res) => {
  const adminId = req.admin?._id || req.user?._id;
  const result = await TwoFactorService.disable(adminId, req.body.token);
  if (!result.success) return res.status(400).json({ success: false, error: result.error });
  res.json({ success: true, message: result.message });
}));

// GET /api/admin/2fa/status
router.get('/status', adminProtect, catchAsync(async (req, res) => {
  const adminId = req.admin?._id || req.user?._id;
  const result = await TwoFactorService.getStatus(adminId);
  res.json({ success: true, data: result });
}));

module.exports = router;