const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const TenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number']
  },
  occupation: {
    type: String,
    default: ''
  },
  aadhaarNumber: {
    type: String,
    required: [true, 'Please add Aadhaar number']
  },
  panNumber: {
    type: String,
    default: ''
  },
  emergencyContact: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    relationship: { type: String, default: '' }
  },
  profilePhoto: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    default: 'tenant'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  verified: {
    type: Boolean,
    default: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Owner',
    required: true
  },
  propertyAssigned: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    default: null
  },
  monthlyRent: {
    type: Number,
    required: [true, 'Please specify monthly rent']
  },
  securityDeposit: {
    type: Number,
    required: [true, 'Please specify security deposit']
  },
  leaseStartDate: {
    type: Date,
    required: [true, 'Please specify lease start date']
  },
  leaseEndDate: {
    type: Date,
    required: [true, 'Please specify lease end date']
  },
  leaseRenewals: [
    {
      startDate: Date,
      endDate: Date,
      rentAmount: Number,
      renewedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  leaseAgreementUrl: {
    type: String,
    default: ''
  },
  moveInDetails: {
    meterReadings: {
      electricity: { type: Number, default: 0 },
      water: { type: Number, default: 0 }
    },
    depositCollected: { type: Boolean, default: false },
    keyHandoverConfirmed: { type: Boolean, default: false }
  },
  moveOutDetails: {
    meterReadings: {
      electricity: { type: Number, default: 0 },
      water: { type: Number, default: 0 }
    },
    damageInspectionNotes: { type: String, default: '' },
    refundCalculated: { type: Number, default: 0 },
    pendingDuesSettled: { type: Boolean, default: false },
    moveOutDate: Date
  },
  uploadedDocs: [
    {
      name: String,
      url: String,
      fileType: String, // 'Aadhaar', 'PAN', 'Passport', 'Lease', 'Other'
      publicId: String
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
TenantSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
TenantSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Tenant', TenantSchema);
