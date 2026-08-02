const mongoose = require('mongoose');
const Tenant = require('../models/Tenant');
const Property = require('../models/Property');
const Bill = require('../models/Bill');
const Payment = require('../models/Payment');
const Maintenance = require('../models/Maintenance');
const Notification = require('../models/Notification');
const logActivity = require('../utils/activityLogger');
const { sendTenantWelcomeEmail } = require('../utils/emailService');
const { uploadToStorage, deleteFromStorage } = require('../utils/uploader');

// Helper to generate a random temporary password
const generateTempPassword = () => {
  return 'Leasify@' + Math.floor(100000 + Math.random() * 900000);
};

// @desc    Add Tenant & Onboard (Trigger Move-In)
// @route   POST /api/v1/tenants
// @access  Private (Owner Only)
exports.addTenant = async (req, res, next) => {
  try {
    const {
      name, email, phone, occupation, aadhaarNumber, panNumber,
      emergencyName, emergencyPhone, emergencyRelation,
      propertyAssigned, monthlyRent, securityDeposit,
      leaseStartDate, leaseEndDate,
      electricityReading, waterReading, depositCollected, keyHandoverConfirmed
    } = req.body;

    // Check if email already exists
    const emailExists = await Tenant.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ success: false, message: 'Email already registered as a tenant' });
    }

    // Verify property exists and is vacant
    const property = await Property.findById(propertyAssigned);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    if (property.status !== 'Vacant' && property.status !== 'Reserved') {
      return res.status(400).json({ success: false, message: `Property is currently ${property.status}` });
    }

    // Generate temp password
    const tempPassword = generateTempPassword();

    // Create Tenant
    const tenant = await Tenant.create({
      name,
      email,
      password: tempPassword,
      phone,
      occupation,
      aadhaarNumber,
      panNumber,
      emergencyContact: {
        name: emergencyName || '',
        phone: emergencyPhone || '',
        relationship: emergencyRelation || ''
      },
      owner: req.user.id,
      propertyAssigned,
      monthlyRent,
      securityDeposit,
      leaseStartDate,
      leaseEndDate,
      moveInDetails: {
        meterReadings: {
          electricity: parseFloat(electricityReading) || 0,
          water: parseFloat(waterReading) || 0
        },
        depositCollected: depositCollected === 'true' || depositCollected === true,
        keyHandoverConfirmed: keyHandoverConfirmed === 'true' || keyHandoverConfirmed === true
      }
    });

    // Update Property Status
    property.status = 'Occupied';
    property.tenant = tenant._id;
    await property.save();

    // Send Welcome Email
    try {
      await sendTenantWelcomeEmail(tenant, tempPassword);
    } catch (err) {
      console.error('Welcome email failed to send:', err.message);
    }

    // In-App Notification
    await Notification.create({
      user: tenant._id,
      userModel: 'Tenant',
      title: 'Welcome to Leasify!',
      message: `Your account has been created by your landlord. Your assigned property is ${property.name}.`,
      category: 'system'
    });

    await logActivity(req.user.id, 'Owner', 'Tenant Added', `Tenant '${tenant.name}' was assigned to Property '${property.name}'.`, req);

    res.status(201).json({
      success: true,
      data: tenant,
      tempPassword // Send back so owner can copy it manually if email fails
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All Tenants
// @route   GET /api/v1/tenants
// @access  Private (Owner Only)
exports.getTenants = async (req, res, next) => {
  try {
    const tenants = await Tenant.find({ owner: req.user.id }).populate('propertyAssigned', 'name address');
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

    // Auth validation
    if (req.userRole === 'owner' && tenant.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this tenant' });
    }
    if (req.userRole === 'tenant' && tenant._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this profile' });
    }

    // Fetch related records
    const bills = await Bill.find({ tenant: tenant._id }).sort({ createdAt: -1 });
    const payments = await Payment.find({ tenant: tenant._id }).sort({ createdAt: -1 });
    const complaints = await Maintenance.find({ tenant: tenant._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: tenant,
      history: {
        bills,
        payments,
        complaints
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Tenant profile details
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
      name, phone, occupation, panNumber, emergencyName, emergencyPhone, emergencyRelation
    } = req.body;

    const updateData = {
      name: name || tenant.name,
      phone: phone || tenant.phone,
      occupation: occupation || tenant.occupation,
      panNumber: panNumber || tenant.panNumber,
      emergencyContact: {
        name: emergencyName || tenant.emergencyContact.name,
        phone: emergencyPhone || tenant.emergencyContact.phone,
        relationship: emergencyRelation || tenant.emergencyContact.relationship
      }
    };

    tenant = await Tenant.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    await logActivity(req.user.id, 'Owner', 'Tenant Updated', `Tenant details for '${tenant.name}' were updated.`, req);

    res.status(200).json({
      success: true,
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

    // Store history of renewal
    tenant.leaseRenewals.push({
      startDate: tenant.leaseStartDate,
      endDate: tenant.leaseEndDate,
      rentAmount: tenant.monthlyRent
    });

    tenant.leaseStartDate = leaseStartDate;
    tenant.leaseEndDate = leaseEndDate;
    if (monthlyRent) {
      tenant.monthlyRent = monthlyRent;
      // Also update monthly rent on property if assigned
      if (tenant.propertyAssigned) {
        await Property.findByIdAndUpdate(tenant.propertyAssigned, { monthlyRent });
      }
    }

    await tenant.save();

    // Create Notification
    await Notification.create({
      user: tenant._id,
      userModel: 'Tenant',
      title: 'Lease Agreement Renewed',
      message: `Your lease has been renewed until ${new Date(leaseEndDate).toLocaleDateString()}. New rent: INR ${tenant.monthlyRent}.`,
      category: 'lease'
    });

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

    // Save Move Out Records
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

    // Update Property to Vacant
    await Property.findByIdAndUpdate(propertyId, {
      status: 'Vacant',
      tenant: null
    });

    // Create Notification
    await Notification.create({
      user: tenant._id,
      userModel: 'Tenant',
      title: 'Move-Out Settled',
      message: 'Your lease has been ended. Your security deposit settlement is complete.',
      category: 'lease'
    });

    await logActivity(req.user.id, 'Owner', 'Tenant Move-Out', `Tenant '${tenant.name}' has moved out. Property marked Vacant.`, req);

    res.status(200).json({
      success: true,
      message: 'Move-Out workflow completed. Property is now vacant.'
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

    // Role authentication
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

    // If fileType is 'Lease', also update main leaseAgreementUrl
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

// @desc    Deactivate/Delete Tenant
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

    // If tenant is assigned to property, force move out first
    if (tenant.propertyAssigned) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete/deactivate tenant who is currently assigned to a property. Please complete the Move-Out workflow first.'
      });
    }

    // Soft delete / deactivate
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
