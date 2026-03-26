const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { checkTeamMemberLimit } = require('../middleware/subscriptionCheck');
const { brandValidations, paymentValidations } = require('../middleware/validators');
const brandController = require('../controllers/brandController');

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES (no auth required — must be BEFORE router.use(protect))
// ─────────────────────────────────────────────────────────────────────────────

// Accept a team invitation — user may not be logged in yet
router.post('/team/invitations/accept', brandController.acceptInvitation);
router.post('/team/invitations/reject', brandController.rejectInvitation);

// ─────────────────────────────────────────────────────────────────────────────
// ALL ROUTES BELOW REQUIRE AUTHENTICATION + BRAND ROLE
// ─────────────────────────────────────────────────────────────────────────────
router.use(protect, authorize('brand'));

// ── Dashboard ─────────────────────────────────────────────────────────────
router.get('/dashboard', brandController.getDashboard);

// ── Profile ───────────────────────────────────────────────────────────────
router.get('/profile', brandController.getProfile);
router.put(
  '/profile',
  brandValidations.updateProfile,
  validateRequest,
  brandController.updateProfile
);

// ── Analytics ─────────────────────────────────────────────────────────────
// getAnalytics and getBrandAnalytics are the same handler — support both names
// in case controller exports either one
router.get('/analytics', brandController.getAnalytics || brandController.getBrandAnalytics);

// ── Search creators ───────────────────────────────────────────────────────
router.get('/creators/search', protect, authorize('brand'), brandController.searchCreators);

// ─────────────────────────────────────────────────────────────────────────────
// TEAM ROUTES
// ✅ ORDERING RULE: static/specific paths MUST come before dynamic :memberId
//    Otherwise Express will match 'activity', 'invitations', etc. as :memberId
// ─────────────────────────────────────────────────────────────────────────────

// Team overview (list + add)
router.get('/team', brandController.getTeamMembers);
router.post(
  '/team',
  checkTeamMemberLimit,
  brandValidations.addTeamMember,
  validateRequest,
  brandController.addTeamMember
);

// ── Static team sub-routes (BEFORE :memberId) ─────────────────────────────
router.get('/team/activity', brandController.getTeamActivity);
router.get('/team/permissions/summary',brandController.getPermissionsSummary);
router.post('/team/check-permission', brandController.checkUserPermission);

// ── Invitations (static, BEFORE :memberId) ────────────────────────────────
router.get('/team/invitations',
  brandController.getInvitations);

// Support both createInvitation (file 4) and sendInvitation (file 3) exports
router.post('/team/invitations',brandController.sendInvitation || brandController.createInvitation);

router.get('/creators/:id', protect, authorize('brand'), brandController.getCreatorById);

router.post('/team/invitations/:invitationId/resend',
  brandController.resendInvitation);

router.delete('/team/invitations/:invitationId',
  brandController.cancelInvitation);

// ── Role templates (static, BEFORE :memberId) ─────────────────────────────
router.get('/team/role-templates', brandController.getRoleTemplates);
router.post('/team/role-templates', brandController.createRoleTemplate);
router.put('/team/role-templates/:templateId', brandController.updateRoleTemplate);
router.delete('/team/role-templates/:templateId', brandController.deleteRoleTemplate);

// ── Dynamic :memberId routes (LAST in /team group) ───────────────────────
router.get('/team/:memberId', brandController.getTeamMemberDetails);
router.put('/team/:memberId/role', brandController.updateTeamMemberRole);
router.put('/team/:memberId/permissions', brandController.updateTeamMemberPermissions);
router.put('/team/:memberId/status', brandController.updateTeamMemberStatus);
router.delete('/team/:memberId', brandController.removeTeamMember);

// ── Payment methods ───────────────────────────────────────────────────────
router.get('/payment-methods', brandController.getPaymentMethods);
router.post(
  '/payment-methods',
  paymentValidations.addPaymentMethod,
  validateRequest,
  brandController.addPaymentMethod
);
router.put('/payment-methods/:methodId/default', brandController.setDefaultPaymentMethod);
router.delete('/payment-methods/:methodId', brandController.deletePaymentMethod);

// ── Invoices ──────────────────────────────────────────────────────────────
router.get('/invoices', brandController.getInvoices);

// ── Tax info ──────────────────────────────────────────────────────────────
router.get('/tax-info', brandController.getTaxInfo);
router.put('/tax-info', brandController.updateTaxInfo);

// ─────────────────────────────────────────────────────────────────────────────
// NESTED RESOURCE ROUTES
// ─────────────────────────────────────────────────────────────────────────────
router.use('/campaigns', require('./campaignRoutes'));
router.use('/deals',     require('./dealRoutes'));
router.use('/payments',  require('./paymentRoutes'));

module.exports = router;