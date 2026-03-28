// routes/dealRoutes.js - COMPLETE MERGED VERSION
//
// File 2 base rakha (cleaner multi-line format)
// File 1 se add kiye 3 missing routes:
//   POST /:id/deliverables
//   POST /:id/deliverables/:deliverableId/approve
//   POST /:id/rate

const express              = require('express');
const router               = express.Router({ mergeParams: true });
const { protect, authorize, hasPermission, resolveBrandContext } = require('../middleware/auth');
const { validateRequest }  = require('../middleware/validation');
const { dealValidations }  = require('../middleware/validators');
const dealController       = require('../controllers/dealController');

router.use(protect, resolveBrandContext);

// ── Create ────────────────────────────────────────────────────────────────
router.post('/',
  authorize('brand'),
  hasPermission('create_deals'),
  dealValidations.create,
  validateRequest,
  dealController.createDeal
);

router.post('/performance',
  authorize('brand'),
  hasPermission('create_deals'),
  dealController.createPerformanceDeal
);

// ── Lists / stats (static routes BEFORE dynamic /:id) ────────────────────
router.get('/brand', authorize('brand'), hasPermission('view_deals'), dealController.getBrandDeals);
router.get('/creator', authorize('creator'), dealController.getCreatorDeals);
router.get('/stats', dealController.getDealStats);
router.get('/new', (req, res) => {
  res.json({ message: 'Create new deal page' });
});
// ── Single deal ───────────────────────────────────────────────────────────
router.get('/:id',
  dealController.getDeal
);

router.put('/:id/status',
  dealController.updateDealStatus
);

router.put('/:id',
  authorize('brand'),
  hasPermission('edit_deals'),
  dealValidations.update,
  validateRequest,
  dealController.updateDeal
);

// ── Status transitions ────────────────────────────────────────────────────
router.post('/:id/accept',
  authorize('creator'),
  dealValidations.accept,
  validateRequest,
  dealController.acceptDeal
);

router.post('/:id/reject',
  authorize('creator'),
  dealValidations.reject,
  validateRequest,
  dealController.rejectDeal
);

router.post('/:id/counter',
  dealValidations.counterOffer,
  validateRequest,
  dealController.counterOffer
);

router.get('/:id/negotiation-suggestion',
  dealController.getNegotiationSuggestion
);

router.post('/:id/ai-counter/start',
  dealController.startAiCounterDealing
);

router.post('/:id/cancel',
  dealValidations.cancel,
  validateRequest,
  dealController.cancelDeal
);

router.post('/:id/complete',
  authorize('brand'),
  hasPermission('approve_deals'),
  dealController.completeDeal
);

router.post('/:id/revision',
  authorize('brand'),
  hasPermission('edit_deals'),
  dealValidations.revision,
  validateRequest,
  dealController.requestRevision
);

router.post('/:id/mark-in-progress',
  authorize('creator'),
  dealController.markInProgress
);

// ── Messages ──────────────────────────────────────────────────────────────
router.get('/:id/messages', dealController.getDealMessages);
router.post('/:id/messages', dealController.sendMessage);

// ── Deliverables (from File 1) ────────────────────────────────────────────
// Creator submits files/links for one or more deliverables
router.post('/:id/deliverables',
  authorize('creator'),
  dealController.submitDeliverables
);

// Brand approves a specific deliverable
// Auto-completes deal & releases payment if all deliverables approved
router.post('/:id/deliverables/:deliverableId/approve',
  authorize('brand'),
  hasPermission('approve_deals'),
  dealController.approveDeliverable
);

// ── Rating (from File 1) ──────────────────────────────────────────────────
// Either party rates the deal after completion
router.post('/:id/rate',
  dealController.rateDeal
);

// ── Performance metrics ───────────────────────────────────────────────────
router.put('/:id/performance-metrics',
  dealController.updatePerformanceMetrics
);

router.get('/:id/performance-summary',
  dealController.getPerformanceSummary
);

module.exports = router;