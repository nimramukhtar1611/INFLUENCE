// routes/searchRoutes.js - COMPLETE FIXED VERSION
const express = require('express');
const router = express.Router();
const { protect, optionalAuth , authorize} = require('../middleware/auth');
const {
  searchCreators,
  searchCampaigns,
  getSuggestions,
  saveSearch,
  getSavedSearches,
  deleteSavedSearch,
  updateSavedSearch,
  getSearchHistory,
  clearSearchHistory,
  getSearchAnalytics,
  getTrendingSearches,
  getRecommendations
} = require('../controllers/searchController');

// ==================== PUBLIC/OPTIONAL ROUTES ====================
router.get('/suggestions', optionalAuth, getSuggestions);
router.get('/trending', getTrendingSearches);

// ==================== PROTECTED ROUTES ====================
router.use(protect);

// Search
router.get('/creators', searchCreators);
router.get('/campaigns', searchCampaigns);

// Saved searches
router.post('/save', saveSearch);
router.get('/saved', getSavedSearches);
router.put('/saved/:searchId', updateSavedSearch);
router.delete('/saved/:searchId', deleteSavedSearch);

// History
router.get('/history', getSearchHistory);
router.delete('/history', clearSearchHistory);

// Analytics (admin only)
router.get('/analytics', protect, authorize('admin'), getSearchAnalytics);

// Recommendations
router.get('/recommendations', getRecommendations);

module.exports = router;