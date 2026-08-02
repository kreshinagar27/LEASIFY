const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createOrder,
  verifyPayment,
  submitManualPayment,
  getPayments
} = require('../controllers/paymentController');

router.post('/order', protect, authorize('tenant'), createOrder);
router.post('/verify', protect, authorize('tenant'), verifyPayment);
router.post('/manual', protect, authorize('tenant'), submitManualPayment);
router.get('/', protect, getPayments);

module.exports = router;
