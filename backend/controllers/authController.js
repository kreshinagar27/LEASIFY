const Owner = require('../models/Owner');
const Tenant = require('../models/Tenant');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logActivity = require('../utils/activityLogger');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/emailService');
const { uploadToStorage } = require('../utils/uploader');
const { parsePhoneNumberFromString, isValidPhoneNumber } = require('libphonenumber-js');

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
    // 0. ENFORCE STRICT SINGLE OWNER SYSTEM: Reject if any owner already exists
    const existingOwner = await Owner.findOne();
    if (existingOwner) {
      return res.status(400).json({
        success: false,
        message: 'An owner account already exists.'
      });
    }

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

    const normalizedEmail = (typeof email === 'string' ? email : '').trim().toLowerCase();
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    // 2. Validate & Normalize Phone Number
    const rawContact = (typeof contactNumber === 'string' ? contactNumber : '').trim();
    if (!rawContact) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a contact number.'
      });
    }

    let normalizedPhone = rawContact;
    try {
      const parsed = parsePhoneNumberFromString(rawContact);
      if (parsed && parsed.isValid()) {
        normalizedPhone = parsed.format('E.164');
      } else {
        const parsedWithDefault = parsePhoneNumberFromString(rawContact, 'IN');
        if (parsedWithDefault && parsedWithDefault.isValid()) {
          normalizedPhone = parsedWithDefault.format('E.164');
        } else {
          return res.status(400).json({
            success: false,
            message: 'Please enter a valid phone number.'
          });
        }
      }
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid phone number.'
      });
    }

    // 3. Prevent duplicate email or phone (409 Conflict)
    const ownerExists = await Owner.findOne({ email: normalizedEmail });
    const tenantExists = await Tenant.findOne({ email: normalizedEmail });

    if (ownerExists || tenantExists) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const phoneInOwner = await Owner.findOne({ contactNumber: { $in: [normalizedPhone, rawContact] } });
    const phoneInTenant = await Tenant.findOne({ phone: { $in: [normalizedPhone, rawContact] } });
    if (phoneInOwner || phoneInTenant) {
      return res.status(409).json({ success: false, message: 'This phone number is already registered.' });
    }

    // 4. SMTP check & auto-verification in dev mode
    const isSmtpConfigured = !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
    const autoVerify = !isSmtpConfigured || process.env.NODE_ENV === 'development';

    const verificationToken = autoVerify ? undefined : crypto.randomBytes(20).toString('hex');

    const owner = await Owner.create({
      name,
      email: normalizedEmail,
      password,
      contactNumber: normalizedPhone,
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

// @desc    Register Resident Tenant
// @route   POST /api/v1/auth/register-tenant
// @access  Public
exports.registerTenant = async (req, res, next) => {
  try {
    const { name, email, password, phone, contactNumber } = req.body;
    const tenantPhone = phone || contactNumber;

    // 1. Validation
    if (!name || !email || !password || !tenantPhone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (name, email, password, phone number).'
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

    // 2. Validate & Normalize Phone Number
    const rawPhone = (typeof tenantPhone === 'string' ? tenantPhone : '').trim();
    let normalizedPhone = rawPhone;
    try {
      const parsed = parsePhoneNumberFromString(rawPhone);
      if (parsed && parsed.isValid()) {
        normalizedPhone = parsed.format('E.164');
      } else {
        const parsedWithDefault = parsePhoneNumberFromString(rawPhone, 'IN');
        if (parsedWithDefault && parsedWithDefault.isValid()) {
          normalizedPhone = parsedWithDefault.format('E.164');
        } else {
          return res.status(400).json({
            success: false,
            message: 'Please enter a valid phone number.'
          });
        }
      }
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid phone number.'
      });
    }

    // 3. Prevent duplicate email or phone (409 Conflict) across both Owners and Tenants
    const normalizedEmail = email.toLowerCase().trim();
    const ownerExists = await Owner.findOne({ email: normalizedEmail });
    const tenantExists = await Tenant.findOne({ email: normalizedEmail });

    if (ownerExists || tenantExists) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    const phoneInOwner = await Owner.findOne({ contactNumber: { $in: [normalizedPhone, rawPhone] } });
    const phoneInTenant = await Tenant.findOne({ phone: { $in: [normalizedPhone, rawPhone] } });
    if (phoneInOwner || phoneInTenant) {
      return res.status(409).json({
        success: false,
        message: 'This phone number is already registered.'
      });
    }

    // 4. Locate system Owner to link tenant
    const systemOwner = await Owner.findOne();
    if (!systemOwner) {
      return res.status(500).json({
        success: false,
        message: 'System owner account not configured. Please contact administrator.'
      });
    }

    // 5. Create tenant - strictly enforce role = 'tenant' on backend!
    const tenant = await Tenant.create({
      name: name.trim(),
      email: normalizedEmail,
      password, // hashed automatically via TenantSchema pre('save')
      phone: normalizedPhone,
      owner: systemOwner._id,
      role: 'tenant', // strictly forced by backend, ignores any req.body.role
      isActive: true,
      verified: true
    });

    // 5. Write audit trail
    await logActivity(tenant._id, 'Tenant', 'Registration', `Tenant ${tenant.email} registered publicly.`, req);

    res.status(201).json({
      success: true,
      autoVerified: true,
      message: 'Resident tenant account created successfully! You can now log in.'
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

    const normalizedEmail = (typeof email === 'string' ? email : '').trim().toLowerCase();
    const owner = await Owner.findOne({ email: normalizedEmail }).select('+password');

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

    const normalizedEmail = (typeof email === 'string' ? email : '').trim().toLowerCase();
    const tenant = await Tenant.findOne({ email: normalizedEmail }).select('+password');

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const isMatch = await tenant.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    if (!tenant.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Please contact your property owner.' });
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
    const email = (typeof req.body.email === 'string' ? req.body.email : '').trim().toLowerCase();

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
    const rawContact = req.body.contactNumber || req.body.phone;
    let normalizedPhone = undefined;

    if (rawContact) {
      const cleanRaw = String(rawContact).trim();
      try {
        const parsed = parsePhoneNumberFromString(cleanRaw);
        if (parsed && parsed.isValid()) {
          normalizedPhone = parsed.format('E.164');
        } else {
          const parsedWithDefault = parsePhoneNumberFromString(cleanRaw, 'IN');
          if (parsedWithDefault && parsedWithDefault.isValid()) {
            normalizedPhone = parsedWithDefault.format('E.164');
          } else {
            return res.status(400).json({
              success: false,
              message: 'Please enter a valid phone number.'
            });
          }
        }
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid phone number.'
        });
      }

      // Check if phone changed and is taken by another user
      const currentPhone = req.user.contactNumber || req.user.phone;
      if (normalizedPhone !== currentPhone) {
        const phoneInOwner = await Owner.findOne({ _id: { $ne: req.user._id }, contactNumber: normalizedPhone });
        const phoneInTenant = await Tenant.findOne({ _id: { $ne: req.user._id }, phone: normalizedPhone });
        if (phoneInOwner || phoneInTenant) {
          return res.status(409).json({
            success: false,
            message: 'This phone number is already registered by another account.'
          });
        }
      }
    }

    const fieldsToUpdate = {
      name: req.body.name || req.user.name,
      contactNumber: normalizedPhone || req.user.contactNumber || req.user.phone,
      address: req.body.address !== undefined ? req.body.address : (req.user.address || '')
    };
    if (req.body.profilePhoto) {
      fieldsToUpdate.profilePhoto = req.body.profilePhoto;
    }

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
    if (!uploadResult || !uploadResult.url) {
      return res.status(500).json({ success: false, message: 'Failed to process uploaded photo' });
    }

    let updatedUser;
    if (req.userRole === 'owner') {
      updatedUser = await Owner.findByIdAndUpdate(
        req.user._id,
        { profilePhoto: uploadResult.url },
        { new: true, runValidators: true }
      );
      if (!updatedUser) {
        return res.status(404).json({ success: false, message: 'Owner user not found' });
      }
      await logActivity(updatedUser._id, 'Owner', 'Profile Photo Upload', 'Owner uploaded profile photo.', req);
    } else {
      updatedUser = await Tenant.findByIdAndUpdate(
        req.user._id,
        { profilePhoto: uploadResult.url },
        { new: true, runValidators: true }
      );
      if (!updatedUser) {
        return res.status(404).json({ success: false, message: 'Tenant user not found' });
      }
      await logActivity(updatedUser._id, 'Tenant', 'Profile Photo Upload', 'Tenant uploaded profile photo.', req);
    }

    res.status(200).json({
      success: true,
      url: uploadResult.url,
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: req.userRole || updatedUser.role,
        profilePhoto: updatedUser.profilePhoto,
        contactNumber: updatedUser.contactNumber || updatedUser.phone || '',
        address: updatedUser.address || '',
        verified: updatedUser.verified !== undefined ? updatedUser.verified : true
      }
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
      return res.status(403).json({ success: false, message: 'Primary Owner account is protected and cannot be deleted.' });
    } else {
      return res.status(400).json({ success: false, message: 'Tenants cannot delete their own account. Please contact your Landlord.' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Clean all demo data (Properties, Apartments, Tenants, Bills, Payments, Maintenance, Notifications)
// @route   POST /api/v1/auth/clean-demo-data
// @access  Private (Owner only)
exports.cleanDemoData = async (req, res, next) => {
  try {
    const Property = require('../models/Property');
    const Apartment = require('../models/Apartment');
    const Tenant = require('../models/Tenant');
    const Bill = require('../models/Bill');
    const Payment = require('../models/Payment');
    const Maintenance = require('../models/Maintenance');
    const Notification = require('../models/Notification');
    const AuditLog = require('../models/AuditLog');

    const tenantResult = await Tenant.deleteMany({});
    const propResult = await Property.deleteMany({});
    const aptResult = await Apartment.deleteMany({});
    const billResult = await Bill.deleteMany({});
    const paymentResult = await Payment.deleteMany({});
    const maintResult = await Maintenance.deleteMany({});
    const notifResult = await Notification.deleteMany({});
    const auditResult = await AuditLog.deleteMany({});

    // Ensure only the current owner is kept
    await Owner.deleteMany({ _id: { $ne: req.user._id } });

    res.status(200).json({
      success: true,
      message: 'Demo data cleaned successfully. Single owner account preserved.',
      summary: {
        tenantsDeleted: tenantResult.deletedCount,
        propertiesDeleted: propResult.deletedCount,
        apartmentsDeleted: aptResult.deletedCount,
        billsDeleted: billResult.deletedCount,
        paymentsDeleted: paymentResult.deletedCount,
        maintenanceDeleted: maintResult.deletedCount,
        notificationsDeleted: notifResult.deletedCount,
        auditLogsDeleted: auditResult.deletedCount
      }
    });
  } catch (error) {
    next(error);
  }
};

