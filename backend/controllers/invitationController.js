const crypto = require('crypto');
const mongoose = require('mongoose');
const Invitation = require('../models/Invitation');
const Property = require('../models/Property');
const Apartment = require('../models/Apartment');
const Owner = require('../models/Owner');
const Tenant = require('../models/Tenant');
const { sendTenantInvitationEmail } = require('../utils/emailService');
const logActivity = require('../utils/activityLogger');

/**
 * @desc    Create a new tenant invitation (Owner only)
 * @route   POST /api/v1/invitations
 * @access  Private (Owner Only)
 */
exports.createInvitation = async (req, res, next) => {
  try {
    const {
      email,
      property: propertyInput,
      propertyId,
      apartment: apartmentInput,
      apartmentId,
      unitNumber,
      monthlyRent,
      securityDeposit
    } = req.body;

    // 1. Email validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Tenant email is required to create an invitation.'
      });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    const normalizedEmail = email.toLowerCase().trim();
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    // 2. Prevent invitation for already registered user
    const existingOwner = await Owner.findOne({ email: normalizedEmail });
    const existingTenant = await Tenant.findOne({ email: normalizedEmail });
    if (existingOwner || existingTenant) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists in the system.'
      });
    }

    // 3. Property & Apartment authorization
    const targetPropertyId = propertyId || propertyInput;
    const targetApartmentId = apartmentId || apartmentInput;

    let property = null;
    let apartment = null;

    if (targetPropertyId && mongoose.Types.ObjectId.isValid(targetPropertyId)) {
      property = await Property.findById(targetPropertyId);
      if (!property) {
        return res.status(404).json({
          success: false,
          message: 'Specified property not found.'
        });
      }

      // Strictly verify authenticated owner owns this property
      if (property.owner.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to create invitations for this property.'
        });
      }
    }

    if (targetApartmentId && mongoose.Types.ObjectId.isValid(targetApartmentId)) {
      apartment = await Apartment.findById(targetApartmentId);
      if (!apartment) {
        return res.status(404).json({
          success: false,
          message: 'Specified apartment not found.'
        });
      }

      // Check apartment belongs to the verified property or verify owner controls its parent property
      if (property && apartment.property.toString() !== property._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Selected apartment does not belong to the selected property.'
        });
      }

      if (!property) {
        property = await Property.findById(apartment.property);
        if (!property || property.owner.toString() !== req.user.id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'You are not authorized to create invitations for this apartment.'
          });
        }
      }
    }

    // 4. Supersede any existing pending invitations for this email from this owner
    await Invitation.updateMany(
      {
        email: normalizedEmail,
        owner: req.user.id,
        status: 'pending'
      },
      {
        $set: { status: 'revoked' }
      }
    );

    // 5. Generate secure token & hash
    const { rawToken, tokenHash, expiresAt } = Invitation.generateToken();

    // 6. Calculate rent, deposit, and unitNumber
    const calcRent = parseFloat(monthlyRent) || (apartment ? apartment.monthlyRent : (property ? property.monthlyRent : 0));
    const calcDeposit = parseFloat(securityDeposit) || (apartment ? apartment.securityDeposit : (property ? property.securityDeposit : 0));
    const finalUnitNumber = (unitNumber || (apartment ? apartment.number : '')).trim();

    // 7. Store invitation with tokenHash (NEVER rawToken)
    const invitation = await Invitation.create({
      email: normalizedEmail,
      owner: req.user.id,
      property: property ? property._id : null,
      apartment: apartment ? apartment._id : null,
      unitNumber: finalUnitNumber,
      monthlyRent: calcRent,
      securityDeposit: calcDeposit,
      tokenHash,
      status: 'pending',
      expiresAt
    });

    // 8. Attempt email delivery
    const isSmtpConfigured = !!(
      process.env.GMAIL_USER ||
      (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS)
    );

    let emailDelivered = false;
    let emailMessage = '';
    try {
      const mailRes = await sendTenantInvitationEmail({
        email: normalizedEmail,
        rawToken,
        ownerName: req.user.name,
        propertyName: property ? property.name : '',
        unitNumber: finalUnitNumber,
        expiresAt
      });
      emailDelivered = !mailRes?.simulator;
      emailMessage = mailRes?.simulator
        ? 'Email simulator processed delivery locally.'
        : 'Invitation email successfully dispatched.';
    } catch (mailErr) {
      emailDelivered = false;
      emailMessage = `Email delivery error: ${mailErr.message}`;
    }

    // Audit log
    await logActivity(
      req.user.id,
      'Owner',
      'Tenant Invitation',
      `Invitation created for ${normalizedEmail} (Property: ${property ? property.name : 'None'})`,
      req
    );

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteUrl = `${baseUrl}/register-tenant?token=${rawToken}`;

    res.status(201).json({
      success: true,
      message: isSmtpConfigured && emailDelivered
        ? 'Invitation created and sent via email.'
        : 'Invitation created. Email delivery is simulated or unconfigured; invitation link generated.',
      data: {
        id: invitation._id,
        email: invitation.email,
        property: property ? { _id: property._id, name: property.name } : null,
        apartment: apartment ? { _id: apartment._id, number: apartment.number } : null,
        unitNumber: invitation.unitNumber,
        monthlyRent: invitation.monthlyRent,
        securityDeposit: invitation.securityDeposit,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        emailDelivered,
        emailMessage,
        isSmtpConfigured,
        inviteUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all invitations created by the authenticated owner
 * @route   GET /api/v1/invitations
 * @access  Private (Owner Only)
 */
exports.getInvitations = async (req, res, next) => {
  try {
    const invitations = await Invitation.find({ owner: req.user.id })
      .select('-tokenHash') // Strictly exclude token hashes from listing
      .populate('property', 'name type address')
      .populate('apartment', 'number floor')
      .populate('tenant', 'name email phone')
      .sort({ createdAt: -1 });

    // Mark any passed-deadline pending invitations as expired
    const now = new Date();
    const updatedInvitations = invitations.map((inv) => {
      const obj = inv.toObject ? inv.toObject() : inv;
      if (obj.status === 'pending' && new Date(obj.expiresAt) < now) {
        obj.status = 'expired';
      }
      return obj;
    });

    res.status(200).json({
      success: true,
      count: updatedInvitations.length,
      data: updatedInvitations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single invitation details (Owner only)
 * @route   GET /api/v1/invitations/:id
 * @access  Private (Owner Only)
 */
exports.getInvitation = async (req, res, next) => {
  try {
    const invitation = await Invitation.findById(req.params.id)
      .select('-tokenHash')
      .populate('property', 'name type address')
      .populate('apartment', 'number floor')
      .populate('tenant', 'name email phone');

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found.'
      });
    }

    if (invitation.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this invitation.'
      });
    }

    res.status(200).json({
      success: true,
      data: invitation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Revoke an invitation (Owner only)
 * @route   POST /api/v1/invitations/:id/revoke
 * @access  Private (Owner Only)
 */
exports.revokeInvitation = async (req, res, next) => {
  try {
    const invitation = await Invitation.findById(req.params.id);

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found.'
      });
    }

    if (invitation.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to revoke this invitation.'
      });
    }

    if (invitation.status === 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Cannot revoke an invitation that has already been accepted.'
      });
    }

    invitation.status = 'revoked';
    await invitation.save();

    await logActivity(
      req.user.id,
      'Owner',
      'Invitation Revoked',
      `Invitation for ${invitation.email} was revoked.`,
      req
    );

    res.status(200).json({
      success: true,
      message: 'Invitation revoked successfully.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend an invitation with a fresh token & reset expiration
 * @route   POST /api/v1/invitations/:id/resend
 * @access  Private (Owner Only)
 */
exports.resendInvitation = async (req, res, next) => {
  try {
    const invitation = await Invitation.findById(req.params.id);

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found.'
      });
    }

    if (invitation.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to manage this invitation.'
      });
    }

    if (invitation.status === 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Cannot resend an invitation that has already been accepted.'
      });
    }

    // Generate fresh token
    const { rawToken, tokenHash, expiresAt } = Invitation.generateToken();

    invitation.tokenHash = tokenHash;
    invitation.expiresAt = expiresAt;
    invitation.status = 'pending';
    await invitation.save();

    // Fetch property name for email
    let propertyName = '';
    if (invitation.property) {
      const prop = await Property.findById(invitation.property);
      if (prop) propertyName = prop.name;
    }

    // Deliver email
    let emailDelivered = false;
    let emailMessage = '';
    try {
      const mailRes = await sendTenantInvitationEmail({
        email: invitation.email,
        rawToken,
        ownerName: req.user.name,
        propertyName,
        unitNumber: invitation.unitNumber,
        expiresAt
      });
      emailDelivered = !mailRes?.simulator;
      emailMessage = mailRes?.simulator
        ? 'Email simulator processed delivery locally.'
        : 'Invitation email successfully resent.';
    } catch (mailErr) {
      emailDelivered = false;
      emailMessage = `Email delivery error: ${mailErr.message}`;
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteUrl = `${baseUrl}/register-tenant?token=${rawToken}`;

    res.status(200).json({
      success: true,
      message: 'Invitation resent successfully with a new expiration date.',
      data: {
        id: invitation._id,
        email: invitation.email,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        emailDelivered,
        emailMessage,
        inviteUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Validate an invitation token for registration (Public)
 * @route   GET /api/v1/invitations/validate?token=...
 * @access  Public
 */
exports.validateInvitationToken = async (req, res, next) => {
  try {
    const rawToken = req.query.token;

    if (!rawToken || typeof rawToken !== 'string' || !rawToken.trim()) {
      return res.status(400).json({
        success: false,
        valid: false,
        reason: 'missing_token',
        message: 'Invitation token is required.'
      });
    }

    const tokenHash = Invitation.hashToken(rawToken);

    const invitation = await Invitation.findOne({ tokenHash })
      .populate('owner', 'name email contactNumber')
      .populate('property', 'name address type')
      .populate('apartment', 'number floor');

    if (!invitation) {
      return res.status(404).json({
        success: false,
        valid: false,
        reason: 'not_found',
        message: 'Invalid invitation link. This invitation token does not exist.'
      });
    }

    if (invitation.status === 'revoked') {
      return res.status(400).json({
        success: false,
        valid: false,
        reason: 'revoked',
        message: 'This invitation has been revoked by the property owner.'
      });
    }

    if (invitation.status === 'accepted') {
      return res.status(400).json({
        success: false,
        valid: false,
        reason: 'already_used',
        message: 'This invitation has already been used to register an account.'
      });
    }

    if (new Date() > new Date(invitation.expiresAt) || invitation.status === 'expired') {
      if (invitation.status !== 'expired') {
        invitation.status = 'expired';
        await invitation.save();
      }
      return res.status(400).json({
        success: false,
        valid: false,
        reason: 'expired',
        message: 'This invitation has expired. Please contact the property owner for a new invitation.'
      });
    }

    // Valid pending invitation
    res.status(200).json({
      success: true,
      valid: true,
      data: {
        email: invitation.email,
        ownerName: invitation.owner ? invitation.owner.name : 'Property Owner',
        propertyName: invitation.property ? invitation.property.name : null,
        propertyAddress: invitation.property ? invitation.property.address : null,
        unitNumber: invitation.unitNumber || (invitation.apartment ? invitation.apartment.number : ''),
        monthlyRent: invitation.monthlyRent,
        securityDeposit: invitation.securityDeposit,
        expiresAt: invitation.expiresAt
      }
    });
  } catch (error) {
    next(error);
  }
};
