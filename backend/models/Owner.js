const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const OwnerSchema = new mongoose.Schema({
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
  contactNumber: {
    type: String,
    required: [true, 'Please add a contact number']
  },
  address: {
    type: String,
    default: ''
  },
  profilePhoto: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    default: 'owner'
  },
  verified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  identityDocs: [
    {
      name: String,
      url: String,
      publicId: String
    }
  ],
  ownershipDocs: [
    {
      name: String,
      url: String,
      publicId: String
    }
  ]
}, { timestamps: true });

// Hash password before saving
OwnerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
OwnerSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Owner', OwnerSchema);
