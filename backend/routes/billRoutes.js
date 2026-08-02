const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  generateBill,
  getBills,
  getBill,
  downloadBillPDF
} = require('../controllers/billController');

router.route('/')
  .post(protect, authorize('owner'), generateBill)
  .get(protect, getBills);

router.route('/:id')
  .get(protect, getBill);

router.get('/:id/pdf', protect, downloadBillPDF);

module.exports = router;
