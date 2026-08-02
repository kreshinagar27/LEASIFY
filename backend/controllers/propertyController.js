const mongoose = require('mongoose');
const Property = require('../models/Property');
const Tenant = require('../models/Tenant');
const logActivity = require('../utils/activityLogger');
const { uploadToStorage, deleteFromStorage } = require('../utils/uploader');

// @desc    Add New Property
// @route   POST /api/v1/properties
// @access  Private (Owner Only)
exports.addProperty = async (req, res, next) => {
  try {
    const {
      name,
      type,
      category,
      floorNumber,
      totalFloors,
      areaSqFt,
      carpetAreaSqFt,
      builtUpAreaSqFt,
      bedrooms,
      bathrooms,
      balcony,
      balconies,
      parkingAvailability,
      parkingType,
      furnishedStatus,
      facingDirection,
      propertyAge,
      amenities,
      description,
      monthlyRent,
      securityDeposit,
      maintenanceCharges,
      electricityCharges,
      waterCharges,
      availableFromDate,
      houseNumber,
      street,
      area,
      city,
      state,
      country,
      pincode,
      latitude,
      longitude,
      nearbyFacilities
    } = req.body;

    // Check files upload
    const images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadResult = await uploadToStorage(file, 'properties');
        if (uploadResult) {
          images.push(uploadResult);
        }
      }
    }

    // Convert amenities & nearbyFacilities from string array if submitted as form-data
    let amenitiesList = amenities;
    if (typeof amenities === 'string') {
      try { amenitiesList = JSON.parse(amenities); } catch (e) { amenitiesList = amenities.split(',').map(s => s.trim()); }
    }
    
    let nearbyList = nearbyFacilities;
    if (typeof nearbyFacilities === 'string') {
      try { nearbyList = JSON.parse(nearbyFacilities); } catch (e) { nearbyList = nearbyFacilities.split(',').map(s => s.trim()); }
    }

    const property = await Property.create({
      name,
      type,
      category: category || 'Residential',
      floorNumber: parseFloat(floorNumber) || 0,
      totalFloors: parseFloat(totalFloors) || 1,
      areaSqFt: parseFloat(areaSqFt) || 0,
      carpetAreaSqFt: parseFloat(carpetAreaSqFt) || 0,
      builtUpAreaSqFt: parseFloat(builtUpAreaSqFt) || 0,
      bedrooms: parseFloat(bedrooms) || 0,
      bathrooms: parseFloat(bathrooms) || 0,
      balcony: balcony === 'true' || balcony === true || parseFloat(balconies) > 0,
      balconies: parseFloat(balconies) || (balcony ? 1 : 0),
      parkingAvailability: parkingAvailability === 'true' || parkingAvailability === true || (parkingType && parkingType !== 'None'),
      parkingType: parkingType || 'None',
      furnishedStatus: furnishedStatus || 'furnished',
      facingDirection: facingDirection || 'East',
      propertyAge: parseFloat(propertyAge) || 0,
      amenities: amenitiesList || [],
      description: description || '',
      monthlyRent: parseFloat(monthlyRent) || 0,
      securityDeposit: parseFloat(securityDeposit) || 0,
      maintenanceCharges: parseFloat(maintenanceCharges) || 0,
      electricityCharges: parseFloat(electricityCharges) || 0,
      waterCharges: parseFloat(waterCharges) || 0,
      availableFromDate: availableFromDate ? new Date(availableFromDate) : Date.now(),
      images,
      address: {
        houseNumber: houseNumber || '',
        street: street || '',
        area: area || '',
        city: city || '',
        state: state || '',
        country: country || 'India',
        pincode: pincode || ''
      },
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude) || 0, parseFloat(latitude) || 0]
      },
      nearbyFacilities: nearbyList || [],
      owner: req.user.id
    });

    await logActivity(req.user.id, 'Owner', 'Property Added', `Property '${property.name}' was created.`, req);

    res.status(201).json({
      success: true,
      data: property
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All Owner's Properties (with filters & search)
// @route   GET /api/v1/properties
// @access  Private (Owner Only)
exports.getProperties = async (req, res, next) => {
  try {
    const queryObj = { owner: req.user.id };

    // Search query across name, city, street
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      queryObj.$or = [
        { name: searchRegex },
        { 'address.city': searchRegex },
        { 'address.area': searchRegex },
        { 'address.street': searchRegex }
      ];
    }

    // Filters
    if (req.query.city) {
      queryObj['address.city'] = new RegExp(req.query.city, 'i');
    }

    if (req.query.status) {
      queryObj.status = req.query.status;
    }

    if (req.query.type) {
      queryObj.type = req.query.type;
    }

    if (req.query.minRent || req.query.maxRent) {
      queryObj.monthlyRent = {};
      if (req.query.minRent) queryObj.monthlyRent.$gte = parseFloat(req.query.minRent);
      if (req.query.maxRent) queryObj.monthlyRent.$lte = parseFloat(req.query.maxRent);
    }

    // Exclude archived properties unless requested
    if (req.query.includeArchived !== 'true') {
      queryObj.isArchived = { $ne: true };
    }

    const properties = await Property.find(queryObj).populate('tenant', 'name email phone');

    res.status(200).json({
      success: true,
      count: properties.length,
      data: properties
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Tenant's Assigned Property
// @route   GET /api/v1/properties/my or /api/v1/properties/me
// @access  Private (Tenant Only)
exports.getMyProperty = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.user.id);
    if (!tenant || !tenant.propertyAssigned) {
      return res.status(404).json({ success: false, message: 'No property assigned to this tenant' });
    }

    const property = await Property.findById(tenant.propertyAssigned)
      .populate('owner', 'name email contactNumber profilePhoto')
      .populate('tenant', 'name email phone occupation emergencyContact leaseStartDate leaseEndDate leaseAgreementUrl');

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property details not found' });
    }

    res.status(200).json({
      success: true,
      data: property
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Single Property Detail
// @route   GET /api/v1/properties/:id
// @access  Private (Owner & Assigned Tenant Only)
exports.getProperty = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Property ID' });
    }

    const property = await Property.findById(req.params.id)
      .populate('owner', 'name email contactNumber profilePhoto')
      .populate('tenant', 'name email phone occupation emergencyContact leaseStartDate leaseEndDate leaseAgreementUrl');

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Role-based auth check
    if (req.userRole === 'owner' && property.owner._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this property' });
    }
    if (req.userRole === 'tenant' && (!property.tenant || property.tenant._id.toString() !== req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this property' });
    }

    res.status(200).json({
      success: true,
      data: property
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Edit Property details
// @route   PUT /api/v1/properties/:id
// @access  Private (Owner Only)
exports.updateProperty = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Property ID' });
    }

    let property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (property.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this property' });
    }

    // Upload additional images if any
    const images = [...property.images];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadResult = await uploadToStorage(file, 'properties');
        if (uploadResult) {
          images.push(uploadResult);
        }
      }
    }

    const {
      name, type, category, floorNumber, totalFloors, areaSqFt, carpetAreaSqFt, builtUpAreaSqFt,
      bedrooms, bathrooms, balcony, balconies, parkingAvailability, parkingType,
      furnishedStatus, facingDirection, propertyAge, amenities, description,
      monthlyRent, securityDeposit, maintenanceCharges, electricityCharges, waterCharges,
      availableFromDate, houseNumber, street, area, city, state, country, pincode,
      latitude, longitude, nearbyFacilities, status
    } = req.body;

    let amenitiesList = amenities;
    if (typeof amenities === 'string') {
      try { amenitiesList = JSON.parse(amenities); } catch (e) { amenitiesList = amenities.split(',').map(s => s.trim()); }
    }
    
    let nearbyList = nearbyFacilities;
    if (typeof nearbyFacilities === 'string') {
      try { nearbyList = JSON.parse(nearbyFacilities); } catch (e) { nearbyList = nearbyFacilities.split(',').map(s => s.trim()); }
    }

    // Structure address & location
    const updateData = {
      name: name || property.name,
      type: type || property.type,
      category: category || property.category || 'Residential',
      floorNumber: floorNumber !== undefined ? parseFloat(floorNumber) : property.floorNumber,
      totalFloors: totalFloors !== undefined ? parseFloat(totalFloors) : property.totalFloors,
      areaSqFt: areaSqFt !== undefined ? parseFloat(areaSqFt) : property.areaSqFt,
      carpetAreaSqFt: carpetAreaSqFt !== undefined ? parseFloat(carpetAreaSqFt) : property.carpetAreaSqFt,
      builtUpAreaSqFt: builtUpAreaSqFt !== undefined ? parseFloat(builtUpAreaSqFt) : property.builtUpAreaSqFt,
      bedrooms: bedrooms !== undefined ? parseFloat(bedrooms) : property.bedrooms,
      bathrooms: bathrooms !== undefined ? parseFloat(bathrooms) : property.bathrooms,
      balcony: balcony !== undefined ? (balcony === 'true' || balcony === true) : property.balcony,
      balconies: balconies !== undefined ? parseFloat(balconies) : property.balconies,
      parkingAvailability: parkingAvailability !== undefined ? (parkingAvailability === 'true' || parkingAvailability === true) : property.parkingAvailability,
      parkingType: parkingType || property.parkingType || 'None',
      furnishedStatus: furnishedStatus || property.furnishedStatus,
      facingDirection: facingDirection || property.facingDirection || 'East',
      propertyAge: propertyAge !== undefined ? parseFloat(propertyAge) : property.propertyAge,
      amenities: amenitiesList || property.amenities,
      description: description !== undefined ? description : property.description,
      monthlyRent: monthlyRent !== undefined ? parseFloat(monthlyRent) : property.monthlyRent,
      securityDeposit: securityDeposit !== undefined ? parseFloat(securityDeposit) : property.securityDeposit,
      maintenanceCharges: maintenanceCharges !== undefined ? parseFloat(maintenanceCharges) : property.maintenanceCharges,
      electricityCharges: electricityCharges !== undefined ? parseFloat(electricityCharges) : property.electricityCharges,
      waterCharges: waterCharges !== undefined ? parseFloat(waterCharges) : property.waterCharges,
      availableFromDate: availableFromDate ? new Date(availableFromDate) : property.availableFromDate,
      status: status || property.status,
      images,
      address: {
        houseNumber: houseNumber || property.address.houseNumber,
        street: street || property.address.street,
        area: area || property.address.area,
        city: city || property.address.city,
        state: state || property.address.state,
        country: country || property.address.country,
        pincode: pincode || property.address.pincode
      },
      nearbyFacilities: nearbyList || property.nearbyFacilities
    };

    if (longitude && latitude) {
      updateData.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      };
    }

    property = await Property.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    await logActivity(req.user.id, 'Owner', 'Property Updated', `Property '${property.name}' was updated.`, req);

    res.status(200).json({
      success: true,
      data: property
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Property with Strategies (Option A Unassign, Option B Transfer, Option C Archive)
// @route   DELETE /api/v1/properties/:id
// @access  Private (Owner Only)
exports.deleteProperty = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Property ID' });
    }

    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (property.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this property' });
    }

    const strategy = req.body?.strategy || req.query?.strategy;
    const targetPropertyId = req.body?.targetPropertyId || req.query?.targetPropertyId;

    // Check for assigned tenants
    const assignedTenants = await Tenant.find({ propertyAssigned: property._id });

    if (assignedTenants.length > 0 && !strategy) {
      // Fetch available target properties for transfer strategy
      const otherProperties = await Property.find({
        owner: req.user.id,
        _id: { $ne: property._id },
        isArchived: { $ne: true }
      }).select('name address status monthlyRent');

      return res.status(409).json({
        success: false,
        requiresStrategy: true,
        message: `Property '${property.name}' has ${assignedTenants.length} assigned tenant(s). Please choose a deletion strategy.`,
        tenantCount: assignedTenants.length,
        assignedTenants: assignedTenants.map(t => ({ id: t._id, name: t.name, email: t.email, phone: t.phone })),
        availableProperties: otherProperties
      });
    }

    if (strategy === 'archive') {
      // Option C: Soft Delete / Archive Property
      property.status = 'Archived';
      property.isArchived = true;
      await property.save();

      await logActivity(req.user.id, 'Owner', 'Property Archived', `Property '${property.name}' was soft-deleted/archived.`, req);

      return res.status(200).json({
        success: true,
        action: 'archived',
        message: `Property '${property.name}' was archived successfully.`
      });
    }

    if (strategy === 'transfer') {
      // Option B: Transfer Tenants to target property
      if (!targetPropertyId || !mongoose.Types.ObjectId.isValid(targetPropertyId)) {
        return res.status(400).json({
          success: false,
          message: 'Please specify a valid target property to transfer tenants to.'
        });
      }

      const targetProperty = await Property.findOne({ _id: targetPropertyId, owner: req.user.id, isArchived: { $ne: true } });
      if (!targetProperty) {
        return res.status(404).json({ success: false, message: 'Target transfer property not found or not owned by you.' });
      }

      // Reassign all tenants to target property
      await Tenant.updateMany(
        { propertyAssigned: property._id },
        { propertyAssigned: targetProperty._id }
      );

      // Update target property status
      targetProperty.status = 'Occupied';
      if (assignedTenants.length > 0) {
        targetProperty.tenant = assignedTenants[0]._id;
      }
      await targetProperty.save();

      // Clean up Cloudinary images and delete original property
      if (property.images && property.images.length > 0) {
        for (const image of property.images) {
          if (image.publicId) await deleteFromStorage(image.publicId);
        }
      }

      await Property.findByIdAndDelete(property._id);

      await logActivity(req.user.id, 'Owner', 'Property Deleted & Tenants Transferred', `Property '${property.name}' deleted. Transferred ${assignedTenants.length} tenant(s) to '${targetProperty.name}'.`, req);

      return res.status(200).json({
        success: true,
        action: 'transferred_and_deleted',
        message: `Property deleted and ${assignedTenants.length} tenant(s) transferred to '${targetProperty.name}'.`
      });
    }

    if (strategy === 'unassign' || assignedTenants.length === 0 || strategy === 'force_delete') {
      // Option A: Unassign Tenants & Delete
      if (assignedTenants.length > 0) {
        await Tenant.updateMany(
          { propertyAssigned: property._id },
          { propertyAssigned: null }
        );
      }

      // Clean up Cloudinary images
      if (property.images && property.images.length > 0) {
        for (const image of property.images) {
          if (image.publicId) await deleteFromStorage(image.publicId);
        }
      }

      await Property.findByIdAndDelete(property._id);

      await logActivity(req.user.id, 'Owner', 'Property Deleted', `Property '${property.name}' was deleted. Unassigned ${assignedTenants.length} tenant(s).`, req);

      return res.status(200).json({
        success: true,
        action: 'deleted',
        message: `Property '${property.name}' deleted successfully.`
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid deletion strategy specified.' });
  } catch (error) {
    next(error);
  }
};
