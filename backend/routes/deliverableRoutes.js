// routes/deliverableRoutes.js - COMPLETE
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadDeliverables } = require('../middleware/upload');

const {
  submitDeliverable,
  getDealDeliverables,
  getDeliverable,
  approveDeliverable,
  requestDeliverableRevision,
  updateDeliverableMetrics
} = require('../controllers/deliverableController');

// All routes are protected
router.use(protect);

// ==================== SUBMIT DELIVERABLES ====================
router.post('/:dealId', uploadDeliverables, submitDeliverable);


// ==================== GET DELIVERABLES ====================
router.get('/deal/:dealId', getDealDeliverables);
router.get('/:id', getDeliverable);

// ==================== BRAND ACTIONS ====================
router.post('/:id/approve', authorize('brand'), approveDeliverable);
router.post('/:id/revision', authorize('brand'), requestDeliverableRevision);

// ==================== CREATOR ACTIONS ====================
router.put('/:id/metrics', authorize('creator'), updateDeliverableMetrics);

module.exports = router;