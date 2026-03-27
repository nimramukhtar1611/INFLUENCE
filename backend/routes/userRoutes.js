// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { adminProtect } = require('../middleware/auth');
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  verifyUser,
  suspendUser,
  activateUser,
  getUserStats
} = require('../controllers/admin/userController');

// Admin only routes
router.use(adminProtect);

router.get('/', getUsers);
router.get('/stats', getUserStats);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.post('/:id/verify', verifyUser);
router.post('/:id/suspend', suspendUser);
router.post('/:id/activate', activateUser);

module.exports = router;