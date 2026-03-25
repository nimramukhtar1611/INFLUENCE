// routes/payment.routes.js - FULL FIXED VERSION
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

// ============================================================
// ✅ WEBHOOK ROUTE — MUST be BEFORE protect middleware
// Stripe sends raw body, cannot be authenticated via JWT
// ============================================================
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }), // ✅ Raw body for Stripe signature verification
  paymentController.handleStripeWebhook
);

// ============================================================
// All routes below require authentication
// ============================================================
router.use(protect);

// ==================== BALANCE ====================
router.get('/balance', paymentController.getBalance);

// ==================== TRANSACTIONS ====================
router.get('/transactions', paymentController.getTransactions);

// ==================== PAYMENT METHODS ====================
router.get('/methods', paymentController.getPaymentMethods);
router.post('/methods', paymentController.addPaymentMethod);
router.put('/methods/:methodId/default', paymentController.setDefaultMethod);
router.delete('/methods/:methodId', paymentController.deletePaymentMethod);

// ==================== ESCROW ====================
router.post('/escrow', paymentController.createEscrow);
router.post('/escrow/checkout-intent', paymentController.createEscrowCheckoutIntent);
router.post('/escrow/:paymentId/confirm', paymentController.confirmEscrowCheckout);

// ==================== PERFORMANCE PAYMENTS (CPE/CPA/CPM) ====================
// ✅ FIX: These routes were completely missing
router.post('/performance', paymentController.createPerformancePayment);
router.put('/performance/:dealId/metrics', paymentController.updatePerformanceMetrics);
router.get('/performance/summary', paymentController.getPerformanceSummary);

// ==================== RELEASE / WITHDRAWAL ====================
router.post('/release/:dealId', paymentController.releasePayment);
router.post('/withdraw', paymentController.requestWithdrawal);
// ==================== WITHDRAWALS ====================
router.get('/withdrawals', protect, paymentController.getWithdrawals);
// ==================== INVOICES ====================
router.get('/invoices', paymentController.getInvoices);

module.exports = router;