const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  bill: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bill',
    required: true
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['Razorpay', 'UPI', 'Manual', 'Demo'],
    default: 'Razorpay'
  },
  isDemo: {
    type: Boolean,
    default: false
  },
  failureReason: {
    type: String,
    default: ''
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  receiptUrl: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Payment', PaymentSchema);
