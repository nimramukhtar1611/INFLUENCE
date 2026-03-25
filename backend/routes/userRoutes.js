// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  verifyUser,
  suspendUser,
  activateUser,
  getUserStats
} = require('../controllers/userController');

// Admin only routes
router.get('/', protect, authorize('admin'), getUsers);
router.get('/stats', protect, authorize('admin'), getUserStats);
router.get('/:id', protect, authorize('admin'), getUser);
router.put('/:id', protect, authorize('admin'), updateUser);
router.delete('/:id', protect, authorize('admin'), deleteUser);
router.post('/:id/verify', protect, authorize('admin'), verifyUser);
router.post('/:id/suspend', protect, authorize('admin'), suspendUser);
router.post('/:id/activate', protect, authorize('admin'), activateUser);

module.exports = router;