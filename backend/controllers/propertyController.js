const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
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
    const media = [];
    let coverPhoto = '';
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const isVideo = (file.mimetype && file.mimetype.startsWith('video/')) ||
                        ['.mp4', '.webm', '.mov'].includes(path.extname(file.originalname).toLowerCase());
        const uploadResult = await uploadToStorage(file, 'properties');
        if (uploadResult) {
          images.push(uploadResult);
          const isCover = !coverPhoto && !isVideo;
          if (isCover) {
            coverPhoto = uploadResult.url;
          }
          media.push({
            type: isVideo ? 'video' : 'image',
            url: uploadResult.url,
            publicId: uploadResult.publicId || '',
            originalName: file.originalname || '',
            size: file.size || 0,
            mimeType: file.mimetype || (isVideo ? 'video/mp4' : 'image/jpeg'),
            isCover,
            order: i,
            uploadedAt: new Date()
          });
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
      coverPhoto: coverPhoto || (images.length > 0 ? images[0].url : ''),
      media: media || [],
      images,
      address: {
        houseNumber: (req.body.address && req.body.address.houseNumber) || houseNumber || '',
        street: (req.body.address && req.body.address.street) || street || '',
        area: (req.body.address && req.body.address.area) || area || '',
        city: (req.body.address && req.body.address.city) || city || '',
        state: (req.body.address && req.body.address.state) || state || '',
        country: (req.body.address && req.body.address.country) || country || 'India',
        pincode: (req.body.address && req.body.address.pincode) || pincode || ''
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

    const properties = await Property.find(queryObj).populate(
      'tenant',
      'name email phone profilePhoto occupation unitNumber gender isActive'
    );

    const propertyList = await Promise.all(
      properties.map(async (prop) => {
        let propObj = prop.toObject ? prop.toObject() : prop;
        if (!propObj.tenant) {
          const assigned = await Tenant.findOne({ propertyAssigned: prop._id, isActive: true })
            .select('name email phone profilePhoto occupation unitNumber gender isActive');
          if (assigned) {
            propObj.tenant = assigned;
            if (propObj.status === 'Vacant') propObj.status = 'Occupied';
            await Property.findByIdAndUpdate(prop._id, { tenant: assigned._id, status: 'Occupied' });
          }
        } else if (propObj.tenant && propObj.tenant.isActive === false) {
          propObj.tenant = null;
          if (propObj.status === 'Occupied') propObj.status = 'Vacant';
          await Property.findByIdAndUpdate(prop._id, { tenant: null, status: 'Vacant' });
        }
        return propObj;
      })
    );

    res.status(200).json({
      success: true,
      count: propertyList.length,
      data: propertyList
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
      .populate('tenant', 'name email phone occupation gender unitNumber aadhaarNumber panNumber emergencyContact leaseStartDate leaseEndDate leaseAgreementUrl profilePhoto isActive address');

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

    let property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Role-based auth check
    if (req.userRole === 'owner' && property.owner._id.toString() !== req.user.id && property.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this property' });
    }
    if (req.userRole === 'tenant') {
      const activeTenantDoc = await Tenant.findById(req.user.id);
      if (!activeTenantDoc || activeTenantDoc.propertyAssigned?.toString() !== property._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this property' });
      }
    }

    // Auto-sync / heal tenancy linkage
    if (property.tenant) {
      const currentTenant = await Tenant.findById(property.tenant);
      if (!currentTenant || !currentTenant.isActive || currentTenant.propertyAssigned?.toString() !== property._id.toString()) {
        property.tenant = null;
        if (property.status === 'Occupied') property.status = 'Vacant';
        await Property.findByIdAndUpdate(property._id, { tenant: null, status: property.status });
      }
    }

    if (!property.tenant) {
      const assignedTenant = await Tenant.findOne({ propertyAssigned: property._id, isActive: true });
      if (assignedTenant) {
        property.tenant = assignedTenant._id;
        property.status = 'Occupied';
        await Property.findByIdAndUpdate(property._id, { tenant: assignedTenant._id, status: 'Occupied' });
      }
    }

    const populatedProperty = await Property.findById(property._id)
      .populate('owner', 'name email contactNumber profilePhoto')
      .populate('tenant', 'name email phone occupation gender unitNumber aadhaarNumber panNumber emergencyContact leaseStartDate leaseEndDate leaseAgreementUrl profilePhoto isActive address');

    res.status(200).json({
      success: true,
      data: populatedProperty
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
    })
      .populate('owner', 'name email contactNumber profilePhoto')
      .populate('tenant', 'name email phone occupation gender unitNumber aadhaarNumber panNumber emergencyContact leaseStartDate leaseEndDate leaseAgreementUrl profilePhoto isActive address');

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

// @desc    Upload photos & videos to Property Gallery
// @route   POST /api/v1/properties/:id/media
// @access  Private (Owner Only)
exports.uploadPropertyMedia = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Property ID' });
    }

    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Ownership check
    if (property.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to upload media for this property' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select files to upload' });
    }

    // Backend validation of file sizes and types
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
    const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

    for (const file of req.files) {
      const isVideo = (file.mimetype && file.mimetype.startsWith('video/')) || 
                      ['.mp4', '.webm', '.mov'].includes(path.extname(file.originalname).toLowerCase());

      if (isVideo) {
        if (file.size > MAX_VIDEO_SIZE) {
          req.files.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
          return res.status(400).json({
            success: false,
            message: `Video '${file.originalname}' exceeds 100 MB. Video must be smaller than 100 MB.`
          });
        }
      } else {
        if (file.size > MAX_IMAGE_SIZE) {
          req.files.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
          return res.status(400).json({
            success: false,
            message: `Image '${file.originalname}' exceeds 10 MB. Image must be smaller than 10 MB.`
          });
        }
      }
    }

    // Process and upload each file
    const uploadedMediaItems = [];
    const hasExistingCover = property.media && property.media.some(m => m.isCover);
    let coverAssigned = hasExistingCover || !!property.coverPhoto;

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const isVideo = (file.mimetype && file.mimetype.startsWith('video/')) ||
                      ['.mp4', '.webm', '.mov'].includes(path.extname(file.originalname).toLowerCase());
      
      const uploadResult = await uploadToStorage(file, 'properties');
      if (uploadResult) {
        const isCover = !coverAssigned && !isVideo;
        if (isCover) {
          coverAssigned = true;
          property.coverPhoto = uploadResult.url;
        }

        const mediaItem = {
          type: isVideo ? 'video' : 'image',
          url: uploadResult.url,
          publicId: uploadResult.publicId || '',
          originalName: file.originalname || '',
          size: file.size || 0,
          mimeType: file.mimetype || (isVideo ? 'video/mp4' : 'image/jpeg'),
          isCover,
          order: (property.media ? property.media.length : 0) + i,
          uploadedAt: new Date()
        };

        property.media.push(mediaItem);
        uploadedMediaItems.push(mediaItem);

        // Keep legacy property.images and property.videoUrl synced
        if (!isVideo) {
          property.images.push({ url: uploadResult.url, publicId: uploadResult.publicId });
        } else if (!property.videoUrl) {
          property.videoUrl = uploadResult.url;
        }
      }
    }

    // If still no cover photo and we have an image, set first image as cover
    if (!property.coverPhoto) {
      const firstImg = property.media.find(m => m.type === 'image');
      if (firstImg) {
        firstImg.isCover = true;
        property.coverPhoto = firstImg.url;
      }
    }

    await property.save();

    await logActivity(
      req.user.id,
      'Owner',
      'Property Media Upload',
      `Uploaded ${uploadedMediaItems.length} media file(s) to property '${property.name}'.`,
      req
    );

    res.status(200).json({
      success: true,
      message: `Successfully uploaded ${uploadedMediaItems.length} media file(s).`,
      coverPhoto: property.coverPhoto,
      data: property.media,
      property
    });
  } catch (error) {
    if (req.files) {
      req.files.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
    }
    next(error);
  }
};

