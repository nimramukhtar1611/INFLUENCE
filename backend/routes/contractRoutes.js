// routes/contractRoutes.js - COMPLETE
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getContractByDeal,
  getContract,
  updateContract,
  signContractHandler,
  downloadContract,
  getUserContracts
} = require('../controllers/contractController');

// All routes are protected
router.use(protect);

router.get('/user', getUserContracts);
router.get('/deal/:dealId', getContractByDeal);
router.get('/:id', getContract);
router.put('/:id', updateContract);
router.post('/:id/sign', signContractHandler);
router.get('/:id/download', downloadContract);

module.exports = router;