const mongoose = require('mongoose');
const Bill = require('../models/Bill');
const Tenant = require('../models/Tenant');
const Property = require('../models/Property');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const { generateBillPDF } = require('../utils/pdfKitHelper');
const logActivity = require('../utils/activityLogger');

// Helper to update late fees dynamically for a list of bills
const updateLateFees = async (bills) => {
  const today = new Date();
  const dailyRate = 50; // 50 INR per day past due date

  for (let bill of bills) {
    if (bill.status === 'unpaid' && new Date(bill.dueDate) < today) {
      const diffTime = Math.abs(today - new Date(bill.dueDate));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        const calculatedLateFee = diffDays * dailyRate;
        
        // Base sum
        const baseSum = 
          bill.rent + 
          bill.electricityCharges + 
          bill.waterCharges + 
          bill.maintenanceCharges + 
          bill.parkingCharges + 
          bill.otherCharges;
        
        const gstAmount = Math.round(baseSum * 0.18); // 18% GST

        bill.lateFee = calculatedLateFee;
        bill.totalAmount = baseSum + gstAmount + calculatedLateFee;
        bill.status = 'overdue';
        await bill.save();
      }
    }
  }
};

// @desc    Generate Bill (Invoice)
// @route   POST /api/v1/bills
// @access  Private (Owner Only)
exports.generateBill = async (req, res, next) => {
  try {
    const {
      propertyId, tenantId, month, year,
      electricityCharges, waterCharges, maintenanceCharges, parkingCharges, otherCharges,
      dueDate
    } = req.body;

    // Check if bill already generated for this month/year/tenant
    const billExists = await Bill.findOne({
      tenant: tenantId,
      month: parseInt(month),
      year: parseInt(year)
    });

    if (billExists) {
      return res.status(400).json({
        success: false,
        message: `Bill already generated for this tenant for ${month}/${year}`
      });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (property.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to generate bill for this property' });
    }

    if (tenant.owner && tenant.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to generate bill for this tenant' });
    }

    // Invoice number generator
    const invoiceNumber = 'INV-' + Date.now().toString().slice(-8) + Math.floor(10 + Math.random() * 90);

    const rent = tenant.monthlyRent;
    const baseSum = 
      rent + 
      (parseFloat(electricityCharges) || 0) + 
      (parseFloat(waterCharges) || 0) + 
      (parseFloat(maintenanceCharges) || 0) + 
      (parseFloat(parkingCharges) || 0) + 
      (parseFloat(otherCharges) || 0);

    const gst = Math.round(baseSum * 0.18); // 18% standard GST
    const totalAmount = baseSum + gst;

    const bill = await Bill.create({
      property: propertyId,
      tenant: tenantId,
      month: parseInt(month),
      year: parseInt(year),
      invoiceNumber,
      rent,
      electricityCharges: parseFloat(electricityCharges) || 0,
      waterCharges: parseFloat(waterCharges) || 0,
      maintenanceCharges: parseFloat(maintenanceCharges) || 0,
      parkingCharges: parseFloat(parkingCharges) || 0,
      otherCharges: parseFloat(otherCharges) || 0,
      gst,
      totalAmount,
      dueDate: new Date(dueDate)
    });

    // Create Notification
    await Notification.create({
      user: tenantId,
      userModel: 'Tenant',
      title: 'New Bill Generated',
      message: `Your rent invoice ${invoiceNumber} for ${month}/${year} has been generated. Total: INR ${totalAmount}.`,
      category: 'billing'
    });

    await logActivity(req.user.id, 'Owner', 'Bill Generated', `Bill ${invoiceNumber} generated for Tenant '${tenant.name}'.`, req);

    res.status(201).json({
      success: true,
      data: bill
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All Bills (Owner gets all, Tenant gets their own)
// @route   GET /api/v1/bills
// @access  Private
exports.getBills = async (req, res, next) => {
  try {
    let queryObj = {};

    if (req.userRole === 'owner') {
      // Find properties owned by this owner
      const properties = await Property.find({ owner: req.user.id });
      const propertyIds = properties.map(p => p._id.toString());
      queryObj.property = { $in: properties.map(p => p._id) };

      // Apply owner search filters safely without allowing cross-owner override
      if (req.query.property) {
        if (!propertyIds.includes(req.query.property.toString())) {
          return res.status(200).json({ success: true, count: 0, data: [] });
        }
        queryObj.property = req.query.property;
      }
      if (req.query.tenant) {
        const ownedTenant = await Tenant.findOne({ _id: req.query.tenant, owner: req.user.id });
        if (!ownedTenant) {
          return res.status(200).json({ success: true, count: 0, data: [] });
        }
        queryObj.tenant = req.query.tenant;
      }
    } else if (req.userRole === 'tenant') {
      // Tenant gets only their own bills
      queryObj.tenant = req.user.id;
    } else {
      return res.status(403).json({ success: false, message: 'Forbidden. Invalid role.' });
    }

    if (req.query.status) {
      queryObj.status = req.query.status;
    }
    if (req.query.month) {
      queryObj.month = parseInt(req.query.month);
    }
    if (req.query.year) {
      queryObj.year = parseInt(req.query.year);
    }

    const bills = await Bill.find(queryObj)
      .populate('property', 'name address')
      .populate('tenant', 'name email phone')
      .sort({ createdAt: -1 });

    // Trigger late fee dynamic updates
    await updateLateFees(bills);

    res.status(200).json({
      success: true,
      count: bills.length,
      data: bills
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Single Bill details & invoice URL
// @route   GET /api/v1/bills/:id
// @access  Private
exports.getBill = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Bill ID' });
    }

    const bill = await Bill.findById(req.params.id)
      .populate({
        path: 'property',
        select: 'name address owner',
        populate: { path: 'owner', select: 'name email contactNumber' }
      })
      .populate('tenant', 'name email phone');

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Role verification
    if (req.userRole === 'owner' && bill.property.owner._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (req.userRole === 'tenant' && bill.tenant._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Late fees check
    await updateLateFees([bill]);

    // Check if payment details are linked
    const payment = await Payment.findOne({ bill: bill._id, status: 'success' });

    res.status(200).json({
      success: true,
      data: bill,
      payment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download Bill PDF
// @route   GET /api/v1/bills/:id/pdf
// @access  Private
exports.downloadBillPDF = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Bill ID' });
    }

    const bill = await Bill.findById(req.params.id)
      .populate('property')
      .populate('tenant');

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    const propOwnerId = bill.property?.owner?._id ? bill.property.owner._id.toString() : bill.property?.owner?.toString();
    const billTenantId = bill.tenant?._id ? bill.tenant._id.toString() : bill.tenant?.toString();

    if (req.userRole === 'owner' && propOwnerId !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to download this invoice' });
    }
    if (req.userRole === 'tenant' && billTenantId !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to download this invoice' });
    }
    if (req.userRole !== 'owner' && req.userRole !== 'tenant') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const payment = await Payment.findOne({ bill: bill._id, status: 'success' });

    const relativeUrl = await generateBillPDF(bill, bill.tenant, bill.property, payment);

    res.status(200).json({
      success: true,
      pdfUrl: relativeUrl
    });
  } catch (error) {
    next(error);
  }
};
