// Apartment Controller
// Implements CRUD operations for Apartment model

const mongoose = require('mongoose');
const Apartment = require('../models/Apartment');
const Property = require('../models/Property');
const logActivity = require('../utils/activityLogger');
const { uploadToStorage, deleteFromStorage } = require('../utils/uploader');

// @desc    Add New Apartment
// @route   POST /api/v1/apartments
// @access  Private (Owner Only)
exports.createApartment = async (req, res, next) => {
  try {
    const number = req.body.number || req.body.apartmentNumber;
    const floor = req.body.floor !== undefined && req.body.floor !== '' ? req.body.floor : req.body.floorNumber;
    const areaSqFt = req.body.areaSqFt;
    const bedrooms = req.body.bedrooms !== undefined && req.body.bedrooms !== '' ? req.body.bedrooms : 0;
    const bathrooms = req.body.bathrooms !== undefined && req.body.bathrooms !== '' ? req.body.bathrooms : 0;
    const balcony = req.body.balcony !== undefined 
      ? (req.body.balcony === 'true' || req.body.balcony === true) 
      : (req.body.balconies !== undefined ? Number(req.body.balconies) > 0 : false);
    const parkingAvailable = req.body.parkingAvailable === 'true' || req.body.parkingAvailable === true;
    const furnishedStatus = req.body.furnishedStatus || 'unfurnished';
    const monthlyRent = req.body.monthlyRent !== undefined && req.body.monthlyRent !== '' ? req.body.monthlyRent : req.body.rent;
    const rawDeposit = req.body.securityDeposit !== undefined && req.body.securityDeposit !== '' 
      ? req.body.securityDeposit 
      : req.body.deposit;
    const securityDeposit = rawDeposit !== undefined && rawDeposit !== '' 
      ? rawDeposit 
      : (monthlyRent ? parseFloat(monthlyRent) * 2 : 0);
    const status = req.body.status || 'Vacant';
    let propertyId = req.body.propertyId || req.body.property;

    if (!number) {
      return res.status(400).json({ success: false, message: 'Apartment/Unit number is required.' });
    }
    if (floor === undefined || floor === null || floor === '') {
      return res.status(400).json({ success: false, message: 'Floor number is required.' });
    }
    if (!areaSqFt) {
      return res.status(400).json({ success: false, message: 'Area in sq ft is required.' });
    }
    if (monthlyRent === undefined || monthlyRent === null || monthlyRent === '') {
      return res.status(400).json({ success: false, message: 'Monthly rent is required.' });
    }

    // Resolve or verify property ownership
    let property;
    if (propertyId) {
      if (!mongoose.Types.ObjectId.isValid(propertyId)) {
        return res.status(400).json({ success: false, message: 'Invalid property ID.' });
      }
      property = await Property.findById(propertyId);
      if (!property) {
        return res.status(404).json({ success: false, message: 'Selected property was not found.' });
      }
      if (property.owner.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized for this property.' });
      }
    } else {
      // Find the first property owned by this user
      property = await Property.findOne({ owner: req.user.id });
      if (!property) {
        // Auto-create a default property so the owner is never blocked from adding apartments
        property = await Property.create({
          name: 'Primary Property',
          type: 'apartment',
          category: 'Residential',
          monthlyRent: parseFloat(monthlyRent) || 15000,
          securityDeposit: parseFloat(securityDeposit) || 30000,
          areaSqFt: parseFloat(areaSqFt) || 1000,
          floorNumber: parseFloat(floor) || 1,
          totalFloors: Math.max(parseFloat(floor) || 1, 5),
          furnishedStatus: furnishedStatus || 'unfurnished',
          owner: req.user.id,
          address: {
            houseNumber: '1',
            street: 'Main Street',
            area: 'Central',
            city: 'Bengaluru',
            state: 'Karnataka',
            country: 'India',
            pincode: '560001'
          },
          location: {
            type: 'Point',
            coordinates: [77.5946, 12.9716]
          },
          status: 'Vacant'
        });
      }
      propertyId = property._id;
    }

    // Handle image uploads if any
    const images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadResult = await uploadToStorage(file, 'apartments');
        if (uploadResult) images.push(uploadResult);
      }
    }

    const apartment = await Apartment.create({
      number,
      floor: parseFloat(floor),
      areaSqFt: parseFloat(areaSqFt),
      bedrooms: parseFloat(bedrooms) || 0,
      bathrooms: parseFloat(bathrooms) || 0,
      balcony: balcony === 'true' || balcony === true,
      parkingAvailable: parkingAvailable === 'true' || parkingAvailable === true,
      furnishedStatus: furnishedStatus || 'unfurnished',
      monthlyRent: parseFloat(monthlyRent),
      securityDeposit: parseFloat(securityDeposit),
      status: status || 'Vacant',
      property: property._id,
      images
    });

    if (req.body.latitude !== undefined || req.body.longitude !== undefined || req.body.address || req.body.street || req.body.city || req.body.area) {
      const propUpdate = {};
      if (req.body.address && typeof req.body.address === 'object') {
        propUpdate.address = req.body.address;
      } else if (req.body.street !== undefined || req.body.city !== undefined || req.body.area !== undefined || req.body.pincode !== undefined || req.body.state !== undefined || req.body.houseNumber !== undefined) {
        propUpdate.address = {
          houseNumber: req.body.houseNumber !== undefined ? req.body.houseNumber : (property.address?.houseNumber || ''),
          street: req.body.street !== undefined ? req.body.street : (property.address?.street || ''),
          area: req.body.area !== undefined ? req.body.area : (property.address?.area || ''),
          city: req.body.city !== undefined ? req.body.city : (property.address?.city || ''),
          state: req.body.state !== undefined ? req.body.state : (property.address?.state || ''),
          country: req.body.country !== undefined ? req.body.country : (property.address?.country || 'India'),
          pincode: req.body.pincode !== undefined ? req.body.pincode : (property.address?.pincode || '')
        };
      }
      const latVal = req.body.latitude !== undefined && req.body.latitude !== '' ? req.body.latitude : req.body.location?.coordinates?.[1];
      const lngVal = req.body.longitude !== undefined && req.body.longitude !== '' ? req.body.longitude : req.body.location?.coordinates?.[0];
      if (latVal !== undefined && lngVal !== undefined && latVal !== '' && lngVal !== '' && !isNaN(latVal) && !isNaN(lngVal)) {
        propUpdate.location = {
          type: 'Point',
          coordinates: [parseFloat(lngVal), parseFloat(latVal)]
        };
      }
      if (Object.keys(propUpdate).length > 0) {
        await Property.findByIdAndUpdate(property._id, propUpdate);
      }
    }

    await logActivity(req.user.id, 'Owner', 'Apartment Added', `Apartment '${apartment.number}' created for property '${property.name}'.`, req);

    res.status(201).json({ success: true, data: apartment });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All Apartments for Owner
