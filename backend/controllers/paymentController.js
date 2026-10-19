const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Bill = require('../models/Bill');
const Payment = require('../models/Payment');
const Property = require('../models/Property');
const Tenant = require('../models/Tenant');
const Notification = require('../models/Notification');
const logActivity = require('../utils/activityLogger');
const { generateBillPDF } = require('../utils/pdfKitHelper');
const { sendEmail } = require('../utils/emailService');

// Verify Razorpay Config
const isRazorpayConfigured = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET;
let razorpayInstance = null;

if (isRazorpayConfigured) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

// @desc    Create Razorpay Order
// @route   POST /api/v1/payments/order
// @access  Private (Tenant Only)
exports.createOrder = async (req, res, next) => {
  try {
    const { billId } = req.body;

    const bill = await Bill.findById(billId).populate('property');
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    if (bill.tenant.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to pay this bill' });
    }

    if (bill.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Bill already paid' });
    }

    const amountInPaise = Math.round(bill.totalAmount * 100);

    if (isRazorpayConfigured) {
      const options = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: bill.invoiceNumber
      };

      const order = await razorpayInstance.orders.create(options);
      return res.status(200).json({
        success: true,
        mode: 'live',
        keyId: process.env.RAZORPAY_KEY_ID,
        order
      });
    } else {
      // Mock order generation for local tests
      console.log(`[RAZORPAY SIMULATOR] Order created for Invoice: ${bill.invoiceNumber}, Amount: INR ${bill.totalAmount}`);
      const mockOrder = {
        id: 'order_mock_' + Date.now().toString().slice(-8),
        entity: 'order',
        amount: amountInPaise,
        currency: 'INR',
        receipt: bill.invoiceNumber,
        status: 'created',
        created_at: Math.floor(Date.now() / 1000)
      };

      return res.status(200).json({
        success: true,
        mode: 'mock',
        keyId: 'mock_key_id_123',
        order: mockOrder
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Razorpay Payment Signature / Complete Checkout
// @route   POST /api/v1/payments/verify
// @access  Private (Tenant Only)
exports.verifyPayment = async (req, res, next) => {
  try {
    const {
      billId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      paymentMethod = 'Razorpay'
    } = req.body;

    const bill = await Bill.findById(billId)
      .populate('property')
      .populate('tenant');

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    if (bill.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Bill is already paid' });
    }

    // Verify signature if active
    if (isRazorpayConfigured && razorpay_signature) {
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Invalid payment signature. Verification failed.' });
      }
    }

    const transactionId = razorpay_payment_id || 'TXN-MOCK-' + Date.now();

    // Create Payment Ledger Entry
    const payment = await Payment.create({
      bill: bill._id,
      property: bill.property._id,
      tenant: bill.tenant._id,
      amount: bill.totalAmount,
      paymentMethod: paymentMethod,
      transactionId: transactionId,
      status: 'success',
      paymentDate: Date.now()
    });

    // Mark Bill as Paid
    bill.status = 'paid';
    bill.paidAt = Date.now();
    await bill.save();

    // Compile Receipt PDF
    const pdfUrl = await generateBillPDF(bill, bill.tenant, bill.property, payment);
    payment.receiptUrl = pdfUrl;
    await payment.save();

    // Create Notifications
    await Notification.create({
      user: bill.property.owner,
      userModel: 'Owner',
      title: 'Rent Payment Received',
      message: `Tenant '${bill.tenant.name}' paid rent of INR ${bill.totalAmount} for property '${bill.property.name}'.`,
      category: 'billing'
    });

    await Notification.create({
      user: bill.tenant._id,
      userModel: 'Tenant',
      title: 'Payment Successful',
      message: `Rent payment of INR ${bill.totalAmount} for Invoice ${bill.invoiceNumber} was processed successfully.`,
      category: 'billing'
    });

    // Send Email confirmation
    try {
      const mailBody = `
        <h3>Rent Payment Receipt</h3>
        <p>Dear ${bill.tenant.name},</p>
        <p>Thank you for your rent payment of <strong>INR ${bill.totalAmount}</strong> for ${bill.month}/${bill.year}.</p>
        <p>Transaction Reference: ${transactionId}</p>
        <p>You can download the receipt PDF here: <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}${pdfUrl}">Receipt PDF</a></p>
        <br/>
        <p>Leasify Billing System</p>
      `;
      await sendEmail({
        to: bill.tenant.email,
        subject: `Leasify - Rent Payment Receipt [${bill.invoiceNumber}]`,
        html: mailBody
      });
    } catch (err) {
      console.error('Mail confirmation failed:', err.message);
    }

    await logActivity(bill.tenant._id, 'Tenant', 'Payment Received', `Rent paid for Invoice: ${bill.invoiceNumber}, Amount: INR ${bill.totalAmount}`, req);

    res.status(200).json({
      success: true,
      message: 'Payment completed and verified successfully',
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process Manual or UPI Direct QR Payment Submission
// @route   POST /api/v1/payments/manual
// @access  Private (Tenant Only)
exports.submitManualPayment = async (req, res, next) => {
  try {
    const { billId, upiReferenceNumber } = req.body;

    if (!upiReferenceNumber) {
      return res.status(400).json({ success: false, message: 'Please provide UPI/Bank Reference Transaction Number' });
    }

    const bill = await Bill.findById(billId)
      .populate('property')
      .populate('tenant');

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    // Direct recording for simulation ease or manual verification
    const payment = await Payment.create({
      bill: bill._id,
      property: bill.property._id,
      tenant: bill.tenant._id,
      amount: bill.totalAmount,
      paymentMethod: 'UPI',
      transactionId: upiReferenceNumber,
      status: 'success',
      paymentDate: Date.now()
    });

    bill.status = 'paid';
    bill.paidAt = Date.now();
    await bill.save();

    const pdfUrl = await generateBillPDF(bill, bill.tenant, bill.property, payment);
    payment.receiptUrl = pdfUrl;
    await payment.save();

    // Create Notification
    await Notification.create({
      user: bill.property.owner,
      userModel: 'Owner',
      title: 'Manual Payment Submitted',
      message: `Tenant '${bill.tenant.name}' paid rent of INR ${bill.totalAmount} manually via UPI Ref: ${upiReferenceNumber}.`,
      category: 'billing'
    });

    await logActivity(bill.tenant._id, 'Tenant', 'Payment Received', `Manual rent paid via UPI: ${upiReferenceNumber}`, req);

    res.status(200).json({
      success: true,
      message: 'Manual payment processed successfully',
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All Payments Records
// @route   GET /api/v1/payments
// @access  Private
exports.getPayments = async (req, res, next) => {
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

    const payments = await Payment.find(queryObj)
      .populate('property', 'name address')
      .populate('tenant', 'name email phone')
      .populate('bill', 'invoiceNumber month year rent')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Simulate Demo Rent Payment (Development / Demo Mode Only)
// @route   POST /api/v1/payments/demo-simulate
// @access  Private (Tenant Only)
exports.simulateDemoPayment = async (req, res, next) => {
  try {
    const { billId, simulateOutcome = 'success', failureReason } = req.body;

    if (!billId || !mongoose.Types.ObjectId.isValid(billId)) {
      return res.status(400).json({ success: false, message: 'Valid Bill ID is required' });
    }

    const bill = await Bill.findById(billId)
      .populate('property')
      .populate('tenant');

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill record not found' });
    }

    // Authorization: only the bill's resident tenant can simulate paying this bill
    if (bill.tenant._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to settle this bill' });
    }

    if (bill.status === 'paid') {
      return res.status(400).json({ success: false, message: 'This bill has already been paid and settled' });
    }

    const outcome = String(simulateOutcome).toLowerCase().trim();

    if (outcome !== 'success' && outcome !== 'failure' && outcome !== 'fail') {
      return res.status(400).json({
        success: false,
        message: 'Invalid simulation outcome. Must be "success" or "failure".'
      });
    }

    // 1. SIMULATE FAILED PAYMENT
    if (outcome === 'failure' || outcome === 'fail') {
      const reason = failureReason || 'Simulated card declined / insufficient demo funds';
      const failTxnId = `DEMO-FAIL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const failedPayment = await Payment.create({
        bill: bill._id,
        property: bill.property._id,
        tenant: bill.tenant._id,
        amount: bill.totalAmount,
        paymentMethod: 'Demo',
        isDemo: true,
        failureReason: reason,
        transactionId: failTxnId,
        status: 'failed',
        paymentDate: new Date()
      });

      // Rent remains outstanding (bill.status is NOT changed)
      await Notification.create({
        user: bill.tenant._id,
        userModel: 'Tenant',
        title: '[DEMO] Payment Simulation Failed',
        message: `[Demo Mode] Rent payment simulation of INR ${bill.totalAmount} for Invoice ${bill.invoiceNumber} failed: ${reason}. Bill remains outstanding.`,
        category: 'billing'
      });

      await logActivity(
        bill.tenant._id,
        'Tenant',
        'Demo Payment Failed',
        `Demo payment simulation failed for Invoice: ${bill.invoiceNumber}. Reason: ${reason}`,
        req
      );

      return res.status(400).json({
        success: false,
        isDemo: true,
        paymentStatus: 'failed',
        message: `[Demo Mode] Payment simulation failed: ${reason}. Rent remains outstanding.`,
        notice: 'Demo Mode: No real money will be transferred.',
        data: failedPayment
      });
    }

    // 2. SIMULATE SUCCESSFUL PAYMENT
    const successTxnId = `DEMO-TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const payment = await Payment.create({
      bill: bill._id,
      property: bill.property._id,
      tenant: bill.tenant._id,
      amount: bill.totalAmount,
      paymentMethod: 'Demo',
      isDemo: true,
      transactionId: successTxnId,
      status: 'success',
      paymentDate: new Date()
    });

    // Mark Bill as Paid
    bill.status = 'paid';
    bill.paidAt = new Date();
    await bill.save();

    // Generate Receipt PDF
    try {
      const pdfUrl = await generateBillPDF(bill, bill.tenant, bill.property, payment);
      payment.receiptUrl = pdfUrl;
      await payment.save();
    } catch (pdfErr) {
      console.warn('PDF generation note:', pdfErr.message);
    }

    // Create In-App Notifications
    await Notification.create({
      user: bill.property.owner,
      userModel: 'Owner',
      title: '[DEMO] Rent Payment Received',
      message: `[Demo Mode] Tenant '${bill.tenant.name}' simulated rent payment of INR ${bill.totalAmount} for property '${bill.property.name}'. (No real funds transferred).`,
      category: 'billing'
    });

    await Notification.create({
      user: bill.tenant._id,
      userModel: 'Tenant',
      title: '[DEMO] Rent Payment Successful',
      message: `[Demo Mode] Rent payment of INR ${bill.totalAmount} for Invoice ${bill.invoiceNumber} simulated successfully. Ref: ${successTxnId}. (No real funds transferred).`,
      category: 'billing'
    });

    await logActivity(
      bill.tenant._id,
      'Tenant',
      'Demo Payment Success',
      `Demo rent payment simulation completed for Invoice: ${bill.invoiceNumber}, Amount: INR ${bill.totalAmount}`,
      req
    );

    return res.status(200).json({
      success: true,
      isDemo: true,
      paymentStatus: 'success',
      message: 'Demo payment simulated successfully. Rent marked as paid.',
      notice: 'Demo Mode: No real money will be transferred.',
      data: payment
    });
  } catch (error) {
    next(error);
  }
};
