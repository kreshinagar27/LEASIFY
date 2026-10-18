const mongoose = require('mongoose');
const Tenant = require('../models/Tenant');
const Property = require('../models/Property');
const Bill = require('../models/Bill');
const Payment = require('../models/Payment');
const Maintenance = require('../models/Maintenance');
const Notification = require('../models/Notification');
const logActivity = require('../utils/activityLogger');
const { sendTenantWelcomeEmail } = require('../utils/emailService');
const { sendSMS } = require('../utils/smsService');
const { uploadToStorage } = require('../utils/uploader');

// Helper to generate a random temporary password
const generateTempPassword = () => {
  return 'Leasify@' + Math.floor(100000 + Math.random() * 900000);
};

// @desc    Add Tenant & Onboard
// @route   POST /api/v1/tenants
// @access  Private (Owner Only)
exports.addTenant = async (req, res, next) => {
  try {
    const {
      name, email, phone, password, tempPassword: customTempPassword,
      gender, unitNumber, occupation, aadhaarNumber, panNumber,
      emergencyName, emergencyPhone, emergencyRelation,
      propertyAssigned, monthlyRent, securityDeposit,
      leaseStartDate, leaseEndDate,
      electricityReading, waterReading, depositCollected, keyHandoverConfirmed
    } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Name, email, and phone are required.' });
    }

    // Check if email already exists
    const emailExists = await Tenant.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ success: false, message: 'Email already registered as a tenant' });
    }

    // Determine password
    const finalPassword = password || customTempPassword || generateTempPassword();

    let property = null;
    if (propertyAssigned && mongoose.Types.ObjectId.isValid(propertyAssigned)) {
      property = await Property.findById(propertyAssigned);
    }

    // Create Tenant
    const tenant = await Tenant.create({
      name,
      email,
      password: finalPassword,
      phone,
      gender: gender || 'Unspecified',
      unitNumber: unitNumber || '',
      occupation: occupation || '',
      aadhaarNumber: aadhaarNumber || ('Aadhaar-' + Math.floor(100000000000 + Math.random() * 900000000000)),
      panNumber: panNumber || '',
      emergencyContact: {
        name: emergencyName || '',
        phone: emergencyPhone || '',
        relationship: emergencyRelation || ''
      },
      owner: req.user.id,
      propertyAssigned: property ? property._id : null,
      monthlyRent: parseFloat(monthlyRent) || (property ? property.monthlyRent : 0),
      securityDeposit: parseFloat(securityDeposit) || (property ? property.securityDeposit : 0),
      leaseStartDate: leaseStartDate ? new Date(leaseStartDate) : new Date(),
      leaseEndDate: leaseEndDate ? new Date(leaseEndDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      verified: true,
      isActive: true,
      moveInDetails: {
        meterReadings: {
          electricity: parseFloat(electricityReading) || 0,
          water: parseFloat(waterReading) || 0
        },
        depositCollected: depositCollected === 'true' || depositCollected === true,
        keyHandoverConfirmed: keyHandoverConfirmed === 'true' || keyHandoverConfirmed === true
      }
    });

    // Update Property Status if assigned
    if (property) {
      property.status = 'Occupied';
      property.tenant = tenant._id;
      await property.save();
    }

    // Send Welcome Email
    try {
      await sendTenantWelcomeEmail(tenant, finalPassword);
    } catch (err) {
      console.error('Welcome email notification note:', err.message);
    }
    // Send SMS with temporary password
    try {
      await sendSMS(tenant.phone, `Your temporary password is: ${finalPassword}`);
    } catch (err) {
      console.error('SMS sending error:', err.message);
    }

    await logActivity(
      req.user.id,
      'Owner',
      'Tenant Added',
      `Tenant '${tenant.name}' was created and assigned to ${property ? property.name : 'No Property'}.`,
      req
    );

    res.status(201).json({
      success: true,
      data: tenant,
      tempPassword: finalPassword
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All Tenants for Owner
// @route   GET /api/v1/tenants
// @access  Private (Owner Only)
exports.getTenants = async (req, res, next) => {
  try {
    const tenants = await Tenant.find({ owner: req.user.id }).populate('propertyAssigned', 'name address status');
    res.status(200).json({
      success: true,
      count: tenants.length,
      data: tenants
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Single Tenant Details
// @route   GET /api/v1/tenants/:id
// @access  Private (Owner & Tenant Himself)
exports.getTenant = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Tenant ID' });
    }

    const tenant = await Tenant.findById(req.params.id).populate('propertyAssigned', 'name address monthlyRent securityDeposit');

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    res.status(200).json({
      success: true,
      data: tenant
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Tenant Details
// @route   PUT /api/v1/tenants/:id
// @access  Private (Owner Only)
exports.updateTenant = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Tenant ID' });
    }

    let tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    if (tenant.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this tenant' });
    }

    const {
      name, email, phone, gender, unitNumber, occupation, panNumber, aadhaarNumber,
      monthlyRent, securityDeposit, leaseStartDate, leaseEndDate,
      emergencyName, emergencyPhone, emergencyRelation, propertyAssigned, isActive
    } = req.body;

    if (name) tenant.name = name;
    if (email) tenant.email = email;
    if (phone) tenant.phone = phone;
    if (gender) tenant.gender = gender;
    if (unitNumber !== undefined) tenant.unitNumber = unitNumber;
    if (occupation !== undefined) tenant.occupation = occupation;
    if (panNumber !== undefined) tenant.panNumber = panNumber;
    if (aadhaarNumber !== undefined) tenant.aadhaarNumber = aadhaarNumber;
    if (monthlyRent !== undefined) tenant.monthlyRent = parseFloat(monthlyRent);
    if (securityDeposit !== undefined) tenant.securityDeposit = parseFloat(securityDeposit);
    if (leaseStartDate) tenant.leaseStartDate = new Date(leaseStartDate);
    if (leaseEndDate) tenant.leaseEndDate = new Date(leaseEndDate);
    if (isActive !== undefined) tenant.isActive = isActive === 'true' || isActive === true;

    if (emergencyName !== undefined || emergencyPhone !== undefined || emergencyRelation !== undefined) {
      tenant.emergencyContact = {
        name: emergencyName !== undefined ? emergencyName : (tenant.emergencyContact ? tenant.emergencyContact.name : ''),
        phone: emergencyPhone !== undefined ? emergencyPhone : (tenant.emergencyContact ? tenant.emergencyContact.phone : ''),
        relationship: emergencyRelation !== undefined ? emergencyRelation : (tenant.emergencyContact ? tenant.emergencyContact.relationship : '')
      };
    }

    // Property assignment changes
    if (propertyAssigned !== undefined) {
      const oldPropertyId = tenant.propertyAssigned ? tenant.propertyAssigned.toString() : null;
      const newPropertyId = propertyAssigned && mongoose.Types.ObjectId.isValid(propertyAssigned) ? propertyAssigned : null;

      if (oldPropertyId !== newPropertyId) {
        if (oldPropertyId) {
          const oldProp = await Property.findById(oldPropertyId);
          if (oldProp) {
            oldProp.status = 'Vacant';
            oldProp.tenant = null;
            await oldProp.save();
          }
        }
        if (newPropertyId) {
          const newProp = await Property.findById(newPropertyId);
          if (newProp) {
            newProp.status = 'Occupied';
            newProp.tenant = tenant._id;
            await newProp.save();
          }
        }
        tenant.propertyAssigned = newPropertyId;
      }
    }

    await tenant.save();

    await logActivity(req.user.id, 'Owner', 'Tenant Updated', `Tenant details for '${tenant.name}' were updated.`, req);

    const updatedTenant = await Tenant.findById(tenant._id).populate('propertyAssigned', 'name address status');

    res.status(200).json({
      success: true,
      data: updatedTenant
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Tenant Password (Owner Only)
// @route   PUT /api/v1/tenants/:id/reset-password
// @access  Private (Owner Only)
exports.resetTenantPassword = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Tenant ID' });
    }

    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    if (tenant.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    tenant.password = newPassword;
    await tenant.save();

    await logActivity(req.user.id, 'Owner', 'Tenant Password Reset', `Owner reset password for Tenant '${tenant.name}'.`, req);

    res.status(200).json({
      success: true,
      message: `Password for Tenant '${tenant.name}' updated successfully.`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle Tenant Active Status
// @route   PUT /api/v1/tenants/:id/toggle-status
// @access  Private (Owner Only)
exports.toggleTenantStatus = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Tenant ID' });
    }

    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    if (tenant.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    tenant.isActive = !tenant.isActive;
    await tenant.save();

    res.status(200).json({
      success: true,
      message: `Tenant status changed to ${tenant.isActive ? 'Active' : 'Inactive'}`,
      data: tenant
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Renew Tenant Lease
// @route   PUT /api/v1/tenants/:id/renew
// @access  Private (Owner Only)
exports.renewLease = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Tenant ID' });
    }

    const { leaseStartDate, leaseEndDate, monthlyRent } = req.body;
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    if (tenant.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    tenant.leaseRenewals.push({
      startDate: tenant.leaseStartDate,
      endDate: tenant.leaseEndDate,
      rentAmount: tenant.monthlyRent
    });

    tenant.leaseStartDate = leaseStartDate;
    tenant.leaseEndDate = leaseEndDate;
    if (monthlyRent) {
      tenant.monthlyRent = monthlyRent;
      if (tenant.propertyAssigned) {
        await Property.findByIdAndUpdate(tenant.propertyAssigned, { monthlyRent });
      }
    }

    await tenant.save();

    await logActivity(req.user.id, 'Owner', 'Lease Renewed', `Lease for Tenant '${tenant.name}' was renewed.`, req);

    res.status(200).json({
      success: true,
      data: tenant
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Tenant Move-Out Workflow
// @route   POST /api/v1/tenants/:id/move-out
// @access  Private (Owner Only)
exports.moveOutTenant = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Tenant ID' });
    }

    const {
      electricityReading, waterReading, damageInspectionNotes, refundCalculated, pendingDuesSettled
    } = req.body;

    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    if (tenant.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!tenant.propertyAssigned) {
      return res.status(400).json({ success: false, message: 'Tenant is not currently assigned to any property' });
    }

    const propertyId = tenant.propertyAssigned;

    tenant.moveOutDetails = {
      meterReadings: {
        electricity: parseFloat(electricityReading) || 0,
        water: parseFloat(waterReading) || 0
      },
      damageInspectionNotes: damageInspectionNotes || '',
      refundCalculated: parseFloat(refundCalculated) || 0,
      pendingDuesSettled: pendingDuesSettled === 'true' || pendingDuesSettled === true,
      moveOutDate: Date.now()
    };

    tenant.propertyAssigned = null;
    tenant.isActive = false;
    await tenant.save();

    const property = await Property.findById(propertyId);
    if (property) {
      property.status = 'Vacant';
      property.tenant = null;
      await property.save();
    }

    await logActivity(req.user.id, 'Owner', 'Move-Out Processed', `Move-out processed for Tenant '${tenant.name}'.`, req);

    res.status(200).json({
      success: true,
      message: 'Move-out workflow processed successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload Tenant Document
// @route   POST /api/v1/tenants/:id/documents
// @access  Private (Owner & Tenant Himself)
exports.uploadDocument = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Tenant ID' });
    }

    const { documentName, fileType } = req.body;
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    if (req.userRole === 'owner' && tenant.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (req.userRole === 'tenant' && tenant._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    const uploadResult = await uploadToStorage(req.file, 'documents');

    tenant.uploadedDocs.push({
      name: documentName || req.file.originalname,
      url: uploadResult.url,
      fileType: fileType || 'Other',
      publicId: uploadResult.publicId
    });

    if (fileType === 'Lease') {
      tenant.leaseAgreementUrl = uploadResult.url;
    }

    await tenant.save();

    await logActivity(
      req.user.id,
      req.userRole === 'owner' ? 'Owner' : 'Tenant',
      'Document Uploaded',
      `Document '${documentName || req.file.originalname}' uploaded for Tenant '${tenant.name}'.`,
      req
    );

    res.status(200).json({
      success: true,
      data: tenant.uploadedDocs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deactivate or Delete Tenant
// @route   DELETE /api/v1/tenants/:id
// @access  Private (Owner Only)
exports.deactivateTenant = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Tenant ID' });
    }

    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    if (tenant.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const forceDelete = req.query.force === 'true' || req.query.permanent === 'true' || req.body.force === true;

    if (forceDelete) {
      if (tenant.propertyAssigned) {
        const prop = await Property.findById(tenant.propertyAssigned);
        if (prop) {
          prop.status = 'Vacant';
          prop.tenant = null;
          await prop.save();
        }
      }
      await Tenant.findByIdAndDelete(req.params.id);
      await logActivity(req.user.id, 'Owner', 'Tenant Deleted', `Tenant '${tenant.name}' was permanently deleted.`, req);
      return res.status(200).json({
        success: true,
        message: 'Tenant permanently deleted from database.'
      });
    }

    // Soft delete / deactivate
    if (tenant.propertyAssigned) {
      const prop = await Property.findById(tenant.propertyAssigned);
      if (prop) {
        prop.status = 'Vacant';
        prop.tenant = null;
        await prop.save();
      }
      tenant.propertyAssigned = null;
    }

    tenant.isActive = false;
    await tenant.save();

    await logActivity(req.user.id, 'Owner', 'Tenant Deactivated', `Tenant '${tenant.name}' was deactivated.`, req);

    res.status(200).json({
      success: true,
      message: 'Tenant deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};
