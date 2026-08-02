const Owner = require('../models/Owner');
const Tenant = require('../models/Tenant');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logActivity = require('../utils/activityLogger');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/emailService');
const { uploadToStorage } = require('../utils/uploader');

// Generate access & refresh tokens and send response
const sendTokenResponse = (user, statusCode, res) => {
  const accessToken = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'your_super_secret_jwt_access_token_secret_key_12345',
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_REFRESH_SECRET || 'your_super_secret_jwt_refresh_token_secret_key_54321',
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  };

  res
    .status(statusCode)
    .cookie('refreshToken', refreshToken, cookieOptions)
    .json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePhoto: user.profilePhoto,
        contactNumber: user.contactNumber || user.phone || '',
        verified: user.verified || false
      }
    });
};

// @desc    Register Owner
// @route   POST /api/v1/auth/register
// @access  Public
exports.registerOwner = async (req, res, next) => {
  try {
    const { name, email, password, contactNumber, address } = req.body;

    // 1. Validation
    if (!name || !email || !password || !contactNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (name, email, password, contact number).'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    // 2. Prevent duplicate email (409 Conflict)
    const ownerExists = await Owner.findOne({ email });
    const tenantExists = await Tenant.findOne({ email });

    if (ownerExists || tenantExists) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    // 3. SMTP check & auto-verification in dev mode
    const isSmtpConfigured = !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
    const autoVerify = !isSmtpConfigured || process.env.NODE_ENV === 'development';

    const verificationToken = autoVerify ? undefined : crypto.randomBytes(20).toString('hex');

    const owner = await Owner.create({
      name,
      email,
      password,
      contactNumber,
      address: address || '',
      verified: autoVerify ? true : false,
      verificationToken
    });

    // 4. Optional SMTP verification email
    if (isSmtpConfigured && !autoVerify && verificationToken) {
      try {
        await sendVerificationEmail(owner, verificationToken);
      } catch (err) {
        console.error('Verification email failed to send, defaulting account to verified:', err.message);
        owner.verified = true;
        owner.verificationToken = undefined;
        await owner.save();
      }
    }

    // Write audit trail
    await logActivity(owner._id, 'Owner', 'Registration', `Owner ${owner.email} registered successfully.`, req);

    res.status(201).json({
      success: true,
      autoVerified: owner.verified,
      message: owner.verified
        ? 'Registration successful. Account created and ready for login.'
        : 'Registration successful. Please check your email to verify your account.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Owner Email
// @route   GET /api/v1/auth/verify-email
// @access  Public
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required' });
    }

    const owner = await Owner.findOne({ verificationToken: token });

    if (!owner) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }

    owner.verified = true;
    owner.verificationToken = undefined;
    await owner.save();

    await logActivity(owner._id, 'Owner', 'Email Verification', `Owner verified email successfully.`, req);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Owner Login
// @route   POST /api/v1/auth/login-owner
// @access  Public
exports.loginOwner = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const owner = await Owner.findOne({ email }).select('+password');

    if (!owner) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await owner.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    if (!owner.verified) {
      return res.status(401).json({ success: false, message: 'Email not verified. Please verify your email to login' });
    }

    await logActivity(owner._id, 'Owner', 'Login', `Owner logged in.`, req);

    sendTokenResponse(owner, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Tenant Login
// @route   POST /api/v1/auth/login-tenant
// @access  Public
exports.loginTenant = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const tenant = await Tenant.findOne({ email }).select('+password');

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const isMatch = await tenant.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    if (!tenant.isActive) {
      return res.status(403).json({ success: false, message: 'Account inactive' });
    }

    if (tenant.verified === false) {
      return res.status(401).json({ success: false, message: 'Email not verified' });
    }

    await logActivity(tenant._id, 'Tenant', 'Login', `Tenant logged in.`, req);

    sendTokenResponse(tenant, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh Token
// @route   POST /api/v1/auth/refresh-token
// @access  Public
exports.refreshToken = async (req, res, next) => {
  try {
    const token = (req.cookies && req.cookies.refreshToken) || (req.body && req.body.refreshToken);

    if (!token) {
      return res.status(401).json({ success: false, message: 'No refresh token provided' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'your_super_secret_jwt_refresh_token_secret_key_54321');
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    let user;
    if (decoded.role === 'owner') {
      user = await Owner.findById(decoded.id);
    } else if (decoded.role === 'tenant') {
      user = await Tenant.findById(decoded.id);
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot Password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    let user = await Owner.findOne({ email });
    let modelType = 'Owner';

    if (!user) {
      user = await Tenant.findOne({ email });
      modelType = 'Tenant';
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'There is no user with that email.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set resetPasswordToken field
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 Minutes
    await user.save({ validateBeforeSave: false });

    // Send email
    try {
      await sendPasswordResetEmail(user, resetToken);
      res.status(200).json({ success: true, message: 'Email sent with password reset link' });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({ success: false, message: 'Email could not be sent' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Password
// @route   PUT /api/v1/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.query;
    const { password } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Reset token is required' });
    }

    // Get hashed token
    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    let user = await Owner.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    let role = 'Owner';

    if (!user) {
      user = await Tenant.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
      });
      role = 'Tenant';
    }

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    await logActivity(user._id, role, 'Password Reset', 'User reset password successfully.', req);

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Current User Profile
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = req.user;
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: req.userRole || user.role,
        profilePhoto: user.profilePhoto || '',
        contactNumber: user.contactNumber || user.phone || '',
        verified: user.verified !== undefined ? user.verified : true
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Profile Info
// @route   PUT /api/v1/auth/update-details
// @access  Private
exports.updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name || req.user.name,
      contactNumber: req.body.contactNumber || req.user.contactNumber || req.user.phone,
      address: req.body.address || req.user.address || ''
    };

    if (req.userRole === 'owner') {
      const owner = await Owner.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
        new: true,
        runValidators: true
      });
      await logActivity(owner._id, 'Owner', 'Profile Update', 'Owner updated details.', req);
      return res.status(200).json({ success: true, user: owner });
    } else {
      // Map back to tenant's 'phone' field
      fieldsToUpdate.phone = fieldsToUpdate.contactNumber;
      delete fieldsToUpdate.contactNumber;
      
      const tenant = await Tenant.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
        new: true,
        runValidators: true
      });
      await logActivity(tenant._id, 'Tenant', 'Profile Update', 'Tenant updated details.', req);
      return res.status(200).json({ success: true, user: tenant });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Upload Profile Photo
// @route   PUT /api/v1/auth/upload-photo
// @access  Private
exports.uploadPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a photo' });
    }

    const uploadResult = await uploadToStorage(req.file, 'profiles');

    if (req.userRole === 'owner') {
      req.user.profilePhoto = uploadResult.url;
      await req.user.save();
      await logActivity(req.user._id, 'Owner', 'Profile Photo Upload', 'Owner uploaded profile photo.', req);
    } else {
      req.user.profilePhoto = uploadResult.url;
      await req.user.save();
      await logActivity(req.user._id, 'Tenant', 'Profile Photo Upload', 'Tenant uploaded profile photo.', req);
    }

    res.status(200).json({
      success: true,
      url: uploadResult.url
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change Password
// @route   PUT /api/v1/auth/update-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new passwords' });
    }

    // Get user with password selected
    let user;
    if (req.userRole === 'owner') {
      user = await Owner.findById(req.user.id).select('+password');
    } else {
      user = await Tenant.findById(req.user.id).select('+password');
    }

    // Check password
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    await logActivity(user._id, req.userRole === 'owner' ? 'Owner' : 'Tenant', 'Change Password', 'User changed password.', req);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Account
// @route   DELETE /api/v1/auth/delete-account
// @access  Private
exports.deleteAccount = async (req, res, next) => {
  try {
    if (req.userRole === 'owner') {
      // Clean up properties, tenants etc (Optional, but let's delete owner)
      await Owner.findByIdAndDelete(req.user.id);
      res.status(200).json({ success: true, message: 'Owner account deleted.' });
    } else {
      res.status(400).json({ success: false, message: 'Tenants cannot delete their own account. Please contact your Landlord.' });
    }
  } catch (error) {
    next(error);
  }
};