// @route   GET /api/v1/apartments
// @access  Private (Owner Only)
exports.getApartments = async (req, res, next) => {
  try {
    // Find properties owned by the user and then apartments linked to them
    const ownedProperties = await Property.find({ owner: req.user.id }).select('_id');
    const propertyIds = ownedProperties.map(p => p._id);
    const apartments = await Apartment.find({ property: { $in: propertyIds } }).populate('property', 'name address status location owner');
    res.status(200).json({ success: true, count: apartments.length, data: apartments });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Single Apartment Details
// @route   GET /api/v1/apartments/:id
// @access  Private (Owner Only)
exports.getApartment = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Apartment ID' });
    }
    const apartment = await Apartment.findById(req.params.id).populate('property');
    if (!apartment) {
      return res.status(404).json({ success: false, message: 'Apartment not found' });
    }
    // Ensure owner owns the property
    if (apartment.property && apartment.property.owner && apartment.property.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this apartment' });
    }
    res.status(200).json({ success: true, data: apartment });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Apartment Details
// @route   PUT /api/v1/apartments/:id
// @access  Private (Owner Only)
exports.updateApartment = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Apartment ID' });
    }
    let apartment = await Apartment.findById(req.params.id).populate('property');
    if (!apartment) {
      return res.status(404).json({ success: false, message: 'Apartment not found' });
    }
    if (apartment.property && apartment.property.owner && apartment.property.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this apartment' });
    }

    // Process new images
    const images = [...apartment.images];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadResult = await uploadToStorage(file, 'apartments');
        if (uploadResult) images.push(uploadResult);
      }
    }

    const number = req.body.number || req.body.apartmentNumber || apartment.number;
    const floor = req.body.floor !== undefined && req.body.floor !== '' ? req.body.floor : (req.body.floorNumber !== undefined ? req.body.floorNumber : apartment.floor);
    const areaSqFt = req.body.areaSqFt !== undefined && req.body.areaSqFt !== '' ? req.body.areaSqFt : apartment.areaSqFt;
    const bedrooms = req.body.bedrooms !== undefined && req.body.bedrooms !== '' ? req.body.bedrooms : apartment.bedrooms;
    const bathrooms = req.body.bathrooms !== undefined && req.body.bathrooms !== '' ? req.body.bathrooms : apartment.bathrooms;
    const balcony = req.body.balcony !== undefined 
      ? (req.body.balcony === 'true' || req.body.balcony === true) 
      : (req.body.balconies !== undefined ? Number(req.body.balconies) > 0 : apartment.balcony);
    const parkingAvailable = req.body.parkingAvailable !== undefined 
      ? (req.body.parkingAvailable === 'true' || req.body.parkingAvailable === true) 
      : apartment.parkingAvailable;
    const furnishedStatus = req.body.furnishedStatus || apartment.furnishedStatus;
    const monthlyRent = req.body.monthlyRent !== undefined && req.body.monthlyRent !== '' ? req.body.monthlyRent : (req.body.rent !== undefined ? req.body.rent : apartment.monthlyRent);
    const rawDeposit = req.body.securityDeposit !== undefined && req.body.securityDeposit !== '' ? req.body.securityDeposit : req.body.deposit;
    const securityDeposit = rawDeposit !== undefined && rawDeposit !== '' ? rawDeposit : apartment.securityDeposit;
    const status = req.body.status || apartment.status;

    const updateData = {
      number,
      floor: parseFloat(floor),
      areaSqFt: parseFloat(areaSqFt),
      bedrooms: parseFloat(bedrooms) || 0,
      bathrooms: parseFloat(bathrooms) || 0,
      balcony: balcony === true,
      parkingAvailable: parkingAvailable === true,
      furnishedStatus,
      monthlyRent: parseFloat(monthlyRent),
      securityDeposit: parseFloat(securityDeposit),
      status,
      images
    };

    if (req.body.propertyId && mongoose.Types.ObjectId.isValid(req.body.propertyId)) {
      const newProp = await Property.findById(req.body.propertyId);
      if (newProp && newProp.owner.toString() === req.user.id) {
        updateData.property = newProp._id;
      }
    }

    const targetPropId = updateData.property || apartment.property?._id || apartment.property;
    if (targetPropId && (req.body.latitude !== undefined || req.body.longitude !== undefined || req.body.address || req.body.street || req.body.city || req.body.area)) {
      const propUpdate = {};
      if (req.body.address && typeof req.body.address === 'object') {
        propUpdate.address = req.body.address;
      } else if (req.body.street !== undefined || req.body.city !== undefined || req.body.area !== undefined || req.body.pincode !== undefined || req.body.state !== undefined || req.body.houseNumber !== undefined) {
        const existingProp = await Property.findById(targetPropId);
        if (existingProp) {
          propUpdate.address = {
            houseNumber: req.body.houseNumber !== undefined ? req.body.houseNumber : (existingProp.address?.houseNumber || ''),
            street: req.body.street !== undefined ? req.body.street : (existingProp.address?.street || ''),
            area: req.body.area !== undefined ? req.body.area : (existingProp.address?.area || ''),
            city: req.body.city !== undefined ? req.body.city : (existingProp.address?.city || ''),
            state: req.body.state !== undefined ? req.body.state : (existingProp.address?.state || ''),
            country: req.body.country !== undefined ? req.body.country : (existingProp.address?.country || 'India'),
            pincode: req.body.pincode !== undefined ? req.body.pincode : (existingProp.address?.pincode || '')
          };
        }
      }

      const latVal = req.body.latitude !== undefined && req.body.latitude !== '' ? req.body.latitude : req.body.location?.coordinates?.[1];
      const lngVal = req.body.longitude !== undefined && req.body.longitude !== '' ? req.body.longitude : req.body.location?.coordinates?.[0];
      if (latVal !== undefined && lngVal !== undefined && latVal !== '' && lngVal !== '' && !isNaN(latVal) && !isNaN(lngVal)) {
        propUpdate.location = {
          type: 'Point',
          coordinates: [parseFloat(lngVal), parseFloat(latVal)]
        };
      }

      if (Object.keys(propUpdate).length > 0) {
        await Property.findByIdAndUpdate(targetPropId, propUpdate);
      }
    }

    apartment = await Apartment.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).populate('property', 'name address status location');
    await logActivity(req.user.id, 'Owner', 'Apartment Updated', `Apartment '${apartment.number}' updated.`, req);
    res.status(200).json({ success: true, data: apartment });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Apartment
