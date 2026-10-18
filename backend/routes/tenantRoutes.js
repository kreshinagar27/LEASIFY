const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const {
  addTenant,
  getTenants,
  getTenant,
  updateTenant,
  resetTenantPassword,
  toggleTenantStatus,
  renewLease,
  moveOutTenant,
  uploadDocument,
  deactivateTenant
} = require('../controllers/tenantController');

router.route('/')
  .post(protect, authorize('owner'), addTenant)
  .get(protect, authorize('owner'), getTenants);

router.route('/:id')
  .get(protect, getTenant)
  .put(protect, authorize('owner'), updateTenant)
  .delete(protect, authorize('owner'), deactivateTenant);

router.put('/:id/reset-password', protect, authorize('owner'), resetTenantPassword);
router.put('/:id/toggle-status', protect, authorize('owner'), toggleTenantStatus);
router.put('/:id/renew', protect, authorize('owner'), renewLease);
router.post('/:id/move-out', protect, authorize('owner'), moveOutTenant);
router.post('/:id/documents', protect, upload.single('document'), uploadDocument);

module.exports = router;
