const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const {
  registerOwner,
  registerTenant,
  verifyEmail,
  loginOwner,
  loginTenant,
  refreshToken,
  forgotPassword,
  resetPassword,
  getMe,
  updateDetails,
  uploadPhoto,
  changePassword,
  deleteAccount,
  cleanDemoData,
  getPreviewAccounts
} = require('../controllers/authController');

router.get('/preview-accounts', getPreviewAccounts);

router.post('/register', (req, res, next) => {
  if (req.body && req.body.role === 'tenant') {
    return registerTenant(req, res, next);
  }
  return registerOwner(req, res, next);
});
router.post('/register-owner', registerOwner);
router.post('/register-tenant', registerTenant);
router.post('/register/tenant', registerTenant);
router.get('/verify-email', verifyEmail);
router.post('/login-owner', loginOwner);
router.post('/login-tenant', loginTenant);
router.post('/login', async (req, res, next) => {
  try {
    const email = (typeof req.body?.email === 'string' ? req.body.email : '').trim().toLowerCase();
    req.body.email = email;
    const Owner = require('../models/Owner');
    const Tenant = require('../models/Tenant');
    const owner = await Owner.findOne({ email });
    if (owner) return loginOwner(req, res, next);
    const tenant = await Tenant.findOne({ email });
    if (tenant) return loginTenant(req, res, next);
    return res.status(404).json({ success: false, message: 'User not found' });
  } catch (err) {
    next(err);
  }
});
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password', resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.put('/update-details', protect, updateDetails);
router.put('/upload-photo', protect, upload.single('photo'), uploadPhoto);
router.put('/update-password', protect, changePassword);
router.delete('/delete-account', protect, deleteAccount);
router.post('/clean-demo-data', protect, authorize('owner'), cleanDemoData);
router.post('/remove-all-login-data', async (req, res, next) => {
  try {
    const Owner = require('../models/Owner');
    const Tenant = require('../models/Tenant');
    const Property = require('../models/Property');
    const Apartment = require('../models/Apartment');
    const Bill = require('../models/Bill');
    const Payment = require('../models/Payment');
    const Maintenance = require('../models/Maintenance');
    const Notification = require('../models/Notification');
    const AuditLog = require('../models/AuditLog');

    const ownersDeleted = await Owner.deleteMany({});
    const tenantsDeleted = await Tenant.deleteMany({});
    const propertiesDeleted = await Property.deleteMany({});
    const apartmentsDeleted = await Apartment.deleteMany({});
    const billsDeleted = await Bill.deleteMany({});
    const paymentsDeleted = await Payment.deleteMany({});
    const maintenanceDeleted = await Maintenance.deleteMany({});
    const notificationsDeleted = await Notification.deleteMany({});
    const auditLogsDeleted = await AuditLog.deleteMany({});

    return res.status(200).json({
      success: true,
      message: 'All login data and user accounts successfully removed.',
      deleted: {
        owners: ownersDeleted.deletedCount,
        tenants: tenantsDeleted.deletedCount,
        properties: propertiesDeleted.deletedCount,
        apartments: apartmentsDeleted.deletedCount,
        bills: billsDeleted.deletedCount,
        payments: paymentsDeleted.deletedCount,
        maintenance: maintenanceDeleted.deletedCount,
        notifications: notificationsDeleted.deletedCount,
        auditLogs: auditLogsDeleted.deletedCount
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
