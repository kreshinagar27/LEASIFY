const mongoose = require('mongoose');
const crypto = require('crypto');

const InvitationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please add a tenant email'],
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Owner',
    required: [true, 'Invitation must be associated with an owner']
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    default: null
  },
  apartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment',
    default: null
  },
  unitNumber: {
    type: String,
    trim: true,
    default: ''
  },
  monthlyRent: {
    type: Number,
    default: 0
  },
  securityDeposit: {
    type: Number,
    default: 0
  },
  tokenHash: {
    type: String,
    required: [true, 'Invitation token hash is required'],
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'revoked', 'expired'],
    default: 'pending',
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  usedAt: {
    type: Date,
    default: null
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Helper static method to generate a cryptographically secure token and its hash
InvitationSchema.statics.generateToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7-day expiration
  return { rawToken, tokenHash, expiresAt };
};

// Helper static method to hash a token
InvitationSchema.statics.hashToken = function (rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return '';
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
};

module.exports = mongoose.model('Invitation', InvitationSchema);
