const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const {
  registerOwner,
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

router.post('/register', registerOwner);
router.get('/verify-email', verifyEmail);
router.post('/login-owner', loginOwner);
router.post('/login-tenant', loginTenant);
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
