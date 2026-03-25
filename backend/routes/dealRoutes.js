// routes/dealRoutes.js - COMPLETE MERGED VERSION
//
// File 2 base rakha (cleaner multi-line format)
// File 1 se add kiye 3 missing routes:
//   POST /:id/deliverables
//   POST /:id/deliverables/:deliverableId/approve
//   POST /:id/rate

const express              = require('express');
const router               = express.Router({ mergeParams: true });
const { protect }          = require('../middleware/auth');
const { validateRequest }  = require('../middleware/validation');
const { dealValidations }  = require('../middleware/validators');
const dealController       = require('../controllers/dealController');

// ── Create ────────────────────────────────────────────────────────────────
router.post('/',
  protect,
  dealValidations.create,
  validateRequest,
  dealController.createDeal
);

router.post('/performance',
  protect,
  dealController.createPerformanceDeal
);

// ── Lists / stats (static routes BEFORE dynamic /:id) ────────────────────
router.get('/brand',   protect, dealController.getBrandDeals);
router.get('/creator', protect, dealController.getCreatorDeals);
router.get('/stats',   protect, dealController.getDealStats);
router.get('/new', protect, (req, res) => {
  res.json({ message: 'Create new deal page' });
});
// ── Single deal ───────────────────────────────────────────────────────────
router.get('/:id',
  protect,
  dealController.getDeal
);

router.put('/:id',
  protect,
  dealValidations.update,
  validateRequest,
  dealController.updateDeal
);

// ── Status transitions ────────────────────────────────────────────────────
router.post('/:id/accept',
  protect,
  dealValidations.accept,
  validateRequest,
  dealController.acceptDeal
);

router.post('/:id/reject',
  protect,
  dealValidations.reject,
  validateRequest,
  dealController.rejectDeal
);

router.post('/:id/counter',
  protect,
  dealValidations.counterOffer,
  validateRequest,
  dealController.counterOffer
);

router.post('/:id/cancel',
  protect,
  dealValidations.cancel,
  validateRequest,
  dealController.cancelDeal
);

router.post('/:id/complete',
  protect,
  dealController.completeDeal
);

router.post('/:id/revision',
  protect,
  dealValidations.revision,
  validateRequest,
  dealController.requestRevision
);

router.post('/:id/mark-in-progress',
  protect,
  dealController.markInProgress
);

// ── Messages ──────────────────────────────────────────────────────────────
router.get( '/:id/messages', protect, dealController.getDealMessages);
router.post('/:id/messages', protect, dealController.sendMessage);

// ── Deliverables (from File 1) ────────────────────────────────────────────
// Creator submits files/links for one or more deliverables
router.post('/:id/deliverables',
  protect,
  dealController.submitDeliverables
);

// Brand approves a specific deliverable
// Auto-completes deal & releases payment if all deliverables approved
router.post('/:id/deliverables/:deliverableId/approve',
  protect,
  dealController.approveDeliverable
);

// ── Rating (from File 1) ──────────────────────────────────────────────────
// Either party rates the deal after completion
router.post('/:id/rate',
  protect,
  dealController.rateDeal
);

// ── Performance metrics ───────────────────────────────────────────────────
router.put('/:id/performance-metrics',
  protect,
  dealController.updatePerformanceMetrics
);

router.get('/:id/performance-summary',
  protect,
  dealController.getPerformanceSummary
);

module.exports = router;