// @desc    Delete photo or video from Property Gallery
// @route   DELETE /api/v1/properties/:id/media/:mediaId
// @access  Private (Owner Only)
exports.deletePropertyMedia = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id) || !mongoose.Types.ObjectId.isValid(req.params.mediaId)) {
      return res.status(400).json({ success: false, message: 'Invalid Property or Media ID' });
    }

    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (property.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete media from this property' });
    }

    const mediaItem = property.media.id(req.params.mediaId);
    if (!mediaItem) {
      return res.status(404).json({ success: false, message: 'Media item not found' });
    }

    const wasCover = mediaItem.isCover || (property.coverPhoto === mediaItem.url);
    const publicId = mediaItem.publicId;
    const mediaType = mediaItem.type;
    const mediaUrl = mediaItem.url;

    // Delete from storage provider (Cloudinary or local)
    if (publicId) {
      await deleteFromStorage(publicId, mediaType === 'video' ? 'video' : 'image');
    }

    // Pull from property.media
    property.media.pull({ _id: req.params.mediaId });

    // Sync legacy images array
    property.images = property.images.filter(img => img.url !== mediaUrl && (!publicId || img.publicId !== publicId));

    // If was cover photo, assign next available image as cover
    if (wasCover) {
      const nextImage = property.media.find(m => m.type === 'image');
      if (nextImage) {
        nextImage.isCover = true;
        property.coverPhoto = nextImage.url;
      } else {
        property.coverPhoto = '';
      }
    }

    // If deleted item was videoUrl
    if (property.videoUrl === mediaUrl) {
      const nextVideo = property.media.find(m => m.type === 'video');
      property.videoUrl = nextVideo ? nextVideo.url : '';
    }

    await property.save();

    await logActivity(
      req.user.id,
      'Owner',
      'Property Media Deleted',
      `Deleted ${mediaType} from property '${property.name}'.`,
      req
    );

    res.status(200).json({
      success: true,
      message: `${mediaType === 'video' ? 'Video' : 'Photo'} deleted successfully.`,
      coverPhoto: property.coverPhoto,
      data: property.media,
      property
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Set an image as Property Cover Photo
// @route   PATCH /api/v1/properties/:id/media/:mediaId/cover
// @access  Private (Owner Only)
exports.setCoverPhoto = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id) || !mongoose.Types.ObjectId.isValid(req.params.mediaId)) {
      return res.status(400).json({ success: false, message: 'Invalid Property or Media ID' });
    }

    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (property.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage this property' });
    }

    const targetMedia = property.media.id(req.params.mediaId);
    if (!targetMedia) {
      return res.status(404).json({ success: false, message: 'Media item not found' });
    }

    if (targetMedia.type !== 'image') {
      return res.status(400).json({ success: false, message: 'Only photos can be set as the cover photo' });
    }

    // Set all items isCover = false, except target
    property.media.forEach(m => {
      m.isCover = (m._id.toString() === req.params.mediaId);
    });

    property.coverPhoto = targetMedia.url;

    // Prioritize cover photo in legacy images array so images[0] is cover photo
    const existingImgIdx = property.images.findIndex(img => img.url === targetMedia.url);
    if (existingImgIdx > 0) {
      const [movedImg] = property.images.splice(existingImgIdx, 1);
      property.images.unshift(movedImg);
    }

    await property.save();

    await logActivity(
      req.user.id,
      'Owner',
      'Property Cover Photo Updated',
      `Set new cover photo for property '${property.name}'.`,
      req
    );

    res.status(200).json({
      success: true,
      message: 'Cover photo updated successfully.',
      coverPhoto: property.coverPhoto,
      data: property.media,
      property
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reorder Property Gallery media
// @route   PATCH /api/v1/properties/:id/media/reorder
// @access  Private (Owner Only)
exports.reorderPropertyMedia = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Property ID' });
    }

    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (property.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage this property' });
    }

    const { mediaIds } = req.body;
    if (!Array.isArray(mediaIds)) {
      return res.status(400).json({ success: false, message: 'mediaIds must be an array' });
    }

    mediaIds.forEach((mediaId, index) => {
      const item = property.media.id(mediaId);
      if (item) {
        item.order = index;
      }
    });

    property.media.sort((a, b) => a.order - b.order);

    await property.save();

    res.status(200).json({
      success: true,
      message: 'Gallery order updated successfully.',
      data: property.media
    });
  } catch (error) {
    next(error);
  }
};
