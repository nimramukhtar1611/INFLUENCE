// routes/creatorRoutes.js - FULL FIXED VERSION WITH PORTFOLIO CRUD
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const creatorController = require('../controllers/creatorController');

// All routes are protected and for creators only
router.use(protect, authorize('creator'));

// ==================== PROFILE ====================
router.get('/profile/me', creatorController.getProfile);
router.put('/profile',    creatorController.updateProfile);

// ==================== SOCIAL MEDIA ====================
router.post('/social/verify', creatorController.verifySocialMedia);
router.post('/social/sync',   creatorController.syncSocialMedia);

// ==================== SETTINGS ====================
router.put('/notifications', creatorController.updateNotificationSettings);
router.put('/privacy',       creatorController.updatePrivacySettings);
router.put('/rate-card',     creatorController.updateRateCard);
router.put('/availability',  creatorController.updateAvailability);

// ==================== DASHBOARD ====================
router.get('/dashboard', creatorController.getDashboard);

// ==================== ANALYTICS ====================
router.get('/analytics', creatorController.getAnalytics);

// ==================== EARNINGS ====================
router.get('/earnings/summary', creatorController.getEarningsSummary);
router.get('/earnings/history', creatorController.getEarningsHistory);

// ==================== PORTFOLIO — FULL CRUD ====================
router.get('/portfolio',              creatorController.getPortfolio);        // GET    all items
router.post('/portfolio',             creatorController.addPortfolioItem);    // POST   add item
router.put('/portfolio/:itemId',      creatorController.updatePortfolioItem); // PUT    update item
router.delete('/portfolio/:itemId',   creatorController.deletePortfolioItem); // DELETE remove item

module.exports = router;