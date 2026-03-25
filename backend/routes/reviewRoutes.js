// routes/reviewRoutes.js - COMPLETE
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createReview,
  getUserReviews,
  getDealReview,
  updateReview,
  deleteReview,
  markHelpful,
  reportReview,
  respondToReview,
  getUserReviewSummary
} = require('../controllers/reviewController');

// ==================== PUBLIC ROUTES ====================
router.get('/user/:userId', getUserReviews);
router.get('/user/:userId/summary', getUserReviewSummary);

// ==================== PROTECTED ROUTES ====================
router.use(protect);

router.post('/', createReview);
router.get('/deal/:dealId', getDealReview);
router.put('/:id', updateReview);
router.delete('/:id', deleteReview);
router.post('/:id/helpful', markHelpful);
router.post('/:id/report', reportReview);
router.post('/:id/respond', respondToReview);

module.exports = router;