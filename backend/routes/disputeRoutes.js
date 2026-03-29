// routes/disputeRoutes.js - COMPLETE
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const {
  createDispute,
  uploadEvidence,
  getDisputes,
  getUserDisputes,
  getDispute,
  addMessage,
  updateStatus,
  proposeResolution,
  acceptResolution,
  rejectResolution,
  assignDispute,
  escalateDispute,
  getDisputeStats
} = require('../controllers/disputeController');

// All routes are protected
router.use(protect);

// ==================== USER ROUTES ====================
router.post('/', createDispute);
router.get('/user', getUserDisputes);
router.get('/:id', getDispute);
router.post('/:id/messages', addMessage);
router.post('/:id/evidence', uploadSingle(), uploadEvidence);
router.post('/:id/accept-resolution', acceptResolution);
router.post('/:id/reject-resolution', rejectResolution);
router.post('/:id/escalate', escalateDispute);

// ==================== ADMIN ROUTES ====================
router.get('/', authorize('admin'), getDisputes);
router.get('/stats', authorize('admin'), getDisputeStats);
router.put('/:id/status', authorize('admin'), updateStatus);
router.post('/:id/resolution', authorize('admin'), proposeResolution);
router.post('/:id/assign', authorize('admin'), assignDispute);

module.exports = router;