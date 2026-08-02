const mongoose = require('mongoose');
const Maintenance = require('../models/Maintenance');
const Property = require('../models/Property');
const Tenant = require('../models/Tenant');
const Notification = require('../models/Notification');
const logActivity = require('../utils/activityLogger');
const { uploadToStorage } = require('../utils/uploader');

// @desc    Raise Maintenance Request
// @route   POST /api/v1/maintenance
// @access  Private (Tenant Only)
exports.createRequest = async (req, res, next) => {
  try {
    const { category, priority, description } = req.body;

    // Get tenant's property details
    const tenant = await Tenant.findById(req.user.id);
    if (!tenant.propertyAssigned) {
      return res.status(400).json({ success: false, message: 'You must be assigned to a property to raise a maintenance request' });
    }

    const complaintId = 'MNT-' + Math.floor(100000 + Math.random() * 900000);

    // Upload before images if any
    const beforeImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadResult = await uploadToStorage(file, 'maintenance');
        if (uploadResult) {
          beforeImages.push(uploadResult.url);
        }
      }
    }

    const request = await Maintenance.create({
      complaintId,
      property: tenant.propertyAssigned,
      tenant: tenant._id,
      category,
      priority,
      description,
      beforeImages
    });

    const property = await Property.findById(tenant.propertyAssigned);

    // Notify Owner
    await Notification.create({
      user: property.owner,
      userModel: 'Owner',
      title: 'New Maintenance Request',
      message: `Tenant '${tenant.name}' has raised a ticket (${complaintId}) for property '${property.name}'.`,
      category: 'maintenance'
    });

    await logActivity(tenant._id, 'Tenant', 'Complaint Created', `Raised maintenance request: ${complaintId}`, req);

    res.status(201).json({
      success: true,
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All Maintenance Requests (Owner gets all, Tenant gets their own)
// @route   GET /api/v1/maintenance
// @access  Private
exports.getRequests = async (req, res, next) => {
  try {
    let queryObj = {};

    if (req.userRole === 'owner') {
      const properties = await Property.find({ owner: req.user.id });
      const propertyIds = properties.map(p => p._id);
      queryObj.property = { $in: propertyIds };

      if (req.query.tenant) {
        queryObj.tenant = req.query.tenant;
      }
      if (req.query.property) {
        queryObj.property = req.query.property;
      }
    } else {
      queryObj.tenant = req.user.id;
    }

    if (req.query.status) {
      queryObj.status = req.query.status;
    }
    if (req.query.priority) {
      queryObj.priority = req.query.priority;
    }

    const requests = await Maintenance.find(queryObj)
      .populate('property', 'name address')
      .populate('tenant', 'name phone email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Single Request details
// @route   GET /api/v1/maintenance/:id
// @access  Private
exports.getRequest = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Maintenance Ticket ID' });
    }

    const request = await Maintenance.findById(req.params.id)
      .populate({
        path: 'property',
        select: 'name address owner',
        populate: { path: 'owner', select: 'name email contactNumber' }
      })
      .populate('tenant', 'name email phone');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Role checks
    if (req.userRole === 'owner' && request.property.owner._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (req.userRole === 'tenant' && request.tenant._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.status(200).json({
      success: true,
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Request details (Owner resolves/assigns work order)
// @route   PUT /api/v1/maintenance/:id
// @access  Private (Owner Only)
exports.updateRequest = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Maintenance Ticket ID' });
    }

    const { status, assignedWorker, estimatedCost, resolutionNotes } = req.body;
    let request = await Maintenance.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Upload after images if resolving
    const afterImages = [...request.afterImages];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadResult = await uploadToStorage(file, 'maintenance');
        if (uploadResult) {
          afterImages.push(uploadResult.url);
        }
      }
    }

    const updateData = {
      status: status || request.status,
      assignedWorker: assignedWorker !== undefined ? assignedWorker : request.assignedWorker,
      estimatedCost: estimatedCost !== undefined ? parseFloat(estimatedCost) : request.estimatedCost,
      resolutionNotes: resolutionNotes !== undefined ? resolutionNotes : request.resolutionNotes,
      afterImages
    };

    if (status === 'resolved') {
      updateData.completionDate = Date.now();
    }

    request = await Maintenance.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    // Notify Tenant
    await Notification.create({
      user: request.tenant,
      userModel: 'Tenant',
      title: `Maintenance Request Status: ${request.status.toUpperCase()}`,
      message: `Your ticket (${request.complaintId}) status is now ${request.status}. Notes: ${request.resolutionNotes || 'None'}`,
      category: 'maintenance'
    });

    await logActivity(req.user.id, 'Owner', 'Complaint Resolved', `Updated maintenance ticket status to ${request.status} for Ref: ${request.complaintId}`, req);

    res.status(200).json({
      success: true,
      data: request
    });
  } catch (error) {
    next(error);
  }
};
