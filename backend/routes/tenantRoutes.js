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
  assignProperty,
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
  .patch(protect, authorize('owner'), updateTenant)
  .delete(protect, authorize('owner'), deactivateTenant);

// Status toggling / updating
router.route('/:id/status')
  .patch(protect, authorize('owner'), toggleTenantStatus)
  .put(protect, authorize('owner'), toggleTenantStatus);
router.put('/:id/toggle-status', protect, authorize('owner'), toggleTenantStatus);

// Password resetting (Owner only)
router.route('/:id/reset-password')
  .patch(protect, authorize('owner'), resetTenantPassword)
  .put(protect, authorize('owner'), resetTenantPassword);

// Property & Apartment assignment
router.route('/:id/assign-property')
  .patch(protect, authorize('owner'), assignProperty)
  .put(protect, authorize('owner'), assignProperty);

router.put('/:id/renew', protect, authorize('owner'), renewLease);
router.post('/:id/move-out', protect, authorize('owner'), moveOutTenant);
router.post('/:id/documents', protect, upload.single('document'), uploadDocument);

module.exports = router;
