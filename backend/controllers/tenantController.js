const mongoose = require('mongoose');
const Tenant = require('../models/Tenant');
const Property = require('../models/Property');
const Apartment = require('../models/Apartment');
const Owner = require('../models/Owner');
const Bill = require('../models/Bill');
const Payment = require('../models/Payment');
const Maintenance = require('../models/Maintenance');
const Notification = require('../models/Notification');
const logActivity = require('../utils/activityLogger');
const { sendTenantWelcomeEmail } = require('../utils/emailService');
const { sendSMS } = require('../utils/smsService');
const { uploadToStorage } = require('../utils/uploader');
const { parsePhoneNumberFromString } = require('libphonenumber-js');

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
      gender, dateOfBirth, address, unitNumber, occupation, aadhaarNumber, panNumber,
      emergencyName, emergencyPhone, emergencyRelation,
      propertyAssigned, apartmentAssigned, monthlyRent, securityDeposit,
      leaseStartDate, leaseEndDate, isActive,
      electricityReading, waterReading, depositCollected, keyHandoverConfirmed
    } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Name, email, and phone are required.' });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    // Check if email already registered as owner or tenant
    const ownerExists = await Owner.findOne({ email });
    const tenantExists = await Tenant.findOne({ email });
    if (ownerExists || tenantExists) {
      return res.status(400).json({ success: false, message: 'Email already registered in system.' });
    }

    // Validate & Normalize Phone Number
    const rawPhone = (typeof phone === 'string' ? phone : '').trim();
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
          return res.status(400).json({ success: false, message: 'Please enter a valid phone number.' });
        }
      }
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Please enter a valid phone number.' });
    }

    // Check if phone already registered
    const phoneInOwner = await Owner.findOne({ contactNumber: { $in: [normalizedPhone, rawPhone] } });
    const phoneInTenant = await Tenant.findOne({ phone: { $in: [normalizedPhone, rawPhone] } });
    if (phoneInOwner || phoneInTenant) {
      return res.status(400).json({ success: false, message: 'Phone number already registered in system.' });
    }

    // Determine password
    const finalPassword = password || customTempPassword || generateTempPassword();
    if (finalPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    let property = null;
    let apartment = null;

    if (apartmentAssigned && mongoose.Types.ObjectId.isValid(apartmentAssigned)) {
      apartment = await Apartment.findById(apartmentAssigned);
      if (!apartment) {
        return res.status(404).json({ success: false, message: 'Assigned apartment not found.' });
      }
      property = await Property.findById(apartment.property);
      if (!property || property.owner.toString() !== req.user.id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized for this apartment or property.' });
      }
    } else if (propertyAssigned && mongoose.Types.ObjectId.isValid(propertyAssigned)) {
      property = await Property.findById(propertyAssigned);
      if (!property) {
        return res.status(404).json({ success: false, message: 'Assigned property not found.' });
      }
      if (property.owner.toString() !== req.user.id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized for this property.' });
      }
    }

    const calcRent = parseFloat(monthlyRent) || (apartment ? apartment.monthlyRent : (property ? property.monthlyRent : 0));
    const calcDeposit = parseFloat(securityDeposit) || (apartment ? apartment.securityDeposit : (property ? property.securityDeposit : 0));
    const finalUnitNumber = unitNumber || (apartment ? apartment.number : '');

    // Create Tenant
    const tenant = await Tenant.create({
      name,
      email,
      password: finalPassword,
      phone: normalizedPhone,
      gender: gender || 'Unspecified',
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      address: address || '',
      unitNumber: finalUnitNumber,
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
      apartmentAssigned: apartment ? apartment._id : null,
      monthlyRent: calcRent,
      securityDeposit: calcDeposit,
      leaseStartDate: leaseStartDate ? new Date(leaseStartDate) : new Date(),
      leaseEndDate: leaseEndDate ? new Date(leaseEndDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      verified: true,
      isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : true,
      role: 'tenant',
      moveInDetails: {
        meterReadings: {
          electricity: parseFloat(electricityReading) || 0,
          water: parseFloat(waterReading) || 0
        },
        depositCollected: depositCollected === 'true' || depositCollected === true,
        keyHandoverConfirmed: keyHandoverConfirmed === 'true' || keyHandoverConfirmed === true
      }
    });

    // Update Apartment Status if assigned
    if (apartment) {
      apartment.status = 'Occupied';
      apartment.tenant = tenant._id;
      await apartment.save();
    }

    // Update Property Status if assigned
    if (property) {
      property.status = 'Occupied';
      property.tenant = tenant._id;
      await property.save();
    }

    // Send Welcome Email if SMTP available
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
      `Tenant '${tenant.name}' was created and assigned to ${property ? property.name : 'No Property'}${apartment ? ` (Unit ${apartment.number})` : ''}.`,
      req
    );

    const populatedTenant = await Tenant.findById(tenant._id)
      .populate('propertyAssigned', 'name address status')
      .populate('apartmentAssigned', 'number floor areaSqFt status');

    res.status(201).json({
      success: true,
      data: populatedTenant,
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
    const tenants = await Tenant.find({ owner: req.user.id })
      .populate('propertyAssigned', 'name address status monthlyRent')
      .populate('apartmentAssigned', 'number floor areaSqFt status monthlyRent securityDeposit')
      .sort({ createdAt: -1 });

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

    const tenant = await Tenant.findById(req.params.id)
      .populate('propertyAssigned', 'name address monthlyRent securityDeposit status')
      .populate('apartmentAssigned', 'number floor areaSqFt status monthlyRent securityDeposit');

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    // Authorization: Tenant can ONLY view their own account
    if (req.userRole === 'tenant' && tenant._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You are not authorized to view other tenants.'
      });
    }

    // Authorization: Owner can only view their own tenants
    if (req.userRole === 'owner' && tenant.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You are not authorized to view this tenant.'
      });
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
      name, email, phone, gender, dateOfBirth, address, unitNumber, occupation, panNumber, aadhaarNumber,
      monthlyRent, securityDeposit, leaseStartDate, leaseEndDate,
      emergencyName, emergencyPhone, emergencyRelation, propertyAssigned, apartmentAssigned, isActive,
      password, newPassword
    } = req.body;

    if (name) tenant.name = name;
    if (email) tenant.email = email;
    if (phone) {
      const rawPhone = String(phone).trim();
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
            return res.status(400).json({ success: false, message: 'Please enter a valid phone number.' });
          }
        }
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Please enter a valid phone number.' });
      }

      if (normalizedPhone !== tenant.phone) {
        const phoneInOwner = await Owner.findOne({ contactNumber: normalizedPhone });
        const phoneInTenant = await Tenant.findOne({ _id: { $ne: tenant._id }, phone: normalizedPhone });
        if (phoneInOwner || phoneInTenant) {
          return res.status(400).json({ success: false, message: 'Phone number already registered in system.' });
        }
      }
      tenant.phone = normalizedPhone;
    }
    if (gender) tenant.gender = gender;
    if (dateOfBirth !== undefined) tenant.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    if (address !== undefined) tenant.address = address;
    if (unitNumber !== undefined) tenant.unitNumber = unitNumber;
    if (occupation !== undefined) tenant.occupation = occupation;
    if (panNumber !== undefined) tenant.panNumber = panNumber;
    if (aadhaarNumber !== undefined) tenant.aadhaarNumber = aadhaarNumber;
    if (req.body.profilePhoto !== undefined) tenant.profilePhoto = req.body.profilePhoto;
    if (monthlyRent !== undefined) tenant.monthlyRent = parseFloat(monthlyRent);
    if (securityDeposit !== undefined) tenant.securityDeposit = parseFloat(securityDeposit);
    if (leaseStartDate) tenant.leaseStartDate = new Date(leaseStartDate);
    if (leaseEndDate) tenant.leaseEndDate = new Date(leaseEndDate);
    if (isActive !== undefined) tenant.isActive = isActive === 'true' || isActive === true;

    // Password change through update if provided
    const pwdToSet = newPassword || password;
    if (pwdToSet !== undefined && pwdToSet !== null && String(pwdToSet).trim() !== '') {
      const trimmedPwd = String(pwdToSet).trim();
      if (trimmedPwd.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
      }
      tenant.password = trimmedPwd;
    }

    if (emergencyName !== undefined || emergencyPhone !== undefined || emergencyRelation !== undefined) {
      tenant.emergencyContact = {
        name: emergencyName !== undefined ? emergencyName : (tenant.emergencyContact ? tenant.emergencyContact.name : ''),
        phone: emergencyPhone !== undefined ? emergencyPhone : (tenant.emergencyContact ? tenant.emergencyContact.phone : ''),
        relationship: emergencyRelation !== undefined ? emergencyRelation : (tenant.emergencyContact ? tenant.emergencyContact.relationship : '')
      };
    }

    // Apartment assignment changes
    if (apartmentAssigned !== undefined) {
      const oldApartmentId = tenant.apartmentAssigned ? tenant.apartmentAssigned.toString() : null;
      const newApartmentId = apartmentAssigned && mongoose.Types.ObjectId.isValid(apartmentAssigned) ? apartmentAssigned : null;

      if (oldApartmentId !== newApartmentId) {
        if (newApartmentId) {
          const newApt = await Apartment.findById(newApartmentId);
          if (!newApt) {
            return res.status(404).json({ success: false, message: 'Apartment not found.' });
          }
          const parentProp = await Property.findById(newApt.property);
          if (!parentProp || parentProp.owner.toString() !== req.user.id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized for this apartment or property.' });
          }

          if (oldApartmentId) {
            const oldApt = await Apartment.findById(oldApartmentId);
            if (oldApt) {
              oldApt.status = 'Vacant';
              oldApt.tenant = null;
              await oldApt.save();
            }
          }

          newApt.status = 'Occupied';
          newApt.tenant = tenant._id;
          await newApt.save();
          tenant.unitNumber = newApt.number;
          tenant.propertyAssigned = newApt.property;

          // Ensure parent property is also synced
          await Property.findByIdAndUpdate(newApt.property, {
            tenant: tenant._id,
            status: 'Occupied'
          });
        } else if (oldApartmentId) {
          const oldApt = await Apartment.findById(oldApartmentId);
          if (oldApt) {
            oldApt.status = 'Vacant';
            oldApt.tenant = null;
            await oldApt.save();
          }
        }
        tenant.apartmentAssigned = newApartmentId;
      }
    }

    // Property assignment changes (if apartment wasn't set or directly assigned)
    if (propertyAssigned !== undefined && apartmentAssigned === undefined) {
      const oldPropertyId = tenant.propertyAssigned ? tenant.propertyAssigned.toString() : null;
      const newPropertyId = propertyAssigned && mongoose.Types.ObjectId.isValid(propertyAssigned) ? propertyAssigned : null;

      if (oldPropertyId !== newPropertyId) {
        if (newPropertyId) {
          const newProp = await Property.findById(newPropertyId);
          if (!newProp) {
            return res.status(404).json({ success: false, message: 'Property not found.' });
          }
          if (newProp.owner.toString() !== req.user.id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized for this property.' });
          }

          if (oldPropertyId) {
            const oldProp = await Property.findById(oldPropertyId);
            if (oldProp) {
              oldProp.status = 'Vacant';
              oldProp.tenant = null;
              await oldProp.save();
            }
          }

          newProp.status = 'Occupied';
          newProp.tenant = tenant._id;
          await newProp.save();
        } else if (oldPropertyId) {
          const oldProp = await Property.findById(oldPropertyId);
          if (oldProp) {
            oldProp.status = 'Vacant';
            oldProp.tenant = null;
            await oldProp.save();
          }
        }
        tenant.propertyAssigned = newPropertyId;
      }
    }

    await tenant.save();

    await logActivity(req.user.id, 'Owner', 'Tenant Updated', `Tenant details for '${tenant.name}' were updated.`, req);

    const updatedTenant = await Tenant.findById(tenant._id)
      .populate('propertyAssigned', 'name address status monthlyRent')
      .populate('apartmentAssigned', 'number floor areaSqFt status monthlyRent securityDeposit');

    res.status(200).json({
      success: true,
      data: updatedTenant
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign Property & Apartment to Tenant
// @route   PATCH /api/v1/tenants/:id/assign-property (also PUT)
// @access  Private (Owner Only)
exports.assignProperty = async (req, res, next) => {
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

    const { propertyId, apartmentId, unitNumber, monthlyRent, securityDeposit } = req.body;

    const oldApartmentId = tenant.apartmentAssigned ? tenant.apartmentAssigned.toString() : null;
    const oldPropertyId = tenant.propertyAssigned ? tenant.propertyAssigned.toString() : null;

    let newProperty = null;
    let newApartment = null;

    if (apartmentId && mongoose.Types.ObjectId.isValid(apartmentId)) {
      newApartment = await Apartment.findById(apartmentId);
      if (!newApartment) {
        return res.status(404).json({ success: false, message: 'Apartment not found.' });
      }
      newProperty = await Property.findById(newApartment.property);
      if (!newProperty || newProperty.owner.toString() !== req.user.id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized for this apartment or property.' });
      }
    } else if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) {
      newProperty = await Property.findById(propertyId);
      if (!newProperty) {
        return res.status(404).json({ success: false, message: 'Property not found.' });
      }
      if (newProperty.owner.toString() !== req.user.id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized for this property.' });
      }
    }

    // Vacate previous apartment if changing
    if (oldApartmentId && (!newApartment || newApartment._id.toString() !== oldApartmentId)) {
      const oldApt = await Apartment.findById(oldApartmentId);
      if (oldApt) {
        oldApt.status = 'Vacant';
        oldApt.tenant = null;
        await oldApt.save();
      }
    }

    // Vacate previous property if changing
    if (oldPropertyId && (!newProperty || newProperty._id.toString() !== oldPropertyId)) {
      const oldProp = await Property.findById(oldPropertyId);
      if (oldProp) {
        oldProp.status = 'Vacant';
        oldProp.tenant = null;
        await oldProp.save();
      }
    }

    // Occupy new apartment
    if (newApartment) {
      newApartment.status = 'Occupied';
      newApartment.tenant = tenant._id;
      await newApartment.save();
      tenant.apartmentAssigned = newApartment._id;
      tenant.unitNumber = unitNumber || newApartment.number;
    } else {
      tenant.apartmentAssigned = null;
      if (unitNumber !== undefined) tenant.unitNumber = unitNumber;
    }

    // Occupy new property
    if (newProperty) {
      tenant.propertyAssigned = newProperty._id;
      newProperty.status = 'Occupied';
      newProperty.tenant = tenant._id;
      await newProperty.save();
    } else {
      tenant.propertyAssigned = null;
    }

    if (monthlyRent !== undefined) tenant.monthlyRent = parseFloat(monthlyRent);
    else if (newApartment) tenant.monthlyRent = newApartment.monthlyRent;
    else if (newProperty) tenant.monthlyRent = newProperty.monthlyRent;

    if (securityDeposit !== undefined) tenant.securityDeposit = parseFloat(securityDeposit);
    else if (newApartment) tenant.securityDeposit = newApartment.securityDeposit;
    else if (newProperty) tenant.securityDeposit = newProperty.securityDeposit;

    await tenant.save();

    await logActivity(
      req.user.id,
      'Owner',
      'Property Assigned',
      `Assigned ${newProperty ? newProperty.name : 'Unassigned'} (${tenant.unitNumber || 'No unit'}) to Tenant '${tenant.name}'.`,
      req
    );

    const updated = await Tenant.findById(tenant._id)
      .populate('propertyAssigned', 'name address status monthlyRent')
      .populate('apartmentAssigned', 'number floor areaSqFt status monthlyRent securityDeposit');

    res.status(200).json({
      success: true,
      message: 'Property/Apartment assignment updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Tenant Password (Owner Only)
// @route   PUT /api/v1/tenants/:id/reset-password (also PATCH)
// @access  Private (Owner Only)
exports.resetTenantPassword = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Tenant ID' });
    }

    const newPassword = req.body.newPassword || req.body.password;
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

// @desc    Toggle or Update Tenant Active Status
// @route   PUT /api/v1/tenants/:id/toggle-status (also PATCH /api/v1/tenants/:id/status)
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

    if (req.body.isActive !== undefined) {
      tenant.isActive = req.body.isActive === 'true' || req.body.isActive === true;
    } else {
      tenant.isActive = !tenant.isActive;
    }

    await tenant.save();

    await logActivity(
      req.user.id,
      'Owner',
      'Tenant Status Changed',
      `Tenant '${tenant.name}' status set to ${tenant.isActive ? 'Active' : 'Inactive'}.`,
      req
    );

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
      if (tenant.apartmentAssigned) {
        const apt = await Apartment.findById(tenant.apartmentAssigned);
        if (apt) {
          apt.status = 'Vacant';
          apt.tenant = null;
          await apt.save();
        }
      }
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
    if (tenant.apartmentAssigned) {
      const apt = await Apartment.findById(tenant.apartmentAssigned);
      if (apt) {
        apt.status = 'Vacant';
        apt.tenant = null;
        await apt.save();
      }
      tenant.apartmentAssigned = null;
    }
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
