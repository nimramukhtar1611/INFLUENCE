const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAuditLogs,
  getUserAuditTrail,
  getAuditSummary
} = require('../controllers/auditController');

// All routes are admin only
router.use(protect, authorize('admin'));

router.get('/', getAuditLogs);
router.get('/summary', getAuditSummary);
router.get('/user/:userId', getUserAuditTrail);

module.exports = router;