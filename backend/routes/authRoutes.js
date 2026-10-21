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
  deleteAccount
} = require('../controllers/authController');

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

module.exports = router;

