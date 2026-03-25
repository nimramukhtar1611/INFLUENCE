// routes/invitationRoutes.js - COMPLETE
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createInvitation,
  getBrandInvitations,
  acceptInvitation,
  cancelInvitation,
  resendInvitation
} = require('../controllers/invitationController');

// Public route
router.post('/accept', acceptInvitation);

// Protected routes (brand only)
router.use(protect, authorize('brand'));

router.post('/', createInvitation);
router.get('/', getBrandInvitations);
router.delete('/:id', cancelInvitation);
router.post('/:id/resend', resendInvitation);

module.exports = router;