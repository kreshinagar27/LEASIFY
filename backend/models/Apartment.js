const mongoose = require('mongoose');

const ApartmentSchema = new mongoose.Schema({
  number: { type: String, required: true },
  floor: { type: Number, required: true },
  areaSqFt: { type: Number, required: true },
  bedrooms: { type: Number, default: 0 },
  bathrooms: { type: Number, default: 0 },
  balcony: { type: Boolean, default: false },
  parkingAvailable: { type: Boolean, default: false },
  furnishedStatus: {
    type: String,
    enum: ['furnished', 'semi-furnished', 'unfurnished'],
    default: 'unfurnished'
  },
  monthlyRent: { type: Number, required: true },
  securityDeposit: { type: Number, required: true },
  status: {
    type: String,
    enum: ['Vacant', 'Occupied', 'Reserved', 'Under Maintenance', 'Archived'],
    default: 'Vacant'
  },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },
  images: [{ url: String, publicId: String }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Apartment', ApartmentSchema);
