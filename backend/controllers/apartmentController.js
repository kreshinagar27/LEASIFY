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
    const {
      number,
      floor,
      areaSqFt,
      bedrooms,
      bathrooms,
      balcony,
      parkingAvailable,
      furnishedStatus,
      monthlyRent,
      securityDeposit,
      status,
      propertyId
    } = req.body;

    if (!number || !floor || !areaSqFt || !monthlyRent || !securityDeposit || !propertyId) {
      return res.status(400).json({ success: false, message: 'Required fields missing.' });
    }

    // Verify property ownership
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }
    if (property.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized for this property.' });
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
    const apartments = await Apartment.find({ property: { $in: propertyIds } }).populate('property', 'name address status');
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
    const apartment = await Apartment.findById(req.params.id).populate('property', 'name address status');
    if (!apartment) {
      return res.status(404).json({ success: false, message: 'Apartment not found' });
    }
    // Ensure owner owns the property
    if (apartment.property.owner.toString() !== req.user.id) {
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
    if (apartment.property.owner.toString() !== req.user.id) {
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

    const {
      number,
      floor,
      areaSqFt,
      bedrooms,
      bathrooms,
      balcony,
      parkingAvailable,
      furnishedStatus,
      monthlyRent,
      securityDeposit,
      status
    } = req.body;

    const updateData = {
      number: number || apartment.number,
      floor: floor !== undefined ? parseFloat(floor) : apartment.floor,
      areaSqFt: areaSqFt !== undefined ? parseFloat(areaSqFt) : apartment.areaSqFt,
      bedrooms: bedrooms !== undefined ? parseFloat(bedrooms) : apartment.bedrooms,
      bathrooms: bathrooms !== undefined ? parseFloat(bathrooms) : apartment.bathrooms,
      balcony: balcony !== undefined ? (balcony === 'true' || balcony === true) : apartment.balcony,
      parkingAvailable: parkingAvailable !== undefined ? (parkingAvailable === 'true' || parkingAvailable === true) : apartment.parkingAvailable,
      furnishedStatus: furnishedStatus || apartment.furnishedStatus,
      monthlyRent: monthlyRent !== undefined ? parseFloat(monthlyRent) : apartment.monthlyRent,
      securityDeposit: securityDeposit !== undefined ? parseFloat(securityDeposit) : apartment.securityDeposit,
      status: status || apartment.status,
      images
    };

    apartment = await Apartment.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
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
    if (apartment.property.owner.toString() !== req.user.id) {
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
