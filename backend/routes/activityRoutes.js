const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getUserActivities,
  getRecentActivities,
  getActivityStats
} = require('../controllers/activityController');

// Admin routes
router.get('/recent', protect, authorize('admin'), getRecentActivities);
router.get('/stats', protect, authorize('admin'), getActivityStats);

// User routes
router.get('/user/:userId', protect, getUserActivities);

module.exports = router;