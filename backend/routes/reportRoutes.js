const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getOwnerDashboard,
  getTenantDashboard,
  exportReportData
} = require('../controllers/reportController');

router.get('/owner-dashboard', protect, authorize('owner'), getOwnerDashboard);
router.get('/tenant-dashboard', protect, authorize('tenant'), getTenantDashboard);
router.get('/export/:type', protect, authorize('owner'), exportReportData);

module.exports = router;