// @route   DELETE /api/v1/apartments/:id
// @access  Private (Owner Only)
exports.deleteApartment = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Apartment ID' });
    }
    const apartment = await Apartment.findById(req.params.id).populate('property');
    if (!apartment) {
      return res.status(404).json({ success: false, message: 'Apartment not found' });
    }
    if (apartment.property && apartment.property.owner && apartment.property.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this apartment' });
    }

    // Remove images from storage if any
    if (apartment.images && apartment.images.length > 0) {
      for (const img of apartment.images) {
        if (img.publicId) await deleteFromStorage(img.publicId);
      }
    }

    await Apartment.findByIdAndDelete(req.params.id);
    await logActivity(req.user.id, 'Owner', 'Apartment Deleted', `Apartment '${apartment.number}' removed.`, req);
    res.status(200).json({ success: true, message: 'Apartment deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload photos & videos to Apartment Gallery
// @route   POST /api/v1/apartments/:id/media
// @access  Private (Owner Only)
exports.uploadApartmentMedia = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Apartment ID' });
    }

    const apartment = await Apartment.findById(req.params.id).populate('property');
    if (!apartment) {
      return res.status(404).json({ success: false, message: 'Apartment not found' });
    }

    if (apartment.property.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized for this apartment' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select files to upload' });
    }

    const path = require('path');
    const fs = require('fs');
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
    const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

    for (const file of req.files) {
      const isVideo = (file.mimetype && file.mimetype.startsWith('video/')) || 
                      ['.mp4', '.webm', '.mov'].includes(path.extname(file.originalname).toLowerCase());
      if (isVideo && file.size > MAX_VIDEO_SIZE) {
        req.files.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
        return res.status(400).json({ success: false, message: `Video '${file.originalname}' exceeds 100 MB.` });
      }
      if (!isVideo && file.size > MAX_IMAGE_SIZE) {
        req.files.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
        return res.status(400).json({ success: false, message: `Image '${file.originalname}' exceeds 10 MB.` });
      }
    }

    const uploaded = [];
    const hasCover = apartment.media && apartment.media.some(m => m.isCover);
    let coverAssigned = hasCover || !!apartment.coverPhoto;

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const isVideo = (file.mimetype && file.mimetype.startsWith('video/')) ||
                      ['.mp4', '.webm', '.mov'].includes(path.extname(file.originalname).toLowerCase());
      const uploadResult = await uploadToStorage(file, 'apartments');
      if (uploadResult) {
        const isCover = !coverAssigned && !isVideo;
        if (isCover) {
          coverAssigned = true;
          apartment.coverPhoto = uploadResult.url;
        }

        const mediaItem = {
          type: isVideo ? 'video' : 'image',
          url: uploadResult.url,
          publicId: uploadResult.publicId || '',
          originalName: file.originalname || '',
          size: file.size || 0,
          mimeType: file.mimetype || (isVideo ? 'video/mp4' : 'image/jpeg'),
          isCover,
          order: (apartment.media ? apartment.media.length : 0) + i,
          uploadedAt: new Date()
        };

        apartment.media.push(mediaItem);
        uploaded.push(mediaItem);
        if (!isVideo) {
          apartment.images.push({ url: uploadResult.url, publicId: uploadResult.publicId });
        }
      }
    }

    if (!apartment.coverPhoto) {
      const firstImg = apartment.media.find(m => m.type === 'image');
      if (firstImg) {
        firstImg.isCover = true;
        apartment.coverPhoto = firstImg.url;
      }
    }

    await apartment.save();
    res.status(200).json({
      success: true,
      message: `Uploaded ${uploaded.length} file(s).`,
      coverPhoto: apartment.coverPhoto,
      data: apartment.media,
      apartment
    });
  } catch (error) {
    if (req.files) {
      const fs = require('fs');
      req.files.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
    }
    next(error);
  }
};

