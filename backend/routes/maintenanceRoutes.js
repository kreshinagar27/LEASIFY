const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const {
  createRequest,
  getRequests,
  getRequest,
  updateRequest
} = require('../controllers/maintenanceController');

router.route('/')
  .post(protect, authorize('tenant'), upload.array('images', 5), createRequest)
  .get(protect, getRequests);

router.route('/:id')
  .get(protect, getRequest)
  .put(protect, authorize('owner'), upload.array('images', 5), updateRequest);

module.exports = router;
