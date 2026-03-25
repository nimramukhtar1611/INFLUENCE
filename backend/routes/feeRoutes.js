// routes/feeRoutes.js - COMPLETE
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  calculateFees,
  applyFees,
  getFeeConfig,
  updateFeeConfig,
  getRevenueAnalytics
} = require('../controllers/feeController');

// Protected routes
router.use(protect);

// Fee calculation (any authenticated user)
router.post('/calculate', calculateFees);

// Admin only routes
router.use(authorize('admin'));

router.post('/apply', applyFees);
router.get('/config', getFeeConfig);
router.put('/config', updateFeeConfig);
router.get('/revenue', getRevenueAnalytics);

module.exports = router;