// @desc    Delete photo or video from Apartment Gallery
// @route   DELETE /api/v1/apartments/:id/media/:mediaId
// @access  Private (Owner Only)
exports.deleteApartmentMedia = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id) || !mongoose.Types.ObjectId.isValid(req.params.mediaId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const apartment = await Apartment.findById(req.params.id).populate('property');
    if (!apartment) {
      return res.status(404).json({ success: false, message: 'Apartment not found' });
    }

    if (apartment.property.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized for this apartment' });
    }

    const mediaItem = apartment.media.id(req.params.mediaId);
    if (!mediaItem) {
      return res.status(404).json({ success: false, message: 'Media item not found' });
    }

    const wasCover = mediaItem.isCover || (apartment.coverPhoto === mediaItem.url);
    if (mediaItem.publicId) {
      await deleteFromStorage(mediaItem.publicId, mediaItem.type === 'video' ? 'video' : 'image');
    }

    apartment.media.pull({ _id: req.params.mediaId });
    apartment.images = apartment.images.filter(img => img.url !== mediaItem.url && (!mediaItem.publicId || img.publicId !== mediaItem.publicId));

    if (wasCover) {
      const nextImg = apartment.media.find(m => m.type === 'image');
      apartment.coverPhoto = nextImg ? nextImg.url : '';
      if (nextImg) nextImg.isCover = true;
    }

    await apartment.save();
    res.status(200).json({ success: true, message: 'Media deleted', coverPhoto: apartment.coverPhoto, data: apartment.media });
  } catch (error) {
    next(error);
  }
};

// @desc    Set cover photo for Apartment
// @route   PATCH /api/v1/apartments/:id/media/:mediaId/cover
// @access  Private (Owner Only)
exports.setApartmentCoverPhoto = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id) || !mongoose.Types.ObjectId.isValid(req.params.mediaId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const apartment = await Apartment.findById(req.params.id).populate('property');
    if (!apartment) return res.status(404).json({ success: false, message: 'Apartment not found' });
    if (apartment.property.owner.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Unauthorized' });

    const target = apartment.media.id(req.params.mediaId);
    if (!target) return res.status(404).json({ success: false, message: 'Media not found' });
    if (target.type !== 'image') return res.status(400).json({ success: false, message: 'Only images can be cover photo' });

    apartment.media.forEach(m => { m.isCover = (m._id.toString() === req.params.mediaId); });
    apartment.coverPhoto = target.url;

    await apartment.save();
    res.status(200).json({ success: true, message: 'Cover photo updated', coverPhoto: apartment.coverPhoto, data: apartment.media });
  } catch (error) {
    next(error);
  }
};
